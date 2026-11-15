// The camera's focus: a tap or a double-click on an object glides the camera to a view framed for
// it; Escape or the back button glides it home. One glide, the same for every view:
//   - it runs on six numbers, not on two points: the target (x, y, z) and the camera round it
//     (azimuth, elevation, the log of its distance). The camera swings round what it looks at on an
//     arc and closes in by ratio (a straight line between two camera positions cuts the corner);
//   - it eases out of rest and into it with no jerk at either end (a quintic), and takes longer the
//     further it has to go;
//   - while it runs the camera is the glide's alone: the orbit controls are off and their limits do
//     not apply (the limits of the view it is going TO, applied while it was still on its way, made
//     the camera jump at the first frame). They come back at its end, opened wide enough to hold
//     the camera where the glide left it;
//   - its clock starts at its first frame, with the frames' own time: each frame is one even step;
//   - a glide begun while another is still running takes over at that one's speed.
//   targets: { name: { center(out): Vector3, radius, el?: radians, az?: radians (a preferred view),
//              azPull?: how far towards it the view turns, 0..1 (0.6) } or { view(): { pos, target } } }
//   onStart(): a glide begins; onEnd(name): it has arrived (name: the focus, null at home);
//   onChange(name): the focus changed
import * as THREE from 'three'

export function createFocus({ camera, controls, home, targets, reduceMotion, onChange, onStart, onEnd }) {
  const N = 6
  const tw = { on: false, t0: -1, ms: 900, fixed: false, s0: new Float64Array(N), s1: new Float64Array(N), v0: new Float64Array(N), s: new Float64Array(N), v: new Float64Array(N) }
  const c = new THREE.Vector3()
  const d = new THREE.Vector3()
  const off = new THREE.Vector3() // (its own: `d` may be the very position passed in)
  let current = null
  // (smootherstep: no jerk at either end; its slope)
  const ease = (t) => t * t * t * (t * (6 * t - 15) + 10)
  const easeD = (t) => 30 * t * t * (1 - t) * (1 - t)
  // (what a starting speed adds: slope 1 at the start, nothing at the end, no jerk at either; its slope)
  const carry = (t) => t - 6 * t * t * t + 8 * t * t * t * t - 3 * t * t * t * t * t
  const carryD = (t) => 1 - 18 * t * t + 32 * t * t * t - 15 * t * t * t * t
  const toState = (pos, target, out) => {
    off.subVectors(pos, target)
    const len = Math.max(off.length(), 1e-6)
    out[0] = target.x
    out[1] = target.y
    out[2] = target.z
    out[3] = Math.atan2(off.x, off.z)
    out[4] = Math.asin(THREE.MathUtils.clamp(off.y / len, -1, 1))
    out[5] = Math.log(len)
  }
  const apply = (st) => {
    const len = Math.exp(st[5])
    const ce = Math.cos(st[4])
    controls.target.set(st[0], st[1], st[2])
    camera.position.set(st[0] + Math.sin(st[3]) * ce * len, st[1] + Math.sin(st[4]) * len, st[2] + Math.cos(st[3]) * ce * len)
    camera.lookAt(controls.target)
  }

  function glide(pos, target, ms) {
    const moving = tw.on && !reduceMotion
    toState(pos, target, tw.s1)
    toState(camera.position, controls.target, tw.s0)
    // (the short way round)
    tw.s1[3] = tw.s0[3] + Math.atan2(Math.sin(tw.s1[3] - tw.s0[3]), Math.cos(tw.s1[3] - tw.s0[3]))
    // (looking straight down, any azimuth is the same view: keep the other end's)
    if (Math.cos(tw.s0[4]) < 1e-3) tw.s0[3] = tw.s1[3]
    for (let i = 0; i < N; i++) tw.v0[i] = moving ? tw.v[i] : 0
    // how far: the swing, the change of scale, the target's own move as the camera sees it
    const dist = Math.exp((tw.s0[5] + tw.s1[5]) / 2)
    const swing = Math.hypot(tw.s1[4] - tw.s0[4], (tw.s1[3] - tw.s0[3]) * Math.cos((tw.s0[4] + tw.s1[4]) / 2))
    const travel = swing + 0.5 * Math.abs(tw.s1[5] - tw.s0[5]) + Math.hypot(tw.s1[0] - tw.s0[0], tw.s1[1] - tw.s0[1], tw.s1[2] - tw.s0[2]) / dist
    tw.ms = reduceMotion ? 1 : ms || THREE.MathUtils.clamp(620 + 430 * travel, 760, 1450)
    tw.t0 = -1 // (its first frame's time)
    if (!tw.on) onStart?.()
    tw.on = true
    controls.enabled = false
    controls.enableDamping = false
  }
  const api = {
    get focused() {
      return current
    },
    get moving() {
      return tw.on
    },
    /** Close up on one object (by name). */
    focusOn(name) {
      const T = targets[name]
      if (!T) return
      if (T.view) {
        const v = T.view()
        current = name
        glide(v.pos, v.target)
        onChange?.(current)
        return
      }
      T.center(c)
      // from where the camera looks now, nudged towards the object's preferred side
      d.subVectors(camera.position, controls.target)
      let az = Math.atan2(d.x, d.z)
      if (T.az !== undefined) az = az + Math.atan2(Math.sin(T.az - az), Math.cos(T.az - az)) * (T.azPull ?? 0.6)
      const el = T.el ?? THREE.MathUtils.clamp(Math.asin(d.y / Math.max(d.length(), 1e-6)), 0.25, 1.0)
      const fov = THREE.MathUtils.degToRad(camera.fov)
      const fit = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * camera.aspect))
      const dist = Math.max((T.radius / Math.sin(fit / 2)) * 1.12, 60)
      d.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(c)
      current = name
      glide(d, c)
      onChange?.(current)
    },
    /** Back to the whole desk. */
    back() {
      if (!current && !tw.on) return
      current = null
      glide(home.pos, home.target)
      onChange?.(current)
    },
    /** Glide the camera from where it is to (pos, target), over ms. */
    glide(pos, target, ms) {
      glide(pos, target, ms)
    },
    /** Each frame, with the frame's own time: the glide (returns true while it moves the camera). */
    update(now) {
      if (!tw.on) return false
      if (tw.t0 < 0) tw.t0 = now
      const t = Math.min(1, Math.max(0, (now - tw.t0) / tw.ms))
      const long = tw.ms > 1500 // (a long glide, the reveal's: it eases out only)
      const e = long ? 1 - Math.pow(1 - t, 3) : ease(t)
      const eD = long ? 3 * (1 - t) * (1 - t) : easeD(t)
      const h = long ? 0 : carry(t) * tw.ms
      const hD = long ? 0 : carryD(t)
      for (let i = 0; i < N; i++) {
        const span = tw.s1[i] - tw.s0[i]
        tw.s[i] = tw.s0[i] + span * e + tw.v0[i] * h
        tw.v[i] = (span * eD) / tw.ms + tw.v0[i] * hD // (per ms: what the next glide starts from)
      }
      apply(tw.s)
      if (t >= 1) {
        tw.on = false
        tw.v.fill(0)
        controls.enableDamping = true
        onEnd?.(current)
      }
      return true
    },
    /** Stop a glide where it is. */
    cancel() {
      if (!tw.on) return
      tw.on = false
      tw.v.fill(0)
      controls.enableDamping = true
      onEnd?.(current)
    },
  }
  return api
}
