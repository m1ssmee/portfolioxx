// The ashtray: hand-thrown stoneware, as a signed distance field (mm, y up, centred on the axis,
// standing on y = 0). A revolved profile with rounded edges, the bowl and the three rest notches
// cut with smooth subtraction (filleted, no seams), and low-frequency irregularity so it is not
// machine-perfect. Plain JS: it runs in the worker (meshing) and on the page (flake collisions).
import { smin, smax, clamp } from '../core/sdf.js'
import { noise3 } from '../core/noise.js'

export const TRAY = {
  radius: 57.5, // 115 mm across
  height: 32,
  floor: 9.2, // the bowl's floor (the base is thick)
  bowlTop: 46.3, // the bowl's radius at the rim
  bowlBottom: 33, // ... and at its floor
  notch: { r: 4.45, depth: 4.6, angles: [0.5, 0.5 + (2 * Math.PI) / 3 + 0.06, 0.5 + (4 * Math.PI) / 3 - 0.05] },
}

const dot2 = (x, y) => x * x + y * y
/** Isosceles trapezoid about the axis (iq): bottom half-width r1, top half-width r2, half height he. */
function sdTrapezoid(px, py, r1, r2, he) {
  const k1x = r2
  const k1y = he
  const k2x = r2 - r1
  const k2y = 2 * he
  px = Math.abs(px)
  const cax = px - Math.min(px, py < 0 ? r1 : r2)
  const cay = Math.abs(py) - he
  const t = clamp(((k1x - px) * k2x + (k1y - py) * k2y) / dot2(k2x, k2y), 0, 1)
  const cbx = px - k1x + k2x * t
  const cby = py - k1y + k2y * t
  const s = cbx < 0 && cay < 0 ? -1 : 1
  return s * Math.sqrt(Math.min(dot2(cax, cay), dot2(cbx, cby)))
}
function sdRoundBox2(px, py, hx, hy, r) {
  const qx = Math.abs(px) - hx + r
  const qy = Math.abs(py) - hy + r
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

/** Hand-made wobble: rim height and wall thickness vary slowly around the circumference. */
function wobbleExact(th) {
  return {
    rim: 0.55 * Math.sin(2 * th + 1.3) + 0.35 * Math.sin(3 * th + 0.4) + 0.18 * Math.sin(5 * th + 2.1),
    out: 0.42 * Math.sin(2 * th + 0.2) + 0.25 * Math.sin(4 * th + 1.7),
    inn: 0.5 * Math.sin(3 * th + 2.6) + 0.22 * Math.sin(5 * th + 0.9),
  }
}

// (tabulated: the field is sampled millions of times while meshing)
const WN = 1024
const WOB = new Float32Array((WN + 1) * 3)
for (let i = 0; i <= WN; i++) {
  const w = wobbleExact((i / WN) * 2 * Math.PI - Math.PI)
  WOB[i * 3] = w.rim
  WOB[i * 3 + 1] = w.out
  WOB[i * 3 + 2] = w.inn
}
const wq = { rim: 0, out: 0, inn: 0 }
function wobble(th) {
  const f = ((th + Math.PI) / (2 * Math.PI)) * WN
  const i = Math.min(WN - 1, Math.max(0, Math.floor(f)))
  const t = f - i
  wq.rim = WOB[i * 3] + (WOB[i * 3 + 3] - WOB[i * 3]) * t
  wq.out = WOB[i * 3 + 1] + (WOB[i * 3 + 4] - WOB[i * 3 + 1]) * t
  wq.inn = WOB[i * 3 + 2] + (WOB[i * 3 + 5] - WOB[i * 3 + 2]) * t
  return wq
}
const NOTCH_RIM = TRAY.notch.angles.map((a) => wobbleExact(a).rim)
const NOTCH_CS = TRAY.notch.angles.flatMap((a) => [Math.cos(a), Math.sin(a)])

export function ashtraySDF(x, y, z) {
  const T = TRAY
  const th = Math.atan2(z, x)
  const w = wobble(th)
  const wOut = w.out
  const wInn = w.inn
  const wRim = w.rim
  // a touch oval, and the clay's slow unevenness
  const r = Math.hypot(x * 1.006, z)
  const lift = wRim * clamp((y - 12) / 20, 0, 1) // the rim rises and falls a little
  const yy = y - lift
  // the outer body: a frustum, rounded 2.6 mm (a thick, soft lip and a rounded base edge)
  const R = 2.6
  let d = sdTrapezoid(r - wOut, yy - (3 + T.height) / 2, 47 - R, T.radius - R, (T.height - 3) / 2 - R) - R
  // the foot ring, raw clay, joined with a fillet
  d = smin(d, sdRoundBox2(r - 42.6, y - 2, 3.4, 2.1, 1.1), 1.6)
  // the bowl, subtracted: a frustum from the floor up, its floor corner rounded 7 mm, the inner
  // edge of the rim rounded by the smooth subtraction
  const Rb = 7
  const bowl = sdTrapezoid(r + wInn, yy - (T.floor + 48) / 2, T.bowlBottom - Rb, T.bowlTop + 3 - Rb + 0.35, (48 - T.floor) / 2 - Rb) - Rb
  d = smax(d, -bowl, 2.4)
  // the three rest notches: horizontal capsules across the rim, smoothly subtracted
  const N = T.notch
  const yn = T.height - N.depth + N.r
  if (y > yn - N.r - 3 && r > 36)
  for (let k = 0; k < 3; k++) {
    const ca = NOTCH_CS[k * 2]
    const sa = NOTCH_CS[k * 2 + 1]
    // the point in the notch's frame: along (radial), across (tangential), up
    const along = x * ca + z * sa
    const across = -x * sa + z * ca
    const t = clamp(along, 40, 62)
    // (the notch follows the rim's own height there)
    if (Math.abs(across) > N.r + 3) continue
    const dn = Math.hypot(along - t, across, y - (yn + NOTCH_RIM[k])) - N.r
    d = smax(d, -dn, 1.7)
  }
  // the surface's slow irregularity (well under a millimetre)
  d += 0.28 * noise3(x * 0.045, y * 0.06, z * 0.045) + 0.08 * noise3(x * 0.16 + 7, y * 0.16, z * 0.16)
  return d
}
export const ASHTRAY_BOUNDS = [-61, -0.6, -61, 61, 35.5, 61]

/**
 * Which glaze each vertex wears: interior (glossy, dark), exterior (matte, speckled) or the raw
 * clay of the foot; the glaze line wanders a little over the rim. Returns [interior, raw].
 */
export function glazeZone(x, y, z) {
  const T = TRAY
  const th = Math.atan2(z, x)
  const r = Math.hypot(x, z)
  // the inner glaze reaches over the inner edge of the rim, to an uneven line
  const line = T.bowlTop + 3.2 + 0.9 * Math.sin(5 * th + 1.1) + 0.5 * Math.sin(11 * th + 0.3)
  const interior = clamp((line - r) / 0.8, 0, 1) * clamp((y - 6) / 1, 0, 1)
  // raw clay: the foot ring and the underside
  const raw = clamp((4.2 - y) / 0.6, 0, 1) * clamp((r - 37) / 1.2, 0, 1) + clamp((3.6 - y) / 0.4, 0, 1) * clamp((38 - r) / 2, 0, 1)
  return [interior, Math.min(1, raw)]
}

/** The ashtray's mesh (in the worker): SDF meshed, plus the glaze zones per vertex. */
export function ashtrayMesh(meshSDF, h = 0.42) {
  const m = meshSDF(ashtraySDF, ASHTRAY_BOUNDS, h, { aoStep: 1.2, aoStrength: 0.7 })
  const n = m.positions.length / 3
  const zone = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) {
    const z = glazeZone(m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2])
    zone[i * 2] = z[0]
    zone[i * 2 + 1] = z[1]
  }
  m.zone = zone
  return m
}

/** The notch's resting line for a cigarette: centre of the notch's floor, and its outward direction. */
export function notchSeat(k) {
  const a = TRAY.notch.angles[k]
  const yn = TRAY.height - TRAY.notch.depth + TRAY.notch.r + wobbleExact(a).rim
  return { angle: a, dir: [Math.cos(a), 0, Math.sin(a)], y: yn - TRAY.notch.r, r: TRAY.notch.r }
}
