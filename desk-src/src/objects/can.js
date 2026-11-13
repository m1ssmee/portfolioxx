// An energy drink, "late.": a slim 355 ml can (canGeo.js: its profile, its end, its tab), printed a
// dusty persimmon with the brand and keylines left in the bare brushed aluminium, and cold, so it
// sweats (canTex.js). It starts sealed: open() levers the tab up and back, the tongue goes in, a
// wisp of fog leaves the mouth. A light push (nudge) rocks it on the ring it stands on and it
// settles; a knock tips it over and it falls as a rigid body (core/body.js: rings of spheres round
// its axis, so it lands on its side and rolls a little). Open, it pours from its mouth in drops and
// spreads on the desk in a puddle (a few circles, grown as the drink lands, joined smoothly in the
// puddle's shader), fizzing a moment; sealed, it only rolls. Stood up again it is full and the
// puddle dries; reset() also seals it. Nothing moves while it rests (update returns false).
// Frame: the can's own, y up its axis from its bottom (y = 0), its front (the brand) at +x.
import * as THREE from 'three'
import { createBody } from '../core/body.js'
import { bodyGeometry, lidGeometry, tabGeometry, insideGeometry, LID_Y, HINGE_X, TAB_HINGE_X, TAB_Y, TAB_T } from './canGeo.js'
import { bodyTextures, lidTextures, tabShadeCanvas, deskCanvases } from './canTex.js'

export const CAN = { r: 29, h: 150, com: 66, lidY: LID_Y, mouth: 11.8 }
const MAX_BLOBS = 10
const DROPS = 40
const MIST = 10
const G = -9810
const RING = 21.95 // (the ring it stands on: rocking, it pivots on its edge)
const K2 = 2085 + RING * RING + CAN.com * CAN.com // (its moment about that edge, over its mass: mm²)
const DEG = Math.PI / 180
const TAB_REST = 1.5 * DEG // (sealed, its finger end a hair up: room for a fingernail)
/** How far its centre of mass rises, rocked th onto the edge of its ring (mm). */
const rise = (th) => RING * Math.sin(Math.abs(th)) + CAN.com * (Math.cos(th) - 1)
// the drink: pale gold (yuzu and black tea); what a millimetre of it absorbs, by channel
const ABSORB = new THREE.Vector3(0.014, 0.038, 0.13)
const DESK = new THREE.Color(0xf2f0ec)
const smooth01 = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

/**
 * Its normals from the height in its finish map's red (the map is its normalMap too): differences
 * two texels across, so they are right at any distance, the detail fading with the mips.
 */
function fromHeight(mat, k, key) {
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
      `vec2 hts = 1.0 / vec2(textureSize(normalMap, 0));
      vec3 mapN = vec3(
        (texture2D(normalMap, vNormalMapUv - vec2(hts.x, 0.0)).r - texture2D(normalMap, vNormalMapUv + vec2(hts.x, 0.0)).r) * ${k.toFixed(2)},
        (texture2D(normalMap, vNormalMapUv - vec2(0.0, hts.y)).r - texture2D(normalMap, vNormalMapUv + vec2(0.0, hts.y)).r) * ${k.toFixed(2)},
        1.0);`,
    )
  }
  mat.customProgramCacheKey = () => key
}

/** The tab's lift and the tongue's turn (rad), `t` s after the tab was taken: the pop at 0.16 s. */
function tabPose(t) {
  if (t < 0.16) {
    const e = (t / 0.16) ** 2
    return [TAB_REST + (22 * DEG - TAB_REST) * e, 4 * DEG * e]
  }
  if (t < 0.4) {
    const e = smooth01((t - 0.16) / 0.24)
    return [(22 + 46 * e) * DEG, (30 + 52 * e) * DEG]
  }
  if (t < 0.55) return [68 * DEG, 82 * DEG]
  const e = smooth01((t - 0.55) / 0.35)
  return [(68 - 54 * e) * DEG, 82 * DEG]
}
const TAB_DONE = 0.9

/**
 * home: { x, y, z } (world: the middle of its bottom, on the desk), yaw: its turn (rad);
 * sdf(x, y, z, g): what it collides with besides the desk (world, mm; g: the gradient); floorY: the
 * desk's height; clear(x, z): how far a point of the desk is from anything the can must not land
 * on (mm); font: a loaded CSS family for the print; onLand(strength): it hit the desk (1: its fall;
 * less, each time a rocking can comes back down on its base); onOpen(): the seal broke (the hiss).
 */
export function createCan({ home, yaw, sdf, floorY, clear, font, anisotropy = 4, onLand = () => {}, onOpen = () => {} }) {
  const group = new THREE.Group()
  group.matrixAutoUpdate = false
  const geometries = []
  const materials = []
  const textures = []
  /** Mipmapped, filtered, kept for dispose: every texture here. */
  const tex = (t, { srgb = false, wrap = false } = {}) => {
    t.generateMipmaps = true
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.magFilter = THREE.LinearFilter
    t.anisotropy = anisotropy
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    if (wrap) t.wrapS = THREE.RepeatWrapping
    t.needsUpdate = true
    textures.push(t)
    return t
  }

  // ---- the can: the printed body (matte ink, bare metal where the print leaves it: by the finish
  // map, its height giving the normals), the end in plain aluminium, the tab anodized gunmetal;
  // occlusion baked in their colours
  const B = bodyTextures(font)
  const bodyFinish = tex(new THREE.CanvasTexture(B.finish), { wrap: true })
  const printed = new THREE.MeshStandardMaterial({
    map: tex(new THREE.CanvasTexture(B.colour), { srgb: true, wrap: true }),
    roughnessMap: bodyFinish,
    metalnessMap: bodyFinish,
    normalMap: bodyFinish,
    roughness: 1,
    metalness: 1,
    vertexColors: true,
  })
  fromHeight(printed, 8.9, 'can.body')
  const L = lidTextures(font)
  const lidFinish = tex(new THREE.CanvasTexture(L.finish))
  const alu = new THREE.MeshStandardMaterial({
    map: tex(new THREE.CanvasTexture(L.colour), { srgb: true }),
    roughnessMap: lidFinish,
    metalnessMap: lidFinish,
    normalMap: lidFinish,
    roughness: 1,
    metalness: 1,
    vertexColors: true,
  })
  fromHeight(alu, 14, 'can.lid')
  const tabMat = new THREE.MeshStandardMaterial({ color: 0x676b71, metalness: 0.9, roughness: 0.32 })
  const shadeMat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: tex(new THREE.CanvasTexture(tabShadeCanvas())), transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3b3934, metalness: 0.5, roughness: 0.5, side: THREE.BackSide })
  const surfMat = new THREE.MeshStandardMaterial({ color: 0x2b1606, metalness: 0, roughness: 0.08 })
  materials.push(printed, alu, tabMat, shadeMat, wallMat, surfMat)

  const bodyGeo = bodyGeometry()
  const { lid: lidGeo, tongue: tongueGeo } = lidGeometry()
  const { lever: leverGeo, island: islandGeo } = tabGeometry()
  const { wall: wallGeo, surface: surfGeo } = insideGeometry()
  const shadeGeo = new THREE.PlaneGeometry(24, 24).rotateX(-Math.PI / 2).translate(-4, LID_Y + 0.02, 0)
  geometries.push(bodyGeo, lidGeo, tongueGeo, leverGeo, islandGeo, wallGeo, surfGeo, shadeGeo)
  const bodyMesh = new THREE.Mesh(bodyGeo, printed)
  const lidMesh = new THREE.Mesh(lidGeo, alu)
  const tongue = new THREE.Mesh(tongueGeo, alu)
  tongue.position.set(HINGE_X, LID_Y, 0)
  const lever = new THREE.Mesh(leverGeo, tabMat)
  lever.position.set(TAB_HINGE_X, TAB_Y + TAB_T / 2, 0)
  lever.rotation.z = -TAB_REST
  const island = new THREE.Mesh(islandGeo, tabMat)
  const tabShade = new THREE.Mesh(shadeGeo, shadeMat)
  tabShade.renderOrder = 1
  const inside = [new THREE.Mesh(wallGeo, wallMat), new THREE.Mesh(surfGeo, surfMat)]
  for (const m of inside) m.visible = false
  bodyMesh.castShadow = lidMesh.castShadow = lever.castShadow = true
  const parts = [bodyMesh, lidMesh, tongue, lever, island]
  const canMesh = new THREE.Group()
  canMesh.add(...parts, tabShade, ...inside)
  group.add(canMesh)

  // ---- on the desk, where it stands: the wet ring a cold can leaves, and its contact shade
  const DC = deskCanvases()
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xd9d6d0, roughness: 0.12, metalness: 0, alphaMap: tex(new THREE.CanvasTexture(DC.ring)), transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })
  const contactMat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: tex(new THREE.CanvasTexture(DC.shade)), transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
  materials.push(ringMat, contactMat)
  const ringGeo = new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2)
  const contactGeo = new THREE.PlaneGeometry(84, 84).rotateX(-Math.PI / 2)
  geometries.push(ringGeo, contactGeo)
  const wetRing = new THREE.Mesh(ringGeo, ringMat)
  wetRing.position.set(home.x, floorY + 0.06, home.z)
  wetRing.rotation.y = yaw
  wetRing.renderOrder = 1
  wetRing.userData.takesShadow = true
  const contact = new THREE.Mesh(contactGeo, contactMat)
  contact.position.set(home.x, floorY + 0.04, home.z)
  contact.renderOrder = 1
  for (const m of [wetRing, contact]) m.matrixAutoUpdate = false
  wetRing.updateMatrix()
  contact.updateMatrix()

  // ---- its body: rings of spheres round the axis, about its centre of mass (the drink low in it)
  const spheres = []
  for (const [y, rr, sr] of [
    [6.4, 22.4, 6.4],
    [40, 22.6, 6.4],
    [75, 22.6, 6.4],
    [110, 22.6, 6.4],
    [140, 20.2, 5.8],
  ])
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2
      spheres.push([Math.sin(a) * rr, y - CAN.com, Math.cos(a) * rr, sr])
    }
  // (its particles 80 mm apart: about the can's own size, so a sphere at its rim is pushed through
  // weights near one, and a knock turns it over its rim rather than sliding it)
  const body = createBody({ spheres, s: 80, mass: [5, 1, 1, 1], sdf, floorY, friction: 6 })
  const F = new Float64Array(12)
  const pose = new THREE.Matrix4()
  const homeM = new THREE.Matrix4().makeRotationY(yaw).setPosition(home.x, home.y, home.z)
  const ax = new THREE.Vector3()
  const ay = new THREE.Vector3()
  const az = new THREE.Vector3()
  const tv = new THREE.Vector3()

  // ---- the drink: the puddle (a plane on the desk fitted round it; its shape in the shader) and the drops
  const puddleGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
  geometries.push(puddleGeo)
  const blobU = { value: Array.from({ length: MAX_BLOBS }, () => new THREE.Vector3(0, 0, -1)) }
  const fadeU = { value: 1 }
  const fizzU = { value: 0 }
  const originU = { value: new THREE.Vector2(home.x, home.z) }
  // (no clearcoat: its normal would ignore the meniscus; the drink's own surface is sharp enough)
  // (offset towards the eye: a film 0.14 mm over the desk must not lose its depth test to it)
  const puddleMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, ior: 1.33, specularIntensity: 1, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 })
  puddleMat.onBeforeCompile = (sh) => {
    sh.uniforms.uBlobs = blobU
    sh.uniforms.uFade = fadeU
    sh.uniforms.uFizz = fizzU
    sh.uniforms.uOrigin = originU
    sh.uniforms.uDesk = { value: DESK }
    sh.uniforms.uAbsorb = { value: ABSORB }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vPud;\nuniform vec2 uOrigin;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPud = (modelMatrix * vec4(transformed, 1.0)).xz - uOrigin;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vPud;
        uniform vec3 uBlobs[${MAX_BLOBS}];
        uniform float uFade;
        uniform float uFizz;
        uniform vec3 uDesk;
        uniform vec3 uAbsorb;
        float pudHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        // (value noise and its gradient)
        vec3 pudNoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f); vec2 du = 6.0 * f * (1.0 - f);
          float a = pudHash(i); float b = pudHash(i + vec2(1.0, 0.0));
          float c = pudHash(i + vec2(0.0, 1.0)); float d = pudHash(i + vec2(1.0, 1.0));
          float k = a - b - c + d;
          return vec3(a + (b - a) * u.x + (c - a) * u.y + k * u.x * u.y, du * vec2(b - a + k * u.y, c - a + k * u.x));
        }
        // the puddle's edge (mm, and its gradient, in one pass): the circles joined smoothly (the
        // polynomial smooth minimum's gradient is the same mix of theirs), and a wandering edge, as a
        // spill's is
        vec3 pudField(vec2 p) {
          float d = 1e4; vec2 g = vec2(0.0);
          for (int i = 0; i < ${MAX_BLOBS}; i++) {
            vec3 b = uBlobs[i];
            if (b.z <= 0.0) continue;
            vec2 q = p - b.xy; float l = max(length(q), 1e-3);
            float di = l - b.z;
            float h = clamp(0.5 + 0.5 * (d - di) / 9.0, 0.0, 1.0);
            d = mix(d, di, h) - 9.0 * h * (1.0 - h);
            g = mix(g, q / l, h);
          }
          vec3 n1 = pudNoise(p * 0.055); vec3 n2 = pudNoise(p * 0.16);
          return vec3(d + (n1.x - 0.5) * 7.0 + (n2.x - 0.5) * 2.2, g + n1.yz * 0.385 + n2.yz * 0.352);
        }`,
      )
      .replace(
        '#include <alphatest_fragment>',
        `#include <alphatest_fragment>
        vec3 pud = pudField(vPud);
        float aa = max(fwidth(pud.x), 0.2);
        float cover = smoothstep(aa, -aa, pud.x) * uFade;
        if (cover < 0.003) discard;
        // its depth: about 2.8 mm, rounding down over the last 4.5 mm to the edge (the meniscus)
        float pin = max(-pud.x, 0.0);
        float pe = clamp(pin / 4.5, 0.0, 1.0);
        float pdepth = 2.8 * (1.0 - (1.0 - pe) * (1.0 - pe));
        float pslope = 1.25 * (1.0 - pe);
        // the white desk seen down through the drink (less what it absorbs on the way down and up),
        // the meniscus's band, darker where it bends the light away, a little light gathered inside it
        float band = smoothstep(0.0, 0.5, pin) * smoothstep(2.8, 0.8, pin);
        float inner = smoothstep(2.0, 3.0, pin) * smoothstep(4.6, 3.2, pin);
        diffuseColor.rgb = uDesk * exp(-uAbsorb * (2.0 * pdepth + 0.3)) * (1.0 - 0.3 * band + 0.1 * inner);
        // fizz: small bubbles on a fresh spill, most near its edge, gone as it settles
        if (uFizz > 0.01) {
          vec2 fq = vPud / 2.2;
          vec2 fc = floor(fq);
          vec2 fo = fc + 0.25 + 0.5 * vec2(pudHash(fc + 17.3), pudHash(fc + 41.9));
          float fr = 0.14 + 0.12 * pudHash(fc + 7.7);
          float fd = length(fq - fo);
          float fw = fwidth(fd) + 0.02;
          float bub = smoothstep(fr + fw, fr - fw, fd) * smoothstep(fr * 0.35 - fw, fr * 0.75, fd);
          float live = step(pudHash(fc + 3.1), uFizz * (0.25 + 0.55 * (1.0 - pe)));
          diffuseColor.rgb += vec3(0.32, 0.3, 0.26) * bub * live;
        }
        diffuseColor.a = cover * 0.95;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          // (the meniscus: the surface curls down at the edge, outward; the highlight runs round it)
          vec2 pg = pud.yz / max(length(pud.yz), 0.3);
          normal = normalize((viewMatrix * vec4(normalize(vec3(pg.x * pslope, 1.0, pg.y * pslope)), 0.0)).xyz);
        }`,
      )
  }
  puddleMat.customProgramCacheKey = () => 'can.puddle2'
  materials.push(puddleMat)
  const puddle = new THREE.Mesh(puddleGeo, puddleMat)
  puddle.receiveShadow = true
  puddle.renderOrder = 2
  puddle.visible = false
  puddle.frustumCulled = false
  puddle.position.set(home.x, floorY + 0.14, home.z)
  const dropGeo = new THREE.IcosahedronGeometry(1, 1)
  geometries.push(dropGeo)
  const dropMat = new THREE.MeshPhysicalMaterial({ color: 0xf0bf5a, roughness: 0.05, ior: 1.33, transparent: true, opacity: 0.82 })
  materials.push(dropMat)
  const drops = new THREE.InstancedMesh(dropGeo, dropMat, DROPS)
  drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  drops.frustumCulled = false
  drops.visible = false
  const dp = new Float64Array(DROPS * 3)
  const dv = new Float64Array(DROPS * 3)
  const ds = new Float64Array(DROPS)
  const dAlive = new Uint8Array(DROPS)

  // ---- the fog that leaves the mouth as it opens: a few soft cards, facing the camera
  const mistGeo = new THREE.PlaneGeometry(1, 1)
  const mistMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv; varying float vA;
      void main() {
        vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        c.xy += position.xy * length(instanceMatrix[0].xyz);
        vUv = position.xy * 2.0;
        vA = instanceColor.r;
        gl_Position = projectionMatrix * c;
      }`,
    fragmentShader: `
      varying vec2 vUv; varying float vA;
      void main() {
        float r2 = dot(vUv, vUv);
        float a = exp(-3.0 * r2) * (1.0 - smoothstep(0.6, 1.0, r2)) * vA;
        if (a < 0.003) discard;
        gl_FragColor = vec4(0.9, 0.92, 0.95, a);
      }`,
    transparent: true,
    depthWrite: false,
  })
  geometries.push(mistGeo)
  materials.push(mistMat)
  const mist = new THREE.InstancedMesh(mistGeo, mistMat, MIST)
  mist.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mist.frustumCulled = false
  mist.visible = false
  mist.renderOrder = 3
  const mc = new THREE.Color(0, 0, 0)
  for (let i = 0; i < MIST; i++) mist.setColorAt(i, mc)
  const mp = new Float64Array(MIST * 3)
  const mv = new Float64Array(MIST * 3)
  const mAge = new Float64Array(MIST).fill(-1)
  const mLife = new Float64Array(MIST)
  const mSize = new Float64Array(MIST)

  // ---- state
  const st = {
    mode: 'standing', // standing | falling | lying | rising
    fill: 1, // (the drink still in it, 0..1)
    open: false, // (the seal broken)
    tabT: -1, // (s since the tab was taken; -1: at rest)
    lift: TAB_REST,
    tongue: 0,
    rock: { on: false, th: 0, w: 0, dx: 1, dz: 0 },
    t: 0,
    fromM: new THREE.Matrix4(),
    blobs: [], // { x, z (puddle frame), r, vol, kids: [{ a, o, k }] }
    fade: 1,
    drying: false,
    landed: false,
    pourAcc: 0,
    fizz: 0,
    shade: 1, // (the contact shade: there while it stands)
  }
  let rnd = 1
  const rand = () => {
    rnd = (rnd * 16807) % 2147483647
    return rnd / 2147483647
  }

  function placeStanding() {
    pose.copy(homeM)
    group.matrix.copy(pose)
    group.matrixWorldNeedsUpdate = true
  }
  placeStanding()

  /** The axes and the centre of mass of the pose. */
  function comOf(m, out) {
    return out.set(0, CAN.com, 0).applyMatrix4(m)
  }

  /** The way it may fall nearest to `want` (a direction on the desk): clear of everything. */
  function chooseDir(wx, wz) {
    const a0 = Math.atan2(wz, wx)
    const p = new THREE.Vector3().setFromMatrixPosition(homeM)
    let best = null
    for (let k = 0; k <= 12; k++) {
      for (const sgn of k ? [1, -1] : [1]) {
        const a = a0 + sgn * k * (Math.PI / 12)
        const dx = Math.cos(a)
        const dz = Math.sin(a)
        // (lying, it reaches from the rim it tips over to its top: its width either side)
        let ok = true
        for (let t = 0; t <= 165 && ok; t += 15)
          for (const side of [-1, 0, 1]) {
            const x = p.x + dx * (CAN.r + t) - dz * side * CAN.r
            const z = p.z + dz * (CAN.r + t) + dx * side * CAN.r
            if (clear(x, z) < 6) {
              ok = false
              break
            }
          }
        if (ok) return [dx, dz]
        if (!best) best = [dx, dz]
      }
    }
    return best
  }

  const up = [0, 1, 0]
  const pivot = [0, 0, 0]
  const axis = [0, 0, 0]
  /** Knock it over, towards (dx, dz) or the nearest clear way to it. */
  function knock(dx, dz, strength = 1) {
    if (st.mode !== 'standing') return false
    st.rock.on = false
    const l = Math.hypot(dx, dz) || 1
    const [ux, uz] = chooseDir(dx / l, dz / l)
    // the body as it stands, then turning about the rim it tips over
    comOf(pose, tv)
    ax.setFromMatrixColumn(pose, 0)
    ay.setFromMatrixColumn(pose, 1)
    az.setFromMatrixColumn(pose, 2)
    body.set([tv.x, tv.y, tv.z], [ax.x, ax.y, ax.z], [ay.x, ay.y, ay.z], [az.x, az.y, az.z])
    pivot[0] = home.x + ux * CAN.r
    pivot[1] = floorY
    pivot[2] = home.z + uz * CAN.r
    // (about up x the push: the top goes the way it was pushed)
    axis[0] = up[1] * uz - up[2] * 0
    axis[1] = 0
    axis[2] = -up[1] * ux
    const al = Math.hypot(axis[0], axis[2]) || 1
    axis[0] /= al
    axis[2] /= al
    body.spin(pivot, axis, 4.6 + 1.6 * Math.min(1, strength), [ux * 60, 0, uz * 60])
    st.mode = 'falling'
    st.landed = false
    st.t = 0
    rnd = 1 + (Math.floor(Math.abs(dx * 1e4 + dz * 3e3)) % 1e6)
    return true
  }

  /**
   * A light push towards (dx, dz): standing, it rocks up onto the edge of its ring, comes back down,
   * tips a little the other way and settles (strength 0..1: up to about 9 degrees, half its tipping
   * angle). A push while it rocks adds to the rocking.
   */
  function nudge(dx, dz, strength = 0.5) {
    if (st.mode !== 'standing') return false
    const l = Math.hypot(dx, dz)
    if (l < 1e-6) return false
    const r = st.rock
    // (the speed that lifts its centre of mass as far as tipping it so far would: never past 12
    // degrees, whatever the pushes add up to; it would tip at 18)
    const speed = (th, th1) => Math.sqrt(Math.max(0, (2 * -G * (rise(th1) - rise(th))) / K2))
    const w0 = speed(0, (2.5 + 6.5 * Math.min(1, Math.max(0, strength))) * DEG)
    if (!r.on) {
      r.dx = dx / l
      r.dz = dz / l
      r.th = 0
      r.w = 0
      r.on = true
    }
    const w = r.w + w0 * ((dx / l) * r.dx + (dz / l) * r.dz)
    const cap = speed(r.th, 12 * DEG)
    r.w = Math.max(-cap, Math.min(cap, w))
    return true
  }

  /** The seal broken: the tab levers up and back, the tongue goes in, fog leaves the mouth. */
  function open() {
    if (st.open || st.tabT >= 0 || st.mode === 'falling' || st.mode === 'rising') return false
    st.tabT = 0
    return true
  }

  /** Stood up again where it started, full; the puddle dries. */
  function standUp() {
    if (st.mode === 'standing' || st.mode === 'rising') return
    st.fromM.copy(pose)
    st.mode = 'rising'
    st.t = 0
    st.drying = st.blobs.length > 0
    body.awake = false
    for (let i = 0; i < DROPS; i++) dAlive[i] = 0
  }

  /** Standing, full and sealed, the desk dry. */
  function reset() {
    body.awake = false
    st.mode = 'standing'
    st.fill = 1
    st.open = false
    st.tabT = -1
    st.rock.on = false
    st.blobs.length = 0
    st.drying = false
    st.fade = 1
    st.fizz = 0
    st.shade = 1
    fadeU.value = 1
    fizzU.value = 0
    puddle.visible = false
    for (let i = 0; i < DROPS; i++) dAlive[i] = 0
    drops.visible = false
    mAge.fill(-1)
    mist.visible = false
    setTab(TAB_REST, 0)
    syncBlobs()
    placeStanding()
    contactMat.opacity = 0.42
    contact.visible = true
  }

  function setTab(lift, tongueA) {
    st.lift = lift
    st.tongue = tongueA
    lever.rotation.z = -lift
    tongue.rotation.z = -tongueA
    // (the shade under the tab lifts with it; inside shows once the tongue is in)
    shadeMat.opacity = 0.5 * (1 - smooth01((lift - TAB_REST) / (20 * DEG)))
    tabShade.visible = shadeMat.opacity > 0.01
    for (const m of inside) m.visible = tongueA > 0.5 * DEG
  }

  // ---- the fog
  const mouthW = new THREE.Vector3()
  function puff() {
    mouthW.set(CAN.mouth, LID_Y + 1, 0).applyMatrix4(pose)
    ay.setFromMatrixColumn(pose, 1)
    for (let i = 0; i < MIST; i++) {
      const a = rand() * Math.PI * 2
      const r = rand() * 4
      mp[i * 3] = mouthW.x + Math.cos(a) * r
      mp[i * 3 + 1] = mouthW.y
      mp[i * 3 + 2] = mouthW.z + Math.sin(a) * r
      const sp = 60 + 80 * rand()
      mv[i * 3] = ay.x * sp + (rand() - 0.5) * 70
      mv[i * 3 + 1] = ay.y * sp + (rand() - 0.5) * 20
      mv[i * 3 + 2] = ay.z * sp + (rand() - 0.5) * 70
      mAge[i] = -rand() * 0.15
      mLife[i] = 0.9 + 0.6 * rand()
      mSize[i] = 14 + 10 * rand()
    }
  }
  const mm4 = new THREE.Matrix4()
  function stepMist(dt) {
    let n = 0
    for (let i = 0; i < MIST; i++) {
      if (mAge[i] === -1) continue
      mAge[i] += dt
      if (mAge[i] >= mLife[i]) {
        mAge[i] = -1
        continue
      }
      if (mAge[i] < 0) continue
      const k = Math.exp(-dt * 4.2)
      mv[i * 3] *= k
      mv[i * 3 + 1] = mv[i * 3 + 1] * k - 25 * dt // (cold, and heavier than air: it sinks a little)
      mv[i * 3 + 2] *= k
      for (let j = 0; j < 3; j++) mp[i * 3 + j] += mv[i * 3 + j] * dt
      const t = mAge[i] / mLife[i]
      const s = 2.5 + mSize[i] * Math.sqrt(t)
      mm4.makeScale(s, s, s).setPosition(mp[i * 3], mp[i * 3 + 1], mp[i * 3 + 2])
      mist.setMatrixAt(n, mm4)
      mc.setRGB(0.42 * smooth01(t / 0.1) * Math.pow(1 - t, 1.5), 0, 0)
      mist.setColorAt(n, mc)
      n++
    }
    let live = n
    for (let i = 0; i < MIST; i++) if (mAge[i] !== -1 && mAge[i] < 0) live++
    mist.count = n
    mist.visible = n > 0
    mist.instanceMatrix.needsUpdate = true
    mist.instanceColor.needsUpdate = true
    return live > 0
  }

  // ---- rocking on the ring's edge: gravity's torque about it, the base slapping back down
  const rockM = new THREE.Matrix4()
  const rockAxis = new THREE.Vector3()
  function stepRock(dt) {
    const r = st.rock
    const h = 1 / 240
    for (let t = 0; t < dt && r.on; t += h) {
      const s = Math.sign(r.th) || Math.sign(r.w)
      const a = Math.abs(r.th)
      r.w -= (s * -G * (RING * Math.cos(a) - CAN.com * Math.sin(a)) * Math.min(h, dt - t)) / K2
      const th = r.th + r.w * Math.min(h, dt - t)
      if (r.th !== 0 && Math.sign(th) !== Math.sign(r.th)) {
        // (down on its base: the blow takes about half its swing; it rocks onto the other edge)
        onLand(Math.min(1, Math.abs(r.w) / 6))
        r.w *= 0.5
        r.th = 0
        if (Math.abs(r.w) < 0.12) r.on = false
      } else r.th = Math.max(-15 * DEG, Math.min(15 * DEG, th))
    }
    if (!r.on) r.th = r.w = 0
    // the pose: turned by th about the edge it is on
    const s = r.th >= 0 ? 1 : -1
    rockAxis.set(r.dz, 0, -r.dx)
    rockM.makeTranslation(-(home.x + s * r.dx * RING), -home.y, -(home.z + s * r.dz * RING))
    pose.copy(homeM).premultiply(rockM)
    rockM.makeRotationAxis(rockAxis, r.th)
    pose.premultiply(rockM)
    rockM.makeTranslation(home.x + s * r.dx * RING, home.y, home.z + s * r.dz * RING)
    pose.premultiply(rockM)
    group.matrix.copy(pose)
    group.matrixWorldNeedsUpdate = true
    return r.on
  }

  // ---- the drink, each step
  const mouth = new THREE.Vector3()
  function syncBlobs() {
    const arr = blobU.value
    let n = 0
    for (const b of st.blobs) {
      if (n >= MAX_BLOBS) break
      arr[n++].set(b.x, b.z, b.r)
      for (const kd of b.kids) {
        if (n >= MAX_BLOBS) break
        arr[n++].set(b.x + Math.cos(kd.a) * b.r * kd.o, b.z + Math.sin(kd.a) * b.r * kd.o, b.r * kd.k)
      }
    }
    for (; n < MAX_BLOBS; n++) arr[n].set(0, 0, -1)
    // (the plane only as large as the spill: its shader runs only where there may be drink)
    if (!st.blobs.length) return
    let x0 = Infinity
    let x1 = -Infinity
    let z0 = Infinity
    let z1 = -Infinity
    for (const b of arr) {
      if (b.z <= 0) continue
      x0 = Math.min(x0, b.x - b.z)
      x1 = Math.max(x1, b.x + b.z)
      z0 = Math.min(z0, b.y - b.z)
      z1 = Math.max(z1, b.y + b.z)
    }
    const m = 13
    puddle.position.set(home.x + (x0 + x1) / 2, floorY + 0.14, home.z + (z0 + z1) / 2)
    puddle.scale.set(x1 - x0 + 2 * m, 1, z1 - z0 + 2 * m)
  }
  /** Drink poured at (x, z) (world, on the desk), dv of the can (0..1). */
  function landAt(x, z, dvol) {
    const px = x - home.x
    const pz = z - home.z
    let b = st.blobs[st.blobs.length - 1]
    if (!b || Math.hypot(b.x - px, b.z - pz) > Math.max(16, b.r * 0.5)) {
      if (st.blobs.length >= 4) b = st.blobs[st.blobs.length - 1]
      else {
        b = { x: px, z: pz, r: 2, vol: 0, kids: [] }
        // (two or three lobes off it: a spill's edge is never a circle)
        const nk = 2 + Math.floor(rand() * 2)
        for (let k = 0; k < nk; k++) b.kids.push({ a: rand() * Math.PI * 2, o: 0.55 + 0.35 * rand(), k: 0.38 + 0.22 * rand() })
        st.blobs.push(b)
        puddle.visible = true
      }
    }
    b.vol += dvol
  }
  const K_AREA = 92 * 92 // (mm², the puddle a whole can makes: a hand's span across)
  function stepDrink(h) {
    let busy = false
    // pouring, once open (the tongue in): past ~70 degrees over, quicker the further
    if (st.open && st.tongue > 30 * DEG && st.mode !== 'standing' && st.mode !== 'rising' && st.fill > 0) {
      ay.setFromMatrixColumn(pose, 1)
      const tilt = ay.y // (cos of the axis to the vertical)
      const rate = THREE.MathUtils.smoothstep(-tilt, -0.34, 0.15) * 0.42
      if (rate > 0) {
        const dvol = Math.min(st.fill, rate * h)
        st.fill -= dvol
        st.fizz = 1
        mouth.set(CAN.mouth, CAN.lidY, 0).applyMatrix4(pose)
        // (the stream lands a little past the mouth, the way the can points)
        landAt(mouth.x + ay.x * 14, mouth.z + ay.z * 14, dvol)
        // drops from the mouth
        st.pourAcc += rate * h * 160
        while (st.pourAcc >= 1) {
          st.pourAcc -= 1
          for (let i = 0; i < DROPS; i++) {
            if (dAlive[i]) continue
            dAlive[i] = 1
            dp[i * 3] = mouth.x
            dp[i * 3 + 1] = mouth.y
            dp[i * 3 + 2] = mouth.z
            const sp = 180 + 140 * rand()
            dv[i * 3] = ay.x * sp + (rand() - 0.5) * 60
            dv[i * 3 + 1] = Math.max(0, ay.y) * sp + 60 * rand()
            dv[i * 3 + 2] = ay.z * sp + (rand() - 0.5) * 60
            ds[i] = 1.4 + 1.6 * rand()
            break
          }
        }
        busy = true
      }
    }
    // the drops fly and land
    let any = false
    for (let i = 0; i < DROPS; i++) {
      if (!dAlive[i]) continue
      any = true
      dv[i * 3 + 1] += G * h
      dp[i * 3] += dv[i * 3] * h
      dp[i * 3 + 1] += dv[i * 3 + 1] * h
      dp[i * 3 + 2] += dv[i * 3 + 2] * h
      if (dp[i * 3 + 1] < floorY + ds[i] * 0.5) dAlive[i] = 0
    }
    if (any) busy = true
    // the puddle spreads towards the area its drink covers, quickly at first, then slowly
    for (const b of st.blobs) {
      const target = Math.sqrt(b.vol * K_AREA)
      if (target - b.r > 0.05) {
        b.r += (target - b.r) * (1 - Math.exp(-h * 2.6))
        busy = true
      }
    }
    // (the fizz dies down over a couple of seconds once the pouring stops)
    if (st.fizz > 0 && !busy) st.fizz = Math.max(0, st.fizz - h / 2.2)
    if (st.fizz > 0) busy = true
    fizzU.value = st.fizz
    if (st.drying) {
      st.fade = Math.max(0, st.fade - h / 1.4)
      fadeU.value = st.fade
      if (st.fade <= 0) {
        st.drying = false
        st.blobs.length = 0
        st.fade = 1
        st.fizz = 0
        fadeU.value = 1
        fizzU.value = 0
        puddle.visible = false
      }
      busy = true
    }
    syncBlobs()
    return busy
  }

  const dm = new THREE.Matrix4()
  const yUp = new THREE.Vector3(0, 1, 0)
  const dq = new THREE.Quaternion()
  const ds3 = new THREE.Vector3()
  const dpos = new THREE.Vector3()
  const q1 = new THREE.Quaternion().setFromRotationMatrix(homeM)
  const p1 = new THREE.Vector3().setFromMatrixPosition(homeM)
  function drawDrops() {
    let n = 0
    for (let i = 0; i < DROPS; i++) {
      if (!dAlive[i]) continue
      const s = ds[i]
      // (stretched along its flight)
      const vl = Math.hypot(dv[i * 3], dv[i * 3 + 1], dv[i * 3 + 2]) || 1
      tv.set(dv[i * 3] / vl, dv[i * 3 + 1] / vl, dv[i * 3 + 2] / vl)
      dq.setFromUnitVectors(yUp, tv)
      ds3.set(s, s * (1 + Math.min(1.4, vl / 600)), s)
      dm.compose(dpos.set(dp[i * 3], dp[i * 3 + 1], dp[i * 3 + 2]), dq, ds3)
      drops.setMatrixAt(n++, dm)
    }
    if (!n && !drops.visible) return
    drops.count = n
    drops.visible = n > 0
    drops.instanceMatrix.needsUpdate = true
  }

  const api = {
    group,
    puddle,
    drops,
    /** More of it to add to the scene: the fog, the wet ring and the contact shade on the desk. */
    extras: [mist, wetRing, contact],
    meshes: parts,
    st,
    get standing() {
      return st.mode === 'standing'
    },
    /** The seal is broken (it pours when it is knocked over). */
    get opened() {
      return st.open
    },
    knock,
    nudge,
    open,
    standUp,
    reset,
    /** Where it is (world): the middle of its body. */
    center: (out) => comOf(pose, out),
    /** For the physics scheduler: the fall. */
    physics: {
      awake: () => body.awake,
      step: (h) => {
        body.step(h)
      },
    },
    /** Each frame; returns true while anything of it moves. */
    update(dt) {
      let busy = false
      if (st.mode === 'falling' || st.mode === 'lying') {
        body.frame(F)
        ax.set(F[3], F[4], F[5])
        ay.set(F[6], F[7], F[8])
        az.set(F[9], F[10], F[11])
        pose.makeBasis(ax, ay, az)
        tv.set(F[0], F[1], F[2]).addScaledVector(ay, -CAN.com)
        pose.setPosition(tv)
        group.matrix.copy(pose)
        group.matrixWorldNeedsUpdate = true
        if (!st.landed && body.contact && ay.y < 0.6) {
          st.landed = true
          onLand(1)
        }
        if (body.awake) busy = true
        else st.mode = 'lying'
      } else if (st.mode === 'rising') {
        st.t = Math.min(1, st.t + dt / 0.75)
        const e = st.t * st.t * (3 - 2 * st.t)
        // (lifted, turned upright and set down where it stood)
        st.fromM.decompose(tv, dq, ds3)
        dq.slerp(q1, e)
        tv.lerp(p1, e)
        tv.y += Math.sin(Math.PI * e) * 40
        pose.compose(tv, dq, ds3.set(1, 1, 1))
        group.matrix.copy(pose)
        group.matrixWorldNeedsUpdate = true
        if (st.t >= 1) {
          st.mode = 'standing'
          st.fill = 1
          placeStanding()
        }
        busy = true
      } else if (st.rock.on) {
        stepRock(Math.min(dt, 1 / 20))
        busy = true
      }
      // the tab, once taken: up, the pop (the hiss, the fog), back down
      if (st.tabT >= 0) {
        const t0 = st.tabT
        st.tabT += Math.min(dt, 1 / 20)
        if (t0 < 0.16 && st.tabT >= 0.16) {
          st.open = true
          puff()
          onOpen()
        }
        const [lift, tg] = tabPose(Math.min(st.tabT, TAB_DONE))
        setTab(lift, tg)
        if (st.tabT >= TAB_DONE) st.tabT = -1
        busy = true
      }
      if (mist.visible || mAge.some((a) => a !== -1)) if (stepMist(Math.min(dt, 1 / 20))) busy = true
      // (the contact shade: there while it stands)
      const shade = st.mode === 'standing' ? 1 : 0
      if (st.shade !== shade) {
        st.shade = shade > st.shade ? Math.min(1, st.shade + dt / 0.25) : Math.max(0, st.shade - dt / 0.12)
        contactMat.opacity = 0.42 * st.shade
        contact.visible = st.shade > 0.01
        busy = true
      }
      if (stepDrink(Math.min(dt, 1 / 30))) busy = true
      drawDrops()
      return busy
    },
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
      for (const t of textures) t.dispose()
      drops.dispose()
      mist.dispose()
    },
  }
  return api
}
