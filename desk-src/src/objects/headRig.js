// The figure in the pictures, made to move (three.js): the head and shoulders meshed from
// objects/headGeo.js, with
//   - its skin: thin and bloodless, darker and colder round the eyes and on the lips, mottled,
//     its creases and hollows in shade, pores where the light rakes it; its teeth;
//   - its jaw, which swings open on its hinge (a uniform: every vertex knows its share);
//   - two eyes that are balls of their own (wet, veined, a pale iris, a pupil) and turn to look;
//   - a lid over each, a cap on the ball's own centre that comes down from under the brow;
//   - a hand on an arm (open, or with finger and thumb pinched together), for what one of the
//     pictures does.
// Frame: the head's own (headGeo.js): the origin between the eyes, y up, z out of the face (mm).
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { HEAD } from './headGeo.js'

const NOISE = `
  float figHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float figNoise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(figHash(i), figHash(i + vec3(1, 0, 0)), f.x), mix(figHash(i + vec3(0, 1, 0)), figHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(figHash(i + vec3(0, 0, 1)), figHash(i + vec3(1, 0, 1)), f.x), mix(figHash(i + vec3(0, 1, 1)), figHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }`
const BUMP = (h) => `
  {
    float foot = length(fwidth(vFigP));
    float h = ${h};
    vec3 sp = -vViewPosition;
    vec3 sx = dFdx(sp);
    vec3 sy = dFdy(sp);
    vec3 r1 = cross(sy, normal);
    vec3 r2 = cross(normal, sx);
    float det = dot(sx, r1);
    normal = normalize(abs(det) * normal - sign(det) * (dFdx(h) * r1 + dFdy(h) * r2));
  }`

/** The head's geometry from its mesh (headGeo.js's headMesh, out of the worker). */
export function headGeometry(m) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3))
  const col = new Float32Array(m.ao.length * 3)
  for (let i = 0; i < m.ao.length; i++) {
    col[i * 3] = m.ao[i]
    col[i * 3 + 1] = m.cave[i]
    col[i * 3 + 2] = m.tooth[i]
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.setAttribute('aJaw', new THREE.BufferAttribute(m.jaw, 1))
  g.setIndex(new THREE.BufferAttribute(m.indices, 1))
  g.computeBoundingSphere()
  return g
}

/** Skin. tone: its colour; the head's (face: true) knows where its eyes and lips are. */
export function skinMaterial({ tone = 0xcdbfb1, face = true } = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color: tone, roughness: 0.5, metalness: 0, vertexColors: face, specularIntensity: 0.7, sheen: 0.2, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x6b5148) })
  const u = { uJaw: { value: 0 }, uHinge: { value: new THREE.Vector2(...HEAD.hinge) } }
  m.userData.u = u
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vFigP;\n${face ? 'attribute float aJaw;\nuniform float uJaw;\nuniform vec2 uHinge;' : ''}`)
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        ${face ? `float figJa = uJaw * aJaw;
        objectNormal.yz = vec2(objectNormal.y * cos(figJa) - objectNormal.z * sin(figJa), objectNormal.y * sin(figJa) + objectNormal.z * cos(figJa));` : ''}`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vFigP = position;
        ${face ? `{
          // the jaw's swing about its hinge, as much of it as this point takes, and (as a jaw does)
          // its slide forward and down as it opens, so the chin drops rather than going back
          float cj = cos(figJa);
          float sj = sin(figJa);
          vec2 q = transformed.yz - uHinge;
          transformed.yz = uHinge + vec2(q.x * cj - q.y * sj, q.x * sj + q.y * cj);
          transformed.yz += vec2(-9.0, 30.0) * (uJaw / 0.46) * aJaw;
        }` : ''}`,
      )
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vFigP;\n${NOISE}`)
      .replace(
        '#include <color_fragment>',
        `{
          vec3 skin = diffuseColor.rgb;
          float mott = figNoise(vFigP * 0.045) * 0.6 + figNoise(vFigP * 0.15) * 0.4;
          skin *= 0.84 + 0.3 * mott;
          // age: brown spots on the scalp and the temples, blotches of red
          float spots = smoothstep(0.7, 0.8, figNoise(vFigP * 0.3 + 7.0)) * smoothstep(0.35, 0.6, figNoise(vFigP * 0.04 + 1.0)) * smoothstep(-10.0, 40.0, vFigP.y);
          skin = mix(skin, skin * vec3(0.7, 0.6, 0.52), spots * 0.6);
          skin = mix(skin, skin * vec3(0.95, 0.76, 0.74), smoothstep(0.55, 0.8, figNoise(vFigP * 0.05 + 3.0)) * 0.5);
          ${face ? `float occ = vColor.r;
          float cave = vColor.g;
          float tooth = vColor.b;
          // round the eyes, and the lips: thin skin, darker and colder
          float ex = abs(vFigP.x) - 31.0;
          float orbit = exp(-(ex * ex / 520.0 + (vFigP.y + 3.0) * (vFigP.y + 3.0) / 240.0)) * step(28.0, vFigP.z);
          skin = mix(skin, skin * vec3(0.36, 0.3, 0.37), orbit * 0.82);
          float lips = exp(-((vFigP.y + 71.5) * (vFigP.y + 71.5) / 52.0 + vFigP.x * vFigP.x / 640.0)) * step(60.0, vFigP.z);
          skin = mix(skin, skin * vec3(0.55, 0.42, 0.5), lips * 0.75);
          // veins under the thin skin of the temples, the brow, the throat: blue, faint
          float vein = abs(figNoise(vFigP * vec3(0.05, 0.03, 0.05) + figNoise(vFigP * 0.035) * 2.2) - 0.5);
          float vm = smoothstep(42.0, 66.0, abs(vFigP.x)) * smoothstep(-10.0, 20.0, vFigP.y) ;
          skin = mix(skin, skin * vec3(0.7, 0.76, 0.92), (1.0 - smoothstep(0.004, 0.03, vein)) * vm * 0.6);
          // stubble: the shaved beard on the jaw, the chin, over the lip; the shaved hair round the
          // back and sides of the scalp
          {
            float ay = vFigP.y;
            float ax2 = abs(vFigP.x);
            float beard = smoothstep(-40.0 - 0.45 * ax2, -56.0 - 0.45 * ax2, ay) * smoothstep(-132.0, -112.0, ay) * smoothstep(-30.0, 0.0, vFigP.z) * (1.0 - lips);
            beard *= 1.0 - smoothstep(18.0, 4.0, abs(ay + 54.0 + 0.0 * ax2)) * smoothstep(14.0, 2.0, ax2) * 0.0;
            float hair = smoothstep(-34.0, -14.0, ay) * smoothstep(64.0, 44.0, ay) * smoothstep(30.0, -10.0, vFigP.z) * (1.0 - smoothstep(52.0, 66.0, ax2) * smoothstep(-40.0, -4.0, ay) * smoothstep(-40.0, -20.0, vFigP.z) * 0.0);
            hair = max(hair, smoothstep(-40.0, -60.0, vFigP.z) * smoothstep(-60.0, -30.0, ay) * smoothstep(70.0, 40.0, ay));
            float speck = smoothstep(0.42, 0.62, figNoise(vFigP * 2.3)) * 0.7 + 0.3;
            skin = mix(skin, skin * vec3(0.5, 0.48, 0.5), max(beard * 0.62, hair * 0.5) * speck);
          }
          // the lashes along each lid's rim (dark), the rims themselves a little wet and red
          {
            float u = ex * cos(-0.07) - vFigP.y * sin(-0.07);
            float v = ex * sin(-0.07) + vFigP.y * cos(-0.07);
            float kk = max(0.0, 1.0 - (u / 14.6) * (u / 14.6));
            float up = v - 5.6 * kk;
            float lo = -v - 4.4 * kk;
            float near = step(52.0, vFigP.z) * step(abs(u), 16.5);
            skin = mix(skin, vec3(0.03, 0.025, 0.025), exp(-up * up / 4.0) * step(-1.0, v) * near * 0.92);
            skin = mix(skin, skin * vec3(0.55, 0.36, 0.36), exp(-lo * lo / 2.2) * step(v, 0.0) * near * 0.8);
          }
          // creases, then hollows
          skin *= mix(vec3(0.46, 0.34, 0.32), vec3(1.0), smoothstep(0.0, 0.9, occ)) * (0.5 + 0.5 * occ);
          skin *= mix(0.025, 1.0, cave * cave);
          skin = mix(skin, vec3(0.6, 0.55, 0.42) * (0.4 + 0.6 * occ) * mix(0.3, 1.0, cave), tooth);` : ''}
          diffuseColor.rgb = skin;
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        ${face ? `{
          // oily where skin is: the forehead, down the nose, over the cheekbones
          float oil = smoothstep(20.0, 60.0, vFigP.y) + exp(-(vFigP.x * vFigP.x) / 160.0) * step(-50.0, vFigP.y) * step(vFigP.y, 10.0) + exp(-((abs(vFigP.x) - 48.0) * (abs(vFigP.x) - 48.0) / 120.0 + (vFigP.y + 16.0) * (vFigP.y + 16.0) / 140.0));
          roughnessFactor = mix(roughnessFactor, 0.33, clamp(oil, 0.0, 1.0)) * (0.85 + 0.3 * figNoise(vFigP * 0.3));
          roughnessFactor = mix(mix(0.9, roughnessFactor, smoothstep(0.5, 0.98, vColor.r)), 0.28, vColor.b);
        }` : ''}`,
      )
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${BUMP('(figNoise(vFigP * 1.7) - 0.5) * 0.085 * (1.0 - smoothstep(0.25, 0.9, foot)) + (figNoise(vFigP * 0.42) - 0.5) * 0.09')}`)
  }
  m.customProgramCacheKey = () => `figure.skin.${face ? 'face' : 'plain'}`
  return m
}

/** An eyeball's surface: a veined white, an iris of fibres with a dark rim, a pupil; wet. */
export function eyeMaterial({ iris = 0x9aa39a, pupil = 0.16 } = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.07, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1 })
  const u = { uIris: { value: new THREE.Color(iris) }, uPupil: { value: pupil } }
  m.userData.u = u
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u)
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFigP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFigP = position;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vFigP;\nuniform vec3 uIris;\nuniform float uPupil;\n${NOISE}`)
      .replace(
        '#include <color_fragment>',
        `{
          vec3 n = normalize(vFigP);
          float a = acos(clamp(n.z, -1.0, 1.0)); // (from where it looks)
          float ang = atan(n.y, n.x);
          // the white: a little yellow, veins that thicken away from the iris
          float vein = abs(figNoise(vec3(n.xy * 9.0, 1.0) + figNoise(vec3(n.xy * 4.0, 3.0)) * 1.6) - 0.5);
          vec3 white = vec3(0.76, 0.71, 0.65) * (0.9 + 0.1 * figNoise(n * 6.0));
          white = mix(white, vec3(0.62, 0.42, 0.4), smoothstep(0.7, 1.3, abs(n.x)) * 0.6);
          white = mix(white, vec3(0.5, 0.12, 0.1), (1.0 - smoothstep(0.0, 0.035, vein)) * smoothstep(0.5, 1.2, a) * 0.7);
          white *= 1.0 - 0.35 * smoothstep(0.7, 1.5, a);
          // the iris: fibres out from the pupil, darker at its rim
          const float IR = 0.475;
          float fibre = figNoise(vec3(ang * 14.0, a * 30.0, 0.0)) * 0.6 + figNoise(vec3(ang * 40.0, a * 12.0, 4.0)) * 0.4;
          vec3 iris = uIris * (0.45 + 0.85 * fibre) * (1.0 - 0.72 * smoothstep(IR * 0.72, IR, a));
          iris *= 0.75 + 0.5 * smoothstep(uPupil, uPupil * 1.9, a);
          vec3 c = mix(iris, white, smoothstep(IR - 0.015, IR + 0.02, a));
          c = mix(vec3(0.004), c, smoothstep(uPupil - 0.012, uPupil + 0.012, a));
          diffuseColor.rgb = c;
        }`,
      )
  }
  m.customProgramCacheKey = () => 'figure.eye'
  return m
}

/** A capsule from a to b, radii ra, rb (a cone between two balls). */
function limb(a, b, ra, rb) {
  const d = new THREE.Vector3().subVectors(b, a)
  const len = d.length()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())
  const body = new THREE.CylinderGeometry(rb, ra, len, 14, 1, true).translate(0, len / 2, 0).applyQuaternion(q).translate(a.x, a.y, a.z)
  return [body, new THREE.SphereGeometry(ra, 14, 10).translate(a.x, a.y, a.z), new THREE.SphereGeometry(rb, 14, 10).translate(b.x, b.y, b.z)]
}
/**
 * A hand on its forearm, its back to the viewer, as one geometry; pinch: its first finger and its
 * thumb brought together. Its origin is where they meet (or, open, the first finger's tip).
 */
export function handGeometry(pinch) {
  const parts = []
  const V = (x, y, z) => new THREE.Vector3(x, y, z)
  /** A finger from `base`, pointing `dir`, curling towards the palm (-z) by `curl` at each joint. */
  const finger = (base, dir, lens, curl, r0, r1) => {
    let p = base.clone()
    let d = dir.clone().normalize()
    const axis = V(1, 0, 0)
    let tip = p
    lens.forEach((len, i) => {
      d = d.clone().applyAxisAngle(axis, -curl[i])
      const q = p.clone().addScaledVector(d, len)
      const ra = r0 + ((r1 - r0) * i) / lens.length
      const rb = r0 + ((r1 - r0) * (i + 1)) / lens.length
      parts.push(...limb(p, q, ra, rb))
      p = q
      tip = q
    })
    return tip
  }
  const idx = finger(V(-22, 0, 0), V(-0.08, 1, 0), [44, 27, 22], pinch ? [0.55, 0.8, 0.55] : [0.12, 0.14, 0.1], 9, 7.2)
  finger(V(0, 4, 0), V(0, 1, 0), [48, 31, 23], pinch ? [0.95, 1.1, 0.7] : [0.16, 0.16, 0.12], 9.2, 7.4)
  finger(V(20, 0, 0), V(0.06, 1, 0), [44, 29, 22], pinch ? [1.05, 1.15, 0.7] : [0.2, 0.18, 0.12], 8.8, 7)
  finger(V(38, -8, 0), V(0.14, 1, 0), [34, 21, 19], pinch ? [1.1, 1.1, 0.7] : [0.26, 0.2, 0.14], 7.8, 6.2)
  // the thumb: out to the side when open; across to the first finger's tip to pinch
  const tb = V(-36, -52, -6)
  if (pinch) {
    const to = idx.clone().add(V(-3, -9, -4)).sub(tb)
    const mid = tb.clone().addScaledVector(to, 0.56).add(V(-9, 0, -7))
    parts.push(...limb(tb, mid, 11, 9.6), ...limb(mid, tb.clone().add(to), 9.6, 8.2))
  } else {
    const mid = tb.clone().add(V(-26, 22, -8))
    parts.push(...limb(tb, mid, 11, 9.6), ...limb(mid, mid.clone().add(V(-14, 24, -4)), 9.6, 8.2))
  }
  // the palm, the wrist, the forearm away down and towards the viewer
  parts.push(new THREE.SphereGeometry(1, 20, 14).scale(34, 36, 13).translate(8, -34, 1))
  parts.push(new THREE.SphereGeometry(1, 20, 14).scale(30, 30, 14).translate(-6, -58, 0))
  parts.push(...limb(V(6, -84, 2), V(52, -420, 150), 27, 38))
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))
  for (const p of parts) p.dispose()
  const origin = pinch ? idx.clone().add(V(-1.5, -4.5, -2)) : idx
  g.translate(-origin.x, -origin.y, -origin.z)
  return g
}

/**
 * The figure: geo (headGeometry()), its materials made here. stretch: how much longer than life its
 * head is. Returns { group, skin, eyes: [right, left] (meshes; the first is the viewer's right),
 *   lids, setJaw(k 0..1), setLids(k 0 open..1 shut, wide 0..1), look(yaw, pitch), dispose() }.
 */
export function createFigure({ geo, stretch = 1, tone, iris, pupil }) {
  const group = new THREE.Group()
  const skin = skinMaterial({ tone })
  const head = new THREE.Mesh(geo, skin)
  head.scale.set(1, stretch, 1)
  head.castShadow = head.receiveShadow = true
  group.add(head)
  const eyeMat = eyeMaterial({ iris, pupil })
  const lidMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(tone ?? 0xcdbfb1).multiply(new THREE.Color(0.5, 0.42, 0.46)), roughness: 0.6 })
  const eyeGeo = new THREE.SphereGeometry(HEAD.eyeR, 40, 28)
  const lidGeo = new THREE.SphereGeometry(HEAD.lidR, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2)
  const eyes = []
  const lids = []
  for (const s of [1, -1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat)
    eye.position.set(s * HEAD.eye[0], HEAD.eye[1], HEAD.eye[2])
    eye.receiveShadow = true
    const lid = new THREE.Mesh(lidGeo, lidMat)
    lid.position.copy(eye.position)
    lid.castShadow = true
    group.add(eye, lid)
    eyes.push(eye)
    lids.push(lid)
  }
  // (the lid's rim: this far up behind the opening's top when open, below its foot when shut)
  const up = Math.asin(Math.min(0.95, (HEAD.open.up * stretch + 1.2) / HEAD.lidR))
  const dn = Math.asin(Math.min(0.95, (HEAD.open.low * stretch + 1.6) / HEAD.lidR))
  const api = {
    group,
    head,
    skin,
    eyes,
    lids,
    setJaw(k) {
      skin.userData.u.uJaw.value = 0.46 * k
    },
    setLids(k, wide = 0) {
      for (const lid of lids) lid.rotation.x = -(up + 0.06 + 0.2 * wide) + (up + 0.06 + 0.2 * wide + dn) * k
    },
    look(yaw, pitch) {
      for (const e of eyes) e.rotation.set(-pitch, yaw, 0)
    },
    dispose() {
      eyeGeo.dispose()
      lidGeo.dispose()
      for (const m of [skin, eyeMat, lidMat]) m.dispose()
    },
  }
  api.setLids(0)
  return api
}
