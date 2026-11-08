// The wired earbuds (Drift Wired): two buds, the remote, the Y-splitter, the cinch bead, a straight
// 3.5 mm TRRS plug and the braided cable, as one object for a merged scene. Ported from the Drift
// Wired viewer at its high quality: the same geometry, materials and shader patches (its renders
// match the original's pixel for pixel), the USB-C plug replaced. Units: millimetres.
//
//   (worker)  import { meshSDF } from '../core/sdf.js'
//             import { earbudsMeshJobs } from './earbudsGeom.js'      (no three.js in there)
//             for (const j of earbudsMeshJobs()) out[j.name] = j.run(meshSDF)   // { bud, remote }
//             (optional: earbudsTextures() from earbudsTex.js, posted with earbudsTextureTransfer)
//   (page)    const eb = await createEarbudsAsync({ renderer, meshes: out, colorway: 'black' }, tick)
//             scene.add(eb.group)
//             eb.applyState(state)   // whenever the physics posts a render state (no allocation)
//
// The render state (Float32Array or Float64Array, as physhost.writeState writes it): 12 floats per
// part in BODY_ORDER (its rotation R, column-major 3 x 3, then its centre of mass, world space),
// then per chain (leadL1, leadL2, leadR, main) its tube points, x y z each: the two ends run 1.6 mm
// into the parts they leave, so a chain of n particles has n + 4 points. With the original's
// 4.5 mm spacing and earbudsGeom.js's CHAINS: 19, 22, 29 and 44 points (earbudsStateLayout()).
// Each part's matrix is centre + R (local - com) (BODY_COM; the plug's is plugBody.com), the right
// bud the left one's meshes mirrored in x. "World" is eb.group's frame: move the group to move all.
//
// Left to the scene, as the original's viewer did them: shadows (the parts cast and receive as they
// did; with renderer.shadowMap.autoUpdate off, flag an update after applyState), ambient occlusion
// (it ran GTAO) and MSAA (the perforated meshes use alpha to coverage). (The tips are opaque: a
// transmissive material makes three.js draw the whole scene a second time every frame, for it to
// show through, and on a black tip that cost about half of every frame for nothing anyone saw.)
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import * as G from './earbudsGeom.js'
import { earbudsTextures, letterPixels } from './earbudsTex.js'
import { runStepsAsync } from '../core/steps.js'
import VALUE_NOISE from '../shaders/valueNoise.glsl'

export { BODY_ORDER, BODY_COM, CHAINS, SPACING, PLUG35, plugBody, plugCollide35, PLUG35_COLLIDE_BOUNDS, earbudsMeshJobs, earbudsStateLayout } from './earbudsGeom.js'
export { earbudsTextures, earbudsTextureTransfer } from './earbudsTex.js'

// the original's high tier, everywhere
const LATHE_SEGS = 96 // turned parts: segments round
const RADIAL = 16 // the cable's tube: segments round
const ANISO = 8 // the braid's and the letters' anisotropic filtering
const BRAID_TILE = (2 * Math.PI * G.CABLE.radius) / 2 // two tiles round the cable

export const COLORWAYS = {
  // (black only: a glossy near-black body, the cable and rubber a shade apart, the tips and the
  // trim dark grey so the shapes still read on a light ground)
  black: { name: 'Black', body: '#1c1d20', bodyRough: 0.3, tip: '#3a3c40', accent: '#55585d', braid: '#18191b', rubber: '#202124' },
}

/**
 * Build the earbuds.
 *   renderer      (optional) for the textures' anisotropy limit
 *   meshes        { bud, remote }: the mesher's outputs for earbudsMeshJobs() ({ positions, normals,
 *                 ao, indices }; the arrays are used as they are, not copied)
 *   colorway      'black' (the only one)
 *   envIntensity  the environment's intensity on these materials, in place of scene.environment-
 *                 Intensity (which three.js otherwise gives every material); undefined: the
 *                 scene's, as in the original (whose scene's was 1). Later: setEnvIntensity(k).
 *   layout        the render state's layout (earbudsStateLayout(...)); default the original's
 *   textures      (optional) earbudsTextures()' output, made in a worker; else made here
 * Returns
 *   group         THREE.Group: the six parts (matrixAutoUpdate false) and the cable
 *   parts         { budL, budR, remote, splitter, bead, plug }: each a group of one mesh per material
 *   cableMesh     every chain in one mesh (frustumCulled false), rebuilt by applyState
 *   materials     every material (MeshPhysicalMaterial, named 'earbuds.<name>'; budL and budR share
 *                 'earbuds.bud'). Each has an onBeforeCompile and a customProgramCacheKey: chain
 *                 onto both (as core/emberlight.js's withEmber does)
 *   layout        the layout it was built for; stateSize(rigLike?): its size, or a rig's
 *   applyState(state), setColorway(name), mixColorways(a, b, t) (an eased blend, for a tween),
 *   colorway (the current name; null mid-blend), setEnvIntensity(k), dispose()
 * Colourways and the environment's intensity change colours and uniforms only: nothing recompiles.
 */
/** The earbuds, built in steps (core/steps.js): it yields between its heavier parts. */
function* earbudsSteps({ renderer = null, meshes, colorway = 'black', envIntensity, layout = G.earbudsStateLayout(), textures = null } = {}) {
  if (!meshes || !meshes.bud || !meshes.remote) throw new Error('createEarbudsAsync: meshes { bud, remote } (earbudsMeshJobs) are required')
  layout = G.earbudsStateLayout(layout)
  const disposables = []

  // ---- textures
  const tex = textures || earbudsTextures()
  const letters = tex.letters || letterPixels()
  const aniso = renderer ? Math.min(ANISO, renderer.capabilities.getMaxAnisotropy()) : ANISO
  function dataTex(data, w, h, srgb, repeat) {
    const t = new THREE.DataTexture(data, w, h)
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.magFilter = THREE.LinearFilter
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.generateMipmaps = true
    t.anisotropy = aniso
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    disposables.push(t)
    return t
  }
  const braid = { normal: dataTex(tex.braid.normal, 256, 256, false, true), rough: dataTex(tex.braid.rough, 256, 256, false, true), albedo: dataTex(tex.braid.albedo, 256, 256, true, true) }
  const LETTERS = { LR: letters ? dataTex(letters.px, letters.w, letters.h, false) : null } // L and R side by side
  // (the perforated meshes' holes are drawn in their shader: the alpha map is never sampled, it
  // only gives the shader its uv; the original's 128 x 128 drawing is not needed)
  const perfAlpha = dataTex(new Uint8Array([255, 255, 255, 255]), 1, 1, false, true)

  // ---- materials
  const envU = { value: typeof envIntensity === 'number' ? envIntensity : -1 }
  const white = new THREE.Color('#ffffff')

  /**
   * Moulded plastic: satin, with a faint noise in its roughness (no sterile highlights), a parting
   * line groove (a plane through the part), and optionally a laser-etched letter. The groove and the
   * letter change roughness, colour and the normal; they are not separate geometry.
   */
  function plasticMaterial(opts) {
    const m = new THREE.MeshPhysicalMaterial({
      color: opts.color,
      roughness: opts.roughness ?? 0.35,
      metalness: 0,
      clearcoat: 0.25,
      clearcoatRoughness: 0.24,
      vertexColors: !!opts.ao,
    })
    const u = {
      uMirror: { value: opts.mirror ? -1 : 1 },
      uAtlas: { value: opts.atlas ? 0.5 : 1 },
      uNoise: { value: opts.noise ?? 0.07 },
      uGroove: { value: new THREE.Vector4(...(opts.groove || [0, 0, 1, 1e6])) },
      uEtch: { value: opts.letter || null },
      uEtchOn: { value: opts.letter ? 1 : 0 },
      uEtchO: { value: new THREE.Vector3(...(opts.etch?.o || [0, 0, 0])) },
      uEtchU: { value: new THREE.Vector3(...(opts.etch?.u || [1, 0, 0])) },
      uEtchV: { value: new THREE.Vector3(...(opts.etch?.v || [0, 1, 0])) },
    }
    m.userData.u = u
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u)
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObj;\nvarying float vSide;\nvarying vec3 vGrooveN;\nvarying vec3 vEtchU;\nvarying vec3 vEtchV;\nuniform float uMirror;\nuniform vec4 uGroove;\nuniform vec3 uEtchU;\nuniform vec3 uEtchV;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vObj = position;
          vSide = determinant(mat3(modelMatrix)) < 0.0 ? 1.0 : 0.0;
          vGrooveN = normalize(normalMatrix * vec3(uGroove.x * uMirror, uGroove.y, uGroove.z));
          vEtchU = normalize(normalMatrix * (vec3(uEtchU.x * uMirror, uEtchU.y, uEtchU.z) * (1.0 - 2.0 * vSide)));
          vEtchV = normalize(normalMatrix * vec3(uEtchV.x * uMirror, uEtchV.y, uEtchV.z));`,
        )
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vObj; varying float vSide; varying vec3 vGrooveN; varying vec3 vEtchU; varying vec3 vEtchV;
          uniform float uMirror; uniform float uNoise; uniform vec4 uGroove; uniform float uAtlas;
          uniform sampler2D uEtch; uniform float uEtchOn; uniform vec3 uEtchO; uniform vec3 uEtchU; uniform vec3 uEtchV;
          float etchAt(vec2 p) { return texture2D(uEtch, vec2((clamp(p.x, 0.0, 1.0) + vSide) * uAtlas, p.y)).r; }
          ${VALUE_NOISE}`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          // design-frame position (mirrored parts read their mirror image)
          vec3 pD = vec3(vObj.x * uMirror, vObj.y, vObj.z);
          float dwN = en(pD * 2.7) * 0.6 + en(pD * 9.0) * 0.4;
          // the parting line: a 0.1 mm groove, faded to an average when it is below a pixel
          float gd = dot(pD, uGroove.xyz) - uGroove.w;
          float gw = fwidth(gd);
          float groove = 1.0 - smoothstep(0.03, 0.065, abs(gd));
          float gAA = clamp(0.05 / max(gw, 1e-4), 0.0, 1.0);
          groove = mix(0.1 * (1.0 - smoothstep(0.0, 0.2 + gw, abs(gd))), groove, gAA);
          diffuseColor.rgb *= 1.0 - 0.45 * groove;
          // the etched letter
          vec2 euv = vec2(dot(pD - uEtchO, uEtchU) * (1.0 - 2.0 * vSide), dot(pD - uEtchO, uEtchV)) + 0.5;
          float etch = 0.0;
          if (uEtchOn > 0.5 && euv.x > 0.0 && euv.y > 0.0 && euv.x < 1.0 && euv.y < 1.0) etch = etchAt(euv);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.72 + vec3(0.06), etch * 0.85);`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
          roughnessFactor = clamp(roughnessFactor + (dwN - 0.5) * uNoise, 0.05, 1.0);
          roughnessFactor = mix(roughnessFactor, min(1.0, roughnessFactor + 0.3), groove);
          roughnessFactor = mix(roughnessFactor, 0.78, etch);`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          {
            // the groove's walls lean towards its middle
            float t = clamp((abs(gd) - 0.03) / 0.035, 0.0, 1.0);
            float slope = sign(gd) * 6.0 * t * (1.0 - t) * gAA;
            vec3 T = vGrooveN - dot(vGrooveN, normal) * normal;
            normal = normalize(normal - T * slope * 1.6);
            // the letter's edges, from the mask's gradient
            if (etch > 0.0 || uEtchOn > 0.5) {
              vec2 d = vec2(dFdx(etch), dFdy(etch));
              float e1 = etchAt(euv + vec2(0.012, 0.0)) - etchAt(euv - vec2(0.012, 0.0));
              float e2 = etchAt(euv + vec2(0.0, 0.012)) - etchAt(euv - vec2(0.0, 0.012));
              float inside = step(0.0, euv.x) * step(0.0, euv.y) * step(euv.x, 1.0) * step(euv.y, 1.0) * uEtchOn;
              normal = normalize(normal + (vEtchU * e1 + vEtchV * e2) * 0.35 * inside);
            }
          }`,
        )
        .replace(
          '#include <lights_physical_fragment>',
          `#include <lights_physical_fragment>
          #ifdef USE_CLEARCOAT
            material.clearcoat *= (1.0 - groove) * (1.0 - 0.9 * etch);
          #endif`,
        )
    }
    m.customProgramCacheKey = () => 'dw-plastic'
    return m
  }

  /**
   * Edges: thin, curved and normal-mapped surfaces widen their highlights by how fast the normal
   * turns across a pixel (geometric specular antialiasing: no sparkle while orbiting).
   */
  function specAA(m, key) {
    const before = m.onBeforeCompile
    m.onBeforeCompile = (sh, r) => {
      before?.call(m, sh, r)
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
        {
          vec3 du = dFdx( normal );
          vec3 dv = dFdy( normal );
          float kernel = min( 2.0 * 0.15 * ( dot( du, du ) + dot( dv, dv ) ), 0.2 );
          float a = material.roughness * material.roughness;
          material.roughness = sqrt( sqrt( min( 1.0, a * a + kernel ) ) );
          #ifdef USE_CLEARCOAT
            float c = material.clearcoatRoughness * material.clearcoatRoughness;
            material.clearcoatRoughness = sqrt( sqrt( min( 1.0, c * c + kernel ) ) );
          #endif
        }`,
      )
    }
    m.customProgramCacheKey = () => key
  }

  /**
   * Every material, last: the environment's intensity from a uniform, when one is given (with
   * scene.environment, three.js sets every material's envMapIntensity to scene.environment-
   * Intensity). Below zero: three's own value, as the original had it. Each material keeps its
   * own program key (suffixed: these programs differ from unpatched ones).
   * (The original also patched three's lights_physical_pars_fragment globally, to widen punctual
   * highlights, matching on a GLSL comment that three's npm build strips: it never applied, and
   * its look is three's own GGX. Nothing of it here.)
   */
  function finish(m, name, key) {
    const before = m.onBeforeCompile
    m.onBeforeCompile = (sh, r) => {
      before.call(m, sh, r)
      sh.uniforms.dwEnvIntensity = envU
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <envmap_physical_pars_fragment>',
        'uniform float dwEnvIntensity;\n' + THREE.ShaderChunk.envmap_physical_pars_fragment.replaceAll('envMapIntensity', '( dwEnvIntensity < 0.0 ? envMapIntensity : dwEnvIntensity )'),
      )
    }
    const k = `${key}|eb`
    m.customProgramCacheKey = () => k
    m.name = 'earbuds.' + name
  }

  const mats = {}
  {
    const C = COLORWAYS.black
    const B = G.BUD
    // the letter on the stem's inner face, upright for someone looking at it with the stem down
    const sa = 10.4
    const st = G.stemAt(sa)
    const up = [-B.stem.dir[0], -B.stem.dir[1], -B.stem.dir[2]]
    const right = [-B.stem.wide[0], -B.stem.wide[1], -B.stem.wide[2]]
    const size = 1.9
    const etch = (mirror) => ({
      o: [st.p[0] + st.rx + 0.05, st.p[1], st.p[2]],
      u: right.map((c) => (c / size) * (mirror ? -1 : 1)),
      v: up.map((c) => c / size),
    })
    const groove = [1, 0, 0, B.parting.x]
    // one material for both buds (the right one is the left, mirrored by its matrix)
    mats.bud = plasticMaterial({ color: C.body, ao: true, groove, letter: LETTERS.LR, atlas: true, etch: etch(false) })
    mats.remote = plasticMaterial({ color: C.body, ao: true, groove: [0, 0, 1, G.REMOTE.seamZ] })
    mats.plastic = plasticMaterial({ color: C.body })
    // the plug's housing: the same plastic, its parting line through its axis (the plane z = 0)
    mats.plug = plasticMaterial({ color: C.body, groove: [0, 0, 1, 0] })
    // soft silicone: a satin surface with a soft sheen at its rim (opaque: see the note at the top)
    mats.tip = new THREE.MeshPhysicalMaterial({
      roughness: 0.55,
      metalness: 0,
      sheen: 0.5,
      sheenRoughness: 0.6,
      specularIntensity: 0.7,
    })
    mats.accent = new THREE.MeshPhysicalMaterial({ color: C.accent, metalness: 1, roughness: 0.26, anisotropy: 0.7, anisotropyRotation: 0, clearcoat: 0.1, clearcoatRoughness: 0.3 })
    mats.steel = new THREE.MeshPhysicalMaterial({ color: '#c7c9cb', metalness: 1, roughness: 0.12 })
    mats.rubber = new THREE.MeshPhysicalMaterial({ color: C.rubber, roughness: 0.62, metalness: 0, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(C.rubber).lerp(new THREE.Color('#ffffff'), 0.25), specularIntensity: 0.5 })
    mats.mesh = new THREE.MeshPhysicalMaterial({
      color: '#2b2d30',
      metalness: 0.85,
      roughness: 0.42,
      alphaMap: perfAlpha,
      alphaTest: 0.5,
      alphaToCoverage: true,
      side: THREE.DoubleSide,
    })
    mats.cavity = new THREE.MeshPhysicalMaterial({ color: '#0d0d0e', roughness: 0.9, metalness: 0, side: THREE.DoubleSide })
    mats.insulator = new THREE.MeshPhysicalMaterial({ color: '#151517', roughness: 0.55, metalness: 0 })
    mats.cable = new THREE.MeshPhysicalMaterial({
      color: C.braid,
      map: braid.albedo,
      roughness: 0.7,
      roughnessMap: braid.rough,
      normalMap: braid.normal,
      normalScale: new THREE.Vector2(0.9, 0.9),
      sheen: 0.6,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(C.braid).lerp(new THREE.Color('#ffffff'), 0.18),
      metalness: 0,
    })
  }
  specAA(mats.cable, 'dw-aa-cable')
  specAA(mats.accent, 'dw-aa-accent')
  specAA(mats.steel, 'dw-aa-steel')
  specAA(mats.rubber, 'dw-aa-rubber')
  specAA(mats.bud, 'dw-plastic-aa')
  specAA(mats.remote, 'dw-plastic-aa')
  specAA(mats.plastic, 'dw-plastic-aa')
  specAA(mats.plug, 'dw-plastic-aa')
  // the perforated mesh: holes drawn in the shader, antialiased, fading to their average
  // coverage once they are smaller than a pixel (alpha to coverage, through the MSAA samples)
  mats.mesh.alphaTest = 0
  mats.mesh.alphaToCoverage = true
  mats.mesh.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <alphamap_fragment>',
      `{
        vec2 g = vAlphaMapUv * 6.0;
        float d = 1e9;
        for ( int k = -1; k <= 1; k ++ ) {
          float row = floor( g.y + 0.5 ) + float( k );
          float sh = mod( row, 2.0 ) * 0.5;
          d = min( d, length( g - vec2( floor( g.x - sh + 0.5 ) + sh, row ) ) );
        }
        float aa = fwidth( d ) * 0.75 + 1e-4;
        float px = max( fwidth( g.x ), fwidth( g.y ) );
        diffuseColor.a = mix( smoothstep( 0.31 - aa, 0.31 + aa, d ), 0.698, smoothstep( 0.3, 0.7, px ) );
      }`,
    )
  }
  mats.mesh.customProgramCacheKey = () => 'dw-perf'
  for (const [name, m] of Object.entries(mats)) finish(m, name, m.customProgramCacheKey === THREE.Material.prototype.customProgramCacheKey ? 'dw-' + name : m.customProgramCacheKey())
  const materials = Object.values(mats)

  // ---- colourways: colours and roughness only (uniforms: nothing recompiles)
  const CW = {}
  for (const [k, C] of Object.entries(COLORWAYS))
    CW[k] = { body: new THREE.Color(C.body), tip: new THREE.Color(C.tip), accent: new THREE.Color(C.accent), braid: new THREE.Color(C.braid), rubber: new THREE.Color(C.rubber), bodyRough: C.bodyRough }
  const cTmp = new THREE.Color()
  /** The tip's colours from its colourway's: the silicone's own, a lighter sheen at its rim. */
  function tipColors(c) {
    const T = mats.tip
    T.color.copy(c)
    T.sheenColor.copy(c).lerp(white, 0.2)
  }
  let current = null
  const bodyMats = [mats.bud, mats.remote, mats.plastic, mats.plug]
  /** Colourway a eased into b by t (0..1, smoothstep, as the original's 0.45 s transition did). */
  function mixColorways(a, b, t) {
    const A = CW[a]
    const Bc = CW[b]
    if (!A || !Bc) return
    const e = THREE.MathUtils.clamp(t, 0, 1)
    const s = e * e * (3 - 2 * e)
    cTmp.copy(A.body).lerp(Bc.body, s)
    for (const m of bodyMats) {
      m.color.copy(cTmp)
      m.roughness = THREE.MathUtils.lerp(A.bodyRough, Bc.bodyRough, s)
    }
    tipColors(cTmp.copy(A.tip).lerp(Bc.tip, s))
    mats.accent.color.copy(A.accent).lerp(Bc.accent, s)
    mats.cable.color.copy(A.braid).lerp(Bc.braid, s)
    mats.cable.sheenColor.copy(mats.cable.color).lerp(white, 0.18)
    mats.rubber.color.copy(A.rubber).lerp(Bc.rubber, s)
    mats.rubber.sheenColor.copy(mats.rubber.color).lerp(white, 0.25)
    current = s >= 1 ? b : s <= 0 ? a : null
  }
  function setColorway(name) {
    if (!CW[name]) return false
    mixColorways(name, name, 1)
    return true
  }
  setColorway(COLORWAYS[colorway] ? colorway : 'black')

  yield

  // ---- geometry helpers
  function meshGeometry(m) {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3))
    const n = m.ao.length
    const col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0.35 + 0.65 * m.ao[i]
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.setIndex(new THREE.BufferAttribute(m.indices, 1))
    g.computeBoundingSphere()
    return g
  }
  /**
   * A turned part: a profile of [radius, axial] points (with an optional smooth flag), revolved;
   * corners keep two vertices so their edges stay crisp. Optional oval cross-section (sx, sz scale).
   * UVs: u round, v along the profile.
   */
  function lathe(profile, segments = 64, sx = 1, sz = 1, closedLoop = false) {
    segments = Math.max(segments, LATHE_SEGS)
    const segN = (a, b) => {
      const dr = b[0] - a[0]
      const dy = b[1] - a[1]
      const l = Math.hypot(dr, dy) || 1
      return [dy / l, -dr / l]
    }
    // a closed profile must run counter-clockwise (r right, y up), so its normals face out
    if (closedLoop) {
      let area = 0
      for (let i = 0; i < profile.length; i++) {
        const a = profile[i]
        const b = profile[(i + 1) % profile.length]
        area += a[0] * b[1] - b[0] * a[1]
      }
      if (area < 0) profile = [...profile].reverse()
    }
    const pts = closedLoop ? [...profile, profile[0]] : profile
    const rows = []
    let acc = 0
    for (let i = 0; i < pts.length; i++) {
      if (i > 0) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
      const [r, y, smooth = true] = pts[i]
      let a = i > 0 ? segN(pts[i - 1], pts[i]) : null
      let b = i < pts.length - 1 ? segN(pts[i], pts[i + 1]) : null
      if (closedLoop && i === 0) a = segN(pts[pts.length - 2], pts[0])
      if (closedLoop && i === pts.length - 1) b = segN(pts[0], pts[1])
      if (a && b && smooth) {
        const l = Math.hypot(a[0] + b[0], a[1] + b[1]) || 1
        rows.push([r, y, (a[0] + b[0]) / l, (a[1] + b[1]) / l, acc])
      } else {
        if (a) rows.push([r, y, ...a, acc])
        if (b) rows.push([r, y, ...b, acc])
      }
    }
    const pos = []
    const nrm = []
    const uv = []
    for (const [r, y, nr, ny, s] of rows)
      for (let j = 0; j <= segments; j++) {
        const t = (j / segments) * Math.PI * 2
        const cs = Math.cos(t)
        const sn = Math.sin(t)
        pos.push(r * cs * sx, y, r * sn * sz)
        const nx = (nr * cs) / sx
        const nz = (nr * sn) / sz
        const l = Math.hypot(nx, ny, nz) || 1
        nrm.push(nx / l, ny / l, nz / l)
        uv.push(j / segments, s)
      }
    const idx = []
    const W = segments + 1
    for (let i = 0; i + 1 < rows.length; i++)
      for (let j = 0; j < segments; j++) {
        const a = i * W + j
        const b = a + W
        idx.push(a, b, a + 1, a + 1, b, b + 1)
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    g.computeBoundingSphere()
    return g
  }
  /** A smooth closed or open profile from a few control points (Catmull-Rom), evenly resampled. */
  function smoothProfile(ctrl, count, closed = false) {
    const P = (i) => (closed ? ctrl[(i + ctrl.length) % ctrl.length] : ctrl[Math.max(0, Math.min(ctrl.length - 1, i))])
    const dense = []
    const nSeg = closed ? ctrl.length : ctrl.length - 1
    for (let i = 0; i < nSeg; i++)
      for (let s = 0; s < 20; s++) {
        const t = s / 20
        const p0 = P(i - 1)
        const p1 = P(i)
        const p2 = P(i + 1)
        const p3 = P(i + 2)
        dense.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t)))
      }
    if (!closed) dense.push(ctrl[ctrl.length - 1])
    const acc = [0]
    for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]))
    const total = acc[acc.length - 1]
    const out = []
    let j = 0
    for (let q = 0; q < count; q++) {
      const s = (q / (closed ? count : count - 1)) * total
      while (j < dense.length - 2 && acc[j + 1] < s) j++
      const t = (s - acc[j]) / (acc[j + 1] - acc[j] || 1)
      out.push([dense[j][0] + (dense[j + 1][0] - dense[j][0]) * t, dense[j][1] + (dense[j + 1][1] - dense[j][1]) * t])
    }
    return out
  }
  /** A matrix placing a part's local y axis along `axis` at `origin` (local x as near `side` as it can). */
  function frameMatrix(origin, axis, side) {
    const y = new THREE.Vector3(...axis).normalize()
    const x = new THREE.Vector3(...side)
    x.addScaledVector(y, -x.dot(y)).normalize()
    const z = new THREE.Vector3().crossVectors(x, y)
    return new THREE.Matrix4().makeBasis(x, y, z).setPosition(...origin)
  }
  const solid = (geo, mat, castShadow = true) => {
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = castShadow
    m.receiveShadow = true
    return m
  }

  // ---- the earbud's turned and flat parts, in the design frame (left bud)
  function earTipGeometry() {
    const T = G.BUD.nozzle.tip
    const f = T.front
    const s = T.skirt
    const R = T.radius - 0.04
    const w = T.wall
    // a bell: close to half an ellipse, widest at its mouth, with a flat lip round the hole; the
    // inside follows the outside one wall in, up to the sleeve that grips the nozzle
    const H = 7.0
    const y0 = s + 0.15
    const outer = (y) => R * Math.sqrt(Math.max(0, 1 - ((y - y0) / H) ** 2))
    const inner = (y) => (R - w) * Math.sqrt(Math.max(0, 1 - ((y - y0) / (H - w)) ** 2))
    const ctrl = [
      [2.06, f - 0.01], // the hole's rounded edge
      [2.4, f - 0.035],
    ]
    for (const d of [0.14, 0.45, 0.9, 1.5, 2.25, 3.1, 4.0, 4.9, 5.6]) ctrl.push([outer(f - d), f - d])
    // the mouth: a rounded edge one wall thick
    ctrl.push([R - 0.03, s + 0.42], [R - 0.1, s + 0.1], [R - w / 2, s], [R - w + 0.07, s + 0.1], [R - w, s + 0.42])
    for (const y of [s + 1.0, s + 2.0, s + 3.0, s + 4.0, s + 4.7]) ctrl.push([inner(y), y])
    ctrl.push(
      [3.1, f - 1.3], // the inside of the bell meets the sleeve
      [2.96, f - 1.8],
      [2.95, s + 2.45], // the sleeve's end
      [2.77, s + 2.12],
      [2.58, s + 2.45],
      [2.57, f - 0.75], // inside the sleeve, up to the lip in front of the nozzle
      [2.28, f - 0.5],
      [1.97, f - 0.32], // the hole
      [1.95, f - 0.14],
    )
    const prof = smoothProfile(ctrl, 260, true)
    return lathe(
      prof.map(([r, y]) => [r, y, true]),
      96,
      1,
      1,
      true,
    )
  }
  function placeOnNozzle(geo) {
    // lathe axis (y) onto the nozzle axis
    const N = G.BUD.nozzle
    const m = frameMatrix(N.base, N.dir, N.frame.u)
    geo.applyMatrix4(m)
    return geo
  }
  function stadiumShape(hu, hv) {
    const s = new THREE.Shape()
    const r = hv
    s.moveTo(-hu + r, -hv)
    s.lineTo(hu - r, -hv)
    s.absarc(hu - r, 0, r, -Math.PI / 2, Math.PI / 2)
    s.lineTo(-hu + r, hv)
    s.absarc(-hu + r, 0, r, Math.PI / 2, Math.PI * 1.5)
    return s
  }
  /** A flat shape set into a frame {o, u, v, w}, `depth` below its origin. UVs in mm / tile. */
  function inFrame(shape, F, depth, tile) {
    const g = new THREE.ShapeGeometry(shape, 32)
    const uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile)
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...F.u), new THREE.Vector3(...F.v), new THREE.Vector3(...F.w))
    m.setPosition(F.o[0] - F.w[0] * depth, F.o[1] - F.w[1] * depth, F.o[2] - F.w[2] * depth)
    g.applyMatrix4(m)
    return g
  }
  function ringGeometry() {
    // the accent ring: a rounded band in the stem's groove, following its oval section
    const B = G.BUD
    const R = B.ring
    const st = G.stemAt(R.at)
    const prof = []
    const hw = R.half - 0.03
    const t = 0.22 // radial thickness above the groove floor
    const rr = 0.15 // (the band's edges, rounded)
    // profile in (radial offset from the groove floor, axial offset), round corners
    const corner = (cx, cy, a0, a1) => {
      for (let k = 0; k <= 6; k++) {
        const a = a0 + ((a1 - a0) * k) / 6
        prof.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
      }
    }
    corner(t - rr, hw - rr, 0, Math.PI / 2)
    corner(-0.05 + rr, hw - rr, Math.PI / 2, Math.PI)
    corner(-0.05 + rr, -hw + rr, Math.PI, 1.5 * Math.PI)
    corner(t - rr, -hw + rr, 1.5 * Math.PI, 2 * Math.PI)
    const seg = 96
    const pos = []
    const uv = []
    const rx0 = st.rx - R.depth
    const rw0 = st.rw - R.depth
    for (let i = 0; i <= prof.length; i++) {
      const [dr, da] = prof[i % prof.length]
      for (let j = 0; j <= seg; j++) {
        const th = (j / seg) * Math.PI * 2
        const ex = (rx0 + dr) * Math.cos(th)
        const ew = (rw0 + dr) * Math.sin(th)
        const a = R.at + da
        pos.push(B.stem.a[0] + B.stem.dir[0] * a + ex, B.stem.a[1] + B.stem.dir[1] * a + B.stem.wide[1] * ew, B.stem.a[2] + B.stem.dir[2] * a + B.stem.wide[2] * ew)
        uv.push(j / seg, i / prof.length)
      }
    }
    const idx = []
    const W = seg + 1
    for (let i = 0; i < prof.length; i++)
      for (let j = 0; j < seg; j++) {
        const a = i * W + j
        const b = a + W
        idx.push(a, a + 1, b, a + 1, b + 1, b)
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }
  function bootGeometry() {
    // the stepped, tapered rubber boot, every corner rounded; it flares a touch at its mouth, where
    // the cable leaves through a bore with a soft lip (no hard line where the two meet)
    const B = G.BUD
    const L = B.boot.len
    const face = B.stem.cut - B.boot.start // where the stem's end face is, along the boot
    const bore = G.CABLE.radius + 0.04
    const prof = filleted(
      [
        [0.0, face - 0.5],
        [1.42, face - 0.5],
        [1.42, face + 1.24],
        [1.32, face + 1.36],
        [1.3, face + 3.06],
        [1.21, face + 3.18],
        [1.2, face + 4.9],
        [1.16, L - 0.55],
        [1.22, L],
        [bore, L],
        [bore, L - 0.8],
        [0, L - 0.8],
      ],
      0.12,
      5,
    )
    const g = lathe(prof, 48)
    const m = frameMatrix(G.stemAt(B.boot.start).p, B.stem.dir, [1, 0, 0])
    g.applyMatrix4(m)
    return g
  }
  /** The bud from its shell, tip, ring and boot geometries (made a step apart). */
  function makeEarbud({ shell, tip, ring, boot }) {
    const grp = new THREE.Group()
    const parts = []
    const B = G.BUD
    parts.push(solid(shell, mats.bud))
    parts.push(solid(tip, mats.tip))
    parts.push(solid(ring, mats.accent))
    parts.push(solid(boot, mats.rubber))
    // the vent: perforated mesh 0.3 mm down, a dark cavity under it
    const V = B.vent
    const ventMesh = inFrame(stadiumShape(V.hu + 0.06, V.hv + 0.06), V.frame, V.recess, 0.55)
    const ventCav = inFrame(stadiumShape(V.hu + 0.08, V.hv + 0.08), V.frame, V.depth - 0.06, 1)
    // the nozzle's mesh, inside the tip
    const N = B.nozzle
    const nf = { o: G.fromFrame(N.frame, 0, 0, N.len), u: N.frame.u, v: N.frame.v, w: N.dir }
    const ell = (a, b) => {
      const s = new THREE.Shape()
      s.absellipse(0, 0, a, b, 0, Math.PI * 2)
      return s
    }
    const nozMesh = inFrame(ell(N.hole.ru + 0.05, N.hole.rv + 0.05), nf, 0.45, 0.55)
    const nozCav = inFrame(ell(N.hole.ru + 0.06, N.hole.rv + 0.06), nf, N.hole.depth - 0.06, 1)
    for (const [g, m] of [
      [ventMesh, mats.mesh],
      [ventCav, mats.cavity],
      [nozMesh, mats.mesh],
      [nozCav, mats.cavity],
    ])
      parts.push(solid(g, m, false))
    for (const p of parts) grp.add(p)
    return grp
  }

  // ---- remote
  function remoteCapGeometry(top) {
    // an oval metal cap from the body's end down to a round collar the cable leaves through
    const R = G.REMOTE
    const C = G.REMOTE_CAP
    const prof = []
    const n = 26
    for (let k = 0; k <= n; k++) {
      const t = k / n
      // radius (in the remote's half-width units) and height
      const a = t * (Math.PI / 2)
      const rr = 1 - 0.62 * (1 - Math.cos(a)) // from the full oval towards the collar
      const y = C.from - 0.25 + (C.to - C.from - 0.5) * Math.sin(a)
      prof.push([rr, y])
    }
    // the collar, its edge rounded, and a bore the cable leaves through (no hard line where they meet)
    const boreS = (G.CABLE.radius + 0.04) / (R.rx - 0.05)
    prof.push([0.36, C.to - 0.5], [0.355, C.to - 0.12], [0.345, C.to - 0.03], [0.33, C.to], [boreS + 0.02, C.to], [boreS, C.to - 0.05], [boreS, C.to - 0.6], [0, C.to - 0.6])
    prof.unshift([0, C.from - 0.25])
    // build with a cross-section that blends from the oval (rx, rz) to round
    const seg = Math.max(64, LATHE_SEGS)
    const pos = []
    const uv = []
    for (let i = 0; i < prof.length; i++) {
      const [s, y] = prof[i]
      const blend = THREE.MathUtils.clamp((y - C.from) / (C.to - C.from), 0, 1) ** 1.5
      const rx = s * (R.rx - 0.05)
      const rz = s * THREE.MathUtils.lerp(R.rz - 0.05, R.rx - 0.05, blend)
      for (let j = 0; j <= seg; j++) {
        const th = (j / seg) * Math.PI * 2
        pos.push(rx * Math.cos(th), top ? y : -y, rz * Math.sin(th))
        uv.push(j / seg, i / prof.length)
      }
    }
    const idx = []
    const W = seg + 1
    for (let i = 0; i + 1 < prof.length; i++)
      for (let j = 0; j < seg; j++) {
        const a = i * W + j
        const b = a + W
        if (top) idx.push(a, b, a + 1, a + 1, b, b + 1)
        else idx.push(a, a + 1, b, a + 1, b + 1, b)
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }
  function makeRemote(body) {
    const grp = new THREE.Group()
    grp.add(solid(body, mats.remote))
    grp.add(solid(remoteCapGeometry(true), mats.accent))
    grp.add(solid(remoteCapGeometry(false), mats.accent))
    return grp
  }

  // ---- splitter and bead
  function makeSplitter() {
    const S = G.SPLITTER
    const grp = new THREE.Group()
    const h = S.half
    const body = lathe(
      [
        [0, -h],
        [S.r - 0.3, -h, false],
        [S.r - 0.05, -h + 0.3],
        [S.r, -h + 0.9],
        [S.r, h - 0.9],
        [S.r - 0.05, h - 0.3],
        [S.r - 0.3, h, false],
        [0, h],
      ],
      64,
    )
    grp.add(solid(body, mats.plastic))
    const cap = (sgn) => {
      const c = S.cap
      const prof = [
        [0, sgn * (h - 0.2)],
        [S.r - 0.12, sgn * (h - 0.2), false],
        [S.r - 0.12, sgn * (h + 0.15)],
        [S.r - 0.35, sgn * (h + c * 0.6)],
        [S.r - 1.0, sgn * (h + c - 0.05)],
        [S.r - 1.4, sgn * (h + c)],
        [0, sgn * (h + c)],
      ]
      if (sgn < 0) prof.reverse()
      return lathe(prof, 64)
    }
    grp.add(solid(cap(1), mats.accent))
    grp.add(solid(cap(-1), mats.accent))
    return grp
  }
  function makeBead() {
    const B = G.BEAD
    const prof = []
    const n = 14
    for (let k = 0; k <= n; k++) {
      const a = -Math.PI / 2 + (k / n) * Math.PI
      // a squarish barrel: straight sides, rounded ends
      const r = Math.cos(a) ** 0.35
      prof.push([r, Math.sin(a) * B.half])
    }
    prof.unshift([0, -B.half])
    prof.push([0, B.half])
    const g = lathe(
      prof.map(([r, y]) => [r * B.rx, y]),
      64,
      1,
      B.rz / B.rx,
    )
    const grp = new THREE.Group()
    grp.add(solid(g, mats.accent))
    return grp
  }

  // ---- the 3.5 mm TRRS plug (straight): relief, moulded housing, accent collar, the pin
  function makePlug() {
    const P = G.PLUG35
    const grp = new THREE.Group()
    // stepped strain relief (round), into the housing: the original plug's
    // (bottom to top, so the faces look out; every step rounded; a bore at the top for the cable)
    const top = P.relief.top
    const bore = G.CABLE.radius + 0.04
    const relief = filleted(
      [[0, 0.2], [2.3, 0.4], [1.95, 2.1], [1.95, 4.9], [1.62, 4.9], [1.62, 7.6], [1.32, 7.6], [1.3, top - 0.45], [1.36, top], [bore, top], [bore, top - 0.8], [0, top - 0.8]],
      0.18,
      5,
    )
    grp.add(solid(lathe(relief, 48), mats.rubber))
    // the housing: a round moulded barrel, its top edge rounded (the relief stands on its flat top),
    // its lower end eased into the collar as the splitter's body is into its caps
    const H = P.housing
    const R = H.r
    const hb = H.bottom
    const E = H.edge
    const hp = [[0, hb], [R - 0.3, hb, false], [R - 0.05, hb + 0.3], [R, hb + 0.9]]
    for (let k = 0; k <= 10; k++) {
      const a = (k / 10) * (Math.PI / 2)
      hp.push([R - E + E * Math.cos(a), H.top - E + E * Math.sin(a)])
    }
    hp.push([0, H.top])
    grp.add(solid(lathe(hp, 64), mats.plug))
    // the collar: accent metal, tapering to the front face like the splitter's caps
    const c = P.collar.len
    const collar = [
      [0, hb - c],
      [R - 1.4, hb - c],
      [R - 1.0, hb - c + 0.05],
      [R - 0.35, hb - c * 0.6],
      [R - 0.12, hb - 0.15],
      [R - 0.12, hb + 0.2, false],
      [0, hb + 0.2],
    ]
    grp.add(solid(lathe(collar, 64), mats.accent))
    // the pin: polished metal, 3.5 mm across; sleeve, ring, ring and tip, their edges broken, the
    // insulating bands between them a hair below the metal. Each piece is a closed solid of turn
    // (its end discs hidden in its neighbours). s: from the face, along -y.
    const pin = P.pin
    const r = pin.r
    const Y = (s) => P.face - s
    const metal = (a, b, hideTop = false) =>
      lathe(
        [
          [0, Y(b)],
          [r - 0.09, Y(b), false],
          [r, Y(b) + 0.07],
          ...(hideTop ? [[r, Y(a)]] : [[r, Y(a) - 0.07], [r - 0.09, Y(a), false]]),
          [0, Y(a)],
        ],
        64,
      )
    const band = (a, b) => lathe([[0, Y(b)], [pin.bandR, Y(b), false], [pin.bandR, Y(a), false], [0, Y(a)]], 64)
    grp.add(solid(metal(-0.4, pin.sleeve[1], true), mats.steel)) // (from inside the collar)
    grp.add(solid(metal(pin.ring2[0], pin.ring2[1]), mats.steel))
    grp.add(solid(metal(pin.ring1[0], pin.ring1[1]), mats.steel))
    grp.add(solid(band(pin.sleeve[1], pin.ring2[0]), mats.insulator))
    grp.add(solid(band(pin.ring2[1], pin.ring1[0]), mats.insulator))
    grp.add(solid(band(pin.ring1[1], pin.tip[0]), mats.insulator))
    // the tip: a rounded cone at its point, back to full size, then a shoulder down into its latch
    // neck, which ends at the first band. (From the point, towards the face.)
    const t0 = pin.tip[0]
    const t1 = pin.tip[1]
    const nk = pin.neck
    const N = pin.nose
    const al = (N.cone * Math.PI) / 180
    const sc = t1 - N.point // the point's round: its centre, on the axis
    const sCone = sc + N.point / Math.sin(al) - r / Math.tan(al) // where the sharp cone would meet the barrel
    const tb = N.round * Math.tan(al / 2) // the round into the barrel: its tangent length
    const tip = [[0, Y(t1)]]
    for (let k = 1; k <= 8; k++) {
      const ph = (k / 8) * (Math.PI / 2 - al)
      tip.push([N.point * Math.sin(ph), Y(sc + N.point * Math.cos(ph))])
    }
    for (let k = 0; k <= 8; k++) {
      const ph = (1 - k / 8) * al
      tip.push([r - N.round + N.round * Math.cos(ph), Y(sCone - tb + N.round * Math.sin(ph))])
    }
    tip.push(
      [r, Y(pin.shoulder)],
      [r - 0.05, Y(pin.shoulder - 0.06), false], // the shoulder's edge, broken
      [nk.r + 0.03, Y(nk.to + 0.03)],
      [nk.r, Y(nk.to)], // the neck
      [nk.r, Y(nk.from)],
      [nk.r + 0.04, Y(nk.from - 0.04)],
      [pin.bandR - 0.04, Y(t0), false],
      [0, Y(t0)],
    )
    grp.add(solid(lathe(tip, 64), mats.steel))
    return grp
  }

  // ---- the parts: built, then merged per part and material (one draw call each)
  /** One mesh per material within a part: the geometries share their attributes' layout. */
  function mergeByMaterial(group) {
    const out = new THREE.Group()
    const byMat = new Map()
    for (const m of group.children) {
      if (!byMat.has(m.material)) byMat.set(m.material, [])
      byMat.get(m.material).push(m)
    }
    for (const [mat, list] of byMat) {
      let mesh = list[0]
      if (list.length > 1) {
        const g = mergeGeometries(list.map((q) => q.geometry))
        for (const q of list) q.geometry.dispose()
        mesh = new THREE.Mesh(g, mat)
        mesh.castShadow = list[0].castShadow
        mesh.receiveShadow = list[0].receiveShadow
      }
      out.add(mesh)
    }
    return out
  }
  const built = {}
  const bud = { shell: meshGeometry(meshes.bud), tip: placeOnNozzle(earTipGeometry()) }
  yield
  bud.ring = ringGeometry()
  bud.boot = bootGeometry()
  yield
  built.budL = makeEarbud(bud)
  yield
  built.remote = makeRemote(meshGeometry(meshes.remote))
  built.splitter = makeSplitter()
  built.bead = makeBead()
  built.plug = makePlug()
  yield
  const group = new THREE.Group()
  group.name = 'earbuds'
  const parts = {}
  for (const name of G.BODY_ORDER) {
    // (the right bud is the left one's meshes again, mirrored by its matrix)
    const merged = name === 'budR' ? parts.budL.clone() : mergeByMaterial(built[name])
    merged.name = name
    merged.matrixAutoUpdate = false
    group.add(merged)
    parts[name] = merged
  }

  yield

  // ---- the cable: every chain in one geometry, rebuilt in place from the physics' tube points
  // (resampled about every millimetre between them, so bends never look polygonal)
  const cable = new CableMesh(layout, G.CABLE.radius, RADIAL, Math.max(3, Math.ceil(layout.spacing / 1.0)), BRAID_TILE)
  const cableMesh = new THREE.Mesh(cable.geometry, mats.cable)
  cableMesh.name = 'cable'
  cableMesh.castShadow = cableMesh.receiveShadow = true
  cableMesh.frustumCulled = false
  group.add(cableMesh)

  // ---- applying a render state (each part's pose; the tube points). No allocation.
  const coms = G.BODY_ORDER.map((name) => G.BODY_COM[name])
  const partList = G.BODY_ORDER.map((name) => parts[name])
  function applyState(st) {
    for (let k = 0; k < partList.length; k++) {
      const o = k * 12
      const com = coms[k]
      const e = partList[k].matrix.elements
      // world = c + R (local - com)
      e[0] = st[o]
      e[1] = st[o + 1]
      e[2] = st[o + 2]
      e[3] = 0
      e[4] = st[o + 3]
      e[5] = st[o + 4]
      e[6] = st[o + 5]
      e[7] = 0
      e[8] = st[o + 6]
      e[9] = st[o + 7]
      e[10] = st[o + 8]
      e[11] = 0
      e[12] = st[o + 9] - (st[o] * com[0] + st[o + 3] * com[1] + st[o + 6] * com[2])
      e[13] = st[o + 10] - (st[o + 1] * com[0] + st[o + 4] * com[1] + st[o + 7] * com[2])
      e[14] = st[o + 11] - (st[o + 2] * com[0] + st[o + 5] * com[1] + st[o + 8] * com[2])
      e[15] = 1
      if (k === 1) {
        // the right bud: the left bud's meshes, mirrored in x (local)
        e[0] = -e[0]
        e[1] = -e[1]
        e[2] = -e[2]
      }
      partList[k].matrixWorldNeedsUpdate = true
    }
    cable.update(st)
  }

  function dispose() {
    const seen = new Set()
    group.traverse((o) => {
      if (o.geometry && !seen.has(o.geometry)) {
        seen.add(o.geometry)
        o.geometry.dispose()
      }
    })
    for (const m of materials) m.dispose()
    for (const t of disposables) t.dispose()
    group.removeFromParent()
  }

  return {
    group,
    parts,
    cableMesh,
    materials,
    layout,
    /** The render state's length: for the layout these earbuds were built with, or for a rig. */
    stateSize: (rigLike) => (rigLike ? G.earbudsStateLayout(rigLike).size : layout.size),
    applyState,
    setColorway,
    mixColorways,
    get colorway() {
      return current
    },
    setEnvIntensity(k) {
      envU.value = typeof k === 'number' ? k : -1
    },
    dispose,
  }
}

/** The earbuds, built a part per task (`tick`: a promise between them), for a page that is loading. */
export function createEarbudsAsync(opts, tick) {
  return runStepsAsync(earbudsSteps(opts), tick)
}

/**
 * A profile's corners rounded: each interior corner becomes an arc of `n` segments, of radius r (or
 * less, where the sides are short). Returns [r, y, smooth] points for the lathe.
 */
function filleted(pts, r, n) {
  const out = [[pts[0][0], pts[0][1], true]]
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1]
    const [cx, cy] = pts[i]
    const [nx, ny] = pts[i + 1]
    const ax = px - cx
    const ay = py - cy
    const bx = nx - cx
    const by = ny - cy
    const la = Math.hypot(ax, ay)
    const lb = Math.hypot(bx, by)
    const half = Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb || 1)))) / 2
    if (half > 1.55 || la < 1e-6 || lb < 1e-6) {
      out.push([cx, cy, true])
      continue
    }
    // the arc's tangent points sit t from the corner; t is held to under half of each side
    const rr = Math.min(r, 0.45 * Math.min(la, lb) * Math.tan(half))
    const t = rr / Math.tan(half)
    const t1x = cx + (ax / la) * t
    const t1y = cy + (ay / la) * t
    const t2x = cx + (bx / lb) * t
    const t2y = cy + (by / lb) * t
    // the arc (a quadratic through the corner's tangents: within a hair of a circle at these sizes)
    for (let k = 0; k <= n; k++) {
      const u = k / n
      out.push([(1 - u) * (1 - u) * t1x + 2 * (1 - u) * u * cx + u * u * t2x, (1 - u) * (1 - u) * t1y + 2 * (1 - u) * u * cy + u * u * t2y, true])
    }
  }
  const e = pts[pts.length - 1]
  out.push([e[0], e[1], true])
  return out
}

/** A vector's length. (Not Math.hypot: V8's allocates an array of its arguments on every call.) */
const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z)

/** The cable's tube: every chain in one geometry, rebuilt in place (no allocation) through the
 *  physics' tube points: centripetal Catmull-Rom, parallel-transport frames, analytic normals. */
class CableMesh {
  constructor(layout, radius, radial, sub, tile) {
    this.radius = radius
    this.radial = radial
    this.sub = sub
    this.tile = tile
    this.counts = layout.chains.map((c) => c.count)
    this.offsets = layout.chains.map((c) => c.offset)
    this.ringStart = []
    let rings = 0
    for (const n of this.counts) {
      this.ringStart.push(rings)
      rings += (n - 1) * sub + 1
    }
    const W = radial + 1
    this.pos = new Float32Array(rings * W * 3)
    this.nrm = new Float32Array(rings * W * 3)
    this.uv = new Float32Array(rings * W * 2)
    this.centre = new Float64Array(rings * 3)
    this.n0 = this.counts.map(() => new Float64Array([0, 1, 0]))
    const idx = []
    this.counts.forEach((n, c) => {
      const r0 = this.ringStart[c]
      const nr = (n - 1) * sub + 1
      for (let r = 0; r < nr - 1; r++)
        for (let k = 0; k < radial; k++) {
          const a = (r0 + r) * W + k
          const b = a + W
          idx.push(a, a + 1, b, b, a + 1, b + 1)
        }
    })
    this.geometry = new THREE.BufferGeometry()
    this.geometry.setIndex(idx)
    this.pa = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage)
    this.na = new THREE.BufferAttribute(this.nrm, 3).setUsage(THREE.DynamicDrawUsage)
    this.ua = new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage)
    this.geometry.setAttribute('position', this.pa)
    this.geometry.setAttribute('normal', this.na)
    this.geometry.setAttribute('uv', this.ua)
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5000)
    this.cs = new Float64Array(radial + 1)
    this.sn = new Float64Array(radial + 1)
    for (let k = 0; k <= radial; k++) {
      this.cs[k] = Math.cos((k / radial) * Math.PI * 2)
      this.sn[k] = Math.sin((k / radial) * Math.PI * 2)
    }
    this.p = new Float64Array(12) // p0..p3
    this.attrs = [this.pa, this.na, this.ua]
  }
  update(st) {
    for (let c = 0; c < this.counts.length; c++) this.chain(st, c)
    // (the whole of each attribute is uploaded: no update ranges, which would allocate)
    for (let k = 0; k < 3; k++) this.attrs[k].needsUpdate = true
  }
  /** Centripetal knot spacing between control points a and b (in P). */
  knot(a, b) {
    const P = this.p
    return Math.max(1e-4, Math.sqrt(len3(P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2])))
  }
  /** Fill P[slot] with control point i of the chain (reflected past the ends). */
  cp(st, off, count, i, slot) {
    const P = this.p
    const s = slot * 3
    if (i < 0 || i > count - 1) {
      const e = off + (i < 0 ? 0 : count - 1) * 3
      const f = off + (i < 0 ? 1 : count - 2) * 3
      P[s] = 2 * st[e] - st[f]
      P[s + 1] = 2 * st[e + 1] - st[f + 1]
      P[s + 2] = 2 * st[e + 2] - st[f + 2]
    } else {
      const e = off + i * 3
      P[s] = st[e]
      P[s + 1] = st[e + 1]
      P[s + 2] = st[e + 2]
    }
  }
  chain(st, c) {
    const sub = this.sub
    const centre = this.centre
    const P = this.p
    const off = this.offsets[c]
    const count = this.counts[c]
    const r0 = this.ringStart[c]
    let w = r0
    for (let i = 0; i < count - 1; i++) {
      this.cp(st, off, count, i - 1, 0)
      this.cp(st, off, count, i, 1)
      this.cp(st, off, count, i + 1, 2)
      this.cp(st, off, count, i + 2, 3)
      const t1 = this.knot(0, 1)
      const t2 = t1 + this.knot(1, 2)
      const t3 = t2 + this.knot(2, 3)
      for (let s = 0; s < sub; s++) {
        const t = t1 + ((t2 - t1) * s) / sub
        for (let q = 0; q < 3; q++) {
          const p0 = P[q]
          const p1 = P[3 + q]
          const p2 = P[6 + q]
          const p3 = P[9 + q]
          const a1 = ((t1 - t) / t1) * p0 + (t / t1) * p1
          const a2 = ((t2 - t) / (t2 - t1)) * p1 + ((t - t1) / (t2 - t1)) * p2
          const a3 = ((t3 - t) / (t3 - t2)) * p2 + ((t - t2) / (t3 - t2)) * p3
          const b1 = ((t2 - t) / t2) * a1 + (t / t2) * a2
          const b2 = ((t3 - t) / (t3 - t1)) * a2 + ((t - t1) / (t3 - t1)) * a3
          centre[w * 3 + q] = ((t2 - t) / (t2 - t1)) * b1 + ((t - t1) / (t2 - t1)) * b2
        }
        w++
      }
    }
    const e = off + (count - 1) * 3
    centre[w * 3] = st[e]
    centre[w * 3 + 1] = st[e + 1]
    centre[w * 3 + 2] = st[e + 2]
    w++
    const pos = this.pos
    const nrm = this.nrm
    const uv = this.uv
    const radius = this.radius
    const radial = this.radial
    const n0 = this.n0[c]
    let nx = n0[0]
    let ny = n0[1]
    let nz = n0[2]
    let along = 0
    for (let r = r0; r < w; r++) {
      const a = Math.max(r0, r - 1)
      const b = Math.min(w - 1, r + 1)
      let tx = centre[b * 3] - centre[a * 3]
      let ty = centre[b * 3 + 1] - centre[a * 3 + 1]
      let tz = centre[b * 3 + 2] - centre[a * 3 + 2]
      const tl = len3(tx, ty, tz) || 1
      tx /= tl
      ty /= tl
      tz /= tl
      if (r > r0) along += len3(centre[r * 3] - centre[(r - 1) * 3], centre[r * 3 + 1] - centre[(r - 1) * 3 + 1], centre[r * 3 + 2] - centre[(r - 1) * 3 + 2])
      // parallel transport: keep the last normal, minus its part along the new tangent
      const d = nx * tx + ny * ty + nz * tz
      nx -= d * tx
      ny -= d * ty
      nz -= d * tz
      let nl = len3(nx, ny, nz)
      if (nl < 1e-4) {
        if (Math.abs(tx) < 0.9) {
          nx = 0
          ny = -tz
          nz = ty
        } else {
          nx = tz
          ny = 0
          nz = -tx
        }
        nl = len3(nx, ny, nz)
      }
      nx /= nl
      ny /= nl
      nz /= nl
      if (r === r0) {
        n0[0] = nx
        n0[1] = ny
        n0[2] = nz
      }
      const bx = ty * nz - tz * ny
      const by = tz * nx - tx * nz
      const bz = tx * ny - ty * nx
      const cx = centre[r * 3]
      const cy = centre[r * 3 + 1]
      const cz = centre[r * 3 + 2]
      const v = along / this.tile
      for (let k = 0; k <= radial; k++) {
        const ox = nx * this.cs[k] + bx * this.sn[k]
        const oy = ny * this.cs[k] + by * this.sn[k]
        const oz = nz * this.cs[k] + bz * this.sn[k]
        const q = (r * (radial + 1) + k) * 3
        pos[q] = cx + ox * radius
        pos[q + 1] = cy + oy * radius
        pos[q + 2] = cz + oz * radius
        nrm[q] = ox
        nrm[q + 1] = oy
        nrm[q + 2] = oz
        const qu = (r * (radial + 1) + k) * 2
        uv[qu] = (k / radial) * 2
        uv[qu + 1] = v
      }
    }
  }
}
