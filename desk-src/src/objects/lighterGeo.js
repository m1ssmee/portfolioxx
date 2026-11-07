// The lighter (an original design): a compact rounded slab, 62 x 24 x 12 mm, every edge filleted;
// on top a short oval chimney in brushed steel with a row of small perforations round a recessed
// burner nozzle; a flush pill-shaped push button on one side near the top (a separate part: it
// moves); a faint parting line round the body; a tiny screw in the base. Plain JS (worker).
// Frame: y up (chimney at +y), x across its width (button at +x), z its thickness; mm, centred.
import { smax, smin, clamp } from '../core/sdf.js'

export const LIGHTER = {
  w: 24,
  h: 62,
  d: 12,
  bodyTop: 22.5, // the body's top; the chimney stands on it
  button: { y: 13, len: 9, w: 3.4, x: 12 }, // (on the +x side)
  flameY: 30.5, // where the flame stands, above the nozzle
}
// the chimney: an oval wall standing on the body, its top lip rounded, a row of small holes round it
// (its own light mesh, objects/lighter.js; the holes are cut in its shader)
export const CHIMNEY = { a: 11.2, b: 5.5, wall: 0.55, grow: 0.12, y0: LIGHTER.bodyTop - 0.6, y1: LIGHTER.h / 2, holeY: 27.2, holeR: 0.8, holes: 18 }

function sdRoundBox(px, py, pz, bx, by, bz, r) {
  const qx = Math.abs(px) - bx + r
  const qy = Math.abs(py) - by + r
  const qz = Math.abs(pz) - bz + r
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r
}
// an ellipse's distance, approximately (scaled circle, good for the near-round chimney)
function sdEllipse(x, z, a, b) {
  const k = Math.hypot(x / a, z / b)
  return ((k - 1) * Math.min(a, b)) / Math.max(1, 0.25 + 0.75 * k)
}

export function lighterSDF(x, y, z) {
  const L = LIGHTER
  // the body: from the base to bodyTop, its long edges rounded 4.6 mm, the top and base a little less
  const bh = (L.bodyTop + L.h / 2) / 2
  const by = y - (L.bodyTop - bh)
  let d = sdRoundBox(x, by, z, L.w / 2, bh, L.d / 2, 4.6)
  // the button's recess (the button is its own part, in it)
  const B = L.button
  const rx = x - B.x
  const ry = y - B.y
  const pill = Math.hypot(Math.max(Math.abs(ry) - (B.len - B.w) / 2, 0), z) - B.w / 2
  const recess = Math.max(pill + 0.15, -rx - 0.9)
  d = smax(d, -recess, 0.25)
  // the screw in the base: its slot cut 0.25 mm in (its head's ring is drawn by the shader)
  const sr = Math.hypot(x, z)
  if (y < -L.h / 2 + 1.2 && sr < 2) {
    const slot = Math.max(Math.max(Math.abs(x) - 0.22, sr - 1.0), y - (-L.h / 2 + 0.25))
    d = smax(d, -slot, 0.06)
  }
  // (the chimney is its own mesh: CHIMNEY)
  const cy0 = L.bodyTop - 0.6
  // the burner nozzle, recessed inside the chimney: a short post with a hole in its top
  const nr = Math.hypot(x, z)
  const post = Math.max(nr - 1.9, Math.max(cy0 - 0.5 - y, y - (L.bodyTop + 4.2)))
  const bore = Math.max(nr - 0.7, L.bodyTop + 3.2 - y)
  d = Math.min(d, Math.max(post, -bore))
  return d
}
export const LIGHTER_BOUNDS = [-13, -32, -7, 13, 27.5, 7]

/** Which finish each vertex wears: [steel (chimney, nozzle, screw), parting-line darkening]. */
export function lighterZone(x, y, z) {
  const L = LIGHTER
  const steel = y > L.bodyTop + 0.05 ? 1 : 0
  const screw = y < -L.h / 2 + 0.6 && Math.hypot(x, z) < 1.4 ? 1 : 0
  return [Math.max(steel, screw), 0]
}

/** The lighter's mesh (in the worker): SDF meshed, plus its finish zones per vertex. */
export function lighterMesh(meshSDF, h = 0.22) {
  const m = meshSDF(lighterSDF, LIGHTER_BOUNDS, h, { aoStep: 0.6, aoStrength: 0.5 })
  const n = m.positions.length / 3
  const zone = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) {
    const z = lighterZone(m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2])
    zone[i * 2] = z[0]
    zone[i * 2 + 1] = z[1]
  }
  m.zone = zone
  return m
}
