// Where everything stands on the desk (mm; y up; the ashtray at the origin). Places are given in
// the default view's own axes: u to the right of the picture, v towards the camera; the view looks
// along FWD. Plain JS (no three.js): the scene and the settling tool (tools/settle.mjs) share it.
export const FWD = [0.836, 0, -0.549]
export const RIGHT = [-FWD[2], 0, FWD[0]]
/** A point of the desk from view coordinates. */
export const deskAt = (u, v, y = 0) => [RIGHT[0] * u - FWD[0] * v, y, RIGHT[2] * u - FWD[2] * v]
const yawOf = (dx, dz) => Math.atan2(dx, dz) // (the rotation about y that turns +z towards (dx, dz))

/** The player: lying face up, its bottom edge (the AUX jack) towards the viewer, turned a little. */
const playerAt = deskAt(-262, -12)
export const PLAYER = {
  x: playerAt[0],
  z: playerAt[2],
  yaw: yawOf(-FWD[0], -FWD[2]) + 0.42,
  // (the device: 66.3 x 10.5 x 118.9; local y from 0 at its back to 10.5 at its face, its top
  // edge towards -z; the corners and side edges rounded)
  half: [33.15, 5.25, 59.45],
  r: 3,
}
export const DESK = {
  centre: deskAt(-120, 10), // (the whole-desk view's target)
  lighter: deskAt(-52, 116), // in the front pool of light
}
/** Rotate a local (x, z) offset by a yaw (about y), as three.js's makeRotationY does. */
export function yawXZ(yaw, x, z) {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return [c * x + s * z, -s * x + c * z]
}
