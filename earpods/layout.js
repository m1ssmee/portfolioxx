// The composition the earphones start in, in world space (cm; the floor is y = 0, the camera
// looks from +z). Both earbuds are held up; their cables hang to the splitter, the remote's
// weight pulling the right one straight; the main cable falls to the floor and lies there in a
// loose curve to the plug.
export const BUDS = {
  // the left one shows its front (the "L" and the small vent), the right one its speaker
  left: { p: [-3.5, 12.3, 0], yaw: -0.2, roll: 0.06 },
  right: { p: [3.5, 12.3, 0], yaw: 1.0, roll: -0.06 },
}

export const LAYOUT = {
  splitter: [0.5, 2.0, 0.3],
  splitterDir: [0, -1, 0],
  remote: [3.25, 5.96, -0.54],
  remoteDir: [0, -1, 0],
  plug: [4.6, 0.3, 4.4],
  plugDir: [0.8, 0, -0.6],
  // which way each cable bulges, if it is longer than the path through its points
  bulge: { left: [0, -1, 0], rightUpper: [0, -1, 0], rightLower: [0, -1, 0], main: [-1, 0, 0] },
  // points the cables are first laid through (they settle from there)
  via: {
    left: [[-3.4, 5.6, -0.3]],
    rightUpper: [],
    rightLower: [[2.2, 1.3, -0.2]],
    // down to the floor, then a loose C round the front to the plug
    main: [
      [0.4, 0.09, 1.2],
      [-1.6, 0.09, 2.6],
      [-1.6, 0.09, 4.6],
      [0.4, 0.09, 5.8],
      [3.0, 0.09, 5.6],
    ],
  },
}

/** An earbud's 4x4 matrix (column-major), from a pose { p, yaw, roll } and an extra offset. */
export function budElements(pose, off = [0, 0, 0], out = new Float64Array(16)) {
  const cy = Math.cos(pose.yaw)
  const sy = Math.sin(pose.yaw)
  const cr = Math.cos(pose.roll)
  const sr = Math.sin(pose.roll)
  // R = Ry(yaw) * Rz(roll)
  const r = [
    [cy * cr, -cy * sr, sy],
    [sr, cr, 0],
    [-sy * cr, sy * sr, cy],
  ]
  out[0] = r[0][0]
  out[1] = r[1][0]
  out[2] = r[2][0]
  out[3] = 0
  out[4] = r[0][1]
  out[5] = r[1][1]
  out[6] = r[2][1]
  out[7] = 0
  out[8] = r[0][2]
  out[9] = r[1][2]
  out[10] = r[2][2]
  out[11] = 0
  out[12] = pose.p[0] + off[0]
  out[13] = pose.p[1] + off[1]
  out[14] = pose.p[2] + off[2]
  out[15] = 1
  return out
}
