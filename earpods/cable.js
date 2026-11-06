// Cable physics for the earphones.
//
// Units: centimetres, grams, seconds. Gravity is real (981 cm/s^2), so swings take real time.
//
// The earphones are a tree of particles. Four cable sections, each 40-80 particles:
//   left         left earbud  -> splitter
//   rightUpper   right earbud -> remote
//   rightLower   remote       -> splitter
//   main         splitter     -> 3.5 mm plug
// The remote, the splitter and the plug are rigid pieces with real weight: each is two particles
// at a fixed distance, carrying the piece's mass. The earbuds are held in space by whoever is
// moving them: each holds its cable's first particle, plus a guide point up its stem that keeps
// the cable leaving in line with the strain relief.
//
// Every substep (480 Hz, fixed):
//   1. Verlet prediction: inertia, gravity, a little air drag
//   2. bending: XPBD (compliance from a real bending stiffness), strain reliefs at every part
//   3. contacts: the floor (Coulomb friction), the earbuds, the pieces, cable against cable
//      (capsules, found through a spatial hash, skipping pairs close along the cable)
//   4. inextensibility: every length constraint in the tree solved together, exactly. The
//      constraint matrix of a tree factors in linear time with no fill-in (eliminate from the
//      leaves inwards), so a Newton step costs about as much as one Gauss-Seidel sweep, and a
//      heavy plug can hang from 80 light particles without the cable stretching.
//   5. internal damping: velocities smoothed along the cable (it damps wiggles, not swinging)
//
// No three.js here: it runs under Node for tests.
import { CABLE_EXIT, COLLAR, HEAD_A, HEAD_B, PLUG, REMOTE, SPLITTER, STEM } from './shapes.js'

export const G = 981
export const HZ = 480
const DT = 1 / HZ
const MAX_SUBSTEPS = 36

export const SPEC = {
  cableR: 0.085, // 1.7 mm cable
  rho: 0.05, // g per cm of cable
  // [length in cm, particles]
  left: [8.4, 64],
  rightUpper: [2.6, 40],
  rightLower: [3.4, 40],
  main: [15, 80],
  remoteMass: 1.1,
  splitMass: 0.3,
  plugMass: 1.6,
  // bending stiffness, as the length over which the cable's stiffness beats its weight:
  // B = rho * g * lb^3
  lb: 1.45,
  relief: 8, // strain reliefs: how much stiffer than the cable the joint at each part is
  reliefLen: 0.45, // and over what length the cable is stiffer next to a part
  splay: 0.25, // radians: the splitter's two sleeves lean apart by this much
  air: 0.8, // 1/s
  smooth: 0.035, // internal damping, per substep
  muS: 0.9, // floor friction, static and kinetic
  muK: 0.6,
  floorY: 0,
}

// The earbuds' collision shapes, in the left earbud's frame (the right one mirrors x).
const BUD_ELLIPSOIDS = [
  [...HEAD_A.c, ...HEAD_A.r],
  [...HEAD_B.c, ...HEAD_B.r],
]
const BUD_CAPSULES = [
  [STEM.x, STEM.top, STEM.z, STEM.x, STEM.bottom, STEM.z, (STEM.r1 + STEM.r2) / 2 - 0.01],
  [STEM.x, COLLAR.top, STEM.z, STEM.x, COLLAR.bottom, STEM.z, (COLLAR.r1 + COLLAR.r2) / 2],
]
const BUD_GUIDE = [CABLE_EXIT.x, COLLAR.groove, CABLE_EXIT.z]
const BUD_EXIT = [CABLE_EXIT.x, CABLE_EXIT.y, CABLE_EXIT.z]
const BUD_REACH = 2.6 // nothing further than this from the head's centre can touch the earbud
const PIECE_NAMES = ['remote', 'splitter', 'plug']

// The pieces' collision shapes: capsules along each piece's axis, [t0, t1, radius], t from the
// first particle (0) to the second (1).
export const PIECES = {
  // relief tip to relief tip; flat-ish body, so the radius is its half thickness
  remote: { len: REMOTE.len, shape: [[0.06, 0.94, 0.29]] },
  // top (where both earbud cables go in) to the end of the main cable's relief
  splitter: { len: SPLITTER.len, shape: [[0.18, 0.72, 0.21], [0.72, 0.95, 0.13]] },
  // the cable's way in, at the top of the relief, to the tip of the pin
  plug: {
    len: -PLUG.tip,
    shape: [
      [0.02, 0.18, 0.15],
      [0.22, 0.64, 0.3],
      [0.66, 0.97, 0.175],
    ],
  },
}

// ---------------------------------------------------------------- helpers

function transform(m, p, mirror, out, o) {
  const x = mirror ? -p[0] : p[0]
  const y = p[1]
  const z = p[2]
  out[o] = m[0] * x + m[4] * y + m[8] * z + m[12]
  out[o + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]
  out[o + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]
}

/** Inverse of a 3x3 matrix (row-major, at offset o) into out at offset q. */
function inv3(A, o, out, q) {
  const a = A[o], b = A[o + 1], c = A[o + 2]
  const d = A[o + 3], e = A[o + 4], f = A[o + 5]
  const g = A[o + 6], h = A[o + 7], i = A[o + 8]
  const c0 = e * i - f * h
  const c1 = f * g - d * i
  const c2 = d * h - e * g
  const det = a * c0 + b * c1 + c * c2
  const k = 1 / det
  out[q] = c0 * k
  out[q + 1] = (c * h - b * i) * k
  out[q + 2] = (b * f - c * e) * k
  out[q + 3] = c1 * k
  out[q + 4] = (a * i - c * g) * k
  out[q + 5] = (c * d - a * f) * k
  out[q + 6] = c2 * k
  out[q + 7] = (b * g - a * h) * k
  out[q + 8] = (a * e - b * d) * k
}

/** out = A b, for a 3x3 A at offset o and a 3-vector b at offset q. */
function mul3(A, o, b, q, out, r) {
  const x = b[q], y = b[q + 1], z = b[q + 2]
  out[r] = A[o] * x + A[o + 1] * y + A[o + 2] * z
  out[r + 1] = A[o + 3] * x + A[o + 4] * y + A[o + 5] * z
  out[r + 2] = A[o + 6] * x + A[o + 7] * y + A[o + 8] * z
}

/** A dense Catmull-Rom curve through `ctrl`, with its cumulative arc length. */
function curve(ctrl) {
  const dense = []
  const P = (i) => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))]
  for (let i = 0; i < ctrl.length - 1; i++)
    for (let s = 0; s < 48; s++) {
      const t = s / 48
      const p0 = P(i - 1)
      const p1 = P(i)
      const p2 = P(i + 1)
      const p3 = P(i + 2)
      const t2 = t * t
      const t3 = t2 * t
      dense.push(
        [0, 1, 2].map(
          (k) =>
            0.5 *
            (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3),
        ),
      )
    }
  dense.push(ctrl[ctrl.length - 1])
  const acc = [0]
  for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1] + Math.hypot(...dense[i].map((v, k) => v - dense[i - 1][k])))
  return { dense, acc }
}

/**
 * `count` points from ctrl[0] to the last control point, along a curve through the control
 * points bulged out along `bulge` (a sine, zero at both ends) just enough for the curve to be
 * `length` long, then spaced evenly along it: every segment starts at its rest length. Points are
 * kept above `floor`.
 */
function layCable(ctrl, count, length, bulge, floor) {
  const shaped = (amount) => {
    const { dense, acc } = curve(ctrl)
    const total = acc[acc.length - 1]
    const pts = dense.map((p, i) => {
      const f = Math.sin((Math.PI * acc[i]) / total) * amount
      return [p[0] + bulge[0] * f, Math.max(floor, p[1] + bulge[1] * f), p[2] + bulge[2] * f]
    })
    const a = [0]
    for (let i = 1; i < pts.length; i++) a.push(a[i - 1] + Math.hypot(...pts[i].map((v, k) => v - pts[i - 1][k])))
    return { pts, acc: a }
  }
  let lo = 0
  let hi = length
  for (let it = 0; it < 60; it++) {
    const mid = (lo + hi) / 2
    const { acc } = shaped(mid)
    if (acc[acc.length - 1] < length) lo = mid
    else hi = mid
  }
  const { pts, acc } = shaped((lo + hi) / 2)
  const total = acc[acc.length - 1]
  const out = []
  let j = 0
  for (let q = 0; q < count; q++) {
    const s = (q / (count - 1)) * total
    while (j < pts.length - 2 && acc[j + 1] < s) j++
    const t = (s - acc[j]) / (acc[j + 1] - acc[j] || 1)
    out.push(pts[j].map((v, k) => v + (pts[j + 1][k] - v) * t))
  }
  return out
}

// ---------------------------------------------------------------- the simulation

export class EarphoneSim {
  constructor(spec = {}) {
    this.s = { ...SPEC, ...spec }
    this.time = 0
    this.acc = 0
    this.grabbed = null
    this.bud = {
      left: { m: null, from: new Float64Array(9), to: new Float64Array(9), now: new Float64Array(9), inv: new Float64Array(16) },
      right: { m: null, from: new Float64Array(9), to: new Float64Array(9), now: new Float64Array(9), inv: new Float64Array(16) },
    }
    this.budFrom = { left: new Float64Array(16), right: new Float64Array(16) }
    this.budTo = { left: new Float64Array(16), right: new Float64Array(16) }
  }

  /**
   * Lay the earphones out for earbuds placed with these 4x4 (column-major) matrices, in the
   * composition `layout` describes, then let everything settle.
   */
  build(leftMatrix, rightMatrix, layout, settleSeconds = 4) {
    const s = this.s
    this.setEarbuds(leftMatrix, rightMatrix, true)
    const bl = this.bud.left.to
    const br = this.bud.right.to
    const exitL = [bl[0], bl[1], bl[2]]
    const exitR = [br[0], br[1], br[2]]
    const guideL = [bl[3], bl[4], bl[5]]
    const guideR = [br[3], br[4], br[5]]

    // ---- where everything starts
    const S = layout.splitter // top of the splitter
    const Sdir = layout.splitterDir // from its top towards its bottom
    const Sb = S.map((v, k) => v + Sdir[k] * PIECES.splitter.len)
    const rem = layout.remote // top of the remote
    const Rdir = layout.remoteDir
    const Rb = rem.map((v, k) => v + Rdir[k] * PIECES.remote.len)
    const Pt = layout.plug
    const Pdir = layout.plugDir
    const Pp = Pt.map((v, k) => v + Pdir[k] * PIECES.plug.len)
    const sections = {
      left: [exitL, ...(layout.via.left || []), S],
      rightUpper: [exitR, ...(layout.via.rightUpper || []), rem],
      rightLower: [Rb, ...(layout.via.rightLower || []), S],
      main: [Sb, ...(layout.via.main || []), Pt],
    }

    // ---- particles
    const counts = Object.keys(sections).map((k) => s[k][1] - 2)
    const n = 4 + 6 + counts.reduce((a, b) => a + b, 0)
    this.n = n
    this.x = new Float64Array(n * 3)
    this.p = new Float64Array(n * 3)
    this.w = new Float64Array(n)
    this.w0 = new Float64Array(n)
    this.rad = new Float64Array(n)
    this.mass = new Float64Array(n)
    let next = 0
    const add = (pt, mass, r) => {
      const i = next++
      for (let k = 0; k < 3; k++) this.x[i * 3 + k] = this.p[i * 3 + k] = pt[k]
      this.mass[i] = mass
      this.w[i] = this.w0[i] = mass > 0 ? 1 / mass : 0
      this.rad[i] = r
      return i
    }
    const aL = add(exitL, 0, s.cableR)
    const aR = add(exitR, 0, s.cableR)
    const gL = add(guideL, 0, 0)
    const gR = add(guideR, 0, 0)
    this.anchors = { left: aL, right: aR }
    this.guides = { left: gL, right: gR }
    const pS = add(S, s.splitMass / 2, 0.15)
    const pSb = add(Sb, s.splitMass / 2, 0.13)
    const pRt = add(rem, s.remoteMass / 2, 0.2)
    const pRb = add(Rb, s.remoteMass / 2, 0.2)
    const pPt = add(Pt, s.plugMass / 2, 0.15)
    const pPp = add(Pp, s.plugMass / 2, 0.17)
    this.pieces = { remote: [pRt, pRb], splitter: [pS, pSb], plug: [pPt, pPp] }
    this.pieceOf = new Int8Array(n).fill(-1)
    const pieceNames = ['remote', 'splitter', 'plug']
    pieceNames.forEach((name, k) => {
      for (const i of this.pieces[name]) this.pieceOf[i] = k
    })

    const ends = {
      left: [aL, pS],
      rightUpper: [aR, pRt],
      rightLower: [pRb, pS],
      main: [pSb, pPt],
    }
    this.chains = {}
    this.restLen = {}
    for (const [name, ctrl] of Object.entries(sections)) {
      const [len, count] = s[name]
      const pts = layCable(ctrl, count, len, layout.bulge?.[name] || [0, -1, 0], s.floorY + s.cableR + 0.005)
      const seg = len / (count - 1)
      this.restLen[name] = seg
      const ids = [ends[name][0]]
      for (let q = 1; q < count - 1; q++) ids.push(add(pts[q], s.rho * seg, s.cableR))
      ids.push(ends[name][1])
      this.chains[name] = ids
      // the end particles carry their share of cable too
      for (const e of ends[name]) if (this.w0[e] > 0) this.mass[e] += (s.rho * seg) / 2
    }
    for (let i = 0; i < n; i++) if (this.w0[i] > 0) this.w[i] = this.w0[i] = 1 / this.mass[i]

    // ---- length constraints: every cable segment and every piece
    const cons = []
    for (const [name, ids] of Object.entries(this.chains))
      for (let q = 0; q + 1 < ids.length; q++) cons.push([ids[q], ids[q + 1], this.restLen[name]])
    for (const name of pieceNames) cons.push([...this.pieces[name], PIECES[name].len])
    this.m = cons.length
    this.ca = new Int32Array(cons.map((c) => c[0]))
    this.cb = new Int32Array(cons.map((c) => c[1]))
    this.cL = new Float64Array(cons.map((c) => c[2]))
    this.maxStep = 0.5
    this.prepareSolver()

    // ---- bending along each section (centroid form: linear in the bend angle), with XPBD
    // compliance from the stiffness B; stiffer near the parts (their strain reliefs)
    const B = s.rho * G * s.lb ** 3
    const bend = []
    for (const [name, ids] of Object.entries(this.chains)) {
      const l = this.restLen[name]
      for (let q = 1; q + 1 < ids.length; q++) {
        // distance along the cable to the nearest part
        const fromEnd = Math.min(q, ids.length - 1 - q) * l
        const stiff = 1 + 5 * Math.max(0, 1 - fromEnd / s.reliefLen)
        bend.push([ids[q - 1], ids[q], ids[q + 1], (l * l * l) / (9 * B * stiff)])
      }
    }
    this.bend = bend
    this.bendA = new Int32Array(bend.map((b) => b[0]))
    this.bendM = new Int32Array(bend.map((b) => b[1]))
    this.bendB = new Int32Array(bend.map((b) => b[2]))
    this.bendC = new Float64Array(bend.map((b) => b[3] / (DT * DT)))

    // ---- strain reliefs: [from, at, cable particle]: the cable leaves `at` in line with from->at
    const L = this.chains
    const rel = [
      [gL, aL, L.left[1]],
      [gR, aR, L.rightUpper[1]],
      [pRb, pRt, L.rightUpper[L.rightUpper.length - 2]],
      [pRt, pRb, L.rightLower[1]],
      [pS, pSb, L.main[1]],
      [pPp, pPt, L.main[L.main.length - 2]],
    ]
    this.relief = new Int32Array(rel.flat())
    // as stiff as a short stretch of cable several times stiffer than the rest
    const lr = Math.min(...Object.values(this.restLen))
    this.reliefC = (lr * lr * lr) / (B * s.relief) / (DT * DT)
    // the two cables going into the splitter's sleeves
    this.sleeves = [L.left[L.left.length - 2], L.rightLower[L.rightLower.length - 2]]

    this.prepareDistances()
    this.prepareCollisions()

    // let it hang for a while before anyone sees it, much more damped than usual at first
    const keep = { air: s.air, smooth: s.smooth }
    s.air = 8
    s.smooth = 0.25
    for (let k = 0; k < settleSeconds * HZ * 0.75; k++) this.substep(1)
    s.air = keep.air
    s.smooth = keep.smooth
    for (let k = 0; k < settleSeconds * HZ * 0.25; k++) this.substep(1)
    // and start at rest
    this.p.set(this.x)
    return this
  }

  // ---------------------------------------------------------------- the direct solver

  /**
   * The length constraints, solved together. Each substep solves, for the correction d to the
   * positions and the constraint impulses v,
   *
   *     | M + h^2 K   J^T | | d |   |  0 |
   *     |    J        -E  | | v | = | -C |
   *
   * linearised where the substep's prediction put everything: J and C are the constraints'
   * directions and errors there, and K the cable's geometric stiffness: a taut cable resisting
   * being pulled sideways, in proportion to its tension (taken from the previous substep). Without K, the constraint
   * forces are effectively explicit sideways, and a cable of light particles under a heavy load
   * (the remote, the plug) carries waves faster than any affordable time step: it explodes. With
   * K they are implicit, so those fast waves just die out, and since K never resists moving
   * everything together, gravity and the slow swings come out right.
   *
   * The particles and constraints form a tree, so the system factors in linear time with no
   * fill-in: eliminate each particle, then the constraint joining it to its parent, from the
   * leaves to the root (the splitter).
   */
  prepareSolver() {
    const { n, m, ca, cb } = this
    const inc = Array.from({ length: n }, () => [])
    for (let k = 0; k < m; k++) {
      inc[ca[k]].push(k)
      inc[cb[k]].push(k)
    }
    const root = this.pieces.splitter[0]
    const par = new Int32Array(n).fill(-1)
    const pk = new Int32Array(n).fill(-1)
    const seen = new Uint8Array(n)
    const bfs = [root]
    seen[root] = 1
    for (let h = 0; h < bfs.length; h++) {
      const u = bfs[h]
      for (const k of inc[u]) {
        const v = ca[k] === u ? cb[k] : ca[k]
        if (seen[v]) continue
        seen[v] = 1
        par[v] = u
        pk[v] = k
        bfs.push(v)
      }
    }
    this.root = root
    this.par = par
    this.pk = pk
    // children before parents
    this.post = new Int32Array(bfs.slice(1).reverse())
    // each non-root particle's sign in its parent constraint, and its parent's
    this.sv = new Float64Array(n)
    this.su = new Float64Array(n)
    for (const v of this.post) {
      const k = pk[v]
      this.sv[v] = cb[k] === v ? 1 : -1
      this.su[v] = -this.sv[v]
    }
    this.inTree = seen
    const B = (k) => new Float64Array(n * k)
    this.Hd = B(9) // diagonal blocks, updated as the tree is eliminated
    this.Hu = B(9) // block between each particle and its parent (symmetric)
    this.Jv = B(3) // constraint row at the particle
    this.Ju = B(3) // and at its parent
    this.Aku = B(3) // constraint-parent coupling, after the particle is eliminated
    this.Akk = B(1) // constraint diagonal, after the particle is eliminated
    this.Si = B(9) // inverse of each particle's eliminated diagonal block
    this.bv = B(3)
    this.bk = B(1)
    this.sol = B(3)
    this.nu = B(1)
    this.Pk = new Float64Array(m * 9) // each constraint's sideways projector, times its stiffness
    this.T = new Float64Array(m) // tension in each constraint (dyn), from the last substep
    // a touch of compliance (cm per g cm of impulse): keeps the system well conditioned next to held
    // points; at the largest tensions here it stretches a segment by a hundredth of a micron
    this.E = 1e-4
  }

  /** One solve of all length constraints at once. Returns the largest error before it. */
  solveLengths() {
    const { x, p, n, m, ca, cb, cL, pk, par, sv, su, post, root, Hd, Hu, Jv, Ju, Aku, Akk, Si, bv, bk, sol, nu, Pk, T, mass, w } = this
    const h2 = DT * DT
    const HELD = 1e12
    // particles: mass on the diagonal (held ones immovable), nothing on the right yet
    for (let i = 0; i < n; i++) {
      const mi = w[i] === 0 ? HELD : mass[i]
      const o = i * 9
      Hd[o] = Hd[o + 4] = Hd[o + 8] = mi
      Hd[o + 1] = Hd[o + 2] = Hd[o + 3] = Hd[o + 5] = Hd[o + 6] = Hd[o + 7] = 0
      bv[i * 3] = bv[i * 3 + 1] = bv[i * 3 + 2] = 0
    }
    let worst = 0
    // constraints: directions, errors, geometric stiffness
    for (const v of post) {
      const k = pk[v]
      const u = par[v]
      const a = ca[k]
      const b = cb[k]
      let nx = x[b * 3] - x[a * 3]
      let ny = x[b * 3 + 1] - x[a * 3 + 1]
      let nz = x[b * 3 + 2] - x[a * 3 + 2]
      const d = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1e-9
      nx /= d
      ny /= d
      nz /= d
      const c = d - cL[k]
      if (Math.abs(c) > worst) worst = Math.abs(c)
      bk[v] = -c
      Akk[v] = -this.E
      Jv[v * 3] = sv[v] * nx
      Jv[v * 3 + 1] = sv[v] * ny
      Jv[v * 3 + 2] = sv[v] * nz
      Ju[v * 3] = su[v] * nx
      Ju[v * 3 + 1] = su[v] * ny
      Ju[v * 3 + 2] = su[v] * nz
      // g (I - n n^T): stiffness against sideways motion, g = h^2 T / L
      const g = (h2 * T[k]) / cL[k]
      const P = Pk
      const o = k * 9
      P[o] = g * (1 - nx * nx)
      P[o + 1] = P[o + 3] = -g * nx * ny
      P[o + 2] = P[o + 6] = -g * nx * nz
      P[o + 4] = g * (1 - ny * ny)
      P[o + 5] = P[o + 7] = -g * ny * nz
      P[o + 8] = g * (1 - nz * nz)
      for (let e = 0; e < 9; e++) {
        Hd[v * 9 + e] += P[o + e]
        Hd[u * 9 + e] += P[o + e]
        Hu[v * 9 + e] = -P[o + e]
      }
    }

    // eliminate, leaves first
    const S = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    const t3 = [0, 0, 0]
    const M3 = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    for (const v of post) {
      const u = par[v]
      inv3(Hd, v * 9, Si, v * 9)
      for (let e = 0; e < 9; e++) S[e] = Si[v * 9 + e]
      // L_kv = Jv S (row); the constraint's diagonal and its coupling to the parent
      const j0 = Jv[v * 3]
      const j1 = Jv[v * 3 + 1]
      const j2 = Jv[v * 3 + 2]
      const l0 = j0 * S[0] + j1 * S[3] + j2 * S[6]
      const l1 = j0 * S[1] + j1 * S[4] + j2 * S[7]
      const l2 = j0 * S[2] + j1 * S[5] + j2 * S[8]
      Akk[v] -= l0 * j0 + l1 * j1 + l2 * j2
      // Aku = Ju - L_kv H_vu
      const o = v * 9
      Aku[v * 3] = Ju[v * 3] - (l0 * Hu[o] + l1 * Hu[o + 3] + l2 * Hu[o + 6])
      Aku[v * 3 + 1] = Ju[v * 3 + 1] - (l0 * Hu[o + 1] + l1 * Hu[o + 4] + l2 * Hu[o + 7])
      Aku[v * 3 + 2] = Ju[v * 3 + 2] - (l0 * Hu[o + 2] + l1 * Hu[o + 5] + l2 * Hu[o + 8])
      // the parent's block: minus H_uv S H_vu
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) M3[r * 3 + c] = Hu[o + r * 3] * S[c] + Hu[o + r * 3 + 1] * S[3 + c] + Hu[o + r * 3 + 2] * S[6 + c]
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
          Hd[u * 9 + r * 3 + c] -= M3[r * 3] * Hu[o + c] + M3[r * 3 + 1] * Hu[o + 3 + c] + M3[r * 3 + 2] * Hu[o + 6 + c]
      // right-hand side, forward: the constraint and the parent pick up the particle's
      const b0 = bv[v * 3]
      const b1 = bv[v * 3 + 1]
      const b2 = bv[v * 3 + 2]
      bk[v] -= l0 * b0 + l1 * b1 + l2 * b2
      for (let r = 0; r < 3; r++) bv[u * 3 + r] -= M3[r * 3] * b0 + M3[r * 3 + 1] * b1 + M3[r * 3 + 2] * b2
      // then the constraint itself: its diagonal is negative, so this adds stiffness to the parent
      const dk = Akk[v]
      const a0 = Aku[v * 3]
      const a1 = Aku[v * 3 + 1]
      const a2 = Aku[v * 3 + 2]
      t3[0] = a0 / dk
      t3[1] = a1 / dk
      t3[2] = a2 / dk
      const ou = u * 9
      Hd[ou] -= t3[0] * a0
      Hd[ou + 1] -= t3[0] * a1
      Hd[ou + 2] -= t3[0] * a2
      Hd[ou + 3] -= t3[1] * a0
      Hd[ou + 4] -= t3[1] * a1
      Hd[ou + 5] -= t3[1] * a2
      Hd[ou + 6] -= t3[2] * a0
      Hd[ou + 7] -= t3[2] * a1
      Hd[ou + 8] -= t3[2] * a2
      const bkv = bk[v]
      bv[u * 3] -= t3[0] * bkv
      bv[u * 3 + 1] -= t3[1] * bkv
      bv[u * 3 + 2] -= t3[2] * bkv
    }
    // the root, then back down
    inv3(Hd, root * 9, Si, root * 9)
    mul3(Si, root * 9, bv, root * 3, sol, root * 3)
    for (let q = post.length - 1; q >= 0; q--) {
      const v = post[q]
      const u = par[v]
      const xu0 = sol[u * 3]
      const xu1 = sol[u * 3 + 1]
      const xu2 = sol[u * 3 + 2]
      const xk = (bk[v] - (Aku[v * 3] * xu0 + Aku[v * 3 + 1] * xu1 + Aku[v * 3 + 2] * xu2)) / Akk[v]
      nu[v] = xk
      const o = v * 9
      t3[0] = bv[v * 3] - (Hu[o] * xu0 + Hu[o + 1] * xu1 + Hu[o + 2] * xu2) - Jv[v * 3] * xk
      t3[1] = bv[v * 3 + 1] - (Hu[o + 3] * xu0 + Hu[o + 4] * xu1 + Hu[o + 5] * xu2) - Jv[v * 3 + 1] * xk
      t3[2] = bv[v * 3 + 2] - (Hu[o + 6] * xu0 + Hu[o + 7] * xu1 + Hu[o + 8] * xu2) - Jv[v * 3 + 2] * xk
      const s = Si
      sol[v * 3] = s[o] * t3[0] + s[o + 1] * t3[1] + s[o + 2] * t3[2]
      sol[v * 3 + 1] = s[o + 3] * t3[0] + s[o + 4] * t3[1] + s[o + 5] * t3[2]
      sol[v * 3 + 2] = s[o + 6] * t3[0] + s[o + 7] * t3[1] + s[o + 8] * t3[2]
    }
    // move the particles (a safety net scales the step down if anything would jump), and keep
    // each constraint's tension for the next substep
    let big = 0
    for (let i = 0; i < n; i++) {
      if (w[i] === 0) continue
      const d2 = sol[i * 3] ** 2 + sol[i * 3 + 1] ** 2 + sol[i * 3 + 2] ** 2
      if (d2 > big) big = d2
    }
    big = Math.sqrt(big)
    const scale = big > this.maxStep ? this.maxStep / big : 1
    for (let i = 0; i < n; i++) {
      if (w[i] === 0 || !this.inTree[i]) continue
      x[i * 3] += sol[i * 3] * scale
      x[i * 3 + 1] += sol[i * 3 + 1] * scale
      x[i * 3 + 2] += sol[i * 3 + 2] * scale
    }
    // the tension the next substep's stiffness uses: what this one found, or a slowly fading
    // memory of a higher one (tension that drops for an instant would otherwise leave the next
    // substep without the stiffness it needs)
    for (const v of post) {
      const k = pk[v]
      T[k] = Math.min(2e5, Math.max(nu[v] / h2, T[k] * 0.98, 0))
    }
    return worst
  }

  // ---------------------------------------------------------------- set-up for contacts

  /** Distance along the cable between every pair of particles (pieces count their length). */
  prepareDistances() {
    const { n, m, ca, cb, cL } = this
    const adj = Array.from({ length: n }, () => [])
    for (let k = 0; k < m; k++) {
      adj[ca[k]].push([cb[k], cL[k]])
      adj[cb[k]].push([ca[k], cL[k]])
    }
    const D = new Float32Array(n * n).fill(1e9)
    for (let src = 0; src < n; src++) {
      if (!adj[src].length) continue
      D[src * n + src] = 0
      const stack = [src]
      while (stack.length) {
        const u = stack.pop()
        for (const [v, l] of adj[u]) {
          const d = D[src * n + u] + l
          if (d < D[src * n + v]) {
            D[src * n + v] = d
            stack.push(v)
          }
        }
      }
    }
    this.along = D
    // the longest an earbud may be from the other: the cable between them, less a margin
    this.budSpan = D[this.anchors.left * n + this.anchors.right] - 0.5
  }

  prepareCollisions() {
    const s = this.s
    // the cable's beads (pieces collide through their own shapes)
    const cab = []
    for (let i = 0; i < this.n; i++) if (this.pieceOf[i] < 0 && this.inTree[i]) cab.push(i)
    this.cab = new Int32Array(cab)
    this.ncab = cab.length
    this.cell = 2 * (2 * s.cableR + 0.01)
    this.buckets = 2048
    this.head = new Int32Array(this.buckets)
    this.nextP = new Int32Array(this.ncab)
    this.keyOf = new Uint32Array(this.ncab)
    // beads closer than this along the cable never collide (the cable can't fold that tightly)
    this.skip = 5 * s.cableR
    // for each particle and each piece: how far along the cable it is from that piece, so the
    // cable doesn't collide with the part it comes out of
    const n = this.n
    this.nearPiece = new Uint8Array(n * 3)
    ;['remote', 'splitter', 'plug'].forEach((name, k) => {
      const [a, b] = this.pieces[name]
      for (let i = 0; i < n; i++) {
        const d = Math.min(this.along[a * n + i], this.along[b * n + i])
        if (d < 0.6) this.nearPiece[i * 3 + k] = 1
      }
    })
    // and the earbuds' own first few particles don't collide with their stems
    this.nearBud = { left: new Uint8Array(n), right: new Uint8Array(n) }
    for (const side of ['left', 'right']) {
      const a = this.anchors[side]
      for (let i = 0; i < n; i++) if (this.along[a * n + i] < 0.7) this.nearBud[side][i] = 1
    }
  }

  // ---------------------------------------------------------------- driving it

  /** Earbud placement for the next frame (4x4 column-major matrices, e.g. three.js Matrix4.elements). */
  setEarbuds(leftMatrix, rightMatrix, snap = false) {
    for (const [side, m] of [
      ['left', leftMatrix],
      ['right', rightMatrix],
    ]) {
      const b = this.bud[side]
      const mirror = side === 'right'
      b.from.set(b.to)
      this.budFrom[side].set(snap ? m : this.budTo[side])
      this.budTo[side].set(m)
      transform(m, BUD_EXIT, mirror, b.to, 0)
      transform(m, BUD_GUIDE, mirror, b.to, 3)
      transform(m, [0, 0, 0], mirror, b.to, 6)
      if (snap) b.from.set(b.to)
      b.now.set(b.to)
      b.m = m
      this.invert(m, b.inv)
    }
  }

  /** Inverse of a rigid transform (rotation + translation), column-major. */
  invert(m, out) {
    // transpose the rotation
    out[0] = m[0]
    out[1] = m[4]
    out[2] = m[8]
    out[4] = m[1]
    out[5] = m[5]
    out[6] = m[9]
    out[8] = m[2]
    out[9] = m[6]
    out[10] = m[10]
    out[3] = out[7] = out[11] = 0
    out[12] = -(out[0] * m[12] + out[4] * m[13] + out[8] * m[14])
    out[13] = -(out[1] * m[12] + out[5] * m[13] + out[9] * m[14])
    out[14] = -(out[2] * m[12] + out[6] * m[13] + out[10] * m[14])
    out[15] = 1
  }

  /**
   * Take hold of something: a particle of the cable ({ i }), or a point along one of the pieces
   * ({ piece, t }), and move it towards (x, y, z).
   */
  grab(what, x, y, z) {
    this.release()
    const g = { ...what, target: new Float64Array([x, y, z]), from: new Float64Array([x, y, z]), to: new Float64Array([x, y, z]) }
    if (what.piece) {
      const [a, b] = this.pieces[what.piece]
      g.a = a
      g.b = b
    } else {
      this.w[what.i] = 0
    }
    this.grabbed = g
    this.moveGrab(x, y, z)
    g.from.set(g.to)
  }

  moveGrab(x, y, z) {
    const g = this.grabbed
    if (!g) return
    g.to[0] = x
    g.to[1] = y
    g.to[2] = z
    this.reach(g.to)
  }

  release() {
    const g = this.grabbed
    if (g && g.i !== undefined) this.w[g.i] = this.w0[g.i]
    this.grabbed = null
  }

  /** How far along the cable the grabbed point is from particle j. */
  alongFrom(j) {
    const g = this.grabbed
    const n = this.n
    if (g.i !== undefined) return this.along[j * n + g.i]
    const len = PIECES[g.piece].len
    return Math.min(this.along[j * n + g.a] + g.t * len, this.along[j * n + g.b] + (1 - g.t) * len)
  }

  /** Pull a target back inside what the cable can reach from both earbuds. */
  reach(t) {
    for (let it = 0; it < 4; it++)
      for (const side of ['left', 'right']) {
        const a = this.anchors[side]
        const L = this.alongFrom(a) * 0.995
        const dx = t[0] - this.x[a * 3]
        const dy = t[1] - this.x[a * 3 + 1]
        const dz = t[2] - this.x[a * 3 + 2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d > L) {
          const k = L / d
          t[0] = this.x[a * 3] + dx * k
          t[1] = this.x[a * 3 + 1] + dy * k
          t[2] = this.x[a * 3 + 2] + dz * k
        }
      }
    // and not into the floor
    t[1] = Math.max(t[1], this.s.floorY + 0.12)
  }

  /** Advance by a frame's worth of time, in fixed substeps. */
  step(frameDt) {
    this.acc += Math.min(frameDt, 0.06)
    let steps = Math.floor(this.acc / DT)
    this.acc -= steps * DT
    if (steps > MAX_SUBSTEPS) steps = MAX_SUBSTEPS
    for (let k = 0; k < steps; k++) this.substep((k + 1) / steps)
    for (const side of ['left', 'right']) this.bud[side].from.set(this.bud[side].to)
    const g = this.grabbed
    if (g) g.from.set(g.to)
    return steps
  }

  substep(t) {
    const { x, p, w, s } = this
    const n = this.n
    this.time += DT
    this.count = (this.count || 0) + 1
    this.frac = t

    // held points move with their earbud, interpolated through the frame; their previous position
    // is kept, so whatever is let go of leaves with the velocity it had
    const hold = (i, px, py, pz) => {
      p[i * 3] = x[i * 3]
      p[i * 3 + 1] = x[i * 3 + 1]
      p[i * 3 + 2] = x[i * 3 + 2]
      x[i * 3] = px
      x[i * 3 + 1] = py
      x[i * 3 + 2] = pz
    }
    for (const side of ['left', 'right']) {
      const b = this.bud[side]
      for (let k = 0; k < 9; k++) b.now[k] = b.from[k] + (b.to[k] - b.from[k]) * t
      hold(this.anchors[side], b.now[0], b.now[1], b.now[2])
      hold(this.guides[side], b.now[3], b.now[4], b.now[5])
    }
    const g = this.grabbed
    if (g) for (let k = 0; k < 3; k++) g.target[k] = g.from[k] + (g.to[k] - g.from[k]) * t
    if (g && g.i !== undefined) hold(g.i, g.target[0], g.target[1], g.target[2])

    // 1. Verlet: inertia, gravity, air drag
    const keep = 1 - s.air * DT
    const gy = G * DT * DT
    for (let i = 0; i < n; i++) {
      if (w[i] === 0) continue
      const j = i * 3
      let vx = (x[j] - p[j]) * keep
      let vy = (x[j + 1] - p[j + 1]) * keep
      let vz = (x[j + 2] - p[j + 2]) * keep
      // nothing moves more than 2 cm in a substep (1200 cm/s): a safety net, never reached in use
      const v2 = vx * vx + vy * vy + vz * vz
      if (v2 > 4) {
        const k = 2 / Math.sqrt(v2)
        vx *= k
        vy *= k
        vz *= k
      }
      p[j] = x[j]
      p[j + 1] = x[j + 1]
      p[j + 2] = x[j + 2]
      x[j] += vx
      x[j + 1] += vy - gy
      x[j + 2] += vz
    }

    // 2. bending and strain reliefs
    if (g && g.piece) this.holdPiece(g)
    this.solveBend()
    this.solveReliefs()
    // 3. contacts: the floor first (its friction resists the substep's sliding, which must not
    // include the other contacts' pushes), then the earbuds, the pieces, the cable itself
    this.collideFloor()
    this.collideBuds()
    this.collidePieces()
    this.collideCable()
    // 4. inextensibility: all lengths at once; then the floor once more, for anything the solve
    // pushed into it (a hair, at most)
    this.solveLengths()
    // a second pass if the first left anything visibly off (it converges quadratically)
    this.lengthError = this.maxError()
    if (this.lengthError > 0.008) {
      this.solveLengths()
      this.lengthError = this.maxError()
    }
    if (g && g.piece) this.holdPiece(g)
    this.collideFloor(true)
    // 5. internal damping
    this.smooth()
  }

  solveBend() {
    const { x, w, bendA, bendM, bendB, bendC } = this
    const nb = bendA.length
    for (let q = 0; q < nb; q++) {
      const a = bendA[q]
      const m = bendM[q]
      const b = bendB[q]
      const wa = w[a]
      const wm = w[m]
      const wb = w[b]
      // the middle particle's offset from the triangle's centroid: zero when straight
      const ex = x[m * 3] - (x[a * 3] + x[m * 3] + x[b * 3]) / 3
      const ey = x[m * 3 + 1] - (x[a * 3 + 1] + x[m * 3 + 1] + x[b * 3 + 1]) / 3
      const ez = x[m * 3 + 2] - (x[a * 3 + 2] + x[m * 3 + 2] + x[b * 3 + 2]) / 3
      const c = Math.sqrt(ex * ex + ey * ey + ez * ez)
      if (c < 1e-9) continue
      const W = (4 / 9) * wm + (wa + wb) / 9 + bendC[q]
      if (W === 0) continue
      const l = -c / W / c // Δλ / c, applied to the unnormalised offset
      x[m * 3] += (2 / 3) * wm * l * ex
      x[m * 3 + 1] += (2 / 3) * wm * l * ey
      x[m * 3 + 2] += (2 / 3) * wm * l * ez
      x[a * 3] -= (1 / 3) * wa * l * ex
      x[a * 3 + 1] -= (1 / 3) * wa * l * ey
      x[a * 3 + 2] -= (1 / 3) * wa * l * ez
      x[b * 3] -= (1 / 3) * wb * l * ex
      x[b * 3 + 1] -= (1 / 3) * wb * l * ey
      x[b * 3 + 2] -= (1 / 3) * wb * l * ez
    }
  }

  /**
   * Strain reliefs: each part's cable leaves it in line with the part (at the splitter, in line
   * with its two sleeves, which lean apart). For a part f->a and the cable's first particle c, the
   * constraint is c's distance from the point straight on from a,
   *     e = a + (a - f) r,   r = |c - a| / |a - f|,
   * an XPBD constraint whose gradients sum to zero: the cable pulls the part round as much as the
   * part pulls the cable straight.
   */
  solveReliefs() {
    const { x, w, relief } = this
    const align = (f, a, c, dx, dy, dz, alpha) => {
      // (dx, dy, dz): the unit direction the cable should leave a in (from f's side)
      const lc = Math.sqrt((x[c * 3] - x[a * 3]) ** 2 + (x[c * 3 + 1] - x[a * 3 + 1]) ** 2 + (x[c * 3 + 2] - x[a * 3 + 2]) ** 2)
      const lf = Math.sqrt((x[a * 3] - x[f * 3]) ** 2 + (x[a * 3 + 1] - x[f * 3 + 1]) ** 2 + (x[a * 3 + 2] - x[f * 3 + 2]) ** 2) || 1
      const r = lc / lf
      const ex = x[c * 3] - (x[a * 3] + dx * lc)
      const ey = x[c * 3 + 1] - (x[a * 3 + 1] + dy * lc)
      const ez = x[c * 3 + 2] - (x[a * 3 + 2] + dz * lc)
      const C = Math.sqrt(ex * ex + ey * ey + ez * ez)
      if (C < 1e-9) return
      const W = w[c] + w[a] * (1 + r) * (1 + r) + w[f] * r * r + alpha
      if (W === 0) return
      const l = -C / W / C
      // gradients: c: +n, a: -(1 + r) n, f: +r n
      x[c * 3] += w[c] * l * ex
      x[c * 3 + 1] += w[c] * l * ey
      x[c * 3 + 2] += w[c] * l * ez
      const ka = -(1 + r) * w[a] * l
      x[a * 3] += ka * ex
      x[a * 3 + 1] += ka * ey
      x[a * 3 + 2] += ka * ez
      const kf = r * w[f] * l
      x[f * 3] += kf * ex
      x[f * 3 + 1] += kf * ey
      x[f * 3 + 2] += kf * ez
    }
    const alpha = this.reliefC
    for (let q = 0; q < relief.length; q += 3) {
      const f = relief[q]
      const a = relief[q + 1]
      const c = relief[q + 2]
      let ux = x[a * 3] - x[f * 3]
      let uy = x[a * 3 + 1] - x[f * 3 + 1]
      let uz = x[a * 3 + 2] - x[f * 3 + 2]
      const ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1
      align(f, a, c, ux / ul, uy / ul, uz / ul, alpha)
    }
    // the splitter: both cables come in from above, leaning apart sideways
    const [top, bot] = this.pieces.splitter
    const [cl, cr] = this.sleeves
    let ux = x[top * 3] - x[bot * 3]
    let uy = x[top * 3 + 1] - x[bot * 3 + 1]
    let uz = x[top * 3 + 2] - x[bot * 3 + 2]
    const ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1
    ux /= ul
    uy /= ul
    uz /= ul
    // sideways: from the right cable towards the left one, square to the splitter
    let sx = x[cl * 3] - x[cr * 3]
    let sy = x[cl * 3 + 1] - x[cr * 3 + 1]
    let sz = x[cl * 3 + 2] - x[cr * 3 + 2]
    const d = sx * ux + sy * uy + sz * uz
    sx -= d * ux
    sy -= d * uy
    sz -= d * uz
    const sl = Math.sqrt(sx * sx + sy * sy + sz * sz)
    if (sl < 1e-6) return
    sx /= sl
    sy /= sl
    sz /= sl
    const ca = Math.cos(this.s.splay)
    const sa = Math.sin(this.s.splay)
    align(bot, top, cl, ux * ca + sx * sa, uy * ca + sy * sa, uz * ca + sz * sa, alpha * 2)
    align(bot, top, cr, ux * ca - sx * sa, uy * ca - sy * sa, uz * ca - sz * sa, alpha * 2)
  }

  /** A held point along a piece: moved onto its target, the piece turning about it. */
  holdPiece(g) {
    const { x, w } = this
    const { a, b, t } = g
    const wa = w[a] * (1 - t)
    const wb = w[b] * t
    const W = w[a] * (1 - t) ** 2 + w[b] * t * t
    if (W < 1e-12) return
    for (let k = 0; k < 3; k++) {
      const c = x[a * 3 + k] * (1 - t) + x[b * 3 + k] * t
      const l = (g.target[k] - c) / W
      x[a * 3 + k] += wa * l
      x[b * 3 + k] += wb * l
    }
  }

  // ---------------------------------------------------------------- contacts

  /** A sphere (centre c, radius r) at parameter t between particles a and b, pushed by (dx, dy, dz). */
  pushPoint(a, b, t, dx, dy, dz) {
    const { x, w } = this
    const W = w[a] * (1 - t) ** 2 + w[b] * t * t
    if (W < 1e-12) return
    const ka = (w[a] * (1 - t)) / W
    const kb = (w[b] * t) / W
    x[a * 3] += dx * ka
    x[a * 3 + 1] += dy * ka
    x[a * 3 + 2] += dz * ka
    x[b * 3] += dx * kb
    x[b * 3 + 1] += dy * kb
    x[b * 3 + 2] += dz * kb
  }

  /** The floor, with Coulomb friction: static below muS times the push, sliding above it. */
  collideFloor(noFriction = false) {
    const { x, p, w, rad, pieceOf } = this
    const fy = this.s.floorY
    const muS = noFriction ? 0 : this.s.muS
    const muK = noFriction ? 0 : this.s.muK
    for (let i = 0; i < this.n; i++) {
      if (w[i] === 0 || pieceOf[i] >= 0) continue
      const j = i * 3
      const lo = fy + rad[i]
      if (x[j + 1] >= lo) continue
      const pen = lo - x[j + 1]
      x[j + 1] = lo
      if (muK === 0) continue
      // tangential travel this substep: cancelled (sticking) or reduced (sliding)
      const tx = x[j] - p[j]
      const tz = x[j + 2] - p[j + 2]
      const tl = Math.sqrt(tx * tx + tz * tz)
      if (tl < 1e-12) continue
      const f = tl < muS * pen ? 1 : Math.min(1, (muK * pen) / tl)
      x[j] -= tx * f
      x[j + 2] -= tz * f
    }
    // the pieces rest on the ends of their shapes
    for (let k = 0; k < 3; k++) {
      const name = PIECE_NAMES[k]
      const a = this.pieces[name][0]
      const b = this.pieces[name][1]
      const shape = PIECES[name].shape
      for (let q = 0; q < shape.length; q++)
        for (let e = 0; e < 2; e++) {
          const t = shape[q][e]
          const r = shape[q][2]
          const cy = x[a * 3 + 1] * (1 - t) + x[b * 3 + 1] * t
          const pen = fy + r - cy
          if (pen <= 0) continue
          let fx = 0
          let fz = 0
          if (muK > 0) {
            const tx = (x[a * 3] - p[a * 3]) * (1 - t) + (x[b * 3] - p[b * 3]) * t
            const tz = (x[a * 3 + 2] - p[a * 3 + 2]) * (1 - t) + (x[b * 3 + 2] - p[b * 3 + 2]) * t
            const tl = Math.sqrt(tx * tx + tz * tz)
            const f = tl < 1e-12 ? 0 : tl < muS * pen ? 1 : Math.min(1, (muK * pen) / tl)
            fx = -tx * f
            fz = -tz * f
          }
          this.pushPoint(a, b, t, fx, pen, fz)
        }
    }
  }

  /** Cable and pieces against the earbuds: ellipsoids for the head, capsules for the stem. */
  collideBuds() {
    const { x, w, rad, n } = this
    const q = this.q3 || (this.q3 = new Float64Array(3))
    const push = this.push3 || (this.push3 = new Float64Array(3))
    for (const side of ['left', 'right']) {
      // the earbud where it is in this substep: its matrix, interpolated
      const m = this.lerpMatrix(side)
      const inv = this.invTmp || (this.invTmp = new Float64Array(16))
      this.invert(m, inv)
      const mirror = side === 'right' ? -1 : 1
      const hx = m[12]
      const hy = m[13]
      const hz = m[14]
      const near = this.nearBud[side]
      const test = (px, py, pz, r) => {
        // in the earbud's frame (left-handed for the right one: mirror x)
        q[0] = (inv[0] * px + inv[4] * py + inv[8] * pz + inv[12]) * mirror
        q[1] = inv[1] * px + inv[5] * py + inv[9] * pz + inv[13]
        q[2] = inv[2] * px + inv[6] * py + inv[10] * pz + inv[14]
        let ox = 0
        let oy = 0
        let oz = 0
        let hit = false
        for (const e of BUD_ELLIPSOIDS) {
          const dx = q[0] - e[0]
          const dy = q[1] - e[1]
          const dz = q[2] - e[2]
          const k = Math.sqrt((dx / (e[3] + r)) ** 2 + (dy / (e[4] + r)) ** 2 + (dz / (e[5] + r)) ** 2)
          if (k < 1 && k > 1e-9) {
            // out along the scaled radius
            ox += dx / k - dx
            oy += dy / k - dy
            oz += dz / k - dz
            hit = true
          }
        }
        for (const c of BUD_CAPSULES) {
          const ux = c[3] - c[0]
          const uy = c[4] - c[1]
          const uz = c[5] - c[2]
          const vx = q[0] - c[0]
          const vy = q[1] - c[1]
          const vz = q[2] - c[2]
          let tt = (ux * vx + uy * vy + uz * vz) / (ux * ux + uy * uy + uz * uz)
          tt = tt < 0 ? 0 : tt > 1 ? 1 : tt
          const ex = vx - ux * tt
          const ey = vy - uy * tt
          const ez = vz - uz * tt
          const d = Math.sqrt(ex * ex + ey * ey + ez * ez)
          const rr = c[6] + r
          if (d < rr && d > 1e-9) {
            const k = (rr - d) / d
            ox += ex * k
            oy += ey * k
            oz += ez * k
            hit = true
          }
        }
        if (!hit) return false
        // back to world: rotate the push (mirror x again)
        ox *= mirror
        push[0] = m[0] * ox + m[4] * oy + m[8] * oz
        push[1] = m[1] * ox + m[5] * oy + m[9] * oz
        push[2] = m[2] * ox + m[6] * oy + m[10] * oz
        return true
      }
      const R2 = BUD_REACH * BUD_REACH
      for (let i = 0; i < n; i++) {
        if (w[i] === 0 || near[i] || this.pieceOf[i] >= 0) continue
        const j = i * 3
        const dx = x[j] - hx
        const dy = x[j + 1] - hy
        const dz = x[j + 2] - hz
        if (dx * dx + (dy + 1.6) * (dy + 1.6) + dz * dz > R2 * 1.6) continue
        if (test(x[j], x[j + 1], x[j + 2], rad[i])) {
          x[j] += push[0]
          x[j + 1] += push[1]
          x[j + 2] += push[2]
        }
      }
      // the pieces, by the ends of their shapes
      for (const name of ['remote', 'splitter', 'plug']) {
        const [a, c] = this.pieces[name]
        for (const [t0, t1, r] of PIECES[name].shape)
          for (const t of [t0, (t0 + t1) / 2, t1]) {
            const px = x[a * 3] * (1 - t) + x[c * 3] * t
            const py = x[a * 3 + 1] * (1 - t) + x[c * 3 + 1] * t
            const pz = x[a * 3 + 2] * (1 - t) + x[c * 3 + 2] * t
            const dx = px - hx
            const dy = py - hy
            const dz = pz - hz
            if (dx * dx + (dy + 1.6) * (dy + 1.6) + dz * dz > R2 * 2) continue
            if (test(px, py, pz, r)) this.pushPoint(a, c, t, push[0], push[1], push[2])
          }
      }
    }
  }

  /** The earbud's matrix at this point in the frame (translation interpolated; rotation from the end). */
  lerpMatrix(side) {
    const out = this[`lm_${side}`] || (this[`lm_${side}`] = new Float64Array(16))
    const a = this.budFrom[side]
    const b = this.budTo[side]
    const t = this.frac ?? 1
    for (let k = 0; k < 16; k++) out[k] = b[k]
    out[12] = a[12] + (b[12] - a[12]) * t
    out[13] = a[13] + (b[13] - a[13]) * t
    out[14] = a[14] + (b[14] - a[14]) * t
    return out
  }

  /** Cable particles against the pieces they don't come out of; and the pieces against each other. */
  collidePieces() {
    const { x, w, rad, n } = this
    const names = ['remote', 'splitter', 'plug']
    for (let k = 0; k < 3; k++) {
      const name = names[k]
      const [a, b] = this.pieces[name]
      const shape = PIECES[name].shape
      // a rough box around the piece
      const ax = x[a * 3]
      const ay = x[a * 3 + 1]
      const az = x[a * 3 + 2]
      const ux = x[b * 3] - ax
      const uy = x[b * 3 + 1] - ay
      const uz = x[b * 3 + 2] - az
      const uu = ux * ux + uy * uy + uz * uz
      const pad = 0.45
      const x0 = Math.min(ax, ax + ux) - pad
      const x1 = Math.max(ax, ax + ux) + pad
      const y0 = Math.min(ay, ay + uy) - pad
      const y1 = Math.max(ay, ay + uy) + pad
      const z0 = Math.min(az, az + uz) - pad
      const z1 = Math.max(az, az + uz) + pad
      for (let i = 0; i < n; i++) {
        if (this.pieceOf[i] >= 0 || this.nearPiece[i * 3 + k] || w[i] === 0) continue
        const j = i * 3
        if (x[j] < x0 || x[j] > x1 || x[j + 1] < y0 || x[j + 1] > y1 || x[j + 2] < z0 || x[j + 2] > z1) continue
        const vx = x[j] - ax
        const vy = x[j + 1] - ay
        const vz = x[j + 2] - az
        const tt = (ux * vx + uy * vy + uz * vz) / uu
        for (const [t0, t1, r] of shape) {
          const t = tt < t0 ? t0 : tt > t1 ? t1 : tt
          const ex = vx - ux * t
          const ey = vy - uy * t
          const ez = vz - uz * t
          const d = Math.sqrt(ex * ex + ey * ey + ez * ez)
          const rr = r + rad[i]
          if (d >= rr || d < 1e-9) continue
          // split the push between the particle and the piece by their weights
          const W = w[i] + w[a] * (1 - t) ** 2 + w[b] * t * t
          const lam = (rr - d) / d / W
          x[j] += ex * lam * w[i]
          x[j + 1] += ey * lam * w[i]
          x[j + 2] += ez * lam * w[i]
          this.pushPoint(a, b, t, -ex * lam * (W - w[i]), -ey * lam * (W - w[i]), -ez * lam * (W - w[i]))
        }
      }
    }
    // pieces against pieces: sample each one's shape as spheres against the other's capsules
    for (let k = 0; k < 3; k++)
      for (let l = 0; l < 3; l++) {
        if (k === l) continue
        const [a, b] = this.pieces[names[k]]
        const [c, d] = this.pieces[names[l]]
        for (const [t0, t1, r] of PIECES[names[k]].shape)
          for (const t of [t0, (t0 + t1) / 2, t1]) {
            const px = x[a * 3] * (1 - t) + x[b * 3] * t
            const py = x[a * 3 + 1] * (1 - t) + x[b * 3 + 1] * t
            const pz = x[a * 3 + 2] * (1 - t) + x[b * 3 + 2] * t
            const ux = x[d * 3] - x[c * 3]
            const uy = x[d * 3 + 1] - x[c * 3 + 1]
            const uz = x[d * 3 + 2] - x[c * 3 + 2]
            const vx = px - x[c * 3]
            const vy = py - x[c * 3 + 1]
            const vz = pz - x[c * 3 + 2]
            const tt = (ux * vx + uy * vy + uz * vz) / (ux * ux + uy * uy + uz * uz)
            for (const [s0, s1, r2] of PIECES[names[l]].shape) {
              const u = tt < s0 ? s0 : tt > s1 ? s1 : tt
              const ex = vx - ux * u
              const ey = vy - uy * u
              const ez = vz - uz * u
              const dist = Math.sqrt(ex * ex + ey * ey + ez * ez)
              const rr = r + r2
              if (dist >= rr || dist < 1e-9) continue
              const f = ((rr - dist) / dist) * 0.5
              this.pushPoint(a, b, t, ex * f, ey * f, ez * f)
              this.pushPoint(c, d, u, -ex * f, -ey * f, -ez * f)
            }
          }
      }
  }

  /**
   * Cable against cable. The particles are closer together than the cable is thick, so the cable
   * is a continuous string of beads: bead against bead is enough to keep it from passing through
   * itself. Neighbours are found through a spatial hash; beads close to each other along the cable
   * are skipped.
   */
  collideCable() {
    const { x, w, rad, cab, ncab, head, nextP, keyOf, along, n, buckets } = this
    head.fill(-1)
    // cells twice the contact distance: a bead's neighbours are then in the 2 x 2 x 2 block of
    // cells nearest to it
    const inv = 1 / this.cell
    const P = 1024
    const P2 = P * P
    const mask = buckets - 1
    for (let q = 0; q < ncab; q++) {
      const i = cab[q]
      const key = (Math.floor(x[i * 3] * inv) & 1023) + (Math.floor(x[i * 3 + 1] * inv) & 1023) * P + (Math.floor(x[i * 3 + 2] * inv) & 1023) * P2
      keyOf[q] = key
      const h = (Math.imul(key, 0x9e3779b1) >>> 0) & mask
      nextP[q] = head[h]
      head[h] = q
    }
    const skip = this.skip
    let hits = 0
    for (let q = 0; q < ncab; q++) {
      const i = cab[q]
      const xi = x[i * 3]
      const yi = x[i * 3 + 1]
      const zi = x[i * 3 + 2]
      // which neighbouring cell on each axis (the one on the side of the cell the bead is in)
      const fx = xi * inv
      const fy = yi * inv
      const fz = zi * inv
      const sx = fx - Math.floor(fx) < 0.5 ? -1 : 1
      const sy = fy - Math.floor(fy) < 0.5 ? -P : P
      const sz = fz - Math.floor(fz) < 0.5 ? -P2 : P2
      const key = keyOf[q]
      for (let o = 0; o < 8; o++) {
        const k2 = (key + (o & 1 ? sx : 0) + (o & 2 ? sy : 0) + (o & 4 ? sz : 0)) >>> 0
        for (let r = head[(Math.imul(k2, 0x9e3779b1) >>> 0) & mask]; r >= 0; r = nextP[r]) {
          if (r <= q || keyOf[r] !== k2) continue
          const j = cab[r]
          const dx = x[j * 3] - xi
          const dy = x[j * 3 + 1] - yi
          const dz = x[j * 3 + 2] - zi
          const rr = rad[i] + rad[j]
          const d2 = dx * dx + dy * dy + dz * dz
          if (d2 >= rr * rr || along[i * n + j] < skip) continue
          const d = Math.sqrt(d2) || 1e-9
          const W = w[i] + w[j]
          if (W === 0) continue
          const k = (rr - d) / d / W
          x[i * 3] -= dx * k * w[i]
          x[i * 3 + 1] -= dy * k * w[i]
          x[i * 3 + 2] -= dz * k * w[i]
          x[j * 3] += dx * k * w[j]
          x[j * 3 + 1] += dy * k * w[j]
          x[j * 3 + 2] += dz * k * w[j]
          hits++
        }
      }
    }
    this.hits = hits
  }

  // ---------------------------------------------------------------- damping

  /**
   * Internal friction: each particle's velocity eased towards the average of its neighbours'.
   * A swinging or falling cable moves smoothly and keeps its momentum; only kinks and jitter lose
   * energy, which is what lets the cable come to rest naturally.
   */
  smooth() {
    const { x, p, w } = this
    const k = this.s.smooth
    if (k <= 0) return
    for (const ids of Object.values(this.chains)) {
      // velocities (per substep) along the chain, read before any of them change
      const len = ids.length
      const v = this.vtmp && this.vtmp.length >= len * 3 ? this.vtmp : (this.vtmp = new Float64Array(len * 3 + 300))
      for (let q = 0; q < len; q++) {
        const i = ids[q]
        v[q * 3] = x[i * 3] - p[i * 3]
        v[q * 3 + 1] = x[i * 3 + 1] - p[i * 3 + 1]
        v[q * 3 + 2] = x[i * 3 + 2] - p[i * 3 + 2]
      }
      for (let q = 1; q + 1 < len; q++) {
        const i = ids[q]
        if (w[i] === 0) continue
        for (let c = 0; c < 3; c++) {
          const avg = (v[(q - 1) * 3 + c] + v[(q + 1) * 3 + c]) * 0.5
          // p = x - v: easing v towards avg moves p the other way
          p[i * 3 + c] -= (avg - v[q * 3 + c]) * k
        }
      }
    }
  }

  /** Largest length error (cm) of any constraint. */
  maxError() {
    const { x, ca, cb, cL, m } = this
    let worst = 0
    for (let k = 0; k < m; k++) {
      const a = ca[k] * 3
      const b = cb[k] * 3
      const dx = x[b] - x[a]
      const dy = x[b + 1] - x[a + 1]
      const dz = x[b + 2] - x[a + 2]
      const e = Math.abs(Math.sqrt(dx * dx + dy * dy + dz * dz) - cL[k])
      if (e > worst) worst = e
    }
    return worst
  }

  // ---------------------------------------------------------------- measurements (for tests)

  /** Largest relative stretch of any length constraint. */
  maxStretch() {
    let m = 0
    for (let k = 0; k < this.m; k++) {
      const a = this.ca[k]
      const b = this.cb[k]
      const d = Math.hypot(this.x[b * 3] - this.x[a * 3], this.x[b * 3 + 1] - this.x[a * 3 + 1], this.x[b * 3 + 2] - this.x[a * 3 + 2])
      m = Math.max(m, Math.abs(d - this.cL[k]) / this.cL[k])
    }
    return m
  }

  /** Kinetic energy (g cm^2/s^2) of everything free. */
  energy() {
    let e = 0
    for (let i = 0; i < this.n; i++) {
      if (this.w[i] === 0) continue
      let v2 = 0
      for (let k = 0; k < 3; k++) v2 += ((this.x[i * 3 + k] - this.p[i * 3 + k]) / DT) ** 2
      e += 0.5 * this.mass[i] * v2
    }
    return e
  }
}
