// Cable physics for the earphones: position-based dynamics on particles.
//
//   particles -> distance constraints -> gravity -> damping -> collisions -> (tube drawn elsewhere)
//
// Units: centimetres, grams, seconds; gravity is real (981 cm/s^2), so swings take real time.
// The cable is a tree of particles: each earbud's cable runs down to the splitter (the right one
// through the remote), and the main cable runs from the splitter to the 3.5 mm plug. The remote,
// the splitter and the plug are rigid pieces: two heavy particles held at a fixed distance, with
// strain reliefs that make the cable leave them in a straight line.
// The earbuds are held in space (kinematic): whoever moves them moves the cable ends, and the
// rest follows through the constraints. Integration is Verlet at a fixed 600 Hz.
//
// Constraints, all solved by projection every substep:
//   stretch    every segment keeps its length (and the rigid pieces theirs)
//   bend       soft distance between particles two apart: no sharp kinks, a little springiness
//   tether     no particle can be further from an earbud than the cable between them is long,
//              which stops a long, lightly built chain from stretching under the heavy plug
//   collision  cable against cable (capsule against capsule), against the earbuds, the floor
// No three.js here: it runs under Node for tests.

export const G = 981

export const SPEC = {
  seg: 0.4, // cable segment length
  cableR: 0.09, // 1.8 mm cable
  cableMass: 0.12, // grams per cm (heavier than life, relative to the pieces: see the solver note)
  leftLen: 6.5, // left earbud to the splitter (shorter than life, so the earbuds stay large on screen)
  rightTop: 2.6, // right earbud to the remote
  remoteLen: 3.6, // matches the modelled remote, strain relief tip to tip
  remoteMass: 1.0,
  remoteR: 0.3,
  rightBottom: 1.2, // remote to the splitter
  splitLen: 1.0,
  splitMass: 0.3,
  splitR: 0.22,
  mainLen: 5.5,
  plugLen: 4.15, // strain relief + housing + metal pin, as modelled
  plugMass: 1.4,
  plugR: 0.29,
  damping: 1.4, // 1/s, air drag on every particle
  bend: 0.08, // bending stiffness per iteration
  relief: 0.5, // strain relief stiffness
  floorY: -40,
  friction: 0.5,
}

const HZ = 1200
const DT = 1 / HZ
const ITER = 2
const MAX_SUBSTEPS = 80
// stretch constraints are solved from the supports outwards, and each one moves its far end more
// than its near end ("mass scaling"): a long, light chain then holds up a heavy plug without
// stretching, as a real cable does
const NEAR_END = 1
const LONG_SPANS = [2, 4, 8]

// earbud collision shapes and attachment points, in the earbud's own frame (the left one; the
// right one mirrors x). Matches shapes.js.
const BUD = {
  head: [0, 0, 0, 0.86],
  stemA: [-0.32, -0.45, -0.5],
  stemB: [-0.32, -3.55, -0.5],
  stemR: 0.27,
  exit: [-0.32, -3.74, -0.5],
  relief: [-0.32, -3.34, -0.5], // a point up the stem: the cable leaves in line with it
}

function transform(m, p, mirror, out, o = 0) {
  const x = mirror ? -p[0] : p[0]
  const y = p[1]
  const z = p[2]
  out[o] = m[0] * x + m[4] * y + m[8] * z + m[12]
  out[o + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]
  out[o + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]
}

export class EarphoneSim {
  constructor(spec = {}) {
    this.s = { ...SPEC, ...spec }
    this.n = 0
    this.cap = 128
    this.x = new Float64Array(this.cap * 3)
    this.p = new Float64Array(this.cap * 3) // previous positions
    this.w = new Float64Array(this.cap) // inverse mass (0 = held)
    this.w0 = new Float64Array(this.cap) // inverse mass when not held
    this.rad = new Float64Array(this.cap)
    this.stretch = []
    this.bend = []
    this.chains = {}
    this.pieces = {}
    this.acc = 0
    this.time = 0
    this.grabbed = -1
    this.grabTarget = new Float64Array(3)
    this.grabPrev = new Float64Array(3)
    this.grabFrom = new Float64Array(3)
    // earbud state: world points at the start and end of the current frame, interpolated per substep
    this.bud = {
      left: { m: null, from: new Float64Array(18), to: new Float64Array(18), now: new Float64Array(18) },
      right: { m: null, from: new Float64Array(18), to: new Float64Array(18), now: new Float64Array(18) },
    }
  }

  add(x, y, z, mass, r) {
    const i = this.n++
    this.x[i * 3] = this.p[i * 3] = x
    this.x[i * 3 + 1] = this.p[i * 3 + 1] = y
    this.x[i * 3 + 2] = this.p[i * 3 + 2] = z
    this.w[i] = this.w0[i] = mass > 0 ? 1 / mass : 0
    this.rad[i] = r
    return i
  }

  /** Lay a chain of `count` new particles evenly between two points (ends not included). */
  line(a, b, count, mass, r) {
    const ids = []
    for (let k = 1; k <= count; k++) {
      const t = k / (count + 1)
      ids.push(this.add(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, mass, r))
    }
    return ids
  }

  pos(i) {
    return [this.x[i * 3], this.x[i * 3 + 1], this.x[i * 3 + 2]]
  }

  /**
   * Build the cable for earbuds placed with these 4x4 (column-major) matrices, then let it settle.
   */
  build(leftMatrix, rightMatrix, settleSeconds = 3) {
    const s = this.s
    this.setEarbuds(leftMatrix, rightMatrix, true)
    const L = this.bud.left.to
    const R = this.bud.right.to
    // held points: each earbud's cable exit and a point up its stem (for the strain relief)
    const aL = this.add(L[0], L[1], L[2], 0, s.cableR)
    const aL2 = this.add(L[3], L[4], L[5], 0, s.cableR)
    const aR = this.add(R[0], R[1], R[2], 0, s.cableR)
    const aR2 = this.add(R[3], R[4], R[5], 0, s.cableR)
    this.anchors = { left: [aL, aL2], right: [aR, aR2] }

    // the splitter hangs below the middle of the two earbuds, where the left cable reaches
    const mid = [(L[0] + R[0]) / 2, 0, (L[2] + R[2]) / 2]
    const dx = Math.hypot(L[0] - mid[0], L[2] - mid[2])
    mid[1] = L[1] - Math.sqrt(Math.max(1, s.leftLen ** 2 - dx * dx))
    const segMass = s.cableMass * s.seg
    const sTop = this.add(mid[0], mid[1], mid[2], s.splitMass / 2, s.splitR)
    const sBot = this.add(mid[0], mid[1] - s.splitLen, mid[2], s.splitMass / 2, s.splitR)

    // left cable
    const nl = Math.round(s.leftLen / s.seg)
    const left = [aL, ...this.line(this.pos(aL), this.pos(sTop), nl - 1, segMass, s.cableR), sTop]
    // right cable: earbud -> remote -> splitter, laid along the straight line from earbud to splitter
    const total = s.rightTop + s.remoteLen + s.rightBottom
    const pr = this.pos(aR)
    const ps = this.pos(sTop)
    const at = (d) => {
      const t = Math.min(1, d / total)
      return [pr[0] + (ps[0] - pr[0]) * t, pr[1] + (ps[1] - pr[1]) * t, pr[2] + (ps[2] - pr[2]) * t]
    }
    const mTopP = at(s.rightTop)
    const mBotP = at(s.rightTop + s.remoteLen)
    const mTop = this.add(...mTopP, s.remoteMass / 2, s.remoteR)
    const mBot = this.add(...mBotP, s.remoteMass / 2, s.remoteR)
    const n1 = Math.round(s.rightTop / s.seg)
    const n2 = Math.round(s.rightBottom / s.seg)
    const right1 = [aR, ...this.line(pr, mTopP, n1 - 1, segMass, s.cableR), mTop]
    const right2 = [mBot, ...this.line(mBotP, ps, n2 - 1, segMass, s.cableR), sTop]
    // main cable and plug, hanging straight down
    const nm = Math.round(s.mainLen / s.seg)
    const sb = this.pos(sBot)
    const pTopP = [sb[0], sb[1] - s.mainLen, sb[2]]
    const pTop = this.add(...pTopP, s.plugMass / 2, s.plugR)
    const pTip = this.add(pTopP[0], pTopP[1] - s.plugLen, pTopP[2], s.plugMass / 2, s.plugR)
    const main = [sBot, ...this.line(sb, pTopP, nm - 1, segMass, s.cableR), pTop]

    this.chains = { left, right1, right2, main }
    this.pieces = { remote: [mTop, mBot], splitter: [sTop, sBot], plug: [pTop, pTip] }

    // stretch: every cable segment, at the length it was meant to have
    const chainLen = { left: s.leftLen, right1: s.rightTop, right2: s.rightBottom, main: s.mainLen }
    for (const [name, ids] of Object.entries(this.chains)) {
      const rest = chainLen[name] / (ids.length - 1)
      for (let k = 0; k + 1 < ids.length; k++) this.stretch.push([ids[k], ids[k + 1], rest])
    }
    this.stretch.push([mTop, mBot, s.remoteLen], [sTop, sBot, s.splitLen], [pTop, pTip, s.plugLen])

    // bending: along each chain, plus across the rigid pieces' ends
    for (const ids of Object.values(this.chains))
      for (let k = 0; k + 2 < ids.length; k++) {
        const r = this.restOf(ids[k], ids[k + 1]) + this.restOf(ids[k + 1], ids[k + 2])
        this.bend.push([ids[k], ids[k + 2], r, s.bend])
      }
    const relief = (far, near, cable) => {
      // straight line from the far end of a piece, through its near end, to the first cable particle
      this.bend.push([far, cable, this.restOf(far, near) + this.restOf(near, cable), s.relief])
    }
    relief(aL2, aL, left[1])
    relief(aR2, aR, right1[1])
    relief(mBot, mTop, right1[right1.length - 2])
    relief(mTop, mBot, right2[1])
    relief(sTop, sBot, main[1])
    relief(pTip, pTop, main[main.length - 2])

    this.prepareTethers()
    this.prepareCollisions()
    // let it hang for a while before anyone sees it
    for (let k = 0; k < settleSeconds * HZ; k++) this.substep(1)
    return this
  }

  restOf(i, j) {
    for (const [a, b, r] of this.stretch) if ((a === i && b === j) || (a === j && b === i)) return r
    if ((i === this.anchors.left[0] && j === this.anchors.left[1]) || (i === this.anchors.right[0] && j === this.anchors.right[1]))
      return 0.4
    return Math.hypot(...this.pos(i).map((v, k) => v - this.pos(j)[k]))
  }

  /** Path lengths along the cable from each earbud's exit to every particle. */
  prepareTethers() {
    const adj = Array.from({ length: this.n }, () => [])
    for (const [a, b, r] of this.stretch) {
      adj[a].push([b, r])
      adj[b].push([a, r])
    }
    this.adj = adj
    const dist = (src) => {
      const d = new Float64Array(this.n).fill(Infinity)
      d[src] = 0
      const q = [src]
      while (q.length) {
        // tiny graph: a simple label-correcting pass is plenty
        const u = q.shift()
        for (const [v, r] of adj[u])
          if (d[u] + r < d[v] - 1e-9) {
            d[v] = d[u] + r
            q.push(v)
          }
      }
      return d
    }
    this.dist = dist
    // long-range limits along each chain, at a few spans: one-sided, so they only act when the
    // cable between two particles is pulled straight, and they stop stretch from adding up
    const spans = []
    for (const ids of Object.values(this.chains))
      for (const k of LONG_SPANS)
        for (let a = 0; a + k < ids.length; a++) {
          let L = 0
          for (let q = a; q < a + k; q++) L += this.restOf(ids[q], ids[q + 1])
          // 1% slack: a cable hanging straight sits just inside the limit instead of chattering on it
          spans.push([ids[a], ids[a + k], L * 1.01])
        }
    this.spans = spans
    this.tether = { left: dist(this.anchors.left[0]), right: dist(this.anchors.right[0]), grab: null }
    // the longest a held earbud may be dragged from the other one: cable between them, minus a margin
    this.budSpan = this.tether.left[this.anchors.right[0]] - 0.6
    this.orderStretch()
  }

  /** Sort stretch constraints from the supports outwards, near end first. */
  orderStretch() {
    const t = this.tether
    const up = new Float64Array(this.n)
    for (let i = 0; i < this.n; i++) up[i] = Math.min(t.left[i], t.right[i], t.grab ? t.grab[i] : Infinity)
    const st = this.stretch.map(([a, b, r]) => (up[a] <= up[b] ? [a, b, r] : [b, a, r]))
    st.sort((p, q) => up[p[0]] - up[q[0]])
    this.ordered = st
  }

  /** Segments that can collide, and which pairs are close enough along the cable to skip. */
  prepareCollisions() {
    const segs = []
    for (const [a, b] of this.stretch) segs.push([a, b])
    this.segs = segs
    // graph distance (in particles) between every pair of particles
    const n = this.n
    const hop = Array.from({ length: n }, () => new Int16Array(n).fill(999))
    for (let src = 0; src < n; src++) {
      hop[src][src] = 0
      const q = [src]
      while (q.length) {
        const u = q.shift()
        for (const [v] of this.adj[u])
          if (hop[src][v] > hop[src][u] + 1) {
            hop[src][v] = hop[src][u] + 1
            q.push(v)
          }
      }
    }
    const pairs = []
    for (let i = 0; i < segs.length; i++)
      for (let j = i + 1; j < segs.length; j++) {
        const [a, b] = segs[i]
        const [c, d] = segs[j]
        const near = Math.min(hop[a][c], hop[a][d], hop[b][c], hop[b][d])
        if (near > 3) pairs.push(i, j)
      }
    this.pairs = new Int32Array(pairs)
    // the first few particles of each earbud's own cable don't collide with that earbud
    const own = (ids) => new Set(ids.slice(0, 4))
    this.ownLeft = own(this.chains.left)
    this.ownRight = own(this.chains.right1)
  }

  /** Earbud placement for the next frame (4x4 column-major matrices, e.g. three.js Matrix4.elements). */
  setEarbuds(leftMatrix, rightMatrix, snap = false) {
    for (const [side, m] of [
      ['left', leftMatrix],
      ['right', rightMatrix],
    ]) {
      const b = this.bud[side]
      const mirror = side === 'right'
      b.from.set(b.to)
      transform(m, BUD.exit, mirror, b.to, 0)
      transform(m, BUD.relief, mirror, b.to, 3)
      transform(m, BUD.head, mirror, b.to, 6)
      transform(m, BUD.stemA, mirror, b.to, 9)
      transform(m, BUD.stemB, mirror, b.to, 12)
      if (snap) b.from.set(b.to)
      b.now.set(b.to)
    }
  }

  /** Hold particle i at a point (dragging). */
  grab(i, x, y, z) {
    if (this.grabbed !== i) {
      this.release()
      this.grabbed = i
      this.w[i] = 0
      this.grabPrev.set(this.x.subarray(i * 3, i * 3 + 3))
      // whatever is held becomes a support: re-rank the cable around it
      this.tether.grab = this.dist(i)
      this.orderStretch()
    }
    this.grabTarget[0] = x
    this.grabTarget[1] = y
    this.grabTarget[2] = z
    this.reach(this.grabTarget)
  }

  release() {
    if (this.grabbed >= 0) {
      this.w[this.grabbed] = this.w0[this.grabbed]
      this.tether.grab = null
      this.orderStretch()
    }
    this.grabbed = -1
  }

  /** Pull a target point back inside what the cable can reach from both earbuds. */
  reach(t) {
    const i = this.grabbed
    for (let it = 0; it < 4; it++)
      for (const side of ['left', 'right']) {
        const a = this.anchors[side][0]
        const L = this.tether[side][i]
        const dx = t[0] - this.x[a * 3]
        const dy = t[1] - this.x[a * 3 + 1]
        const dz = t[2] - this.x[a * 3 + 2]
        const d = Math.hypot(dx, dy, dz)
        if (d > L) {
          const k = L / d
          t[0] = this.x[a * 3] + dx * k
          t[1] = this.x[a * 3 + 1] + dy * k
          t[2] = this.x[a * 3 + 2] + dz * k
        }
      }
  }

  /** Advance by a frame's worth of time, in fixed substeps. */
  step(frameDt) {
    this.acc += Math.min(frameDt, 0.1)
    const steps = Math.min(MAX_SUBSTEPS, Math.floor(this.acc / DT))
    this.acc -= steps * DT
    if (steps === MAX_SUBSTEPS) this.acc = 0
    if (this.grabbed >= 0) this.grabFrom.set(this.grabPrev)
    for (let k = 0; k < steps; k++) this.substep((k + 1) / steps)
    for (const side of ['left', 'right']) this.bud[side].from.set(this.bud[side].to)
    if (this.grabbed >= 0) this.grabPrev.set(this.grabTarget)
    return steps
  }

  substep(t) {
    const { x, p, w } = this
    const s = this.s
    this.time += DT
    // held points move along with their earbud (interpolated through the frame); their previous
    // position is kept, so whatever is let go of leaves with the velocity it had
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
      for (let k = 0; k < 15; k++) b.now[k] = b.from[k] + (b.to[k] - b.from[k]) * t
      const [a, a2] = this.anchors[side]
      hold(a, b.now[0], b.now[1], b.now[2])
      hold(a2, b.now[3], b.now[4], b.now[5])
    }
    if (this.grabbed >= 0) {
      const f = this.grabFrom
      const g = this.grabTarget
      hold(this.grabbed, f[0] + (g[0] - f[0]) * t, f[1] + (g[1] - f[1]) * t, f[2] + (g[2] - f[2]) * t)
    }

    // Verlet: inertia, gravity, air drag
    const keep = 1 - s.damping * DT
    const g = G * DT * DT
    for (let i = 0; i < this.n; i++) {
      if (w[i] === 0) continue
      for (let k = 0; k < 3; k++) {
        const j = i * 3 + k
        const v = (x[j] - p[j]) * keep
        p[j] = x[j]
        x[j] += v
      }
      x[i * 3 + 1] -= g
    }

    for (let it = 0; it < ITER; it++) {
      this.solveStretch(it % 2 === 1)
      this.solveBend()
      this.solveSpans()
      this.solveTethers()
    }
    this.solveCollisions()
    this.solveStretch(true)
    this.solveStretch(false)
  }

  solveStretch(reverse) {
    const { x, w } = this
    const st = this.ordered
    const n = st.length
    for (let q = 0; q < n; q++) {
      // a is the end nearer a support: it moves less
      const [a, b, r] = st[reverse ? n - 1 - q : q]
      const wa = w[a] * NEAR_END
      const wb = w[b]
      const W = wa + wb
      if (W === 0) continue
      const dx = x[b * 3] - x[a * 3]
      const dy = x[b * 3 + 1] - x[a * 3 + 1]
      const dz = x[b * 3 + 2] - x[a * 3 + 2]
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9
      const c = (d - r) / (d * W)
      x[a * 3] += dx * c * wa
      x[a * 3 + 1] += dy * c * wa
      x[a * 3 + 2] += dz * c * wa
      x[b * 3] -= dx * c * wb
      x[b * 3 + 1] -= dy * c * wb
      x[b * 3 + 2] -= dz * c * wb
    }
  }

  solveBend() {
    const { x, w } = this
    for (const [a, b, r, k] of this.bend) {
      const wa = w[a]
      const wb = w[b]
      const W = wa + wb
      if (W === 0) continue
      const dx = x[b * 3] - x[a * 3]
      const dy = x[b * 3 + 1] - x[a * 3 + 1]
      const dz = x[b * 3 + 2] - x[a * 3 + 2]
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9
      // only resist folding: a cable can't be longer than straight
      if (d >= r) continue
      const c = ((d - r) / (d * W)) * k
      x[a * 3] += dx * c * wa
      x[a * 3 + 1] += dy * c * wa
      x[a * 3 + 2] += dz * c * wa
      x[b * 3] -= dx * c * wb
      x[b * 3 + 1] -= dy * c * wb
      x[b * 3 + 2] -= dz * c * wb
    }
  }

  solveSpans() {
    const { x, w } = this
    for (const [a, b, L] of this.spans) {
      const wa = w[a]
      const wb = w[b]
      const W = wa + wb
      if (W === 0) continue
      const dx = x[b * 3] - x[a * 3]
      const dy = x[b * 3 + 1] - x[a * 3 + 1]
      const dz = x[b * 3 + 2] - x[a * 3 + 2]
      const d2 = dx * dx + dy * dy + dz * dz
      if (d2 <= L * L) continue
      const d = Math.sqrt(d2)
      const c = (d - L) / (d * W)
      x[a * 3] += dx * c * wa
      x[a * 3 + 1] += dy * c * wa
      x[a * 3 + 2] += dz * c * wa
      x[b * 3] -= dx * c * wb
      x[b * 3 + 1] -= dy * c * wb
      x[b * 3 + 2] -= dz * c * wb
    }
  }

  solveTethers() {
    const { x, w } = this
    for (const side of ['left', 'right', 'grab']) {
      if (side === 'grab' && this.grabbed < 0) continue
      const a = side === 'grab' ? this.grabbed : this.anchors[side][0]
      const ax = x[a * 3]
      const ay = x[a * 3 + 1]
      const az = x[a * 3 + 2]
      const L = this.tether[side]
      for (let i = 0; i < this.n; i++) {
        if (w[i] === 0) continue
        const dx = x[i * 3] - ax
        const dy = x[i * 3 + 1] - ay
        const dz = x[i * 3 + 2] - az
        const d2 = dx * dx + dy * dy + dz * dz
        if (d2 <= L[i] * L[i]) continue
        const k = L[i] / Math.sqrt(d2)
        x[i * 3] = ax + dx * k
        x[i * 3 + 1] = ay + dy * k
        x[i * 3 + 2] = az + dz * k
      }
    }
  }

  solveCollisions() {
    const { x, p, w, rad } = this
    const s = this.s
    // cable against cable: closest points of two segments, pushed apart
    const segs = this.segs
    const pr = this.pairs
    let hits = 0
    for (let q = 0; q < pr.length; q += 2) {
      const [a, b] = segs[pr[q]]
      const [c, d] = segs[pr[q + 1]]
      // a segment is as thick as its thinner end: cable next to the remote is still cable
      const rr = Math.min(rad[a], rad[b]) + Math.min(rad[c], rad[d])
      // cheap reject on bounding boxes
      const ax = x[a * 3], ay = x[a * 3 + 1], az = x[a * 3 + 2]
      const bx = x[b * 3], by = x[b * 3 + 1], bz = x[b * 3 + 2]
      const cx = x[c * 3], cy = x[c * 3 + 1], cz = x[c * 3 + 2]
      const dx = x[d * 3], dy = x[d * 3 + 1], dz = x[d * 3 + 2]
      if (Math.min(ax, bx) - rr > Math.max(cx, dx) || Math.min(cx, dx) - rr > Math.max(ax, bx)) continue
      if (Math.min(ay, by) - rr > Math.max(cy, dy) || Math.min(cy, dy) - rr > Math.max(ay, by)) continue
      if (Math.min(az, bz) - rr > Math.max(cz, dz) || Math.min(cz, dz) - rr > Math.max(az, bz)) continue
      // closest points between segments ab and cd
      const ux = bx - ax, uy = by - ay, uz = bz - az
      const vx = dx - cx, vy = dy - cy, vz = dz - cz
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
      if (dist >= rr || dist < 1e-9) continue
      hits++
      const wa = w[a] * (1 - sN), wb = w[b] * sN, wc = w[c] * (1 - tN), wd = w[d] * tN
      const den2 = w[a] * (1 - sN) ** 2 + w[b] * sN ** 2 + w[c] * (1 - tN) ** 2 + w[d] * tN ** 2
      if (den2 < 1e-12) continue
      const lam = (rr - dist) / den2
      const ex = nx / dist, ey = ny / dist, ez = nz / dist
      x[a * 3] += ex * lam * wa; x[a * 3 + 1] += ey * lam * wa; x[a * 3 + 2] += ez * lam * wa
      x[b * 3] += ex * lam * wb; x[b * 3 + 1] += ey * lam * wb; x[b * 3 + 2] += ez * lam * wb
      x[c * 3] -= ex * lam * wc; x[c * 3 + 1] -= ey * lam * wc; x[c * 3 + 2] -= ez * lam * wc
      x[d * 3] -= ex * lam * wd; x[d * 3 + 1] -= ey * lam * wd; x[d * 3 + 2] -= ez * lam * wd
    }
    this.hits = hits

    // cable against the earbuds: a sphere for the head, a capsule for the stem
    for (const side of ['left', 'right']) {
      const b = this.bud[side].now
      const own = side === 'left' ? this.ownLeft : this.ownRight
      for (let i = 0; i < this.n; i++) {
        if (w[i] === 0 || own.has(i)) continue
        const r = rad[i]
        // head
        let ex = x[i * 3] - b[6]
        let ey = x[i * 3 + 1] - b[7]
        let ez = x[i * 3 + 2] - b[8]
        let d = Math.sqrt(ex * ex + ey * ey + ez * ez)
        const hr = BUD.head[3] + r
        if (d < hr && d > 1e-9) {
          const k = hr / d
          x[i * 3] = b[6] + ex * k
          x[i * 3 + 1] = b[7] + ey * k
          x[i * 3 + 2] = b[8] + ez * k
        }
        // stem
        const ux = b[12] - b[9], uy = b[13] - b[10], uz = b[14] - b[11]
        const vx = x[i * 3] - b[9], vy = x[i * 3 + 1] - b[10], vz = x[i * 3 + 2] - b[11]
        let tt = (ux * vx + uy * vy + uz * vz) / (ux * ux + uy * uy + uz * uz)
        tt = tt < 0 ? 0 : tt > 1 ? 1 : tt
        ex = vx - ux * tt
        ey = vy - uy * tt
        ez = vz - uz * tt
        d = Math.sqrt(ex * ex + ey * ey + ez * ez)
        const sr = BUD.stemR + r
        if (d < sr && d > 1e-9) {
          const k = (sr - d) / d
          x[i * 3] += ex * k
          x[i * 3 + 1] += ey * k
          x[i * 3 + 2] += ez * k
        }
      }
    }

    // the floor, with friction
    const fy = s.floorY
    for (let i = 0; i < this.n; i++) {
      if (w[i] === 0) continue
      const lo = fy + rad[i]
      if (x[i * 3 + 1] < lo) {
        x[i * 3 + 1] = lo
        p[i * 3] += (x[i * 3] - p[i * 3]) * s.friction
        p[i * 3 + 2] += (x[i * 3 + 2] - p[i * 3 + 2]) * s.friction
      }
    }
  }

  // ---------------------------------------------------------------- measurements (for tests)

  /** Largest relative stretch of any segment. */
  maxStretch() {
    let m = 0
    for (const [a, b, r] of this.stretch) {
      const d = Math.hypot(
        this.x[b * 3] - this.x[a * 3],
        this.x[b * 3 + 1] - this.x[a * 3 + 1],
        this.x[b * 3 + 2] - this.x[a * 3 + 2],
      )
      m = Math.max(m, Math.abs(d - r) / r)
    }
    return m
  }

  /** Kinetic energy (g cm^2/s^2) of the free particles. */
  energy() {
    let e = 0
    for (let i = 0; i < this.n; i++) {
      if (this.w[i] === 0) continue
      const m = 1 / this.w[i]
      let v2 = 0
      for (let k = 0; k < 3; k++) v2 += ((this.x[i * 3 + k] - this.p[i * 3 + k]) / DT) ** 2
      e += 0.5 * m * v2
    }
    return e
  }
}
