// The scene's textures, baked once (in the worker) as RGBA8 pixel arrays: every one tiles.
//   speckle  the stoneware's iron speckles and clay mottling (grey-scale masks in r, g, b)
//   cork     the filter's tipping paper: mottled cork-tan with fine speckles (sRGB)
//   paper    laid-paper lines and fibre noise (masks)
//   fibre    the filter's cut end: cellulose fibres (mask)
import { fbm2t, noise2t } from './noise.js'

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** Stoneware: iron speckles (r), clay mottling (g), fine grit (b). */
function speckle(S) {
  const px = new Uint8Array(S * S * 4)
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const u = i / S
      const v = j / S
      const sp1 = noise2t(u * 90, v * 90, 90, 90, 3) * 0.5 + 0.5
      const sp2 = noise2t(u * 37, v * 37, 37, 37, 9) * 0.5 + 0.5
      const iron = smooth(0.8, 0.9, sp1) * 0.8 + smooth(0.86, 0.93, sp2)
      const mott = fbm2t(u * 6, v * 6, 6, 6, 4, 13) * 0.5 + 0.5
      const grit = noise2t(u * 240, v * 240, 240, 240, 19) * 0.5 + 0.5
      const o = (j * S + i) * 4
      px[o] = Math.round(clamp01(iron) * 255)
      px[o + 1] = Math.round(clamp01(mott) * 255)
      px[o + 2] = Math.round(clamp01(grit) * 255)
      px[o + 3] = 255
    }
  return { px }
}

/** Cork tipping paper: warm tan mottling with fine darker speckles. u: around, v: along. */
function cork(S) {
  const px = new Uint8Array(S * S * 4)
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const u = i / S
      const v = j / S
      const m = fbm2t(u * 8, v * 8, 8, 8, 4, 31)
      const sp = smooth(0.72, 0.86, noise2t(u * 70, v * 70, 70, 70, 37) * 0.5 + 0.5)
      const fine = noise2t(u * 180, v * 180, 180, 180, 43)
      const r = 0.74 + 0.07 * m - 0.22 * sp + 0.02 * fine
      const g = 0.53 + 0.06 * m - 0.2 * sp + 0.015 * fine
      const b = 0.33 + 0.04 * m - 0.14 * sp + 0.01 * fine
      const o = (j * S + i) * 4
      px[o] = Math.round(clamp01(r) * 255)
      px[o + 1] = Math.round(clamp01(g) * 255)
      px[o + 2] = Math.round(clamp01(b) * 255)
      px[o + 3] = 255
    }
  return { px }
}

/** Cigarette paper: laid lines across (r), fibre noise (g). u: around, v: along. */
function paper(S) {
  const px = new Uint8Array(S * S * 4)
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const u = i / S
      const v = j / S
      const laid = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 48 + noise2t(u * 8, v * 8, 8, 8, 7) * 0.6)
      const fib = fbm2t(u * 24, v * 24, 24, 24, 3, 53) * 0.5 + 0.5
      const o = (j * S + i) * 4
      px[o] = Math.round(laid * 255)
      px[o + 1] = Math.round(clamp01(fib) * 255)
      px[o + 2] = 0
      px[o + 3] = 255
    }
  return { px }
}

/** The filter's cut end: tangled cellulose fibres (mask). */
function fibre(S) {
  const px = new Uint8Array(S * S * 4)
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const u = i / S
      const v = j / S
      const a = noise2t(u * 48, v * 6, 48, 6, 83) + noise2t(u * 6, v * 48, 6, 48, 89)
      const f = smooth(-0.2, 0.9, a + 0.4 * noise2t(u * 96, v * 96, 96, 96, 97))
      const o = (j * S + i) * 4
      px[o] = px[o + 1] = px[o + 2] = Math.round(f * 255)
      px[o + 3] = 255
    }
  return { px }
}

/** The lighter's finishes: brushed streaks (r), fine variation (g), bead-blast grain (b), tone (a). */
function bead(S) {
  const px = new Uint8Array(S * S * 4)
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const u = i / S
      const v = j / S
      const streak = noise2t(u * 2, v * 96, 2, 96, 101) * 0.5 + 0.5
      const fine = fbm2t(u * 16, v * 16, 16, 16, 3, 103) * 0.5 + 0.5
      const grain = noise2t(u * 64, v * 64, 64, 64, 107) * 0.5 + 0.5
      const tone = fbm2t(u * 3, v * 3, 3, 3, 3, 109) * 0.5 + 0.5
      const o = (j * S + i) * 4
      px[o] = Math.round(clamp01(streak) * 255)
      px[o + 1] = Math.round(clamp01(fine) * 255)
      px[o + 2] = Math.round(clamp01(grain) * 255)
      px[o + 3] = Math.round(clamp01(tone) * 255)
    }
  return { px }
}

/** Every texture, with the sizes the scene uses. */
export function bakeAll() {
  return {
    speckle: { size: 512, ...speckle(512) },
    cork: { size: 256, ...cork(256) },
    paper: { size: 256, ...paper(256) },
    fibre: { size: 128, ...fibre(128) },
    bead: { size: 128, ...bead(128) },
  }
}

/**
 * A tileable curl-noise volume, N³ texels of (vx, vy, vz) as half floats: the curl of three
 * periodic gradient-noise potentials (`cells` lattice cells across the volume), so it is
 * divergence-free and wraps seamlessly. Sampled with linear filtering, one fetch gives what took
 * three noise potentials and six evaluations each.
 */
export function curlVolume(N = 64, cells = 8) {
  const pot = [0, 1, 2].map((k) => periodicGradientNoise(N, cells, 101 + k * 37))
  const out = new Uint16Array(N * N * N * 4)
  const at = (f, x, y, z) => f[(((z + N) % N) * N + ((y + N) % N)) * N + ((x + N) % N)]
  const inv = cells / 2 // (a difference over two texels, in noise units: 2 / (N / cells))
  const s = N / cells / 2
  let max = 0
  const v = new Float32Array(N * N * N * 3)
  for (let z = 0; z < N; z++)
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const [a, b, c] = pot
        const dcdy = (at(c, x, y + 1, z) - at(c, x, y - 1, z)) * s
        const dbdz = (at(b, x, y, z + 1) - at(b, x, y, z - 1)) * s
        const dadz = (at(a, x, y, z + 1) - at(a, x, y, z - 1)) * s
        const dcdx = (at(c, x + 1, y, z) - at(c, x - 1, y, z)) * s
        const dbdx = (at(b, x + 1, y, z) - at(b, x - 1, y, z)) * s
        const dady = (at(a, x, y + 1, z) - at(a, x, y - 1, z)) * s
        const o = ((z * N + y) * N + x) * 3
        v[o] = dcdy - dbdz
        v[o + 1] = dadz - dcdx
        v[o + 2] = dbdx - dady
        max = Math.max(max, Math.abs(v[o]), Math.abs(v[o + 1]), Math.abs(v[o + 2]))
      }
  void inv
  // (scaled to the strength of the simplex curl it stands in for: rms 2.076 per component)
  let s2 = 0
  for (let i = 0; i < v.length; i++) s2 += v[i] * v[i]
  const k = 2.076 / Math.sqrt(s2 / v.length)
  max *= k
  for (let i = 0, j = 0; i < v.length; i += 3, j += 4) {
    out[j] = toHalf(v[i] * k)
    out[j + 1] = toHalf(v[i + 1] * k)
    out[j + 2] = toHalf(v[i + 2] * k)
    out[j + 3] = 0
  }
  return { size: N, cells, data: out, max }
}

/** Periodic 3D gradient noise (Perlin-style, quintic), sampled on an N³ grid, `cells` cells across. */
function periodicGradientNoise(N, cells, seed) {
  // gradients on the lattice (wrapping), from a small LCG
  let r = seed * 7919 + 13
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647) * 2 - 1
  const G = new Float32Array(cells * cells * cells * 3)
  for (let i = 0; i < cells * cells * cells; i++) {
    let gx, gy, gz, l
    do {
      gx = rnd()
      gy = rnd()
      gz = rnd()
      l = gx * gx + gy * gy + gz * gz
    } while (l > 1 || l < 1e-4)
    l = Math.sqrt(l)
    G[i * 3] = gx / l
    G[i * 3 + 1] = gy / l
    G[i * 3 + 2] = gz / l
  }
  const f = new Float32Array(N * N * N)
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)
  const step = cells / N
  for (let z = 0; z < N; z++)
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const px = x * step
        const py = y * step
        const pz = z * step
        const xi = Math.floor(px)
        const yi = Math.floor(py)
        const zi = Math.floor(pz)
        const fx = px - xi
        const fy = py - yi
        const fz = pz - zi
        let acc = 0
        for (let c = 0; c < 8; c++) {
          const ox = c & 1
          const oy = (c >> 1) & 1
          const oz = (c >> 2) & 1
          const g = ((((zi + oz) % cells) * cells + ((yi + oy) % cells)) * cells + ((xi + ox) % cells)) * 3
          const dx = fx - ox
          const dy = fy - oy
          const dz = fz - oz
          const w = (ox ? fade(fx) : 1 - fade(fx)) * (oy ? fade(fy) : 1 - fade(fy)) * (oz ? fade(fz) : 1 - fade(fz))
          acc += w * (G[g] * dx + G[g + 1] * dy + G[g + 2] * dz)
        }
        f[(z * N + y) * N + x] = acc
      }
  return f
}

/** Float to IEEE half (round to nearest). */
const _f32 = new Float32Array(1)
const _u32 = new Uint32Array(_f32.buffer)
function toHalf(v) {
  _f32[0] = v
  const x = _u32[0]
  const sign = (x >>> 16) & 0x8000
  let e = ((x >>> 23) & 0xff) - 127 + 15
  let m = x & 0x7fffff
  if (e <= 0) return sign
  if (e >= 31) return sign | 0x7c00
  m += 0x1000
  if (m & 0x800000) {
    m = 0
    e++
    if (e >= 31) return sign | 0x7c00
  }
  return sign | (e << 10) | (m >>> 13)
}
