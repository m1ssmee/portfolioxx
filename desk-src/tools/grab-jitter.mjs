// How smoothly the earbuds move when they are picked up, carried and let go: the scene's own rig
// (core/rope.js) on the scene's ground, from the settled opening pose, the plug in the jack, stepped
// by the same fixed 120 Hz scheduler from 60 Hz frames with a little frame-time noise. A pointer is
// replayed as the browser delivers it (one coalesced move per frame, at uneven times), through the
// same smoothing core/grab.js gives it. Each scenario reports, per drawn frame:
//   part     the held part's (or point's) wobble about its own smooth path, rms/max, mm: the
//            high-frequency part of its path (a steady drag, however fast, is ~0; rattle shows)
//   turn     the same for its rotation, degrees
//   cable    the largest wobble of any cable particle, held and after the release, mm
//   rest     after the release: how long until the rig sleeps, and the largest step any particle
//            makes per frame from 1.5 s on, mm
//   node tools/grab-jitter.mjs [--legacy] [--steady] [--steps]   (--legacy: the pointer straight to
//   the rig, per frame, and each frame drawn as the last step left it, as the scene did before;
//   --steady: frames exactly 1/60 s, as vsync gives them (the default's frame-time noise alone reads
//   as wobble on anything moving fast); --steps: every 120 Hz step measured as it left the rig, the
//   physics itself, no drawing; ONLY=name: one scenario)
import { Rig } from '../src/core/rope.js'
import { collisionData, rigSpec } from '../src/objects/earbudsRig.js'
import { ashtraySDF } from '../src/objects/ashtray.js'
import { createDeskGround } from '../src/objects/deskGround.js'
import { poseParticles, poseState } from '../src/objects/earbudsPose.js'
import { PLAYER } from '../src/layout.js'

const LEGACY = process.argv.includes('--legacy')
const STEADY = process.argv.includes('--steady')
const STEPS = process.argv.includes('--steps')
const ONLY = process.env.ONLY // (one scenario, by the start of its name)
const LIFT = 9
const POINTER_TAU = 0.12 // (core/grab.js)
const yawM = (yaw, x, y, z) => {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return Float64Array.from([c, 0, -s, 0, 1, 0, s, 0, c, x, y, z])
}
const player = { m: yawM(PLAYER.yaw, PLAYER.x, 0, PLAYER.z), half: PLAYER.half, r: PLAYER.r, y0: PLAYER.half[1], reach: 75 }
const ground = createDeskGround({ ashtraySDF, boxes: () => [player] })

function freshRig() {
  const rig = new Rig(rigSpec(collisionData(), { ground, groundTop: 40 }))
  rig.x.set(poseParticles())
  rig.p.set(rig.x)
  const st0 = poseState(rig.bodies.length)
  rig.bodies.forEach((b, k) => rig.setFrame(b, st0.subarray(k * 12 + 9, k * 12 + 12), st0.subarray(k * 12, k * 12 + 9)))
  for (let it = 0; it < 4; it++) for (const b of rig.bodies) rig.matchShape(b)
  for (const i of rig.byName.plug.f) rig.w[i] = 0
  rig.asleep = true
  return rig
}

// a deterministic noise for frame times
let seed = 7
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

/**
 * One scenario: what is grabbed, and the pointer's path (a function of time, offset from where it
 * was grabbed, mm on the grab plane), its length (s), then held still, released at `releaseAt` and
 * watched until `end`.
 */
function scenario(name, { what, path, releaseAt, end }) {
  if (ONLY && !name.startsWith(ONLY)) return
  const rig = freshRig()
  let acc = 0
  let t = 0
  const quat = (R) => {
    // (column-major R to a quaternion, for the turn measure)
    const [m00, m10, m20, m01, m11, m21, m02, m12, m22] = R
    const tr = m00 + m11 + m22
    let w, x, y, z
    if (tr > 0) {
      const s = 0.5 / Math.sqrt(tr + 1)
      w = 0.25 / s
      x = (m21 - m12) * s
      y = (m02 - m20) * s
      z = (m10 - m01) * s
    } else if (m00 > m11 && m00 > m22) {
      const s = 2 * Math.sqrt(1 + m00 - m11 - m22)
      w = (m21 - m12) / s
      x = 0.25 * s
      y = (m01 + m10) / s
      z = (m02 + m20) / s
    } else if (m11 > m22) {
      const s = 2 * Math.sqrt(1 + m11 - m00 - m22)
      w = (m02 - m20) / s
      x = (m01 + m10) / s
      y = 0.25 * s
      z = (m12 + m21) / s
    } else {
      const s = 2 * Math.sqrt(1 + m22 - m00 - m11)
      w = (m10 - m01) / s
      x = (m02 + m20) / s
      y = (m12 + m21) / s
      z = 0.25 * s
    }
    return [x, y, z, w]
  }
  // grab
  let body = null
  let start
  if (what.body) {
    body = rig.byName[what.body]
    const c = body.c
    const R = body.R
    const hit = [c[0], c[1] + 4, c[2]]
    // the point in the body's own frame: R^T (p - c) + com
    const d = [hit[0] - c[0], hit[1] - c[1], hit[2] - c[2]]
    const s = [0, 1, 2].map((k) => R[k * 3] * d[0] + R[k * 3 + 1] * d[1] + R[k * 3 + 2] * d[2] + body.com[k])
    start = [hit[0], hit[1] + LIFT, hit[2]]
    rig.grab({ body, s }, start)
  } else {
    const ch = rig.chains.find((c) => c.name === what.chain)
    const i = ch.ids[Math.floor(ch.ids.length * what.at)]
    start = [rig.x[i * 3], rig.x[i * 3 + 1] + LIFT, rig.x[i * 3 + 2]]
    rig.grab({ i }, start)
    what.i = i
  }
  const target = start.slice()
  const frames = []
  let released = false
  let sleptAt = -1
  while (t < end) {
    const dt = STEPS ? 1 / 120 : STEADY ? 1 / 60 : (1 / 60) * (1 + (rand() - 0.5) * 0.25)
    t += dt
    // the pointer, as the browser hands it over (one move per frame, sampled a little before it)
    if (!released) {
      const off = path(Math.max(0, t - rand() * 0.008))
      const raw = [start[0] + off[0], start[1], start[2] + off[1]]
      if (LEGACY) target.splice(0, 3, ...raw)
      else {
        // (core/grab.js: the pointer eased, exponentially, once a frame)
        const k = 1 - Math.exp(-dt / POINTER_TAU)
        for (let a = 0; a < 3; a++) target[a] += (raw[a] - target[a]) * k
      }
      rig.moveGrab(target)
      if (t >= releaseAt) {
        rig.release()
        released = true
      }
    }
    // the scheduler (core/physics.js)
    acc += Math.min(dt, 0.05)
    let steps = 0
    while (acc >= 1 / 120 && steps < 6) {
      if (!rig.asleep) rig.step()
      acc -= 1 / 120
      steps++
    }
    if (rig.asleep && released && sleptAt < 0) sleptAt = t - releaseAt
    // (as it is drawn: between the last two steps, or, --legacy, as the last step left it)
    const V = LEGACY || STEPS ? rig : rig.blended(acc * 120)
    const vb = body ? V.bodies[body.index] : null
    const P = vb ? Array.from(vb.c) : [V.x[what.i * 3], V.x[what.i * 3 + 1], V.x[what.i * 3 + 2]]
    frames.push({ t, P, q: vb ? quat(vb.R) : null, x: Float64Array.from(V.x), released })
  }
  // measures: the high-frequency part of each path (a 4th-order difference: 1 for a wobble that
  // turns about every frame, about 0 for any smooth motion, however fast)
  const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / Math.max(1, a.length))
  const hp = (f, g) => (f(0) - 4 * f(1) + 6 * f(2) - 4 * f(3) + f(4)) / 16
  const noise = []
  const turn = []
  const cable = []
  const rest = []
  let restStep = 0
  for (let k = 2; k + 2 < frames.length; k++) {
    const F = frames.slice(k - 2, k + 3)
    const b = F[2]
    const held = F.every((f) => !f.released)
    const after = F.every((f) => f.released)
    if (held) {
      noise.push(Math.hypot(...[0, 1, 2].map((i) => hp((n) => F[n].P[i]))))
      if (b.q) {
        // (the quaternions on one side, then the same measure on their components)
        const Q = F.map((f) => (f.q[0] * b.q[0] + f.q[1] * b.q[1] + f.q[2] * b.q[2] + f.q[3] * b.q[3] < 0 ? f.q.map((v) => -v) : f.q))
        turn.push((2 * Math.hypot(...[0, 1, 2, 3].map((i) => hp((n) => Q[n][i]))) * 180) / Math.PI)
      }
    }
    if (held || after) {
      let worst = 0
      for (const i of rig.cable) {
        const j = i * 3
        const d = Math.hypot(...[0, 1, 2].map((a) => hp((n) => F[n].x[j + a])))
        if (d > worst) worst = d
      }
      ;(held ? cable : rest).push(worst)
    }
    if (after && b.t - releaseAt > 1.5) for (let i = 0; i < b.x.length; i++) restStep = Math.max(restStep, Math.abs(b.x[i] - F[1].x[i]))
  }
  const max = (a) => a.reduce((m, v) => Math.max(m, v), 0)
  console.log(
    `${name.padEnd(22)} held: part ${rms(noise).toFixed(3)}/${max(noise).toFixed(3)} mm, turn ${rms(turn).toFixed(3)}/${max(turn).toFixed(2)} deg, cable ${rms(cable).toFixed(3)}/${max(cable).toFixed(3)} mm | let go: cable ${rms(rest).toFixed(3)}/${max(rest).toFixed(3)} mm, asleep ${sleptAt < 0 ? 'no' : sleptAt.toFixed(2) + ' s'}, from 1.5 s <= ${restStep.toFixed(3)} mm/frame`,
  )
  return { noise, turn, cable, sleptAt, restStep }
}

const line = (len, dur, dir = [1, 0.35]) => (t) => {
  const l = Math.hypot(...dir)
  const s = Math.min(1, t / dur) * len
  return [(dir[0] / l) * s, (dir[1] / l) * s]
}
const hold = 1.0
console.log(`${LEGACY ? 'pointer straight to the rig, per frame' : 'pointer eased (core/grab.js)'}${STEPS ? ', every physics step' : STEADY ? ', steady 60 Hz frames' : ''}`)
scenario('bud, held still', { what: { body: 'budL' }, path: () => [0, 0], releaseAt: 2.0, end: 5.5 })
scenario('bud, slow (40 mm/s)', { what: { body: 'budL' }, path: line(60, 1.5), releaseAt: 1.5 + hold, end: 6 })
scenario('bud, quick (500 mm/s)', { what: { body: 'budL' }, path: line(200, 0.4, [-1, 0.5]), releaseAt: 0.4 + hold, end: 5.5 })
scenario('remote, slow', { what: { body: 'remote' }, path: line(50, 1.2, [0.3, 1]), releaseAt: 1.2 + hold, end: 5.5 })
scenario('cable touched', { what: { chain: 'main', at: 0.5 }, path: line(20, 0.8, [0, 1]), releaseAt: 0.8 + 0.5, end: 5 })
