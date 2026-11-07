// The earbuds as the physics sees them (core/rope.js): each part's collision shape (a distance grid
// for the cable and the other parts, and points over its surface for the desk), its mass and
// inertia, the pins the cable is tied to, and the four chains. No three.js here: it also runs
// under Node, to settle the opening pose (tools/settle.mjs).
import { meshSDF, len2, len3, norm, sdEllipsoid, sdEllipse2, roundExtrude, sdRoundCone } from '../core/sdf.js'
import { BUD, REMOTE, REMOTE_CAP, SPLITTER, BEAD, CABLE, SPACING, budSDF, stemAt, fromFrame, plugBody, plugCollide35, PLUG35_COLLIDE_BOUNDS } from './earbudsGeom.js'

// ---- what each part collides with: its shell, plus the bits that stand off it
const budTipA = fromFrame(BUD.nozzle.frame, 0, 0, 6.0)
const budTipB = fromFrame(BUD.nozzle.frame, 0, 0, BUD.nozzle.tip.front - 1.4)
const bootA = stemAt(BUD.boot.start).p
const bootB = stemAt(BUD.boot.start + BUD.boot.len).p
/** The earbud: the shell, its silicone tip and its boot. */
function budCollide(x, y, z) {
  let d = budSDF(x, y, z)
  d = Math.min(d, sdRoundCone(x, y, z, ...budTipA, ...budTipB, BUD.nozzle.tip.radius - 0.08, 2.75))
  d = Math.min(d, sdRoundCone(x, y, z, ...bootA, ...bootB, 1.45, 1.15))
  return d
}
const BUD_COLLIDE_BOUNDS = [-8.6, -27.6, -12.0, 15.6, 10.0, 12.8]
function remoteCollide(x, y, z) {
  const R = REMOTE
  let d = roundExtrude(sdEllipse2(x, z, R.rx, R.rz), Math.abs(y) - R.body, R.edge)
  const ay = Math.abs(y)
  d = Math.min(d, sdEllipsoid(x, ay - R.body, z, R.rx - 0.1, 2.9, R.rz - 0.1))
  d = Math.min(d, roundExtrude(len2(x, z) - 1.55, Math.abs(ay - 14.6) - 1.4, 0.4))
  return d
}
const REMOTE_COLLIDE_BOUNDS = [-4.8, -16.8, -3.6, 4.8, 16.8, 3.6]
const splitterCollide = (x, y, z) => roundExtrude(len2(x, z) - SPLITTER.r, Math.abs(y) - (SPLITTER.half + SPLITTER.cap), 0.9)
const SPLITTER_COLLIDE_BOUNDS = [-3.6, -7.2, -3.6, 3.6, 7.2, 3.6]
const beadCollide = (x, y, z) => roundExtrude(sdEllipse2(x, z, BEAD.rx, BEAD.rz), Math.abs(y) - BEAD.half, 0.7)
const BEAD_COLLIDE_BOUNDS = [-4.0, -3.0, -2.8, 4.0, 3.0, 2.8]

/** The distance field sampled on a grid (cell h), for fast lookups in the physics. */
function sdfGrid(sdf, bounds, h) {
  const [x0, y0, z0, x1, y1, z1] = bounds
  const nx = Math.ceil((x1 - x0) / h) + 1
  const ny = Math.ceil((y1 - y0) / h) + 1
  const nz = Math.ceil((z1 - z0) / h) + 1
  const data = new Float32Array(nx * ny * nz)
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) data[i + nx * (j + ny * k)] = sdf(x0 + i * h, y0 + j * h, z0 + k * h)
  return { o: [x0, y0, z0], h, n: [nx, ny, nz], data }
}
/** Points spread evenly over a part's surface (about `spacing` apart): what touches the desk. */
function surfacePoints(sdf, bounds, spacing) {
  const m = meshSDF(sdf, bounds, Math.min(0.35, spacing / 3), { aoStrength: 0 })
  const P = m.positions
  const n = P.length / 3
  const keep = []
  const dist = new Float64Array(n).fill(Infinity)
  let cur = 0
  for (let i = 1; i < n; i++) if (P[i * 3 + 1] < P[cur * 3 + 1]) cur = i
  for (;;) {
    keep.push(P[cur * 3], P[cur * 3 + 1], P[cur * 3 + 2])
    let best = -1
    let bi = cur
    for (let i = 0; i < n; i++) {
      const d = len3(P[i * 3] - P[cur * 3], P[i * 3 + 1] - P[cur * 3 + 1], P[i * 3 + 2] - P[cur * 3 + 2]) ** 2
      if (d < dist[i]) dist[i] = d
      if (dist[i] > best) {
        best = dist[i]
        bi = i
      }
    }
    if (Math.sqrt(best) < spacing) break
    cur = bi
  }
  return new Float32Array(keep)
}
/** Everything the physics needs to know about each part's shape (made in the worker). */
export function collisionData() {
  const g = (sdf, b, h, sp) => ({ grid: sdfGrid(sdf, b, h), points: surfacePoints(sdf, b, sp) })
  return {
    bud: g(budCollide, BUD_COLLIDE_BOUNDS, 0.45, 2.0),
    remote: g(remoteCollide, REMOTE_COLLIDE_BOUNDS, 0.4, 2.0),
    splitter: g(splitterCollide, SPLITTER_COLLIDE_BOUNDS, 0.35, 1.6),
    bead: g(beadCollide, BEAD_COLLIDE_BOUNDS, 0.3, 1.4),
    plug: g(plugCollide35, PLUG35_COLLIDE_BOUNDS, 0.4, 1.9),
  }
}

/** The rig: parts, chains (the original's lengths), the cable; and what it all lies on. */
export function rigSpec(C, { ground, groundTop }) {
  const exit = stemAt(BUD.boot.start + BUD.boot.len).p
  const bud = (mirror) => {
    const m = mirror ? -1 : 1
    return {
      mass: 4.2,
      com: [0.9 * m, -2.1, 0.2],
      half: [4.4, 7.6, 5.4],
      mirror,
      shape: C.bud,
      pins: { cable: { p: [exit[0] * m, exit[1], exit[2]], dir: BUD.stem.dir } },
    }
  }
  return {
    cable: { ...CABLE, spacing: SPACING },
    selfCollision: true,
    ground,
    groundTop,
    bodies: {
      budL: bud(false),
      budR: bud(true),
      remote: {
        mass: 2.4,
        com: [0, 0, 0],
        half: [2.4, 9.5, 1.6],
        shape: C.remote,
        pins: { top: { p: [0, REMOTE_CAP.to, 0], dir: [0, 1, 0] }, bottom: { p: [0, -REMOTE_CAP.to, 0], dir: [0, -1, 0] } },
      },
      splitter: {
        mass: 1.4,
        com: [0, 0, 0],
        half: [1.8, 4.0, 1.8],
        shape: C.splitter,
        pins: {
          left: { p: [-SPLITTER.hole, SPLITTER.half + SPLITTER.cap - 0.2, 0], dir: norm(-0.2, 1, 0) },
          right: { p: [SPLITTER.hole, SPLITTER.half + SPLITTER.cap - 0.2, 0], dir: norm(0.2, 1, 0) },
          main: { p: [0, -(SPLITTER.half + SPLITTER.cap - 0.2), 0], dir: [0, -1, 0] },
        },
      },
      bead: {
        mass: 0.5,
        com: [0, 0, 0],
        half: [2.0, 1.4, 1.2],
        shape: C.bead,
        pins: { left: { p: [-BEAD.hole, 0, 0] }, right: { p: [BEAD.hole, 0, 0] } },
      },
      plug: { ...plugBody, shape: C.plug },
    },
    chains: [
      // (product-shot lengths, not a real cable's: laid round the player in a few open curves,
      // never a pile)
      { name: 'leadL1', from: ['budL', 'cable'], to: ['remote', 'top'], length: 70 },
      { name: 'leadL2', from: ['remote', 'bottom'], to: ['splitter', 'left'], length: 88, bead: { body: 'bead', hole: 'left', at: 27 } },
      { name: 'leadR', from: ['budR', 'cable'], to: ['splitter', 'right'], length: 125, bead: { body: 'bead', hole: 'right', at: 27 } },
      { name: 'main', from: ['splitter', 'main'], to: ['plug', 'cable'], length: 185 },
    ],
  }
}

/** The rig's render state into `out` (no allocation): each part's R and centre, each chain's tube points. */
export function writeRopeState(rig, out, tv) {
  let o = 0
  for (const b of rig.bodies) {
    for (let k = 0; k < 9; k++) out[o++] = b.R[k]
    out[o++] = b.c[0]
    out[o++] = b.c[1]
    out[o++] = b.c[2]
  }
  const x = rig.x
  for (const ch of rig.chains) {
    o = pinPoint(rig, ch.from, 1.6, out, o, tv)
    o = pinPoint(rig, ch.from, 0, out, o, tv)
    const ids = ch.ids
    for (let k = 0; k < ids.length; k++) {
      const i = ids[k] * 3
      out[o++] = x[i]
      out[o++] = x[i + 1]
      out[o++] = x[i + 2]
    }
    o = pinPoint(rig, ch.to, 0, out, o, tv)
    o = pinPoint(rig, ch.to, 1.6, out, o, tv)
  }
  return out
}
// (a chain's end, run `inset` mm into the part it leaves)
function pinPoint(rig, end, inset, out, o, tv) {
  const b = end.body
  rig.pointOf(b, end.point.b, tv, 0)
  const d = end.point.dir
  const R = b.R
  out[o] = tv[0] - (R[0] * d[0] + R[3] * d[1] + R[6] * d[2]) * inset
  out[o + 1] = tv[1] - (R[1] * d[0] + R[4] * d[1] + R[7] * d[2]) * inset
  out[o + 2] = tv[2] - (R[2] * d[0] + R[5] * d[1] + R[8] * d[2]) * inset
  return o + 3
}
/** The rig's render-state size (floats). */
export function ropeStateSize(rig) {
  let n = rig.bodies.length * 12
  for (const ch of rig.chains) n += (ch.ids.length + 4) * 3
  return n
}
