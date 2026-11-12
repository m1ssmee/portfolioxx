// A small rigid body by position-based dynamics: four particles (its centre and three points one
// unit-length step along its axes) held at their distances make a frame; spheres placed in that
// frame collide with a signed distance field and the table, each push shared between the four by
// the sphere's coordinates in the frame. It falls, tips over onto a stable face and settles.
// Allocation-free once made. (Used for the lighter; the cigarette, a stick, uses core/rod.js.)
const G = -9810 // mm/s²

/**
 * spheres: [[x, y, z, r], ...] in the body's frame (mm, from its centre of mass);
 * mass: [centre, x-point, y-point, z-point] (how the mass sits: more in the centre, steadier).
 */
export function createBody({ spheres, s = 12, mass = [4, 1, 1, 1], sdf, floorY = 0, friction = 9 }) {
  const P = new Float64Array(12) // the four particles
  const Q = new Float64Array(12) // (their previous positions)
  const V = new Float64Array(12)
  const R0 = new Float64Array(12) // (where it was when it last moved: for sleeping)
  const W = mass.map((m) => 1 / m)
  const rest = new Float64Array(6)
  const pairs = [0, 1, 0, 2, 0, 3, 1, 2, 1, 3, 2, 3]
  const grad = new Float64Array(3)
  const F = new Float64Array(9) // the frame: x, y, z axes
  const wts = new Float64Array(4)
  const D = new Float64Array(12) // (each particle's contact pushes this substep)
  const body = {
    P,
    awake: false,
    contact: false,
    restFor: 0,
    /** Place it: centre (mm) and the frame's axes (unit vectors), at rest or moving. */
    set(c, ax, ay, az, v = null) {
      for (let i = 0; i < 3; i++) {
        P[i] = c[i]
        P[3 + i] = c[i] + ax[i] * s
        P[6 + i] = c[i] + ay[i] * s
        P[9 + i] = c[i] + az[i] * s
      }
      for (let k = 0; k < 6; k++) {
        const a = pairs[k * 2] * 3
        const b = pairs[k * 2 + 1] * 3
        rest[k] = Math.hypot(P[a] - P[b], P[a + 1] - P[b + 1], P[a + 2] - P[b + 2])
      }
      for (let i = 0; i < 12; i++) V[i] = v ? v[i % 3] : 0
      R0.set(P)
      body.awake = true
      body.restFor = 0
    },
    /**
     * Set it turning: about the line through `pivot` along `axis` (a unit vector) at `w` rad/s,
     * plus `lin` (mm/s): each particle given its own velocity of that motion (a push, a knock).
     */
    spin(pivot, axis, w, lin = null) {
      for (let i = 0; i < 4; i++) {
        const rx = P[i * 3] - pivot[0]
        const ry = P[i * 3 + 1] - pivot[1]
        const rz = P[i * 3 + 2] - pivot[2]
        V[i * 3] = w * (axis[1] * rz - axis[2] * ry) + (lin ? lin[0] : 0)
        V[i * 3 + 1] = w * (axis[2] * rx - axis[0] * rz) + (lin ? lin[1] : 0)
        V[i * 3 + 2] = w * (axis[0] * ry - axis[1] * rx) + (lin ? lin[2] : 0)
      }
      R0.set(P)
      body.awake = true
      body.restFor = 0
    },
    /** Its centre and axes, now (out: [cx, cy, cz, xx, xy, xz, yx, yy, yz, zx, zy, zz]). */
    frame(out) {
      frame()
      out[0] = P[0]
      out[1] = P[1]
      out[2] = P[2]
      for (let i = 0; i < 9; i++) out[3 + i] = F[i]
      return out
    },
    step(dt) {
      if (!body.awake) return false
      // (steps of 4 ms at most, whatever the frame rate)
      const n = Math.max(2, Math.ceil(dt / 0.004))
      for (let k = 0; k < n; k++) sub(dt / n)
      // asleep once it has stayed put (each particle within 0.25 mm) for a third of a second, in
      // contact: by where it is, not by its speed, which jitters a little on a contact at rest
      body.restFor += dt
      let moved = 0
      for (let i = 0; i < 12; i++) moved = Math.max(moved, Math.abs(P[i] - R0[i]))
      if (moved > 0.25 || !body.contact) {
        body.restFor = 0
        R0.set(P)
      } else if (body.restFor > 0.33) {
        body.awake = false
        V.fill(0)
      }
      return true
    },
  }
  // the frame from the particles: x from 0 to 1, y from 0 to 2 made square to it, z across both
  function frame() {
    let x0 = P[3] - P[0]
    let x1 = P[4] - P[1]
    let x2 = P[5] - P[2]
    let l = Math.hypot(x0, x1, x2) || 1
    x0 /= l
    x1 /= l
    x2 /= l
    let y0 = P[6] - P[0]
    let y1 = P[7] - P[1]
    let y2 = P[8] - P[2]
    const d = y0 * x0 + y1 * x1 + y2 * x2
    y0 -= d * x0
    y1 -= d * x1
    y2 -= d * x2
    l = Math.hypot(y0, y1, y2) || 1
    y0 /= l
    y1 /= l
    y2 /= l
    F[0] = x0
    F[1] = x1
    F[2] = x2
    F[3] = y0
    F[4] = y1
    F[5] = y2
    F[6] = x1 * y2 - x2 * y1
    F[7] = x2 * y0 - x0 * y2
    F[8] = x0 * y1 - x1 * y0
  }
  function sub(h) {
    for (let i = 0; i < 12; i++) Q[i] = P[i]
    for (let i = 0; i < 4; i++) V[i * 3 + 1] += G * h
    for (let i = 0; i < 12; i++) P[i] += V[i] * h
    D.fill(0)
    body.contact = false
    for (let it = 0; it < 3; it++) {
      // stay rigid
      for (let k = 0; k < 6; k++) {
        const a = pairs[k * 2]
        const b = pairs[k * 2 + 1]
        const dx = P[b * 3] - P[a * 3]
        const dy = P[b * 3 + 1] - P[a * 3 + 1]
        const dz = P[b * 3 + 2] - P[a * 3 + 2]
        const l = Math.hypot(dx, dy, dz) || 1
        const c = (l - rest[k]) / l / (W[a] + W[b])
        P[a * 3] += dx * c * W[a]
        P[a * 3 + 1] += dy * c * W[a]
        P[a * 3 + 2] += dz * c * W[a]
        P[b * 3] -= dx * c * W[b]
        P[b * 3 + 1] -= dy * c * W[b]
        P[b * 3 + 2] -= dz * c * W[b]
      }
      // the spheres against the ashtray and the table
      frame()
      for (const sp of spheres) {
        const lx = sp[0]
        const ly = sp[1]
        const lz = sp[2]
        const x = P[0] + F[0] * lx + F[3] * ly + F[6] * lz
        const y = P[1] + F[1] * lx + F[4] * ly + F[7] * lz
        const z = P[2] + F[2] * lx + F[5] * ly + F[8] * lz
        let d = sdf(x, y, z, grad) - sp[3]
        let nx = grad[0]
        let ny = grad[1]
        let nz = grad[2]
        const df = y - floorY - sp[3]
        if (df < d) {
          d = df
          nx = 0
          ny = 1
          nz = 0
        }
        if (d >= 0) continue
        body.contact = true
        // the sphere as a sum of the particles: its coordinates in the (unsquared) frame
        wts[1] = lx / s
        wts[2] = ly / s
        wts[3] = lz / s
        wts[0] = 1 - wts[1] - wts[2] - wts[3]
        let den = 0
        for (let i = 0; i < 4; i++) den += wts[i] * wts[i] * W[i]
        const lam = -d / (den || 1)
        for (let i = 0; i < 4; i++) {
          const f = lam * wts[i] * W[i]
          P[i * 3] += nx * f
          P[i * 3 + 1] += ny * f
          P[i * 3 + 2] += nz * f
          D[i * 3] += nx * f
          D[i * 3 + 1] += ny * f
          D[i * 3 + 2] += nz * f
        }
      }
    }
    for (let i = 0; i < 12; i++) V[i] = (P[i] - Q[i]) / h
    // no bounce: a contact's push puts it back on the surface, but adds no outward speed
    for (let i = 0; i < 4; i++) unbounce(V, D, i * 3, h)
    for (let i = 0; i < 4; i++) {
      // (no contact correction turns into a launch)
      const sp = Math.hypot(V[i * 3], V[i * 3 + 1], V[i * 3 + 2])
      if (sp > 1500) for (let j = 0; j < 3; j++) V[i * 3 + j] *= 1500 / sp
    }
    if (body.contact) {
      const keep = Math.exp(-h * friction)
      for (let i = 0; i < 4; i++) {
        V[i * 3] *= keep
        V[i * 3 + 2] *= keep
      }
    }
  }
  return body
}

/**
 * Zero restitution for a position-based contact: of the velocity at v[o..o+2], the outward part
 * the substep's pushes d[o..o+2] gave it beyond any it already had is taken away (it lands and
 * stays; a correction never becomes a hop). Shared with core/rod.js.
 */
export function unbounce(v, d, o, h) {
  const dl = Math.hypot(d[o], d[o + 1], d[o + 2])
  if (dl < 1e-12) return
  const nx = d[o] / dl
  const ny = d[o + 1] / dl
  const nz = d[o + 2] / dl
  const vn = v[o] * nx + v[o + 1] * ny + v[o + 2] * nz
  const vn0 = vn - dl / h // (without the pushes)
  const ex = vn - Math.max(vn0, 0)
  if (ex <= 0) return
  v[o] -= nx * ex
  v[o + 1] -= ny * ex
  v[o + 2] -= nz * ex
}
