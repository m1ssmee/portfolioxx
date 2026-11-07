// The earbuds' procedural textures' pixels (ported from the Drift Wired viewer's textures.js): the
// braid's normal / roughness / colour maps (computed) and the etched L and R (drawn on a canvas).
// No three.js here: earbudsTextures() runs in a worker (the letters need OffscreenCanvas there) or
// on the page; createEarbuds() takes its output, or makes it itself.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

/** The braided sleeve: one 256 x 256 tile, 8 strands per family, over two, under two. */
export function braidData() {
  const S = 256
  const N = 8 // strands per family per tile
  const h = new Float32Array(S * S)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = (x + 0.5) / S
      const v = (y + 0.5) / S
      const strand = (cross, along, phase) => {
        const c = cross - Math.floor(cross)
        const prof = Math.sqrt(Math.max(0, 1 - (2 * c - 1) ** 2))
        // over two, under two
        const wave = Math.sin((Math.PI / 2) * (along + phase))
        return prof * 0.55 + wave * 0.3 * prof
      }
      const a = strand((u - v) * N, (u + v) * N, 0)
      const b = strand((u + v) * N, (u - v) * N, 1)
      h[y * S + x] = Math.max(a, b)
    }
  const nrm = new Uint8Array(S * S * 4)
  const rough = new Uint8Array(S * S * 4)
  const albedo = new Uint8Array(S * S * 4)
  const at = (x, y) => h[((y + S) % S) * S + ((x + S) % S)]
  // fibre noise along the strands
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const fib = new Float32Array(S * S)
  for (let i = 0; i < S * S; i++) fib[i] = rnd()
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 2.2
      const dy = (at(x, y + 1) - at(x, y - 1)) * 2.2
      const l = Math.hypot(dx, dy, 1)
      const o = (y * S + x) * 4
      nrm[o] = Math.round(((-dx / l) * 0.5 + 0.5) * 255)
      nrm[o + 1] = Math.round(((-dy / l) * 0.5 + 0.5) * 255)
      nrm[o + 2] = Math.round(((1 / l) * 0.5 + 0.5) * 255)
      nrm[o + 3] = 255
      const hh = at(x, y)
      const f = (fib[o / 4] + fib[y * S + ((x + 1) % S)] + fib[((y + 1) % S) * S + x]) / 3
      const r = 0.84 - hh * 0.22 + (f - 0.5) * 0.06
      rough[o] = rough[o + 1] = rough[o + 2] = Math.round(clamp(r, 0, 1) * 255)
      rough[o + 3] = 255
      const a = 0.66 + hh * 0.34 + (f - 0.5) * 0.08
      albedo[o] = albedo[o + 1] = albedo[o + 2] = Math.round(clamp(a, 0, 1) * 255)
      albedo[o + 3] = 255
    }
  return { normal: nrm, rough, albedo }
}

/** The etched letters, L and R side by side (one texture for both buds): each in a 128 square. */
export const LETTERS = {
  w: 256,
  h: 128,
  draw(x) {
    const w = 128
    x.fillStyle = '#000'
    x.fillRect(0, 0, 2 * w, w)
    x.fillStyle = '#fff'
    x.font = `600 ${Math.round(w * 0.78)}px "Helvetica Neue", Helvetica, Arial, sans-serif`
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.fillText('L', w / 2, w / 2 + w * 0.04)
    x.fillText('R', w + w / 2, w / 2 + w * 0.04)
  },
}

/**
 * The letters' pixels, bottom row first (as a canvas texture would be uploaded, flipped):
 * { w, h, px }. On an OffscreenCanvas where there is one (workers), else a page canvas; null where
 * there is neither.
 */
export function letterPixels() {
  const { w, h } = LETTERS
  let c = null
  if (typeof OffscreenCanvas !== 'undefined') c = new OffscreenCanvas(w, h)
  else if (typeof document !== 'undefined') {
    c = document.createElement('canvas')
    c.width = w
    c.height = h
  }
  const x = c && c.getContext('2d')
  if (!x) return null
  LETTERS.draw(x)
  const src = x.getImageData(0, 0, w, h).data
  const px = new Uint8Array(w * h * 4)
  for (let r = 0; r < h; r++) px.set(src.subarray((h - 1 - r) * w * 4, (h - r) * w * 4), r * w * 4)
  return { w, h, px }
}

/**
 * Everything createEarbuds() needs: { braid: { normal, rough, albedo }, letters } (letters null in
 * a worker without OffscreenCanvas: createEarbuds then draws them on the page). In a worker, post
 * it with transfer: earbudsTextureTransfer(t).
 */
export function earbudsTextures() {
  let letters = null
  try {
    letters = letterPixels()
  } catch {
    letters = null
  }
  return { braid: braidData(), letters }
}
export function earbudsTextureTransfer(t) {
  const out = [t.braid.normal.buffer, t.braid.rough.buffer, t.braid.albedo.buffer]
  if (t.letters) out.push(t.letters.px.buffer)
  return out
}
