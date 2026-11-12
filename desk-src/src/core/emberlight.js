// The ember's light, as a term in the lit materials' shaders instead of a scene PointLight: the
// same maths three.js uses for a point light (inverse-square falloff with a cutoff, then the
// material's own direct-light response), but only where a material asks for it, and with its
// intensity a uniform: the frame cache can bake it once at intensity 1 and scale it per frame.
import * as THREE from 'three'

export const EMBER_LIGHT = {
  uEmberPosV: { value: new THREE.Vector3() }, // (view space, like three's own light positions)
  uEmberCol: { value: new THREE.Color(0, 0, 0) }, // colour x intensity at full glow (candela)
  uEmberI: { value: 0 }, // this frame's glow, relative to full
  uEmberCut: { value: 140 },
  // the lighter's flame: the same kind of light, warmer and much stronger
  uFlamePosV: { value: new THREE.Vector3() },
  uFlameCol: { value: new THREE.Color(0, 0, 0) },
  uFlameI: { value: 0 },
  uFlameCut: { value: 420 },
  // (below the flame a shadowed spotlight carries its light, this term only the rest: the spot's
  // cone, as cosines from straight down, and down in view space)
  uFlameCone: { value: new THREE.Vector2(0, 1) },
  uFlameDownV: { value: new THREE.Vector3(0, -1, 0) },
}

export function installEmberLight() {
  if (THREE.ShaderChunk.lights_pars_begin.includes('uEmberPosV')) return
  THREE.ShaderChunk.lights_pars_begin += `
uniform vec3 uEmberPosV;
uniform vec3 uEmberCol;
uniform float uEmberI;
uniform float uEmberCut;
uniform vec3 uFlamePosV;
uniform vec3 uFlameCol;
uniform float uFlameI;
uniform float uFlameCut;
uniform vec2 uFlameCone;
uniform vec3 uFlameDownV;
`
  // (appended after any clamp of the other lights' highlights. The ember's response is worked out
  // at full glow, its highlights capped there, then scaled by this frame's glow: linear in the
  // glow, so the frame cache can bake it once and scale it exactly, and its reflections never
  // reach the bloom threshold even when it flares)
  THREE.ShaderChunk.lights_fragment_end +=
    `
#if defined( RE_Direct )
	vec3 emberV = uEmberPosV - geometryPosition;
	float emberD = length( emberV );
	// (beyond its reach the ember lights nothing: nothing is worked out there)
	if ( uEmberI > 0.0 && emberD < uEmberCut ) {
		directLight.direction = emberV / max( emberD, 1e-4 );
		directLight.color = uEmberCol * getDistanceAttenuation( emberD, uEmberCut, 2.0 );
		directLight.visible = true;
		ReflectedLight emberRL = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
		#ifdef USE_CLEARCOAT
			vec3 emberCC = clearcoatSpecularDirect;
			clearcoatSpecularDirect = vec3( 0.0 );
		#endif
		#ifdef USE_SHEEN
			vec3 emberSh = sheenSpecularDirect;
			sheenSpecularDirect = vec3( 0.0 );
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, emberRL );
		reflectedLight.directDiffuse += emberRL.directDiffuse * uEmberI;
		reflectedLight.directSpecular += min( emberRL.directSpecular, vec3( 1.6 ) ) * uEmberI;
		#ifdef USE_CLEARCOAT
			clearcoatSpecularDirect = emberCC + min( clearcoatSpecularDirect, vec3( 1.6 ) ) * uEmberI;
		#endif
		#ifdef USE_SHEEN
			sheenSpecularDirect = emberSh + sheenSpecularDirect * uEmberI;
		#endif
	}
	vec3 flameV = uFlamePosV - geometryPosition;
	float flameD = length( flameV );
	if ( uFlameI > 0.0 && flameD < uFlameCut ) {
		directLight.direction = flameV / max( flameD, 1e-4 );
		directLight.color = uFlameCol * uFlameI * getDistanceAttenuation( flameD, uFlameCut, 2.0 );
		// (what the shadowed spot below the flame lights, it lights; this term the rest, by the same
		// cone, so the two always add up to the one flame)
		directLight.color *= 1.0 - smoothstep( uFlameCone.x, uFlameCone.y, dot( -directLight.direction, uFlameDownV ) );
		directLight.visible = true;
		ReflectedLight flameRL = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, flameRL );
		reflectedLight.directDiffuse += flameRL.directDiffuse;
		reflectedLight.directSpecular += min( flameRL.directSpecular, vec3( 1.8 ) );
	}
#endif
`
}

/** Give a lit material the ember's light (keeps any onBeforeCompile it already has). */
export function withEmber(material) {
  if (material.userData.emberLight) return material // (once: shared materials come round again)
  material.userData.emberLight = true
  // (keep the material's own program key: three keys programs by onBeforeCompile's source text,
  // which would be this wrapper's for every material)
  const key = material.customProgramCacheKey()
  const prev = material.onBeforeCompile
  material.onBeforeCompile = function (sh, r) {
    Object.assign(sh.uniforms, EMBER_LIGHT)
    if (prev) prev.call(this, sh, r)
  }
  material.customProgramCacheKey = () => key
  return material
}

const BASE = new THREE.Color(0xff6a24)
const tmp = new THREE.Vector3()
const FLAME = new THREE.Color(0xffa64d)
const tmp2 = new THREE.Vector3()
export const FLAME_COLOR = FLAME
/**
 * The flame's light this frame: at worldPos, its strength 0..1 (full = `cd` candela); `spot`, the
 * SpotLight pointing down that carries the light below the flame, with its shadow.
 */
export function setFlameLight(worldPos, camera, strength, cd, spot) {
  EMBER_LIGHT.uFlamePosV.value.copy(tmp2.copy(worldPos).applyMatrix4(camera.matrixWorldInverse))
  EMBER_LIGHT.uFlameCol.value.copy(FLAME).multiplyScalar(cd)
  EMBER_LIGHT.uFlameI.value = strength
  // (three's own cone: smoothstep(cos(angle), cos(angle * (1 - penumbra)), cos to the axis))
  EMBER_LIGHT.uFlameCone.value.set(Math.cos(spot.angle), Math.cos(spot.angle * (1 - spot.penumbra)))
  EMBER_LIGHT.uFlameDownV.value.set(0, -1, 0).transformDirection(camera.matrixWorldInverse)
  spot.position.copy(worldPos)
  spot.target.position.copy(worldPos).y -= 100
  spot.target.updateMatrixWorld()
  spot.intensity = cd * strength
}

/** Place and set the ember's light for this frame: its glow relative to full (full = `cd` candela). */
export function setEmberLight(worldPos, camera, glow, cd = 180) {
  EMBER_LIGHT.uEmberPosV.value.copy(tmp.copy(worldPos).applyMatrix4(camera.matrixWorldInverse))
  EMBER_LIGHT.uEmberCol.value.copy(BASE).multiplyScalar(cd)
  EMBER_LIGHT.uEmberI.value = glow
}
