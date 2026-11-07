// The wired earbuds' dimensions and moulded shapes, ported from the Drift Wired viewer (geom.js),
// with a straight 3.5 mm TRRS plug in place of the USB-C one (PLUG35). Plain JS (no three.js): it
// runs in a worker and in Node. Units: millimetres.
//
// Earbud design frame (the LEFT bud; the right one is its mirror image in x):
//   origin at the centre of the body, +y up, +z forward (towards the face),
//   +x inwards (the face that sits against the ear, where the nozzle is), -x the domed outer face.
import { clamp, len2, len3, norm, smin, smax, sdEllipsoid, sdEllipse2, sdRoundRect2, roundExtrude, sdRoundCone } from '../core/sdf.js'

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** An orthonormal frame: origin o, w along `n`, v as close to `up` as possible, u = v x w. */
export function frame(o, n, up) {
  const w = norm(...n)
  let v = [up[0] - w[0] * dot(up, w), up[1] - w[1] * dot(up, w), up[2] - w[2] * dot(up, w)]
  v = norm(...v)
  const u = cross(v, w)
  return { o, u, v, w }
}
export function toFrame(f, x, y, z, out) {
  const dx = x - f.o[0]
  const dy = y - f.o[1]
  const dz = z - f.o[2]
  out[0] = dx * f.u[0] + dy * f.u[1] + dz * f.u[2]
  out[1] = dx * f.v[0] + dy * f.v[1] + dz * f.v[2]
  out[2] = dx * f.w[0] + dy * f.w[1] + dz * f.w[2]
  return out
}
export const fromFrame = (f, u, v, w) => [
  f.o[0] + f.u[0] * u + f.v[0] * v + f.w[0] * w,
  f.o[1] + f.u[1] * u + f.v[1] * v + f.w[1] * w,
  f.o[2] + f.u[2] * u + f.v[2] * v + f.w[2] * w,
]

// ---------------------------------------------------------------------------------- the earbud

const D15 = (15 * Math.PI) / 180
const STEM_DIR = [0, -Math.cos(D15), -Math.sin(D15)] // down, leaning 15 degrees back
const STEM_WIDE = [0, -Math.sin(D15), Math.cos(D15)] // across the stem, front to back

export const BUD = {
  // the pebble: a main volume and a fuller lobe at the front, inside cuts that shape the faces
  main: [7.25, 8.0, 9.5],
  lobe: { c: [0.9, 0.9, 1.6], r: [5.6, 6.2, 7.4], k: 2.5 },
  outer: { x: -6.6, R: 34, c: [0, 0.4, 0.6], k: 1.3 }, // gently domed outer face
  inner: { x: 6.5, R: 46, c: [0, -0.4, 0.4], k: 2.0 },
  // the nozzle: an oval tube from a boss on the inner face, ~28 degrees forward and down
  nozzle: {
    base: [3.6, -1.0, 1.6],
    dir: norm(1, -0.27, 0.47),
    boss: { ru: 3.7, rv: 3.4, len: 4.4, k: 1.8 },
    ru: 2.5,
    rv: 2.25,
    len: 10.1,
    hole: { ru: 1.85, rv: 1.62, depth: 1.15 },
    // the silicone tip: its skirt clears the body from 3.9 mm out (checked numerically)
    tip: { skirt: 4.15, front: 10.55, radius: 5.5, wall: 0.6 },
    k: 1.0, // (the nozzle grows out of its boss with a 1 mm blend)
  },
  // the stem: slightly flattened, tapering, 15 degrees back from vertical
  stem: { a: [-0.3, -3.6, -3.2], dir: STEM_DIR, wide: STEM_WIDE, len: 15.4, rw: [3.0, 2.65], squash: 1.27, k: 2.6, cut: 16.0, cutK: 0.35, socket: 1.5 },
  ring: { at: 6.5, half: 0.6, depth: 0.32 }, // the accent ring's seat, along the stem
  vent: { y: 2.5, z: 1.2, hu: 2.6, hv: 0.72, tilt: -0.21, depth: 1.05, recess: 0.3 },
  parting: { x: -4.75 }, // the parting line runs round the shell in the plane x = -4.75
  boot: { start: 14.9, len: 8.4 }, // along the stem axis: where the rubber boot sits
}

// derived frames
{
  const n = BUD.nozzle
  n.frame = frame(n.base, n.dir, [0, 1, 0])
  const s = BUD.stem
  s.end = [s.a[0] + s.dir[0] * s.len, s.a[1] + s.dir[1] * s.len, s.a[2] + s.dir[2] * s.len]
  // the vent sits on the domed outer face
  const o = BUD.outer
  const cx = o.x + o.R
  const v = BUD.vent
  const px = cx - Math.sqrt(o.R * o.R - (v.y - o.c[1]) ** 2 - (v.z - o.c[2]) ** 2)
  const nrm = norm(px - cx, v.y - o.c[1], v.z - o.c[2])
  const up = [0, Math.cos(v.tilt), Math.sin(v.tilt)]
  v.frame = frame([px, v.y, v.z], nrm, up)
}

/** A point on the stem axis at distance `a` from its start, and the stem's half-widths there. */
export function stemAt(a) {
  const s = BUD.stem
  const t = clamp(a / s.len, 0, 1)
  const rw = s.rw[0] + (s.rw[1] - s.rw[0]) * t
  return {
    p: [s.a[0] + s.dir[0] * a, s.a[1] + s.dir[1] * a, s.a[2] + s.dir[2] * a],
    rw, // across the stem (front-back)
    rx: rw / s.squash, // through it (in-out)
  }
}

const tmpF = [0, 0, 0]

let stemA = 0
/** The stem's own distance (before it is blended into the body); its axial coordinate in stemA. */
function stemDist(x, y, z) {
  const s = BUD.stem
  const px = x - s.a[0]
  const py = y - s.a[1]
  const pz = z - s.a[2]
  const a = px * s.dir[0] + py * s.dir[1] + pz * s.dir[2]
  const w = px * s.wide[0] + py * s.wide[1] + pz * s.wide[2]
  stemA = a
  // a cheap bound first: far from the stem's axis, it can't matter
  const ac = clamp(a, 0, s.len)
  const far = len3(px - s.dir[0] * ac, py - s.dir[1] * ac, pz - s.dir[2] * ac) - s.rw[0]
  if (far > 4) return far
  // squash the through-direction so the cross-section is round, then a round cone, its end cut
  // flat (with a small fillet) where the boot comes out
  const cone = sdRoundCone(px * s.squash, a, w, 0, 0, 0, 0, s.len, 0, s.rw[0], s.rw[1]) / s.squash
  return smax(cone, a - s.cut, s.cutK)
}

export function budBody(x, y, z) {
  const B = BUD
  let d = sdEllipsoid(x, y, z, B.main[0], B.main[1], B.main[2])
  const L = B.lobe
  d = smin(d, sdEllipsoid(x - L.c[0], y - L.c[1], z - L.c[2], L.r[0], L.r[1], L.r[2]), L.k)
  const O = B.outer
  d = smax(d, len3(x - (O.x + O.R), y - O.c[1], z - O.c[2]) - O.R, O.k)
  const I = B.inner
  d = smax(d, len3(x - (I.x - I.R), y - I.c[1], z - I.c[2]) - I.R, I.k)
  return d
}

/** The bud's moulded shell (the tip, the ring, the boot and the meshes are separate parts). */
export function budSDF(x, y, z) {
  const B = BUD
  let d = budBody(x, y, z)

  // nozzle boss and nozzle (only near them)
  const N = B.nozzle
  const q = toFrame(N.frame, x, y, z, tmpF)
  const qr = len2(q[0], q[1])
  if (qr < N.boss.ru + N.boss.k + 1.5 && q[2] > -3.5 && q[2] < N.len + 1.5) {
    const boss = roundExtrude(sdEllipse2(q[0], q[1], N.boss.ru, N.boss.rv), q[2] - N.boss.len, 0.9)
    d = smin(d, Math.max(boss, -q[2] - 2), N.boss.k)
    const noz = roundExtrude(sdEllipse2(q[0], q[1], N.ru, N.rv), q[2] - N.len, 0.45)
    d = smin(d, Math.max(noz, -q[2] - 1), N.k)
    // the nozzle's open end: a recess for the mesh
    const hole = Math.max(sdEllipse2(q[0], q[1], N.hole.ru, N.hole.rv), N.len - N.hole.depth - q[2])
    d = smax(d, -hole, 0.14)
  }

  // stem, grown out of the body with a long fillet
  const sd = stemDist(x, y, z)
  const a = stemA
  d = smin(d, sd, B.stem.k)
  // the accent ring's seat: a shallow band round the stem just under the body
  const R = B.ring
  if (Math.abs(a - R.at) < R.half + 0.3) {
    const groove = Math.max(Math.abs(a - R.at) - R.half, -sd - R.depth)
    d = smax(d, -groove, 0.16)
  }

  // the boot's socket in the stem's flat end
  if (a > B.stem.cut - 1.2) {
    const S = B.stem
    const px = x - S.a[0] - S.dir[0] * a
    const py = y - S.a[1] - S.dir[1] * a
    const pz = z - S.a[2] - S.dir[2] * a
    const sock = Math.max(len3(px, py, pz) - S.socket, S.cut - 0.45 - a)
    d = smax(d, -sock, 0.1)
  }

  // the vent on the outer face: a recess (the mesh sits 0.3 mm down, a dark cavity below)
  if (x < -3.5) {
    const V = B.vent
    const p = toFrame(V.frame, x, y, z, tmpF)
    if (Math.abs(p[0]) < V.hu + 0.6 && Math.abs(p[1]) < V.hv + 0.6) {
      const slot = Math.max(sdRoundRect2(p[0], p[1], V.hu, V.hv, V.hv), -p[2] - V.depth)
      d = smax(d, -slot, 0.16)
    }
  }
  return d
}
export const BUD_BOUNDS = [-8.4, -20.9, -11.6, 14.6, 9.7, 12.2]

// ---------------------------------------------------------------------------------- the remote
// Frame: along y (+y towards the bud), +z the front with the button, x across. A slim oval
// capsule; the metal end caps are separate parts (earbuds.js), this is the moulded body.
export const REMOTE = {
  half: 16, // overall half length, caps included
  body: 13.0, // the moulded body's half length
  rx: 4.0, // half width
  rz: 2.75, // half thickness
  edge: 0.7,
  dimple: { y: 3.2, r: 3.0, depth: 0.32 },
  mic: { y: -8.2, r: 0.32, depth: 1.2 },
  seamZ: -0.35, // the seam, just behind the widest point
}
export function remoteSDF(x, y, z) {
  const R = REMOTE
  let d = roundExtrude(sdEllipse2(x, z, R.rx, R.rz), Math.abs(y) - R.body, R.edge)
  // the multifunction button: a shallow concave dimple
  const D = R.dimple
  const Rs = (D.r * D.r + D.depth * D.depth) / (2 * D.depth)
  d = smax(d, -(len3(x, y - D.y, z - (R.rz - D.depth + Rs)) - Rs), 0.45)
  // the microphone pinhole on the back
  const M = R.mic
  const hole = Math.max(len2(x, y - M.y) - M.r, z + R.rz - M.depth)
  d = smax(d, -hole, 0.06)
  return d
}
export const REMOTE_BOUNDS = [-4.6, -13.8, -3.4, 4.6, 13.8, 3.4]
// remote end caps: from the body's end (|y| = 13) to the cable (|y| = 16)
export const REMOTE_CAP = { from: 13.0, to: 16.0 }

// ---------------------------------------------------------------------------------- the other parts
// (turned parts, built in earbuds.js; these are their dimensions)

export const CABLE = { radius: 1.1, density: 0.0034, spacing: 4.5, bend: 22 }
// Y-splitter: a 6 mm cylinder, metal caps. Frame: along y, +y towards the buds.
export const SPLITTER = { r: 3.0, half: 4.6, cap: 1.8, hole: 1.25 }
// the chin-cinch bead: a small oval slider, both leads through it
export const BEAD = { rx: 3.4, rz: 2.15, half: 2.3, hole: 1.3 }

/**
 * The 3.5 mm TRRS plug (straight). Frame as the original USB-C plug's: along y, the cable enters at
 * +y (the pin at relief.top), the housing below it, the metal pin pointing along -y.
 *   relief   the rubber strain relief, the original's steps unchanged (y from 0.2 up to `top`)
 *   housing  a round moulded barrel (body colour, a parting line in the plane z = 0), its top edge
 *            rounded, from y = 0 down to `bottom`
 *   collar   the accent-metal nose, tapering like the splitter's caps, `len` long, down to the
 *            front face (y = face) where the pin comes out
 *   pin      3.5 mm across, `len` long from the face: sleeve, ring 2, ring 1 and tip (with its
 *            latch neck and rounded nose), insulating bands `band` long between them. Spans are
 *            [from, to], measured from the face along -y.
 * faceDist / tipDist: from the plug body's local origin along -y to the housing's front face and
 * to the pin's tip (seat the plug in a jack with these).
 */
export const PLUG35 = {
  // (steps: [y, radius] from the top, as the original's PLUG.relief)
  relief: { top: 10.5, base: 2.3, steps: [[10.5, 1.32], [7.6, 1.32], [7.6, 1.62], [4.9, 1.62], [4.9, 1.95], [2.1, 1.95], [0.4, 2.3]] },
  housing: { r: 3.3, top: 0, bottom: -12.6, edge: 1.0 },
  collar: { len: 2.6, r0: 3.18, r1: 1.9 }, // (radius where it leaves the housing, and at the face)
  face: 0, // (below: housing.bottom - collar.len)
  pin: {
    r: 1.75,
    len: 14.0,
    band: 0.7,
    bandR: 1.7, // (the bands sit a hair below the metal)
    sleeve: [0, 5.0],
    ring2: [5.7, 7.6],
    ring1: [8.3, 10.2],
    tip: [10.9, 14.0],
    neck: { r: 1.38, from: 11.02, to: 11.32 }, // the latch groove behind the tip
    shoulder: 11.68, // where the tip is back to full size
    nose: { cone: 42, round: 1.2, point: 0.8 }, // a 42 degree cone, well rounded into the barrel and at its point
  },
  faceDist: 0,
  tipDist: 0,
}
PLUG35.face = PLUG35.housing.bottom - PLUG35.collar.len // -15.2
PLUG35.faceDist = -PLUG35.face // 15.2
PLUG35.tipDist = -PLUG35.face + PLUG35.pin.len // 29.2

/**
 * The plug as a rigid body, in the form geom.rigSpec's bodies take (add `shape`: e.g. the grid and
 * points of plugCollide35 over PLUG35_COLLIDE_BOUNDS, as geom.collisionData makes them). Mass (g),
 * centre of mass and `half` integrated over the parts' profiles: the pin ~0.82 g (brass, about 3/4
 * metal), the housing 0.45 g and its brass insert 0.21 g, the collar 0.09 g, the relief 0.07 g.
 * `half`: the box whose inscribed tetrahedron has the plug's second moments about its centre of
 * mass (as the rig models a body).
 */
export const plugBody = {
  mass: 1.65,
  com: [0, -14.8, 0],
  half: [1.2, 8.5, 1.2],
  pins: { cable: { p: [0, PLUG35.relief.top, 0], dir: [0, 1, 0] } },
}

/** The plug as it collides (for the physics' distance grid): relief, housing and collar, pin. */
export function plugCollide35(x, y, z) {
  const P = PLUG35
  const r = len2(x, z)
  const H = P.housing
  const bottom = P.face
  // housing and collar as one rounded cylinder (the collar's taper is within a few tenths)
  let d = roundExtrude(r - H.r, Math.abs(y - (H.top + bottom) / 2) - (H.top - bottom) / 2, 1.0)
  // the pin, its tip rounded
  const pinMid = P.face - P.pin.len / 2
  d = Math.min(d, roundExtrude(r - P.pin.r, Math.abs(y - pinMid) - P.pin.len / 2, 0.9))
  // the relief
  d = Math.min(d, sdRoundCone(x, y, z, 0, 1.2, 0, 0, P.relief.top - 0.4, 0, 2.3, 1.3))
  return d
}
export const PLUG35_COLLIDE_BOUNDS = [-4.2, -30.0, -4.2, 4.2, 11.9, 4.2]

// ---------------------------------------------------------------------------------- meshing jobs

/**
 * The moulded parts' SDF meshing jobs, at the original's high-quality resolution (JOBS.bud(1),
 * JOBS.remote(1)). Run them where the mesher is (a worker): build the list there (the `sdf`s are
 * functions) and call meshSDF(job.sdf, job.bounds, job.h, job.opts), or job.run(meshSDF). The
 * outputs ({ positions, normals, ao, indices }) are what createEarbuds({ meshes: { bud, remote } })
 * takes.
 */
export function earbudsMeshJobs() {
  const job = (name, sdf, bounds, h, opts) => ({ name, sdf, bounds, h, opts, run: (meshSDF) => meshSDF(sdf, bounds, h, opts) })
  return [job('bud', budSDF, BUD_BOUNDS, 0.14, {}), job('remote', remoteSDF, REMOTE_BOUNDS, 0.11, { aoStep: 0.3, aoStrength: 0.5 })]
}

// ---------------------------------------------------------------------------------- render state

/** The rigid parts, in the rig's (and the render state's) order. */
export const BODY_ORDER = ['budL', 'budR', 'remote', 'splitter', 'bead', 'plug']
/** Each part's centre of mass in its own (design) frame, as the rig has them (the plug's: plugBody). */
export const BODY_COM = {
  budL: [0.9, -2.1, 0.2],
  budR: [-0.9, -2.1, 0.2],
  remote: [0, 0, 0],
  splitter: [0, 0, 0],
  bead: [0, 0, 0],
  plug: plugBody.com,
}
/**
 * The cable's chains, in the rig's order, and their lengths (mm): the one place they are set. The
 * physics (earbudsRig.js's rigSpec) and the cable's mesh (earbudsStateLayout) both read them, so the
 * mesh always reads each chain's own points. (Product-shot lengths, not a real cable's: laid round
 * the player in a few open curves, never a pile.)
 */
export const CHAINS = [
  { name: 'leadL1', from: ['budL', 'cable'], to: ['remote', 'top'], length: 72 },
  { name: 'leadL2', from: ['remote', 'bottom'], to: ['splitter', 'left'], length: 86 },
  { name: 'leadR', from: ['budR', 'cable'], to: ['splitter', 'right'], length: 116 },
  { name: 'main', from: ['splitter', 'main'], to: ['plug', 'cable'], length: 185 },
]
/** The particle spacing along the cable (the original's high tier). */
export const SPACING = 4.5

/**
 * The render state's layout, as physhost.stateLayout(rig) gives it: 12 floats per part (its
 * rotation R, column-major 3x3, then its centre of mass in world space), in BODY_ORDER; then per
 * chain its tube's control points (x, y, z each): the two ends run 1.6 mm into the parts they
 * leave, so a chain of n particles has n + 4 points.
 *   earbudsStateLayout()                      the original's: 4.5 mm spacing, 120/148/300/900 mm
 *   earbudsStateLayout({ spacing, lengths })  other chain lengths or spacing (as the rig rounds them)
 *   earbudsStateLayout(rig)                   from a Rig (its chains' particle ids)
 *   earbudsStateLayout(physhostLayout)        a { size, chains: [{ offset, count }] } as it is
 * Returns { size, bodies, spacing, chains: [{ name, offset, count }] } (offsets in floats; spacing:
 * the cable's particle spacing, given or the rig's, else 4.5).
 */
export function earbudsStateLayout(src = {}) {
  const nb = Array.isArray(src.bodies) ? src.bodies.length : typeof src.bodies === 'number' ? src.bodies : BODY_ORDER.length
  const spacing = src.spacing || SPACING
  let counts
  let offsets = null
  if (Array.isArray(src.chains) && src.chains.length && src.chains[0].ids) counts = src.chains.map((ch) => ch.ids.length + 4)
  else if (Array.isArray(src.chains) && src.chains.length && src.chains[0].count !== undefined) {
    counts = src.chains.map((ch) => ch.count)
    offsets = src.chains.map((ch) => ch.offset)
  } else {
    const lengths = src.lengths || CHAINS.map((c) => c.length)
    counts = lengths.map((L) => Math.max(2, Math.round(L / spacing)) - 1 + 4)
  }
  let o = nb * 12
  const chains = counts.map((count, i) => {
    const offset = offsets ? offsets[i] : o
    o = offset + count * 3
    return { name: (src.chains && src.chains[i] && src.chains[i].name) || (CHAINS[i] ? CHAINS[i].name : 'chain' + i), offset, count }
  })
  return { size: src.size || o, bodies: nb, spacing, chains }
}
