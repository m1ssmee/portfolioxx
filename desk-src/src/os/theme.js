// Pod OS's colours: two themes, chosen by the visitor's system (prefers-color-scheme), and one accent,
// a dusty sage, a deeper shade of it in the light theme so it still reads as text at AA contrast.
export const THEMES = {
  dark: {
    bg: '#1d1c1a',
    tile: '#292825',
    press: '#232220',
    line: '#383632',
    text: '#e8e4dc',
    muted: '#a29d93',
    accent: '#9aa894',
  },
  light: {
    bg: '#efebe3',
    tile: '#e4dfd5',
    press: '#dad4c9',
    line: '#cfc8bb',
    text: '#2b2a27',
    muted: '#615d56',
    accent: '#56624f',
  },
}

/** The text/background pairs the UI uses (for the contrast check). */
export const TEXT_PAIRS = [
  ['text', 'bg'],
  ['muted', 'bg'],
  ['text', 'tile'],
  ['muted', 'tile'],
  ['accent', 'bg'],
  ['accent', 'tile'],
  ['text', 'press'],
]

const lin = (c) => {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
}
/** WCAG contrast ratio of two #rrggbb colours. */
export function contrast(a, b) {
  const la = lum(a)
  const lb = lum(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * The wallpaper: a small tile of soft tonal grain (light and dark specks of very low alpha, at most
 * 10/255), laid over the theme's background, so one tile suits both themes. Returned as a canvas
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
