// The burning cigarette, picked up and moved (registered with core/grab.js):
//   held:  lifted 25 mm, held where it was grabbed, following the pointer across a horizontal
//          plane, critically damped (it lags a little, swings a little, leans with motion; never
//          overshoots or wags);
//          its capsule kept out of the ashtray and the table; kept in the lit pool and the view.
//   glide: released within 12 mm of a notch, it glides into it and settles.
//   fall:  released anywhere else, it drops (core/rod.js), rolls a little, settles; still burning.
// While it moves the ember is fanned (brighter with speed), the ash sways on a spring and breaks
// off if the motion is too sudden. Everything preallocated.
import * as THREE from 'three'
import { createRod } from '../core/rod.js'
import { followVec } from '../core/follow.js'

// (held: the point it is held by follows the hand's target, critically damped over about this
// long (s), never faster than this (mm/s))
const HOLD_SMOOTH = 0.11
const HOLD_MAX_SPEED = 600

const L = 84 // mm, filter end to foot
const R = 4.1 // (the ash is a little wider than the paper)

export function createPickup({ camera, sdfGrad, notchPose, notchSeat, cigLength, onBreak, onChange }) {
  const rod = createRod({ length: L, radius: R, massA: 1.35, massB: 0.65, sdf: sdfGrad })
  const st = {
    mode: 'rest', // rest | held | glide | fall | lying
    c: null, // the cigarette
    xg: 40, // where it is held, mm along it
    P: new THREE.Vector3(), // the held point
    V: new THREE.Vector3(),
    T: new THREE.Vector3(), // the pointer's target on the plane
    off: new THREE.Vector3(), // (the grab's offset from the pointer, so nothing jumps on pickup)
    offSet: false,
    accF: new THREE.Vector3(), // (the acceleration, smoothed: one odd frame does not break the ash)
    holdY: 0, // (the plane it is carried in)
    baseY: 0,
    lift: 0, // (0..1: the 25 mm lift, eased in over a third of a second)
    yaw: 0,
    pitch: 0,
    dYaw: 0,
    dPitch: 0,
    vYaw: 0,
    vPitch: 0,
    roll: 0,
    acc: new THREE.Vector3(),
    fan: 0,
    sway: new THREE.Vector2(),
    swayV: new THREE.Vector2(),
    glideT: 0,
    glideK: 0,
    q0: new THREE.Quaternion(),
    q1: new THREE.Quaternion(),
    p0: new THREE.Vector3(),
    p1: new THREE.Vector3(),
    before: new THREE.Matrix4(), // (where it was when picked up)
    modeBefore: 'rest',
  }
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const tv = new THREE.Vector3()
  const tw = new THREE.Vector3()
  const A = new THREE.Vector3()
  const B = new THREE.Vector3()
  const ax = new THREE.Vector3()
  const ay = new THREE.Vector3()
  const az = new THREE.Vector3()
  const UP = new THREE.Vector3(0, 1, 0)
  const m4 = new THREE.Matrix4()
  const inv = new THREE.Matrix4()
  const qv = new THREE.Quaternion()
  const sv = new THREE.Vector3(1, 1, 1)
  const grad = new Float64Array(3)
  const prevP = new THREE.Vector3()
  const prevV = new THREE.Vector3()
  const ndcV = new THREE.Vector3()
  const aimRay = new THREE.Ray()

  /** The cigarette's matrix from its two ends (filter end A, foot B) and its roll about itself. */
  function poseFromEnds(a, b, roll, out) {
    ax.subVectors(b, a).normalize()
    const ref = Math.abs(ax.y) > 0.95 ? tv.set(1, 0, 0) : UP
    az.crossVectors(ax, ref).normalize()
    ay.crossVectors(az, ax).normalize()
    if (roll) {
      qv.setFromAxisAngle(ax, roll)
      ay.applyQuaternion(qv)
      az.applyQuaternion(qv)
    }
    return out.makeBasis(ax, ay, az).setPosition(a)
  }
  function setMatrix(m) {
    st.c.group.matrix.copy(m)
    st.c.group.matrixWorldNeedsUpdate = true
  }
  function ends(m, a, b) {
    a.setFromMatrixPosition(m)
    b.set(L, 0, 0).applyMatrix4(m)
  }
  /** How far along it its solid part reaches (the ash may stick out past the paper). */
  const reach = () => Math.min(L, st.c.b + 0.7 + st.c.ashLen + 0.6)

  /** Push the held cigarette out of the ashtray and off the table (its capsule, sampled). */
  function collide() {
    const n = 10
    const xr = reach()
    for (let it = 0; it < 3; it++) {
      let worst = 0
      let nx = 0
      let ny = 0
      let nz = 0
      for (let k = 0; k < n; k++) {
        const x = (k / (n - 1)) * xr - st.xg
        tw.copy(ax).multiplyScalar(x).add(st.P)
        let d = sdfGrad(tw.x, tw.y, tw.z, grad) - R
        let gx = grad[0]
        let gy = grad[1]
        let gz = grad[2]
        const df = tw.y - R
        if (df < d) {
          d = df
          gx = 0
          gy = 1
          gz = 0
        }
        if (d < worst) {
          worst = d
          nx = gx
          ny = gy
          nz = gz
        }
      }
      if (worst >= 0) return
      st.P.x -= nx * worst
      st.P.y -= ny * worst
      st.P.z -= nz * worst
      // (and it stops moving into what it hit)
      const vn = st.V.x * nx + st.V.y * ny + st.V.z * nz
      if (vn < 0) {
        st.V.x -= vn * nx
        st.V.y -= vn * ny
        st.V.z -= vn * nz
      }
    }
  }

  const api = {
    st,
    get busy() {
      return st.mode === 'held' || st.mode === 'glide' || st.mode === 'fall'
    },
    /** A cigarette placed in a notch (or anywhere): it rests. */
    reset(c) {
      st.c = c
      st.mode = 'rest'
      st.fan = 0
      st.sway.set(0, 0)
      st.swayV.set(0, 0)
      c.ash.rotation.set(0, 0, 0)
    },
    pick(c, hitPoint) {
      st.c = c
      st.before.copy(c.group.matrix)
      st.modeBefore = st.mode
      inv.copy(c.group.matrix).invert()
      tv.copy(hitPoint).applyMatrix4(inv)
      st.xg = THREE.MathUtils.clamp(tv.x, 4, reach() - 2)
      ends(c.group.matrix, A, B)
      ax.subVectors(B, A).normalize()
      st.P.copy(ax).multiplyScalar(st.xg).add(A)
      st.V.set(0, 0, 0)
      st.yaw = Math.atan2(ax.z, ax.x)
      st.pitch = Math.asin(THREE.MathUtils.clamp(ax.y, -1, 1))
      st.dYaw = st.dPitch = st.vYaw = st.vPitch = 0
      st.baseY = st.P.y
      st.holdY = st.P.y + 25
      st.lift = 0
      st.T.copy(st.P)
      st.offSet = false
      st.accF.set(0, 0, 0)
      st.mode = 'held'
      onChange()
    },
    /** The pointer moved: its ray, onto the plane the cigarette is held in (kept in view and in the light). */
    aim(ray) {
      plane.constant = -st.holdY
      // (the whole screen reaches: a notch near the camera may need the pointer near the bottom
      // edge; far off, the lit pool's soft bound below holds it)
      aimRay.copy(ray)
      if (!aimRay.intersectPlane(plane, tw)) return
      // (the first aim fixes the offset between where the pointer meets the plane and the held
      // point lifted straight up: it stays under the pointer as it was grabbed)
      if (!st.offSet) {
        st.off.set(st.P.x - tw.x, 0, st.P.z - tw.z)
        st.offSet = true
      }
      tw.add(st.off)
      tw.y = st.T.y
      // the lit pool on the table: about 200 mm round the ashtray, eased at the edge
      const rr = Math.hypot(tw.x, tw.z)
      if (rr > 160) {
        const k = (160 + 50 * Math.tanh((rr - 160) / 50)) / rr
        tw.x *= k
        tw.z *= k
      }
      st.T.copy(tw)
    },
    twist(rad) {
      st.yaw += rad
    },
    /** Not picked up after all (it was a tap): back exactly where it was. */
    cancel() {
      if (st.mode !== 'held') return
      setMatrix(st.before)
      st.V.set(0, 0, 0)
      st.mode = st.modeBefore === 'lying' ? 'lying' : 'rest'
      onChange()
    },
    /** Let go: into a notch if near one, else it falls. Returns the notch, or -1. */
    release() {
      if (st.mode !== 'held') return -1
      ends(st.c.group.matrix, A, B)
      // the nearest notch under the cigarette's axis (seen from above: it is held up off the rim;
      // within 12 mm across, and not far above)
      let best = -1
      let bd = 12
      for (let k = 0; k < 3; k++) {
        const s = notchSeat(k)
        const d = distToSegmentXZ(s, A, B)
        if (d.across < bd && d.above > -6 && d.above < 45) {
          bd = d.across
          best = k
        }
      }
      if (best >= 0) {
        api.glideTo(best)
        return best
      }
      tv.copy(st.V)
      rod.drop([A.x, A.y, A.z], [B.x, B.y, B.z], [tv.x, tv.y, tv.z], [tv.x, tv.y, tv.z])
      rod.roll = 0
      st.mode = 'fall'
      onChange()
      return -1
    },
    /** The dropped cigarette, for the physics scheduler (core/physics.js). */
    physics: { awake: () => st.mode === 'fall' && rod.awake, step: (h) => rod.step(h) },
    /** Glide into notch k (a release near it, Escape, the reset button). */
    glideTo(k) {
      const c = st.c
      c.group.matrix.decompose(st.p0, st.q0, sv)
      notchPose(k, m4)
      m4.decompose(st.p1, st.q1, sv)
      st.glideK = k
      st.glideT = 0
      st.mode = 'glide'
      onChange()
    },
    /** One frame. Returns true while it moves (the frame cache draws the whole scene). */
    update(dt, burning) {
      const c = st.c
      if (!c) return false
      if (st.mode === 'held') {
        st.lift = Math.min(1, st.lift + dt / 0.35)
        st.T.y = st.baseY + 25 * st.lift * st.lift * (3 - 2 * st.lift)
        prevP.copy(st.P)
        prevV.copy(st.V)
        // the held point follows the target: critically damped (a little lag, never an overshoot),
        // its speed capped (core/follow.js); then the swing of the rest of it, and the lean
        followVec(st.P, st.V, st.T, dt, HOLD_SMOOTH, HOLD_MAX_SPEED)
        st.acc.subVectors(st.V, prevV).divideScalar(Math.max(dt, 1e-4))
        // (the jolt the hand gives it, eased)
        st.accF.lerp(st.acc, 1 - Math.exp(-Math.max(dt, 0.016) / 0.03))
        // the swing: the far part lags the held point (a damped pendulum about it)
        const lever = 0.35 + Math.abs(L * 0.42 - st.xg) / L
        const sideX = -Math.sin(st.yaw)
        const sideZ = Math.cos(st.yaw)
        const accSide = st.acc.x * sideX + st.acc.z * sideZ
        // (well damped: it lags and comes back, it does not wag)
        const ks = 90
        const cs = 2 * Math.sqrt(ks) * 0.9
        st.vYaw += (-ks * st.dYaw - cs * st.vYaw - (accSide / 9000) * lever * ks) * dt
        st.vPitch += (-ks * st.dPitch - cs * st.vPitch - (st.acc.y / 9000) * lever * ks) * dt
        st.dYaw = THREE.MathUtils.clamp(st.dYaw + st.vYaw * dt, -0.26, 0.26)
        st.dPitch = THREE.MathUtils.clamp(st.dPitch + st.vPitch * dt, -0.22, 0.22)
        // a gentle natural tilt, the burning end a little down
        st.pitch += (THREE.MathUtils.degToRad(-6) - st.pitch) * Math.min(1, dt * 3)
        const yaw = st.yaw + st.dYaw
        const pitch = st.pitch + st.dPitch
        ax.set(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch))
        collide()
        A.copy(ax).multiplyScalar(-st.xg).add(st.P)
        B.copy(ax).multiplyScalar(L).add(A)
        setMatrix(poseFromEnds(A, B, st.roll, m4))
      } else if (st.mode === 'glide') {
        st.glideT = Math.min(1, st.glideT + dt / 0.45)
        const t = st.glideT
        // eased in and out, lifted a little on the way so it clears the rim, and set down softly
        const e = t * t * (3 - 2 * t)
        tv.lerpVectors(st.p0, st.p1, e)
        tv.y += Math.sin(t * Math.PI) * 6 * (1 - t)
        qv.slerpQuaternions(st.q0, st.q1, e)
        m4.compose(tv, qv, sv)
        setMatrix(m4)
        st.V.set(0, 0, 0)
        if (t >= 1) {
          c.notch = st.glideK
          st.mode = 'rest'
          onChange()
        }
      } else if (st.mode === 'fall') {
        // (the rod is stepped by the physics scheduler: core/physics.js)
        A.set(rod.A[0], rod.A[1], rod.A[2])
        B.set(rod.B[0], rod.B[1], rod.B[2])
        setMatrix(poseFromEnds(A, B, rod.roll, m4))
        st.V.set(0, 0, 0)
        if (!rod.awake) {
          st.mode = 'lying'
          onChange()
        }
      }
      // fanned: the ember brightens with speed and fades back over a second
      const speed = st.mode === 'held' ? st.V.length() : 0
      st.fan = Math.max(st.fan * Math.exp(-dt / 1.0), Math.min(1, speed / 420))
      // the ash: a spring on its tilt, pushed by the motion across it; too sudden and it breaks
      if (st.mode === 'held' && burning && c.ashLen > 0.6) {
        ends(c.group.matrix, A, B)
        ax.subVectors(B, A).normalize()
        az.crossVectors(ax, UP).normalize()
        ay.crossVectors(az, ax).normalize()
        const ky = st.acc.dot(ay)
        const kz = st.acc.dot(az)
        const kk = 140
        const cc = 2 * Math.sqrt(kk) * 0.35
        st.swayV.x += (-kk * st.sway.x - cc * st.swayV.x - (ky / 6000) * kk * 0.12) * dt
        st.swayV.y += (-kk * st.sway.y - cc * st.swayV.y - (kz / 6000) * kk * 0.12) * dt
        st.sway.x = THREE.MathUtils.clamp(st.sway.x + st.swayV.x * dt, -0.2, 0.2)
        st.sway.y = THREE.MathUtils.clamp(st.sway.y + st.swayV.y * dt, -0.2, 0.2)
        c.ash.rotation.set(0, st.sway.y, st.sway.x)
        // (a long column, heavier and with more leverage, breaks more easily than a short one)
        if (st.accF.length() > 9000 * (1.3 - 0.6 * (c.ashLen / 15))) {
          onBreak(c, st.V)
          st.sway.set(0, 0)
          st.swayV.set(0, 0)
          c.ash.rotation.set(0, 0, 0)
        }
      } else if (st.sway.x || st.sway.y) {
        st.sway.multiplyScalar(Math.exp(-dt * 6))
        if (Math.abs(st.sway.x) + Math.abs(st.sway.y) < 1e-3) st.sway.set(0, 0)
        c.ash.rotation.set(0, st.sway.y, st.sway.x)
      }
      return api.busy
    },
  }
  return api
}

const seg = { across: 0, above: 0 }
/** From a point to a segment seen from above: the distance across, and how high the segment is there. */
function distToSegmentXZ(p, a, b) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)))
  const x = a.x + dx * t
  const z = a.z + dz * t
  seg.across = Math.hypot(p.x - x, p.z - z)
  seg.above = a.y + (b.y - a.y) * t - p.y
  return seg
}
