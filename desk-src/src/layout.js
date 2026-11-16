// Where everything lies (mm; y up; the ashtray at the origin): a flat-lay seen from nearly above.
// Places are given in the view's own axes: u to the right of the picture, v down it (towards the
// viewer); the view looks along FWD. Plain JS (no three.js): the scene and the settling tool
// (tools/settle.mjs) share it.
//   the player   the hero, upright in the middle, its jack at the bottom edge
//   the earbuds  plugged in, the cable in a few open curves round the player's lower left, the buds
//                above it, at the left
//   the ashtray  (with its cigarette) and the lighter below it: off to the right, out of its way
//   the badge    the owner's ID card, above the player
//   the notebook the visitors' book, an A5 spiral notebook, to the right of the ashtray
//   the laptop   at the back, its front edge on the mat's back edge; the lamp at the back left,
//                leaning in over the mat; the energy drink by the laptop's right corner, above the
//                notebook: one still life, each thing a little in front of the next
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
  // the badge, above the player, lying across the picture, its clip to the right and a little up
  // (turn: its top's heading on the ground, from RIGHT towards up the picture)
  badge: deskAt(-128, -92),
  badgeTurn: 0.17,
  // the notebook, to the right of the mat, on the bare desk, turned a little
  notebook: deskAt(205, 55),
  notebookTurn: -0.08,
  // the laptop (the middle of its base): at the back, its front edge just behind the mat's (7 mm at
  // its left corner), turned a little, its screen towards the notebook and its right end back from
  // the can (its open lid 30 mm off the wall at its nearest)
  laptop: deskAt(-10, -250),
  laptopTurn: 0.07,
  // the energy drink: on the bare desk by the laptop's right corner and a little in front of it
  // (16 mm off it), above the notebook (55 mm) and right of the mat (75); knocked over, it falls
  // the way it was pushed where the desk is clear (a tap on its middle: straight back, past the
  // laptop's corner), else the nearest clear way to it (can.js)
  can: deskAt(190, -135),
  // beside the desk, on the floor (the desk runs from u = -760 to 560: objects/room.js): a studio
  // monitor on a stand at each end, 35 mm off it and near the wall, turned in towards the chair
  // (turn: from facing the chair, towards the right of the picture); a bin right of the right stand
  speakerL: deskAt(-900, -318),
  speakerLTurn: 0.42,
  speakerR: deskAt(700, -318),
  speakerRTurn: -0.42,
  speakerTop: 905, // (the stands' top plates, above the floor)
  bin: deskAt(962, -330),
  // the lamp: its foot at the back left, just behind the mat (33 mm off it, 92 mm in radius); its
  // head's pivot (325 mm up: low enough for the elbow to stand above it), out over the mat's corner
  // with the arm across the picture (its shade just over the laptop's lower left corner from the
  // chair); the point of the desk it lights, between the player and the ashtray
  // (now further left, clear of the second screen: its foot beside the screen's, its arm up its left)
  lampBase: deskAt(-652, -292),
  lampHead: deskAt(-640, -30, 312),
  lampAim: deskAt(-150, 34),
  // the second screen: a 27-inch monitor, landscape, behind the laptop and over its open lid, on an
  // arm from a pole on a weighted base at its left (monitor: on the desk under the
  // middle of its glass). The HDMI cable's way over the desk from the adapter by the laptop's left
  // side: straight back to the wall, then along it behind the stand's base (it goes up the back of
  // the pole and under the arm: monitor.js)
  monitor: deskAt(-10, -418),
  monitorTurn: 0,
  hdmiRun: [deskAt(-232, -312), deskAt(-252, -372), deskAt(-268, -440), deskAt(-286, -466)],
}
/**
 * What the seated home view shows of the desk: its middle and its extent (mm, across and up the
 * picture). On a wide screen, from the lamp's foot to the notebook and from the front of the things
 * on the desk back to the wall; on a tall one, the middle of that. (scene.js's SEAT_WIDE and
 * SEAT_TALL are what the camera is fitted to: these fronts, the lamp and the board's top; this is
 * for tools/settle.mjs --plot)
 */
export const VIEW = {
  wide: { at: deskAt(-101, -152), span: [782, 635] },
  tall: { at: deskAt(35, -160), span: [490, 620] },
}
