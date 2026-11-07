// Signed distance helpers and the surface-nets mesher (shared with the earbuds viewer).
// Units: millimetres. Plain JS (no three.js): it runs in a worker and in Node.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
export const len2 = (x, y) => Math.sqrt(x * x + y * y)
export const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z)
export const norm = (x, y, z) => {
  const l = len3(x, y, z)
  return [x / l, y / l, z / l]
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** Smooth union and intersection with blend radius k (polynomial). */
export function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}
export function smax(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.max(a, b) + h * h * k * 0.25
}

export function sdEllipsoid(x, y, z, rx, ry, rz) {
  const k0 = len3(x / rx, y / ry, z / rz)
  const k1 = len3(x / (rx * rx), y / (ry * ry), z / (rz * rz))
  return k1 > 0 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz)
}
export function sdEllipse2(x, y, a, b) {
  const k0 = len2(x / a, y / b)
  const k1 = len2(x / (a * a), y / (b * b))
  return k1 > 0 ? (k0 * (k0 - 1)) / k1 : -Math.min(a, b)
}
export function sdRoundRect2(x, y, hx, hy, r) {
  const qx = Math.abs(x) - hx + r
  const qy = Math.abs(y) - hy + r
  return len2(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}
/** A 2D cross-section distance `dx` extruded over |axial| <= ... : combines two distances with a rounded edge. */
export function roundExtrude(dx, dy, r) {
  const ax = dx + r
  const ay = dy + r
  return Math.min(Math.max(ax, ay), 0) + len2(Math.max(ax, 0), Math.max(ay, 0)) - r
}

/** Cone with rounded ends from a (radius r1) to b (radius r2), Inigo Quilez's exact form. */
export function sdRoundCone(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax
  const bay = by - ay
  const baz = bz - az
  const l2 = bax * bax + bay * bay + baz * baz
  const rr = r1 - r2
  const a2 = l2 - rr * rr
  const il2 = 1 / l2
  const pax = px - ax
  const pay = py - ay
  const paz = pz - az
  const y = pax * bax + pay * bay + paz * baz
  const z = y - l2
  const qx = pax * l2 - bax * y
  const qy = pay * l2 - bay * y
  const qz = paz * l2 - baz * y
  const x2 = qx * qx + qy * qy + qz * qz
  const y2 = y * y * l2
  const z2 = z * z * l2
  const k = Math.sign(rr) * rr * rr * x2
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1
}

export function meshSDF(sdf, bounds, h, opts = {}) {
  const [x0, y0, z0, x1, y1, z1] = bounds
  const nx = Math.ceil((x1 - x0) / h) + 1
  const ny = Math.ceil((y1 - y0) / h) + 1
  const nz = Math.ceil((z1 - z0) / h) + 1
  const sx = nx
  const sxy = nx * ny
  const field = new Float32Array(nx * ny * nz)

  // 1. sample the field; only blocks near the surface are sampled point by point
  const Bk = 4
  const reach = Math.sqrt(3) * Bk * h * 0.5 * 1.6 + h
  const near = []
  for (let k = 0; k < nz; k += Bk)
    for (let j = 0; j < ny; j += Bk)
      for (let i = 0; i < nx; i += Bk) {
        const i1 = Math.min(i + Bk, nx - 1)
        const j1 = Math.min(j + Bk, ny - 1)
        const k1 = Math.min(k + Bk, nz - 1)
        const dd = sdf(x0 + ((i + i1) / 2) * h, y0 + ((j + j1) / 2) * h, z0 + ((k + k1) / 2) * h)
        if (Math.abs(dd) > reach) {
          for (let kk = k; kk <= k1; kk++)
            for (let jj = j; jj <= j1; jj++) {
              const row = jj * sx + kk * sxy
              for (let ii = i; ii <= i1; ii++) field[row + ii] = dd
            }
        } else near.push(i, j, k, i1, j1, k1)
      }
  for (let b = 0; b < near.length; b += 6) {
    const i = near[b]
    const j = near[b + 1]
    const k = near[b + 2]
    const i1 = near[b + 3]
    const j1 = near[b + 4]
    const k1 = near[b + 5]
    for (let kk = k; kk <= k1; kk++)
      for (let jj = j; jj <= j1; jj++) {
        const row = jj * sx + kk * sxy
        const yy = y0 + jj * h
        const zz = z0 + kk * h
        for (let ii = i; ii <= i1; ii++) field[row + ii] = sdf(x0 + ii * h, yy, zz)
      }
  }

  // 2. one vertex per cell the surface passes through
  const cx = nx - 1
  const cy = ny - 1
  const cz = nz - 1
  const cellVert = new Int32Array(cx * cy * cz).fill(-1)
  const pos = []
  const corner = [0, 1, sx, sx + 1, sxy, sxy + 1, sxy + sx, sxy + sx + 1]
  const cOff = [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1]
  const edges = [0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 1, 3, 4, 6, 5, 7, 0, 4, 1, 5, 2, 6, 3, 7]
  const v = new Float64Array(8)
  for (let k = 0; k < cz; k++)
    for (let j = 0; j < cy; j++)
      for (let i = 0; i < cx; i++) {
        const base = i + j * sx + k * sxy
        let mask = 0
        for (let c = 0; c < 8; c++) {
          v[c] = field[base + corner[c]]
          if (v[c] < 0) mask |= 1 << c
        }
        if (mask === 0 || mask === 255) continue
        let ax = 0
        let ay = 0
        let az = 0
        let n = 0
        for (let e = 0; e < 24; e += 2) {
          const a = edges[e]
          const b = edges[e + 1]
          if (v[a] < 0 === v[b] < 0) continue
          const t = v[a] / (v[a] - v[b])
          ax += cOff[a * 3] + (cOff[b * 3] - cOff[a * 3]) * t
          ay += cOff[a * 3 + 1] + (cOff[b * 3 + 1] - cOff[a * 3 + 1]) * t
          az += cOff[a * 3 + 2] + (cOff[b * 3 + 2] - cOff[a * 3 + 2]) * t
          n++
        }
        cellVert[i + j * cx + k * cx * cy] = pos.length / 3
        pos.push(x0 + (i + ax / n) * h, y0 + (j + ay / n) * h, z0 + (k + az / n) * h)
      }

  // 3. a quad across every grid edge the surface crosses
  const idx = []
  const cell = (i, j, k) => cellVert[i + j * cx + k * cx * cy]
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return
    // split along the shorter diagonal
    if (flip) idx.push(a, c, b, a, d, c)
    else idx.push(a, b, c, a, c, d)
  }
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const p = i + j * sx + k * sxy
        const inside = field[p] < 0
        if (i < cx && j > 0 && k > 0 && j < cy && k < cz && inside !== field[p + 1] < 0)
          quad(cell(i, j - 1, k - 1), cell(i, j, k - 1), cell(i, j, k), cell(i, j - 1, k), !inside)
        if (j < cy && i > 0 && k > 0 && i < cx && k < cz && inside !== field[p + sx] < 0)
          quad(cell(i - 1, j, k - 1), cell(i - 1, j, k), cell(i, j, k), cell(i, j, k - 1), !inside)
        if (k < cz && i > 0 && j > 0 && i < cx && j < cy && inside !== field[p + sxy] < 0)
          quad(cell(i - 1, j - 1, k), cell(i, j - 1, k), cell(i, j, k), cell(i - 1, j, k), !inside)
      }

  // 4. onto the surface; normals from the gradient; occlusion from the field
  const count = pos.length / 3
  const positions = new Float32Array(pos)
  const normals = new Float32Array(count * 3)
  const ao = new Float32Array(count)
  const e = h * 0.2
  const aoStep = opts.aoStep ?? 0.35
  const aoStrength = opts.aoStrength ?? 0.55
  const g = [0, 0, 0]
  const grad = (x, y, z) => {
    const a = sdf(x + e, y - e, z - e)
    const b = sdf(x - e, y - e, z + e)
    const c = sdf(x - e, y + e, z - e)
    const d = sdf(x + e, y + e, z + e)
    g[0] = a - b - c + d
    g[1] = -a - b + c + d
    g[2] = -a + b - c + d
    const l = Math.sqrt(g[0] * g[0] + g[1] * g[1] + g[2] * g[2]) || 1
    g[0] /= l
    g[1] /= l
    g[2] /= l
  }
  for (let q = 0; q < count; q++) {
    let x = positions[q * 3]
    let y = positions[q * 3 + 1]
    let z = positions[q * 3 + 2]
    for (let it = 0; it < 3; it++) {
      const dd = sdf(x, y, z)
      if (Math.abs(dd) < 1e-5) break
      grad(x, y, z)
      const s = clamp(dd, -h, h)
      x -= g[0] * s
      y -= g[1] * s
      z -= g[2] * s
    }
    grad(x, y, z)
    positions[q * 3] = x
    positions[q * 3 + 1] = y
    positions[q * 3 + 2] = z
    normals[q * 3] = g[0]
    normals[q * 3 + 1] = g[1]
    normals[q * 3 + 2] = g[2]
    let occ = 0
    let wgt = 0.5
    for (let s = 1; s <= 5; s++) {
      const dd = aoStep * s
      occ += ((dd - Math.max(sdf(x + g[0] * dd, y + g[1] * dd, z + g[2] * dd), 0)) / dd) * wgt
      wgt *= 0.5
    }
    ao[q] = clamp(1 - aoStrength * occ, 0, 1)
  }
  return { positions, normals, ao, indices: count > 65535 ? new Uint32Array(idx) : new Uint16Array(idx) }
}
