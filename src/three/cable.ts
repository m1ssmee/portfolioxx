// Earphone physics: position-based dynamics.
//  - the cable is a chain of particles with stretch and bending constraints
//  - the earbuds and the plug are rigid bodies: clusters of particles kept in shape by
//    shape matching, so they tumble, rest on their sides and swing like real objects
//  - everything collides with the pod, the floor, the curved wall and itself
import * as THREE from 'three'
import { FLOOR, SWEEP_R, WALL } from './layout'
import { POD, podSdf } from './model'

export const MAIN = 24 // segments from the plug to the splitter
export const BR = 12 // segments from the splitter to each earbud
const MAIN_LEN = 1.0
const BR_LEN = 0.48
const G = 42 // gravity, units/s² (1 unit ≈ 10 cm)
const DAMP = 0.9965
const ITER = 16
const H = 1 / 120
const CABLE_R = 0.0105

type Shape = { p: [number, number, number]; w: number; r: number }[]

/** The straight USB-C plug, in its own space: +y runs from the connector tip to the cable. */
export const PLUG_SHAPE: Shape = [
  { p: [0, 0.014, 0], w: 1.2, r: 0.016 }, // connector tip
  { p: [0, 0.165, 0.004], w: 0.6, r: 0.034 }, // housing
  { p: [0.044, 0.165, -0.006], w: 1.2, r: 0.03 }, // housing side (fixes its roll)
  { p: [0, 0.322, 0], w: 2, r: 0.011 }, // where the cable leaves
]
/** An earbud: the cable enters the bottom of the stem at the origin, the head sits on top. */
export function budShape(side: 1 | -1): Shape {
  return [
    { p: [0, 0, 0], w: 2, r: 0.012 }, // stem bottom (cable)
    { p: [0, 0.105, 0.004], w: 1.5, r: 0.026 }, // stem
    { p: [0, 0.212, 0.012], w: 0.55, r: 0.068 }, // head
    { p: [side * 0.022, 0.204, 0.066], w: 1.3, r: 0.026 }, // speaker face
  ]
}

/** Where the plug sits when plugged in: pushed up into the port on the bottom edge. */
export const PLUG_IN_POD = new THREE.Matrix4()
  .makeTranslation(POD.port.x, -POD.H / 2 + 0.065, POD.port.z)
  .multiply(new THREE.Matrix4().makeRotationZ(Math.PI))

export type Particle = {
  x: number
  y: number
  z: number
  px: number
  py: number
  pz: number
  w: number // inverse mass
  r: number // collision radius
  contact: boolean
}

type Body = { ids: number[]; rest: THREE.Vector3[]; q: THREE.Quaternion }

// scratch
const _m4 = new THREE.Matrix4()
const _qa = new THREE.Quaternion()
const _v = new THREE.Vector3()
const _r0 = new THREE.Vector3()
const _r1 = new THREE.Vector3()
const _r2 = new THREE.Vector3()
const _a0 = new THREE.Vector3()
const _a1 = new THREE.Vector3()
const _a2 = new THREE.Vector3()
const _om = new THREE.Vector3()
const _t = new THREE.Vector3()

export class Cable {
  pts: Particle[] = []
  stretch: [number, number, number][] = []
  bends: [number, number, number, number][] = []
  bodies: Body[] = []
  built = false
  plugged = true
  insert = 1 // eases 0 → 1 while the plug slides back into the port
  nearPort = false
  drag: { i: number; target: THREE.Vector3 } | null = null

  PLUG = 0 // body index 0 is the plug (particles 0..3; the cable starts at 3)
  START = 3
  SPLIT = 0
  REMOTE = 0
  budL = 1 // body indices
  budR = 2
  mainIds: number[] = []
  leftIds: number[] = []
  rightIds: number[] = []

  private exclude = new Uint8Array(0)
  private n = 0
  private m = new THREE.Matrix4()
  private inv = new THREE.Matrix4()
  private anchors: THREE.Vector3[] = PLUG_SHAPE.map(() => new THREE.Vector3())
  private acc = 0

  private add(x: number, y: number, z: number, w: number, r: number) {
    this.pts.push({ x, y, z, px: x, py: y, pz: z, w, r, contact: false })
    return this.pts.length - 1
  }

  private updateAnchors(pod: THREE.Object3D) {
    pod.updateMatrixWorld()
    this.m.copy(pod.matrixWorld)
    this.inv.copy(this.m).invert()
    _m4.multiplyMatrices(this.m, PLUG_IN_POD)
    PLUG_SHAPE.forEach((s, k) => this.anchors[k].set(...s.p).applyMatrix4(_m4))
  }

  /** Lay everything out in a believable resting shape, then let it settle before anyone sees it. */
  build(pod: THREE.Object3D) {
    this.updateAnchors(pod)
    this.pts = []
    this.stretch = []
    this.bends = []
    this.bodies = []

    // the plug, plugged in
    const plugIds = PLUG_SHAPE.map((s, k) => this.add(this.anchors[k].x, this.anchors[k].y, this.anchors[k].z, s.w, s.r))
    // start the plug's rotation at its plugged-in pose (it is upside down, so starting from identity could stall)
    const q0 = new THREE.Quaternion()
    _m4.multiplyMatrices(this.m, PLUG_IN_POD).decompose(new THREE.Vector3(), q0, new THREE.Vector3())
    this.bodies.push({ ids: plugIds, rest: PLUG_SHAPE.map((s) => new THREE.Vector3(...s.p)), q: q0 })
    this.START = plugIds[3]

    // the main cable: down to the floor, a lazy curve out to the right and back towards the
    // front, where the splitter sends one branch to each side. The path is about as long as the
    // cable, so nothing has to bunch up while it settles.
    const local = (x: number, y: number, z: number) => _v.set(x, y, z).applyMatrix4(this.m).clone()
    const floorL = FLOOR + 0.02 - pod.position.y
    const way = [
      this.anchors[3].clone(),
      local(0.0, floorL + 0.05, 0.03),
      local(0.12, floorL, 0.1),
      local(0.36, floorL, 0.1),
      local(0.55, floorL, 0.16),
      local(0.6, floorL, 0.28),
      local(0.5, floorL, 0.36),
    ]
    const seg = MAIN_LEN / MAIN
    const at = (d: number) => {
      for (let i = 0; i < way.length - 1; i++) {
        const l = way[i].distanceTo(way[i + 1])
        if (d <= l) return way[i].clone().lerp(way[i + 1], d / l)
        d -= l
      }
      // past the last point: carry on in the same direction rather than piling up
      const a = way[way.length - 2]
      const b = way[way.length - 1]
      return b.clone().addScaledVector(b.clone().sub(a).normalize(), d)
    }
    this.mainIds = [this.START]
    for (let i = 1; i <= MAIN; i++) {
      const p = at(i * seg)
      this.mainIds.push(this.add(p.x, p.y, p.z, i === MAIN ? 0.8 : 1, i === MAIN ? 0.02 : CABLE_R))
    }
    this.SPLIT = this.mainIds[MAIN]
    const split = this.pts[this.SPLIT]

    // two branches, each ending in an earbud
    const bseg = BR_LEN / BR
    const branch = (side: 1 | -1) => {
      const ids = [this.SPLIT]
      const dir = new THREE.Vector3(side > 0 ? 0.92 : -0.95, 0, side > 0 ? 0.38 : 0.3).transformDirection(this.m)
      dir.y = 0
      dir.normalize()
      for (let j = 1; j < BR; j++) {
        const remote = side === 1 && j === 3
        const p = new THREE.Vector3(split.x, split.y + 0.02, split.z).addScaledVector(dir, j * bseg)
        ids.push(this.add(p.x, p.y, p.z, remote ? 0.6 : 1, remote ? 0.03 : CABLE_R))
      }
      // the bud, lying on its side at the end of the branch
      const attach = new THREE.Vector3(split.x, split.y + 0.02, split.z).addScaledVector(dir, BR * bseg)
      const shape = budShape(side)
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
      q.premultiply(new THREE.Quaternion().setFromAxisAngle(dir, side * 1.2))
      const bodyIds = shape.map((s) => {
        const p = new THREE.Vector3(...s.p).applyQuaternion(q).add(attach)
        return this.add(p.x, p.y, p.z, s.w, s.r)
      })
      ids.push(bodyIds[0])
      this.bodies.push({ ids: bodyIds, rest: shape.map((s) => new THREE.Vector3(...s.p)), q: q.clone() })
      return ids
    }
    this.leftIds = branch(-1)
    this.rightIds = branch(1)
    this.REMOTE = this.rightIds[3]

    // constraints
    for (let i = 0; i < MAIN; i++) this.stretch.push([this.mainIds[i], this.mainIds[i + 1], seg])
    for (const ids of [this.leftIds, this.rightIds])
      for (let k = 0; k < ids.length - 1; k++) this.stretch.push([ids[k], ids[k + 1], bseg])
    for (let i = 0; i < MAIN - 1; i++) this.bends.push([this.mainIds[i], this.mainIds[i + 2], seg * 2, 0.22])
    for (const ids of [this.leftIds, this.rightIds])
      for (let k = 0; k < ids.length - 2; k++) this.bends.push([ids[k], ids[k + 2], bseg * 2, 0.2])
    this.bends.push([this.mainIds[MAIN - 1], this.leftIds[1], seg + bseg, 0.05])
    this.bends.push([this.mainIds[MAIN - 1], this.rightIds[1], seg + bseg, 0.05])
    // strain reliefs: the cable leaves the plug and the stems in a straight line
    const relief = (cableNext: number, attach: number, inner: number, k: number) => {
      const a = this.pts[cableNext]
      const b = this.pts[attach]
      const c = this.pts[inner]
      const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) + Math.hypot(b.x - c.x, b.y - c.y, b.z - c.z)
      this.bends.push([cableNext, inner, d * 0.985, k])
    }
    relief(this.mainIds[1], this.START, plugIds[1], 0.8)
    relief(this.leftIds[BR - 1], this.leftIds[BR], this.bodies[1].ids[1], 0.6)
    relief(this.rightIds[BR - 1], this.rightIds[BR], this.bodies[2].ids[1], 0.6)

    // who may touch whom: everything except neighbours along the cable and parts of one body
    this.n = this.pts.length
    const adj: number[][] = Array.from({ length: this.n }, () => [])
    for (const [a, b] of this.stretch) {
      adj[a].push(b)
      adj[b].push(a)
    }
    for (const b of this.bodies) for (const i of b.ids) for (const j of b.ids) if (i !== j) adj[i].push(j)
    this.exclude = new Uint8Array(this.n * this.n)
    for (let i = 0; i < this.n; i++) {
      this.exclude[i * this.n + i] = 1
      for (const j of adj[i]) {
        this.exclude[i * this.n + j] = 1
        for (const k of adj[j]) this.exclude[i * this.n + k] = 1
      }
    }

    this.built = true
    for (let i = 0; i < 720; i++) this.substep(0)
  }

  unplug() {
    this.plugged = false
    this.insert = 0
    for (const i of this.bodies[0].ids) this.pts[i].py += 0.004 // a little pop downwards
  }

  plugIn() {
    this.plugged = true
    this.insert = 0
  }

  /** Advance by dt seconds (fixed 120 Hz substeps). */
  step(dt: number, pod: THREE.Object3D, gust: number) {
    this.updateAnchors(pod)
    this.acc = Math.min(this.acc + dt, 6 * H)
    let first = true
    while (this.acc >= H) {
      this.substep(first ? gust : 0)
      first = false
      this.acc -= H
    }
    if (this.plugged && this.insert < 1) this.insert = Math.min(1, this.insert + dt * 6)
    const a = this.anchors[1]
    const p = this.pts[this.bodies[0].ids[1]]
    this.nearPort = !this.plugged && Math.hypot(p.x - a.x, p.y - a.y, p.z - a.z) < 0.16
  }

  /** Port position (plug housing, plugged-in pose) in world space. */
  portAnchor() {
    return this.anchors[1]
  }

  private isPinned(i: number) {
    if (this.drag && this.drag.i === i) return true
    return this.plugged && i <= 3
  }

  private substep(gust: number) {
    const pts = this.pts
    const n = pts.length
    const g = G * H * H
    for (let i = 0; i < n; i++) {
      const p = pts[i]
      const vx = (p.x - p.px) * DAMP
      const vy = (p.y - p.py) * DAMP
      const vz = (p.z - p.pz) * DAMP
      p.px = p.x
      p.py = p.y
      p.pz = p.z
      p.x += vx
      p.y += vy - g
      p.z += vz
    }
    if (gust) {
      // a scroll flick shakes whatever is hanging in the air
      for (let i = 4; i < n; i++) {
        const p = pts[i]
        if (p.contact) continue
        p.x += gust * 0.0011
        p.z += gust * 0.0005 * Math.sin(i * 0.7)
      }
    }
    for (let it = 0; it < ITER; it++) {
      this.pin()
      for (const [a, b, rest] of this.stretch) this.solve(a, b, rest, 1)
      for (const [a, b, rest, k] of this.bends) this.solveMin(a, b, rest, k)
      for (const b of this.bodies) this.matchShape(b)
      this.pin()
      for (let i = 0; i < n; i++) this.collide(pts[i], i)
    }
    this.selfCollide()
    for (let i = 0; i < n; i++) {
      const p = pts[i]
      if (!p.contact) continue
      // friction against the floor
      p.px = p.x - (p.x - p.px) * 0.5
      p.pz = p.z - (p.z - p.pz) * 0.5
    }
  }

  private pin() {
    const pts = this.pts
    if (this.plugged) {
      const k = this.insert >= 1 ? 1 : 0.15 + this.insert * 0.6
      this.bodies[0].ids.forEach((i, j) => {
        const p = pts[i]
        const a = this.anchors[j]
        p.x += (a.x - p.x) * k
        p.y += (a.y - p.y) * k
        p.z += (a.z - p.z) * k
      })
    }
    if (this.drag) {
      const p = pts[this.drag.i]
      p.x = this.drag.target.x
      p.y = this.drag.target.y
      p.z = this.drag.target.z
    }
  }

  private solve(a: number, b: number, rest: number, k: number) {
    const p = this.pts[a]
    const q = this.pts[b]
    const wa = this.isPinned(a) ? 0 : p.w
    const wb = this.isPinned(b) ? 0 : q.w
    const ws = wa + wb
    if (ws === 0) return
    const dx = q.x - p.x
    const dy = q.y - p.y
    const dz = q.z - p.z
    const d = Math.hypot(dx, dy, dz) || 1e-6
    const c = ((d - rest) / d / ws) * k
    p.x += dx * c * wa
    p.y += dy * c * wa
    p.z += dz * c * wa
    q.x -= dx * c * wb
    q.y -= dy * c * wb
    q.z -= dz * c * wb
  }

  /** Bending resistance: only pushes apart, never pulls together. */
  private solveMin(a: number, b: number, rest: number, k: number) {
    const p = this.pts[a]
    const q = this.pts[b]
    if (Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) >= rest) return
    this.solve(a, b, rest, k)
  }

  /** Shape matching: rotate the rest shape to best fit the particles, then pull them onto it. */
  private matchShape(b: Body) {
    const pts = this.pts
    let M = 0
    let cx = 0
    let cy = 0
    let cz = 0
    let rx = 0
    let ry = 0
    let rz = 0
    const mass = b.ids.map((i) => (this.isPinned(i) ? 1000 : 1 / pts[i].w))
    b.ids.forEach((i, k) => {
      const m = mass[k]
      M += m
      cx += pts[i].x * m
      cy += pts[i].y * m
      cz += pts[i].z * m
      rx += b.rest[k].x * m
      ry += b.rest[k].y * m
      rz += b.rest[k].z * m
    })
    cx /= M
    cy /= M
    cz /= M
    rx /= M
    ry /= M
    rz /= M
    _a0.set(0, 0, 0)
    _a1.set(0, 0, 0)
    _a2.set(0, 0, 0)
    b.ids.forEach((i, k) => {
      const m = mass[k]
      const px = pts[i].x - cx
      const py = pts[i].y - cy
      const pz = pts[i].z - cz
      const qx = b.rest[k].x - rx
      const qy = b.rest[k].y - ry
      const qz = b.rest[k].z - rz
      _a0.x += m * px * qx
      _a0.y += m * py * qx
      _a0.z += m * pz * qx
      _a1.x += m * px * qy
      _a1.y += m * py * qy
      _a1.z += m * pz * qy
      _a2.x += m * px * qz
      _a2.y += m * py * qz
      _a2.z += m * pz * qz
    })
    // Müller et al. 2016: turn q step by step towards the rotation part of A
    for (let it = 0; it < 6; it++) {
      _m4.makeRotationFromQuaternion(b.q)
      const e = _m4.elements
      _r0.set(e[0], e[1], e[2])
      _r1.set(e[4], e[5], e[6])
      _r2.set(e[8], e[9], e[10])
      const den = Math.abs(_r0.dot(_a0) + _r1.dot(_a1) + _r2.dot(_a2)) + 1e-9
      _om.crossVectors(_r0, _a0).add(_t.crossVectors(_r1, _a1)).add(_t.crossVectors(_r2, _a2)).multiplyScalar(1 / den)
      const w = _om.length()
      if (w < 1e-9) break
      _qa.setFromAxisAngle(_om.multiplyScalar(1 / w), w)
      b.q.premultiply(_qa).normalize()
    }
    b.ids.forEach((i, k) => {
      if (this.isPinned(i)) return
      _v.set(b.rest[k].x - rx, b.rest[k].y - ry, b.rest[k].z - rz).applyQuaternion(b.q)
      const p = pts[i]
      p.x = cx + _v.x
      p.y = cy + _v.y
      p.z = cz + _v.z
    })
  }

  private collide(p: Particle, i: number) {
    p.contact = false
    if (this.isPinned(i)) return
    if (!(this.plugged && i <= 3)) {
      // the pod, in its own space
      const e = this.inv.elements
      const lx = e[0] * p.x + e[4] * p.y + e[8] * p.z + e[12]
      const ly = e[1] * p.x + e[5] * p.y + e[9] * p.z + e[13]
      const lz = e[2] * p.x + e[6] * p.y + e[10] * p.z + e[14]
      const d = podSdf(lx, ly, lz)
      if (d < p.r) {
        const h = 0.002
        let nx = podSdf(lx + h, ly, lz) - podSdf(lx - h, ly, lz)
        let ny = podSdf(lx, ly + h, lz) - podSdf(lx, ly - h, lz)
        let nz = podSdf(lx, ly, lz + h) - podSdf(lx, ly, lz - h)
        const nl = Math.hypot(nx, ny, nz) || 1
        nx /= nl
        ny /= nl
        nz /= nl
        const push = p.r - d
        const m = this.m.elements
        const qx = lx + nx * push
        const qy = ly + ny * push
        const qz = lz + nz * push
        p.x = m[0] * qx + m[4] * qy + m[8] * qz + m[12]
        p.y = m[1] * qx + m[5] * qy + m[9] * qz + m[13]
        p.z = m[2] * qx + m[6] * qy + m[10] * qz + m[14]
      }
    }
    if (p.y < FLOOR + p.r) {
      p.y = FLOOR + p.r
      if (p.py < p.y) p.py = p.y
      p.contact = true
    }
    const yc = FLOOR + SWEEP_R
    const zc = WALL + SWEEP_R
    if (p.y < yc && p.z < zc) {
      const dy = p.y - yc
      const dz = p.z - zc
      const d = Math.hypot(dy, dz)
      if (d > SWEEP_R - p.r) {
        const k = (SWEEP_R - p.r) / d
        p.y = yc + dy * k
        p.z = zc + dz * k
        p.contact = true
      }
    } else if (p.z < WALL + p.r) p.z = WALL + p.r
  }

  private selfCollide() {
    const pts = this.pts
    const n = this.n
    for (let i = 0; i < n; i++) {
      const a = pts[i]
      for (let j = i + 1; j < n; j++) {
        if (this.exclude[i * n + j]) continue
        const b = pts[j]
        const rr = a.r + b.r
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dz = b.z - a.z
        const d2 = dx * dx + dy * dy + dz * dz
        if (d2 >= rr * rr || d2 < 1e-12) continue
        const wa = this.isPinned(i) ? 0 : a.w
        const wb = this.isPinned(j) ? 0 : b.w
        const ws = wa + wb
        if (ws === 0) continue
        const d = Math.sqrt(d2)
        const c = (rr - d) / d / ws
        a.x -= dx * c * wa
        a.y -= dy * c * wa
        a.z -= dz * c * wa
        b.x += dx * c * wb
        b.y += dy * c * wb
        b.z += dz * c * wb
      }
    }
  }

  /** World pose of a rigid body, for drawing it. */
  pose(bodyIndex: number, pos: THREE.Vector3, quat: THREE.Quaternion) {
    const b = this.bodies[bodyIndex]
    let cx = 0
    let cy = 0
    let cz = 0
    _r0.set(0, 0, 0)
    b.ids.forEach((i, k) => {
      cx += this.pts[i].x
      cy += this.pts[i].y
      cz += this.pts[i].z
      _r0.add(b.rest[k])
    })
    const n = b.ids.length
    _r0.multiplyScalar(1 / n).applyQuaternion(b.q)
    quat.copy(b.q)
    pos.set(cx / n - _r0.x, cy / n - _r0.y, cz / n - _r0.z)
  }

  /** Nearest particle to a world point (for grabbing). */
  nearest(x: number, y: number, z: number, among?: number[]) {
    let best = -1
    let bd = Infinity
    const ids = among ?? this.pts.map((_, i) => i)
    for (const i of ids) {
      const p = this.pts[i]
      const d = (p.x - x) ** 2 + (p.y - y) ** 2 + (p.z - z) ** 2
      if (d < bd) {
        bd = d
        best = i
      }
    }
    return best
  }
}
