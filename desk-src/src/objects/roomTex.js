// The room's procedural textures, as pixel arrays, bottom row first (as a DataTexture uploads them).
// No three.js and no page here: bakeRoom() can run in the worker (core/worker.js), as bake.js's
// textures do; createRoom() bakes them itself when it is not handed them.
//   paint   the panelling's eggshell: brush striations along the boards, the pine's grain showing
//           through, a few dust nibs (tone in r, roughness in g) and its normal map; one board's
//           face, 120 x 480 mm, tiling
//   oak     the frame's and the rail's oiled oak: rings, open pores, a few ray flecks (albedo, sRGB;
//           normal; roughness in g); 340 x 42.5 mm, tiling, the grain along u
//   cork    pressed granules, large and small, their pores, a few dark crumbs (albedo, sRGB;
//           normal); 64 mm square, tiling
//   paper   fine fibres (normal), for everything pinned up; 32 mm square, tiling
//   wallAO  the wall's contact shade over the part of it ever seen (one channel): round the board's
//           hanging gap, under and over the rail, round the socket; and the paint's slow clouds
//   corkAO  the cork's (one channel): under the frame's lip, round each pin, old pin holes, the
//           ghost of a card that hung there for a year
// (Value noise from lookup tables: a few times faster than core/noise.js's hashed noise, which
// only fills the coarse grids here.)
import { fbm2t } from '../core/noise.js'

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
/** A hash of two integers and a seed, in [0, 1). */
function hash(i, j, seed) {
  let h = (i * 374761393 + j * 668265263 + seed * 1442695041) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}
const byte = (v) => (v <= 0 ? 0 : v >= 1 ? 255 : (v * 255 + 0.5) | 0)

/** Periodic value noise on a px x py lattice, in [-1, 1]: lookup(x, y), x and y in lattice cells. */
function lattice(px, py, seed) {
  const t = new Float32Array(px * py)
  for (let j = 0; j < py; j++) for (let i = 0; i < px; i++) t[j * px + i] = hash(i, j, seed) * 2 - 1
  return (x, y) => {
    let xi = Math.floor(x)
    let yi = Math.floor(y)
    let fx = x - xi
    let fy = y - yi
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    xi %= px
    if (xi < 0) xi += px
    yi %= py
    if (yi < 0) yi += py
    const xj = xi + 1 === px ? 0 : xi + 1
    const r0 = yi * px
    const r1 = (yi + 1 === py ? 0 : yi + 1) * px
    const a = t[r0 + xi]
    const b = t[r0 + xj]
    const c = t[r1 + xi]
    return a + (b - a) * fx + (c - a + (a - b + t[r1 + xj] - c) * fx) * fy
  }
}
/** A slow field f(u, v) worked out on a coarse W x H grid (tiling), read back bilinearly at u, v in [0, 1). */
function coarse(W, H, f) {
  const g = new Float32Array(W * H)
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) g[j * W + i] = f(i / W, j / H)
  return (u, v) => {
    const x = u * W
    const y = v * H
    let xi = Math.floor(x)
    let yi = Math.floor(y)
    const fx = x - xi
    const fy = y - yi
    xi %= W
    if (xi < 0) xi += W
    yi %= H
    if (yi < 0) yi += H
    const xj = xi + 1 === W ? 0 : xi + 1
    const r0 = yi * W
    const r1 = (yi + 1 === H ? 0 : yi + 1) * W
    const a = g[r0 + xi]
    const b = g[r0 + xj]
    const c = g[r1 + xi]
    return a + (b - a) * fx + (c - a + (a - b + g[r1 + xj] - c) * fx) * fy
  }
}

/**
 * A normal map (RGBA8, OpenGL's: green up the texture, along v) from a height field in mm; `mm`:
 * a texel's size; `wrap`: the field tiles.
 */
function normalMap(h, W, H, mm, wrap = true) {
  const out = new Uint8Array(W * H * 4)
  const k = 1 / (2 * mm)
  for (let y = 0; y < H; y++) {
    const ya = (wrap ? (y + H - 1) % H : Math.max(0, y - 1)) * W
    const yb = (wrap ? (y + 1) % H : Math.min(H - 1, y + 1)) * W
    for (let x = 0; x < W; x++) {
      const xa = wrap ? (x + W - 1) % W : Math.max(0, x - 1)
      const xb = wrap ? (x + 1) % W : Math.min(W - 1, x + 1)
      const sx = (h[y * W + xb] - h[y * W + xa]) * k
      const sy = (h[yb + x] - h[ya + x]) * k
      const l = 127.5 / Math.sqrt(sx * sx + sy * sy + 1)
      const o = (y * W + x) * 4
      out[o] = (127.5 - sx * l) | 0
      out[o + 1] = (127.5 - sy * l) | 0
      out[o + 2] = (127.5 + l) | 0
      out[o + 3] = 255
    }
  }
  return out
}

/** The panelling's paint over one board's face (u across it, v up it). */
export function paintTex(W = 192, H = 768) {
  const mm = 120 / W
  const h = new Float32Array(W * H)
  const px = new Uint8Array(W * H * 4)
  // (the brush's load, and the pine's rings' waver: slow, on coarse grids)
  const load = coarse(24, 96, (u, v) => fbm2t(u * 3, v * 5, 3, 5, 3, 7) * 0.5 + 0.5)
  const warp = coarse(16, 48, (u, v) => fbm2t(u * 2, v * 3, 2, 3, 2, 11) * 0.9)
  const s1 = lattice(56, 7, 3)
  const s2 = lattice(104, 13, 5)
  // a few dust nibs dried into it: one cell in eight has one (cells 10 x 10 mm)
  const NX = 12
  const NY = 48
  const nib = new Float32Array(NX * NY * 3)
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const k = (j * NX + i) * 3
      nib[k] = hash(i, j, 41) < 0.12 ? (i + 0.2 + 0.6 * hash(i, j, 42)) / NX : -1
      nib[k + 1] = (j + 0.2 + 0.6 * hash(i, j, 43)) / NY
      nib[k + 2] = 0.3 + 0.35 * hash(i, j, 44)
    }
  for (let j = 0; j < H; j++) {
    const v = j / H
    for (let i = 0; i < W; i++) {
      const u = i / W
      const L = load(u, v)
      // the brush: long striations along the board, deeper where the stroke laid more paint
      const a = s1(u * 56, v * 7)
      const b = s2(u * 104, v * 13)
      // the pine under it: its rings, long and wavering, faintly through the paint
      const t = (((u * 6 + warp(u, v)) % 1) + 1) % 1
      const ring = smooth(0.78, 0.9, Math.abs(t - 0.5) * 2)
      let n = 0
      const k = (((v * NY) | 0) * NX + ((u * NX) | 0)) * 3
      if (nib[k] >= 0) {
        const dx = (u - nib[k]) * 120
        const dy = (v - nib[k + 1]) * 480
        const r2 = (dx * dx + dy * dy) / (nib[k + 2] * nib[k + 2])
        if (r2 < 1) n = (1 - r2) * 0.06
      }
      h[j * W + i] = 0.04 * a * (0.3 + L) + 0.018 * b + 0.025 * ring + n
      const o = (j * W + i) * 4
      px[o] = byte(0.5 - 0.22 * (L - 0.5) + 0.05 * a - 0.04 * ring)
      px[o + 1] = byte(0.74 - 0.12 * (L - 0.5) - 0.03 * a + 0.02 * b - n * 2)
      px[o + 3] = 255
    }
  }
  return { size: [W, H], px, nrm: normalMap(h, W, H, mm) }
}

/** Oiled oak along the grain (u along the piece, v across it). */
export function oakTex(W = 1024, H = 128) {
  const mm = 340 / W
  const h = new Float32Array(W * H)
  const px = new Uint8Array(W * H * 4)
  const rough = new Uint8Array(W * H * 4)
  const warp = coarse(128, 16, (u, v) => fbm2t(u * 2, v * 2, 2, 2, 3, 21) * 1.5 + fbm2t(u * 13, v * 3, 13, 3, 2, 23) * 0.12)
  const tone = coarse(64, 8, (u, v) => fbm2t(u * 3, v * 1, 3, 1, 3, 61) * 0.09 + fbm2t(u * 20, v * 4, 20, 4, 2, 63) * 0.03)
  const poreN = lattice(220, 128, 29)
  const fibreN = lattice(340, 40, 67)
  // ray flecks (the oak's medullary rays, cut across): one cell in seven, 10 x 1.8 mm cells
  const FX = 34
  const FY = 24
  const fl = new Float32Array(FX * FY * 5)
  for (let j = 0; j < FY; j++)
    for (let i = 0; i < FX; i++) {
      const k = (j * FX + i) * 5
      fl[k] = hash(i, j, 51) < 0.15 ? 1 : 0
      fl[k + 1] = (i + hash(i, j, 52)) / FX
      fl[k + 2] = (j + hash(i, j, 53)) / FY
      fl[k + 3] = 2 + 4 * hash(i, j, 54)
      fl[k + 4] = 0.3 + 0.4 * hash(i, j, 55)
    }
  for (let j = 0; j < H; j++) {
    const v = j / H
    const cj = (v * FY) | 0
    for (let i = 0; i < W; i++) {
      const u = i / W
      // rings, straight along the piece and wavering a little; ring-porous: each year opens with a
      // thin band of large pores (earlywood), then dense, lighter latewood
      const t = (((v * 14 + warp(u, v)) % 1) + 1) % 1
      const early = 1 - smooth(0.02, 0.24, t)
      const pore = smooth(0.25, 0.72, poreN(u * 220, v * 128)) * (0.18 + 0.82 * early)
      let fleck = 0
      const ci = (u * FX) | 0
      for (let dj = -1; dj <= 1; dj++) {
        const b = (cj + dj + FY) % FY
        for (let di = -1; di <= 1; di++) {
          const a = (ci + di + FX) % FX
          const k = (b * FX + a) * 5
          if (!fl[k]) continue
          // (the fleck's middle, unwrapped next to this cell)
          const cx = fl[k + 1] + (ci + di < 0 ? -1 : ci + di >= FX ? 1 : 0)
          const cy = fl[k + 2] + (cj + dj < 0 ? -1 : cj + dj >= FY ? 1 : 0)
          const dx = ((u - cx) * 340) / fl[k + 3]
          const dy = ((v - cy) * 42.5) / fl[k + 4]
          const r = dx * dx + dy * dy
          if (r < 1) fleck = Math.max(fleck, 1 - r)
        }
      }
      const fibre = fibreN(u * 340, v * 40)
      const T = 1 + tone(u, v)
      const k = T * (1 - 0.2 * early) * (1 - 0.42 * pore) * (1 + 0.025 * fibre)
      const f = smooth(0.1, 0.5, fleck) * 0.7
      const o = (j * W + i) * 4
      px[o] = byte(0.73 * k * (1 - f) + 0.78 * T * f)
      px[o + 1] = byte(0.54 * k * (1 - f) + 0.6 * T * f)
      px[o + 2] = byte(0.35 * k * (1 - f) + 0.42 * T * f)
      px[o + 3] = 255
      rough[o + 1] = byte(0.56 + 0.22 * pore - 0.12 * f + 0.03 * fibre)
      rough[o + 3] = 255
      h[j * W + i] = -0.05 * pore - 0.015 * early + 0.006 * f + 0.004 * fibre
    }
  }
  return { size: [W, H], px, rough, nrm: normalMap(h, W, H, mm) }
}

/**
 * Agglomerated cork: granules (jittered cells, their outlines wavering), two sizes mixed, the
 * crevices between them, small dark pores, a few dark crumbs.
 */
export function corkTex(S = 384) {
  const mm = 64 / S
  const layer = (N, seed) => {
    const P = new Float32Array(N * N * 3)
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const k = (j * N + i) * 3
        P[k] = i + 0.1 + 0.8 * hash(i, j, seed)
        P[k + 1] = j + 0.1 + 0.8 * hash(i, j, seed + 1)
        P[k + 2] = hash(i, j, seed + 2)
      }
    return { N, P }
  }
  const big = layer(30, 1) // (2.1 mm)
  const small = layer(58, 11) // (1.1 mm)
  // the granules' nearest and next nearest points (cell units), and the nearest one's tone
  let f1 = 0
  let f2 = 0
  let tn = 0
  const worley = (L, u, v) => {
    const { N, P } = L
    const x = u * N
    const y = v * N
    const ci = Math.floor(x)
    const cj = Math.floor(y)
    let d1 = 9
    let d2 = 9
    let t = 0
    for (let dj = -1; dj <= 1; dj++) {
      let b = cj + dj
      let oy = 0
      if (b < 0) {
        b += N
        oy = -N
      } else if (b >= N) {
        b -= N
        oy = N
      }
      for (let di = -1; di <= 1; di++) {
        let a = ci + di
        let ox = 0
        if (a < 0) {
          a += N
          ox = -N
        } else if (a >= N) {
          a -= N
          ox = N
        }
        const k = (b * N + a) * 3
        const dx = x - P[k] - ox
        const dy = y - P[k + 1] - oy
        const d = dx * dx + dy * dy
        if (d < d1) {
          d2 = d1
          d1 = d
          t = P[k + 2]
        } else if (d < d2) d2 = d
      }
    }
    f1 = Math.sqrt(d1)
    f2 = Math.sqrt(d2)
    tn = t
  }
  const wx = lattice(24, 24, 5)
  const wy = lattice(24, 24, 6)
  const mix = coarse(16, 16, (u, v) => fbm2t(u * 4, v * 4, 4, 4, 2, 7))
  const pores = lattice(150, 150, 8)
  const grit = lattice(96, 96, 9)
  const h = new Float32Array(S * S)
  const px = new Uint8Array(S * S * 4)
  for (let y = 0; y < S; y++) {
    const v = y / S
    for (let x = 0; x < S; x++) {
      const u = x / S
      // (the outlines waver: no two granules the same shape)
      const uu = u + wx(u * 24, v * 24) * 0.012
      const vv = v + wy(u * 24, v * 24) * 0.012
      const m = mix(u, v)
      let edge
      let t
      if (m > -0.05) {
        worley(big, uu, vv)
        edge = smooth(0, 0.3, f2 - f1)
        t = tn
      } else {
        worley(small, uu, vv)
        edge = smooth(0, 0.34, f2 - f1)
        t = tn
      }
      // (some outlines all but vanish: neighbouring granules pressed into one)
      edge = 1 - (1 - edge) * (0.45 + 0.55 * Math.abs(t * 2 - 1))
      const p = smooth(0.62, 0.8, pores(u * 150, v * 150))
      const gr = grit(u * 96, v * 96)
      let r = 0.77 - 0.13 * t
      let g = 0.59 - 0.13 * t
      let b = 0.4 - 0.1 * t
      if (t > 0.965) {
        r = 0.46
        g = 0.31
        b = 0.19
      } else if (t < 0.04) {
        r = 0.86
        g = 0.71
        b = 0.53
      }
      const k = (0.76 + 0.24 * edge) * (1 - 0.32 * p) * (0.96 + 0.05 * gr)
      const o = (y * S + x) * 4
      px[o] = byte(r * k)
      px[o + 1] = byte(g * k)
      px[o + 2] = byte(b * k)
      px[o + 3] = 255
      h[y * S + x] = 0.12 * edge + 0.04 * (t - 0.5) - 0.05 * p + 0.01 * gr
    }
  }
  return { size: [S, S], px, nrm: normalMap(h, S, S, mm) }
}

/** Paper's fibres: thin ridges laid every way, and its cloud (formation). */
export function paperTex(S = 256) {
  const mm = 32 / S
  const h = new Float32Array(S * S)
  const a = lattice(40, 5, 71)
  const b = lattice(5, 40, 73)
  const c = lattice(28, 4, 75)
  const d = lattice(28, 4, 77)
  const cloud = coarse(32, 32, (u, v) => fbm2t(u * 8, v * 8, 8, 8, 3, 79))
  const ridge = (n) => {
    const r = 1 - Math.abs(n)
    return r * r * r * r
  }
  for (let y = 0; y < S; y++) {
    const v = y / S
    for (let x = 0; x < S; x++) {
      const u = x / S
      const f = ridge(a(u * 40, v * 5)) + ridge(b(u * 5, v * 40)) + ridge(c((u + v) * 28, (u - v) * 4)) + ridge(d((u - v) * 28, (u + v) * 4))
      h[y * S + x] = 0.004 * f + 0.006 * cloud(u, v)
    }
  }
  return { size: [S, S], nrm: normalMap(h, S, S, mm) }
}

/** The distance from (x, y) to a rectangle [x0, y0, x1, y1] (0 inside). */
const rectDist = (x, y, r) => {
  const dx = Math.max(r[0] - x, 0, x - r[2])
  const dy = Math.max(r[1] - y, 0, y - r[3])
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * The wall's contact shade (1 = none) over L.wallAO's rectangle of the room's frame: round the
 * board (it hangs a few mm off the panelling, the light from above and a little to the left),
 * under and over the rail, round the socket; and the paint's slow clouds.
 */
export function wallAOTex(L) {
  const [x0, y0, x1, y1] = L.wallAO.rect
  const [W, H] = L.wallAO.size
  const B = L.board
  const board = [B.u - B.w / 2 + 2, B.y0 - 5, B.u + B.w / 2 + 2, B.y0 + B.h - 4]
  const S = L.socket
  const sock = [S.u - S.w / 2, S.y - S.h / 2 - 2.5, S.u + S.w / 2, S.y + S.h / 2 - 1]
  const lo = L.rail.y
  const hi = L.rail.y + L.rail.h
  // (limewash-like clouds, slow and faint: one paint, laid by hand)
  const cloud = coarse(64, 32, (u, v) => fbm2t(u * 6, v * 3, 6, 3, 3, 81) * 0.04 + fbm2t(u * 24, v * 12, 24, 12, 2, 83) * 0.012)
  const px = new Uint8Array(W * H)
  for (let j = 0; j < H; j++) {
    const y = y0 + ((j + 0.5) / H) * (y1 - y0)
    let rail = 1
    if (L.rail.none) rail = 1
    else if (y < lo) rail = 1 - 0.42 * Math.exp(-(lo - y) / 6) - 0.1 * Math.exp(-(lo - y) / 30)
    else if (y > hi) rail = 1 - 0.3 * Math.exp(-(y - hi) / 7)
    for (let i = 0; i < W; i++) {
      const x = x0 + ((i + 0.5) / W) * (x1 - x0)
      let k = rail
      const db = rectDist(x, y, board)
      if (db < 240) k *= 1 - 0.5 * Math.exp(-db / 9) - 0.2 * Math.exp(-db / 38)
      const ds = rectDist(x, y, sock)
      if (ds < 80) k *= 1 - 0.42 * Math.exp(-ds / 3.5) - 0.1 * Math.exp(-ds / 14)
      px[j * W + i] = byte(k * (0.955 + cloud(i / W, j / H)))
    }
  }
  return { size: [W, H], px }
}

/**
 * The cork's contact shade (1 = none), over the cork (mm from its lower left corner, a texel a mm):
 * under the frame's lip (deeper under its top), round each pin (the light from above: a little
 * below it), old pin holes, the ghost of a card long gone (the cork it covered kept its colour),
 * and a slow patina.
 */
export function corkAOTex(L) {
  const B = L.board
  const F = B.frame
  const cw = B.w - 2 * F
  const ch = B.h - 2 * F
  const W = Math.round(cw)
  const H = Math.round(ch)
  const sx = cw / W
  const sy = ch / H
  const g = B.ghost && [B.ghost[0] - F, B.ghost[1] - F, B.ghost[2] - F, B.ghost[3] - F]
  const patina = coarse(32, 24, (u, v) => fbm2t(u * 8, v * 6, 8, 6, 2, 91) * 0.032)
  const k = new Float32Array(W * H)
  for (let j = 0; j < H; j++) {
    const y = (j + 0.5) * sy
    const top = 1 - 0.12 * Math.exp(-(ch - y) / 8)
    for (let i = 0; i < W; i++) {
      const x = (i + 0.5) * sx
      const d = Math.min(x, cw - x, y, ch - y)
      const lip = B.lip ?? 1
      let a = (1 - lip * (1 - top)) * (d < 60 ? 1 - lip * (0.46 * Math.exp(-d / 3.2) + 0.14 * Math.exp(-d / 16)) : 1)
      if (g) {
        const e = Math.min(x - g[0], g[2] - x, y - g[1], g[3] - y)
        if (e > -2) a *= 1 - 0.05 * smooth(-1.5, 1.5, e)
      }
      k[j * W + i] = a * (0.968 + patina(i / W, j / H))
    }
  }
  // each pin's soft shade and each hole, stamped over its own few texels
  const stamp = (cx, cy, rad, f) => {
    for (let j = Math.max(0, Math.floor((cy - rad) / sy)); j <= Math.min(H - 1, Math.ceil((cy + rad) / sy)); j++)
      for (let i = Math.max(0, Math.floor((cx - rad) / sx)); i <= Math.min(W - 1, Math.ceil((cx + rad) / sx)); i++) {
        const dx = (i + 0.5) * sx - cx
        const dy = (j + 0.5) * sy - cy
        k[j * W + i] *= f(dx * dx + dy * dy)
      }
  }
  const pin = (x, y, down, r, a) => stamp(x - F, y - F - down, 2 * r, (d2) => 1 - a * Math.exp(-d2 / (r * r)))
  // (the pins things hang from stand out further: their shade falls lower and wider)
  for (const [x, y] of [B.badge, B.calendar, B.clip, B.ticket]) pin(x, y, 4, 4.5, 0.3)
  for (const [x, y] of B.spare) pin(x, y, 1.6, 3.4, 0.36)
  for (const [x, y] of B.holes)
    stamp(x - F, y - F, 2, (d2) => {
      const r = Math.sqrt(d2)
      return r < 0.45 ? 0.3 : 0.72 + 0.28 * smooth(0.45, 1.6, r)
    })
  const px = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) px[i] = byte(k[i])
  return { size: [W, H], px }
}

/** Every texture the room needs, from its layout (ROOM: plain numbers, so it can be posted). */
export function bakeRoom(L) {
  return {
    paint: paintTex(),
    paper: paperTex(),
    wallAO: wallAOTex(L),
    corkAO: corkAOTex(L),
  }
}

/** The pixel arrays bakeRoom() made, to hand over without a copy (postMessage's transfer list). */
export function roomTransfer(t) {
  const out = []
  for (const v of Object.values(t)) for (const k of ['px', 'nrm', 'rough']) if (v[k]) out.push(v[k].buffer)
  return out
}
