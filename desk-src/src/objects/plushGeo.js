// Two plush toys, as distance fields (plain JS, no three.js: meshed in the worker by core/sdf.js).
// Each is a few sewn pieces, one mesh a fabric: soft, overstuffed forms blended where one piece of
// cloth runs on, apart where a seam joins two colours; a little uneven, as stuffing is, and sat
// flat on their bottoms. Its own frame: y up from what it sits on, +z its front, x across (mm).
import { smin, smax, sdEllipsoid, sdRoundCone } from './../core/sdf.js'

/** Stuffing is never even: a slow swell over the form (mm). */
const lump = (x, y, z, a) => a * Math.sin(x * 0.071 + 1.3) * Math.sin(y * 0.063 + 0.4) * Math.sin(z * 0.077 + 2.1)

// ---- the ghost: a body as round as a ball and wider than it is tall, two big pointed ears, a
// crest of short soft spikes between them and on down its back, stubby arms held forward, two fat
// feet, a stub of a tail
function ghostBody(x, y, z) {
  const ax = Math.abs(x)
  let d = sdEllipsoid(x, y - 64, z, 72, 64, 61)
  // ears: wide at the root, leaning out
  d = smin(d, sdRoundCone(ax, y, z, 34, 108, -2, 66, 158, -12, 19, 3.2), 11)
  // the crest: over the crown, then down the back
  d = smin(d, sdRoundCone(x, y, z, 0, 122, 4, 0, 147, -4, 12, 3), 8)
  d = smin(d, sdRoundCone(x, y, z, 0, 116, -30, 0, 138, -52, 12.5, 3), 8)
  d = smin(d, sdRoundCone(ax, y, z, 24, 112, -26, 38, 131, -46, 11, 3), 8)
  d = smin(d, sdRoundCone(x, y, z, 0, 88, -54, 0, 100, -84, 12.5, 3), 8)
  d = smin(d, sdRoundCone(ax, y, z, 30, 82, -48, 46, 91, -74, 11, 3), 8)
  d = smin(d, sdRoundCone(x, y, z, 0, 54, -60, 0, 60, -86, 11, 3), 8)
  // arms: short, forward and a little down, a rounded mitt at the end
  d = smin(d, sdRoundCone(ax, y, z, 58, 70, 26, 80, 60, 48, 15, 13), 9)
  // feet: fat pads out in front
  d = smin(d, sdRoundCone(ax, y, z, 32, 15, 22, 40, 13, 56, 18, 16), 10)
  // tail
  d = smin(d, sdRoundCone(x, y, z, 0, 20, -54, 0, 30, -80, 10, 3.4), 8)
  return smax(d + lump(x, y, z, 1.5), -y, 8)
}

// ---- the duck: a big wide head on a small round belly (no neck), its hands up at its temples,
// a stub of a tail (yellow); a broad flat bill, and two big webbed feet (cream)
function duckBody(x, y, z) {
  const ax = Math.abs(x)
  let d = sdEllipsoid(x, y - 112, z, 56, 47, 50)
  d = smin(d, sdEllipsoid(x, y - 46, z + 2, 45, 48, 42), 16)
  // arms: from the shoulders up to the sides of the head, the hands on it
  d = smin(d, sdRoundCone(ax, y, z, 40, 62, 8, 58, 108, 16, 12.5, 12), 6)
  // tail
  d = smin(d, sdRoundCone(x, y, z, 0, 26, -38, 0, 46, -60, 10, 4.2), 7)
  return smax(d + lump(x, y, z, 1.3), -y, 8)
}
function duckBill(x, y, z) {
  // (broad and flat like a spoon: wider at its tip than at its root, turned up a touch)
  const t = Math.max(0, Math.min(1, (z - 38) / 30))
  const lift = t * t * 4
  return sdEllipsoid(x, y - 96 - lift, z - 50, 30 + 8 * t, 10.5, 24) * 0.85
}
function duckFeet(x, y, z) {
  const ax = Math.abs(x)
  // (a wide webbed foot, toes out)
  return smax(sdEllipsoid(ax - 27, y - 5, z - 30, 22, 8.5, 29) * 0.9, -y, 4)
}

export const PLUSH = {
  ghost: {
    // (each piece: its field, its bounds, the mesher's step)
    parts: [{ name: 'body', sdf: ghostBody, bounds: [-100, -3, -96, 100, 166, 80], h: 3.3 }],
    // (where its embroidered face lies, seen from the front: x0, y0, width, height)
    face: [-62, 26, 124, 96],
    r: 80, // (about how far it reaches round its middle)
    top: 160,
    // (for its fall: its centre of mass, and spheres that stand for it)
    com: [0, 58, 0],
    spheres: [
      [0, 62, 0, 60],
      [50, 132, -6, 13],
      [-50, 132, -6, 13],
      [36, 15, 40, 15],
      [-36, 15, 40, 15],
      [72, 64, 40, 13],
      [-72, 64, 40, 13],
      [0, 26, -70, 9],
      [0, 96, -70, 9],
    ],
  },
  duck: {
    parts: [
      { name: 'body', sdf: duckBody, bounds: [-76, -3, -70, 76, 164, 62], h: 3 },
      { name: 'bill', sdf: duckBill, bounds: [-42, 80, 22, 42, 116, 80], h: 1.9 },
      { name: 'feet', sdf: duckFeet, bounds: [-54, -3, -4, 54, 18, 64], h: 1.9 },
    ],
    face: [-44, 98, 88, 44],
    r: 60,
    top: 160,
    com: [0, 62, 0],
    spheres: [
      [0, 112, 0, 47],
      [0, 46, 0, 42],
      [0, 96, 62, 12],
      [27, 9, 38, 9],
      [-27, 9, 38, 9],
      [58, 104, 16, 12],
      [-58, 104, 16, 12],
      [0, 40, -56, 8],
    ],
  },
}

/** The pieces of one toy, meshed: [{ name, positions, normals, ao, indices }]. */
export function plushMeshes(meshSDF, which) {
  return PLUSH[which].parts.map((p) => ({ name: p.name, ...meshSDF(p.sdf, p.bounds, p.h, { aoStep: 3, aoStrength: 0.8 }) }))
}
