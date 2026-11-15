// Two plush toys, as distance fields (plain JS, no three.js: meshed in the worker by core/sdf.js).
// Each is a few sewn pieces, one mesh a fabric: soft, overstuffed forms blended where one piece of
// cloth runs on, apart where a seam joins two colours; a little uneven, as stuffing is, and sat
// flat on their bottoms. Its own frame: y up from what it sits on, +z its front, x across (mm).
import { smin, smax, sdEllipsoid, sdRoundCone } from './../core/sdf.js'

/** Stuffing is never even: a slow swell over the form (mm). */
const lump = (x, y, z, a) => a * Math.sin(x * 0.071 + 1.3) * Math.sin(y * 0.063 + 0.4) * Math.sin(z * 0.077 + 2.1)

// ---- the ghost: standing on two short thick legs, its body an egg taller than it is wide, big
// flat-sided ears out at the top corners, a crest of three spikes on its crown, three rows of small
// leaf-shaped spikes down its back, short arms held out to the sides, a stub of a tail
const GB = { y: 92, rx: 68, ry: 74, rz: 58 } // (its body: the middle's height, its radii)
/** A point on the body's back at (x, y): how far back the surface is there. */
const backZ = (x, y) => -GB.rz * Math.sqrt(Math.max(0.02, 1 - (x / GB.rx) ** 2 - ((y - GB.y) / GB.ry) ** 2))
// (the back's spikes: [x, y] of each root, in three columns, the outer ones fewer and lower)
const BACK_SPIKES = [
  [0, 140],
  [0, 116],
  [0, 92],
  [0, 68],
  [33, 130],
  [35, 106],
  [34, 82],
  [-33, 130],
  [-35, 106],
  [-34, 82],
].map(([x, y]) => [x, y, backZ(x, y)])
function ghostBody(x, y, z) {
  const ax = Math.abs(x)
  let d = sdEllipsoid(x, y - GB.y, z, GB.rx, GB.ry, GB.rz)
  // legs: short and thick, the feet a little forward
  d = smin(d, sdRoundCone(ax, y, z, 31, 44, 0, 34, 16, 6, 25, 23), 12)
  // arms: out to the sides and a little down, a rounded mitt at the end
  d = smin(d, sdRoundCone(ax, y, z, 60, 98, 4, 100, 74, 10, 19, 14), 10)
  // ears: wide at the root, pointing up and out
  d = smin(d, sdRoundCone(ax, y, z, 44, 138, -4, 88, 190, -10, 23, 3.4), 12)
  // the crest on its crown: the middle one tallest
  d = smin(d, sdRoundCone(x, y, z, 0, 158, 2, 0, 200, -4, 14, 3), 8)
  d = smin(d, sdRoundCone(ax, y, z, 22, 154, 0, 32, 188, -6, 12.5, 3), 8)
  // the back's spikes: small, leaning down
  if (z < 10)
    for (const [sx, sy, sz] of BACK_SPIKES) {
      const dd = sdRoundCone(x, y, z, sx, sy, sz + 5, sx * 1.12, sy - 13, sz - 21, 8.5, 2.4)
      d = smin(d, dd, 5)
    }
  // tail
  d = smin(d, sdRoundCone(x, y, z, 0, 46, -50, 0, 38, -76, 11, 4), 8)
  return smax(d + lump(x, y, z, 1.4), -y, 6)
}

// ---- the duck: head and body one tall soft shape, widest at the head and again at its seat, no
// neck; thick arms up, its hands at the sides of its head; a stub of a tail (yellow). A long broad
// bill hanging down its front from between its eyes, and two small webbed feet under it (cream)
function duckBody(x, y, z) {
  const ax = Math.abs(x)
  let d = sdEllipsoid(x, y - 122, z, 68, 50, 58)
  d = smin(d, sdEllipsoid(x, y - 80, z, 58, 66, 52), 22)
  d = smin(d, sdEllipsoid(x, y - 42, z, 64, 44, 57), 22)
  // arms: from low on the sides up to the head, thick all the way
  d = smin(d, sdRoundCone(ax, y, z, 60, 70, 6, 76, 128, 12, 17, 16), 7)
  // tail
  d = smin(d, sdRoundCone(x, y, z, 0, 30, -50, 0, 50, -72, 11, 4.4), 8)
  return smax(d + lump(x, y, z, 1.3), -y, 8)
}
function duckBill(x, y, z) {
  // (a shield: a narrow rounded top between the eyes, a wide heavy lower part, proud of the body)
  let d = sdEllipsoid(x, y - 74, z - 50, 46, 34, 30)
  d = smin(d, sdEllipsoid(x, y - 104, z - 50, 27, 20, 23), 16)
  return d * 0.9
}
function duckFeet(x, y, z) {
  const ax = Math.abs(x)
  return smax(sdEllipsoid(ax - 26, y - 5, z - 42, 21, 8, 24) * 0.9, -y, 4)
}

export const PLUSH = {
  ghost: {
    // (each piece: its field, its bounds, the mesher's step)
    parts: [{ name: 'body', sdf: ghostBody, bounds: [-122, -3, -92, 122, 208, 76], h: 3.3 }],
    // (where its embroidered face lies, seen from the front: x0, y0, width, height)
    face: [-64, 44, 128, 96],
    r: 82, // (about how far it reaches round its middle)
    top: 196,
    // (for its fall: its centre of mass, and spheres that stand for it)
    com: [0, 84, 0],
    spheres: [
      [0, 94, 0, 62],
      [33, 24, 4, 23],
      [-33, 24, 4, 23],
      [96, 78, 10, 14],
      [-96, 78, 10, 14],
      [74, 172, -8, 11],
      [-74, 172, -8, 11],
      [0, 186, -2, 9],
      [0, 40, -70, 8],
    ],
  },
  duck: {
    parts: [
      { name: 'body', sdf: duckBody, bounds: [-98, -3, -80, 98, 178, 66], h: 3.2 },
      { name: 'bill', sdf: duckBill, bounds: [-52, 34, 12, 52, 130, 86], h: 2.4 },
      { name: 'feet', sdf: duckFeet, bounds: [-52, -3, 12, 52, 18, 70], h: 1.9 },
    ],
    face: [-60, 98, 120, 52],
    // (on its bill: the two nostrils)
    billFace: [-22, 100, 44, 14],
    r: 72,
    top: 172,
    com: [0, 78, 0],
    spheres: [
      [0, 120, 0, 58],
      [0, 50, 0, 56],
      [0, 76, 62, 20],
      [26, 9, 48, 9],
      [-26, 9, 48, 9],
      [76, 124, 12, 15],
      [-76, 124, 12, 15],
      [0, 44, -66, 8],
    ],
  },
}

/** The pieces of one toy, meshed: [{ name, positions, normals, ao, indices }]. */
export function plushMeshes(meshSDF, which) {
  return PLUSH[which].parts.map((p) => ({ name: p.name, ...meshSDF(p.sdf, p.bounds, p.h, { aoStep: 3, aoStrength: 0.8 }) }))
}
