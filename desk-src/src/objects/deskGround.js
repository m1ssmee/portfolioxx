// What the earbud cable and its parts lie on (core/rope.js asks): the desk's top (y = 0), the music
// player (a box with rounded edges, wherever it stands), the ashtray (its own distance field, only
// near it) and the lighter (a rounded box, wherever it lies). Plain JS: it also runs under Node.
// Writes the push out (out[0..2], at most 2 mm) and the surface normal (out[3..5]).
const roundBox = (px, py, pz, bx, by, bz, r) => {
  const qx = Math.abs(px) - bx + r
  const qy = Math.abs(py) - by + r
  const qz = Math.abs(pz) - bz + r
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r
}

/**
 * boxes(): the movable boxes now, each { m: Float64Array(12) world-from-local (rotation columns, then
 * position), half: [x, y, z], r, y0 (the local y of the box's centre) }; ashtraySDF(x, y, z).
 */
export function createDeskGround({ ashtraySDF, boxes, trayReach = 62, trayTop = 36 }) {
  const g = new Float64Array(3)
  const e = 0.25
  /** The distance from a point to a box (and its gradient, world, in g). */
  function boxDist(b, x, y, z, withGrad) {
    const m = b.m
    // local = R^T (p - t)
    const dx = x - m[9]
    const dy = y - m[10]
    const dz = z - m[11]
    const lx = m[0] * dx + m[1] * dy + m[2] * dz
    const ly = m[3] * dx + m[4] * dy + m[5] * dz - b.y0
    const lz = m[6] * dx + m[7] * dy + m[8] * dz
    const h = b.half
    const d = roundBox(lx, ly, lz, h[0], h[1], h[2], b.r)
    if (withGrad) {
      const gx = roundBox(lx + e, ly, lz, h[0], h[1], h[2], b.r) - d
      const gy = roundBox(lx, ly + e, lz, h[0], h[1], h[2], b.r) - d
      const gz = roundBox(lx, ly, lz + e, h[0], h[1], h[2], b.r) - d
      const l = Math.hypot(gx, gy, gz) || 1
      // world = R local
      g[0] = (m[0] * gx + m[3] * gy + m[6] * gz) / l
      g[1] = (m[1] * gx + m[4] * gy + m[7] * gz) / l
      g[2] = (m[2] * gx + m[5] * gy + m[8] * gz) / l
    }
    return d
  }
  return function ground(x, y, z, r, out) {
    // the table
    let d = y
    let nx = 0
    let ny = 1
    let nz = 0
    // the boxes (a cheap reject by their bounding radius first)
    const list = boxes()
    for (let i = 0; i < list.length; i++) {
      const b = list[i]
      const m = b.m
      const bx = x - m[9]
      const bz = z - m[11]
      if (bx * bx + bz * bz > b.reach * b.reach || y > m[10] + b.reach) continue
      const db = boxDist(b, x, y, z, false)
      if (db < d) {
        boxDist(b, x, y, z, true)
        d = db
        nx = g[0]
        ny = g[1]
        nz = g[2]
      }
    }
    // the ashtray, only close to it
    if (y < trayTop && x * x + z * z < trayReach * trayReach) {
      const dt = ashtraySDF(x, y, z)
      if (dt < d) {
        const gx = ashtraySDF(x + e, y, z) - dt
        const gy = ashtraySDF(x, y + e, z) - dt
        const gz = ashtraySDF(x, y, z + e) - dt
        const l = Math.hypot(gx, gy, gz) || 1
        d = dt
        nx = gx / l
        ny = gy / l
        nz = gz / l
      }
    }
    if (d >= r) return false
    const pen = Math.min(r - d, 2)
    out[0] = nx * pen
    out[1] = ny * pen
    out[2] = nz * pen
    out[3] = nx
    out[4] = ny
    out[5] = nz
    return true
  }
}
