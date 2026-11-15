// Two wailing faces, as distance fields (plain JS, no three.js: meshed in the worker by
// core/sdf.js): masks carved in the round, the way a face is cut in marble. Each is a long egg of
// stone, flat behind; on it, in relief: a knotted brow, its inner ends drawn up; deep eye sockets,
// the eyeball in each with its iris cut as a ring and its pupil drilled; a long nose with open
// nostrils; the folds from the nose round the mouth, the bags under the eyes, the furrows of the
// forehead; and the mouth, cut deep enough to be dark. The first cries with its mouth pulled wide
// and down, its lower lip and chin pushed up into it; the second's jaw has dropped as far as it goes.
// A mask's own frame: the middle of the face at the origin, y up, z out of the face (mm).
import { smin, smax, sdEllipsoid, sdRoundCone, sdRoundRect2 } from './../core/sdf.js'

// ---- lines on the face: a curve in (x, y), cut in as a furrow or raised as a ridge
/** A curve through `ctrl` ([[x, y], ...], Catmull-Rom), as a polyline with its bounds. */
export function curve(ctrl, n = 10) {
  const P = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]]
  const pts = []
  for (let i = 1; i < P.length - 2; i++)
    for (let k = 0; k < n; k++) {
      const t = k / n
      const t2 = t * t
      const t3 = t2 * t
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      pts.push(f(P[i - 1][0], P[i][0], P[i + 1][0], P[i + 2][0]), f(P[i - 1][1], P[i][1], P[i + 1][1], P[i + 2][1]))
    }
  pts.push(ctrl[ctrl.length - 1][0], ctrl[ctrl.length - 1][1])
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let i = 0; i < pts.length; i += 2) {
    x0 = Math.min(x0, pts[i])
    x1 = Math.max(x1, pts[i])
    y0 = Math.min(y0, pts[i + 1])
    y1 = Math.max(y1, pts[i + 1])
  }
  return { p: new Float64Array(pts), n: pts.length / 2, x0, y0, x1, y1 }
}
/**
 * The field `d` with the curve `c` worked into the face at (x, y): `depth` mm in (a furrow) or,
 * negative, out (a ridge), `w` mm wide; fading out towards its ends (ends: 0 none, 1 both, 2 only
 * its last end).
 */
export function line(d, x, y, c, depth, w, ends = 1) {
  const pad = 3 * w
  if (x < c.x0 - pad || x > c.x1 + pad || y < c.y0 - pad || y > c.y1 + pad) return d
  let best = Infinity
  let at = 0
  const p = c.p
  for (let i = 0; i < c.n - 1; i++) {
    const ax = p[i * 2]
    const ay = p[i * 2 + 1]
    const bx = p[i * 2 + 2] - ax
    const by = p[i * 2 + 3] - ay
    const l2 = bx * bx + by * by || 1e-9
    let t = ((x - ax) * bx + (y - ay) * by) / l2
    t = t < 0 ? 0 : t > 1 ? 1 : t
    const dx = x - ax - bx * t
    const dy = y - ay - by * t
    const q = dx * dx + dy * dy
    if (q < best) {
      best = q
      at = (i + t) / (c.n - 1)
    }
  }
  const g = Math.exp(-best / (w * w))
  if (g < 0.002) return d
  const k = ends === 0 ? 1 : ends === 2 ? Math.min(1, (1 - at) * 4) : Math.min(1, at * 5, (1 - at) * 5)
  return d + depth * g * k
}
/** Mirrored: the curve's own side, and the other. */
const both = (d, x, y, c, depth, w, ends) => line(d, Math.abs(x), y, c, depth, w, ends)

/** The stone the face is cut from: a long egg, `taper` narrower towards the chin, flat behind. */
function egg(x, y, z, rx, ry, rz, taper) {
  const k = 1 + taper * (y / ry)
  return sdEllipsoid(x / k, y, z + 2, rx, ry, rz) * Math.min(1, k)
}
/** How far out the egg's face stands at (x, y). */
const faceZ = (x, y, rx, ry, rz, taper) => {
  const k = 1 + taper * (y / ry)
  return -2 + rz * Math.sqrt(Math.max(0.02, 1 - (x / (rx * k)) ** 2 - (y / ry) ** 2))
}
/**
 * An eye, cut as a statue's is: the socket sunk under the brow, its outer corner drooping; the ball
 * set well back in it; a heavy upper lid lying over the top of the ball and a thin lower one; the
 * iris a cut ring and the pupil drilled, where it looks.
 */
function eye(d, ax, y, z, e) {
  const c = Math.cos(e.droop)
  const s = Math.sin(e.droop)
  const u = (ax - e.x) * c - (y - e.y) * s // (along the eye, outwards)
  const v = (ax - e.x) * s + (y - e.y) * c // (up)
  d = smax(d, -sdEllipsoid(u, v, z - e.z, e.w, e.h, e.deep), 2.8)
  const bz = z - (e.z - e.set)
  const rr = Math.sqrt(u * u + v * v + bz * bz)
  let ball = rr - e.r
  if (bz > 0) {
    const iu = u - e.look[0]
    const iv = v - e.look[1]
    const ir = Math.sqrt(iu * iu + iv * iv)
    ball += 0.5 * Math.exp(-((ir - e.iris) ** 2) / 0.3) + 1.9 * Math.exp(-(ir * ir) / (e.pupil * e.pupil))
  }
  d = smin(d, ball, 1.0)
  // the lids: shells over the ball; the upper one comes down to `lid` above its middle (lower
  // towards the outer corner), the lower one up to `low` under it
  const upper = Math.max(rr - (e.r + 1.7), e.lid - v + 0.16 * u)
  const lower = Math.max(rr - (e.r + 1.1), v + e.low)
  d = smin(d, upper, 1.5)
  return smin(d, lower, 1.3)
}

// =================================================================================================
// the first: the mouth pulled wide and down, the lower lip and the chin pushed up into it
// =================================================================================================
const A = { rx: 47, ry: 75, rz: 41, taper: 0.13 }
const AZ = (x, y) => faceZ(x, y, A.rx, A.ry, A.rz, A.taper)
const A_EYE = { x: 22.5, y: 30, z: AZ(22.5, 30) + 1, w: 15, h: 9.2, deep: 12.5, droop: -0.32, r: 7.6, set: 11.2, look: [-0.5, -0.4], iris: 2.7, pupil: 1.1, lid: 1.2, low: 4.6 }
const A_L = {
  browKnot: curve([[3.6, 42], [4.1, 49], [3.3, 57]]),
  bag1: curve([[7, 22.5], [18, 16.5], [30, 16], [39.5, 22.5]]),
  bag2: curve([[11, 16], [21, 10.5], [32, 11], [40.5, 16.5]]),
  crow: curve([[40, 29], [43.5, 18], [44, 4], [41.5, -12]]),
  fold: curve([[8.5, 5], [18, -2], [29.5, -14], [34.5, -32], [31.5, -52], [24, -63]]),
  lip: curve([[0, -3.5], [12, -5.5], [22, -11.5], [28.5, -24], [29.5, -36]]),
  f1: curve([[0, 60], [12, 58.5], [25, 54], [37, 45.5]]),
  f2: curve([[0, 65.5], [13, 64], [26, 59.5], [36, 52]]),
  f3: curve([[0, 70.5], [12, 69], [23, 65], [31, 59]]),
  under: [-2, -1, 0, 1, 2].map((i) => curve([[i * 2.3, 0.5], [i * 3.6, -3.5], [i * 4.4, -7.5]], 6)),
  chin: curve([[0, -53.5], [10, -54], [18, -57.5], [22, -63]]),
}
function faceOne(x, y, z) {
  // (a face is never quite even: the whole of it a little askew)
  y += 0.035 * x
  const ax = Math.abs(x)
  let d = egg(x, y, z, A.rx, A.ry, A.rz, A.taper)
  // the cheekbones, and the hollows under them
  d = smin(d, sdEllipsoid(ax - 31, y - 9, z - (AZ(31, 9) - 7.5), 13, 9.5, 9), 9)
  d = smax(d, -sdEllipsoid(ax - 43, y + 22, z - (AZ(43, -22) + 6), 8, 23, 8), 10)
  // the brow: a heavy ridge, its inner end drawn up; the knot between the brows, two furrows in it
  d = smin(d, sdRoundCone(ax, y, z, 7, 52, AZ(7, 52) + 0.8, 41, 33.5, AZ(41, 33.5) - 1, 6.2, 3.6), 6)
  d = smin(d, sdEllipsoid(x, y - 48, z - (AZ(0, 48) - 0.5), 12, 8, 3.6), 8)
  // the eyes, and what grief does round them
  d = eye(d, ax, y, z, A_EYE)
  d = both(d, x, y, A_L.bag1, 1.6, 1.7)
  d = both(d, x, y, A_L.bag2, 1.1, 1.6)
  d = both(d, x, y, A_L.crow, 1.0, 1.5)
  // the nose: its bridge out of the brow, its ball, its wings; the nostrils open from below
  const zn = AZ(0, 22)
  d = smin(d, sdRoundCone(x, y, z, 0, 36, zn + 0.5, 0, 8, zn + 9.5, 3.2, 6), 7)
  d = smin(d, sdEllipsoid(x, y - 5.5, z - (zn + 10.5), 6.6, 6, 6.4), 3)
  d = smin(d, sdEllipsoid(ax - 7.6, y - 4.2, z - (zn + 5.5), 4.8, 4.6, 5.4), 2.6)
  d = smax(d, -sdEllipsoid(ax - 4.3, y - 0.9, z - (zn + 8), 2.9, 2.1, 5), 1.2)
  for (const c of A_L.under) d = line(d, x, y, c, 0.6, 1.1)
  // the mouth: cut wide and deep, its corners dragged down; the lower lip and the chin pushed up
  const zm = AZ(0, -24)
  d = both(d, x, y, A_L.lip, -2.1, 3.4, 0)
  d = smax(d, -sdEllipsoid(x, y + 23, z - (zm - 6), 26.5, 18.5, 38), 2.6)
  d = smax(d, -sdEllipsoid(ax - 22.5, y + 33, z - (zm - 8), 5.5, 9, 26), 4)
  d = smin(d, sdEllipsoid(x, y + 45.5, z - (zm - 10), 24.5, 9.5, 12), 6)
  d = smin(d, sdEllipsoid(x, y + 61, z - (AZ(0, -61) - 6), 20, 12.5, 11), 10)
  d = both(d, x, y, A_L.chin, 1.3, 1.8)
  // the folds from the nose round the mouth
  d = both(d, x, y, A_L.fold, 3.0, 2.9, 2)
  // the forehead's furrows, rising to the middle
  d = both(d, x, y, A_L.f1, 1.35, 1.5, 2)
  d = both(d, x, y, A_L.f2, 1.15, 1.4, 2)
  d = both(d, x, y, A_L.f3, 0.9, 1.3, 2)
  return smax(d, -(z + 15), 4)
}

// =================================================================================================
// the second: longer, the brows steeper, the eyes turned up, the jaw dropped as far as it goes
// =================================================================================================
const B = { rx: 46, ry: 82, rz: 41, taper: 0.06 }
const BZ = (x, y) => faceZ(x, y, B.rx, B.ry, B.rz, B.taper)
const B_EYE = { x: 22.5, y: 46, z: BZ(22.5, 46) + 1, w: 13.5, h: 8.2, deep: 12, droop: -0.36, r: 7, set: 10.6, look: [-1.0, 2.3], iris: 2.5, pupil: 1.05, lid: 3.6, low: 4.4 }
const B_L = {
  browKnot: curve([[3.4, 59], [3.9, 66], [3.1, 74]]),
  bag1: curve([[8, 39.5], [19, 33.5], [31, 33.5], [40, 39.5]]),
  bag2: curve([[12, 33], [22, 28], [33, 29], [41, 34]]),
  crow: curve([[40, 45], [43.5, 33], [44, 14], [42.5, -8]]),
  fold: curve([[8, 27], [20, 22], [30.5, 8], [34, -20], [33.5, -48], [29, -68]]),
  lip: curve([[0, 20], [14, 18.5], [25, 12], [29.5, -4], [30, -30], [28, -54], [18, -70.5], [0, -74.5]], 8),
  f1: curve([[0, 76.5], [12, 75], [24, 70], [35, 60.5]]),
  f2: curve([[0, 81], [11, 79.5], [21, 75.5], [29, 69]]),
  under: [-2, -1, 0, 1, 2].map((i) => curve([[i * 2.2, 26.5], [i * 3.4, 23.5], [i * 4.1, 20.5]], 6)),
}
function faceTwo(x, y, z) {
  y -= 0.03 * x
  const ax = Math.abs(x)
  let d = egg(x, y, z, B.rx, B.ry, B.rz, B.taper)
  d = smin(d, sdEllipsoid(ax - 32, y - 26, z - (BZ(32, 26) - 7.5), 12, 9, 9), 9)
  d = smax(d, -sdEllipsoid(ax - 43.5, y + 12, z - (BZ(43.5, -12) + 6), 7, 34, 8), 10)
  d = smin(d, sdRoundCone(ax, y, z, 6.5, 70, BZ(6.5, 70) + 0.8, 40.5, 48, BZ(40.5, 48) - 1, 6, 3.4), 6)
  d = smin(d, sdEllipsoid(x, y - 65, z - (BZ(0, 65) - 0.5), 11.5, 8, 3.6), 8)
  d = eye(d, ax, y, z, B_EYE)
  d = both(d, x, y, B_L.bag1, 1.6, 1.7)
  d = both(d, x, y, B_L.bag2, 1.0, 1.6)
  d = both(d, x, y, B_L.crow, 1.0, 1.5)
  // the nose, shorter, pulled up by the mouth under it
  const zn = BZ(0, 42)
  d = smin(d, sdRoundCone(x, y, z, 0, 53, zn, 0, 33, zn + 9, 3.1, 5.7), 7)
  d = smin(d, sdEllipsoid(x, y - 31, z - (zn + 10), 6.2, 5.6, 6), 3)
  d = smin(d, sdEllipsoid(ax - 7.2, y - 29.8, z - (zn + 5.2), 4.6, 4.3, 5.2), 2.6)
  d = smax(d, -sdEllipsoid(ax - 4.1, y - 26.6, z - (zn + 7.6), 2.8, 2, 5), 1.2)
  for (const c of B_L.under) d = line(d, x, y, c, 0.6, 1.1)
  // the mouth: a tall cut from under the nose to the chin, its top a little askew; a lip all round
  d = line(d, ax, y, B_L.lip, -2.1, 3.2, 0)
  const my = y + 27 - 0.07 * x
  d = smax(d, -Math.max(sdRoundRect2(x, my, 25.5, 44, 17), -(z + 9)), 2.6)
  d = both(d, x, y, B_L.fold, 2.8, 2.9, 2)
  d = both(d, x, y, B_L.f1, 1.3, 1.5, 2)
  d = both(d, x, y, B_L.f2, 1.1, 1.4, 2)
  return smax(d, -(z + 15), 4)
}

// (the stone's skin before anything is cut into it: the egg alone, its flat back apart)
const hullOne = (x, y, z) => egg(x, y + 0.035 * x, z, A.rx, A.ry, A.rz, A.taper)
const hullTwo = (x, y, z) => egg(x, y - 0.03 * x, z, B.rx, B.ry, B.rz, B.taper)

export const MASKS = {
  one: { hull: hullOne, sdf: faceOne, bounds: [-60, -80, -18, 60, 80, 60], h: 1.15, half: [53, 75, 15] },
  two: { hull: hullTwo, sdf: faceTwo, bounds: [-58, -86, -18, 58, 86, 60], h: 1.15, half: [49, 82, 15] },
}

/**
 * One face, meshed: { positions, normals, ao, cave, indices }. cave: how far each point is cut
 * into the stone (1: at its skin; towards 0: deep in the mouth, a nostril, a socket), which is
 * what makes a cut in white stone read as dark.
 */
export function maskMesh(meshSDF, which) {
  const m = MASKS[which]
  const r = meshSDF(m.sdf, m.bounds, m.h, { aoStep: 1.9, aoStrength: 0.9 })
  const n = r.positions.length / 3
  const cave = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    // (its back is cut flat, not cut into: nothing there counts as a cavity)
    const back = r.positions[i * 3 + 2] < -13.5 && r.normals[i * 3 + 2] < -0.5
    const deep = back ? 0 : -m.hull(r.positions[i * 3], r.positions[i * 3 + 1], r.positions[i * 3 + 2])
    const t = Math.min(1, Math.max(0, (deep - 3.5) / 17))
    cave[i] = 1 - t * t * (3 - 2 * t)
  }
  return { ...r, cave }
}
