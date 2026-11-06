// The earphones' solid parts as signed distance functions, in centimetres.
//
// Proportions are measured from product photos of the wired EarPods: a head about 18.5 mm wide,
// 16.5 mm tall and 16 mm deep; a 4.6 x 5.2 mm stem leaving the back of the head and running about
// 23 mm to a 2.7 mm strain relief; a 1.8 mm cable.
//
// The earbud is modelled once, as the LEFT one, in this frame:
//   origin at the centre of the head, y up (the stem hangs down -y),
//   +x towards the speaker (the side that sits in the ear),
//   +z towards the front (the side with the pill-shaped vent and the printed letter).
// The right earbud is its mirror image in x.
import { frame, len2, len3, sdEllipsoid, sdRoundBox, sdRoundCone, sdRoundRect2, smax, smin, toFrame } from './sdf.js'

const norm = (x, y, z) => {
  const l = len3(x, y, z)
  return [x / l, y / l, z / l]
}

// ---------------------------------------------------------------- earbud

// the head is not an ellipsoid: a main volume and a heavier lower-front lobe, blended, give it the
// slightly pear-like, asymmetric body of the real housing
export const HEAD_A = { c: [0, 0.05, 0.0], r: [0.9, 0.79, 0.78] }
export const HEAD_B = { c: [0.1, -0.2, 0.1], r: [0.74, 0.62, 0.66] }

// the speaker sits on a broad, gently domed face on the +x side, tilted forward and a little down,
// meeting the shell with a soft rounded edge
const SPK_N = norm(1, -0.14, 0.24)
const SPK_D = 0.7
const SPK_DOME = 2.6
const SPK_C = SPK_N.map((c) => -c * (SPK_DOME - SPK_D))

// the stem leaves the back of the head, on the side away from the speaker
export const STEM = { x: -0.32, z: -0.5, top: -0.3, bottom: -3.08, r1: 0.285, r2: 0.255, squash: 0.877 }
// the strain relief the cable leaves from
export const COLLAR = { top: -3.18, bottom: -3.72, r1: 0.14, r2: 0.122, groove: -3.32 }
export const CABLE_EXIT = { x: STEM.x, y: COLLAR.bottom - 0.02, z: STEM.z }

// openings: each is a real recess, deep enough for a speaker mesh with a black chamber behind it
// the speaker grille is an oval, a little taller than it is wide, leaning forward at the top
export const GRILLE = {
  f: frame(SPK_N[0] * SPK_D, SPK_N[1] * SPK_D - 0.03, SPK_N[2] * SPK_D, ...SPK_N, -0.12, 1, 0.1),
  ellipse: true,
  hu: 0.275,
  hv: 0.42,
  r: 0.275,
  depth: 0.11,
  rim: 0.06,
}
function onHead(x, y) {
  // a point on the front of the main volume, and its normal there
  const [cx, cy, cz] = HEAD_A.c
  const [rx, ry, rz] = HEAD_A.r
  const z = cz + rz * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2))
  const n = norm((x - cx) / rx ** 2, (y - cy) / ry ** 2, (z - cz) / rz ** 2)
  return { p: [x, y, z], n }
}
const pillAt = onHead(-0.41, 0.02)
export const PILL = { f: frame(...pillAt.p, ...pillAt.n, 0, 1, 0), hu: 0.22, hv: 0.096, r: 0.096, depth: 0.1, rim: 0.045 }
// a small black port on the back of the stem, just under the head
export const PORT = {
  f: frame(STEM.x, -1.02, STEM.z - 0.272, 0, 0, -1, 0, 1, 0),
  hu: 0.05,
  hv: 0.095,
  r: 0.045,
  depth: 0.08,
  rim: 0.02,
}
/** Where the "L" / "R" is printed, and the surface normal there. */
export const LETTER = onHead(0.47, 0.02)

/** An ellipse's distance (a close bound), semi-axes a and b. */
function sdEllipse2(x, y, a, b) {
  const k0 = len2(x / a, y / b)
  const k1 = len2(x / (a * a), y / (b * b))
  return k1 > 0 ? (k0 * (k0 - 1)) / k1 : -Math.min(a, b)
}

function pocket(o, x, y, z) {
  const [u, v, w] = toFrame(o.f, x, y, z)
  // the solid to carve away: inside the outline, from the floor outwards, soft inner corners
  const outline = o.ellipse ? sdEllipse2(u, v, o.hu, o.hv) : sdRoundRect2(u, v, o.hu, o.hv, o.r)
  return smax(outline, -(w + o.depth), 0.03)
}

export function earbud(x, y, z) {
  // shell: two blended volumes, then the speaker facet cut in with a soft edge
  let d = smin(
    sdEllipsoid(x - HEAD_A.c[0], y - HEAD_A.c[1], z - HEAD_A.c[2], ...HEAD_A.r),
    sdEllipsoid(x - HEAD_B.c[0], y - HEAD_B.c[1], z - HEAD_B.c[2], ...HEAD_B.r),
    0.32,
  )
  const face = len3(x - SPK_C[0], y - SPK_C[1], z - SPK_C[2]) - SPK_DOME
  d = smax(d, face, 0.16)

  // stem: slightly oval and tapering, grown out of the back of the head with a long fillet
  const sx = (x - STEM.x) / STEM.squash
  const stem = sdRoundCone(sx, y, z - STEM.z, 0, STEM.top, 0, 0, STEM.bottom, 0, STEM.r1, STEM.r2) * STEM.squash
  d = smin(d, stem, 0.5)

  // strain relief: a narrower sleeve with a soft shoulder and one fine groove
  let collar = sdRoundCone(x - STEM.x, y, z - STEM.z, 0, COLLAR.top, 0, 0, COLLAR.bottom, 0, COLLAR.r1, COLLAR.r2)
  const groove = len2(len2(x - STEM.x, z - STEM.z) - COLLAR.r1, y - COLLAR.groove) - 0.012
  collar = smax(collar, -groove, 0.01)
  d = smin(d, collar, 0.05)

  // openings, each with a soft rounded lip
  d = smax(d, -pocket(GRILLE, x, y, z), GRILLE.rim)
  d = smax(d, -pocket(PILL, x, y, z), PILL.rim)
  d = smax(d, -pocket(PORT, x, y, z), PORT.rim)
  return d
}
export const EARBUD_BOUNDS = [-1.0, -3.95, -0.95, 0.95, 0.92, 0.92]

// ---------------------------------------------------------------- inline remote
// In its own frame: along y (top +y), buttons facing +z. The cable attaches at the tips of the two
// strain reliefs, `len` apart. The front has a recessed bay holding three separate button caps:
// volume up, the centre button, volume down.
export const REMOTE = {
  len: 3.7,
  body: 1.6, // half length
  hw: 0.38, // half width
  ht: 0.28, // half thickness
  edge: 0.15,
  bay: { hu: 0.245, hv: 1.3, r: 0.2, depth: 0.06 },
  gap: 0.035, // seam between caps
  caps: { plus: [0.47, 1.265], centre: [-0.43, 0.43], minus: [-1.265, -0.47] },
  plus: 0.86, // y of the + and - prints
  mic: { y: 1.12, r: 0.042 },
}

export function remote(x, y, z) {
  const R = REMOTE
  let d = sdRoundBox(x, y, z, R.hw, R.body, R.ht, R.edge)
  const tip = R.len / 2
  const top = sdRoundCone(x, y, z, 0, R.body - 0.12, 0, 0, tip - 0.12, 0, 0.15, 0.118)
  const bottom = sdRoundCone(x, y, z, 0, -R.body + 0.12, 0, 0, -tip + 0.12, 0, 0.15, 0.118)
  d = smin(d, Math.min(top, bottom), 0.08)
  // the bay the buttons sit in
  const b = R.bay
  const bay = smax(sdRoundRect2(x, y, b.hu, b.hv, b.r), -(z - (R.ht - b.depth)), 0.02)
  d = smax(d, -bay, 0.03)
  // microphone opening on the back, near the top
  const mic = Math.max(len2(x, y - R.mic.y) - R.mic.r, z + R.ht - 0.1)
  return smax(d, -mic, 0.012)
}
export const REMOTE_BOUNDS = [-0.46, -1.95, -0.36, 0.46, 1.95, 0.36]

/** One button cap, between y0 and y1: the volume caps gently crowned, the centre one lower and dished. */
export function remoteCap(y0, y1, sunk) {
  const R = REMOTE
  const hu = R.bay.hu - R.gap
  const cy = (y0 + y1) / 2
  const hv = (y1 - y0) / 2
  const floor = R.ht - R.bay.depth
  const top = sunk ? R.ht - 0.016 : R.ht + 0.004
  const rr = Math.min(R.bay.r - R.gap, hv)
  return (x, y, z) => {
    // rounded in plan like the bay
    const plan = sdRoundRect2(x, y - cy, hu, hv, rr)
    const u = x / hu
    const v = (y - cy) / hv
    // the top face: a crown across the width, or a shallow dish
    const surf = sunk ? top - 0.012 * Math.max(0, 1 - u * u - v * v) : top + 0.01 * Math.max(0, 1 - u * u)
    const slab = Math.max(floor - 0.02 - z, z - surf)
    // softly rounded top edges
    return smax(plan, slab, 0.035)
  }
}
export const CAP_BOUNDS = (y0, y1) => [-0.32, y0 - 0.05, 0.15, 0.32, y1 + 0.05, 0.34]

// ---------------------------------------------------------------- splitter
// Origin at the top, where both earbud cables go in; the main cable leaves at -len.
export const SPLITTER = { len: 1.05 }

export function splitter(x, y, z) {
  // a short rounded body
  let d = sdRoundCone(x, y, z, 0, -0.24, 0, 0, -0.66, 0, 0.2, 0.215)
  // two sleeves on top, leaning apart, one for each earbud's cable
  const e1 = sdRoundCone(x, y, z, -0.06, -0.26, 0, -0.12, -0.02, 0, 0.13, 0.102)
  const e2 = sdRoundCone(x, y, z, 0.06, -0.26, 0, 0.12, -0.02, 0, 0.13, 0.102)
  d = smin(d, Math.min(e1, e2), 0.08)
  // the main cable's strain relief underneath
  const relief = sdRoundCone(x, y, z, 0, -0.66, 0, 0, -1.02, 0, 0.135, 0.112)
  return smin(d, relief, 0.07)
}
export const SPLITTER_BOUNDS = [-0.3, -1.22, -0.28, 0.3, 0.14, 0.28]

// ---------------------------------------------------------------- 3.5 mm plug
// Origin at the top, where the cable goes in; the plug points down -y: strain relief, white
// housing, a collar, then the metal pin (turned separately, see parts.js).
// tip: where the pin ends (its sections are turned in parts.js and add up to this)
export const PLUG = { housingTop: -0.82, housingBottom: -2.66, r: 0.3, pinTop: -2.72, tip: -4.088 }

function sdRoundedCylinder(x, y, z, r, halfH, edge) {
  const dx = len2(x, z) - r + edge
  const dy = Math.abs(y) - halfH + edge
  return Math.min(Math.max(dx, dy), 0) + len2(Math.max(dx, 0), Math.max(dy, 0)) - edge
}

export function plugHousing(x, y, z) {
  const P = PLUG
  const mid = (P.housingTop + P.housingBottom) / 2
  const half = (P.housingTop - P.housingBottom) / 2
  // the housing, its top edge much softer than the bottom one
  const soft = sdRoundedCylinder(x, y - mid, z, P.r, half, 0.13)
  const crisp = sdRoundedCylinder(x, y - mid, z, P.r, half, 0.05)
  let d = y > mid ? soft : crisp
  // strain relief: a sleeve tapering from the housing up to the cable
  const relief = sdRoundCone(x, y, z, 0, -0.04, 0, 0, P.housingTop - 0.1, 0, 0.118, 0.18)
  d = smin(d, relief, 0.16)
  // a short collar the metal pin comes out of
  const collar = sdRoundedCylinder(x, y - (P.housingBottom - 0.035), z, 0.212, 0.05, 0.025)
  return smin(d, collar, 0.025)
}
export const PLUG_BOUNDS = [-0.36, -2.8, -0.36, 0.36, 0.1, 0.36]
