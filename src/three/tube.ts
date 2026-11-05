import * as THREE from 'three'

type V3 = { x: number; y: number; z: number }

/** A tube mesh whose centre line can change every frame without allocating. */
export class Tube {
  geometry = new THREE.BufferGeometry()
  readonly n: number
  readonly radial: number
  private pos: Float32Array
  private nor: Float32Array

  constructor(n: number, radial = 10) {
    this.n = n
    this.radial = radial
    this.pos = new Float32Array(n * radial * 3)
    this.nor = new Float32Array(n * radial * 3)
    const idx: number[] = []
    for (let i = 0; i < n - 1; i++)
      for (let j = 0; j < radial; j++) {
        const a = i * radial + j
        const b = i * radial + ((j + 1) % radial)
        const c = (i + 1) * radial + j
        const d = (i + 1) * radial + ((j + 1) % radial)
        idx.push(a, b, c, b, d, c)
      }
    this.geometry.setIndex(idx)
    const pa = new THREE.BufferAttribute(this.pos, 3)
    pa.setUsage(THREE.DynamicDrawUsage)
    const na = new THREE.BufferAttribute(this.nor, 3)
    na.setUsage(THREE.DynamicDrawUsage)
    this.geometry.setAttribute('position', pa)
    this.geometry.setAttribute('normal', na)
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50)
  }

  /** Rebuild the rings around the given centre line (parallel-transport frames, so no twisting). */
  update(pts: THREE.Vector3[], radius: number) {
    const { n, radial, pos, nor } = this
    let nx = 0
    let ny = 0
    let nz = 0
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)]
      const b = pts[Math.min(n - 1, i + 1)]
      let tx = b.x - a.x
      let ty = b.y - a.y
      let tz = b.z - a.z
      const tl = Math.hypot(tx, ty, tz) || 1
      tx /= tl
      ty /= tl
      tz /= tl
      if (i === 0) {
        // any vector perpendicular to the first tangent
        if (Math.abs(tz) < 0.9) {
          nx = ty
          ny = -tx
          nz = 0
        } else {
          nx = 0
          ny = tz
          nz = -ty
        }
      } else {
        const d = nx * tx + ny * ty + nz * tz
        nx -= d * tx
        ny -= d * ty
        nz -= d * tz
      }
      const nl = Math.hypot(nx, ny, nz) || 1
      nx /= nl
      ny /= nl
      nz /= nl
      // binormal = tangent x normal
      const bx = ty * nz - tz * ny
      const by = tz * nx - tx * nz
      const bz = tx * ny - ty * nx
      const p = pts[i]
      for (let j = 0; j < radial; j++) {
        const th = (j / radial) * Math.PI * 2
        const c = Math.cos(th)
        const s = Math.sin(th)
        const dx = nx * c + bx * s
        const dy = ny * c + by * s
        const dz = nz * c + bz * s
        const k = (i * radial + j) * 3
        pos[k] = p.x + dx * radius
        pos[k + 1] = p.y + dy * radius
        pos[k + 2] = p.z + dz * radius
        nor[k] = dx
        nor[k + 1] = dy
        nor[k + 2] = dz
      }
    }
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.normal.needsUpdate = true
  }
}

/** Uniform Catmull-Rom through src[ids], `per` samples per segment, written into out (length (ids-1)*per+1). */
export function catmull(src: V3[], ids: number[], per: number, out: THREE.Vector3[]) {
  const m = ids.length
  let k = 0
  for (let i = 0; i < m - 1; i++) {
    const p0 = src[ids[Math.max(0, i - 1)]]
    const p1 = src[ids[i]]
    const p2 = src[ids[i + 1]]
    const p3 = src[ids[Math.min(m - 1, i + 2)]]
    for (let s = 0; s < per; s++) {
      const t = s / per
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out[k++].set(f(p0.x, p1.x, p2.x, p3.x), f(p0.y, p1.y, p2.y, p3.y), f(p0.z, p1.z, p2.z, p3.z))
    }
  }
  const last = src[ids[m - 1]]
  out[k].set(last.x, last.y, last.z)
}
