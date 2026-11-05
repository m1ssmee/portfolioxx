// Earphone cable physics: position-based dynamics on a chain of particles.
//  - stretch constraints keep it from stretching, bend constraints give it a cable's stiffness
//  - it collides with the pod, the floor, the curved wall and itself
//  - the plug can be pulled out of the port and clicked back in
import * as THREE from 'three'
import { FLOOR, SWEEP_R, WALL } from './layout'
import { POD, podSdf } from './model'

export const MAIN = 40 // segments from the plug to the splitter
export const BR = 13 // segments from the splitter to each earbud
const MAIN_LEN = 1.5
const BR_LEN = 0.44
const ARM = 0.15 // plug body particle to where the cable leaves the plug
const G = 24 // gravity, units/s²
const DAMP = 0.996
const ITER = 14
const H = 1 / 120

/** Plug geometry relative to the port mouth, in pod units (the plug is a right-angle USB-C). */
export const PLUG = {
  body: new THREE.Vector3(0.085, 0.0375, 0), // the plug-body particle
  exit: new THREE.Vector3(0.085 + ARM, 0.0375, 0), // where the cable starts
}

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

export class Cable {
  pts: Particle[] = []
  stretch: [number, number, number][] = []
  bends: [number, number, number, number][] = []
  built = false
  plugged = true
  insert = 1 // eases 0 → 1 while the plug slides back into the port
  nearPort = false
  drag: { i: number; target: THREE.Vector3 } | null = null

  readonly PLUG = 0
  readonly START = 1
  readonly SPLIT = 1 + MAIN
  readonly BUD_L = 1 + MAIN + BR
  readonly BUD_R = 1 + MAIN + 2 * BR
  readonly REMOTE = 1 + MAIN + BR + 4

  private m = new THREE.Matrix4()
  private inv = new THREE.Matrix4()
  private v = new THREE.Vector3()
  private anchorBody = new THREE.Vector3()
  private anchorExit = new THREE.Vector3()
  private acc = 0

  /** Index lists for drawing: main cable, left branch, right branch. */
  readonly mainIds = Array.from({ length: MAIN + 1 }, (_, i) => 1 + i)
  readonly leftIds = [1 + MAIN, ...Array.from({ length: BR }, (_, j) => 2 + MAIN + j)]
  readonly rightIds = [1 + MAIN, ...Array.from({ length: BR }, (_, j) => 2 + MAIN + BR + j)]

  private add(x: number, y: number, z: number, w: number, r: number) {
    this.pts.push({ x, y, z, px: x, py: y, pz: z, w, r, contact: false })
  }

  /** Lay the cable out in a believable resting shape, then let it settle before anyone sees it. */
  build(pod: THREE.Object3D) {
    pod.updateMatrixWorld()
    this.m.copy(pod.matrixWorld)
    this.inv.copy(this.m).invert()
    this.pts = []
    this.stretch = []
    this.bends = []
    const port = new THREE.Vector3(POD.port.x, POD.H / 2, POD.port.z)
    this.anchorBody.copy(port).add(PLUG.body).applyMatrix4(this.m)
    this.anchorExit.copy(port).add(PLUG.exit).applyMatrix4(this.m)
    const w = (x: number, y: number, z: number) => this.v.set(x, y, z).applyMatrix4(this.m)

    const b = w(port.x + PLUG.body.x, port.y + PLUG.body.y, port.z)
    this.add(b.x, b.y, b.z, 0.4, 0.034)
    // main cable: out of the plug, over the shoulder, down the side, onto the floor
    const way = [
      new THREE.Vector3(port.x + PLUG.exit.x, port.y + PLUG.exit.y, port.z),
      new THREE.Vector3(0.36, 0.52, 0.04),
      new THREE.Vector3(0.37, -0.2, 0.06),
      new THREE.Vector3(0.4, -0.61, 0.16),
      new THREE.Vector3(0.62, -0.61, 0.32),
      new THREE.Vector3(0.3, -0.61, 0.42),
      new THREE.Vector3(0.05, -0.61, 0.36),
    ]
    const seg = MAIN_LEN / MAIN
    const at = (d: number) => {
      for (let i = 0; i < way.length - 1; i++) {
        const l = way[i].distanceTo(way[i + 1])
        if (d <= l) return way[i].clone().lerp(way[i + 1], d / l)
        d -= l
      }
      return way[way.length - 1].clone()
    }
    for (let i = 0; i <= MAIN; i++) {
      const p = at(i * seg)
      const q = w(p.x, p.y, p.z)
      const isSplit = i === MAIN
      this.add(q.x, q.y, q.z, isSplit ? 0.7 : 1, isSplit ? 0.018 : 0.0085)
    }
    const split = this.pts[this.SPLIT]
    const bseg = BR_LEN / BR
    for (const side of [-1, 1]) {
      for (let j = 1; j <= BR; j++) {
        const end = j === BR
        const remote = side === 1 && j === 4
        this.add(
          split.x + side * j * bseg * 0.62,
          split.y + 0.05,
          split.z + (side < 0 ? -0.1 : 0.12) * j * bseg * 3,
          end ? 0.32 : remote ? 0.6 : 1,
          end ? 0.054 : remote ? 0.022 : 0.0085,
        )
      }
    }

    // constraints
    this.stretch.push([this.PLUG, this.START, ARM])
    for (let i = 1; i < 1 + MAIN; i++) this.stretch.push([i, i + 1, seg])
    for (const ids of [this.leftIds, this.rightIds])
      for (let k = 0; k < ids.length - 1; k++) this.stretch.push([ids[k], ids[k + 1], bseg])
    // bending: keep every other particle apart, like a cable that resists kinks
    this.bends.push([this.PLUG, this.START + 1, ARM + seg, 0.6])
    for (let i = 1; i < MAIN; i++) this.bends.push([i, i + 2, seg * 2, 0.14])
    for (const ids of [this.leftIds, this.rightIds])
      for (let k = 0; k < ids.length - 2; k++) this.bends.push([ids[k], ids[k + 2], bseg * 2, 0.12])
    this.bends.push([this.SPLIT - 1, this.leftIds[1], seg + bseg, 0.05])
    this.bends.push([this.SPLIT - 1, this.rightIds[1], seg + bseg, 0.05])

    this.built = true
    // settle (about 4 seconds of simulated time)
    for (let i = 0; i < 480; i++) this.substep(false, 0)
  }

  unplug() {
    this.plugged = false
    this.insert = 0
    const p = this.pts[this.PLUG]
    p.py -= 0.01 // a little upward kick as it pops out
  }

  plugIn() {
    this.plugged = true
    this.insert = 0
  }

  /** Advance by dt seconds (fixed 120 Hz substeps). */
  step(dt: number, pod: THREE.Object3D, gust: number) {
    pod.updateMatrixWorld()
    this.m.copy(pod.matrixWorld)
    this.inv.copy(this.m).invert()
    const port = new THREE.Vector3(POD.port.x, POD.H / 2, POD.port.z)
    this.anchorBody.copy(port).add(PLUG.body).applyMatrix4(this.m)
    this.anchorExit.copy(port).add(PLUG.exit).applyMatrix4(this.m)

    this.acc = Math.min(this.acc + dt, 4 * H)
    let first = true
    while (this.acc >= H) {
      this.substep(true, first ? gust : 0)
      first = false
      this.acc -= H
    }
    if (this.plugged && this.insert < 1) this.insert = Math.min(1, this.insert + dt * 7)

    // is the plug close enough to the port to click in?
    const p = this.pts[this.PLUG]
    this.nearPort =
      !this.plugged && Math.hypot(p.x - this.anchorBody.x, p.y - this.anchorBody.y, p.z - this.anchorBody.z) < 0.14
  }

  private substep(live: boolean, gust: number) {
    const pts = this.pts
    const n = pts.length
    const g = G * H * H
    // integrate
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
      // a scroll flick: shake the hanging part of the cable
      for (let i = 1; i < n; i++) {
        const reach = i <= this.SPLIT ? i / this.SPLIT : 1
        const p = pts[i]
        if (p.contact) continue
        p.x += gust * 0.0016 * reach
        p.z += gust * 0.0007 * reach * Math.sin(i * 0.7)
      }
    }

    for (let it = 0; it < ITER; it++) {
      this.pin(live)
      for (const [a, b, rest] of this.stretch) this.solve(a, b, rest, 1)
      for (const [a, b, rest, k] of this.bends) this.solveMin(a, b, rest, k)
      this.pin(live)
      for (let i = 0; i < n; i++) this.collide(pts[i], i)
    }
    this.selfCollide()
    // friction where things rest on the floor
    for (let i = 0; i < n; i++) {
      const p = pts[i]
      if (!p.contact) continue
      p.px = p.x - (p.x - p.px) * 0.55
      p.pz = p.z - (p.z - p.pz) * 0.55
    }
  }

  private pin(live: boolean) {
    const pts = this.pts
    if (this.plugged || !live) {
      const k = live ? this.insert : 1
      const b = pts[this.PLUG]
      const e = pts[this.START]
      if (k >= 1) {
        b.x = this.anchorBody.x
        b.y = this.anchorBody.y
        b.z = this.anchorBody.z
        e.x = this.anchorExit.x
        e.y = this.anchorExit.y
        e.z = this.anchorExit.z
      } else {
        b.x += (this.anchorBody.x - b.x) * k
        b.y += (this.anchorBody.y - b.y) * k
        b.z += (this.anchorBody.z - b.z) * k
        e.x += (this.anchorExit.x - e.x) * k
        e.y += (this.anchorExit.y - e.y) * k
        e.z += (this.anchorExit.z - e.z) * k
      }
    }
    if (this.drag) {
      const p = pts[this.drag.i]
      p.x = this.drag.target.x
      p.y = this.drag.target.y
      p.z = this.drag.target.z
    }
  }

  private pinned(i: number) {
    if (this.drag && this.drag.i === i) return true
    return this.plugged && (i === this.PLUG || i === this.START)
  }

  private solve(a: number, b: number, rest: number, k: number) {
    const p = this.pts[a]
    const q = this.pts[b]
    const wa = this.pinned(a) ? 0 : p.w
    const wb = this.pinned(b) ? 0 : q.w
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

  /** Only pushes apart (bending resistance), never pulls together. */
  private solveMin(a: number, b: number, rest: number, k: number) {
    const p = this.pts[a]
    const q = this.pts[b]
    const d = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z)
    if (d >= rest) return
    this.solve(a, b, rest, k)
  }

  private collide(p: Particle, i: number) {
    p.contact = false
    if (this.pinned(i)) return
    // the pod (in its own space)
    const e = this.inv.elements
    const lx = e[0] * p.x + e[4] * p.y + e[8] * p.z + e[12]
    const ly = e[1] * p.x + e[5] * p.y + e[9] * p.z + e[13]
    const lz = e[2] * p.x + e[6] * p.y + e[10] * p.z + e[14]
    // the plug sits on the pod, so let it and the first bit of cable through
    if (i > this.START + 1 || !this.plugged) {
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
        // a little grip against the aluminium
        p.px += (p.x - p.px) * 0.15
        p.py += (p.y - p.py) * 0.15
        p.pz += (p.z - p.pz) * 0.15
      }
    }
    // the floor
    if (p.y < FLOOR + p.r) {
      p.y = FLOOR + p.r
      if (p.py < p.y) p.py = p.y
      p.contact = true
    }
    // the wall, and the curve where it meets the floor
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
    } else if (p.z < WALL + p.r) {
      p.z = WALL + p.r
    }
  }

  private selfCollide() {
    const pts = this.pts
    const n = pts.length
    for (let i = 1; i < n; i++) {
      const a = pts[i]
      for (let j = i + 1; j < n; j++) {
        // neighbours along the cable (including across the splitter) are allowed to touch
        if (this.hops(i, j) <= 2) continue
        const b = pts[j]
        const rr = a.r + b.r
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dz = b.z - a.z
        const d2 = dx * dx + dy * dy + dz * dz
        if (d2 >= rr * rr || d2 < 1e-12) continue
        const wa = this.pinned(i) ? 0 : a.w
        const wb = this.pinned(j) ? 0 : b.w
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

  /** Distance between two particles counted along the cable (it branches at the splitter). */
  private hops(i: number, j: number) {
    const S = this.SPLIT
    const branch = (k: number) => (k <= S ? 0 : k <= S + BR ? 1 : 2)
    const along = (k: number) => (k <= S ? k : k <= S + BR ? k : k - BR)
    const bi = branch(i)
    const bj = branch(j)
    if (bi === bj || bi === 0 || bj === 0) {
      if (bi !== 0 && bj !== 0) return Math.abs(along(i) - along(j))
      // one is on the main cable
      return Math.abs(along(i) - along(j))
    }
    return along(i) - S + (along(j) - S)
  }

  /** Nearest particle to a world point (for grabbing the cable anywhere). */
  nearest(x: number, y: number, z: number) {
    let best = -1
    let bd = Infinity
    this.pts.forEach((p, i) => {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2 + (p.z - z) ** 2
      if (d < bd) {
        bd = d
        best = i
      }
    })
    return best
  }
}
