// Pod OS's colours: one light theme, the scene's own cool paper and slate ink, with one accent, a
// muted slate blue, deep enough to read as text at AA contrast on every surface.
export const THEMES = {
  light: {
    bg: '#f3f5f8',
    tile: '#e6eaf0',
    press: '#dadfe6',
    line: '#c9cfd8',
    text: '#1f252d',
    muted: '#4f5866',
    accent: '#3d5670',
  },
}

/**
 * The wallpaper: a small tile of soft tonal grain (light and dark specks of very low alpha, at most
 * 10/255), laid over the theme's background. Returned as a canvas
 * (the screen texture draws it as a pattern) and a data URL (the DOM's background).
 */
export function wallpaperTile() {
  const N = 192
  const cv = document.createElement('canvas')
  cv.width = cv.height = N
  const c = cv.getContext('2d')
  const img = c.createImageData(N, N)
  const d = img.data
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  // a periodic value noise (the tile repeats without a seam)
  const g = 12
  const v = new Float32Array(g * g)
  for (let i = 0; i < v.length; i++) v[i] = rnd()
  const at = (i, j) => v[(((j % g) + g) % g) * g + (((i % g) + g) % g)]
  const noise = (x, y) => {
    const fx = (x / N) * g
    const fy = (y / N) * g
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const tx = fx - x0
    const ty = fy - y0
    const sx = tx * tx * (3 - 2 * tx)
    const sy = ty * ty * (3 - 2 * ty)
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx
    return a + (b - a) * sy
  }
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const t = (rnd() - 0.5) * 1.6 + (noise(x, y) - 0.5) * 0.5 // -1 .. 1: darker .. lighter
      const i = (y * N + x) * 4
      d[i] = d[i + 1] = d[i + 2] = t > 0 ? 255 : 0
      d[i + 3] = Math.round(Math.min(1, Math.abs(t)) * 10)
    }
  c.putImageData(img, 0, 0)
  return { canvas: cv, url: cv.toDataURL('image/png') }
}
