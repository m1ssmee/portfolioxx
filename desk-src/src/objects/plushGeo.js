// Two plush toys, as distance fields (plain JS, no three.js: meshed in the worker by core/sdf.js).
// Each is a few sewn pieces, one mesh a fabric: soft round forms blended where one piece of cloth
// runs on, apart where a seam joins two colours. Its own frame: y up from the desk, +z its front,
// x to its left hand side as seen from the front (mm). Stuffed toys sag: each sits a little flat.
import { smin, smax, sdEllipsoid, sdRoundCone } from './../core/sdf.js'

/** Mirrored in x: the same piece on both sides. */
const pair = (f) => (x, y, z) => f(Math.abs(x), y, z)

// ---- the ghost: a round purple body, two pointed ears, a crest of soft spikes over the head and
// down the back, stubby arms and feet, a stub of a tail
function ghostBody(x, y, z) {
  const ax = Math.abs(x)
  let d = sdEllipsoid(x, y - 52, z, 55, 51, 47)
  // ears
  d = smin(d, sdRoundCone(ax, y, z, 27, 86, -2, 47, 124, -8, 16, 2.6), 9)
  // the crest: over the head, then down the back, the side ones leaning out
  d = smin(d, sdRoundCone(x, y, z, 0, 96, -8, 0, 117, -18, 10.5, 2.4), 7)
  d = smin(d, sdRoundCone(x, y, z, 0, 86, -32, 0, 101, -57, 10.5, 2.4), 7)
  d = smin(d, sdRoundCone(ax, y, z, 21, 84, -27, 32, 98, -49, 9.5, 2.4), 7)
  d = smin(d, sdRoundCone(x, y, z, 0, 62, -42, 0, 68, -68, 10, 2.4), 7)
  d = smin(d, sdRoundCone(ax, y, z, 26, 58, -37, 39, 62, -59, 9, 2.4), 7)
  // arms, a little forward; feet, out in front
  d = smin(d, sdRoundCone(ax, y, z, 46, 54, 12, 70, 45, 20, 13.5, 9.5), 7)
  d = smin(d, sdRoundCone(ax, y, z, 25, 14, 14, 31, 10, 38, 15.5, 12.5), 8)
  // tail
  d = smin(d, sdRoundCone(x, y, z, 0, 18, -38, 0, 25, -60, 9, 3), 7)
  return smax(d, -y, 6)
}

// ---- the duck: a wide round head on a small pear of a body, its hands up at its head, a stub of
// a tail (yellow); a broad flat bill and two webbed feet (cream)
function duckBody(x, y, z) {
  const ax = Math.abs(x)
  let d = sdEllipsoid(x, y - 86, z, 41, 36, 38)
  d = smin(d, sdEllipsoid(x, y - 37, z + 2, 34, 39, 32), 12)
  // arms: from the shoulders up to the sides of the head
  d = smin(d, sdRoundCone(ax, y, z, 29, 50, 6, 43, 82, 12, 9.5, 8.5), 5)
  // tail
  d = smin(d, sdRoundCone(x, y, z, 0, 22, -28, 0, 37, -46, 8.5, 3.6), 6)
  return smax(d, -y, 6)
}
function duckBill(x, y, z) {
  // (broad and flat, a little narrower at its root, its tip turned up a touch)
  const lift = Math.max(0, z - 34) * 0.16
  return sdEllipsoid(x, y - 76 - lift, z - 36, 26, 8.5, 17) * 0.9
}
const duckFeet = pair((ax, y, z) => smax(sdEllipsoid(ax - 19, y - 4, z - 22, 15.5, 7, 21), -y, 3))

export const PLUSH = {
  ghost: {
    // (each piece: its field, its bounds, the mesher's step)
    parts: [{ name: 'body', sdf: ghostBody, bounds: [-86, -3, -76, 86, 132, 62], h: 2.6 }],
    // (where its embroidered face lies, seen from the front: x0, y0, width, height)
    face: [-50, 22, 100, 76],
    r: 62, // (about how far it reaches round its middle)
    top: 126,
  },
  duck: {
    parts: [
      { name: 'body', sdf: duckBody, bounds: [-58, -3, -54, 58, 128, 46], h: 2.4 },
      { name: 'bill', sdf: duckBill, bounds: [-30, 62, 14, 30, 94, 58], h: 1.5 },
      { name: 'feet', sdf: duckFeet, bounds: [-38, -3, -4, 38, 14, 48], h: 1.5 },
    ],
    face: [-34, 76, 68, 34],
    r: 46,
    top: 124,
  },
}

/** The pieces of one toy, meshed: [{ name, positions, normals, ao, indices }]. */
export function plushMeshes(meshSDF, which) {
  return PLUSH[which].parts.map((p) => ({ name: p.name, ...meshSDF(p.sdf, p.bounds, p.h, { aoStep: 2.2, aoStrength: 0.75 }) }))
}
