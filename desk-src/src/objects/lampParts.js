// The desk lamp's makings (objects/lamp.js puts them together): a mesh accumulator that keeps, per
// vertex, a baked occlusion (grey) and four zone flags for the shaders; turned profiles, tubes along
// paths, extruded plates with rounded edges, the occlusion of nearby parts baked in, and the small
// tiling texture of fine detail the lamp's materials share. Units mm.
import * as THREE from 'three'
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js'

const w = new THREE.Vector3()
const nm = new THREE.Matrix3()

/**
 * A mesh being built: its pieces (geometries, each through a matrix, with a zone and an occlusion)
 * until flatten() lays them out once as typed arrays: positions, normals, uvs (mm, or turns round a
 * tube), occlusion (grey), zones (four flags a vertex for the shaders), triangles.
 */
export function part() {
  return { items: [], p: null, n: null, uv: null, ao: null, z: null, idx: null }
}

/**
 * Add a three.js geometry to part t, through matrix M. zone: [x, y, z, w] for every vertex (unless
 * the geometry carries its own `zone`); ao: its occlusion (times the geometry's own `ao`); uvk: a
 * scale for its uvs.
 */
export function add(t, g, M, zone = [0, 0, 0, 0], ao = 1, uvk = 1) {
  t.items.push({ g, M: M.clone(), zone, ao, uvk })
}

/** Lay the part's pieces out as typed arrays (once). */
export function flatten(t) {
  if (t.p) return t
  let nv = 0
  let ni = 0
  for (const { g } of t.items) {
    nv += g.attributes.position.count
    ni += g.index ? g.index.count : g.attributes.position.count
  }
  const P = (t.p = new Float32Array(nv * 3))
  const N = (t.n = new Float32Array(nv * 3))
  const U = (t.uv = new Float32Array(nv * 2))
  const AO = (t.ao = new Float32Array(nv))
  const Z = (t.z = new Float32Array(nv * 4))
  const I = (t.idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni))
  let ov = 0
  let oi = 0
  for (const { g, M, zone, ao, uvk } of t.items) {
    const e = M.elements
    const m = nm.getNormalMatrix(M).elements
    const pa = g.attributes.position.array
    const na = g.attributes.normal.array
    const ua = g.attributes.uv?.array
    const aa = g.attributes.ao?.array
    const za = g.attributes.zone?.array
    const n = g.attributes.position.count
    for (let i = 0; i < n; i++) {
      const x = pa[i * 3]
      const y = pa[i * 3 + 1]
      const z = pa[i * 3 + 2]
      const o = (ov + i) * 3
      P[o] = e[0] * x + e[4] * y + e[8] * z + e[12]
      P[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]
      P[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]
      const a = na[i * 3]
      const b = na[i * 3 + 1]
      const c = na[i * 3 + 2]
      const nx = m[0] * a + m[3] * b + m[6] * c
      const ny = m[1] * a + m[4] * b + m[7] * c
      const nz = m[2] * a + m[5] * b + m[8] * c
      const l = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1)
      N[o] = nx * l
      N[o + 1] = ny * l
      N[o + 2] = nz * l
      if (ua) {
        U[(ov + i) * 2] = ua[i * 2] * uvk
        U[(ov + i) * 2 + 1] = ua[i * 2 + 1] * uvk
      }
      AO[ov + i] = aa ? aa[i] * ao : ao
      if (za) for (let k = 0; k < 4; k++) Z[(ov + i) * 4 + k] = za[i * 4 + k]
      else for (let k = 0; k < 4; k++) Z[(ov + i) * 4 + k] = zone[k]
    }
    // (a mirroring matrix turns the triangles over: wind them back)
    const flip = M.determinant() < 0
    const ix = g.index?.array
    const cnt = ix ? ix.length : n
    for (let i = 0; i < cnt; i += 3) {
      const a = ix ? ix[i] : i
      const b = ix ? ix[i + 1] : i + 1
      const c = ix ? ix[i + 2] : i + 2
      I[oi++] = ov + a
      I[oi++] = ov + (flip ? c : b)
      I[oi++] = ov + (flip ? b : c)
    }
    ov += n
    g.dispose()
  }
  t.items.length = 0
  return t
}

/** The part as a BufferGeometry: position, normal, uv, color (the occlusion, grey), aZone. */
export function geometry(t) {
  flatten(t)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(t.p, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(t.n, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(t.uv, 2))
  const c = new Float32Array(t.ao.length * 3)
  for (let i = 0; i < t.ao.length; i++) c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = t.ao[i]
  g.setAttribute('color', new THREE.BufferAttribute(c, 3))
  g.setAttribute('aZone', new THREE.BufferAttribute(t.z, 4))
  g.setIndex(new THREE.BufferAttribute(t.idx, 1))
  g.computeBoundingSphere()
  return g
}

/**
 * Triangles over a grid of rows x cols vertices (row-major), each wound to face its vertices'
 * normals (so the builders need not care which way a profile runs).
 */
function gridIndex(P, N, rows, cols, idx, wrapCols = false) {
  const cw = wrapCols ? cols : cols - 1
  for (let r = 0; r < rows - 1; r++)
    for (let c = 0; c < cw; c++) {
      const c1 = (c + 1) % cols
      const a = r * cols + c
      const b = r * cols + c1
      const d = (r + 1) * cols + c
      const e = (r + 1) * cols + c1
      // (degenerate rows, where a profile closes on its axis, still give one good triangle a quad)
      for (const [i, j, k] of [
        [a, b, d],
        [b, e, d],
      ]) {
        const ux = P[j * 3] - P[i * 3]
        const uy = P[j * 3 + 1] - P[i * 3 + 1]
        const uz = P[j * 3 + 2] - P[i * 3 + 2]
        const vx = P[k * 3] - P[i * 3]
        const vy = P[k * 3 + 1] - P[i * 3 + 1]
        const vz = P[k * 3 + 2] - P[i * 3 + 2]
        const fx = uy * vz - uz * vy
        const fy = uz * vx - ux * vz
        const fz = ux * vy - uy * vx
        if (fx * fx + fy * fy + fz * fz < 1e-12) continue
        const s = fx * (N[i * 3] + N[j * 3] + N[k * 3]) + fy * (N[i * 3 + 1] + N[j * 3 + 1] + N[k * 3 + 1]) + fz * (N[i * 3 + 2] + N[j * 3 + 2] + N[k * 3 + 2])
        if (s >= 0) idx.push(i, j, k)
        else idx.push(i, k, j)
      }
    }
}

/**
 * A turned part about +y: prof is [[r, y, ao?, ...zone?]] in order (the outside on the right of
 * the way it runs); a point given twice is a crease. segs round. uv: (arc at radius uR, length
 * along the profile), mm.
 */
export function lathe(prof, segs = 48, uR = 0) {
  const R = uR || Math.max(...prof.map((q) => q[0]))
  // each point's normal: its two segments' averaged (one only at a crease or an end)
  const nrm = prof.map((q, i) => {
    const seg = (a, b) => {
      if (!a || !b) return null
      const dr = b[0] - a[0]
      const dy = b[1] - a[1]
      const l = Math.hypot(dr, dy)
      return l > 1e-6 ? [dy / l, -dr / l] : null
    }
    const s0 = seg(prof[i - 1], q)
    const s1 = seg(q, prof[i + 1])
    let nr = (s0 ? s0[0] : 0) + (s1 ? s1[0] : 0)
    let ny = (s0 ? s0[1] : 0) + (s1 ? s1[1] : 0)
    // (a crease: the repeated point takes its own side's normal)
    if (prof[i - 1] && !s0) [nr, ny] = s1 || [1, 0]
    else if (prof[i + 1] && !s1) [nr, ny] = s0 || [1, 0]
    const l = Math.hypot(nr, ny) || 1
    return [nr / l, ny / l]
  })
  let len = 0
  const along = prof.map((q, i) => (i ? (len += Math.hypot(q[0] - prof[i - 1][0], q[1] - prof[i - 1][1])) : 0))
  const cols = segs + 1
  const rows = prof.length
  const P = new Float32Array(rows * cols * 3)
  const N = new Float32Array(rows * cols * 3)
  const U = new Float32Array(rows * cols * 2)
  const AO = new Float32Array(rows * cols)
  const Z = new Float32Array(rows * cols * 4)
  for (let r = 0; r < rows; r++) {
    const [rad, y, ao = 1, z0 = 0, z1 = 0, z2 = 0, z3 = 0] = prof[r]
    for (let c = 0; c < cols; c++) {
      const t = (c / segs) * Math.PI * 2
      const cs = Math.cos(t)
      const sn = Math.sin(t)
      const o = r * cols + c
      P[o * 3] = rad * sn
      P[o * 3 + 1] = y
      P[o * 3 + 2] = rad * cs
      N[o * 3] = nrm[r][0] * sn
      N[o * 3 + 1] = nrm[r][1]
      N[o * 3 + 2] = nrm[r][0] * cs
      U[o * 2] = t * R
      U[o * 2 + 1] = along[r]
      AO[o] = ao
      Z[o * 4] = z0
      Z[o * 4 + 1] = z1
      Z[o * 4 + 2] = z2
      Z[o * 4 + 3] = z3
    }
  }
  const idx = []
  gridIndex(P, N, rows, cols, idx)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(P, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(U, 2))
  g.setAttribute('ao', new THREE.BufferAttribute(AO, 1))
  g.setAttribute('zone', new THREE.BufferAttribute(Z, 4))
  g.setIndex(idx)
  return g
}

/**
 * A tube along a path of points (world or local, whatever the caller works in): radius r, `radial`
 * round, frames carried along without twisting. uv: (turns round, mm along). Fills `out` (a
 * geometry made by tubeGeometry, for a tube redrawn in place) or makes one.
 */
export function tube(pts, r, radial = 10, out = null) {
  const n = pts.length
  const cols = radial + 1
  const g = out || tubeGeometry(n, radial)
  const P = g.attributes.position.array
  const N = g.attributes.normal.array
  const U = g.attributes.uv.array
  const T = new THREE.Vector3()
  const Nn = new THREE.Vector3()
  const Bn = new THREE.Vector3()
  const prevT = new THREE.Vector3()
  let len = 0
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(n - 1, i + 1)]
    T.subVectors(b, a).normalize()
    if (i === 0) {
      // (a first normal square to the tangent)
      Nn.set(0, 1, 0)
      if (Math.abs(T.y) > 0.9) Nn.set(1, 0, 0)
      Nn.addScaledVector(T, -Nn.dot(T)).normalize()
    } else {
      // (carried on: turned by the rotation that takes the last tangent to this one)
      len += pts[i].distanceTo(pts[i - 1])
      const ax = w.crossVectors(prevT, T)
      const s = ax.length()
      if (s > 1e-6) Nn.applyAxisAngle(ax.divideScalar(s), Math.atan2(s, prevT.dot(T)))
      Nn.addScaledVector(T, -Nn.dot(T)).normalize()
    }
    prevT.copy(T)
    Bn.crossVectors(T, Nn)
    for (let c = 0; c < cols; c++) {
      const t = (c / radial) * Math.PI * 2
      const cs = Math.cos(t)
      const sn = Math.sin(t)
      const o = i * cols + c
      const nx = Nn.x * cs + Bn.x * sn
      const ny = Nn.y * cs + Bn.y * sn
      const nz = Nn.z * cs + Bn.z * sn
      P[o * 3] = pts[i].x + nx * r
      P[o * 3 + 1] = pts[i].y + ny * r
      P[o * 3 + 2] = pts[i].z + nz * r
      N[o * 3] = nx
      N[o * 3 + 1] = ny
      N[o * 3 + 2] = nz
      U[o * 2] = c / radial
      U[o * 2 + 1] = len
    }
  }
  if (!out) {
    const idx = []
    gridIndex(P, N, n, cols, idx)
    g.setIndex(idx)
  } else {
    g.attributes.position.needsUpdate = true
    g.attributes.normal.needsUpdate = true
    g.attributes.uv.needsUpdate = true
    g.computeBoundingSphere()
  }
  return g
}
/** An empty tube of n rings (for tube(..., out)). */
export function tubeGeometry(n, radial) {
  const cols = radial + 1
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * cols * 3), 3))
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * cols * 3), 3))
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * cols * 2), 2))
  return g
}
/** The same tube's triangles once its first rings are known (a tube redrawn in place keeps them). */
export function tubeIndex(g, n, radial) {
  const idx = []
  gridIndex(g.attributes.position.array, g.attributes.normal.array, n, radial + 1, idx)
  g.setIndex(idx)
}

/** Points from a to b, closer together near the ends (where the occlusion changes fastest). */
export function rodPoints(a, b) {
  const L = a.distanceTo(b)
  const ds = [0, 1.2, 3, 6, 11, 18]
  const at = new Set()
  for (const d of ds) if (d < L / 2) at.add(d).add(L - d)
  for (let d = 30; d < L - 30; d += 40) at.add(d)
  at.add(L / 2)
  return [...at].sort((x, y) => x - y).map((d) => a.clone().lerp(b, d / L))
}

/**
 * A flat plate with rounded edges: the convex hull of circles [[x, y, r]] (and points [[x, y]]),
 * thickness th along +z from z = 0, its edges rounded `bevel`. Smooth over the rounding, creased
 * at the faces.
 */
export function plate(circles, th, bevel = 0.6, points = []) {
  const pts = [...points]
  for (const [x, y, r] of circles) for (let k = 0; k < 20; k++) pts.push([x + r * Math.cos((k / 20) * Math.PI * 2), y + r * Math.sin((k / 20) * Math.PI * 2)])
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo = []
  for (const q of pts) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop()
    lo.push(q)
  }
  const hi = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const q = pts[i]
    while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop()
    hi.push(q)
  }
  const hull = lo.slice(0, -1).concat(hi.slice(0, -1))
  // (the hull inset by the rounding, which the bevel then adds back)
  const cx = hull.reduce((s, q) => s + q[0], 0) / hull.length
  const cy = hull.reduce((s, q) => s + q[1], 0) / hull.length
  const shape = new THREE.Shape(hull.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1
    return new THREE.Vector2(x - ((x - cx) / d) * bevel, y - ((y - cy) / d) * bevel)
  }))
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.05, th - 2 * bevel), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 })
  g.translate(0, 0, bevel)
  const out = toCreasedNormals(g, 0.7)
  g.dispose()
  return out
}

/** A hexagon (a nut, a bolt's head) thickness th along +z, its edges chamfered. */
export function hex(r, th, bevel = 0.45) {
  const shape = new THREE.Shape()
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6
    const x = (r - bevel) * Math.cos(a)
    const y = (r - bevel) * Math.sin(a)
    if (k) shape.lineTo(x, y)
    else shape.moveTo(x, y)
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: th - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 1 })
  g.translate(0, 0, bevel)
  const out = toCreasedNormals(g, 0.5)
  g.dispose()
  return out
}

/** A matrix whose +y is `axis` (unit) and whose origin is `o` (any turn about it). */
export function alongY(axis, o) {
  const y = axis.clone().normalize()
  const x = new THREE.Vector3(0, 1, 0)
  if (Math.abs(y.y) > 0.9) x.set(1, 0, 0)
  x.cross(y).normalize()
  const z = new THREE.Vector3().crossVectors(x, y)
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(o)
}
/** A matrix from three axes and an origin. */
export const frame = (x, y, z, o) => new THREE.Matrix4().makeBasis(x, y, z).setPosition(o)

/**
 * Bake the occlusion of nearby parts into t's vertices: spheres [[x, y, z, r, k]] (in t's frame),
 * each darkening what faces it by its solid angle (cosine-weighted, the horizon handled), times k.
 */
export function occlude(t, spheres) {
  flatten(t)
  const P = t.p
  const N = t.n
  for (let i = 0; i < t.ao.length; i++) {
    const px = P[i * 3]
    const py = P[i * 3 + 1]
    const pz = P[i * 3 + 2]
    let vis = 1
    for (const [x, y, z, r, k] of spheres) {
      const dx = x - px
      const dy = y - py
      const dz = z - pz
      const l2 = dx * dx + dy * dy + dz * dz
      // (beyond 3.5 radii a sphere hides under a twelfth of the sky; inside one, it is its own surface)
      if (l2 > 12.25 * r * r || l2 < 1.04 * r * r) continue
      const l = Math.sqrt(l2)
      const h = l / r
      const nl = (dx * N[i * 3] + dy * N[i * 3 + 1] + dz * N[i * 3 + 2]) / l
      const h2 = h * h
      const k2 = 1 - h2 * nl * nl
      let occ = Math.max(0, nl) / h2
      if (k2 > 0) {
        occ = nl * Math.acos(Math.max(-1, Math.min(1, (-nl * Math.sqrt((h2 - 1) / Math.max(1e-6, 1 - nl * nl)))))) - Math.sqrt(k2 * (h2 - 1))
        occ = occ / h2 + Math.atan(Math.sqrt(k2 / (h2 - 1)))
        occ /= Math.PI
      }
      vis *= 1 - k * Math.max(0, Math.min(1, occ))
    }
    t.ao[i] *= vis
  }
}

// ---- the detail texture: one tiling 128 x 128 RGBA8, mipmapped
//   r  fine relief: the enamel's orange peel, the cast metal's grain
//   g  broad mottling: tone, smudges, tarnish
//   b  scratches: fine straight marks at random
//   a  breakup: where dust settles, where chips lie

/** Tileable value noise on an S x S grid, c lattice cells across, smooth (quintic), 0..1. */
function lattice(S, c, seed) {
  const L = new Float32Array(c * c)
  let s = (seed * 7919 + 13) % 2147483647
  for (let i = 0; i < L.length; i++) L[i] = (s = (s * 16807) % 2147483647) / 2147483647
  const i0 = new Int32Array(S)
  const f = new Float32Array(S)
  for (let x = 0; x < S; x++) {
    const q = (x / S) * c
    const i = Math.floor(q)
    const t = q - i
    i0[x] = i % c
    f[x] = t * t * t * (t * (t * 6 - 15) + 10)
  }
  const out = new Float32Array(S * S)
  for (let y = 0; y < S; y++) {
    const ya = i0[y] * c
    const yb = ((i0[y] + 1) % c) * c
    const fy = f[y]
    for (let x = 0; x < S; x++) {
      const xa = i0[x]
      const xb = (xa + 1) % c
      const fx = f[x]
      const a = L[ya + xa] + (L[ya + xb] - L[ya + xa]) * fx
      const b = L[yb + xa] + (L[yb + xb] - L[yb + xa]) * fx
      out[y * S + x] = a + (b - a) * fy
    }
  }
  return out
}
/** Octaves of lattice noise, normalised to 0..1 round 0.5. */
function octaves(S, c, n, seed) {
  const out = new Float32Array(S * S)
  let amp = 1
  let tot = 0
  for (let o = 0; o < n; o++) {
    const l = lattice(S, c << o, seed + o * 31)
    for (let i = 0; i < out.length; i++) out[i] += l[i] * amp
    tot += amp
    amp *= 0.5
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot
  return out
}

export function detailPixels(S = 128) {
  const peel = octaves(S, 16, 2, 3)
  const mott = octaves(S, 4, 3, 11)
  const grit = octaves(S, 16, 2, 23)
  // scratches: short straight strokes, a little uneven, wrapping round the tile
  const scr = new Float32Array(S * S)
  let s = 977
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let k = 0; k < 40; k++) {
    let x = rnd() * S
    let y = rnd() * S
    const a = rnd() * Math.PI
    const len = 7 + rnd() * rnd() * 45
    const k0 = 0.25 + rnd() * 0.75
    const dx = Math.cos(a) * 0.5
    const dy = Math.sin(a) * 0.5
    for (let j = 0; j < len * 2; j++) {
      x += dx
      y += dy
      const fade = Math.sin((j / (len * 2)) * Math.PI) * k0
      const xi = Math.floor(x)
      const yi = Math.floor(y)
      const fx = x - xi
      const fy = y - yi
      // (splatted on its four nearest texels)
      for (const [ox, oy, wgt] of [
        [0, 0, (1 - fx) * (1 - fy)],
        [1, 0, fx * (1 - fy)],
        [0, 1, (1 - fx) * fy],
        [1, 1, fx * fy],
      ]) {
        const o = (((yi + oy) % S) + S) % S * S + ((((xi + ox) % S) + S) % S)
        scr[o] = Math.min(1, scr[o] + wgt * fade * 0.9)
      }
    }
  }
  const px = new Uint8Array(S * S * 4)
  const q = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255)
  for (let i = 0; i < S * S; i++) {
    px[i * 4] = q((peel[i] - 0.5) * 2.2 + 0.5)
    px[i * 4 + 1] = q((mott[i] - 0.5) * 2.4 + 0.5)
    px[i * 4 + 2] = q(scr[i])
    // (stretched gently: few texels clamp, so a threshold near the top finds only true peaks, small
    // and apart: chips and specks, not plateaus)
    px[i * 4 + 3] = q((grit[i] - 0.5) * 1.8 + 0.5)
  }
  return { size: S, px }
}

/** A soft round shadow (alpha, from full at r0 to none at the edge), size x size. */
export function shadowPixels(size, r0, r1) {
  const px = new Uint8Array(size * size * 4)
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const r = Math.hypot((i + 0.5) / size - 0.5, (j + 0.5) / size - 0.5) * 2
      const t = Math.max(0, Math.min(1, (r - r0) / (r1 - r0)))
      px[(j * size + i) * 4 + 3] = Math.round(255 * (1 - t * t * (3 - 2 * t)) ** 1.6)
    }
  return px
}
