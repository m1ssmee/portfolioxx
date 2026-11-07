// A dropped stick (the cigarette): two point masses, its ends, held at their distance (position-
// based dynamics), with spheres along it that collide with a signed distance field and the table.
// The heavier end (the filter) lands first and settles lower; friction stops it sliding; the roll
// about its own axis is worked out from how far it rolled. Allocation-free once made.
import { unbounce } from './body.js'
const G = -9810 // mm/s²

export function createRod({ length, radius, massA, massB, samples = 9, sdf, floorY = 0 }) {
  const A = new Float64Array(3) // filter end
  const B = new Float64Array(3) // the other end
  const pA = new Float64Array(3)
  const pB = new Float64Array(3)
  const vA = new Float64Array(3)
  const vB = new Float64Array(3)
  const wA = 1 / massA
  const wB = 1 / massB
  const grad = new Float64Array(3)
  const s = new Float64Array(3)
  const D = new Float64Array(6) // (each end's contact pushes this substep)
  const rod = {
    A,
    B,
    awake: false,
    roll: 0, // radians about its own axis
    restFor: 0,
    contact: false,
    /** Start falling from this pose (ends in mm) with these end velocities (mm/s). */
    drop(a, b, va, vb) {
      A.set(a)
      B.set(b)
      vA.set(va)
      vB.set(vb)
      rod.awake = true
      rod.restFor = 0
    },
    step(dt) {
      if (!rod.awake) return false
      // (steps of 4 ms at most, whatever the frame rate: a big step through a contact launches it)
      const n = Math.max(2, Math.ceil(dt / 0.004))
      const h = dt / n
      for (let k = 0; k < n; k++) sub(h)
      // asleep once it has hardly moved for a while
      const sp = Math.hypot(vA[0], vA[1], vA[2]) + Math.hypot(vB[0], vB[1], vB[2])
      rod.restFor = sp < 6 && rod.contact ? rod.restFor + dt : 0
      if (rod.restFor > 0.4) {
        rod.awake = false
        vA.fill(0)
        vB.fill(0)
      }
      return true
    },
  }
  function sub(h) {
    for (let i = 0; i < 3; i++) {
      pA[i] = A[i]
      pB[i] = B[i]
    }
    vA[1] += G * h
    vB[1] += G * h
    for (let i = 0; i < 3; i++) {
      A[i] += vA[i] * h
      B[i] += vB[i] * h
    }
    rod.contact = false
    D.fill(0)
    for (let it = 0; it < 2; it++) {
      // the length
      let dx = B[0] - A[0]
      let dy = B[1] - A[1]
      let dz = B[2] - A[2]
      const l = Math.hypot(dx, dy, dz) || 1
      const c = (l - length) / l / (wA + wB)
      A[0] += dx * c * wA
      A[1] += dy * c * wA
      A[2] += dz * c * wA
      B[0] -= dx * c * wB
      B[1] -= dy * c * wB
      B[2] -= dz * c * wB
      // spheres along it, against the ashtray and the table
      for (let k = 0; k < samples; k++) {
        const t = k / (samples - 1)
        for (let i = 0; i < 3; i++) s[i] = A[i] + (B[i] - A[i]) * t
        let d = sdf(s[0], s[1], s[2], grad) - radius
        let nx = grad[0]
        let ny = grad[1]
        let nz = grad[2]
        const df = s[1] - floorY - radius
        if (df < d) {
          d = df
          nx = 0
          ny = 1
          nz = 0
        }
        if (d >= 0) continue
        rod.contact = true
        // split the push between the ends by where the sphere is, weighted by their masses
        const ka = (1 - t) * wA
        const kb = t * wB
        const den = (1 - t) * ka + t * kb || 1
        const fa = (-d * ka) / den
        const fb = (-d * kb) / den
        A[0] += nx * fa
        A[1] += ny * fa
        A[2] += nz * fa
        B[0] += nx * fb
        B[1] += ny * fb
        B[2] += nz * fb
        D[0] += nx * fa
        D[1] += ny * fa
        D[2] += nz * fa
        D[3] += nx * fb
        D[4] += ny * fb
        D[5] += nz * fb
      }
    }
    // velocities from the motion; friction where it touches (and a little rolling resistance)
    for (let i = 0; i < 3; i++) {
      vA[i] = (A[i] - pA[i]) / h
      vB[i] = (B[i] - pB[i]) / h
    }
    // (no bounce: core/body.js)
    unbounce(vA, D, 0, h)
    unbounce(vB, D.subarray(3), 0, h)
    cap(vA)
    cap(vB)
    if (rod.contact) {
      // (paper on wood or glaze: it rolls a little and stops; it does not skate)
      const keep = Math.exp(-h * 22)
      for (let i = 0; i < 3; i++) {
        if (i === 1) continue
        vA[i] *= keep
        vB[i] *= keep
      }
      // the roll: the axis moving sideways over the surface turns it about itself
      const ax = B[0] - A[0]
      const az = B[2] - A[2]
      const al = Math.hypot(ax, az) || 1
      const side = ((vA[0] + vB[0]) * 0.5 * -az + (vA[2] + vB[2]) * 0.5 * ax) / al
      rod.roll += (side * h) / radius
    }
  }
  return rod
}
// (no contact correction turns into a launch)
function cap(v) {
  const s = Math.hypot(v[0], v[1], v[2])
  if (s > 1500) {
    const k = 1500 / s
    v[0] *= k
    v[1] *= k
    v[2] *= k
  }
}
