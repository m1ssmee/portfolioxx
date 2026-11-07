// A critically damped follower: a value (a point, a number) drawn to a moving target with no
// overshoot, its speed capped, the same at any frame rate (the closed-form step of a critically
// damped spring, as in Game Programming Gems 4, 1.10). Plain JS: the physics (core/rope.js) and the
// held objects (objects/pickup.js, objects/lighter.js) share it.

/**
 * Step `p` (Float64Array or array, n components) with velocity `v` towards `target` over dt
 * seconds. smoothTime: about the time to get there (s); maxSpeed: the most it may move (units/s).
 */
export function smoothToward(p, v, target, dt, smoothTime, maxSpeed = Infinity, n = 3) {
  const omega = 2 / Math.max(1e-4, smoothTime)
  const x = omega * dt
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
  // (the way still to go, capped so it is never covered faster than maxSpeed)
  let len = 0
  for (let k = 0; k < n; k++) len += (p[k] - target[k]) ** 2
  len = Math.sqrt(len)
  const cap = maxSpeed * smoothTime
  const s = len > cap ? cap / len : 1
  for (let k = 0; k < n; k++) {
    const to = p[k] - (p[k] - target[k]) * s // (the capped target)
    const change = p[k] - to
    const temp = (v[k] + omega * change) * dt
    v[k] = (v[k] - omega * temp) * e
    let out = to + (change + temp) * e
    // (never past the target)
    if ((target[k] - p[k] > 0) === (out > target[k]) && Math.abs(target[k] - p[k]) > 0) {
      out = target[k]
      v[k] = (out - target[k]) / dt
    }
    p[k] = out
  }
}

const fp = new Float64Array(3)
const fv = new Float64Array(3)
const ft = new Float64Array(3)
/** smoothToward for {x, y, z} points (three.js vectors): position P, velocity V, target T. */
export function followVec(P, V, T, dt, smoothTime, maxSpeed = Infinity) {
  fp[0] = P.x
  fp[1] = P.y
  fp[2] = P.z
  fv[0] = V.x
  fv[1] = V.y
  fv[2] = V.z
  ft[0] = T.x
  ft[1] = T.y
  ft[2] = T.z
  smoothToward(fp, fv, ft, dt, smoothTime, maxSpeed)
  P.x = fp[0]
  P.y = fp[1]
  P.z = fp[2]
  V.x = fv[0]
  V.y = fv[1]
  V.z = fv[2]
}
