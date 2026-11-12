// A mesh made lighter where it can be: quadric edge collapse (Garland and Heckbert), for the SDF
// meshes. The mesher (core/sdf.js) lays one vertex in every cell the surface passes through, the
// same density over a flat side as round a fine seam: hundreds of thousands of triangles, most of
// them smaller than a pixel. Here every edge whose removal moves the surface less than `tol` (mm,
// root mean square, against the planes of every triangle the kept vertex has taken in) is
// collapsed onto one of its own ends, so every vertex that stays is one the mesher made: on the
// surface, with its exact normal, occlusion and zones. A vertex goes only where the triangles
// left behind draw it as it was: where the normal, the occlusion and the zones they interpolate
// at its place are its own to within a hair (`fit`: a cylinder's side, a sphere's, where a normal
// turns evenly, lose most of their vertices; a dimple, where it does not, keeps them, and a
// highlight slides over it as smoothly as before), and where none of its neighbours' differs
// from its own by more than a little (`maxAngle`, `aoTol`, `zoneTol`: glaze borders keep the
// mesher's own density, and a ring beyond); never where its removal would fold a triangle over,
// or where the mesh round it is not a plain closed surface. Plain JS: it runs in the worker, and
// under Node.

/**
 * mesh: { positions, normals, ao, indices, zone? } (the mesher's); opts: tol (mm), maxAngle (rad,
 * between a vertex's normal and its neighbours'), aoTol, zoneTol (the same for the occlusion and
 * the zones), fit: { angle (rad), ao, zone } (how closely the triangles left must give a removed
 * vertex's own normal, occlusion and zones back). Returns the same shape, lighter.
 */
export function decimate(mesh, opts = {}) {
  const tol2 = (opts.tol ?? 0.003) ** 2
  const cosMax = Math.cos(opts.maxAngle ?? 0.2)
  const aoTol = opts.aoTol ?? 0.04
  const zoneTol = opts.zoneTol ?? 0.03
  const fitCos = Math.cos(opts.fit?.angle ?? 0.005)
  const fitAo = opts.fit?.ao ?? 0.008
  const fitZone = opts.fit?.zone ?? 0.02
  const P = mesh.positions
  const Nr = mesh.normals
  const AO = mesh.ao
  const Z = mesh.zone || null
  const zN = Z ? Z.length / AO.length : 0
  const V = P.length / 3
  const F = mesh.indices.length / 3
  const idx = new Uint32Array(mesh.indices)

  // ---- every vertex's corners, as a linked list (a corner: face * 3 + which)
  const head = new Int32Array(V).fill(-1)
  const next = new Int32Array(F * 3)
  const faceDead = new Uint8Array(F)
  for (let c = F * 3 - 1; c >= 0; c--) {
    const v = idx[c]
    next[c] = head[v]
    head[v] = c
  }
  const dead = new Uint8Array(V)
  const ver = new Int32Array(V)

  // ---- quadrics (the planes of each vertex's triangles, weighted by area) and their weights
  const Q = new Float64Array(V * 10)
  const Wt = new Float64Array(V)
  for (let f = 0; f < F; f++) {
    const a = idx[f * 3] * 3
    const b = idx[f * 3 + 1] * 3
    const c = idx[f * 3 + 2] * 3
    const ux = P[b] - P[a]
    const uy = P[b + 1] - P[a + 1]
    const uz = P[b + 2] - P[a + 2]
    const vx = P[c] - P[a]
    const vy = P[c + 1] - P[a + 1]
    const vz = P[c + 2] - P[a + 2]
    let nx = uy * vz - uz * vy
    let ny = uz * vx - ux * vz
    let nz = ux * vy - uy * vx
    const l = Math.sqrt(nx * nx + ny * ny + nz * nz)
    if (l < 1e-12) continue
    nx /= l
    ny /= l
    nz /= l
    const w = l * 0.5
    const d = -(nx * P[a] + ny * P[a + 1] + nz * P[a + 2])
    for (let k = 0; k < 3; k++) {
      const q = idx[f * 3 + k] * 10
      Q[q] += w * nx * nx
      Q[q + 1] += w * nx * ny
      Q[q + 2] += w * nx * nz
      Q[q + 3] += w * nx * d
      Q[q + 4] += w * ny * ny
      Q[q + 5] += w * ny * nz
      Q[q + 6] += w * ny * d
      Q[q + 7] += w * nz * nz
      Q[q + 8] += w * nz * d
      Q[q + 9] += w * d * d
      Wt[idx[f * 3 + k]] += w
    }
  }
  /** The mean squared distance from vertex k's place to the planes of u and k together. */
  function cost(u, k) {
    const a = u * 10
    const b = k * 10
    const x = P[k * 3]
    const y = P[k * 3 + 1]
    const z = P[k * 3 + 2]
    const e =
      (Q[a] + Q[b]) * x * x +
      2 * (Q[a + 1] + Q[b + 1]) * x * y +
      2 * (Q[a + 2] + Q[b + 2]) * x * z +
      2 * (Q[a + 3] + Q[b + 3]) * x +
      (Q[a + 4] + Q[b + 4]) * y * y +
      2 * (Q[a + 5] + Q[b + 5]) * y * z +
      2 * (Q[a + 6] + Q[b + 6]) * y +
      (Q[a + 7] + Q[b + 7]) * z * z +
      2 * (Q[a + 8] + Q[b + 8]) * z +
      (Q[a + 9] + Q[b + 9])
    return Math.max(0, e) / (Wt[u] + Wt[k])
  }
  /** May u be folded into k at all (their shading and zones alike)? */
  function alike(u, k) {
    if (Nr[u * 3] * Nr[k * 3] + Nr[u * 3 + 1] * Nr[k * 3 + 1] + Nr[u * 3 + 2] * Nr[k * 3 + 2] < cosMax) return false
    if (Math.abs(AO[u] - AO[k]) > aoTol) return false
    for (let i = 0; i < zN; i++) if (Math.abs(Z[u * zN + i] - Z[k * zN + i]) > zoneTol) return false
    return true
  }

  // ---- the heap of candidate collapses (u folded into k), cheapest first; an entry is stale once
  // either end has changed since it was made
  let cap = 1 << 20
  let hCost = new Float32Array(cap) // (the heap itself: each slot's cost and its candidate)
  let hU = new Int32Array(cap)
  let hK = new Int32Array(cap)
  let hVer = new Int32Array(cap)
  let nH = 0
  function grow() {
    cap *= 2
    const g = (A, n) => {
      const B = new A(cap)
      B.set(n)
      return B
    }
    hCost = g(Float32Array, hCost)
    hU = g(Int32Array, hU)
    hK = g(Int32Array, hK)
    hVer = g(Int32Array, hVer)
  }
  function push(u, k, c) {
    if (nH === cap) grow()
    let i = nH++
    while (i > 0) {
      const p = (i - 1) >> 1
      if (hCost[p] <= c) break
      hCost[i] = hCost[p]
      hU[i] = hU[p]
      hK[i] = hK[p]
      hVer[i] = hVer[p]
      i = p
    }
    hCost[i] = c
    hU[i] = u
    hK[i] = k
    hVer[i] = ver[u] + ver[k]
  }
  let topU = 0
  let topK = 0
  let topVer = 0
  /** The cheapest candidate, taken off (into topU, topK, topVer). */
  function pop() {
    topU = hU[0]
    topK = hK[0]
    topVer = hVer[0]
    const n = --nH
    const c = hCost[n]
    const u = hU[n]
    const k = hK[n]
    const v = hVer[n]
    let i = 0
    for (;;) {
      let l = 2 * i + 1
      if (l >= n) break
      if (l + 1 < n && hCost[l + 1] < hCost[l]) l++
      if (hCost[l] >= c) break
      hCost[i] = hCost[l]
      hU[i] = hU[l]
      hK[i] = hK[l]
      hVer[i] = hVer[l]
      i = l
    }
    hCost[i] = c
    hU[i] = u
    hK[i] = k
    hVer[i] = v
  }
  /** The better way to collapse the edge a-b, offered if it is within the tolerance. */
  function offer(a, b) {
    if (!alike(a, b)) return
    const ca = cost(a, b)
    const cb = cost(b, a)
    if (ca <= cb) {
      if (ca <= tol2) push(a, b, ca)
    } else if (cb <= tol2) push(b, a, cb)
  }
  for (let f = 0; f < F; f++) {
    const a = idx[f * 3]
    const b = idx[f * 3 + 1]
    const c = idx[f * 3 + 2]
    // (each edge once: a closed surface has it in two triangles, in opposite directions)
    if (a < b) offer(a, b)
    if (b < c) offer(b, c)
    if (c < a) offer(c, a)
  }

  // ---- collapsing
  const mark = new Int32Array(V) // (a stamp per vertex: the neighbours of the kept end)
  let stamp = 0
  /** Is folding u into k sound: a plain surface round the edge, and no triangle folded over? */
  function sound(u, k) {
    // the neighbours of k, stamped; the faces on the edge counted
    stamp++
    let shared = 0
    for (let c = head[k]; c >= 0; c = next[c]) {
      const f = (c / 3) | 0
      if (faceDead[f]) continue
      const a = idx[f * 3]
      const b = idx[f * 3 + 1]
      const d = idx[f * 3 + 2]
      if (a === u || b === u || d === u) shared++
      mark[a] = stamp
      mark[b] = stamp
      mark[d] = stamp
    }
    if (shared !== 2) return false
    // the neighbours u and k have in common: exactly the two across the edge (each counted once)
    let common = 0
    let fits = false
    const s2 = ++stamp
    const kx = P[k * 3]
    const ky = P[k * 3 + 1]
    const kz = P[k * 3 + 2]
    for (let c = head[u]; c >= 0; c = next[c]) {
      const f = (c / 3) | 0
      if (faceDead[f]) continue
      const a = idx[f * 3]
      const b = idx[f * 3 + 1]
      const d = idx[f * 3 + 2]
      for (let i = 0; i < 3; i++) {
        const w = i === 0 ? a : i === 1 ? b : d
        if (w === u) continue
        // (every neighbour of u shaded and glazed as u is: the triangles left behind span them)
        if (!alike(u, w)) return false
        if (w === k) continue
        if (mark[w] === s2 - 1) {
          common++
          mark[w] = s2
        }
      }
      if (a === k || b === k || d === k) continue
      // this triangle stays, with u moved to k: it must not turn over, nor shrink to a sliver
      // (its other two corners, in the triangle's own order)
      const p1 = (a === u ? b : b === u ? d : a) * 3
      const p2 = (a === u ? d : b === u ? a : b) * 3
      const ex = P[p2] - P[p1]
      const ey = P[p2 + 1] - P[p1 + 1]
      const ez = P[p2 + 2] - P[p1 + 2]
      const ox = P[u * 3] - P[p1]
      const oy = P[u * 3 + 1] - P[p1 + 1]
      const oz = P[u * 3 + 2] - P[p1 + 2]
      const nx = kx - P[p1]
      const ny = ky - P[p1 + 1]
      const nz = kz - P[p1 + 2]
      // (normals of the triangle before and after: edge x (apex - p1))
      const ax = ey * oz - ez * oy
      const ay = ez * ox - ex * oz
      const az = ex * oy - ey * ox
      const bx = ey * nz - ez * ny
      const by = ez * nx - ex * nz
      const bz = ex * ny - ey * nx
      const la = Math.sqrt(ax * ax + ay * ay + az * az)
      const lb = Math.sqrt(bx * bx + by * by + bz * bz)
      if (lb < 1e-9) return false
      if (ax * bx + ay * by + az * bz < 0.5 * la * lb) return false
      // (and it still faces the way the surface does at k)
      if (bx * Nr[k * 3] + by * Nr[k * 3 + 1] + bz * Nr[k * 3 + 2] < 0.3 * lb) return false
      // (no needle: its height over the kept edge at least a tenth of that edge)
      const e2 = ex * ex + ey * ey + ez * ez
      if (lb * lb < 0.01 * e2 * e2) return false
      // where u was, this triangle (p1, p2, k) now is, if u's place falls inside it: what it
      // interpolates there must be u's own normal, occlusion and zones
      if (fits) continue
      const d11 = nx * nx + ny * ny + nz * nz
      const d01 = ex * nx + ey * ny + ez * nz
      const d20 = ox * ex + oy * ey + oz * ez
      const d21 = ox * nx + oy * ny + oz * nz
      const den = e2 * d11 - d01 * d01
      if (den < 1e-18) continue
      const b2 = (d11 * d20 - d01 * d21) / den // (p2's share)
      const bk = (e2 * d21 - d01 * d20) / den // (k's)
      const b1 = 1 - b2 - bk
      if (b1 < -0.02 || b2 < -0.02 || bk < -0.02) continue
      const ix = b1 * Nr[p1] + b2 * Nr[p2] + bk * Nr[k * 3]
      const iy = b1 * Nr[p1 + 1] + b2 * Nr[p2 + 1] + bk * Nr[k * 3 + 1]
      const iz = b1 * Nr[p1 + 2] + b2 * Nr[p2 + 2] + bk * Nr[k * 3 + 2]
      const il = Math.sqrt(ix * ix + iy * iy + iz * iz)
      if (ix * Nr[u * 3] + iy * Nr[u * 3 + 1] + iz * Nr[u * 3 + 2] < fitCos * il) return false
      const v1 = p1 / 3
      const v2 = p2 / 3
      if (Math.abs(b1 * AO[v1] + b2 * AO[v2] + bk * AO[k] - AO[u]) > fitAo) return false
      for (let i = 0; i < zN; i++) if (Math.abs(b1 * Z[v1 * zN + i] + b2 * Z[v2 * zN + i] + bk * Z[k * zN + i] - Z[u * zN + i]) > fitZone) return false
      fits = true
    }
    return fits && common === 2
  }
  let left = V
  while (nH > 0) {
    pop()
    const u = topU
    const k = topK
    if (dead[u] || dead[k] || topVer !== ver[u] + ver[k]) continue
    if (!sound(u, k)) continue
    // u's triangles: those on the edge go, the rest take k for u; u's corners join k's list
    let tail = -1
    for (let c = head[u]; c >= 0; c = next[c]) {
      const f = (c / 3) | 0
      tail = c
      if (faceDead[f]) continue
      if (idx[f * 3] === k || idx[f * 3 + 1] === k || idx[f * 3 + 2] === k) faceDead[f] = 1
      else idx[c] = k
    }
    next[tail] = head[k]
    head[k] = head[u]
    head[u] = -1
    dead[u] = 1
    left--
    for (let i = 0; i < 10; i++) Q[k * 10 + i] += Q[u * 10 + i]
    Wt[k] += Wt[u]
    ver[k]++
    // k's list, cleared of dead corners, and its edges offered again
    let prev = -1
    stamp++
    for (let c = head[k]; c >= 0; c = next[c]) {
      const f = (c / 3) | 0
      if (faceDead[f]) {
        if (prev < 0) head[k] = next[c]
        else next[prev] = next[c]
        continue
      }
      prev = c
      for (let i = 0; i < 3; i++) {
        const w = idx[f * 3 + i]
        if (w === k || mark[w] === stamp) continue
        mark[w] = stamp
        offer(w, k)
      }
    }
  }

  // ---- what is left, packed
  const remap = new Int32Array(V).fill(-1)
  let nV = 0
  let nF = 0
  for (let f = 0; f < F; f++) {
    if (faceDead[f]) continue
    nF++
    for (let i = 0; i < 3; i++) {
      const v = idx[f * 3 + i]
      if (remap[v] < 0) remap[v] = nV++
    }
  }
  const positions = new Float32Array(nV * 3)
  const normals = new Float32Array(nV * 3)
  const ao = new Float32Array(nV)
  const zone = Z ? new Float32Array(nV * zN) : null
  for (let v = 0; v < V; v++) {
    const r = remap[v]
    if (r < 0) continue
    positions[r * 3] = P[v * 3]
    positions[r * 3 + 1] = P[v * 3 + 1]
    positions[r * 3 + 2] = P[v * 3 + 2]
    normals[r * 3] = Nr[v * 3]
    normals[r * 3 + 1] = Nr[v * 3 + 1]
    normals[r * 3 + 2] = Nr[v * 3 + 2]
    ao[r] = AO[v]
    for (let i = 0; i < zN; i++) zone[r * zN + i] = Z[v * zN + i]
  }
  const indices = nV > 65535 ? new Uint32Array(nF * 3) : new Uint16Array(nF * 3)
  let o = 0
  for (let f = 0; f < F; f++) {
    if (faceDead[f]) continue
    indices[o++] = remap[idx[f * 3]]
    indices[o++] = remap[idx[f * 3 + 1]]
    indices[o++] = remap[idx[f * 3 + 2]]
  }
  const out = { positions, normals, ao, indices }
  if (zone) out.zone = zone
  return out
}
