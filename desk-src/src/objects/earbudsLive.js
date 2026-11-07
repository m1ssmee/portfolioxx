// The earbuds on the desk, alive: their physics (core/rope.js, stepped by the scene's one physics
// scheduler), their pose drawn from it (objects/earbuds.js), picking them up (any part, or the
// cable anywhere along it, through core/grab.js), and the plug in the player's headphone jack:
//   pull the plug out (by the plug itself, or by the cable hard enough) and the music pauses; bring
//   it back to the jack and it seats itself, pointing in, and the music plays on.
import * as THREE from 'three'
import { Rig, STEP } from '../core/rope.js'
import { rigSpec, writeRopeState, ropeStateSize } from './earbudsRig.js'
import { BODY_ORDER, PLUG35 } from './earbudsGeom.js'
import { poseParticles, poseState } from './earbudsPose.js'

const LIFT = 9 // (mm: a grabbed cable or part comes up off the desk this much)
// (a plug held by a point turns about it with its heavy pin trailing, so it would reach the jack
// cable first: instead, the plug brought within SNAP of the jack's mouth, from in front of it, or
// held and aimed at the mouth (it is carried lifted, so the hand's aim says more than where it
// is), seats itself. Once out, it has to have been AWAY from the jack before it can snap in again)
const SNAP = 12 // (mm: from the mouth to the nearest point of the plug's axis)
const SNAP_AIM = 8 // (mm: held, the pointer's line passing this near the mouth: aimed at the jack)
const AWAY = 25 // (mm)
const PULL = 0.55 // (the cable stretched this much at the plug, it comes out)
const SETTLE_MS = 500 // (after seating, the cable's pull is not counted while it settles)
const SEAT_S = 0.2 // (seating: the plug glides into the jack over this long, turning as it goes)

/**
 * visual: createEarbudsAsync(...) (parts, cable, applyState); collision: earbudsRig.collisionData();
 * ground: objects/deskGround.js; jack: { mouth: Vector3, out: Vector3 } (world: the jack's mouth and
 * the way out of it); onPlug(plugged); onTap(part)
 */
export function createEarbudsLive({ visual, collision, ground, jack, onPlug, onTap }) {
  const rig = new Rig(rigSpec(collision, { ground, groundTop: 40 }))
  // the settled opening pose (tools/settle.mjs), at rest
  const x0 = poseParticles()
  if (x0.length === rig.x.length) {
    rig.x.set(x0)
    rig.p.set(x0)
    // (each part's rotation as it was: the shape fit refines a rotation, it does not find one
    // from nothing)
    const st0 = poseState(rig.bodies.length)
    rig.bodies.forEach((b, k) => rig.setFrame(b, st0.subarray(k * 12 + 9, k * 12 + 12), st0.subarray(k * 12, k * 12 + 9)))
  }
  for (let it = 0; it < 4; it++) for (const b of rig.bodies) rig.matchShape(b)
  const plug = rig.byName.plug
  const main = rig.chains.find((c) => c.name === 'main')
  let plugged = true
  const pin = () => {
    for (const i of plug.f) rig.w[i] = 0
  }
  const unpin = () => {
    for (const i of plug.f) rig.w[i] = rig.w0[i]
  }
  pin()
  rig.asleep = true

  const state = new Float32Array(ropeStateSize(rig))
  const tv = new Float64Array(4)
  let dirty = true
  /** Drawn as it is between its last two steps (alpha: core/physics.js). */
  function draw(alpha = 1) {
    writeRopeState(rig.blended(alpha), state, tv)
    visual.applyState(state)
  }
  draw()

  // ---- the seated pose: the plug's face at the jack's mouth, its pin in the jack
  const seatR = new Float64Array(9)
  const seatC = new Float64Array(3)
  {
    // local +y out of the jack, local +z up (any square to it: it is round)
    const y = jack.out
    const z = new THREE.Vector3(0, 1, 0)
    if (Math.abs(y.y) > 0.9) z.set(1, 0, 0)
    const x = new THREE.Vector3().crossVectors(y, z).normalize()
    z.crossVectors(x, y).normalize()
    seatR.set([x.x, x.y, x.z, y.x, y.y, y.z, z.x, z.y, z.z])
    // origin = mouth + faceDist out; the centre of mass = origin + R com
    const o = jack.mouth.clone().addScaledVector(y, PLUG35.faceDist)
    const com = plug.com
    seatC[0] = o.x + seatR[0] * com[0] + seatR[3] * com[1] + seatR[6] * com[2]
    seatC[1] = o.y + seatR[1] * com[0] + seatR[4] * com[1] + seatR[7] * com[2]
    seatC[2] = o.z + seatR[2] * com[0] + seatR[5] * com[1] + seatR[8] * com[2]
  }
  const seatQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(seatR[0], seatR[3], seatR[6], 0, seatR[1], seatR[4], seatR[7], 0, seatR[2], seatR[5], seatR[8], 0, 0, 0, 0, 1))
  // (the glide in: from where the plug was to the seat, a step at a time)
  let seating = null // { t, c0, q0 }
  const gq = new THREE.Quaternion()
  const gm = new THREE.Matrix4()
  const gR = new Float64Array(9)
  const gC = new Float64Array(3)
  function seatStep() {
    seating.t = Math.min(1, seating.t + STEP / SEAT_S)
    const t = seating.t
    const e = t * t * (3 - 2 * t)
    for (let a = 0; a < 3; a++) gC[a] = seating.c0[a] + (seatC[a] - seating.c0[a]) * e
    gq.slerpQuaternions(seating.q0, seatQ, e)
    const m = gm.makeRotationFromQuaternion(gq).elements
    gR.set([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]])
    rig.placeBody(plug, gC, gR)
    if (t >= 1) seating = null
  }
  const pv = new Float64Array(3)
  const top = new THREE.Vector3()
  const tip = new THREE.Vector3()
  const near = new THREE.Vector3()
  const seg = new THREE.Line3(top, tip)
  let armed = false // (may it snap in: only once it has been away from the jack)
  let wasAwake = false
  let seatedAt = 0
  function setPlugged(on) {
    if (plugged === on) return
    plugged = on
    if (on) {
      // seated: the plug glides into the jack (seatStep, each step), turning as it goes; the cable
      // follows it
      pin()
      const q = plug.quat
      seating = { t: 0, c0: Float64Array.from(plug.c), q0: new THREE.Quaternion(q[0], q[1], q[2], q[3]) }
      seatedAt = performance.now()
    } else {
      seating = null
      unpin()
      armed = false
    }
    rig.wake()
    onPlug(on)
  }
  /** How far the plug's axis (the cable's end to the pin's tip) comes to the jack's mouth; 'near' the point. */
  function plugToMouth() {
    const R = plug.R
    const c = plug.c
    const com = plug.com
    const at = (y, out) => out.set(c[0] + R[3] * (y - com[1]) - R[0] * com[0] - R[6] * com[2], c[1] + R[4] * (y - com[1]) - R[1] * com[0] - R[7] * com[2], c[2] + R[5] * (y - com[1]) - R[2] * com[0] - R[8] * com[2])
    at(PLUG35.relief.top, top)
    at(-PLUG35.tipDist, tip)
    seg.closestPointToPoint(jack.mouth, true, near)
    return near.distanceTo(jack.mouth)
  }

  // ---- grabbing: a part (by its meshes) or the cable (by its segments, generous for a finger)
  const bodyOfMesh = new Map()
  for (const name of BODY_ORDER) visual.parts[name].traverse((o) => o.isMesh && bodyOfMesh.set(o, rig.byName[name]))
  const cableProxy = new THREE.Object3D()
  cableProxy.name = 'cable'
  const segA = new THREE.Vector3()
  const segB = new THREE.Vector3()
  const onRay = new THREE.Vector3()
  const onSeg = new THREE.Vector3()
  cableProxy.raycast = (raycaster, hits) => {
    const ray = raycaster.ray
    const x = rig.x
    let best = Infinity
    let bi = -1
    const tol = 2.6 // (mm round the 1.1 mm cable)
    for (const ch of rig.chains) {
      const ids = ch.ids
      for (let k = 0; k + 1 < ids.length; k++) {
        const a = ids[k] * 3
        const b = ids[k + 1] * 3
        segA.set(x[a], x[a + 1], x[a + 2])
        segB.set(x[b], x[b + 1], x[b + 2])
        const d2 = ray.distanceSqToSegment(segA, segB, onRay, onSeg)
        if (d2 > tol * tol) continue
        const t = onRay.distanceTo(ray.origin)
        if (t < best) {
          best = t
          bi = segA.distanceToSquared(onSeg) < segB.distanceToSquared(onSeg) ? ids[k] : ids[k + 1]
        }
      }
    }
    if (bi >= 0) hits.push({ distance: best, point: ray.at(best, new THREE.Vector3()), object: cableProxy, index: bi })
  }
  const meshes = [...bodyOfMesh.keys(), cableProxy]
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const target = new Float64Array(3)
  const tw = new THREE.Vector3()
  const grabOff = new THREE.Vector3()
  let grabbed = null // { body } or { i }
  let pullFrom = null // (the plug held while it is in the jack: where the hand began to pull)
  let pulling = false
  const aimRay = new THREE.Ray()
  let aimed = false
  const R3 = new THREE.Matrix3()

  const item = {
    meshes,
    canGrab: () => true,
    pick(hit) {
      const y = hit.point.y + LIFT
      plane.constant = -y
      grabOff.set(0, 0, 0)
      target[0] = hit.point.x
      target[1] = y
      target[2] = hit.point.z
      if (hit.object === cableProxy) {
        grabbed = { i: hit.index }
        rig.grab({ i: hit.index }, target)
      } else {
        const body = bodyOfMesh.get(hit.object)
        // the point in the body's own frame: R^T (p - c) + com
        const R = body.R
        R3.set(R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]).transpose()
        tw.set(hit.point.x - body.c[0], hit.point.y - body.c[1], hit.point.z - body.c[2]).applyMatrix3(R3)
        const s = [tw.x + body.com[0], tw.y + body.com[1], tw.z + body.com[2]]
        grabbed = { body }
        pulling = body === plug && plugged
        pullFrom = null
        // (picked up out of the jack's reach: it may snap in when brought there)
        if (body === plug && !plugged && plugToMouth() > SNAP) armed = true
        rig.grab({ body, s }, target)
      }
      dirty = true
    },
    aim(ray) {
      if (!ray.intersectPlane(plane, tw)) return
      // (inside the lit desk: a soft bound well past the objects)
      const r = Math.hypot(tw.x + 90, tw.z + 90)
      if (r > 330) {
        const k = (330 + 60 * Math.tanh((r - 330) / 60)) / r
        tw.x = -90 + (tw.x + 90) * k
        tw.z = -90 + (tw.z + 90) * k
      }
      target[0] = tw.x
      target[1] = tw.y
      target[2] = tw.z
      // the plug, held by itself: out of the jack once the hand has drawn it 5 mm away
      if (pulling && plugged) {
        if (!pullFrom) pullFrom = tw.clone()
        else if (tw.distanceTo(pullFrom) > 5) setPlugged(false)
      }
      aimRay.copy(ray)
      aimed = true
      rig.moveGrab(target)
      dirty = true
    },
    twist() {},
    release() {
      rig.release()
      grabbed = null
      pulling = false
      pullFrom = null
      aimed = false
      dirty = true
    },
    home() {
      item.release()
    },
    cancel() {
      item.release()
    },
    onTap(hit) {
      const body = bodyOfMesh.get(hit.object)
      if (body) onTap?.(body.name)
    },
  }

  return {
    rig,
    item,
    get plugged() {
      return plugged
    },
    /** For the physics scheduler. */
    physics: {
      awake: () => !rig.asleep,
      step: () => {
        rig.step()
        if (seating) seatStep()
      },
    },
    /** Each frame: the pose drawn (alpha: core/physics.js), the plug watched. Returns true while anything of it moved. */
    update(alpha = 1) {
      // (one more frame once it falls asleep: drawn where it came to rest)
      const moving = !rig.asleep || wasAwake
      wasAwake = !rig.asleep
      if (plugged) {
        // pulled by the cable hard enough, the plug comes out
        if (performance.now() - seatedAt > SETTLE_MS) {
          const ids = main.ids
          rig.pointOf(plug, main.to.point.b, pv, 0)
          const j = ids[ids.length - 1] * 3
          const d = Math.hypot(rig.x[j] - pv[0], rig.x[j + 1] - pv[1], rig.x[j + 2] - pv[2])
          if (d > main.rest * (1 + PULL)) setPlugged(false)
        }
      } else if (!rig.asleep) {
        // brought to the jack (from in front of it, once it has been away): it seats itself
        const d = plugToMouth()
        const held = grabbed && grabbed.body === plug
        if (d > AWAY) armed = true
        else if (armed && ((d < SNAP && near.sub(jack.mouth).dot(jack.out) > -4) || (held && aimed && aimRay.distanceToPoint(jack.mouth) < SNAP_AIM))) {
          // (let go at once: the plug glides into the jack by itself)
          if (grabbed) rig.release(true)
          grabbed = null
          setPlugged(true)
        }
      }
      if (moving || dirty) {
        draw(alpha)
        dirty = false
        return true
      }
      return false
    },
    /** Where the focus closes in: between the two buds. */
    focusCenter(out) {
      const a = rig.byName.budL.c
      const b = rig.byName.budR.c
      const r = rig.byName.remote.c
      return out.set((a[0] + b[0] + r[0]) / 3, (a[1] + b[1] + r[1]) / 3 + 4, (a[2] + b[2] + r[2]) / 3)
    },
    plug: () => setPlugged(true),
    unplug: () => setPlugged(false),
  }
}
