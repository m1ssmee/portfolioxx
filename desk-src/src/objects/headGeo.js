// A head and shoulders, as a distance field (plain JS, no three.js: meshed in the worker by
// core/sdf.js): the figure in the pictures on the wall. Bald, gaunt, a little too long: a skull
// under thin skin. Cut the way a face is built: the cranium and the narrower jaw; a hard brow over
// deep sockets (the eyes are separate: each socket is an almond opening onto a round hollow where a
// ball and its lid sit); cheekbones over hollow cheeks; a long nose with open nostrils; thin lips,
// parted by a slit onto the hollow of the mouth, teeth above and below (the jaw moves: each vertex
// carries how much of the jaw's swing it takes, `jaw`); ears; a neck of cords, the pit of the
// throat, collarbones, shoulders.
// Its own frame: the origin between the eyes, y up, z out of the face (mm, life size).
import { smin, smax, sdEllipsoid, sdRoundCone } from './../core/sdf.js'
import { curve, line } from './masksGeo.js'

export const HEAD = {
  eye: [31, 0, 56], // (the middle of an eyeball: mirrored in x)
  eyeR: 12.2,
  lidR: 12.75,
  socketR: 13.4,
  open: { w: 14.6, up: 5.6, low: 4.4, droop: -0.07 }, // (the eye's opening: half width, how far up and down)
  slitY: -70.6, // (where the lips part)
  mouth: [0, -72, 86], // (the middle of the mouth, at the lips)
  hinge: [-18, -12], // (the jaw's hinge: y, z)
  bounds: [-196, -276, -128, 196, 130, 122],
  h: 2.0,
}
const H = HEAD
const sstep = (a, b, t) => {
  t = (t - a) / (b - a)
  t = t < 0 ? 0 : t > 1 ? 1 : t
  return t * t * (3 - 2 * t)
}
/** A furrow or a ridge on the face only (it fades out behind the ears). */
const mark = (d, x, y, z, c, depth, w, ends) => (z < -5 ? d : line(d, Math.abs(x), y, c, depth * sstep(-5, 25, z), w, ends))
const L = {
  f1: curve([[0, 48], [16, 47], [34, 43], [52, 34]]),
  f2: curve([[0, 60], [18, 59], [36, 54], [52, 46]]),
  f3: curve([[0, 72], [16, 71], [32, 67], [46, 60]]),
  glab: curve([[5, 12], [5.8, 22], [4.6, 32]]),
  bag1: curve([[15, -9], [27, -13.5], [39, -12], [47, -6]]),
  crow1: curve([[47, 3], [55, 6], [62, 12]]),
  crow2: curve([[47.5, -1], [56, -1], [64, 2]]),
  crow3: curve([[47, -5], [55, -8], [62, -13]]),
  fold: curve([[19, -44], [25, -54], [30, -66], [31.5, -80], [28, -92]]),
  ala: curve([[14, -38], [19.5, -42], [20.5, -48], [17, -52]]),
  lidC: curve([[19, 6.5], [26, 9.8], [35, 10.6], [43, 8], [48, 3.5]]),
  marion: curve([[25, -73], [27.5, -84], [26, -96]]),
  philtrum: curve([[0, -51], [0, -57], [0, -63]]),
  chin: curve([[0, -90], [9, -90.5], [16, -94]]),
  lipU: curve([[0, -64.5], [6, -63.2], [14, -64.6], [24.5, -70.6]]),
}
/** The eye's opening, in the plane of the face: negative inside (mm, roughly). */
function opening(ax, y) {
  const o = H.open
  const u = (ax - H.eye[0]) * Math.cos(o.droop) - y * Math.sin(o.droop)
  const v = (ax - H.eye[0]) * Math.sin(o.droop) + y * Math.cos(o.droop)
  const k = 1 - (u / o.w) * (u / o.w)
  return Math.max(v - o.up * k, -v - o.low * k) * 0.8
}
/** A row of teeth along the jaw's arc: `top`, the row's upper edge; they hang (or stand) `tall`. */
function teeth(x, y, z, top, tall, R) {
  const dz = z - 56
  const r = Math.sqrt(x * x + dz * dz)
  const a = Math.atan2(x, dz) // (round the arc, 0 at the front)
  if (dz < -4) return 9
  // each tooth a little pillow: the row's face scalloped, a dip between one and the next
  const n = Math.cos(a * 15.5)
  const face = Math.abs(r - R) - 2.1 - 0.5 * n
  const edge = Math.abs(y - (top - tall / 2)) - tall / 2 + (n < -0.6 ? 0.9 : 0)
  return Math.max(face, edge, Math.abs(a) - 1.15) * 0.8
}

/** An ellipse's distance, roughly (in its plane): a, b its half axes. */
const ell = (u, v, a, b) => (Math.sqrt((u / a) * (u / a) + (v / b) * (v / b)) - 1) * Math.min(a, b)

/** The muzzle (the teeth's arch under the skin) and the lips on it. */
function muzzle(d, x, y, z) {
  const ax = Math.abs(x)
  d = smin(d, sdEllipsoid(x, y + 64, z - 50, 30, 30, 37), 14)
  d = smin(d, sdEllipsoid(ax - 6.5, y + 66 + 0.004 * x * x, z - 82.6, 15, 3.9, 4.8), 3.2)
  d = smin(d, sdEllipsoid(x, y + 75.4, z - 81.6, 15.5, 5, 5.3), 4)
  return d
}

// (the upper row hangs to just above where the lips part; the lower stands from just below it,
// behind the upper, and goes with the jaw)
const upperTeeth = (x, y, z) => teeth(x, y, z, -62.4, 7.2, 22.5)
const lowerTeeth = (x, y, z) => teeth(x, y, z, H.slitY - 1.8, 6.6, 20.6)

export function headField(x, y, z) {
  const ax = Math.abs(x)
  // ---- the skull, and the face hung from it, narrower towards the chin
  let d = sdEllipsoid(x, y - 38, z + 12, 76, 86, 98)
  const k = 1 + 0.27 * ((y + 40) / 84)
  d = smin(d, sdEllipsoid(x / k, y + 40, z - 12, 54, 84, 62) * Math.min(1, k), 26)
  // the jaw: from each angle round to the chin
  d = smin(d, sdRoundCone(ax, y, z, 43, -88, -8, 15, -104, 56, 7.5, 10.5), 15)
  d = smin(d, sdEllipsoid(x, y + 103, z - 61, 16, 12, 14), 12)
  // the brow: a hard ridge over each socket, a hollow at the temple
  d = smin(d, sdRoundCone(ax, y, z, 10, 16.5, 79, 51, 11, 61, 10, 7), 10)
  d = smax(d, -sdEllipsoid(ax - 77, y - 22, z - 34, 9, 30, 32), 16)
  // cheekbones (and their arch back to the ear), the cheeks fallen in under them
  d = smin(d, sdEllipsoid(ax - 50, y + 16, z - 42, 15, 10, 17), 16)
  d = smin(d, sdRoundCone(ax, y, z, 58, -14, 30, 70, -12, -8, 5.5, 4.5), 10)
  d = smax(d, -sdEllipsoid(ax - 57, y + 54, z - 40, 11, 24, 20), 18)
  // ---- the mouth's muzzle, lips, the slit between them turning down at its corners, the hollow
  // behind, a row of teeth above and below
  d = muzzle(d, x, y, z)
  d = mark(d, x, y, z, L.lipU, -0.7, 2.0, 0)
  const sy = y - H.slitY + 0.0075 * x * x
  d = smax(d, -Math.max(Math.abs(sy) - 1.5 * (1 - sstep(8, 20, ax) * 0.45), ax - 20, 54 - z), 1.6)
  d = smax(d, -sdEllipsoid(x, y + 71.5, z - 62, 21, 11.5, 18), 1.2)
  d = Math.min(d, upperTeeth(x, y, z), lowerTeeth(x, y, z))
  // ---- the nose: bridge, tip, wings; the nostrils open from below
  d = smin(d, sdRoundCone(x, y, z, 0, 6, 74, 0, -33, 99, 5, 7.4), 8)
  d = smin(d, sdEllipsoid(x, y + 40, z - 98.6, 8.2, 8.6, 8), 7)
  d = smin(d, sdEllipsoid(ax - 11, y + 46, z - 89.5, 6.6, 5.8, 7.8), 8.5)
  d = smax(d, -sdEllipsoid(ax - 6.2, y + 48.6, z - 93, 4.2, 2.6, 7), 1.5)
  d = mark(d, x, y, z, L.ala, 1.1, 2.0)
  // ---- the eyes: an almond opening in the skin onto a round hollow (the ball and the lid are
  // other meshes); the opening's rims a little raised, a crease in the lid above
  {
    // the lids: skin wrapped over the front of the ball (the opening is cut through it)
    const ex = ax - H.eye[0]
    const ez = z - H.eye[2]
    const lid = Math.sqrt(ex * ex + y * y + ez * ez) - (H.socketR + 3.0)
    d = smin(d, Math.max(lid, -ez - 3), 4.5)
  }
  const o = opening(ax, y)
  if (z > H.eye[2] - 2) {
    d += -1.1 * Math.exp(-((o - 1.4) * (o - 1.4)) / 5) * sstep(H.eye[2] + 4, H.eye[2] + 12, z) * (o > -1 ? 1 : 0)
    d = smax(d, -Math.max(o, H.eye[2] + 2 - z), 1.3)
  }
  {
    const ex = ax - H.eye[0]
    const ez = z - H.eye[2]
    d = smax(d, -(Math.sqrt(ex * ex + y * y + ez * ez) - H.socketR), 1)
  }
  d = mark(d, x, y, z, L.lidC, 1.3, 2.2)
  // ---- ears: a shell flat to the head at its front edge, standing off it towards the back; its
  // rim rolled over, the groove inside the rim, the bowl round the ear's hole, the lobe
  {
    const u = y + 9 // (up the ear)
    const v = z + 14 // (towards the face)
    const b = 12.5 + 4.5 * sstep(-26, 18, u) // (wider at the top than at the lobe)
    const out = ax - 63 - 0.27 * (16 - v) + 0.2 * Math.max(0, -u - 4) // (off the head, less so at the lobe)
    const edge = ell(u, v, 30, b)
    const shell = Math.max(edge, Math.abs(out - 2.2) - 2.2)
    d = smin(d, shell - 1.0, 4.5)
    const rimLine = Math.abs(edge + 2.3) - 2.3
    const rim = Math.max(rimLine, Math.abs(out - 3.8) - 2.0, v - 12 + 22 * sstep(-30, 6, u) * 0)
    d = smin(d, Math.max(rim, -(u + 26 - v * 0.5)), 1.5)
    d = smax(d, -Math.max(Math.abs(edge + 5.8) - 1.5, 3.4 - out, -u - 20, v - 5), 1.2)
    d = smax(d, -Math.max(ell(u + 3, v - 5, 11, 7.5), 2.4 - out), 2.4)
    d = smax(d, -Math.max(ell(u + 2, v - 9.5, 3.4, 3), -1 - out), 1.2)
  }
  // ---- the neck: its column, the two cords from behind the ears to the pit of the throat, the
  // larynx; then the shoulders, the collarbones, the pit between them
  d = smin(d, sdRoundCone(x, y, z, 0, -98, -20, 0, -205, -30, 44, 50), 22)
  d = smin(d, sdRoundCone(ax, y, z, 38, -50, -30, 11, -200, 20, 7, 6.5), 9)
  d = smin(d, sdEllipsoid(x, y + 148, z - 16, 9, 14, 9), 12)
  d = smin(d, sdRoundCone(ax, y, z, 38, -150, -52, 150, -214, -42, 30, 27), 30)
  d = smin(d, sdEllipsoid(x, y + 268, z + 28, 205, 72, 92), 40)
  d = smin(d, sdRoundCone(ax, y, z, 15, -213, 36, 150, -203, 4, 8, 9), 9)
  d = smax(d, -sdEllipsoid(x, y + 207, z - 42, 12, 11, 9), 8)
  // ---- what years of it leave: the forehead, between the brows, under and beside the eyes, from
  // the nose round the mouth and on down, the cheeks
  d = mark(d, x, y, z, L.f1, 1.1, 2.3, 2)
  d = mark(d, x, y, z, L.f2, 0.9, 2.2, 2)
  d = mark(d, x, y, z, L.f3, 0.6, 2.0, 2)
  d = mark(d, x, y, z, L.glab, 1.0, 2.2)
  d = mark(d, x, y, z, L.bag1, 0.9, 2.4)
  d = mark(d, x, y, z, L.crow1, 0.9, 1.5, 2)
  d = mark(d, x, y, z, L.crow2, 0.9, 1.5, 2)
  d = mark(d, x, y, z, L.crow3, 0.9, 1.5, 2)
  d = mark(d, x, y, z, L.fold, 1.9, 3.0, 2)
  d = mark(d, x, y, z, L.marion, 1.1, 2.4)
  d = mark(d, x, y, z, L.chin, 0.7, 2.8)
  if (ax < 6 && z > 60) d = line(d, x, y, L.philtrum, 1.0, 2.6)
  return smax(d, -(y + 272), 3)
}

/** The skin before anything is cut into it (for how deep a point lies in a hollow). */
function hullField(x, y, z) {
  const k = 1 + 0.27 * ((y + 40) / 84)
  let d = sdEllipsoid(x, y - 38, z + 12, 76, 86, 98)
  d = smin(d, sdEllipsoid(x / k, y + 40, z - 12, 54, 84, 62) * Math.min(1, k), 26)
  d = muzzle(d, x, y, z)
  return smin(d, sdRoundCone(x, y, z, 0, 6, 74, 0, -33, 99, 5, 7.4), 8)
}

/**
 * The head, meshed: { positions, normals, ao, cave, jaw, tooth, indices }. cave: 1 at the skin,
 * towards 0 deep in the mouth, a nostril, a socket; jaw: how much of the jaw's swing a vertex
 * takes; tooth: 1 on the teeth.
 */
export function headMesh(meshSDF) {
  const r = meshSDF(headField, H.bounds, H.h, { aoStep: 2.6, aoStrength: 0.9 })
  const n = r.positions.length / 3
  const cave = new Float32Array(n)
  const jaw = new Float32Array(n)
  const tooth = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = r.positions[i * 3]
    const y = r.positions[i * 3 + 1]
    const z = r.positions[i * 3 + 2]
    const ax = Math.abs(x)
    // (hollows: only on the face and in the head; the neck and shoulders are all skin)
    const deep = y > -112 && z > 30 ? -hullField(x, y, z) * sstep(30, 46, z) * sstep(-112, -96, y) : 0
    cave[i] = 1 - sstep(3, 16, deep)
    // the jaw: all of what is under the slit between the lips at once; the cheeks beside it
    // stretch over a couple of centimetres; nothing behind the jaw's angle, nothing of the neck
    const below = H.slitY - 0.0075 * x * x - y
    const inLips = 1 - sstep(21, 29, ax)
    const ramp = 24 - 22.5 * inLips * sstep(30, 50, z)
    jaw[i] = sstep(0, ramp, below) * sstep(-28, 22, z) * (1 - sstep(118, 146, -y)) * (below > 0 ? 1 : 0)
    tooth[i] = Math.min(upperTeeth(x, y, z), lowerTeeth(x, y, z)) < 0.7 && z > 56 && ax < 23 ? 1 : 0
  }
  return { ...r, cave, jaw, tooth }
}
