// The earbuds' opening pose: the plug seated in the player's jack, each part placed where the
// layout wants it, the main cable laid in one loop round the player and the leads out to the buds at
// its lower left, each along a gently waving way, then let fall and settle under gravity on the
// ground, against the player, the ashtray and the lighter.
// Written to src/objects/earbudsPose.js as the render state plus the particles (int16, compact).
//   node tools/settle.mjs [--plot layout.json]   (--plot: the settled layout, for a top-down plot)
import { writeFileSync } from 'fs'
import { Rig, placePlan } from '../src/core/rope.js'
import { collisionData, rigSpec, writeRopeState, ropeStateSize } from '../src/objects/earbudsRig.js'
import { PLUG35 } from '../src/objects/earbudsGeom.js'
import { ashtraySDF } from '../src/objects/ashtray.js'
import { createDeskGround } from '../src/objects/deskGround.js'
import { PLAYER, DESK, FWD, VIEW, deskAt } from '../src/layout.js'
import { PLAYER_PORT } from '../src/objects/playerPort.js'

// ---- the player's and the lighter's boxes (world from local: rotation columns, then position)
const yawM = (yaw, x, y, z) => {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  // three.js makeRotationY: x' = c x + s z, z' = -s x + c z; columns: (c, 0, -s), (0, 1, 0), (s, 0, c)
  return Float64Array.from([c, 0, -s, 0, 1, 0, s, 0, c, x, y, z])
}
const player = { m: yawM(PLAYER.yaw, PLAYER.x, 0, PLAYER.z), half: PLAYER.half, r: PLAYER.r, y0: PLAYER.half[1], reach: 75 }
// (the lighter as it lies: its length along theta, flat on its broad face)
const theta = Math.atan2(FWD[2], FWD[0]) + DESK.lighterTurn
const lighterM = (() => {
  // local y (its length) along (cos t, 0, sin t); local z (its thickness) down; local x across
  const ly = [Math.cos(theta), 0, Math.sin(theta)]
  const lz = [0, -1, 0]
  const lx = [ly[1] * lz[2] - ly[2] * lz[1], ly[2] * lz[0] - ly[0] * lz[2], ly[0] * lz[1] - ly[1] * lz[0]]
  return Float64Array.from([...lx, ...ly, ...lz, DESK.lighter[0], 6, DESK.lighter[2]])
})()
const lighter = { m: lighterM, half: [12, 31, 6], r: 3.5, y0: 0, reach: 40 }
const ground = createDeskGround({ ashtraySDF, boxes: () => [player, lighter] })

// ---- the jack, in the world
const pm = player.m
const toW = (p) => [pm[0] * p[0] + pm[3] * p[1] + pm[6] * p[2] + pm[9], pm[1] * p[0] + pm[4] * p[1] + pm[7] * p[2] + pm[10], pm[2] * p[0] + pm[5] * p[1] + pm[8] * p[2] + pm[11]]
const dirW = (d) => [pm[0] * d[0] + pm[3] * d[1] + pm[6] * d[2], pm[1] * d[0] + pm[4] * d[1] + pm[7] * d[2], pm[2] * d[0] + pm[5] * d[1] + pm[8] * d[2]]
const mouth = toW(PLAYER_PORT.position)
const out = dirW(PLAYER_PORT.direction)
// the plug's cable pin: its face at the jack's mouth, the pin inside (local y 10.5 above the face)
const pinAt = [mouth[0] + out[0] * (PLUG35.faceDist + PLUG35.relief.top), mouth[1], mouth[2] + out[2] * (PLUG35.faceDist + PLUG35.relief.top)]

// ---- where each part lies: in the default view's axes, u to the right, v towards the camera
const at = (u, v, y) => { const p = deskAt(u, v, y); return [p[0], p[1], p[2]] }
const hv = (du, dv) => { const p = deskAt(du, dv); return Math.atan2(p[2], p[0]) } // (a heading from a view direction)
const BODIES = {
  splitter: { at: at(-262, 62, 9), heading: hv(0, -1) },
  bead: { at: at(-262, 42, 10), heading: hv(0, -1) },
  remote: { at: at(-300, -6, 11), heading: hv(-0.5, -0.87) },
  budL: { pin: 'cable', at: at(-330, -58, 15), heading: hv(0.5, 0.87), face: 'outer' },
  budR: { pin: 'cable', at: at(-212, -30, 15), heading: hv(-0.45, 0.89), face: 'inner' },
  plug: { pin: 'cable', at: pinAt, heading: Math.atan2(out[2], out[0]) },
}
// (how many half-waves each chain makes along its way; negative: bowing to the other side)
const DESK_WAVES = { leadL1: 1, leadL2: -1, leadR: -1, main: 2 }
// (each chain's way, in the view's axes, from its start to its end: the main cable from the
// splitter at the player's left down and round under its foot to the plug in the jack; the leads
// up from the splitter in a V, each on its own side of it (the splitter's right hole on the right):
// the right bud's up and to the right, the left one's up to the remote and on to the left bud)
const DESK_ROUTES = {
  leadL1: [],
  leadL2: [],
  leadR: [],
  main: [[-268, 92], [-250, 118], [-212, 127], [-178, 120]],
}
// ---- place, pin the plug in the jack, settle
const t0 = Date.now()
const C = collisionData()
const rig = new Rig(rigSpec(C, { ground, groundTop: 40 }))
placePlan(rig, { bodies: BODIES, routes: {} })
const lengths = []
{
  const pinW = (body, key) => [...rig.pointOf(body, body.pins[key].b, new Float64Array(3))]
  const keyOf = (body, pin) => Object.keys(body.pins).find((k) => body.pins[k] === pin)
  const toUV = (p) => [0.549 * p[0] + 0.836 * p[2], -(0.836 * p[0] - 0.549 * p[2])]
  // Catmull-Rom through the points, resampled evenly
  const curve = (pts, count) => {
    const P = [pts[0], ...pts, pts[pts.length - 1]]
    const dense = []
    for (let i = 1; i < P.length - 2; i++)
      for (let t = 0; t < 1; t += 0.02) {
        const t2 = t * t
        const t3 = t2 * t
        const c = (k) => 0.5 * (2 * P[i][k] + (-P[i - 1][k] + P[i + 1][k]) * t + (2 * P[i - 1][k] - 5 * P[i][k] + 4 * P[i + 1][k] - P[i + 2][k]) * t2 + (-P[i - 1][k] + 3 * P[i][k] - 3 * P[i + 1][k] + P[i + 2][k]) * t3)
        dense.push([c(0), c(1)])
      }
    dense.push(pts[pts.length - 1])
    const cum = [0]
    for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]))
    const L = cum[cum.length - 1]
    const out = []
    let j = 0
    for (let k = 1; k <= count; k++) {
      const s = (k / (count + 1)) * L
      while (cum[j + 1] < s) j++
      const f = (s - cum[j]) / (cum[j + 1] - cum[j] || 1)
      out.push([dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f])
    }
    return { out, L }
  }
  // (the coarse way, made to wave gently side to side until it is as long as the cable, nearly)
  const wavy = (ctrl, amp, waves) => {
    const { out } = curve(ctrl, 400)
    const res = out.map((p, i) => {
      const q = out[Math.min(out.length - 1, i + 1)]
      const r = out[Math.max(0, i - 1)]
      let tx = q[0] - r[0]
      let tv = q[1] - r[1]
      const l = Math.hypot(tx, tv) || 1
      const t = i / (out.length - 1)
      const off = amp * Math.sin(Math.PI * waves * t) * Math.sin(Math.PI * t) ** 0.5
      return [p[0] - (tv / l) * off, p[1] + (tx / l) * off]
    })
    return [ctrl[0], ...res, ctrl[ctrl.length - 1]]
  }
  const lengthOf = (pts) => pts.reduce((acc, p, i) => acc + (i ? Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0)
  for (const ch of rig.chains) {
    const a = toUV(pinW(ch.from.body, keyOf(ch.from.body, ch.from.point)))
    const b = toUV(pinW(ch.to.body, keyOf(ch.to.body, ch.to.point)))
    const ctrl = [a, ...(DESK_ROUTES[ch.name] || []), b]
    const want = 0.96 * (ch.ids.length + 1) * rig.spec.cable.spacing
    const waves = DESK_WAVES[ch.name] || 3
    let lo = 0
    let hi = 120
    for (let it = 0; it < 40; it++) {
      const mid = (lo + hi) / 2
      if (lengthOf(curve(wavy(ctrl, mid, waves), 300).out) < want) lo = mid
      else hi = mid
    }
    const { out, L } = curve(wavy(ctrl, lo, waves), ch.ids.length)
    lengths.push(`${ch.name} ${L.toFixed(0)}/${(ch.ids.length + 1) * rig.spec.cable.spacing}`)
    rig.placeChain(ch, out.map(([u, v]) => deskAt(u, v, 6)))
  }
}
const plug = rig.byName.plug
for (const i of plug.f) rig.w[i] = 0
rig.release()
let n = 0
while (!rig.asleep && n < 120 * 25) {
  rig.step()
  n++
}
const st = writeRopeState(rig, new Float32Array(ropeStateSize(rig)), new Float64Array(4))
// (where it all ended up, for a look: the parts' centres)
const where = rig.bodies.map((b) => `${b.name} ${b.c.map((v) => v.toFixed(0)).join(',')}`).join(' | ')
// the particles too (so the rig starts exactly here): positions, int16 at 1/50 mm
const q = new Int16Array(st.length)
for (let i = 0; i < st.length; i++) q[i] = Math.round(st[i] * (i < rig.bodies.length * 12 && i % 12 < 9 ? 30000 : 50))
const xq = new Int16Array(rig.x.length)
for (let i = 0; i < rig.x.length; i++) xq[i] = Math.round(rig.x[i] * 50)
writeFileSync(
  new URL('../src/objects/earbudsPose.js', import.meta.url),
  `// Generated by tools/settle.mjs: the earbuds' settled opening pose on the desk (plug in the jack).
// state: the render state (int16: 1/30000 for rotations, 1/50 mm otherwise); x: every particle (1/50 mm).
export const POSE = ${JSON.stringify({ n: st.length, state: Buffer.from(q.buffer).toString('base64'), np: rig.x.length, x: Buffer.from(xq.buffer).toString('base64') })}
const unpack = (b64, n) => {
  const bin = atob(b64)
  const q = new Int16Array(n)
  for (let i = 0; i < n; i++) q[i] = ((bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8)) << 16) >> 16
  return q
}
/** The render state (Float32Array). */
export function poseState(bodies = 6) {
  const q = unpack(POSE.state, POSE.n)
  const st = new Float32Array(POSE.n)
  for (let i = 0; i < POSE.n; i++) st[i] = q[i] / (i < bodies * 12 && i % 12 < 9 ? 30000 : 50)
  return st
}
/** The particles' positions (Float64Array, mm). */
export function poseParticles() {
  const q = unpack(POSE.x, POSE.np)
  const x = new Float64Array(POSE.np)
  for (let i = 0; i < POSE.np; i++) x[i] = q[i] / 50
  return x
}
`,
)
// (with --plot: the layout as it settled, and the default view's footprint on the table: its corner
// rays down to y = 0)
const plotAt = process.argv.indexOf('--plot')
if (plotAt > 0) {
  // (the wide view's frame on the ground, for the plot)
  const [su, sv] = VIEW.wide.span
  const c = VIEW.wide.at
  const view = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => {
    const p = deskAt(a * su * 0.5, b * sv * 0.5)
    return [c[0] + p[0], c[2] + p[2]]
  })
  writeFileSync(process.argv[plotAt + 1], JSON.stringify({ x: Array.from(rig.x), chains: rig.chains.map((c) => c.ids), bodies: rig.bodies.map((b) => ({ name: b.name, c: Array.from(b.c) })), player: Array.from(player.m), lighter: Array.from(lighter.m), mouth, view }))
}
console.log(`lengths ${lengths.join(', ')}; chain stretch ${rig.chainStretch().map((v) => v.toFixed(3)).join(' ')}`)
console.log(`settled in ${(n / 120).toFixed(2)} s sim (${Date.now() - t0} ms), asleep ${rig.asleep}\n${where}`)
