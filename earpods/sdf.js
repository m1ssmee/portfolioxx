// Signed distance functions and a mesher.
//
// Every solid part of the earphones (earbuds, remote, splitter, plug housing) is described as a
// signed distance function: negative inside, positive outside, in centimetres. smin/smax blend
// shapes with smooth fillets, which is what gives the parts their moulded-plastic look.
// meshSDF turns a function into a triangle mesh with surface nets, then snaps every vertex onto
// the true surface, takes normals from the field's gradient (so shading is smooth regardless of
// tessellation) and bakes ambient occlusion from the field into a per-vertex value.
// No three.js here, so it also runs under Node for tests.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
// Math.hypot is several times slower than a plain square root in V8, and these run millions of times
export const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z)
export const len2 = (x, y) => Math.sqrt(x * x + y * y)

/** Smooth minimum (union) with blend radius k. */
export function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

/** Smooth maximum (intersection, or subtraction with -b). */
export function smax(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.max(a, b) + h * h * k * 0.25
}

/** Ellipsoid (a close bound, not exact). */
export function sdEllipsoid(x, y, z, rx, ry, rz) {
  const k0 = len3(x / rx, y / ry, z / rz)
  const k1 = len3(x / (rx * rx), y / (ry * ry), z / (rz * rz))
  return k1 > 0 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz)
}

/** Cone with rounded ends between points a (radius r1) and b (radius r2). */
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

/** Capsule between a and b with radius r. */
export function sdCapsule(px, py, pz, ax, ay, az, bx, by, bz, r) {
  const pax = px - ax
  const pay = py - ay
  const paz = pz - az
  const bax = bx - ax
  const bay = by - ay
  const baz = bz - az
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1)
  return len3(pax - bax * h, pay - bay * h, paz - baz * h) - r
}

/** Box with half-size (bx, by, bz) and rounded edges of radius r. */
export function sdRoundBox(px, py, pz, bx, by, bz, r) {
  const qx = Math.abs(px) - bx + r
  const qy = Math.abs(py) - by + r
  const qz = Math.abs(pz) - bz + r
  return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r
}

/** 2D rounded rectangle with half-size (hx, hy) and corner radius r. */
export function sdRoundRect2(x, y, hx, hy, r) {
  const qx = Math.abs(x) - hx + r
  const qy = Math.abs(y) - hy + r
  return len2(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

/** A frame (origin, unit u, v, n) for placing 2D features on a face. */
export function frame(ox, oy, oz, nx, ny, nz, upx, upy, upz) {
  let l = Math.hypot(nx, ny, nz)
  nx /= l
  ny /= l
  nz /= l
  // u = up x n, v = n x u
  let ux = upy * nz - upz * ny
  let uy = upz * nx - upx * nz
  let uz = upx * ny - upy * nx
  l = Math.hypot(ux, uy, uz)
  ux /= l
  uy /= l
  uz /= l
  const vx = ny * uz - nz * uy
  const vy = nz * ux - nx * uz
  const vz = nx * uy - ny * ux
  return { o: [ox, oy, oz], u: [ux, uy, uz], v: [vx, vy, vz], n: [nx, ny, nz] }
}

/** Coordinates of a point in a frame: [u, v, n]. */
export function toFrame(f, x, y, z) {
  const dx = x - f.o[0]
  const dy = y - f.o[1]
  const dz = z - f.o[2]
  return [
    dx * f.u[0] + dy * f.u[1] + dz * f.u[2],
    dx * f.v[0] + dy * f.v[1] + dz * f.v[2],
    dx * f.n[0] + dy * f.n[1] + dz * f.n[2],
  ]
}

// ------------------------------------------------------------------ mesher

/**
 * Mesh the zero set of `sdf` inside `bounds` = [x0, y0, z0, x1, y1, z1] with cell size `h`.
 * Returns { positions, normals, ao, indices } as typed arrays.
 */
export function meshSDF(sdf, bounds, h, opts = {}) {
  const [x0, y0, z0, x1, y1, z1] = bounds
  const nx = Math.ceil((x1 - x0) / h) + 1
  const ny = Math.ceil((y1 - y0) / h) + 1
  const nz = Math.ceil((z1 - z0) / h) + 1
  const sx = nx
  const sxy = nx * ny
  const field = new Float32Array(nx * ny * nz)

  // 1. sample the field; only blocks near the surface are sampled point by point
  const B = 4
  const reach = Math.sqrt(3) * B * h * 0.5 * 1.8 + h
  const near = []
  for (let k = 0; k < nz; k += B)
    for (let j = 0; j < ny; j += B)
      for (let i = 0; i < nx; i += B) {
        const i1 = Math.min(i + B, nx - 1)
        const j1 = Math.min(j + B, ny - 1)
        const k1 = Math.min(k + B, nz - 1)
        const d = sdf(x0 + ((i + i1) / 2) * h, y0 + ((j + j1) / 2) * h, z0 + ((k + k1) / 2) * h)
        if (Math.abs(d) > reach) {
          for (let kk = k; kk <= k1; kk++)
            for (let jj = j; jj <= j1; jj++) {
              const row = jj * sx + kk * sxy
              for (let ii = i; ii <= i1; ii++) field[row + ii] = d
            }
        } else near.push(i, j, k, i1, j1, k1)
      }
  for (let b = 0; b < near.length; b += 6) {
    const [i, j, k, i1, j1, k1] = near.slice(b, b + 6)
    for (let kk = k; kk <= k1; kk++)
      for (let jj = j; jj <= j1; jj++) {
        const row = jj * sx + kk * sxy
        const y = y0 + jj * h
        const z = z0 + kk * h
        for (let ii = i; ii <= i1; ii++) field[row + ii] = sdf(x0 + ii * h, y, z)
      }
  }

  // 2. one vertex per cell the surface passes through (surface nets)
  const cx = nx - 1
  const cy = ny - 1
  const cz = nz - 1
  const cellVert = new Int32Array(cx * cy * cz).fill(-1)
  const pos = []
  const corner = [0, 1, sx, sx + 1, sxy, sxy + 1, sxy + sx, sxy + sx + 1]
  const cOff = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
  ]
  const edges = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7],
    [0, 2],
    [1, 3],
    [4, 6],
    [5, 7],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ]
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
        for (const [a, b] of edges) {
          const ia = v[a] < 0
          if (ia === v[b] < 0) continue
          const t = v[a] / (v[a] - v[b])
          ax += cOff[a][0] + (cOff[b][0] - cOff[a][0]) * t
          ay += cOff[a][1] + (cOff[b][1] - cOff[a][1]) * t
          az += cOff[a][2] + (cOff[b][2] - cOff[a][2]) * t
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
    if (flip) idx.push(a, c, b, a, d, c)
    else idx.push(a, b, c, a, c, d)
  }
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const p = i + j * sx + k * sxy
        const inside = field[p] < 0
        // the four cells around each edge must all exist
        if (i < cx && j > 0 && k > 0 && j < cy && k < cz && inside !== field[p + 1] < 0)
          quad(cell(i, j - 1, k - 1), cell(i, j, k - 1), cell(i, j, k), cell(i, j - 1, k), !inside)
        if (j < cy && i > 0 && k > 0 && i < cx && k < cz && inside !== field[p + sx] < 0)
          quad(cell(i - 1, j, k - 1), cell(i - 1, j, k), cell(i, j, k), cell(i, j, k - 1), !inside)
        if (k < cz && i > 0 && j > 0 && i < cx && j < cy && inside !== field[p + sxy] < 0)
          quad(cell(i - 1, j - 1, k), cell(i, j - 1, k), cell(i, j, k), cell(i - 1, j, k), !inside)
      }

  // 4. snap to the surface, normals from the gradient, ambient occlusion from the field
  const count = pos.length / 3
  const positions = new Float32Array(pos)
  const normals = new Float32Array(count * 3)
  const ao = new Float32Array(count)
  const e = h * 0.25
  const aoStep = opts.aoStep ?? 0.05
  const aoStrength = opts.aoStrength ?? 3.2
  // gradient from four samples on a tetrahedron
  const grad = (x, y, z, out) => {
    const a = sdf(x + e, y - e, z - e)
    const b = sdf(x - e, y - e, z + e)
    const c = sdf(x - e, y + e, z - e)
    const d = sdf(x + e, y + e, z + e)
    out[0] = a - b - c + d
    out[1] = -a - b + c + d
    out[2] = -a + b - c + d
    const l = Math.sqrt(out[0] * out[0] + out[1] * out[1] + out[2] * out[2]) || 1
    out[0] /= l
    out[1] /= l
    out[2] /= l
  }
  const g = [0, 0, 0]
  for (let q = 0; q < count; q++) {
    let x = positions[q * 3]
    let y = positions[q * 3 + 1]
    let z = positions[q * 3 + 2]
    for (let it = 0; it < 2; it++) {
      const d = sdf(x, y, z)
      if (Math.abs(d) < 1e-6) break
      grad(x, y, z, g)
      // never move a vertex further than a cell: keeps sharp-ish creases from folding
      const s = clamp(d, -h, h)
      x -= g[0] * s
      y -= g[1] * s
      z -= g[2] * s
    }
    grad(x, y, z, g)
    positions[q * 3] = x
    positions[q * 3 + 1] = y
    positions[q * 3 + 2] = z
    normals[q * 3] = g[0]
    normals[q * 3 + 1] = g[1]
    normals[q * 3 + 2] = g[2]
    let occ = 0
    let w = 0.5
    for (let s = 1; s <= 5; s++) {
      const dd = aoStep * s
      occ += (dd - Math.max(sdf(x + g[0] * dd, y + g[1] * dd, z + g[2] * dd), 0)) * w
      w *= 0.5
    }
    ao[q] = clamp(1 - aoStrength * occ, 0, 1)
  }
  return { positions, normals, ao, indices: count > 65535 ? new Uint32Array(idx) : new Uint16Array(idx) }
}

/** Find where a ray from (o) along unit (d) first meets the surface (sphere tracing). */
export function raycastSDF(sdf, ox, oy, oz, dx, dy, dz, maxT = 10) {
  let t = 0
  for (let i = 0; i < 200 && t < maxT; i++) {
    const d = sdf(ox + dx * t, oy + dy * t, oz + dz * t)
    if (d < 1e-5) return [ox + dx * t, oy + dy * t, oz + dz * t]
    t += d * 0.9
  }
  return null
}
