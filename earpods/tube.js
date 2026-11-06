// A cable drawn as a smooth tube through simulated points.
// The centre line is a centripetal Catmull-Rom spline through the points (no overshoot, no cusps);
// the tube's cross-sections are carried along it by parallel transport, so it never twists.
// Buffers are allocated once and rewritten in place every frame.
import * as THREE from 'three'

export class Tube {
  /**
   * @param {number} maxPoints  most control points this tube will ever get
   * @param {number} radius     tube radius
   * @param {number} radial     sides around the tube
   * @param {number} sub        samples per control segment
   */
  constructor(maxPoints, radius, radial = 14, sub = 5) {
    this.max = maxPoints
    this.radius = radius
    this.radial = radial
    this.sub = sub
    const rings = (maxPoints - 1) * sub + 1
    this.rings = rings
    const verts = rings * (radial + 1)
    this.pos = new Float32Array(verts * 3)
    this.nrm = new Float32Array(verts * 3)
    this.centre = new Float32Array(rings * 3)
    this.frameN = new Float32Array(3)
    const idx = []
    for (let r = 0; r < rings - 1; r++)
      for (let k = 0; k < radial; k++) {
        const a = r * (radial + 1) + k
        const b = a + radial + 1
        // counter-clockwise seen from outside, so the tube faces out
        idx.push(a, a + 1, b, b, a + 1, b + 1)
      }
    this.geometry = new THREE.BufferGeometry()
    this.geometry.setIndex(idx)
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage)
    this.nrmAttr = new THREE.BufferAttribute(this.nrm, 3).setUsage(THREE.DynamicDrawUsage)
    this.geometry.setAttribute('position', this.posAttr)
    this.geometry.setAttribute('normal', this.nrmAttr)
    this.cos = new Float32Array(radial + 1)
    this.sin = new Float32Array(radial + 1)
    for (let k = 0; k <= radial; k++) {
      this.cos[k] = Math.cos((k / radial) * Math.PI * 2)
      this.sin[k] = Math.sin((k / radial) * Math.PI * 2)
    }
  }

  /** Rebuild from `count` points stored as x, y, z in `pts`. */
  update(pts, count) {
    const { sub, centre } = this
    // 1. centre line: centripetal Catmull-Rom through the points
    let w = 0
    const P = (i, out) => {
      const j = Math.max(0, Math.min(count - 1, i))
      if (i < 0 || i > count - 1) {
        // reflect past the ends so the spline leaves them in a straight line
        const e = i < 0 ? 0 : count - 1
        const f = i < 0 ? 1 : count - 2
        out[0] = 2 * pts[e * 3] - pts[f * 3]
        out[1] = 2 * pts[e * 3 + 1] - pts[f * 3 + 1]
        out[2] = 2 * pts[e * 3 + 2] - pts[f * 3 + 2]
        return
      }
      out[0] = pts[j * 3]
      out[1] = pts[j * 3 + 1]
      out[2] = pts[j * 3 + 2]
    }
    const p0 = [0, 0, 0], p1 = [0, 0, 0], p2 = [0, 0, 0], p3 = [0, 0, 0]
    const knot = (a, b) => Math.max(1e-4, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])))
    for (let i = 0; i < count - 1; i++) {
      P(i - 1, p0)
      P(i, p1)
      P(i + 1, p2)
      P(i + 2, p3)
      const t0 = 0
      const t1 = t0 + knot(p0, p1)
      const t2 = t1 + knot(p1, p2)
      const t3 = t2 + knot(p2, p3)
      for (let s = 0; s < sub; s++) {
        const t = t1 + ((t2 - t1) * s) / sub
        for (let c = 0; c < 3; c++) {
          const a1 = ((t1 - t) / (t1 - t0)) * p0[c] + ((t - t0) / (t1 - t0)) * p1[c]
          const a2 = ((t2 - t) / (t2 - t1)) * p1[c] + ((t - t1) / (t2 - t1)) * p2[c]
          const a3 = ((t3 - t) / (t3 - t2)) * p2[c] + ((t - t2) / (t3 - t2)) * p3[c]
          const b1 = ((t2 - t) / (t2 - t0)) * a1 + ((t - t0) / (t2 - t0)) * a2
          const b2 = ((t3 - t) / (t3 - t1)) * a2 + ((t - t1) / (t3 - t1)) * a3
          centre[w * 3 + c] = ((t2 - t) / (t2 - t1)) * b1 + ((t - t1) / (t2 - t1)) * b2
        }
        w++
      }
    }
    centre[w * 3] = pts[(count - 1) * 3]
    centre[w * 3 + 1] = pts[(count - 1) * 3 + 1]
    centre[w * 3 + 2] = pts[(count - 1) * 3 + 2]
    w++
    const used = w

    // 2. cross-sections carried along by parallel transport
    const { pos, nrm, radius, radial } = this
    let nx = 0, ny = 0, nz = 0
    for (let r = 0; r < used; r++) {
      const a = Math.max(0, r - 1)
      const b = Math.min(used - 1, r + 1)
      let tx = centre[b * 3] - centre[a * 3]
      let ty = centre[b * 3 + 1] - centre[a * 3 + 1]
      let tz = centre[b * 3 + 2] - centre[a * 3 + 2]
      const tl = Math.hypot(tx, ty, tz) || 1
      tx /= tl
      ty /= tl
      tz /= tl
      if (r === 0) {
        // start from the previous frame's normal if it still works, so the seam doesn't jump
        nx = this.frameN[0]; ny = this.frameN[1]; nz = this.frameN[2]
        if (Math.abs(nx * tx + ny * ty + nz * tz) > 0.9 || nx * nx + ny * ny + nz * nz < 0.5) {
          if (Math.abs(tx) < 0.9) { nx = 0; ny = -tz; nz = ty } else { nx = tz; ny = 0; nz = -tx }
        }
      }
      // remove the tangent component and renormalise
      const d = nx * tx + ny * ty + nz * tz
      nx -= d * tx
      ny -= d * ty
      nz -= d * tz
      const nl = Math.hypot(nx, ny, nz) || 1
      nx /= nl
      ny /= nl
      nz /= nl
      if (r === 0) {
        this.frameN[0] = nx
        this.frameN[1] = ny
        this.frameN[2] = nz
      }
      const bx = ty * nz - tz * ny
      const by = tz * nx - tx * nz
      const bz = tx * ny - ty * nx
      const cx = centre[r * 3], cy = centre[r * 3 + 1], cz = centre[r * 3 + 2]
      for (let k = 0; k <= radial; k++) {
        const ox = nx * this.cos[k] + bx * this.sin[k]
        const oy = ny * this.cos[k] + by * this.sin[k]
        const oz = nz * this.cos[k] + bz * this.sin[k]
        const v = (r * (radial + 1) + k) * 3
        pos[v] = cx + ox * radius
        pos[v + 1] = cy + oy * radius
        pos[v + 2] = cz + oz * radius
        nrm[v] = ox
        nrm[v + 1] = oy
        nrm[v + 2] = oz
      }
    }
    this.geometry.setDrawRange(0, (used - 1) * radial * 6)
    this.posAttr.needsUpdate = true
    this.nrmAttr.needsUpdate = true
  }

  dispose() {
    this.geometry.dispose()
  }
}
