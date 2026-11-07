// The camera's focus: a double-click (or a double-tap) on an object glides the camera to a close-up
// framed for it; Escape or the back button glides it back to the whole desk. The glide keeps the
// side the camera is looking from (turned a little towards the object's best side) and eases in
// and out; the orbit controls take over again at either end.
//   targets: { name: { center(out): Vector3, radius, el?: radians, az?: radians (a preferred view),
//              azPull?: how far towards it the view turns, 0..1 (0.6) } or { view(): { pos, target } } }
import * as THREE from 'three'

export function createFocus({ camera, controls, home, targets, reduceMotion, onChange }) {
  const tw = { on: false, t0: 0, ms: 900, p0: new THREE.Vector3(), q0: new THREE.Vector3(), p1: new THREE.Vector3(), q1: new THREE.Vector3() }
  const c = new THREE.Vector3()
  const d = new THREE.Vector3()
  let current = null
  // (smootherstep: no jerk at either end, the camera eases out of rest and into it)
  const ease = (t) => t * t * t * (t * (6 * t - 15) + 10)

  function glide(pos, target) {
    tw.p0.copy(camera.position)
    tw.q0.copy(controls.target)
    tw.p1.copy(pos)
    tw.q1.copy(target)
    tw.t0 = performance.now()
    tw.ms = reduceMotion ? 1 : 1150
    tw.on = true
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
      const dist = THREE.MathUtils.clamp((T.radius / Math.sin(fit / 2)) * 1.12, 60, controls.maxDistance)
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
      glide(pos, target)
      if (ms) tw.ms = reduceMotion ? 1 : ms
    },
    /** Each frame: the glide (returns true while it moves the camera). */
    update(now) {
      if (!tw.on) return false
      const t = Math.min(1, (now - tw.t0) / tw.ms)
      const e = tw.ms > 1200 ? 1 - Math.pow(1 - t, 3) : ease(t) // (a long glide, the reveal's: it eases out only)
      camera.position.lerpVectors(tw.p0, tw.p1, e)
      controls.target.lerpVectors(tw.q0, tw.q1, e)
      if (t >= 1) {
        tw.on = false
        controls.enableDamping = true
      }
      return true
    },
    /** Stop a glide where it is (the user took the camera). */
    cancel() {
      if (!tw.on) return
      tw.on = false
      controls.enableDamping = true
    },
  }
  return api
}
