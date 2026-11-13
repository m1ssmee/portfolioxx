// The desk lamp: a spring-balanced task lamp of the classic kind (an Anglepoise's proportions) in bone
// enamel with brass arms, at the back corner of the desk; the room's key light at dusk comes from its
// bulb (the scene's SpotLight, kept on `bulb` and `axis`). Built straight in world space from three
// points: the middle of its foot on the desk, the head's pivot, and what it lights.
//   foot    a weighted round base, 183 mm across: its rim rolled, a low dome up to a boss, a line of
//           dark felt under it; a cream turret on the boss in a brass collar, the yoke on top
//   arms    twin brass rods, 300 mm axle to axle each (the elbow found by two-bone IK); cast brass
//           knuckles on pivot bolts, a knurled nut one side and a hex nut the other; two tension
//           springs hooked on the yoke's pins and a bar on the lower arm, one from the upper arm's
//           tail down to the lower arm
//   head    a swivel at the arm's end (about the vertical) and a fork (the tilt): the shade, 151 mm
//           across, spun and enamelled, its lip rolled, a ring of vents round its cup and a toggle
//           switch on top; white inside, a holder and a frosted A60 bulb, its middle 37 mm in from
//           the lip (so the scene's 62 degree cone just clears the lip)
//   cable   braided cloth: clipped along both arms, into the base by the turret, out at its back,
//           across the desk and off its back edge in a loose curve
// Materials: enamel (orange peel, mottling, scratches, dust on what faces up, a few chips at the
// rolled edges), brass (streaked along the rods, cast grain on the knuckles, knurling that fades
// with distance), close-wound steel springs and the cloth braid (drawn in their shaders, fading out
// where they would be finer than a pixel), the shade's white inside and the bulb (lit by the bulb's
// own light, not the scene's). Occlusion is baked into every vertex. Nothing casts a shadow: the
// shade and the bulb hold the light, and the rest stands outside its cone.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { smoothToward } from '../core/follow.js'
import { FWD } from '../layout.js'
import * as room from './room.js'
import { part, add, flatten, geometry, lathe, tube, tubeGeometry, tubeIndex, rodPoints, plate, hex, alongY, frame, occlude, detailPixels, shadowPixels } from './lampParts.js'

/** The foot, as an obstacle: its radius and height (mm). */
export const LAMP = { footR: 91.7, footH: 30 }

const L1 = 300 // (the lower arm, axle to axle)
const L2 = 300 // (the upper arm)
const SHOULDER = 68 // (the shoulder's axle, above the desk)
const TC = 26 // (the shade's tilt axle, below the head's pivot)
const BULB = 121.5 // (the bulb's middle, along the shade from its tilt axle)
const CUP = 31.4 // (the shade's cup, its radius: the vents round it at VENT_Y, the switch on its top)
const VENT_Y = 35.5
const SW_Y = 31 // (the switch, along the cup)
const CABLE_R = 3
const PAN = THREE.MathUtils.degToRad(70) // (the swivel: this far either way of the arm's heading)
const TILT0 = THREE.MathUtils.degToRad(12) // (the shade's tilt below level: from nearly level ...)
const TILT1 = THREE.MathUtils.degToRad(100) // (... to a little past straight down)
const AIM_SMOOTH = 0.24 // (s: about how long a re-aim takes)
const AIM_SPEED = 2.4 // (rad/s at most)
const SWITCH = 0.42 // (the toggle's throw either way, rad)

// zones, per vertex: enamel [dust, wear, felt, vents]; brass [steel, knurl, cast, 0]
const Z0 = [0, 0, 0, 0]
const CAST = [0, 0, 1, 0]
const STEEL = [1, 0, 0, 0]
const DARK = [0, 0, 1, 0] // (enamel's felt: the felt, the rubber grommets, the cable clips)

const deg = THREE.MathUtils.degToRad
let DETAIL = null // (the detail texture's pixels: baked once a page)
const wrapPi = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI))

// ---- profiles, turned about +y: [r, y, occlusion, zone...] (the outside on the right of the way
// each runs)
/** The base's enamelled cover: from under its rolled edge, round it, over the dome to the boss. */
function baseProfile() {
  const P = [[84.6, 1.85, 0.4, 0, 0.4]]
  for (let a = -112; a <= 116; a += 19) {
    const t = deg(a)
    P.push([87.6 + 4.1 * Math.cos(t), 5.9 + 4.1 * Math.sin(t), a < -50 ? 0.5 + (0.5 * (a + 112)) / 62 : 1, 0, 1])
  }
  P.push(
    [83.6, 9.55, 0.8, 0, 0.4],
    [80, 10.6, 0.95, 0, 0.1],
    [74, 12.4, 1],
    [66, 14.9, 1],
    [57, 17.6, 1],
    [48, 20.0, 1],
    [41, 21.7, 0.95],
    [37.6, 22.7, 0.84],
    [36.3, 23.5, 0.8],
    [35.7, 24.8, 0.86],
    [35.5, 26.6, 0.93, 0, 0.2],
    [35.1, 28.3, 0.98, 0, 0.35],
    [34.1, 29.4, 1, 0, 0.35],
    [32.4, 29.95, 0.97],
    [29.0, 30.1, 0.88],
    [25.4, 30.1, 0.62],
  )
  return P
}
// (the felt stands a little proud of the rolled edge's underside: from the chair, a dark line under it)
const FELT = [
  [0, 0.03, 0.5, 0, 0, 1],
  [87.6, 0.03, 0.45, 0, 0, 1],
  [88.3, 0.5, 0.55, 0, 0, 1],
  [88.4, 1.25, 0.6, 0, 0, 1],
  [87.4, 1.95, 0.35, 0, 0, 1],
]
const POST = [
  [17.6, 33.6, 0.5],
  [17.6, 36, 0.7],
  [17.6, 50.4, 0.95],
  [17.1, 51.8, 1, 0, 0.4],
  [15.7, 52.5, 0.95, 0, 0.3],
  [12, 52.7, 0.7],
]
const COLLAR = [
  [25.2, 29.7, 0.45, 0, 0, 1],
  [25.6, 30.4, 0.75, 0, 0, 1],
  [25.6, 32.6, 1, 0, 0, 1],
  [25.0, 33.7, 1, 0, 0, 1],
  [22.4, 34.3, 0.85, 0, 0, 1],
  [17.6, 34.5, 0.55, 0, 0, 1],
]
/** The shade's outside: the back of its cup, the cup (the vents), the seam, the bell, the rolled lip. */
function shadeProfile() {
  const P = [
    [0, 19.4, 0.7],
    [8, 19.55, 0.8],
    [16, 19.95, 0.9],
    [22, 20.5, 1],
    [26.5, 21.3, 1, 0, 0.3],
    [29.3, 22.5, 1, 0, 0.6],
    [30.8, 24.2, 1, 0, 0.6],
    [CUP, 26.2, 1, 0, 0.2],
    [CUP, 29.5, 1, 0, 0, 0, 1],
    [CUP, 41.5, 1, 0, 0, 0, 1],
    [31.7, 42.6, 0.95],
    [32.6, 43.3, 1, 0, 0.5],
    [33.2, 44.2, 1, 0, 0.5],
    [33.0, 45.3, 1, 0, 0.3],
    [32.5, 46.0, 0.72],
    [33.4, 47.6, 0.8],
    [35.6, 50.8, 0.95],
    [38.9, 55.2, 1],
    [42.8, 60.5, 1],
    [46.4, 66.5, 1],
    [49.6, 74.5, 1],
    [52.9, 84, 1],
    [56.3, 95, 1],
    [59.8, 107, 1],
    [63.3, 119.5, 1],
    [66.5, 132, 1],
    [69.2, 143.5, 1],
    [71.0, 152.5, 1],
    [71.7, 157.0, 1, 0, 0.4],
  ]
  for (let a = 170; a >= -120; a -= 29) P.push([73.55 + 1.9 * Math.cos(deg(a)), 158.05 + 1.9 * Math.sin(deg(a)), a < -60 ? 0.6 : 1, 0, 1])
  return P
}
// (inside, white: from the lip back into the cup, round the holder)
const SHADE_IN = [
  [71.25, 158.75, 1],
  [70.85, 157.0, 1],
  [70.1, 152.5, 1],
  [68.3, 143.5, 1],
  [65.6, 132, 1],
  [62.4, 119.5, 1],
  [58.9, 107, 1],
  [55.4, 95, 0.98],
  [52.0, 84, 0.95],
  [48.7, 74.5, 0.92],
  [45.5, 66.5, 0.88],
  [41.9, 60.5, 0.84],
  [38.0, 55.2, 0.8],
  [34.7, 50.8, 0.76],
  [32.4, 47.6, 0.72],
  [31.6, 46.0, 0.7],
  [30.5, 43.5, 0.66],
  [30.5, 27, 0.55],
  [29.9, 24.9, 0.5],
  [28.4, 23.4, 0.46],
  [25.6, 22.2, 0.44],
  [21.2, 21.4, 0.42],
  [16.8, 21.0, 0.4],
]
/** The holder (cast) and the bulb's screw cap (steel, its thread turned). */
function holderProfile() {
  const P = [
    [16.6, 21.0, 0.35, 0, 0, 1],
    [16.6, 50.5, 0.7, 0, 0, 1],
    [15.9, 52.2, 0.8, 0, 0, 1],
    [14.6, 52.8, 0.8, 0, 0, 1],
    [14.6, 55.4, 0.8, 0, 0, 1],
    [13.6, 56.0, 0.75, 1],
  ]
  for (let y = 56.9; y < 79; y += 1.2) P.push([13.0 + 0.55 * Math.abs(Math.sin((Math.PI * (y - 56)) / 3.6)), y, 0.9, 1])
  P.push([13.4, 79.4, 0.85, 1])
  return P
}
/** The bulb's frosted glass, an A60: its neck from the cap, the globe round its middle at BULB. */
function glassProfile() {
  const P = [
    [13.5, 79.3, 0.8],
    [14.0, 83],
    [15.3, 86.5],
    [17.6, 90],
    [20.6, 93.5],
    [23.8, 97.5],
    [26.6, 102],
    [28.6, 107],
    [29.7, 112],
    [30.0, 117],
  ]
  for (let a = 0; a <= 90; a += 10) P.push([30 * Math.cos(deg(a)), BULB + 30 * Math.sin(deg(a))])
  return P
}
const KNOB = [
  [2.6, 0, 0.6, 0, 0, 1],
  [7.2, 0, 0.55, 0, 0, 1],
  [8.1, 0.45, 0.75, 0, 0, 1],
  [8.5, 1.3, 1, 0, 1, 1],
  [8.5, 5.2, 1, 0, 1, 1],
  [8.1, 6.0, 1, 0, 0, 1],
  [7.0, 6.5, 1, 0, 0, 1],
  [3.6, 6.6, 1, 0, 0, 1],
  [3.2, 7.3, 1, 0, 0, 1],
  [0, 7.5, 1, 0, 0, 1],
]
/** A knuckle's hub: a short drum across the joint, its edges rounded. */
const hubProfile = (r, h) => [
  [0, -h, 0.7],
  [r - 0.9, -h, 0.75],
  [r - 0.25, -h + 0.35, 0.85],
  [r, -h + 1.0, 0.9],
  [r, h - 1.0, 0.9],
  [r - 0.25, h - 0.35, 0.85],
  [r - 0.9, h, 0.75],
  [0, h, 0.7],
].map((q) => [...q, 0, 0, 1])
const SLEEVE = [
  [8.6, -5.6, 0.6, 0, 0, 1],
  [9.1, -4.9, 0.85, 0, 0, 1],
  [9.1, 8.6, 1, 0, 0, 1],
  [8.6, 10.2, 1, 0, 0, 1],
  [6.5, 10.9, 1, 0, 0, 1],
  [0, 11.1, 1, 0, 0, 1],
]
const NECK = [
  [5.2, 2.0, 0.6, 0, 0, 1],
  [5.2, 15.2, 0.85, 0, 0, 1],
  [5.8, 16.6, 0.9, 0, 0, 1],
  [8.6, 18.2, 0.9, 0, 0, 1],
  [10.4, 19.0, 0.7, 0, 0, 1],
  [11.2, 19.7, 0.55, 0, 0, 1],
]
const ferrule = (r) => [
  [r + 1.0, 0, 0.55, 0, 0, 1],
  [r + 1.0, 2.6, 0.85, 0, 0, 1],
  [r + 0.5, 3.6, 0.95, 0, 0, 1],
  [r, 4.0, 0.9, 0, 0, 1],
]
const cap = (r) => [
  [r, 0, 0.8, 1],
  [r + 0.6, 0.2, 0.9, 1],
  [r + 0.7, 0.9, 1, 1],
  [r + 0.3, 1.5, 1, 1],
  [0, 1.7, 1, 1],
]
const dome = (r) => [
  [r, 0, 0.8, 1],
  [r, 0.9, 1, 1],
  [r * 0.7, 1.7, 1, 1],
  [0, 2.0, 1, 1],
]

// ---- shaders: each material takes what it reads of its zones (vZ), its own frame's position and
// normal (vLP, vLN) and its uvs (vUvL), and no more (an unread varying is a warning on some drivers)
const VARY = { vZ: ['vec4', 'aZone'], vLP: ['vec3', 'position'], vLN: ['vec3', 'normal'], vUvL: ['vec2', 'uv'] }
const varyings = (names) => names.map((n) => `varying ${VARY[n][0]} ${n};`).join('\n')
const VERT = (s, names) =>
  s
    .replace('#include <common>', `#include <common>\n${names.includes('vZ') ? 'attribute vec4 aZone;\n' : ''}${varyings(names)}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\n${names.map((n) => `${n} = ${VARY[n][1]};`).join('\n')}`)
const PARS = /* glsl */ `
uniform sampler2D tDetail;
uniform float uGlow;
float lmH;
// (a relief h (mm) over the surface: the normal tilted by its slope, from screen derivatives)
vec3 lmBump(vec3 n, float h) {
  vec3 p = -vViewPosition;
  vec3 sx = dFdx(p);
  vec3 sy = dFdy(p);
  vec3 r1 = cross(sy, n);
  vec3 r2 = cross(n, sx);
  float det = dot(sx, r1);
  vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  return normalize(abs(det) * n - g);
}
vec4 lmTri(vec3 p, vec3 n, float s) {
  vec3 w = pow(abs(n), vec3(4.0));
  w /= dot(w, vec3(1.0));
  return texture2D(tDetail, p.yz * s) * w.x + texture2D(tDetail, p.zx * s) * w.y + texture2D(tDetail, p.xy * s) * w.z;
}`
const BUMP = '#include <normal_fragment_maps>\nnormal = lmBump(normal, lmH);'

/**
 * base: the middle of its foot on the desk (world); head: the shade's pivot (world); aim: the point
 * of the desk it lights (world); anisotropy: the detail texture's (the scene's own); wallV: where
 * the wall stands (the room's own axis, ROOM.wallV: the cable leaves the desk there). Returns
 * { group, meshes, bulb, axis, head, elbow, materials, headMeshes, switchMeshes, on, level,
 * setOn(on), toggle(), aimAt(p), update(dt), glow(on), dispose() }.
 */
export function createLamp({ base, head, aim, anisotropy = 4, wallV = room.ROOM?.wallV ?? -470 }) {
  const UP = new THREE.Vector3(0, 1, 0)
  const group = new THREE.Group()
  const meshes = []
  const geometries = []
  const textures = []

  // ---- the arm's plane, upright through the foot and the head; the elbow where the arms meet
  const B = base.clone()
  const fwd = new THREE.Vector3(head.x - B.x, 0, head.z - B.z)
  if (fwd.lengthSq() < 1) fwd.set(aim.x - B.x, 0, aim.z - B.z)
  fwd.normalize()
  const side = new THREE.Vector3(-fwd.z, 0, fwd.x) // (the joints' axis)
  const S = B.clone().addScaledVector(UP, SHOULDER)
  const H = head.clone()
  {
    // (out of reach: as far as the arms go)
    const reach = (L1 + L2) * 0.985
    if (S.distanceTo(H) > reach) H.sub(S).setLength(reach).add(S)
  }
  const d = S.distanceTo(H)
  const toH = new THREE.Vector3().subVectors(H, S).normalize()
  const a = Math.acos(THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1))
  // (the elbow up above the line from the shoulder to the head)
  const E = toH.clone().applyAxisAngle(side, a).multiplyScalar(L1).add(S)
  if (E.y < Math.max(S.y, H.y)) E.copy(toH).applyAxisAngle(side, -a).multiplyScalar(L1).add(S)
  const u1 = new THREE.Vector3().subVectors(E, S).normalize() // (up the lower arm)
  const n1 = new THREE.Vector3().crossVectors(u1, side).normalize() // (its front)
  const u2 = new THREE.Vector3().subVectors(H, E).normalize() // (along the upper arm, to the head)
  const n2 = new THREE.Vector3().crossVectors(side, u2).normalize() // (its top)
  const A = S.clone().addScaledVector(fwd, -22).addScaledVector(UP, -8) // (the yoke's spring pins)
  const Q = S.clone().addScaledVector(u1, 120) // (the bar their springs hook on)
  const P = E.clone().addScaledVector(u1, -110) // (the bar the elbow's spring hooks on)
  const T = E.clone().addScaledVector(u2, -36) // (the upper arm's tail)

  // ---- the shared detail texture, and the soft contact shadows
  DETAIL ??= detailPixels(128)
  const tDetail = new THREE.DataTexture(DETAIL.px, DETAIL.size, DETAIL.size)
  const shadowTex = (px, n) => new THREE.DataTexture(px, n, n)
  const tRing = shadowTex(shadowPixels(64, 0.8, 1), 64)
  const tLine = shadowTex(shadowPixels(64, 0, 1), 64)
  for (const t of [tDetail, tRing, tLine]) {
    t.wrapS = t.wrapT = t === tDetail ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping
    t.magFilter = THREE.LinearFilter
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.generateMipmaps = true
    t.anisotropy = anisotropy
    t.needsUpdate = true
    textures.push(t)
  }

  // ---- materials
  const uGlow = { value: 1 } // (the light's own glow now: its level, times the frame's gate)
  const uBulb = { value: new THREE.Vector3(0, BULB, 0) }
  const shared = (sh, names) => {
    sh.uniforms.tDetail = { value: tDetail }
    sh.uniforms.uGlow = uGlow
    sh.vertexShader = VERT(sh.vertexShader, names)
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${varyings(names)}\n${PARS}`)
  }
  // the enamel: bone, glossy, a slight orange peel; dust on what faced up, chips at the rolled
  // edges, fine scratches; the felt and the rubber dark and matte; the shade's vents
  const enamel = new THREE.MeshStandardMaterial({ color: 0xede3cd, roughness: 0.2, metalness: 0, vertexColors: true })
  enamel.onBeforeCompile = (sh) => {
    shared(sh, ['vZ', 'vLP', 'vLN'])
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        vec3 lmN = normalize(vLN);
        vec4 lmA = lmTri(vLP, lmN, 1.0 / 26.0);
        vec4 lmB = lmTri(vLP, lmN, 1.0 / 240.0);
        float lmFelt = vZ.z;
        // dust: a fine even film where it settled, a little thicker in drifts, and a few specks
        float lmDust = vZ.x * (0.32 + 0.22 * smoothstep(0.35, 0.8, lmB.g) + 0.4 * smoothstep(0.8, 0.9, lmA.a));
        // chips: a few small flakes gone at the worn edges (where a broad and a fine field both
        // peak), the dark steel under them
        float lmChip = vZ.y * smoothstep(0.86, 0.92, lmB.a) * smoothstep(0.68, 0.76, lmA.a);
        float lmScr = lmA.b * (0.3 + 0.7 * vZ.y);
        // the vents: a ring of round holes round the cup, none under the switch
        float lmAng = atan(vLP.x, -vLP.z);
        float lmAc = (floor(lmAng / 0.3926991) + 0.5) * 0.3926991;
        float lmVd = length(vec2((lmAng - lmAc) * ${CUP.toFixed(2)}, vLP.y - ${VENT_Y.toFixed(2)}));
        float lmAa = max(max(fwidth(vLP.x), fwidth(vLP.y)), fwidth(vLP.z)) + 0.001;
        float lmVent = vZ.w * step(0.45, abs(lmAc));
        float lmHole = lmVent * (1.0 - smoothstep(2.4 - lmAa, 2.4 + lmAa, lmVd));
        float lmRim = lmVent * (1.0 - smoothstep(2.4, 3.3, lmVd));
        lmH = (lmA.r - 0.5) * 0.04 * (1.0 - lmDust) * (1.0 - lmFelt) - lmChip * 0.04 - lmRim * 0.25;
        vec3 lmCol = diffuse * (0.98 + 0.04 * lmB.g) * (1.0 - 0.04 * lmScr);
        lmCol = mix(lmCol, vec3(0.6, 0.58, 0.54), lmDust * 0.4);
        lmCol = mix(lmCol, vec3(0.16, 0.15, 0.14), lmChip);
        lmCol = mix(lmCol, vec3(0.028, 0.03, 0.028), lmFelt);
        lmCol = mix(lmCol, vec3(0.012, 0.011, 0.01), lmHole);
        diffuseColor.rgb = lmCol * vColor.rgb;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `#include <roughnessmap_fragment>
        roughnessFactor = roughness + 0.05 * lmB.g + 0.16 * lmScr;
        roughnessFactor = mix(roughnessFactor, 0.48, lmDust);
        roughnessFactor = mix(roughnessFactor, 0.5, lmChip);
        roughnessFactor = mix(roughnessFactor, 1.0, max(lmFelt, lmHole));`,
      )
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = 0.5 * lmChip;')
      .replace('#include <normal_fragment_maps>', BUMP)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.66, 0.36) * (2.4 * uGlow * lmHole);')
  }
  enamel.customProgramCacheKey = () => 'lamp.enamel'
  // the shade's inside: white, lit by its own bulb (falling off from it), not by the scene
  const inner = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.55, metalness: 0, vertexColors: true })
  inner.onBeforeCompile = (sh) => {
    shared(sh, ['vLP', 'vLN', 'vUvL'])
    sh.uniforms.uBulb = uBulb
    sh.fragmentShader = sh.fragmentShader
      .replace('uniform float uGlow;', 'uniform float uGlow;\nuniform vec3 uBulb;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 0.97 + 0.06 * texture2D(tDetail, vUvL / 60.0).g;\nlmH = 0.0;')
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        vec3 lmL = uBulb - vLP;
        float lmD2 = dot(lmL, lmL);
        float lmCos = max(dot(normalize(vLN), lmL * inversesqrt(lmD2)), 0.0);
        totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.84, 0.64) * (uGlow * 5200.0 * (0.3 + 0.7 * lmCos) / (lmD2 + 600.0));`,
      )
  }
  inner.customProgramCacheKey = () => 'lamp.inner'
  // the bulb: frosted glass, milky when off; lit, brightest where it faces the eye
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xece8e0, roughness: 0.38, metalness: 0 })
  bulbMat.onBeforeCompile = (sh) => {
    shared(sh, ['vLP'])
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      /* glsl */ `#include <emissivemap_fragment>
      float lmF = abs(dot(normal, normalize(vViewPosition)));
      float lmNeck = smoothstep(82.0, 104.0, vLP.y);
      totalEmissiveRadiance += vec3(1.0, 0.83, 0.6) * (uGlow * (2.6 + 4.4 * lmF * lmF) * (0.3 + 0.7 * lmNeck));`,
    )
  }
  bulbMat.customProgramCacheKey = () => 'lamp.bulb'
  // brass: polished rods streaked along their length, cast knuckles with a finer grain and duller,
  // knurled nuts; steel for the bolts, the pins and the screw cap
  const brass = new THREE.MeshStandardMaterial({ color: 0xe6d09a, roughness: 0.3, metalness: 1, vertexColors: true })
  brass.onBeforeCompile = (sh) => {
    shared(sh, ['vZ', 'vUvL'])
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        vec4 lmG = texture2D(tDetail, vUvL / 44.0);
        vec4 lmS = texture2D(tDetail, vec2(vUvL.x / 21.0, vUvL.y / 480.0));
        float lmGr = texture2D(tDetail, vUvL / 16.0).r;
        vec2 lmQ = vUvL * 1.3;
        float lmKd = abs(fract(lmQ.x + lmQ.y) - 0.5) + abs(fract(lmQ.x - lmQ.y) - 0.5);
        float lmKf = vZ.y * (1.0 - smoothstep(0.25, 0.6, fwidth(lmQ.x + lmQ.y)));
        lmH = lmKf * lmKd * 0.3 + (lmS.r - 0.5) * 0.01 * (1.0 - vZ.z) + (lmGr - 0.5) * 0.02 * vZ.z;
        vec3 lmBr = diffuse * (0.95 + 0.08 * lmG.g) * (1.0 - 0.07 * smoothstep(0.6, 0.9, lmG.a));
        vec3 lmSt = vec3(0.6, 0.6, 0.58) * (0.92 + 0.12 * lmG.g);
        diffuseColor.rgb = mix(lmBr, lmSt, vZ.x) * vColor.rgb;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughness - 0.08 + 0.14 * lmS.g + 0.12 * lmG.b, roughness + 0.06 + 0.1 * lmGr, vZ.z);
        roughnessFactor = mix(roughnessFactor, 0.42, vZ.y * (1.0 - 0.5 * lmKf));
        roughnessFactor = mix(roughnessFactor, 0.3 + 0.1 * lmG.g, vZ.x);`,
      )
      .replace('#include <normal_fragment_maps>', BUMP)
  }
  brass.customProgramCacheKey = () => 'lamp.brass'
  // the springs: close-wound steel wire, drawn round a tube (a helix: one turn a pitch)
  const PITCH = 1.5
  const springMat = new THREE.MeshStandardMaterial({ color: 0xa6a49e, roughness: 0.32, metalness: 1, vertexColors: true })
  springMat.onBeforeCompile = (sh) => {
    shared(sh, ['vUvL'])
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        float lmPh = vUvL.y / ${PITCH.toFixed(2)} + vUvL.x;
        float lmT = fract(lmPh) * 2.0 - 1.0;
        float lmFade = 1.0 - smoothstep(0.2, 0.5, fwidth(vUvL.y) / ${PITCH.toFixed(2)});
        float lmProf = sqrt(max(1.0 - lmT * lmT, 0.0));
        lmH = lmProf * ${(PITCH / 2).toFixed(2)} * lmFade;
        diffuseColor.rgb = diffuse * mix(0.8, 0.45 + 0.55 * lmProf, lmFade) * vColor.rgb;`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = roughness + 0.08 * (1.0 - lmFade);')
      .replace('#include <normal_fragment_maps>', BUMP)
  }
  springMat.customProgramCacheKey = () => 'lamp.spring'
  // the cable: a cloth braid, eight carriers each way, over two and under two
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.82, metalness: 0, vertexColors: true })
  cableMat.onBeforeCompile = (sh) => {
    shared(sh, ['vUvL'])
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        float lmS1 = vUvL.x * 8.0 + vUvL.y / 2.6;
        float lmS2 = vUvL.x * 8.0 - vUvL.y / 2.6;
        float lmFade = 1.0 - smoothstep(0.3, 0.7, fwidth(vUvL.y) / 1.3);
        float lmC1 = fract(lmS1) * 2.0 - 1.0;
        float lmC2 = fract(lmS2) * 2.0 - 1.0;
        float lmP1 = sqrt(max(1.0 - lmC1 * lmC1, 0.0));
        float lmP2 = sqrt(max(1.0 - lmC2 * lmC2, 0.0));
        float lmHt = max(lmP1 * (0.62 + 0.38 * sin(1.5707963 * lmS2)), lmP2 * (0.62 + 0.38 * sin(1.5707963 * (lmS1 + 1.0))));
        lmH = lmHt * 0.4 * lmFade;
        float lmTone = mix(0.62, lmHt, lmFade);
        float lmFib = texture2D(tDetail, vec2(vUvL.x * 3.0, vUvL.y / 40.0)).a;
        diffuseColor.rgb = diffuse * (0.6 + 0.55 * lmTone) * (0.9 + 0.2 * lmFib) * vColor.rgb;`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = roughness + 0.12 * (1.0 - lmTone);')
      .replace('#include <normal_fragment_maps>', BUMP)
  }
  cableMat.customProgramCacheKey = () => 'lamp.cable'
  // (the soft dark under the foot and the cable, for the ambient light no shadow map takes away. A
  // millimetre off the desk, in small triangles, nudged a constant step nearer in depth: a slope-scaled
  // offset on a desk seen this flat pulled it in front of the foot's rolled edge; less lift than this
  // is a few steps of the depth buffer from 3.7 m, and flickers)
  const LIFT = 1
  const contact = (map, opacity) => new THREE.MeshBasicMaterial({ color: 0x000000, map, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -2, side: THREE.DoubleSide })
  const ringMat = contact(tRing, 0.5)
  const lineMat = contact(tLine, 0.42)
  const materials = [enamel, inner, bulbMat, brass, springMat, cableMat]

  // ---- the foot (world)
  const I = new THREE.Matrix4()
  const atB = new THREE.Matrix4().makeTranslation(B.x, B.y, B.z)
  const tBase = part() // (enamel: the base, the turret, the felt, the clips and grommets)
  const tBrass = part() // (brass and steel that stand still)
  const tSpring = part()
  add(tBase, lathe(baseProfile(), 64), atB)
  add(tBase, lathe(FELT, 64), atB)
  add(tBase, lathe(POST, 40), atB)
  add(tBrass, lathe(COLLAR, 40), atB)
  // two screws holding the yoke's plate
  const yoke = frame(fwd, UP, side, S)
  add(tBrass, new RoundedBoxGeometry(36, 6.5, 33, 2, 1.6).translate(-4, -12.2, 0), yoke, CAST, 0.95, 30)
  for (const s of [-1, 1]) add(tBrass, lathe(dome(2.3), 16), new THREE.Matrix4().multiplyMatrices(yoke, new THREE.Matrix4().makeTranslation(-16, -8.95, s * 9)), STEEL)
  // the yoke's cheeks (round the shoulder's axle and the springs' pins) and the lower arm's hub
  for (const z of [11.9, -15.3]) add(tBrass, plate([[0, 0, 9.6], [-22, -8, 7.2]], 3.4, 0.6, [[-27, -12.5], [10, -12.5]]), new THREE.Matrix4().multiplyMatrices(yoke, new THREE.Matrix4().makeTranslation(0, 0, z)), CAST)
  add(tBrass, lathe(hubProfile(9.6, 11.6), 32), alongY(side, S))
  /** A bolt across a joint at c: a knurled nut on the near side, a hex nut and the bolt's end on the far. */
  const bolt = (t, c, ax, knobAt, hexAt) => {
    add(t, rod(c.clone().addScaledVector(ax, -(hexAt + 4.6)), c.clone().addScaledVector(ax, knobAt + 1), 2.6), I, STEEL)
    add(t, lathe(KNOB, 28, 8.5), alongY(ax, c.clone().addScaledVector(ax, knobAt)))
    const nx = ax.clone().negate()
    add(t, hex(5.4, 3.4), alongZ(nx, c.clone().addScaledVector(ax, -hexAt)), STEEL, 0.95, 4)
    add(t, lathe(dome(2.6), 16), alongY(nx, c.clone().addScaledVector(ax, -(hexAt + 3.4))))
  }
  bolt(tBrass, S, side, 15.4, 15.4)
  // the springs' pins, through both cheeks, a cap on each end
  for (const s of [-1, 1]) {
    const o = side.clone().multiplyScalar(s)
    add(tBrass, rod(A.clone().addScaledVector(o, -1), A.clone().addScaledVector(o, 24.6), 2.2), I, STEEL)
    add(tBrass, lathe(cap(2.2), 16), alongY(o, A.clone().addScaledVector(o, 24.6)))
  }

  // ---- the arms (world)
  /** A rod from a to b (radius r), its uvs in mm. */
  function rod(a, b, r) {
    const g = tube(rodPoints(a, b), r, r > 2 ? 14 : 8)
    const uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 2 * Math.PI * r)
    return g
  }
  for (const s of [-1, 1]) {
    const o = side.clone().multiplyScalar(s * 8)
    const a0 = S.clone().addScaledVector(u1, 9).add(o)
    const b0 = E.clone().addScaledVector(u1, -8.6).add(o)
    add(tBrass, rod(a0, b0, 3.5), I)
    add(tBrass, lathe(ferrule(3.5), 24), alongY(u1, a0.clone().addScaledVector(u1, -0.4)))
    add(tBrass, lathe(ferrule(3.5), 24), alongY(u1.clone().negate(), b0.clone().addScaledVector(u1, 0.4)))
    const o2 = side.clone().multiplyScalar(s * 13.5)
    const a1 = E.clone().addScaledVector(u2, 10).add(o2)
    const b1 = H.clone().addScaledVector(u2, -12).add(o2)
    add(tBrass, rod(a1, b1, 3.0), I)
    add(tBrass, lathe(ferrule(3.0), 24), alongY(u2, a1.clone().addScaledVector(u2, 3.5)))
  }
  /** A bar across the arm at c, |z| up to half, a cap on each end. */
  const bar = (c, half, r = 2.4) => {
    add(tBrass, rod(c.clone().addScaledVector(side, -half), c.clone().addScaledVector(side, half), r), I, STEEL)
    for (const s of [-1, 1]) add(tBrass, lathe(cap(r), 16), alongY(side.clone().multiplyScalar(s), c.clone().addScaledVector(side, s * half)))
  }
  bar(Q, 24.6)
  bar(P, 9.8)
  // the elbow: the lower arm's hub inside the upper arm's two plates, the plates reaching back to its tail
  add(tBrass, lathe(hubProfile(8.6, 11.4), 32), alongY(side, E))
  const elbow = frame(u2, n2, side, E)
  for (const z of [11.8, -15.2]) add(tBrass, plate([[0, 0, 9.6], [-36, 0, 6.6], [12, 0, 7.4]], 3.4), new THREE.Matrix4().multiplyMatrices(elbow, new THREE.Matrix4().makeTranslation(0, 0, z)), CAST)
  bolt(tBrass, E, side, 15.2, 15.2)
  bar(T, 11.9)
  // the head's end of the arm: a cast block over the rods' ends, the swivel's sleeve in it
  add(tBrass, new RoundedBoxGeometry(22, 11, 33.5, 2, 2.2).translate(-12, 0, 0), frame(u2, n2, side, H), CAST, 0.95, 30)
  add(tBrass, lathe(SLEEVE, 32), new THREE.Matrix4().makeTranslation(H.x, H.y, H.z))
  add(tBrass, lathe(dome(1.8), 12), alongY(n2, H.clone().addScaledVector(u2, -16).addScaledVector(n2, 5.5)), STEEL)

  // ---- the springs: a tube the coils are drawn on, the ends closed, a hook round each pin or bar
  function spring(a, b, rc) {
    const dir = new THREE.Vector3().subVectors(b, a).normalize()
    const reach = rc + 2.8
    const c0 = a.clone().addScaledVector(dir, reach)
    const c1 = b.clone().addScaledVector(dir, -reach)
    add(tSpring, tube(rodPoints(c0, c1), rc, 14), I, Z0, 0.95)
    add(tBrass, lathe(cap(rc - 0.7), 16), alongY(dir.clone().negate(), c0), STEEL)
    add(tBrass, lathe(cap(rc - 0.7), 16), alongY(dir, c1), STEEL)
    for (const [p, c, sg] of [
      [a, c0, 1],
      [b, c1, -1],
    ]) {
      const x = dir.clone().multiplyScalar(sg)
      const y = new THREE.Vector3().crossVectors(side, x)
      // (the loop round the pin, open a little; its leg into the coils)
      const loop = new THREE.TorusGeometry(3.3, 0.8, 6, 18, Math.PI * 1.75)
      add(tBrass, loop, frame(x, y, side, p), STEEL, 0.9, 10)
      add(tBrass, rod(p.clone().addScaledVector(x, 3.3), c.clone().addScaledVector(x, -0.6), 0.8), I, STEEL)
    }
  }
  for (const s of [-1, 1]) spring(A.clone().addScaledVector(side, s * 20.5), Q.clone().addScaledVector(side, s * 20.5), 4.6)
  spring(T, P, 4.0)

  // ---- the cable along the arm: up from the boss, clipped up the lower arm's front, over the
  // elbow in a loose loop, clipped under the upper arm (its last stretch, into the shade, moves
  // with the head)
  const tCable = part()
  const bez = (a0, a1, a2, a3, n, out) => {
    for (let i = out.length ? 1 : 0; i <= n; i++) {
      const t = i / n
      const s = 1 - t
      out.push(new THREE.Vector3().addScaledVector(a0, s * s * s).addScaledVector(a1, 3 * s * s * t).addScaledVector(a2, 3 * s * t * t).addScaledVector(a3, t * t * t))
    }
    return out
  }
  const lineTo = (out, b, step = 20) => {
    const a0 = out[out.length - 1]
    const n = Math.max(1, Math.round(a0.distanceTo(b) / step))
    for (let i = 1; i <= n; i++) out.push(a0.clone().lerp(b, i / n))
  }
  const G1 = B.clone().addScaledVector(fwd, 27).addScaledVector(UP, 30.4)
  const C1 = S.clone().addScaledVector(u1, 70).addScaledVector(n1, 11)
  const C2 = S.clone().addScaledVector(u1, 230).addScaledVector(n1, 11)
  const C3 = H.clone().addScaledVector(u2, -200).addScaledVector(n2, -9)
  const C4 = H.clone().addScaledVector(u2, -60).addScaledVector(n2, -9)
  const armPath = bez(G1, G1.clone().addScaledVector(UP, 30), C1.clone().addScaledVector(u1, -34), C1, 16, [])
  lineTo(armPath, C2)
  bez(C2, C2.clone().addScaledVector(u1, 40).addScaledVector(UP, -6), C3.clone().addScaledVector(u2, -42).addScaledVector(UP, -10), C3, 22, armPath)
  lineTo(armPath, C4)
  add(tCable, tube(armPath, CABLE_R, 8), I, Z0, 0.9)
  // the clips: a band round the cable, a strap from it to a bar across the rods (c: the cable's
  // middle; n: from the arm's line out to it, off mm; u: along the arm)
  for (const [c, u, n, half, off] of [
    [C1, u1, n1, 8, 11],
    [C2, u1, n1, 8, 11],
    [C3, u2, n2.clone().negate(), 13.5, 9],
    [C4, u2, n2.clone().negate(), 13.5, 9],
  ]) {
    const b = new THREE.Vector3().crossVectors(u, n) // (square to both)
    add(tBase, new THREE.TorusGeometry(CABLE_R + 1.0, 0.85, 6, 18), frame(n, b, u, c), DARK, 0.85, 10)
    const len = off - CABLE_R - 0.4
    add(tBase, new RoundedBoxGeometry(2.2, 5, len, 1, 0.8), frame(b, u, n, c.clone().addScaledVector(n, -(CABLE_R + 0.4 + len / 2))), DARK, 0.8, 10)
    const armPt = c.clone().addScaledVector(n, -off)
    add(tBase, rod(armPt.clone().addScaledVector(side, -half), armPt.clone().addScaledVector(side, half), 1.3), I, DARK, 0.85)
  }
  // the grommet where it goes into the boss
  add(tBase, new THREE.TorusGeometry(CABLE_R + 1.2, 1.4, 6, 20), frame(fwd, side, UP.clone().negate(), G1.clone().addScaledVector(UP, -0.4)), DARK, 0.8, 10)

  // ---- the cable out of the base at its back, across the desk and off its back edge
  const toWall = new THREE.Vector3(FWD[0], 0, FWD[2]).normalize()
  const left = new THREE.Vector3(toWall.z, 0, -toWall.x) // (the picture's left)
  const out = toWall.clone().addScaledVector(fwd, -0.6).normalize()
  const desk = B.y
  const G2 = B.clone().addScaledVector(out, 89.6).setY(desk + 6)
  const D0 = B.clone().addScaledVector(out, LAMP.footR + 15).setY(desk + CABLE_R)
  const wallAt = (p) => -(p.x * toWall.x + p.z * toWall.z) - wallV // (how far p stands from the wall)
  // (to the desk's back edge, drifting a little left, then over it and down the gap between the desk
  // and the panelling, where there is room for it; else down just inside the edge, out of sight)
  const gap = room.ROOM?.panel?.gap ?? 0
  const over = gap >= 2 * CABLE_R ? gap / 2 : 0 // (its middle, past the edge, as it goes down)
  const run = Math.max(0, wallAt(D0) - CABLE_R - (over ? 0.5 : 4.5))
  const W = D0.clone().addScaledVector(toWall, run).addScaledVector(left, 18 + run * 0.35)
  const deskPath = bez(G2, G2.clone().addScaledVector(out, 8), D0.clone().addScaledVector(out, -9), D0, 8, [])
  const span = D0.distanceTo(W)
  if (span > 4) bez(D0, D0.clone().addScaledVector(out, span * 0.42).addScaledVector(left, span * 0.12), W.clone().addScaledVector(toWall, -span * 0.34), W, Math.max(6, Math.round(span / 8)), deskPath)
  let W1 = W.clone().addScaledVector(toWall, 2.5)
  if (over) {
    // (round the edge: a quarter turn about it, its middle `over` from the edge)
    const E0 = W.clone().addScaledVector(toWall, Math.max(0, wallAt(W)))
    lineTo(deskPath, E0, 1.5)
    const k = over * 0.55
    W1 = E0.clone().addScaledVector(toWall, over)
    bez(E0, E0.clone().addScaledVector(toWall, k), W1.clone().addScaledVector(UP, k - over), W1.clone().addScaledVector(UP, -over), 6, deskPath)
  } else bez(W, W1, W1.clone().addScaledVector(UP, -2.5), W1.clone().addScaledVector(UP, -10), 6, deskPath)
  lineTo(deskPath, W1.clone().addScaledVector(UP, -60), 12)
  const tDesk = part()
  add(tDesk, tube(deskPath, CABLE_R, 8), I, Z0, 1)
  add(tBase, new THREE.TorusGeometry(CABLE_R + 1.1, 1.3, 6, 20), frame(fwd.clone().cross(UP).normalize(), UP, out, G2), DARK, 0.75, 10)
  // (lying on the desk, the cable's underside dark)
  flatten(tDesk)
  for (let i = 0; i < tDesk.ao.length; i++) {
    const ny = tDesk.n[i * 3 + 1]
    const y = tDesk.p[i * 3 + 1]
    tDesk.ao[i] *= y < desk + 2 * CABLE_R + 1 ? 0.45 + 0.55 * THREE.MathUtils.smoothstep(ny, -0.7, 0.5) : 0.9
  }

  // ---- the head: the swivel (pan, about the vertical at the pivot) and the fork, the tilt below it
  const panG = new THREE.Group()
  panG.position.copy(H)
  const tiltG = new THREE.Group()
  tiltG.position.set(0, -TC, 0)
  panG.add(tiltG)
  group.add(panG)
  const X = new THREE.Vector3(1, 0, 0)
  const Y = new THREE.Vector3(0, 1, 0)
  const Zv = new THREE.Vector3(0, 0, 1)
  const tFork = part()
  add(tFork, lathe([[4.6, -7, 0.6, 0, 0, 1], [4.6, -1.5, 0.6, 0, 0, 1]], 16), I)
  add(tFork, new RoundedBoxGeometry(32, 6.5, 17, 2, 1.8).translate(0, -9.6, 0), I, CAST, 0.95, 30)
  for (const x of [15, -11.6]) add(tFork, plate([[0, -8, 8], [0, -TC, 8.5]], 3.4), frame(Zv, Y, X.clone().negate(), new THREE.Vector3(x, 0, 0)), CAST)
  {
    const c = new THREE.Vector3(0, -TC, 0)
    const negX = X.clone().negate()
    add(tFork, rod(c.clone().addScaledVector(X, -16), c.clone().addScaledVector(X, 18.4), 2.5), I, STEEL)
    add(tFork, lathe(KNOB, 28, 8.5), alongY(negX, c.clone().addScaledVector(X, -15)))
    add(tFork, hex(5.2, 3.2), alongZ(X, c.clone().addScaledVector(X, 15)), STEEL, 0.95, 4)
    add(tFork, lathe(dome(2.5), 16), alongY(X, c.clone().addScaledVector(X, 18.2)))
  }
  // the shade's own frame: +y along it to the light, x the tilt axle, -z its top
  const tShade = part()
  const tInner = part()
  const tHead = part() // (brass: the hub, the neck, the holder, the bulb's cap)
  const tGlass = part()
  add(tHead, lathe(hubProfile(7.4, 11.2), 28), alongY(X, new THREE.Vector3()))
  add(tHead, lathe(NECK, 28), I)
  add(tShade, lathe(shadeProfile(), 64), I)
  add(tInner, lathe(SHADE_IN, 40), I)
  add(tHead, lathe(holderProfile(), 28), I)
  add(tGlass, lathe(glassProfile(), 32), I)
  // (the cable's grommet in the back of the cup, under it)
  const ENTRY = new THREE.Vector3(0, 19.9, 15.5)
  add(tShade, new THREE.TorusGeometry(CABLE_R + 1.1, 1.3, 6, 18), frame(X, Zv.clone().negate(), Y, ENTRY.clone().setY(19.3)), DARK, 0.8, 10)
  // the switch: a little block on top of the cup, its toggle through it
  const swBox = new RoundedBoxGeometry(10, 13, 6, 2, 1.8)
  swBox.translate(0, SW_Y, -(CUP + 2.4))
  const tSw = part()
  add(tSw, swBox, I, [0, 0.15, 0, 0], 1, 12)
  const lever = new THREE.Group()
  lever.position.set(0, SW_Y, -(CUP + 5.3))
  const tLever = part()
  add(tLever, lathe([[2.6, 0, 0.7, 0, 0, 1], [2.6, 0.9, 1, 0, 0, 1], [1.9, 1.4, 1, 0, 0, 1], [1.2, 1.6, 1, 0, 0, 1], [1.15, 7.6, 1, 0, 0, 1], [1.7, 8.0, 1, 0, 0, 1], [1.95, 8.8, 1, 0, 0, 1], [1.5, 9.7, 1, 0, 0, 1], [0, 10.0, 1, 0, 0, 1]], 16), alongY(Zv.clone().negate(), new THREE.Vector3()))

  // ---- occlusion where the parts meet, and dust on what faces up (the head's as it stood at first)
  occlude(tBase, [
    [B.x, B.y + 36, B.z, 17.6, 0.85],
    [B.x, B.y + 46, B.z, 17.6, 0.5],
    [S.x, S.y - 12, S.z, 17, 0.6],
    [G1.x, G1.y + 3, G1.z, 4.5, 0.5],
    [G2.x, G2.y, G2.z, 4.5, 0.5],
  ])
  occlude(tBrass, [
    [S.x, S.y, S.z, 10, 0.55],
    [E.x, E.y, E.z, 9.5, 0.55],
    ...[13, 0].map((k) => {
      const c = H.clone().addScaledVector(u2, -k)
      return [c.x, c.y, c.z, 10, 0.5]
    }),
    [B.x, B.y + 8, B.z, 24, 0.6],
  ])
  occlude(tShade, [
    [0, 4, 0, 8, 0.6],
    [0, SW_Y, -(CUP + 2.4), 5.5, 0.6],
  ])
  occlude(tInner, [
    [0, 38, 0, 16.6, 0.55],
    [0, BULB, 0, 30, 0.25],
  ])
  occlude(tFork, [[0, -TC, 0, 7.4, 0.5]])
  const dust = (t, rot) => {
    flatten(t)
    const n = new THREE.Vector3()
    for (let i = 0; i < t.ao.length; i++) {
      if (t.z[i * 4 + 2] > 0.5) continue // (not on the felt, nor the rubber)
      n.fromArray(t.n, i * 3)
      if (rot) n.applyQuaternion(rot)
      t.z[i * 4] = THREE.MathUtils.smoothstep(n.y, 0.25, 0.9) * (0.75 + 0.25 * (1 - t.ao[i]))
    }
  }
  const restQ = new THREE.Quaternion()

  // ---- the meshes
  const mk = (t, mat, parent = group) => {
    const g = t.isBufferGeometry ? t : geometry(t)
    geometries.push(g)
    const m = new THREE.Mesh(g, mat)
    m.castShadow = m.receiveShadow = false
    parent.add(m)
    meshes.push(m)
    return m
  }
  dust(tBase, null)
  mk(tBase, enamel).name = 'lamp.base'
  mk(tBrass, brass).name = 'lamp.arms'
  mk(tSpring, springMat).name = 'lamp.springs'
  mk(tCable, cableMat).name = 'lamp.cable'
  mk(tDesk, cableMat).name = 'lamp.cable.desk'
  const fork = mk(tFork, brass, panG)
  fork.name = 'lamp.fork'
  const headBrass = mk(tHead, brass, tiltG)
  headBrass.name = 'lamp.holder'
  const glass = mk(tGlass, bulbMat, tiltG)
  glass.name = 'lamp.bulb'
  const shadeIn = mk(tInner, inner, tiltG)
  shadeIn.name = 'lamp.shade.inside'
  // (the shade's enamel and the switch's block take their dust once the head's first pose is known)
  let shade = null
  let swBody = null
  const leverMesh = mk(tLever, brass, lever)
  leverMesh.name = 'lamp.switch.toggle'
  tiltG.add(lever)
  // (a larger, unseen target round the switch for a tap: it is a centimetre across)
  const swHit = new THREE.Mesh(new THREE.SphereGeometry(13, 10, 8), enamel)
  geometries.push(swHit.geometry)
  swHit.position.set(0, SW_Y, -(CUP + 6))
  swHit.visible = false
  swHit.name = 'lamp.switch.target'
  tiltG.add(swHit)

  // the contact shadows on the desk: round the foot, and under the cable where it lies
  {
    const R = LAMP.footR + 16
    const g = new THREE.PlaneGeometry(2 * R, 2 * R, 8, 8).rotateX(-Math.PI / 2)
    const m = mk(g, ringMat)
    m.position.set(B.x, desk + LIFT, B.z)
    m.renderOrder = -1
    m.name = 'lamp.contact'
    // (a ribbon under the stretch that lies on the desk)
    const pts = deskPath.filter((p) => p.y < desk + CABLE_R + 0.6 && wallAt(p) > 0.5)
    if (pts.length > 1) {
      const pos = []
      const uv = []
      const idx = []
      const across = new THREE.Vector3()
      for (let i = 0; i < pts.length; i++) {
        const tng = pts[Math.min(pts.length - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).setY(0).normalize()
        across.crossVectors(tng, UP).multiplyScalar(8)
        const fade = Math.min(1, i / 2, (pts.length - 1 - i) / 2)
        for (const s of [-1, 1]) {
          pos.push(pts[i].x + across.x * s, desk + LIFT, pts[i].z + across.z * s)
          uv.push(0.5 + 0.5 * s, 0.5 - 0.5 * (1 - fade))
        }
        if (i) idx.push(i * 2 - 2, i * 2, i * 2 - 1, i * 2 - 1, i * 2, i * 2 + 1)
      }
      const rg = new THREE.BufferGeometry()
      rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      rg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
      rg.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3))
      rg.setIndex(idx)
      const rm = mk(rg, lineMat)
      rm.renderOrder = -1
      rm.name = 'lamp.contact.cable'
    }
  }

  // ---- the head's last stretch of cable: from the last clip under the arm, a loose loop into the
  // back of the shade (drawn again as the head moves)
  const HC = 24
  const hc = Array.from({ length: HC }, () => new THREE.Vector3())
  const hcGeo = tubeGeometry(HC, 8)
  {
    const n = hcGeo.attributes.position.count
    hcGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(0.88), 3))
    hcGeo.setAttribute('aZone', new THREE.BufferAttribute(new Float32Array(n * 4), 4))
  }
  const ev = new THREE.Vector3()
  const ed = new THREE.Vector3()
  const k1 = new THREE.Vector3()
  const k2 = new THREE.Vector3()
  function headCable() {
    ev.copy(ENTRY).applyMatrix4(tiltG.matrix).applyMatrix4(panG.matrix)
    ed.set(0, 1, 0).transformDirection(tiltG.matrix).transformDirection(panG.matrix)
    k1.copy(C4).addScaledVector(u2, 38).addScaledVector(UP, -16)
    k2.copy(ev).addScaledVector(ed, -30).addScaledVector(UP, -8)
    for (let i = 0; i < HC; i++) {
      const t = i / (HC - 1)
      const s = 1 - t
      hc[i]
        .copy(C4)
        .multiplyScalar(s * s * s)
        .addScaledVector(k1, 3 * s * s * t)
        .addScaledVector(k2, 3 * s * t * t)
        .addScaledVector(ev, t * t * t)
    }
    tube(hc, CABLE_R, 8, hcGeo)
  }

  // ---- posing: the swivel's heading and the shade's tilt below level, eased (critically damped)
  const armPsi = Math.atan2(fwd.x, fwd.z)
  const TCW = H.clone().addScaledVector(UP, -TC) // (the tilt axle's middle: on the swivel's axis, it never moves)
  const ang = new Float64Array(2)
  const vel = new Float64Array(2)
  const goal = new Float64Array(2)
  let moving = false
  const bulb = new THREE.Vector3()
  const axis = new THREE.Vector3()
  function anglesTo(p, out) {
    const dx = p.x - TCW.x
    const dy = p.y - TCW.y
    const dz = p.z - TCW.z
    out[0] = armPsi + THREE.MathUtils.clamp(wrapPi(Math.atan2(dx, dz) - armPsi), -PAN, PAN)
    out[1] = THREE.MathUtils.clamp(Math.atan2(-dy, Math.hypot(dx, dz)), TILT0, TILT1)
  }
  function pose() {
    panG.rotation.y = ang[0]
    tiltG.rotation.x = ang[1] + Math.PI / 2
    panG.updateMatrixWorld(true)
    bulb.set(0, BULB, 0).applyMatrix4(tiltG.matrixWorld)
    axis.set(0, 1, 0).transformDirection(tiltG.matrixWorld)
    headCable()
  }
  group.updateMatrixWorld(true)
  anglesTo(aim, ang)
  goal.set(ang)
  pose()
  tubeIndex(hcGeo, HC, 8)
  const hcMesh = mk(hcGeo, cableMat)
  hcMesh.name = 'lamp.cable.head'
  // (the dust settled as the shade stood at first: it turns with the shade from then on)
  restQ.setFromRotationMatrix(new THREE.Matrix4().extractRotation(tiltG.matrixWorld))
  dust(tShade, restQ)
  dust(tSw, restQ)
  shade = mk(tShade, enamel, tiltG)
  shade.name = 'lamp.shade'
  swBody = mk(tSw, enamel, tiltG)
  swBody.name = 'lamp.switch'

  // ---- the light: on or off (the switch thrown, the filament warming or cooling), and the frame's gate
  let want = 1 // (switched on)
  let level = 1 // (the glow now)
  let gate = 1 // (the frame cache's: 0 while the ember's light is drawn alone)
  let sw = 1 // (the toggle, 0 off .. 1 on)
  const applyGlow = () => (uGlow.value = level * gate)
  const throwSwitch = () => {
    lever.rotation.x = SWITCH * (2 * sw - 1)
    lever.updateMatrixWorld()
  }
  throwSwitch()

  return {
    group,
    meshes,
    /** The bulb's middle (world), kept up to date as the head moves. */
    bulb,
    /** Which way the shade points (world, unit), kept up to date. */
    axis,
    head: H,
    elbow: E,
    materials,
    /** What a drag aims by: the shade, its inside, the bulb, the holder, the fork. */
    headMeshes: [shade, shadeIn, glass, headBrass, fork, hcMesh],
    /** What a tap switches by: the switch, its toggle, and an unseen target round them. */
    switchMeshes: [swBody, leverMesh, swHit],
    /** Switched on (where it is going). */
    get on() {
      return want === 1
    },
    /** How bright its own light is now, 0..1 (the scene's light should follow it). */
    get level() {
      return level
    },
    setOn(on) {
      want = on ? 1 : 0
    },
    toggle() {
      want = want ? 0 : 1
    },
    /** Swivel and tilt the head to light p (world), within its stops; eased by update(). */
    aimAt(p) {
      anglesTo(p, goal)
      // (round the shorter way)
      goal[0] = ang[0] + wrapPi(goal[0] - ang[0])
      moving = Math.abs(goal[0] - ang[0]) > 1e-5 || Math.abs(goal[1] - ang[1]) > 1e-5 || moving
    },
    /** Advance the head, the glow and the switch; true while anything still moves. */
    update(dt) {
      let busy = false
      if (moving) {
        smoothToward(ang, vel, goal, dt, AIM_SMOOTH, AIM_SPEED, 2)
        // (settled once the rest would be a fraction of a millimetre on the desk)
        if (Math.abs(goal[0] - ang[0]) < 1e-3 && Math.abs(goal[1] - ang[1]) < 1e-3 && Math.abs(vel[0]) + Math.abs(vel[1]) < 1e-2) {
          ang.set(goal)
          vel.fill(0)
          moving = false
        }
        pose()
        busy = true
      }
      if (level !== want) {
        // (a filament warms faster than it cools)
        level += (want - level) * (1 - Math.exp(-dt / (want > level ? 0.05 : 0.12)))
        if (Math.abs(want - level) < 0.008) level = want
        applyGlow()
        busy = true
      }
      if (sw !== want) {
        sw += (want - sw) * (1 - Math.exp(-dt / 0.03))
        if (Math.abs(want - sw) < 0.01) sw = want
        throwSwitch()
        busy = true
      }
      return busy
    },
    /** The frame's gate on its own glow (the bulb, the lit inside, the vents): at once, the switch untouched. */
    glow(on) {
      gate = on ? 1 : 0
      applyGlow()
    },
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of [...materials, ringMat, lineMat]) m.dispose()
      for (const t of textures) t.dispose()
    },
  }
}

/** A matrix whose +z is `axis` (unit) and whose origin is `o`. */
function alongZ(axis, o) {
  const z = axis.clone().normalize()
  const x = new THREE.Vector3(0, 1, 0)
  if (Math.abs(z.y) > 0.9) x.set(1, 0, 0)
  x.cross(z).normalize()
  const y = new THREE.Vector3().crossVectors(z, x)
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(o)
}
