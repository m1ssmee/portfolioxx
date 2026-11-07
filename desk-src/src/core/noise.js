// Value noise and fractal noise for baking (CPU side: textures, geometry, SDF irregularity).
// Deterministic (hashed), smooth (quintic), in [-1, 1].
function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h & 0xffff) / 32767.5 - 1
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)
const l = (a, b, t) => a + (b - a) * t
export function noise3(x, y, z) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const u = fade(x - xi)
  const v = fade(y - yi)
  const w = fade(z - zi)
  return l(
    l(l(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), l(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
    l(l(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), l(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v),
    w,
  )
}
/** Tileable 2D value noise (period px, py in lattice cells). */
export function noise2t(x, y, px, py, seed = 0) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const u = fade(x - xi)
  const v = fade(y - yi)
  const x0 = ((xi % px) + px) % px
  const y0 = ((yi % py) + py) % py
  const x1 = (x0 + 1) % px
  const y1 = (y0 + 1) % py
  return l(l(hash3(x0, y0, seed), hash3(x1, y0, seed), u), l(hash3(x0, y1, seed), hash3(x1, y1, seed), u), v)
}
export function fbm2t(x, y, px, py, oct = 4, seed = 0) {
  let a = 0
  let amp = 0.5
  let f = 1
  for (let o = 0; o < oct; o++) {
    a += amp * noise2t(x * f, y * f, px * f, py * f, seed + o * 17)
    amp *= 0.5
    f *= 2
  }
  return a
}
