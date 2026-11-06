// The earphones' solid parts as signed distance functions, in centimetres.
//
// Earbud proportions are measured from product photos of the wired EarPods: a head about
// 18.5 mm wide, 16.5 mm tall and 16 mm deep; a 4.6 x 5.2 mm stem that leaves the back of the head
// and runs about 23 mm before stepping down to a 2.7 mm strain relief; a 1.8 mm cable.
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
export const HEAD = { rx: 0.925, ry: 0.83, rz: 0.8 }

// the speaker sits on a gently domed face that flattens the +x side of the head
const SPK_N = norm(1, -0.06, 0.18)
const SPK_D = 0.8 // face distance from the head centre
const SPK_DOME = 2.6 // radius of the face's dome
const SPK_C = SPK_N.map((c) => -c * (SPK_DOME - SPK_D))

// the stem leaves the back of the head, on the side away from the speaker
export const STEM = { x: -0.32, z: -0.5, top: -0.2, bottom: -3.08, r1: 0.285, r2: 0.26, squash: 0.877 }
// the strain relief the cable comes out of
export const COLLAR = { top: -3.18, bottom: -3.72, r1: 0.14, r2: 0.122 }
/** Where the cable leaves the earbud, and the direction it leaves in. */
export const CABLE_EXIT = { x: STEM.x, y: COLLAR.bottom - 0.02, z: STEM.z }

// openings: a stadium-shaped speaker grille on the speaker face...
export const GRILLE = {
  f: frame(SPK_N[0] * SPK_D, SPK_N[1] * SPK_D, SPK_N[2] * SPK_D, ...SPK_N, 0, 1, 0),
  hu: 0.265, // half width
  hv: 0.4, // half height
  r: 0.25,
  depth: 0.07,
  rim: 0.055,
}
// ...and a pill-shaped vent on the front face
function onHead(x, y) {
  // a point on the head's front, and the head's normal there
  const z = HEAD.rz * Math.sqrt(Math.max(0, 1 - (x / HEAD.rx) ** 2 - (y / HEAD.ry) ** 2))
  const n = norm(x / HEAD.rx ** 2, y / HEAD.ry ** 2, z / HEAD.rz ** 2)
  return { p: [x, y, z], n }
}
const pillAt = onHead(-0.41, 0.0)
export const PILL = {
  f: frame(...pillAt.p, ...pillAt.n, 0, 1, 0),
  hu: 0.2175,
  hv: 0.095,
  r: 0.095,
  depth: 0.07,
  rim: 0.045,
}
/** Where the "L" / "R" is printed, and the surface normal there. */
export const LETTER = onHead(0.48, 0.0)

function pocket(f, hu, hv, r, depth, x, y, z) {
  const [u, v, w] = toFrame(f, x, y, z)
  // the solid to carve away: inside the outline, from the floor outwards (soft inner corners)
  return smax(sdRoundRect2(u, v, hu, hv, r), -(w + depth), 0.03)
}

export function earbud(x, y, z) {
  // head, with the speaker side flattened into a domed face (a soft crease where they meet)
  let d = sdEllipsoid(x, y, z, HEAD.rx, HEAD.ry, HEAD.rz)
  const face = len3(x - SPK_C[0], y - SPK_C[1], z - SPK_C[2]) - SPK_DOME
  d = smax(d, face, 0.11)

  // stem: slightly oval, a little thicker where it leaves the head, blended in with a long fillet
  const sx = (x - STEM.x) / STEM.squash
  const stem = sdRoundCone(sx, y, z - STEM.z, 0, STEM.top, 0, 0, STEM.bottom, 0, STEM.r1, STEM.r2) * STEM.squash
  d = smin(d, stem, 0.4)

  // strain relief: a short narrower sleeve with a small shoulder
  const collar = sdRoundCone(x - STEM.x, y, z - STEM.z, 0, COLLAR.top, 0, 0, COLLAR.bottom, 0, COLLAR.r1, COLLAR.r2)
  d = smin(d, collar, 0.05)

  // openings
  // openings, with a soft rounded lip
  d = smax(d, -pocket(GRILLE.f, GRILLE.hu, GRILLE.hv, GRILLE.r, GRILLE.depth, x, y, z), GRILLE.rim)
  d = smax(d, -pocket(PILL.f, PILL.hu, PILL.hv, PILL.r, PILL.depth, x, y, z), PILL.rim)
  return d
}

export const EARBUD_BOUNDS = [-1.05, -3.85, -0.95, 1.05, 0.95, 0.95]

// ---------------------------------------------------------------- inline remote
// In its own frame: the remote runs along y (top +y), its buttons face +z.
// The cable attaches at the tips of the two strain reliefs, `len` apart.
export const REMOTE = {
  len: 3.6, // tip of one strain relief to the other
  body: 1.5, // half length of the body
  hw: 0.37, // half width
  ht: 0.27, // half thickness
  edge: 0.22,
  button: { hu: 0.27, hv: 0.55, r: 0.13, depth: 0.028 },
  plus: 1.0, // y of the + and - prints
  mic: { y: 0.98, r: 0.032 },
}

export function remote(x, y, z) {
  const R = REMOTE
  let d = sdRoundBox(x, y, z, R.hw, R.body, R.ht, R.edge)
  const tip = R.len / 2
  const top = sdRoundCone(x, y, z, 0, R.body - 0.1, 0, 0, tip - 0.11, 0, 0.145, 0.118)
  const bottom = sdRoundCone(x, y, z, 0, -R.body + 0.1, 0, 0, -tip + 0.11, 0, 0.145, 0.118)
  d = smin(d, Math.min(top, bottom), 0.07)
  // the centre button: a shallow, soft-edged recess across the front
  const b = R.button
  const recess = smax(sdRoundRect2(x, y, b.hu, b.hv, b.r), -(z - (R.ht - b.depth)), 0.02)
  d = smax(d, -recess, 0.025)
  // microphone opening on the back, near the top
  const mic = Math.max(len2(x, y - R.mic.y) - R.mic.r, z + R.ht - 0.08)
  d = smax(d, -mic, 0.012)
  return d
}
export const REMOTE_BOUNDS = [-0.45, -1.85, -0.35, 0.45, 1.85, 0.35]

// ---------------------------------------------------------------- splitter
// Origin at the top, where both earbud cables go in; the main cable leaves at -len.
export const SPLITTER = { len: 1.0 }

export function splitter(x, y, z) {
  let d = sdRoundCone(x, y, z, 0, -0.2, 0, 0, -0.6, 0, 0.19, 0.215)
  const relief = sdRoundCone(x, y, z, 0, -0.62, 0, 0, -0.97, 0, 0.13, 0.112)
  d = smin(d, relief, 0.07)
  // two cable entries side by side on top
  const e1 = sdRoundCone(x, y, z, -0.075, -0.2, 0, -0.095, -0.02, 0, 0.115, 0.1)
  const e2 = sdRoundCone(x, y, z, 0.075, -0.2, 0, 0.095, -0.02, 0, 0.115, 0.1)
  return smin(d, Math.min(e1, e2), 0.06)
}
export const SPLITTER_BOUNDS = [-0.3, -1.1, -0.3, 0.3, 0.1, 0.3]

// ---------------------------------------------------------------- 3.5 mm plug
// Origin at the top, where the cable goes in; the plug points down -y, `len` long in all:
// strain relief, white housing, then the metal pin (made separately, see parts.js).
export const PLUG = { len: 4.15, housingTop: -0.8, housingBottom: -2.7, r: 0.3 }

function sdRoundedCylinder(x, y, z, r, halfH, edge) {
  const dx = len2(x, z) - r + edge
  const dy = Math.abs(y) - halfH + edge
  return Math.min(Math.max(dx, dy), 0) + len2(Math.max(dx, 0), Math.max(dy, 0)) - edge
}

export function plugHousing(x, y, z) {
  const P = PLUG
  const mid = (P.housingTop + P.housingBottom) / 2
  const half = (P.housingTop - P.housingBottom) / 2
  let d = sdRoundedCylinder(x, y - mid, z, P.r, half, 0.09)
  // strain relief: a sleeve tapering from the housing up to the cable
  const relief = sdRoundCone(x, y, z, 0, -0.04, 0, 0, P.housingTop - 0.15, 0, 0.118, 0.175)
  d = smin(d, relief, 0.14)
  // a small collar where the metal pin comes out
  const collar = sdRoundedCylinder(x, y - (P.housingBottom - 0.04), z, 0.215, 0.06, 0.03)
  return smin(d, collar, 0.03)
}
export const PLUG_BOUNDS = [-0.36, -2.9, -0.36, 0.36, 0.1, 0.36]
