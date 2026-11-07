// Where everything lies (mm; y up; the ashtray at the origin): a flat-lay seen from nearly above.
// Places are given in the view's own axes: u to the right of the picture, v down it (towards the
// viewer); the view looks along FWD. Plain JS (no three.js): the scene and the settling tool
// (tools/settle.mjs) share it.
//   the player   the hero, upright in the middle, its jack at the bottom edge
//   the earbuds  plugged in, the cable in a few open curves round the player's lower left, the buds
//                above it, at the left
//   the ashtray  (with its cigarette) and the lighter below it: off to the right, out of its way
export const FWD = [0.836, 0, -0.549]
export const RIGHT = [-FWD[2], 0, FWD[0]]
/** A point on the ground from view coordinates. */
export const deskAt = (u, v, y = 0) => [RIGHT[0] * u - FWD[0] * v, y, RIGHT[2] * u - FWD[2] * v]
const yawOf = (dx, dz) => Math.atan2(dx, dz) // (the rotation about y that turns +z towards (dx, dz))

/** The player: face up, upright in the picture (its screen at the top, its jack at the bottom). */
const playerAt = deskAt(-135, 20)
export const PLAYER = {
  x: playerAt[0],
  z: playerAt[2],
  yaw: yawOf(-FWD[0], -FWD[2]),
  // (the device: 66.3 x 10.5 x 118.9; local y from 0 at its back to 10.5 at its face, its top
  // edge towards -z; the corners and side edges rounded)
  half: [33.15, 5.25, 59.45],
  r: 3,
}
export const DESK = {
  // the lighter, below the ashtray and a little to its left, its length across the picture, turned a
  // little (theta: its length's heading on the ground, from FWD)
  lighter: deskAt(-10, 110),
  lighterTurn: Math.PI / 2 + 0.2,
}
/**
 * What the camera looks at, and how much must fit: the player in the middle; on a wide screen the
 * earbuds to its left, the ashtray and lighter to its right; on a tall one the picture turned a
 * quarter, so the earbuds lie above it and the ashtray and lighter below. `span`: the extent to fit
 * (mm, across and up the picture).
 */
export const VIEW = {
  wide: { at: deskAt(-135, 20), span: [470, 262] },
  tall: { at: deskAt(-135, 20), span: [262, 470] },
}
