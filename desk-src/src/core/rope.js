// Drift Wired: physics.
// Units: millimetres, grams, seconds (gravity 9810 mm/s^2).
//
// The cable is a position-based rope: particles about 4.5 mm apart, held at their spacing by
// distance constraints, with XPBD bending so it lies in soft curves. The hard parts (the buds, the
// remote, the Y-splitter, the cinch bead, the plug) are rigid bodies, each made of four particles
// kept in shape by shape matching; each collides through a few spheres, and the cable is pinned
// to points on them. A cable end pulling on a body point moves the four particles by barycentric
// weights, so the body turns about it exactly as a rigid body would.
//
// Each 120 Hz step is split into substeps; every substep integrates (Verlet), then projects:
// distance (two sweeps), bending, strain reliefs, contacts (the desk and what stands on it, with Coulomb
// friction, cable against the parts, part against part, cable against cable through a spatial
// hash), and finally restores each body's shape. 8 substeps x 2 distance sweeps = 16 iterations
// per step, always (a solver whose iteration count changed with the motion would change its own
// stiffness mid-motion, and pop).
//
// Calm, by design: contacts never bounce (a push puts a particle back on the surface but adds no
// outward speed: the desk, the parts, cable against cable); what lies on something and moves
// slower than restSpeed is held still (static friction alone, a particle's weight times mu, loses
// to the solver's own back-and-forth, and a resting cable would dither); a held point is tied to
// an anchor that follows the hand through a critically damped follower (core/follow.js) a step at
// a time, never a jump; after a release the rope is damped harder for a while, so it eases into
// its curves; and the rig keeps its last step, so a frame is drawn between two steps (blended).
//
// No three.js here: it also runs under Node for tests.
import { smoothToward } from './follow.js'

export const G = 9810
export const STEP = 1 / 120
export const SUBSTEPS = 8
/** The largest angle the cable may turn through at one particle (a bend radius of about 7 mm). */
const MAX_JOINT = (36 * Math.PI) / 180
/** A held point's anchor: drawn to the hand by a critically damped follower (s), at most this fast (mm/s). */
const GRAB_SMOOTH = 0.09
const GRAB_MAX_SPEED = 240
/** After a release, the rope's motion is damped harder, easing off over this long (s): it relaxes
 * slowly into its curves, it does not whip. */
const RELAX = 2.2
/** From this long after a release (s), what lies still grips harder as it rests, and a slow creep
 * may fall asleep (the calming above runs on a little longer: it only damps). */
const SETTLE = 1.6
/** Let go, a held thing is set down, not dropped: its anchor lowered this fast (mm/s) until it rests
 * on something, for at most this long (s). */
const LOWER_SPEED = 80
const LOWER_MAX = 0.35
let H = STEP / SUBSTEPS

// ---------------------------------------------------------------------------------- small math

const v3 = () => new Float64Array(3)
function quatToMat(q, m) {
  const [x, y, z, w] = q
  m[0] = 1 - 2 * (y * y + z * z)
  m[1] = 2 * (x * y + z * w)
  m[2] = 2 * (x * z - y * w)
  m[3] = 2 * (x * y - z * w)
  m[4] = 1 - 2 * (x * x + z * z)
  m[5] = 2 * (y * z + x * w)
  m[6] = 2 * (x * z + y * w)
  m[7] = 2 * (y * z - x * w)
  m[8] = 1 - 2 * (x * x + y * y)
  return m
}
// m is column-major: columns (m0 m1 m2), (m3 m4 m5), (m6 m7 m8); R v = col0*vx + col1*vy + col2*vz
const rot = (m, x, y, z, out, o = 0) => {
  out[o] = m[0] * x + m[3] * y + m[6] * z
  out[o + 1] = m[1] * x + m[4] * y + m[7] * z
  out[o + 2] = m[2] * x + m[5] * y + m[8] * z
  return out
}
function matToQuat(m, q) {
  const tr = m[0] + m[4] + m[8]
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2
    q[3] = 0.25 * s
    q[0] = (m[5] - m[7]) / s
    q[1] = (m[6] - m[2]) / s
    q[2] = (m[1] - m[3]) / s
  } else if (m[0] > m[4] && m[0] > m[8]) {
    const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2
    q[3] = (m[5] - m[7]) / s
    q[0] = 0.25 * s
    q[1] = (m[3] + m[1]) / s
    q[2] = (m[6] + m[2]) / s
  } else if (m[4] > m[8]) {
    const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2
    q[3] = (m[6] - m[2]) / s
    q[0] = (m[3] + m[1]) / s
    q[1] = 0.25 * s
    q[2] = (m[7] + m[5]) / s
  } else {
    const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2
    q[3] = (m[1] - m[3]) / s
    q[0] = (m[6] + m[2]) / s
    q[1] = (m[7] + m[5]) / s
    q[2] = 0.25 * s
  }
  const l = Math.hypot(q[0], q[1], q[2], q[3])
  for (let k = 0; k < 4; k++) q[k] /= l
  return q
}
/** A rotation taking the body's local axes (a1 then a2) onto world directions (w1, then w2 as near as it can). */
export function rotationFrom(a1, a2, w1, w2) {
  const n = (v) => {
    const l = Math.hypot(...v)
    return v.map((c) => c / l)
  }
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const e1 = n(a1)
  const e2 = n(a2.map((c, k) => c - e1[k] * dt(a2, e1)))
  const e3 = cr(e1, e2)
  const f1 = n(w1)
  const f2 = n(w2.map((c, k) => c - f1[k] * dt(w2, f1)))
  const f3 = cr(f1, f2)
  // R = F E^T, column-major
  const m = new Float64Array(9)
  for (let c = 0; c < 3; c++)
    for (let r = 0; r < 3; r++) m[c * 3 + r] = f1[r] * e1[c] + f2[r] * e2[c] + f3[r] * e3[c]
  return m
}

// ---------------------------------------------------------------------------------- the rig

export class Rig {
  /**
   * spec: { cable: { radius, density, spacing, bend }, bodies: { name: { mass, com, half, spheres,
   *   points } }, chains: [{ name, from: [body, point], to: [body, point], length, bead }] ,
   *   bead: { body, links }, ground(x, y, z, r, out), groundTop }
   */
  constructor(spec) {
    this.spec = spec
    const C = spec.cable
    this.radius = C.radius
    this.mu = { s: 0.8, k: 0.7 }
    this.air = 2.0 // 1/s
    this.smooth = 0.08 // internal damping, per substep
    // while anything is held, the cable's grip on what it lies on comes from how far it was pushed
    // out of it, but at most its own weight: the bend and the strain relief press the cable into the
    // desk where it leaves a held part, and taken as weight that made it stick, then slip, a few
    // millimetres at every step, and a dragged cable snaked. (At rest, uncapped: a curve pressed
    // into the desk by its own bend holds the shape it fell in.)
    this.penCap = 1
    this.relaxT = RELAX // (s since the last release: the rope is calmed for a while after it)
    // what lies on something and moves slower than this (mm/s) is held still: below it, static
    // friction (weight times mu, a hundredth of a millimetre a substep) loses to the solver's own
    // back-and-forth, and a resting cable would dither in place instead of lying still
    this.restSpeed = 14
    this.groundFn = spec.ground
    this.groundTop = spec.groundTop ?? 40 // (above this, nothing to lie on)

    // ---- bodies: four frame particles each
    const bodyNames = Object.keys(spec.bodies)
    const chainParticles = spec.chains.map((c) => Math.max(2, Math.round(c.length / C.spacing)) - 1)
    const n = bodyNames.length * 4 + chainParticles.reduce((a, b) => a + b, 0)
    this.n = n
    this.x = new Float64Array(n * 3)
    this.p = new Float64Array(n * 3)
    this.w = new Float64Array(n)
    this.w0 = new Float64Array(n)
    this.mass = new Float64Array(n)
    this.bodyOf = new Int16Array(n).fill(-1)
    let next = 0
    this.bodies = []
    this.byName = {}
    for (const name of bodyNames) {
      const d = spec.bodies[name]
      const [a, b, c] = d.half
      // a tetrahedron inscribed in the body's box: its inertia is about that of the part
      const tet = [
        [a, b, c],
        [a, -b, -c],
        [-a, b, -c],
        [-a, -b, c],
      ]
      const body = {
        name,
        index: this.bodies.length,
        mass: d.mass,
        com: d.com,
        q: tet, // rest offsets from the centre of mass
        f: [],
        c: v3(),
        R: new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
        quat: new Float64Array([0, 0, 0, 1]),
        inv: null,
        pins: {},
        contact: false,
        grid: d.shape.grid,
        mirror: d.mirror ? -1 : 1,
      }
      for (let k = 0; k < 4; k++) {
        const i = next++
        body.f.push(i)
        this.mass[i] = d.mass / 4
        this.w[i] = this.w0[i] = 4 / d.mass
        this.bodyOf[i] = body.index
      }
      // barycentric coordinates of any design-frame point over the four frame particles
      const P = tet.map((t) => [t[0] + d.com[0], t[1] + d.com[1], t[2] + d.com[2]])
      const M = [
        [P[1][0] - P[0][0], P[2][0] - P[0][0], P[3][0] - P[0][0]],
        [P[1][1] - P[0][1], P[2][1] - P[0][1], P[3][1] - P[0][1]],
        [P[1][2] - P[0][2], P[2][2] - P[0][2], P[3][2] - P[0][2]],
      ]
      const det =
        M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
        M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
        M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
      const inv = [
        [(M[1][1] * M[2][2] - M[1][2] * M[2][1]) / det, (M[0][2] * M[2][1] - M[0][1] * M[2][2]) / det, (M[0][1] * M[1][2] - M[0][2] * M[1][1]) / det],
        [(M[1][2] * M[2][0] - M[1][0] * M[2][2]) / det, (M[0][0] * M[2][2] - M[0][2] * M[2][0]) / det, (M[0][2] * M[1][0] - M[0][0] * M[1][2]) / det],
        [(M[1][0] * M[2][1] - M[1][1] * M[2][0]) / det, (M[0][1] * M[2][0] - M[0][0] * M[2][1]) / det, (M[0][0] * M[1][1] - M[0][1] * M[1][0]) / det],
      ]
      body.bary = (s) => {
        const r = [s[0] - P[0][0], s[1] - P[0][1], s[2] - P[0][2]]
        const b1 = inv[0][0] * r[0] + inv[0][1] * r[1] + inv[0][2] * r[2]
        const b2 = inv[1][0] * r[0] + inv[1][1] * r[1] + inv[1][2] * r[2]
        const b3 = inv[2][0] * r[0] + inv[2][1] * r[1] + inv[2][2] * r[2]
        return new Float64Array([1 - b1 - b2 - b3, b1, b2, b3])
      }
      // the surface points that touch the floor and other parts (design frame: mirrored for a
      // mirrored part), with their barycentric weights
      const sp = d.shape.points
      const np = sp.length / 3
      body.np = np
      body.pts = new Float64Array(np * 3)
      body.ptb = new Float64Array(np * 4)
      let reach = 0
      for (let k = 0; k < np; k++) {
        const s = [sp[k * 3] * body.mirror, sp[k * 3 + 1], sp[k * 3 + 2]]
        body.pts.set(s, k * 3)
        body.ptb.set(body.bary(s), k * 4)
        reach = Math.max(reach, Math.hypot(s[0] - d.com[0], s[1] - d.com[1], s[2] - d.com[2]))
      }
      body.reach = reach
      for (const [key, pt] of Object.entries(d.pins || {})) body.pins[key] = { s: pt.p, dir: pt.dir || [0, 1, 0], b: body.bary(pt.p) }
      // generalized inverse mass of a point: sum of b^2 w
      body.wOf = (b) => (b[0] * b[0] + b[1] * b[1] + b[2] * b[2] + b[3] * b[3]) * (4 / d.mass)
      // barycentric weights for any local point, fast (for contact points found on the fly)
      body.baryInto = (s0, s1, s2, out) => {
        const r0 = s0 - P[0][0]
        const r1 = s1 - P[0][1]
        const r2 = s2 - P[0][2]
        out[1] = inv[0][0] * r0 + inv[0][1] * r1 + inv[0][2] * r2
        out[2] = inv[1][0] * r0 + inv[1][1] * r1 + inv[1][2] * r2
        out[3] = inv[2][0] * r0 + inv[2][1] * r1 + inv[2][2] * r2
        out[0] = 1 - out[1] - out[2] - out[3]
        return out
      }
      this.bodies.push(body)
      this.byName[name] = body
    }

    // ---- chains of cable particles between body points
    this.chains = []
    const segMass = C.density * C.spacing
    spec.chains.forEach((c, ci) => {
      const count = chainParticles[ci]
      const ids = []
      for (let k = 0; k < count; k++) {
        const i = next++
        ids.push(i)
        this.mass[i] = segMass
        this.w[i] = this.w0[i] = 1 / segMass
      }
      const segs = count + 1
      this.chains.push({
        name: c.name,
        index: ci,
        ids,
        rest: c.length / segs,
        length: c.length,
        from: { body: this.byName[c.from[0]], point: this.byName[c.from[0]].pins[c.from[1]] },
        to: { body: this.byName[c.to[0]], point: this.byName[c.to[0]].pins[c.to[1]] },
        // the cinch bead: where it sits along the chain (u, in particles: it slides while held)
        bead: c.bead
          ? (() => {
              const k0 = Math.round(count - c.bead.at / (c.length / segs))
              return { body: this.byName[c.bead.body], hole: this.byName[c.bead.body].pins[c.bead.hole], i: ids[k0], k0, u: k0 }
            })()
          : null,
      })
    })
    this.chainOf = new Int16Array(n).fill(-1)
    this.chainIdx = new Int32Array(n).fill(-1)
    for (const ch of this.chains) ch.ids.forEach((i, k) => ((this.chainOf[i] = ch.index), (this.chainIdx[i] = k)))
    this.cable = this.chains.flatMap((c) => c.ids)
    // cable particles close (along the cable) to a body they come out of: they don't collide with it
    this.nearBody = new Uint8Array(n * this.bodies.length)
    for (const ch of this.chains)
      for (const [end, body] of [
        ['from', ch.from.body],
        ['to', ch.to.body],
      ])
        ch.ids.forEach((i, k) => {
          const along = (end === 'from' ? k + 1 : ch.ids.length - k) * ch.rest
          if (along < 13) this.nearBody[i * this.bodies.length + body.index] = 1
        })
    for (const ch of this.chains) if (ch.bead) this.beadNear(ch)

    // bending: XPBD, compliance from a bending stiffness B = rho g Lb^3
    const B = C.density * G * C.bend ** 3
    this.bendC = []
    this.bendB = B
    this.spacing = C.spacing
    this.substeps = SUBSTEPS
    this.selfCollision = spec.selfCollision !== false
    this.setSubsteps(SUBSTEPS, true)

    // spatial hash for cable against cable (segments)
    // cells twice the reach of a contact: a segment's partners are in the 2 x 2 x 2 cells nearest it
    this.cell = 2 * (C.spacing + 2 * C.radius + 0.3)
    this.buckets = 4096
    this.head = new Int32Array(this.buckets)
    this.segA = []
    this.segB = []
    for (const ch of this.chains) for (let k = 0; k + 1 < ch.ids.length; k++) (this.segA.push(ch.ids[k]), this.segB.push(ch.ids[k + 1]))
    this.nseg = this.segA.length
    this.segA = Int32Array.from(this.segA)
    this.segB = Int32Array.from(this.segB)
    this.nextSeg = new Int32Array(this.nseg)
    this.keyOf = new Int32Array(this.nseg)

    this.acc = 0
    this.count = 0
    this.time = 0
    this.grabbed = null
    this.lowering = null // (a hold being set down: see release())
    this.asleep = false
    this.quiet = 0
    this.lastBig = 0
    this.grip = 1 // contact ageing: a multiplier on friction, 1 while things move
    this.awakeTime = 0 // seconds since anything disturbed the set
    this.tmp = new Float64Array(16)
    // the state a step ago, so a frame can be drawn between steps (blended)
    this.prevX = new Float64Array(n * 3)
    for (const b of this.bodies) {
      b.prevQuat = new Float64Array([0, 0, 0, 1])
      b.prevC = v3()
    }
    this.view = null
  }

  /** Forget the motion of the last step (after the rig was placed, not moved): drawn as it is. */
  syncPrev() {
    this.prevX.set(this.x)
    for (const b of this.bodies) {
      b.prevQuat.set(b.quat)
      b.prevC.set(b.c)
    }
  }
  /**
   * The rig as it is drawn: between its last two steps, `alpha` (0..1) of the way (the physics
   * scheduler's time left over). Stepped at a fixed 120 Hz, a frame gets one step, or two, or
   * three: drawn as they are, the parts would move by uneven amounts frame to frame, a judder on
   * any screen whose rate is not a divisor of 120 Hz. For writeRopeState: { x, bodies, chains, pointOf }.
   */
  blended(alpha) {
    const v =
      this.view ||
      (this.view = {
        x: new Float64Array(this.x.length),
        chains: this.chains,
        bodies: this.bodies.map((b) => ({ name: b.name, index: b.index, f: b.f, R: new Float64Array(9), c: v3(), quat: new Float64Array(4) })),
        pointOf: Rig.prototype.pointOf,
      })
    const a = this.asleep ? 1 : Math.min(1, Math.max(0, alpha))
    const { x, prevX } = this
    const vx = v.x
    for (let i = 0; i < x.length; i++) vx[i] = prevX[i] + (x[i] - prevX[i]) * a
    for (let k = 0; k < this.bodies.length; k++) {
      const b = this.bodies[k]
      const vb = v.bodies[k]
      // (nlerp: a step turns a part a degree or two at most)
      const q0 = b.prevQuat
      const q1 = b.quat
      const sgn = q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3] < 0 ? -1 : 1
      let l = 0
      for (let i = 0; i < 4; i++) l += (vb.quat[i] = q0[i] * (1 - a) + q1[i] * sgn * a) ** 2
      l = Math.sqrt(l) || 1
      for (let i = 0; i < 4; i++) vb.quat[i] /= l
      quatToMat(vb.quat, vb.R)
      for (let i = 0; i < 3; i++) vb.c[i] = b.prevC[i] + (b.c[i] - b.prevC[i]) * a
    }
    return v
  }

  // ---------------------------------------------------------------------------------- placement

  /** World position of a design-frame point on a body, from its frame particles. */
  pointOf(body, b, out, o = 0) {
    const x = this.x
    const f = body.f
    for (let k = 0; k < 3; k++) out[o + k] = b[0] * x[f[0] * 3 + k] + b[1] * x[f[1] * 3 + k] + b[2] * x[f[2] * 3 + k] + b[3] * x[f[3] * 3 + k]
    return out
  }

  /** How far a body point moved this substep along (nx, ny, nz). */
  pointVel(body, b, nx, ny, nz) {
    const { x, p } = this
    const f = body.f
    let v = 0
    for (let k = 0; k < 4; k++) {
      const i = f[k] * 3
      v += b[k] * ((x[i] - p[i]) * nx + (x[i + 1] - p[i + 1]) * ny + (x[i + 2] - p[i + 2]) * nz)
    }
    return v
  }
  /** A body's frame as it was (a stored pose): its rotation (and the quaternion the shape fit starts
   * from) and centre, its particles left where they are. */
  setFrame(body, c, R) {
    body.R.set(R)
    matToQuat(R, body.quat)
    body.c.set(c)
    this.syncPrev()
  }
  /** Put a body at centre-of-mass position c with rotation R (column-major 3x3), at rest. */
  placeBody(body, c, R) {
    const t = this.tmp
    body.R.set(R)
    matToQuat(R, body.quat)
    body.c.set(c)
    body.f.forEach((i, k) => {
      rot(R, body.q[k][0], body.q[k][1], body.q[k][2], t)
      for (let a = 0; a < 3; a++) this.x[i * 3 + a] = this.p[i * 3 + a] = c[a] + t[a]
    })
  }

  /** Where a design-frame point of a body would be for a pose (c, R). */
  static poseToWorld(body, c, R, s) {
    const t = new Float64Array(3)
    rot(R, s[0] - body.com[0], s[1] - body.com[1], s[2] - body.com[2], t)
    return [c[0] + t[0], c[1] + t[1], c[2] + t[2]]
  }

  /** Lay a chain's particles along a list of points (one per particle), at rest. */
  placeChain(ch, pts) {
    ch.ids.forEach((i, k) => {
      for (let a = 0; a < 3; a++) this.x[i * 3 + a] = this.p[i * 3 + a] = pts[k][a]
    })
    // a laid-out chain has its bead back at its usual place
    if (ch.bead) {
      ch.bead.u = ch.bead.k0
      this.beadNear(ch)
    }
  }
  /** The particles in and next to the bead's hole don't collide with the bead. */
  beadNear(ch) {
    const nb = this.bodies.length
    const bi = ch.bead.body.index
    ch.ids.forEach((i, k) => {
      this.nearBody[i * nb + bi] = Math.abs(k - ch.bead.u) * ch.rest < 9 ? 1 : 0
    })
  }

  /** Use n substeps per step: the XPBD compliances follow the substep's length, and the
   *  velocities held in (x - p) are rescaled to it. */
  setSubsteps(n, init = false) {
    if (!init && n === this.substeps) return
    const h1 = STEP / this.substeps
    const h2 = STEP / n
    if (!init) {
      const k = h2 / h1
      const { x, p } = this
      for (let i = 0; i < x.length; i++) p[i] = x[i] - (x[i] - p[i]) * k
    }
    this.substeps = n
    H = h2
    for (const ch of this.chains) {
      const l = ch.rest
      ch.alpha = (l * l * l) / (9 * this.bendB) / (H * H)
    }
    this.reliefAlpha = (this.spacing ** 3 / (9 * this.bendB * 4)) / (H * H)
  }
  /** Every particle's position (the parts' frame particles and the cable), to start from later. */
  getPose() {
    return Float32Array.from(this.x)
  }
  /** Start from a saved pose, at rest. */
  setPose(pose) {
    const { x, p } = this
    for (let i = 0; i < x.length; i++) x[i] = p[i] = pose[i]
    for (const b of this.bodies) this.matchShape(b)
    for (const ch of this.chains) if (ch.bead) {
      ch.bead.u = ch.bead.k0
      this.beadNear(ch)
    }
    this.release()
    this.asleep = true
    this.syncPrev()
  }
  wake() {
    this.asleep = false
    this.quiet = 0
    this.grip = 1
    this.awakeTime = 0
  }

  // ---------------------------------------------------------------------------------- grabbing

  /** Take hold of a cable particle, or a design-frame point on a body. */
  grab(what, target) {
    this.release(true)
    // the anchor the held point is tied to: from where that point is now, drawn to the hand's target
    // a step at a time (never a jump, whatever the pointer does)
    const b = what.body ? what.body.bary(what.s) : null
    const at = b ? Float64Array.from(this.pointOf(what.body, b, this.tmp, 0).subarray(0, 3)) : Float64Array.from(this.x.subarray(what.i * 3, what.i * 3 + 3))
    const g = { ...what, b, T: Float64Array.from(at), a: at, va: new Float64Array(3), from: Float64Array.from(at), to: Float64Array.from(at), now: Float64Array.from(at) }
    if (!b) this.w[what.i] = 0
    this.grabbed = g
    this.moveGrab(target)
  }
  moveGrab(target) {
    const g = this.grabbed
    if (!g) return
    g.T.set(target)
    // not into the floor
    const r = g.body ? 1.2 : this.radius
    if (g.T[1] < r) g.T[1] = r
    this.wake()
  }
  /**
   * Let go. What was held is not dropped from the hand's height: it is set down, its anchor lowered
   * at a hand's pace until it rests on something (at most LOWER_MAX), then let go; a part dropped
   * from 9 mm lands at 400 mm/s and the cable at it snaps. `now`: at once (the plug seating itself
   * in the jack, or a new hold).
   */
  release(now = false) {
    const g = this.grabbed
    this.grabbed = null
    if (g) {
      g.lowerT = 0
      this.lowering = g
    }
    if (now) this.letGo()
    this.wake()
  }
  /** The set-down over: the anchor gone; the rope is calmed for a while as it relaxes. */
  letGo() {
    const g = this.lowering
    if (!g) return
    if (g.i !== undefined) this.w[g.i] = this.w0[g.i]
    this.lowering = null
    this.relaxT = 0
  }

  // ---------------------------------------------------------------------------------- stepping

  /** Advance by a frame's worth of time in fixed 120 Hz steps. Returns false while asleep. */
  update(frameDt) {
    if (this.asleep) return false
    this.acc += Math.min(frameDt, 0.05)
    let steps = 0
    while (this.acc >= STEP && steps < 6) {
      this.step()
      this.acc -= STEP
      steps++
    }
    if (steps === 6) this.acc = 0
    return true
  }

  step() {
    this.syncPrev()
    let g = this.grabbed
    if (!g && this.lowering) {
      // setting down: the anchor lowered; let go once it rests on something, or after LOWER_MAX
      const lg = this.lowering
      lg.lowerT += STEP
      lg.T[1] = Math.max(lg.body ? 1.2 : this.radius, lg.T[1] - LOWER_SPEED * STEP)
      const down = lg.body ? lg.body.contact : this.x[lg.i * 3 + 1] <= this.radius + 0.05
      if (down || lg.lowerT > LOWER_MAX) this.letGo()
      else g = lg
    }
    if (g) {
      // the anchor's way this step (each substep takes its share of it)
      g.from.set(g.a)
      smoothToward(g.a, g.va, g.T, STEP, GRAB_SMOOTH, GRAB_MAX_SPEED)
      g.to.set(g.a)
    }
    const n = this.substeps
    let big = 0
    for (let s = 0; s < n; s++) big = this.substep((s + 1) / n)
    this.lastBig = big
    // rest: over the last quarter second nothing has moved more than a twentieth of a mm, and
    // nobody is holding anything
    this.quiet++
    this.awakeTime += STEP
    this.relaxT += STEP
    // once it has had its time to relax, what lies still grips harder and harder (contact ageing,
    // over a second): the stress left in its curves no longer slips it along in small jerks; it rests
    if (!g && this.relaxT > SETTLE) {
      const a = Math.min(1, (this.relaxT - SETTLE) / 1.0)
      this.grip = Math.max(this.grip, 1 + 3 * a * a * (3 - 2 * a))
    }
    if (g) {
      this.quiet = 0
      this.grip = 1
      this.awakeTime = 0
    }
    if (this.quiet % 30 === 0 && this.quiet > 0) {
      const snap = this.restSnap || (this.restSnap = new Float64Array(this.x.length))
      if (this.quiet > 30) {
        let big = 0
        for (let i = 0; i < this.x.length; i++) big = Math.max(big, Math.abs(this.x[i] - snap[i]))
        // (asleep: nothing has moved a twentieth of a millimetre in a quarter second, 0.2 mm/s;
        // or, well after a release (its relaxing done, its grip grown), nothing faster than 2 mm/s:
        // what is left is a creep no one would see, and it stops)
        if (big < 0.05 || (this.relaxT > SETTLE + 1.5 && big < 0.5) || (this.awakeTime > 7 && big < 1)) this.asleep = true
        // static friction grows the longer things lie still (contact ageing): once nothing has
        // moved more than half a millimetre in a quarter second, a little more grip each time, so a
        // tight curl that would otherwise creep straight for ever holds the shape it fell in
        else if (big < 0.5 && this.quiet > 120) this.grip = Math.min(8, this.grip * 1.6)
      }
      snap.set(this.x)
    }
    this.time += STEP
  }

  substep(t) {
    const { x, p, w, n } = this
    this.count++
    const g = this.grabbed || this.lowering
    if (g) for (let k = 0; k < 3; k++) g.now[k] = g.from[k] + (g.to[k] - g.from[k]) * t

    // 1. Verlet: inertia, gravity, air drag
    // settling: from 4 s after the last disturbance, motion is damped harder and harder (by then
    // all that is left is a slow creep or sway; this lets the scene come to rest, then sleep)
    const late = Math.max(0, Math.min(1, (this.awakeTime - 4) / 2))
    const calm = this.relaxT < RELAX ? 1 - this.relaxT / RELAX : 0
    const keep = (1 - (this.air + 9 * calm * calm) * H) * (1 - 0.008 * late)
    const gy = G * H * H
    for (let i = 0; i < n; i++) {
      const j = i * 3
      if (w[i] === 0) {
        p[j] = x[j]
        p[j + 1] = x[j + 1]
        p[j + 2] = x[j + 2]
        continue
      }
      const vx = (x[j] - p[j]) * keep
      const vy = (x[j + 1] - p[j + 1]) * keep
      const vz = (x[j + 2] - p[j + 2]) * keep
      p[j] = x[j]
      p[j + 1] = x[j + 1]
      p[j + 2] = x[j + 2]
      x[j] += vx
      x[j + 1] += vy - gy
      x[j + 2] += vz
    }
    if (g && g.i !== undefined) {
      x[g.i * 3] = g.now[0]
      x[g.i * 3 + 1] = g.now[1]
      x[g.i * 3 + 2] = g.now[2]
    }

    // 2. constraints
    for (let it = 0; it < 2; it++) this.solveChains(it % 2 === 1)
    this.solveBend()
    this.solveReliefs()
    this.solveBeads()
    if (g && g.body) this.holdBody(g)
    // 3. contacts
    this.collideGround()
    this.collideBodies(this.count % 2 === 1)
    if (this.selfCollision && this.count % 2 === 0) this.collideCable()
    // 4. the bodies' shapes, then a last pass at the lengths
    for (const b of this.bodies) this.matchShape(b)
    this.solveChains(false)
    if (g && g.body) this.holdBody(g)
    this.collideGround(true)
    this.applyFriction()
    this.finalLengths()
    // 5. damping
    this.smoothChains()
    this.rollResistance()

    // how far anything moved this substep
    let big = 0
    for (let i = 0; i < n; i++) {
      const j = i * 3
      const d = Math.abs(x[j] - p[j]) + Math.abs(x[j + 1] - p[j + 1]) + Math.abs(x[j + 2] - p[j + 2])
      if (d > big) big = d
    }
    return big
  }

  // ---------------------------------------------------------------------------------- constraints

  /** A body point and a particle pulled to distance L (L = 0: together). */
  linkBodyParticle(body, b, j, L, compliance = 0) {
    const { x, w } = this
    const P = this.pointOf(body, b, this.tmp, 0)
    const dx = x[j * 3] - P[0]
    const dy = x[j * 3 + 1] - P[1]
    const dz = x[j * 3 + 2] - P[2]
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (d < 1e-9) return
    const C = d - L
    if (L === 0 && C <= 0) return
    const wb = body.wOf(b)
    const W = w[j] + wb + compliance
    if (W === 0) return
    const lam = -C / W
    const nx = dx / d
    const ny = dy / d
    const nz = dz / d
    x[j * 3] += w[j] * lam * nx
    x[j * 3 + 1] += w[j] * lam * ny
    x[j * 3 + 2] += w[j] * lam * nz
    this.pushBody(body, b, -lam * nx, -lam * ny, -lam * nz)
  }

  /** Move a body point by (dx, dy, dz) / its generalized mass: each frame particle by w b (in x, or in p). */
  pushBody(body, b, dx, dy, dz, x = this.x) {
    const wf = 4 / body.mass
    for (let k = 0; k < 4; k++) {
      const i = body.f[k]
      if (this.w[i] === 0) continue
      const s = wf * b[k]
      x[i * 3] += dx * s
      x[i * 3 + 1] += dy * s
      x[i * 3 + 2] += dz * s
    }
  }

  solveChains(reverse) {
    const { x, w } = this
    for (const ch of this.chains) {
      const ids = ch.ids
      const L = ch.rest
      const m = ids.length
      if (!reverse) {
        this.linkBodyParticle(ch.from.body, ch.from.point.b, ids[0], L)
        for (let k = 0; k + 1 < m; k++) this.link(ids[k], ids[k + 1], L)
        this.linkBodyParticle(ch.to.body, ch.to.point.b, ids[m - 1], L)
      } else {
        this.linkBodyParticle(ch.to.body, ch.to.point.b, ids[m - 1], L)
        for (let k = m - 2; k >= 0; k--) this.link(ids[k], ids[k + 1], L)
        this.linkBodyParticle(ch.from.body, ch.from.point.b, ids[0], L)
      }
    }
    void x
    void w
  }

  link(a, b, L) {
    const { x, w } = this
    const W = w[a] + w[b]
    if (W === 0) return
    const dx = x[b * 3] - x[a * 3]
    const dy = x[b * 3 + 1] - x[a * 3 + 1]
    const dz = x[b * 3 + 2] - x[a * 3 + 2]
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9
    const c = (d - L) / (d * W)
    x[a * 3] += dx * c * w[a]
    x[a * 3 + 1] += dy * c * w[a]
    x[a * 3 + 2] += dz * c * w[a]
    x[b * 3] -= dx * c * w[b]
    x[b * 3 + 1] -= dy * c * w[b]
    x[b * 3 + 2] -= dz * c * w[b]
  }

  /** Bending: the triangle (centroid) form, linear in the bend angle, with XPBD compliance. */
  solveBend() {
    const { x, w } = this
    for (const ch of this.chains) {
      const ids = ch.ids
      const alpha = ch.alpha
      // the centroid offset at the largest joint angle: (2/3) l sin(angle / 2)
      const cMax = (2 / 3) * ch.rest * Math.sin(MAX_JOINT / 2)
      for (let k = 1; k + 1 < ids.length; k++) {
        const a = ids[k - 1]
        const m = ids[k]
        const b = ids[k + 1]
        const ex = x[m * 3] - (x[a * 3] + x[m * 3] + x[b * 3]) / 3
        const ey = x[m * 3 + 1] - (x[a * 3 + 1] + x[m * 3 + 1] + x[b * 3 + 1]) / 3
        const ez = x[m * 3 + 2] - (x[a * 3 + 2] + x[m * 3 + 2] + x[b * 3 + 2]) / 3
        const c = Math.sqrt(ex * ex + ey * ey + ez * ez)
        if (c < 1e-9) continue
        const W0 = (4 / 9) * w[m] + (w[a] + w[b]) / 9
        if (W0 === 0) continue
        // soft bending, plus a hard limit on the angle at any joint: a braided cable curls, it
        // doesn't fold (the limit's share is the part of c beyond cMax, taken with no compliance)
        let l = -1 / (W0 + alpha)
        if (c > cMax) l = Math.min(l, -(1 - cMax / c) / W0)
        x[m * 3] += (2 / 3) * w[m] * l * ex
        x[m * 3 + 1] += (2 / 3) * w[m] * l * ey
        x[m * 3 + 2] += (2 / 3) * w[m] * l * ez
        x[a * 3] -= (1 / 3) * w[a] * l * ex
        x[a * 3 + 1] -= (1 / 3) * w[a] * l * ey
        x[a * 3 + 2] -= (1 / 3) * w[a] * l * ez
        x[b * 3] -= (1 / 3) * w[b] * l * ex
        x[b * 3 + 1] -= (1 / 3) * w[b] * l * ey
        x[b * 3 + 2] -= (1 / 3) * w[b] * l * ez
      }
      // the joints next to the parts: the triangle is the part's pin, the first particle and the
      // second (the part takes its share through its frame)
      const n = ids.length
      for (let e = 0; e < 2; e++) {
        const end = e === 0 ? ch.from : ch.to
        const m = e === 0 ? ids[0] : ids[n - 1]
        const b = e === 0 ? ids[1] : ids[n - 2]
        const P = this.pointOf(end.body, end.point.b, this.tmp, 8)
        const wa = end.body.wOf(end.point.b)
        const ex = x[m * 3] - (P[8] + x[m * 3] + x[b * 3]) / 3
        const ey = x[m * 3 + 1] - (P[9] + x[m * 3 + 1] + x[b * 3 + 1]) / 3
        const ez = x[m * 3 + 2] - (P[10] + x[m * 3 + 2] + x[b * 3 + 2]) / 3
        const c = Math.sqrt(ex * ex + ey * ey + ez * ez)
        if (c < 1e-9) continue
        const W0 = (4 / 9) * w[m] + (wa + w[b]) / 9
        if (W0 === 0) continue
        let l = -1 / (W0 + alpha)
        if (c > cMax) l = Math.min(l, -(1 - cMax / c) / W0)
        x[m * 3] += (2 / 3) * w[m] * l * ex
        x[m * 3 + 1] += (2 / 3) * w[m] * l * ey
        x[m * 3 + 2] += (2 / 3) * w[m] * l * ez
        x[b * 3] -= (1 / 3) * w[b] * l * ex
        x[b * 3 + 1] -= (1 / 3) * w[b] * l * ey
        x[b * 3 + 2] -= (1 / 3) * w[b] * l * ez
        this.pushBody(end.body, end.point.b, -(1 / 3) * l * ex, -(1 / 3) * l * ey, -(1 / 3) * l * ez)
      }
    }
  }

  /** The cable leaves each part along the part's own exit direction (its strain relief). */
  solveReliefs() {
    const t = this.tmp
    for (const ch of this.chains) {
      for (let e = 0; e < 2; e++) {
        const end = e === 0 ? ch.from : ch.to
        const j = e === 0 ? ch.ids[0] : ch.ids[ch.ids.length - 1]
        const body = end.body
        const pt = end.point
        this.pointOf(body, pt.b, t, 0)
        rot(body.R, pt.dir[0], pt.dir[1], pt.dir[2], t, 3)
        const tx = t[0] + t[3] * ch.rest
        const ty = t[1] + t[4] * ch.rest
        const tz = t[2] + t[5] * ch.rest
        const x = this.x
        const ex = x[j * 3] - tx
        const ey = x[j * 3 + 1] - ty
        const ez = x[j * 3 + 2] - tz
        const C = Math.sqrt(ex * ex + ey * ey + ez * ez)
        if (C < 1e-9) continue
        const wb = body.wOf(pt.b)
        const W = this.w[j] + wb + this.reliefAlpha
        const lam = -C / W
        const nx = ex / C
        const ny = ey / C
        const nz = ez / C
        x[j * 3] += this.w[j] * lam * nx
        x[j * 3 + 1] += this.w[j] * lam * ny
        x[j * 3 + 2] += this.w[j] * lam * nz
        this.pushBody(body, pt.b, -lam * nx, -lam * ny, -lam * nz)
      }
    }
  }

  /**
   * The cinch bead: each lead passes through its hole, at u along the lead. Left alone it grips
   * (u stays); while someone holds it, it slides: u follows the point of the lead nearest the hole.
   */
  solveBeads() {
    const { x, w } = this
    const g = this.grabbed || this.lowering
    for (const ch of this.chains) {
      const bd = ch.bead
      if (!bd) continue
      const ids = ch.ids
      const n = ids.length
      const H = this.pointOf(bd.body, bd.hole.b, this.tmp, 12)
      if (g && g.body === bd.body) {
        let best = bd.u
        let bestD = Infinity
        for (let k = Math.max(0, Math.floor(bd.u) - 2); k <= Math.min(n - 2, Math.floor(bd.u) + 2); k++) {
          const a = ids[k] * 3
          const b = ids[k + 1] * 3
          const ex = x[b] - x[a]
          const ey = x[b + 1] - x[a + 1]
          const ez = x[b + 2] - x[a + 2]
          const ee = ex * ex + ey * ey + ez * ez || 1
          const t = Math.max(0, Math.min(1, ((H[12] - x[a]) * ex + (H[13] - x[a + 1]) * ey + (H[14] - x[a + 2]) * ez) / ee))
          const d2 = (x[a] + ex * t - H[12]) ** 2 + (x[a + 1] + ey * t - H[13]) ** 2 + (x[a + 2] + ez * t - H[14]) ** 2
          if (d2 < bestD) {
            bestD = d2
            best = k + t
          }
        }
        // not into the splitter, nor past the far end of the lead
        best = Math.max(2, Math.min(n - 3, best))
        const moved = Math.floor(best) !== Math.floor(bd.u)
        bd.u = best
        if (moved) this.beadNear(ch)
      }
      const k = Math.min(n - 2, Math.floor(bd.u))
      const t = bd.u - k
      const a = ids[k]
      const b = ids[k + 1]
      const dx = H[12] - ((1 - t) * x[a * 3] + t * x[b * 3])
      const dy = H[13] - ((1 - t) * x[a * 3 + 1] + t * x[b * 3 + 1])
      const dz = H[14] - ((1 - t) * x[a * 3 + 2] + t * x[b * 3 + 2])
      const C = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (C < 1e-9) continue
      const wb = bd.body.wOf(bd.hole.b)
      const W = (1 - t) * (1 - t) * w[a] + t * t * w[b] + wb
      if (W === 0) continue
      const sa = (w[a] * (1 - t)) / W
      const sb = (w[b] * t) / W
      x[a * 3] += sa * dx
      x[a * 3 + 1] += sa * dy
      x[a * 3 + 2] += sa * dz
      x[b * 3] += sb * dx
      x[b * 3 + 1] += sb * dy
      x[b * 3 + 2] += sb * dz
      this.pushBody(bd.body, bd.hole.b, -dx / W, -dy / W, -dz / W)
    }
  }

  /** A body held by a point: that point is moved onto the target; the body hangs from it. */
  holdBody(g) {
    const P = this.pointOf(g.body, g.b, this.tmp, 0)
    const wb = g.body.wOf(g.b)
    this.pushBody(g.body, g.b, (g.now[0] - P[0]) / wb, (g.now[1] - P[1]) / wb, (g.now[2] - P[2]) / wb)
  }

  /** Shape matching: the body's four particles put back into their rigid shape, best fit. */
  matchShape(b) {
    const x = this.x
    const f = b.f
    let cx = 0
    let cy = 0
    let cz = 0
    for (let k = 0; k < 4; k++) {
      cx += x[f[k] * 3]
      cy += x[f[k] * 3 + 1]
      cz += x[f[k] * 3 + 2]
    }
    cx /= 4
    cy /= 4
    cz /= 4
    // A = sum (x - c) q^T, column-major
    const A = this.tmp
    A.fill(0, 0, 9)
    for (let k = 0; k < 4; k++) {
      const dx = x[f[k] * 3] - cx
      const dy = x[f[k] * 3 + 1] - cy
      const dz = x[f[k] * 3 + 2] - cz
      const q = b.q[k]
      for (let c = 0; c < 3; c++) {
        A[c * 3] += dx * q[c]
        A[c * 3 + 1] += dy * q[c]
        A[c * 3 + 2] += dz * q[c]
      }
    }
    // the rotation in A (Mueller et al. 2016), warm-started from the last one
    const R = b.R
    const qt = b.quat
    for (let it = 0; it < 3; it++) {
      quatToMat(qt, R)
      let ox = 0
      let oy = 0
      let oz = 0
      let dd = 0
      for (let c = 0; c < 3; c++) {
        const rx = R[c * 3]
        const ry = R[c * 3 + 1]
        const rz = R[c * 3 + 2]
        const ax = A[c * 3]
        const ay = A[c * 3 + 1]
        const az = A[c * 3 + 2]
        ox += ry * az - rz * ay
        oy += rz * ax - rx * az
        oz += rx * ay - ry * ax
        dd += rx * ax + ry * ay + rz * az
      }
      const s = 1 / (Math.abs(dd) + 1e-9)
      ox *= s
      oy *= s
      oz *= s
      const wl = Math.sqrt(ox * ox + oy * oy + oz * oz)
      if (wl < 1e-9) break
      const h = wl * 0.5
      const sh = Math.sin(h) / wl
      const dq = [ox * sh, oy * sh, oz * sh, Math.cos(h)]
      // qt = dq * qt
      const [x1, y1, z1, w1] = dq
      const [x2, y2, z2, w2] = qt
      qt[0] = w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2
      qt[1] = w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2
      qt[2] = w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2
      qt[3] = w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2
      const l = Math.hypot(qt[0], qt[1], qt[2], qt[3])
      for (let k = 0; k < 4; k++) qt[k] /= l
      if (wl < 1e-6) break
    }
    quatToMat(qt, R)
    b.c[0] = cx
    b.c[1] = cy
    b.c[2] = cz
    const t = this.tmp
    for (let k = 0; k < 4; k++) {
      const i = f[k]
      rot(R, b.q[k][0], b.q[k][1], b.q[k][2], t, 9)
      x[i * 3] = cx + t[9]
      x[i * 3 + 1] = cy + t[10]
      x[i * 3 + 2] = cz + t[11]
    }
  }

  // ---------------------------------------------------------------------------------- contacts

  /**
   * What the cable and the parts lie on: the scene's own (spec.ground: the desk, the player, the
   * ashtray, the lighter). Writes the push out of it (out[0..2], at most 2 mm a substep) and its
   * normal (out[3..5]); false where there is no contact.
   */
  ground(x, y, z, r, out) {
    return this.groundFn(x, y, z, r, out)
  }

  collideGround(noFriction = false) {
    const { x, p, w } = this
    const muS = noFriction ? 0 : this.mu.s
    const muK = noFriction ? 0 : this.mu.k
    const o = this.tmp
    const r = this.radius
    const cN = this.cN || (this.cN = new Float64Array(this.n * 4))
    for (const i of this.cable) {
      if (w[i] === 0) continue
      const j = i * 3
      if (!this.ground(x[j], x[j + 1], x[j + 2], r, o)) {
        if (!noFriction) cN[i * 4 + 3] = 0
        continue
      }
      // (no bounce: the push puts it back on the surface, but what it gives along the normal is not
      // kept as velocity: only an outward speed it already had)
      const vn0 = Math.max(0, (x[j] - p[j]) * o[3] + (x[j + 1] - p[j + 1]) * o[4] + (x[j + 2] - p[j + 2]) * o[5])
      x[j] += o[0]
      x[j + 1] += o[1]
      x[j + 2] += o[2]
      const vn = (x[j] - p[j]) * o[3] + (x[j + 1] - p[j + 1]) * o[4] + (x[j + 2] - p[j + 2]) * o[5] - vn0
      if (vn > 0) {
        p[j] += o[3] * vn
        p[j + 1] += o[4] * vn
        p[j + 2] += o[5] * vn
      }
      if (noFriction) continue
      // remember the contact: friction is applied to the whole substep's motion, at its end
      const pen = Math.sqrt(o[0] * o[0] + o[1] * o[1] + o[2] * o[2])
      cN[i * 4] = o[3]
      cN[i * 4 + 1] = o[4]
      cN[i * 4 + 2] = o[5]
      cN[i * 4 + 3] = pen
    }
    void muS
    void muK
    // the bodies, by the points on their surfaces (in the friction pass only)
    if (noFriction) return
    this.bodyContacts = this.bodyContacts || []
    this.bodyContacts.length = 0
    const bw = this.tmp2 || (this.tmp2 = new Float64Array(8))
    for (const b of this.bodies) {
      b.contact = false
      const f = b.f
      // cheap reject: the whole body well above anything it could lie on
      if (b.c[1] - b.reach > this.groundTop) continue
      for (let k = 0; k < b.np; k++) {
        const b0 = b.ptb[k * 4]
        const b1 = b.ptb[k * 4 + 1]
        const b2 = b.ptb[k * 4 + 2]
        const b3 = b.ptb[k * 4 + 3]
        let px = 0
        let py = 0
        let pz = 0
        for (let a = 0; a < 3; a++) {
          const v = b0 * x[f[0] * 3 + a] + b1 * x[f[1] * 3 + a] + b2 * x[f[2] * 3 + a] + b3 * x[f[3] * 3 + a]
          if (a === 0) px = v
          else if (a === 1) py = v
          else pz = v
        }
        if (!this.ground(px, py, pz, 0, o)) continue
        b.contact = true
        bw[0] = b0
        bw[1] = b1
        bw[2] = b2
        bw[3] = b3
        const wb = b.wOf(bw)
        const vn0 = Math.max(0, this.pointVel(b, bw, o[3], o[4], o[5]))
        this.pushBody(b, bw, o[0] / wb, o[1] / wb, o[2] / wb)
        // (no bounce, as for the cable)
        const vn = this.pointVel(b, bw, o[3], o[4], o[5]) - vn0
        if (vn > 0) this.pushBody(b, bw, (o[3] * vn) / wb, (o[4] * vn) / wb, (o[5] * vn) / wb, this.p)
        // remember it: friction is applied at the end of the substep
        const pen = Math.sqrt(o[0] * o[0] + o[1] * o[1] + o[2] * o[2])
        const bc = this.bodyContacts
        bc.push(b.index, b0, b1, b2, b3, o[3], o[4], o[5], pen)
      }
    }
  }

  /**
   * Coulomb friction for the cable on the floor, on everything that moved it this substep: static
   * below muS times the push the floor gave it, sliding (reduced by muK times that) above.
   */
  applyFriction() {
    const { x, p, w } = this
    const cN = this.cN
    if (!cN) return
    const muS = this.mu.s * this.grip
    const muK = this.mu.k * this.grip
    // (not while anything is held: a dragged cable slides evenly; after a release it eases in)
    const rest = this.grabbed || this.lowering ? 0 : this.restSpeed * H * Math.min(1, this.relaxT / 0.5) * this.grip
    // the parts, at each point they touch the floor
    const bc = this.bodyContacts || []
    const bw = this.tmp3 || (this.tmp3 = new Float64Array(4))
    for (const b of this.bodies) b.held = b.contact
    for (let c = 0; c < bc.length; c += 9) {
      // (a part is held still only if every one of its contacts sticks)
    }
    for (let c = 0; c < bc.length; c += 9) {
      const b = this.bodies[bc[c]]
      bw[0] = bc[c + 1]
      bw[1] = bc[c + 2]
      bw[2] = bc[c + 3]
      bw[3] = bc[c + 4]
      const nx = bc[c + 5]
      const ny = bc[c + 6]
      const nz = bc[c + 7]
      const pen = bc[c + 8]
      let tx = 0
      let ty = 0
      let tz = 0
      for (let q = 0; q < 4; q++) {
        const i = b.f[q]
        tx += bw[q] * (x[i * 3] - p[i * 3])
        ty += bw[q] * (x[i * 3 + 1] - p[i * 3 + 1])
        tz += bw[q] * (x[i * 3 + 2] - p[i * 3 + 2])
      }
      const dn = tx * nx + ty * ny + tz * nz
      tx -= dn * nx
      ty -= dn * ny
      tz -= dn * nz
      const tl = Math.sqrt(tx * tx + ty * ty + tz * tz)
      if (tl < 1e-12) continue
      const f = tl < muS * pen + rest ? 1 : Math.min(1, (muK * pen) / tl)
      if (f < 1) b.held = false
      const wb = b.wOf(bw)
      this.pushBody(b, bw, (-tx * f) / wb, (-ty * f) / wb, (-tz * f) / wb)
    }
    const stuck = this.stuck || (this.stuck = new Uint8Array(this.n))
    stuck.fill(0)
    const capPen = this.grabbed || this.lowering ? this.penCap * G * H * H : Infinity
    for (const i of this.cable) {
      const pen = Math.min(cN[i * 4 + 3], capPen)
      if (pen <= 0 || w[i] === 0) continue
      const j = i * 3
      const nx = cN[i * 4]
      const ny = cN[i * 4 + 1]
      const nz = cN[i * 4 + 2]
      let tx = x[j] - p[j]
      let ty = x[j + 1] - p[j + 1]
      let tz = x[j + 2] - p[j + 2]
      const dn = tx * nx + ty * ny + tz * nz
      tx -= dn * nx
      ty -= dn * ny
      tz -= dn * nz
      const tl = Math.sqrt(tx * tx + ty * ty + tz * tz)
      if (tl < 1e-12) continue
      const f = tl < muS * pen + rest ? 1 : Math.min(1, (muK * pen) / tl)
      if (f === 1) stuck[i] = 1
      x[j] -= tx * f
      x[j + 1] -= ty * f
      x[j + 2] -= tz * f
    }
  }

  /** A last pass at the lengths, with the cable that friction holds still treated as pinned. */
  finalLengths() {
    const { w, stuck } = this
    if (!stuck) return this.solveChains(true)
    const keep = this.wKeep || (this.wKeep = new Float64Array(this.n))
    keep.set(w)
    for (const i of this.cable) if (stuck[i]) w[i] = 0
    for (const b of this.bodies) if (b.held && b.contact) for (const i of b.f) w[i] = 0
    this.solveChains(true)
    w.set(keep)
  }

  /** A part's distance field at a world point: distance, and the outward normal and closest surface point (local) in this.gq. */
  bodyDistance(b, wx, wy, wz) {
    return fieldDistance(b, wx, wy, wz, this.gq || (this.gq = new Float64Array(6)))
  }

  /** Cable against the parts (particles and segment midpoints against each part's distance field), and part against part. */
  collideBodies(withParts = true) {
    const { x, w } = this
    const r = this.radius
    const nb = this.bodies.length
    const bw = this.tmp2 || (this.tmp2 = new Float64Array(8))
    for (const b of this.bodies) {
      const cx = b.c[0]
      const cy = b.c[1]
      const cz = b.c[2]
      const reach = b.reach + r + 2.5
      for (const ch of this.chains) {
        const ids = ch.ids
        for (let k = 0; k < ids.length; k++) {
          const i = ids[k]
          if (this.nearBody[i * nb + b.index]) continue
          if (Math.abs(x[i * 3] - cx) > reach || Math.abs(x[i * 3 + 1] - cy) > reach || Math.abs(x[i * 3 + 2] - cz) > reach) continue
          // the particle, and the middle of its segment to the next one
          for (let half = 0; half < 2; half++) {
            const j = half ? ids[k + 1] : i
            if (half && (j === undefined || this.nearBody[j * nb + b.index])) continue
            const px = half ? (x[i * 3] + x[j * 3]) / 2 : x[i * 3]
            const py = half ? (x[i * 3 + 1] + x[j * 3 + 1]) / 2 : x[i * 3 + 1]
            const pz = half ? (x[i * 3 + 2] + x[j * 3 + 2]) / 2 : x[i * 3 + 2]
            const d = this.bodyDistance(b, px, py, pz)
            if (d >= r) continue
            const q = this.gq
            b.baryInto(q[0], q[1], q[2], bw)
            const wp = half ? (w[i] + w[j]) / 4 : w[i]
            const W = wp + b.wOf(bw)
            if (W === 0) continue
            const lam = (r - d) / W
            const nx = q[3]
            const ny = q[4]
            const nz = q[5]
            if (half) {
              x[i * 3] += nx * lam * w[i] * 0.5
              x[i * 3 + 1] += ny * lam * w[i] * 0.5
              x[i * 3 + 2] += nz * lam * w[i] * 0.5
              x[j * 3] += nx * lam * w[j] * 0.5
              x[j * 3 + 1] += ny * lam * w[j] * 0.5
              x[j * 3 + 2] += nz * lam * w[j] * 0.5
            } else {
              const p = this.p
              const vn0 = Math.max(0, (x[i * 3] - p[i * 3]) * nx + (x[i * 3 + 1] - p[i * 3 + 1]) * ny + (x[i * 3 + 2] - p[i * 3 + 2]) * nz)
              x[i * 3] += nx * lam * w[i]
              x[i * 3 + 1] += ny * lam * w[i]
              x[i * 3 + 2] += nz * lam * w[i]
              // (no bounce off a part either; and the contact is remembered for friction, as the
              // desk's is: a cable lying over a part does not slide off it for ever)
              const vn = (x[i * 3] - p[i * 3]) * nx + (x[i * 3 + 1] - p[i * 3 + 1]) * ny + (x[i * 3 + 2] - p[i * 3 + 2]) * nz - vn0
              if (vn > 0) {
                p[i * 3] += nx * vn
                p[i * 3 + 1] += ny * vn
                p[i * 3 + 2] += nz * vn
              }
              const cN = this.cN
              const pen = lam * w[i]
              if (cN && pen > cN[i * 4 + 3]) {
                cN[i * 4] = nx
                cN[i * 4 + 1] = ny
                cN[i * 4 + 2] = nz
                cN[i * 4 + 3] = pen
              }
            }
            this.pushBody(b, bw, -nx * lam, -ny * lam, -nz * lam)
          }
        }
      }
    }
    // part against part: each one's surface points against the other's distance field
    if (!withParts) return
    const pa = this.tmp3 || (this.tmp3 = new Float64Array(4))
    for (let a = 0; a < nb; a++)
      for (let c = 0; c < nb; c++) {
        if (a === c) continue
        const A = this.bodies[a]
        const B = this.bodies[c]
        if (Math.hypot(A.c[0] - B.c[0], A.c[1] - B.c[1], A.c[2] - B.c[2]) > A.reach + B.reach) continue
        const f = A.f
        for (let k = 0; k < A.np; k++) {
          for (let q = 0; q < 4; q++) pa[q] = A.ptb[k * 4 + q]
          let px = 0
          let py = 0
          let pz = 0
          for (let q = 0; q < 4; q++) {
            px += pa[q] * x[f[q] * 3]
            py += pa[q] * x[f[q] * 3 + 1]
            pz += pa[q] * x[f[q] * 3 + 2]
          }
          const d = this.bodyDistance(B, px, py, pz)
          if (d >= 0) continue
          const qn = this.gq
          B.baryInto(qn[0], qn[1], qn[2], bw)
          const W = A.wOf(pa) + B.wOf(bw)
          const lam = -d / W
          this.pushBody(A, pa, qn[3] * lam, qn[4] * lam, qn[5] * lam)
          this.pushBody(B, bw, -qn[3] * lam, -qn[4] * lam, -qn[5] * lam)
        }
      }
  }

  /** Cable against cable: segment capsules, paired up through a spatial hash. */
  collideCable() {
    const { x, w, segA, segB, nseg, head, nextSeg, keyOf, buckets } = this
    head.fill(-1)
    const inv = 1 / this.cell
    const mask = buckets - 1
    const P1 = 1021
    const P2 = 1021 * 1021
    for (let s = 0; s < nseg; s++) {
      const a = segA[s]
      const b = segB[s]
      const key =
        (Math.floor((x[a * 3] + x[b * 3]) * 0.5 * inv) & 1023) +
        (Math.floor((x[a * 3 + 1] + x[b * 3 + 1]) * 0.5 * inv) & 1023) * P1 +
        (Math.floor((x[a * 3 + 2] + x[b * 3 + 2]) * 0.5 * inv) & 1023) * P2
      keyOf[s] = key
      const h = (Math.imul(key, 0x9e3779b1) >>> 0) & mask
      nextSeg[s] = head[h]
      head[h] = s
    }
    const rr = 2 * this.radius
    for (let s = 0; s < nseg; s++) {
      const a = segA[s]
      const b = segB[s]
      const ca = this.chainOf[a]
      const ka = this.chainIdx[a]
      const fx = (x[a * 3] + x[b * 3]) * 0.5 * inv
      const fy = (x[a * 3 + 1] + x[b * 3 + 1]) * 0.5 * inv
      const fz = (x[a * 3 + 2] + x[b * 3 + 2]) * 0.5 * inv
      const sx = fx - Math.floor(fx) < 0.5 ? -1 : 1
      const sy = fy - Math.floor(fy) < 0.5 ? -P1 : P1
      const sz = fz - Math.floor(fz) < 0.5 ? -P2 : P2
      for (let q = 0; q < 8; q++) {
        const k2 = keyOf[s] + (q & 1 ? sx : 0) + (q & 2 ? sy : 0) + (q & 4 ? sz : 0)
        for (let o = head[(Math.imul(k2, 0x9e3779b1) >>> 0) & mask]; o >= 0; o = nextSeg[o]) {
          if (o <= s || keyOf[o] !== k2) continue
          const c = segA[o]
          const d = segB[o]
          if (this.chainOf[c] === ca && Math.abs(this.chainIdx[c] - ka) < 3) continue
          // (two leads threaded through the same part, the bead or the splitter, lie closer there
          // than two cables can: the part holds them, they do not push each other apart)
          if (this.sharesPart(a, c)) continue
          this.segSeg(a, b, c, d, rr)
        }
      }
    }
    void w
  }

  /** Are particles i and j both near (along the cable) the same part they come out of or pass through? */
  sharesPart(i, j) {
    const nb = this.bodies.length
    const nearBody = this.nearBody
    for (let k = 0; k < nb; k++) if (nearBody[i * nb + k] && nearBody[j * nb + k]) return true
    return false
  }

  segSeg(a, b, c, d, rr) {
    const { x, w } = this
    const ax = x[a * 3], ay = x[a * 3 + 1], az = x[a * 3 + 2]
    const ux = x[b * 3] - ax, uy = x[b * 3 + 1] - ay, uz = x[b * 3 + 2] - az
    const cx = x[c * 3], cy = x[c * 3 + 1], cz = x[c * 3 + 2]
    const vx = x[d * 3] - cx, vy = x[d * 3 + 1] - cy, vz = x[d * 3 + 2] - cz
    const wx = ax - cx, wy = ay - cy, wz = az - cz
    const A = ux * ux + uy * uy + uz * uz
    const B = ux * vx + uy * vy + uz * vz
    const C = vx * vx + vy * vy + vz * vz
    const D = ux * wx + uy * wy + uz * wz
    const E = vx * wx + vy * wy + vz * wz
    const den = A * C - B * B
    let sN = den > 1e-12 ? (B * E - C * D) / den : 0
    sN = sN < 0 ? 0 : sN > 1 ? 1 : sN
    let tN = C > 1e-12 ? (B * sN + E) / C : 0
    if (tN < 0) {
      tN = 0
      sN = A > 1e-12 ? Math.min(1, Math.max(0, -D / A)) : 0
    } else if (tN > 1) {
      tN = 1
      sN = A > 1e-12 ? Math.min(1, Math.max(0, (B - D) / A)) : 0
    }
    const nx = ax + ux * sN - (cx + vx * tN)
    const ny = ay + uy * sN - (cy + vy * tN)
    const nz = az + uz * sN - (cz + vz * tN)
    const dist = Math.sqrt(nx * nx + ny * ny + nz * nz)
    if (dist >= rr || dist < 1e-9) return
    const wa = w[a] * (1 - sN)
    const wb = w[b] * sN
    const wc = w[c] * (1 - tN)
    const wd = w[d] * tN
    const W = w[a] * (1 - sN) ** 2 + w[b] * sN * sN + w[c] * (1 - tN) ** 2 + w[d] * tN * tN
    if (W < 1e-12) return
    // (how fast the two were already parting, along the normal, this substep)
    const p = this.p
    const rel = (i, k) => x[i * 3 + k] - p[i * 3 + k]
    let vn0 = 0
    for (let k = 0; k < 3; k++) vn0 += ((1 - sN) * rel(a, k) + sN * rel(b, k) - (1 - tN) * rel(c, k) - tN * rel(d, k)) * [nx, ny, nz][k]
    vn0 /= dist
    const pen = rr - dist
    const lam = pen / dist / W
    x[a * 3] += nx * lam * wa; x[a * 3 + 1] += ny * lam * wa; x[a * 3 + 2] += nz * lam * wa
    x[b * 3] += nx * lam * wb; x[b * 3 + 1] += ny * lam * wb; x[b * 3 + 2] += nz * lam * wb
    x[c * 3] -= nx * lam * wc; x[c * 3 + 1] -= ny * lam * wc; x[c * 3 + 2] -= nz * lam * wc
    x[d * 3] -= nx * lam * wd; x[d * 3 + 1] -= ny * lam * wd; x[d * 3 + 2] -= nz * lam * wd
    // no bounce: the push separates them, but any parting speed it adds beyond what they had is
    // not kept (the same push made in p as well, in that proportion): cables lying side by side
    // rest against each other instead of kicking each other apart every substep
    const keep = Math.max(0, Math.min(1, (pen + Math.min(vn0, 0)) / pen))
    if (keep > 0) {
      const l = lam * keep
      p[a * 3] += nx * l * wa; p[a * 3 + 1] += ny * l * wa; p[a * 3 + 2] += nz * l * wa
      p[b * 3] += nx * l * wb; p[b * 3 + 1] += ny * l * wb; p[b * 3 + 2] += nz * l * wb
      p[c * 3] -= nx * l * wc; p[c * 3 + 1] -= ny * l * wc; p[c * 3 + 2] -= nz * l * wc
      p[d * 3] -= nx * l * wd; p[d * 3 + 1] -= ny * l * wd; p[d * 3 + 2] -= nz * l * wd
    }
  }

  // ---------------------------------------------------------------------------------- damping

  /** Internal friction: each particle's velocity eased towards its neighbours' average. */
  smoothChains() {
    const { x, p, w } = this
    const k = this.smooth
    const v = this.vbuf || (this.vbuf = new Float64Array(this.n * 3))
    for (const ch of this.chains) {
      const ids = ch.ids
      for (let q = 0; q < ids.length; q++) {
        const i = ids[q]
        v[q * 3] = x[i * 3] - p[i * 3]
        v[q * 3 + 1] = x[i * 3 + 1] - p[i * 3 + 1]
        v[q * 3 + 2] = x[i * 3 + 2] - p[i * 3 + 2]
      }
      for (let q = 1; q + 1 < ids.length; q++) {
        const i = ids[q]
        if (w[i] === 0) continue
        for (let c = 0; c < 3; c++) p[i * 3 + c] -= ((v[(q - 1) * 3 + c] + v[(q + 1) * 3 + c]) * 0.5 - v[q * 3 + c]) * k
      }
    }
  }

  /** A part lying on the floor doesn't spin or roll on forever: damp its turning. */
  rollResistance() {
    const { x, p } = this
    const hold = this.grabbed || this.lowering
    const held = hold && hold.body
    for (const b of this.bodies) {
      // (lying on something: it does not spin or roll on for ever; held, or in the air, it does not
      // swing or tumble on either: a lighter damping of its turning, about its centre's motion)
      const k = b.contact ? 0.04 : b === held ? 0.008 : 0.004
      let mx = 0
      let my = 0
      let mz = 0
      for (const i of b.f) {
        mx += x[i * 3] - p[i * 3]
        my += x[i * 3 + 1] - p[i * 3 + 1]
        mz += x[i * 3 + 2] - p[i * 3 + 2]
      }
      mx /= 4
      my /= 4
      mz /= 4
      for (const i of b.f) {
        p[i * 3] += (x[i * 3] - p[i * 3] - mx) * k
        p[i * 3 + 1] += (x[i * 3 + 1] - p[i * 3 + 1] - my) * k
        p[i * 3 + 2] += (x[i * 3 + 2] - p[i * 3 + 2] - mz) * k
      }
    }
  }


  // ---------------------------------------------------------------------------------- measures

  /** Largest relative stretch of any cable segment. */
  maxStretch() {
    let m = 0
    const t = this.tmp
    for (const ch of this.chains) {
      const pts = [this.pointOf(ch.from.body, ch.from.point.b, new Float64Array(3)), ...ch.ids.map((i) => [this.x[i * 3], this.x[i * 3 + 1], this.x[i * 3 + 2]]), this.pointOf(ch.to.body, ch.to.point.b, new Float64Array(3))]
      for (let k = 0; k + 1 < pts.length; k++) {
        const d = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1], pts[k + 1][2] - pts[k][2])
        m = Math.max(m, Math.abs(d - ch.rest) / ch.rest)
      }
    }
    void t
    return m
  }
  /** Total stretch of each chain end to end (sum of segment lengths over rest length). */
  chainStretch() {
    return this.chains.map((ch) => {
      const pts = [this.pointOf(ch.from.body, ch.from.point.b, new Float64Array(3)), ...ch.ids.map((i) => [this.x[i * 3], this.x[i * 3 + 1], this.x[i * 3 + 2]]), this.pointOf(ch.to.body, ch.to.point.b, new Float64Array(3))]
      let L = 0
      for (let k = 0; k + 1 < pts.length; k++) L += Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1], pts[k + 1][2] - pts[k][2])
      return L / ch.length - 1
    })
  }
  energy() {
    let e = 0
    for (let i = 0; i < this.n; i++) {
      let v2 = 0
      for (let k = 0; k < 3; k++) v2 += ((this.x[i * 3 + k] - this.p[i * 3 + k]) / H) ** 2
      e += 0.5 * this.mass[i] * v2
    }
    return e
  }
}

// ---------------------------------------------------------------------------------- waypoint layouts

/** A dense Catmull-Rom curve through points, as a polyline with its arc length. */
function densePath(ctrl, per = 24) {
  const P = (i) => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))]
  const out = []
  for (let i = 0; i < ctrl.length - 1; i++)
    for (let s = 0; s < per; s++) {
      const t = s / per
      const p0 = P(i - 1)
      const p1 = P(i)
      const p2 = P(i + 1)
      const p3 = P(i + 2)
      const t2 = t * t
      const t3 = t2 * t
      out.push([0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)))
    }
  out.push(ctrl[ctrl.length - 1])
  return out
}
function arcLengths(pts) {
  const acc = [0]
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]))
  return acc
}
/**
 * `count` points strictly between a and b, `step` apart along a smooth curve from a (leaving
 * along da) through `via` to b (arriving along db), bulged sideways in the floor plane (side +1
 * or -1) just enough to make the curve exactly (count + 1) * step long.
 */
export function routeBetween(a, da, b, db, via, count, step, side = 1) {
  const L = (count + 1) * step
  const lead = Math.min(7, step * 1.6)
  const ctrl = [a, [a[0] + da[0] * lead, a[1] + da[1] * lead, a[2] + da[2] * lead], ...via, [b[0] - db[0] * lead, b[1] - db[1] * lead, b[2] - db[2] * lead], b]
  const base = densePath(ctrl)
  const baseAcc = arcLengths(base)
  const total0 = baseAcc[baseAcc.length - 1]
  const shaped = (amp) => {
    // sideways: square to the local direction, in the floor plane; zero at both ends
    return base.map((p, i) => {
      const j = Math.min(base.length - 1, i + 1)
      const k = Math.max(0, i - 1)
      let tx = base[j][0] - base[k][0]
      let tz = base[j][2] - base[k][2]
      const tl = Math.hypot(tx, tz) || 1
      tx /= tl
      tz /= tl
      const f = Math.sin((Math.PI * baseAcc[i]) / total0) * amp * side
      return [p[0] - tz * f, p[1], p[2] + tx * f]
    })
  }
  let pts = base
  if (total0 < L) {
    let lo = 0
    let hi = L
    for (let it = 0; it < 50; it++) {
      const mid = (lo + hi) / 2
      const acc = arcLengths(shaped(mid))
      if (acc[acc.length - 1] < L) lo = mid
      else hi = mid
    }
    pts = shaped((lo + hi) / 2)
  }
  const acc = arcLengths(pts)
  const total = acc[acc.length - 1]
  const out = []
  let j = 0
  for (let q = 1; q <= count; q++) {
    const s = (q / (count + 1)) * total
    while (j < pts.length - 2 && acc[j + 1] < s) j++
    const t = (s - acc[j]) / (acc[j + 1] - acc[j] || 1)
    out.push([0, 1, 2].map((k) => pts[j][k] + (pts[j + 1][k] - pts[j][k]) * t))
  }
  return { pts: out, natural: total0, length: total, short: total0 > L * 1.002 ? total0 - L : 0 }
}

/**
 * Lay the rig out from explicit poses: each body placed by a pin (or its centre) with the
 * direction its cable leaves in (`heading`, radians in the floor plane, 0 = +x, pi/2 = +z), each
 * cable routed through waypoints. Returns warnings for routes too long for their cable.
 */
export function placePlan(rig, plan) {
  const up = [0, 1, 0]
  const crossV = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const dir = (h) => [Math.cos(h), 0, Math.sin(h)]
  const B = rig.byName
  const warnings = []
  const faceDown = (body, face) => {
    const m = body.mirror
    if (face === 'outer') return [-m, 0, 0]
    if (face === 'inner') return [m, 0, 0]
    if (face === 'front') return [0, 0, 1]
    if (face === 'back') return [0, 0, -1]
    return [0, 0, -1]
  }
  for (const [name, P] of Object.entries(plan.bodies)) {
    const body = B[name]
    const d = dir(P.heading)
    let R
    if (name === 'budL' || name === 'budR') {
      const tilt = P.tilt || 0
      const down = [Math.sin(tilt) * -d[2], -Math.cos(tilt), Math.sin(tilt) * d[0]]
      R = rotationFrom(body.pins.cable.dir, faceDown(body, P.face), d, down)
    } else if (name === 'plug') R = rotationFrom([0, 1, 0], [0, 0, 1], d, up)
    else if (name === 'remote') R = rotationFrom([0, 1, 0], [0, 0, P.face === 'back' ? -1 : 1], d, up)
    else R = rotationFrom([0, 1, 0], [1, 0, 0], d, crossV(d, up))
    // placed by its pin, or by its centre of mass
    const at = [P.at[0], P.at[1], P.at[2]]
    if (P.pin) {
      const off = Rig.poseToWorld(body, [0, 0, 0], R, body.pins[P.pin].s)
      rig.placeBody(body, [at[0] - off[0], at[1] - off[1], at[2] - off[2]], R)
    } else rig.placeBody(body, at, R)
  }
  const pinW = (body, key) => [...rig.pointOf(body, body.pins[key].b, new Float64Array(3))]
  const pinDir = (body, key) => {
    const d = body.pins[key].dir
    const R = body.R
    return [R[0] * d[0] + R[3] * d[1] + R[6] * d[2], R[1] * d[0] + R[4] * d[1] + R[7] * d[2], R[2] * d[0] + R[5] * d[1] + R[8] * d[2]]
  }
  const neg = (v) => v.map((c) => -c)
  for (const ch of rig.chains) {
    const R = plan.routes[ch.name] || {}
    const a = pinW(ch.from.body, Object.keys(ch.from.body.pins).find((k) => ch.from.body.pins[k] === ch.from.point))
    const da = pinDir(ch.from.body, Object.keys(ch.from.body.pins).find((k) => ch.from.body.pins[k] === ch.from.point))
    const bKey = Object.keys(ch.to.body.pins).find((k) => ch.to.body.pins[k] === ch.to.point)
    const b = pinW(ch.to.body, bKey)
    const db = neg(pinDir(ch.to.body, bKey))
    if (!ch.bead) {
      const r = routeBetween(a, da, b, db, R.via || [], ch.ids.length, ch.rest, R.side || 1)
      if (rig.debugRoutes) warnings.push(`${ch.name}: natural ${r.natural.toFixed(1)} target ${((ch.ids.length + 1) * ch.rest).toFixed(1)} got ${r.length.toFixed(1)}`)
      if (r.short) warnings.push(`${ch.name}: route ${r.short.toFixed(1)} mm too long`)
      rig.placeChain(ch, r.pts)
      continue
    }
    // through the bead: the particle pinned to it sits exactly in its hole
    const hk = Object.keys(ch.bead.body.pins).find((k) => ch.bead.body.pins[k] === ch.bead.hole)
    const hole = pinW(ch.bead.body, hk)
    const hd = pinDir(ch.bead.body, 'left') // unused direction for holes: use the bead's axis
    void hd
    const Rb = ch.bead.body.R
    const axis = [Rb[3], Rb[4], Rb[5]] // bead local +y: towards the buds
    const kb = ch.ids.indexOf(ch.bead.i)
    const r1 = routeBetween(a, da, hole, neg(axis), R.via || [], kb, ch.rest, R.side || 1)
    const r2 = routeBetween(hole, neg(axis), b, db, R.via2 || [], ch.ids.length - kb - 1, ch.rest, R.side2 || 1)
    for (const [k, r] of [['to bead', r1], ['bead on', r2]]) {
      if (rig.debugRoutes) warnings.push(`${ch.name} ${k}: natural ${r.natural.toFixed(1)} got ${r.length.toFixed(1)}`)
      if (r.short) warnings.push(`${ch.name} ${k}: route ${r.short.toFixed(1)} mm too long`)
    }
    rig.placeChain(ch, [...r1.pts, hole, ...r2.pts])
  }
  for (const b of rig.bodies) b.contact = false
  rig.wake()
  return warnings
}

/**
 * Distance from a world point to a part, from the part's pose (R, c, com, mirror) and its distance
 * grid; `out` gets the closest surface point (local) and the normal (world).
 */
export function fieldDistance(b, wx, wy, wz, out) {
  // world -> the body's local frame
  const R = b.R
  const dx = wx - b.c[0]
  const dy = wy - b.c[1]
  const dz = wz - b.c[2]
  const lx = R[0] * dx + R[1] * dy + R[2] * dz + b.com[0]
  const ly = R[3] * dx + R[4] * dy + R[5] * dz + b.com[1]
  const lz = R[6] * dx + R[7] * dy + R[8] * dz + b.com[2]
  const g = b.grid
  // design frame (mirrored parts look up their mirror image)
  const qx = lx * b.mirror
  const fx = (qx - g.o[0]) / g.h
  const fy = (ly - g.o[1]) / g.h
  const fz = (lz - g.o[2]) / g.h
  const [nx, ny, nz] = g.n
  if (fx < 0 || fy < 0 || fz < 0 || fx >= nx - 1 || fy >= ny - 1 || fz >= nz - 1) return 1e9
  const i = Math.floor(fx)
  const j = Math.floor(fy)
  const k = Math.floor(fz)
  const tx = fx - i
  const ty = fy - j
  const tz = fz - k
  const D = g.data
  const o = i + nx * (j + ny * k)
  const sy = nx
  const sz = nx * ny
  const c000 = D[o]
  const c100 = D[o + 1]
  const c010 = D[o + sy]
  const c110 = D[o + sy + 1]
  const c001 = D[o + sz]
  const c101 = D[o + sz + 1]
  const c011 = D[o + sz + sy]
  const c111 = D[o + sz + sy + 1]
  const c00 = c000 + (c100 - c000) * tx
  const c10 = c010 + (c110 - c010) * tx
  const c01 = c001 + (c101 - c001) * tx
  const c11 = c011 + (c111 - c011) * tx
  const c0 = c00 + (c10 - c00) * ty
  const c1 = c01 + (c11 - c01) * ty
  const d = c0 + (c1 - c0) * tz
  // gradient of the trilinear field
  let gx = ((c100 - c000) * (1 - ty) + (c110 - c010) * ty) * (1 - tz) + ((c101 - c001) * (1 - ty) + (c111 - c011) * ty) * tz
  let gy = (c10 - c00) * (1 - tz) + (c11 - c01) * tz
  let gz = c1 - c0
  const gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1
  gx /= gl
  gy /= gl
  gz /= gl
  // closest surface point, local (back in the part's own, possibly mirrored, frame)
  out[0] = lx - gx * b.mirror * d
  out[1] = ly - gy * d
  out[2] = lz - gz * d
  // normal in world
  const lnx = gx * b.mirror
  out[3] = R[0] * lnx + R[3] * gy + R[6] * gz
  out[4] = R[1] * lnx + R[4] * gy + R[7] * gz
  out[5] = R[2] * lnx + R[5] * gy + R[8] * gz
  return d
}
