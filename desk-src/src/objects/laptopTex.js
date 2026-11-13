// The laptop's textures, made without three.js (the pixel bakes can run in a worker as they are; the
// drawings want a 2D context, an OffscreenCanvas's in a worker):
//   beadPixels    bead-blasted aluminium's fine pitting: a tiling normal map
//   wearPixels    the deck's plan (304 x 215 mm): oil (palm rests, swipes on the trackpad) in r,
//                 fingerprints in g, the keys' shade on the well's floor (in the well) or dust
//                 (elsewhere) in b, the anodising's slow unevenness in a
//   drawLegends   every key's print into one atlas, each key a cell (24 x 15 mm at 5.33 px/mm)
//   drawStickers  two stickers for the lid's back
//   drawContact   the soft shadow under the base, on the desk
import { noise2t, noise3 } from '../core/noise.js'

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
/** A small seeded random (the same marks every time). */
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Bead-blasted aluminium: a fine, even pitting (S x S texels, tiling), as a tangent-space normal map. */
export function beadPixels(S = 128) {
  const h = new Float32Array(S * S)
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const u = i / S
      const v = j / S
      h[j * S + i] = 0.6 * noise2t(u * 32, v * 32, 32, 32, 211) + 0.4 * noise2t(u * 64, v * 64, 64, 64, 223)
    }
  const px = new Uint8Array(S * S * 4)
  const at = (x, y) => h[((y + S) % S) * S + ((x + S) % S)]
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const dx = (at(i + 1, j) - at(i - 1, j)) * 1.6
      const dy = (at(i, j + 1) - at(i, j - 1)) * 1.6
      const l = Math.hypot(dx, dy, 1)
      const o = (j * S + i) * 4
      px[o] = Math.round(((-dx / l) * 0.5 + 0.5) * 255)
      px[o + 1] = Math.round(((-dy / l) * 0.5 + 0.5) * 255)
      px[o + 2] = Math.round(((1 / l) * 0.5 + 0.5) * 255)
      px[o + 3] = 255
    }
  return { size: S, px }
}

/**
 * The deck's wear, in its plan (x across, z from the hinge (row 0) to the front): RGBA8, W x H.
 * keys: keyLayout()'s; well: { hw, z0, z1 }; pad: { w, d, z }; deck: [w, d] (mm). Each mark is
 * worked out only over its own box (a few milliseconds).
 */
export function wearPixels(keys, well, pad, deck = [304, 215], W = 512, H = 362) {
  const mm = deck[0] / W
  const px = new Uint8Array(W * H * 4)
  const oil = new Float32Array(W * H)
  const print = new Float32Array(W * H)
  const pi = (x) => Math.round((x + deck[0] / 2) / mm - 0.5)
  const pj = (z) => Math.round((z + deck[1] / 2) / mm - 0.5)
  const X = (i) => (i + 0.5) * mm - deck[0] / 2
  const Z = (j) => (j + 0.5) * mm - deck[1] / 2
  /** Visit the pixels of a box (mm): fn(index, x, z). */
  const box = (x0, z0, x1, z1, fn) => {
    const i0 = Math.max(0, pi(x0))
    const i1 = Math.min(W - 1, pi(x1))
    const j0 = Math.max(0, pj(z0))
    const j1 = Math.min(H - 1, pj(z1))
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(j * W + i, X(i), Z(j))
  }
  // (slow fields on a coarse grid (5 mm), read back with bilinear filtering)
  const CS = 5
  const CW = Math.ceil(deck[0] / CS) + 2
  const CH = Math.ceil(deck[1] / CS) + 2
  const tone = new Float32Array(CW * CH)
  const blot = new Float32Array(CW * CH)
  for (let j = 0; j < CH; j++)
    for (let i = 0; i < CW; i++) {
      const x = i * CS
      const z = j * CS
      tone[j * CW + i] = 0.5 + 0.32 * noise3(x * 0.012, z * 0.012, 3.1) + 0.18 * noise3(x * 0.035, z * 0.035, 7.7)
      blot[j * CW + i] = 0.5 + 0.5 * noise3(x * 0.05, z * 0.05, 11.3) + 0.25 * noise3(x * 0.16, z * 0.16, 2.9)
    }
  const coarse = (f, x, z) => {
    const fx = (x + deck[0] / 2) / CS
    const fy = (z + deck[1] / 2) / CS
    const x0 = Math.min(CW - 2, Math.max(0, Math.floor(fx)))
    const y0 = Math.min(CH - 2, Math.max(0, Math.floor(fy)))
    const tx = fx - x0
    const ty = fy - y0
    const a = f[y0 * CW + x0] + (f[y0 * CW + x0 + 1] - f[y0 * CW + x0]) * tx
    const b = f[(y0 + 1) * CW + x0] + (f[(y0 + 1) * CW + x0 + 1] - f[(y0 + 1) * CW + x0]) * tx
    return a + (b - a) * ty
  }
  // ---- oil: the palm rests either side of the trackpad, blotchy; a band where thumbs rest in front
  // of the space bar; swipes on the trackpad
  for (const sx of [-1, 1]) {
    const cx = sx * (pad.w / 2 + 52)
    const cz = pad.z + 6
    box(cx - 50, cz - 40, cx + 50, cz + 40, (o, x, z) => {
      const r2 = ((x - cx) / 50) ** 2 + ((z - cz) / 40) ** 2
      if (r2 < 1) oil[o] = Math.max(oil[o], 0.85 * (1 - r2) ** 2 * smooth(0.35, 0.9, coarse(blot, x, z)))
    })
  }
  const bz = well.z1 + 5
  box(-75, bz - 8, 75, bz + 8, (o, x, z) => {
    const v = 0.35 * Math.max(0, 1 - Math.abs(x) / 75) * Math.exp(-(((z - bz) / 3.2) ** 2)) * smooth(0.3, 0.8, coarse(blot, x, z))
    oil[o] = Math.max(oil[o], v)
  })
  const r = rng(71)
  // (a swipe: an arc on the trackpad, a finger's width, fading at its ends; stamped along it)
  for (let s = 0; s < 7; s++) {
    const cx = (r() - 0.5) * pad.w * 0.5
    const cz = pad.z + (r() - 0.2) * pad.d * 0.4
    const R = 18 + r() * 40
    const a0 = r() * Math.PI * 2
    const span = 0.5 + r() * 0.9
    const k = 0.35 + r() * 0.4
    const steps = Math.ceil((R * span) / 0.7)
    for (let q = 0; q <= steps; q++) {
      const t = q / steps
      const a = a0 + span * t
      const x = cx + R * Math.cos(a) * 0.6
      const z = cz + R * Math.sin(a) * 0.4
      if (Math.abs(x) > pad.w / 2 - 3 || Math.abs(z - pad.z) > pad.d / 2 - 3) continue
      const fade = k * 0.5 * Math.sin(Math.PI * t)
      box(x - 3.4, z - 3.4, x + 3.4, z + 3.4, (o, px_, pz) => {
        const d = Math.hypot(px_ - x, pz - z)
        if (d < 3.4) oil[o] = Math.max(oil[o], fade * (1 - d / 3.4))
      })
    }
  }
  // ---- fingerprints: soft ovals, mottled (their ridges are finer than a pixel here): on the
  // trackpad, the palm rests, at the thumb scoop
  const spots = []
  for (let s = 0; s < 9; s++) spots.push([(r() - 0.5) * (pad.w - 16), pad.z + (r() - 0.5) * (pad.d - 14)])
  for (let s = 0; s < 4; s++) spots.push([(r() < 0.5 ? -1 : 1) * (pad.w / 2 + 20 + r() * 60), pad.z + (r() - 0.5) * 50])
  spots.push([-9, deck[1] / 2 - 9], [8, deck[1] / 2 - 11])
  for (const [cx, cz] of spots) {
    const ang = r() * Math.PI
    const ca = Math.cos(ang)
    const sa = Math.sin(ang)
    const k = 0.45 + r() * 0.5
    box(cx - 3.2, cz - 3.2, cx + 3.2, cz + 3.2, (o, x, z) => {
      const u = ((x - cx) * ca + (z - cz) * sa) / 2.2
      const v = (-(x - cx) * sa + (z - cz) * ca) / 3.0
      const r2 = u * u + v * v
      if (r2 >= 1) return
      const m = 0.6 + 0.4 * noise2t(x * 1.6, z * 1.6, 4096, 4096, 31)
      print[o] = Math.max(print[o], k * (1 - r2) * m)
    })
  }
  // ---- the keys' shade on the well's floor: their footprints, blurred (a sliding box, twice each
  // way, over the well's box only)
  const wi0 = Math.max(0, pi(-well.hw) - 4)
  const wi1 = Math.min(W - 1, pi(well.hw) + 4)
  const wj0 = Math.max(0, pj(well.z0) - 4)
  const wj1 = Math.min(H - 1, pj(well.z1) + 4)
  const cov = new Float32Array(W * H)
  for (const kk of keys) box(kk.x - kk.w / 2, kk.z - kk.d / 2, kk.x + kk.w / 2, kk.z + kk.d / 2, (o) => (cov[o] = 1))
  const tmp = new Float32Array(Math.max(W, H))
  const R2 = 2
  const N2 = 2 * R2 + 1
  for (let pass = 0; pass < 2; pass++) {
    for (let j = wj0; j <= wj1; j++) {
      const row = j * W
      let sum = 0
      for (let a = wi0 - R2; a <= wi0 + R2; a++) sum += cov[row + Math.min(wi1, Math.max(wi0, a))]
      for (let i = wi0; i <= wi1; i++) {
        tmp[i] = sum / N2
        sum += cov[row + Math.min(wi1, i + R2 + 1)] - cov[row + Math.max(wi0, i - R2)]
      }
      for (let i = wi0; i <= wi1; i++) cov[row + i] = tmp[i]
    }
    for (let i = wi0; i <= wi1; i++) {
      let sum = 0
      for (let a = wj0 - R2; a <= wj0 + R2; a++) sum += cov[Math.min(wj1, Math.max(wj0, a)) * W + i]
      for (let j = wj0; j <= wj1; j++) {
        tmp[j] = sum / N2
        sum += cov[Math.min(wj1, j + R2 + 1) * W + i] - cov[Math.max(wj0, j - R2) * W + i]
      }
      for (let j = wj0; j <= wj1; j++) cov[j * W + i] = tmp[j]
    }
  }
  // ---- out: the tone everywhere; in the well the shade, elsewhere a speck of dust now and then
  const dust = rng(97)
  // (the tone's bilinear weights, per column and per row)
  const cx0 = new Int32Array(W)
  const ctx = new Float32Array(W)
  for (let i = 0; i < W; i++) {
    const fx = (X(i) + deck[0] / 2) / CS
    cx0[i] = Math.min(CW - 2, Math.floor(fx))
    ctx[i] = fx - cx0[i]
  }
  const wellI0 = pi(-well.hw - 1)
  const wellI1 = pi(well.hw + 1)
  for (let j = 0; j < H; j++) {
    const z = Z(j)
    const fy = (z + deck[1] / 2) / CS
    const y0 = Math.min(CH - 2, Math.floor(fy))
    const ty = fy - y0
    const inRow = z > well.z0 - 1 && z < well.z1 + 1
    for (let i = 0; i < W; i++) {
      const o = j * W + i
      let b
      if (inRow && i >= wellI0 && i <= wellI1) b = 1 - cov[o]
      else b = dust() > 0.9988 ? 0.3 + 0.7 * dust() : 0
      const t0 = y0 * CW + cx0[i]
      const a = tone[t0] + (tone[t0 + 1] - tone[t0]) * ctx[i]
      const c = tone[t0 + CW] + (tone[t0 + CW + 1] - tone[t0 + CW]) * ctx[i]
      const q = o * 4
      px[q] = (clamp01(oil[o]) * 255 + 0.5) | 0
      px[q + 1] = (clamp01(print[o]) * 255 + 0.5) | 0
      px[q + 2] = (clamp01(b) * 255 + 0.5) | 0
      px[q + 3] = (clamp01(a + (c - a) * ty) * 255 + 0.5) | 0
    }
  }
  return { w: W, h: H, px }
}

// =================================================================================================
// the keys' print
// =================================================================================================
export const ATLAS = { w: 1024, h: 1024, cw: 128, ch: 80, mm: [24, 15] }
const PXMM = ATLAS.cw / ATLAS.mm[0]

/** A symbol (a stroke drawing, centred on 0, 0, about s mm high) on a context in mm. */
function symbol(g, name, s) {
  const lw = Math.max(0.16, s * 0.085)
  g.lineWidth = lw
  g.lineCap = 'round'
  g.lineJoin = 'round'
  const tri = (pts) => {
    g.beginPath()
    g.moveTo(pts[0], pts[1])
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1])
    g.closePath()
    g.fill()
  }
  const speaker = () => {
    g.beginPath()
    g.moveTo(-0.42 * s, -0.12 * s)
    g.lineTo(-0.26 * s, -0.12 * s)
    g.lineTo(-0.06 * s, -0.3 * s)
    g.lineTo(-0.06 * s, 0.3 * s)
    g.lineTo(-0.26 * s, 0.12 * s)
    g.lineTo(-0.42 * s, 0.12 * s)
    g.closePath()
    g.fill()
  }
  g.beginPath()
  switch (name) {
    case 'cmd': {
      const a = s * 0.17
      const r = s * 0.15
      g.moveTo(-a - r, -a)
      g.lineTo(a + r, -a)
      g.moveTo(-a - r, a)
      g.lineTo(a + r, a)
      g.moveTo(-a, -a - r)
      g.lineTo(-a, a + r)
      g.moveTo(a, -a - r)
      g.lineTo(a, a + r)
      g.stroke()
      for (const [sx, sy] of [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]) {
        g.beginPath()
        g.arc(sx * (a + r), sy * (a + r), r, 0, Math.PI * 2)
        g.stroke()
      }
      return
    }
    case 'opt':
      g.moveTo(-0.42 * s, -0.24 * s)
      g.lineTo(-0.14 * s, -0.24 * s)
      g.lineTo(0.14 * s, 0.24 * s)
      g.lineTo(0.42 * s, 0.24 * s)
      g.moveTo(0.1 * s, -0.24 * s)
      g.lineTo(0.42 * s, -0.24 * s)
      g.stroke()
      return
    case 'ctrl':
      g.moveTo(-0.3 * s, 0.14 * s)
      g.lineTo(0, -0.18 * s)
      g.lineTo(0.3 * s, 0.14 * s)
      g.stroke()
      return
    case 'shift':
      g.moveTo(0, -0.42 * s)
      g.lineTo(0.4 * s, 0.02 * s)
      g.lineTo(0.18 * s, 0.02 * s)
      g.lineTo(0.18 * s, 0.38 * s)
      g.lineTo(-0.18 * s, 0.38 * s)
      g.lineTo(-0.18 * s, 0.02 * s)
      g.lineTo(-0.4 * s, 0.02 * s)
      g.closePath()
      g.stroke()
      return
    case 'tab':
      g.moveTo(-0.42 * s, 0)
      g.lineTo(0.3 * s, 0)
      g.moveTo(0.1 * s, -0.2 * s)
      g.lineTo(0.3 * s, 0)
      g.lineTo(0.1 * s, 0.2 * s)
      g.moveTo(0.42 * s, -0.26 * s)
      g.lineTo(0.42 * s, 0.26 * s)
      g.stroke()
      return
    case 'dot':
      g.arc(0, 0, 0.32, 0, Math.PI * 2)
      g.fill()
      return
    case 'globe':
      g.arc(0, 0, 0.42 * s, 0, Math.PI * 2)
      g.moveTo(0.18 * s, -0.38 * s)
      g.ellipse(0, 0, 0.18 * s, 0.42 * s, 0, -Math.PI / 2, Math.PI * 1.5)
      g.moveTo(-0.42 * s, 0)
      g.lineTo(0.42 * s, 0)
      g.moveTo(-0.36 * s, -0.2 * s)
      g.lineTo(0.36 * s, -0.2 * s)
      g.moveTo(-0.36 * s, 0.2 * s)
      g.lineTo(0.36 * s, 0.2 * s)
      g.stroke()
      return
    case 'up':
      return tri([0, -0.3 * s, 0.3 * s, 0.22 * s, -0.3 * s, 0.22 * s])
    case 'down':
      return tri([0, 0.3 * s, 0.3 * s, -0.22 * s, -0.3 * s, -0.22 * s])
    case 'left':
      return tri([-0.3 * s, 0, 0.22 * s, -0.3 * s, 0.22 * s, 0.3 * s])
    case 'right':
      return tri([0.3 * s, 0, -0.22 * s, -0.3 * s, -0.22 * s, 0.3 * s])
    case 'sun-':
    case 'sun+': {
      const big = name === 'sun+'
      g.arc(0, 0, 0.16 * s, 0, Math.PI * 2)
      g.stroke()
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        g.beginPath()
        g.moveTo(Math.cos(a) * 0.28 * s, Math.sin(a) * 0.28 * s)
        g.lineTo(Math.cos(a) * (big ? 0.44 : 0.33) * s, Math.sin(a) * (big ? 0.44 : 0.33) * s)
        g.stroke()
      }
      return
    }
    case 'mission':
      g.rect(-0.42 * s, -0.3 * s, 0.36 * s, 0.24 * s)
      g.rect(0.06 * s, -0.3 * s, 0.36 * s, 0.24 * s)
      g.rect(-0.42 * s, 0.04 * s, 0.84 * s, 0.28 * s)
      g.stroke()
      return
    case 'search':
      g.arc(-0.06 * s, -0.06 * s, 0.24 * s, 0, Math.PI * 2)
      g.moveTo(0.12 * s, 0.12 * s)
      g.lineTo(0.38 * s, 0.38 * s)
      g.stroke()
      return
    case 'mic':
      g.moveTo(-0.11 * s, -0.12 * s)
      g.arc(0, -0.25 * s, 0.11 * s, Math.PI, 0)
      g.lineTo(0.11 * s, 0.02 * s)
      g.arc(0, 0.02 * s, 0.11 * s, 0, Math.PI)
      g.closePath()
      g.moveTo(-0.24 * s, 0)
      g.arc(0, 0, 0.24 * s, Math.PI, 0, true)
      g.moveTo(0, 0.24 * s)
      g.lineTo(0, 0.4 * s)
      g.stroke()
      return
    case 'moon': {
      // (a disc, then the atlas's black over most of it: a crescent)
      g.arc(0, 0, 0.36 * s, 0, Math.PI * 2)
      g.fill()
      const ink = g.fillStyle
      g.fillStyle = '#000'
      g.beginPath()
      g.arc(0.16 * s, -0.12 * s, 0.3 * s, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = ink
      return
    }
    case 'rew':
      tri([-0.44 * s, 0, -0.02 * s, -0.26 * s, -0.02 * s, 0.26 * s])
      return tri([-0.02 * s, 0, 0.4 * s, -0.26 * s, 0.4 * s, 0.26 * s])
    case 'ff':
      tri([0.44 * s, 0, 0.02 * s, -0.26 * s, 0.02 * s, 0.26 * s])
      return tri([0.02 * s, 0, -0.4 * s, -0.26 * s, -0.4 * s, 0.26 * s])
    case 'play':
      tri([-0.42 * s, -0.26 * s, -0.04 * s, 0, -0.42 * s, 0.26 * s])
      g.fillRect(0.08 * s, -0.26 * s, 0.1 * s, 0.52 * s)
      g.fillRect(0.28 * s, -0.26 * s, 0.1 * s, 0.52 * s)
      return
    case 'mute':
      speaker()
      return
    case 'vol-':
    case 'vol+':
      speaker()
      for (let i = 0; i < (name === 'vol+' ? 3 : 1); i++) {
        g.beginPath()
        g.arc(-0.06 * s, 0, (0.16 + i * 0.12) * s, -Math.PI / 4, Math.PI / 4)
        g.stroke()
      }
      return
  }
}

/**
 * Every key's print into the atlas (a 2D context on an ATLAS.w x ATLAS.h canvas): white on black.
 * Returns, per key, { u, v } (its cell's corner, atlas uv: v down the canvas) and { x, z } (the
 * cell's middle on the key, mm from the key's middle), or null for a key without a print.
 */
export function drawLegends(g, keys, font) {
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.fillStyle = '#000'
  g.fillRect(0, 0, ATLAS.w, ATLAS.h)
  const cols = Math.floor(ATLAS.w / ATLAS.cw)
  const [cw, ch] = ATLAS.mm
  let n = 0
  const txt = (s, x, y, size, align, weight = 400) => {
    if (s[0] === '@') {
      g.save()
      g.translate(x + (align === 'left' ? size * 0.45 : align === 'right' ? -size * 0.45 : 0), y)
      symbol(g, s.slice(1), size)
      g.restore()
      return
    }
    g.font = `${weight} ${size}px ${font}`
    g.textAlign = align
    g.textBaseline = 'middle'
    g.fillText(s, x, y)
  }
  return keys.map((k) => {
    const lg = k.legend
    if (!lg) return null
    const i = n++
    const cx = (i % cols) * ATLAS.cw
    const cy = Math.floor(i / cols) * ATLAS.ch
    // the cell's middle on the key: the key's middle, or (a long key) the end its print is at
    const left = lg.tl || lg.bl
    const right = lg.tr || lg.br
    const ax = k.w <= cw ? 0 : left && !right ? -k.w / 2 + cw / 2 : right && !left ? k.w / 2 - cw / 2 : 0
    g.save()
    g.setTransform(PXMM, 0, 0, PXMM, cx + ATLAS.cw / 2, cy + ATLAS.ch / 2)
    g.beginPath()
    g.rect(-cw / 2 + 0.3, -ch / 2 + 0.3, cw - 0.6, ch - 0.6)
    g.clip()
    g.translate(-ax, 0)
    g.fillStyle = '#fff'
    g.strokeStyle = '#fff'
    const hw = k.w / 2
    const hd = k.d / 2
    if (lg.c) txt(lg.c, 0, 0.05, lg.c[0] === '@' ? 2.2 : 3.1, 'center', 500)
    if (lg.t) txt(lg.t, 0, -2.5, 2.5, 'center')
    if (lg.b) txt(lg.b, 0, 2.7, 2.5, 'center')
    const sz = (s) => (s[0] === '@' ? 2.5 : 1.8)
    if (lg.tl) txt(lg.tl, -hw + 1.9, -hd + 3.1, sz(lg.tl), 'left')
    if (lg.tr) txt(lg.tr, hw - 1.9, -hd + 3.1, sz(lg.tr), 'right')
    if (lg.bl) txt(lg.bl, -hw + 1.9, hd - 2.5, sz(lg.bl), 'left')
    if (lg.br) txt(lg.br, hw - 1.9, hd - 2.5, sz(lg.br), 'right')
    if (lg.icon) {
      g.save()
      g.translate(0, -1.5)
      symbol(g, lg.icon, 3.6)
      g.restore()
      txt(lg.f, 0, 4.3, 1.55, 'center')
    }
    if (lg.touchid) {
      // the sensor's ring, just inside the key's edge
      g.lineWidth = 0.24
      const r = 1.1
      const x0 = -hw + 0.85
      const y0 = -hd + 0.85
      const w = k.w - 1.7
      const h = k.d - 1.7
      g.beginPath()
      g.moveTo(x0 + r, y0)
      g.arcTo(x0 + w, y0, x0 + w, y0 + h, r)
      g.arcTo(x0 + w, y0 + h, x0, y0 + h, r)
      g.arcTo(x0, y0 + h, x0, y0, r)
      g.arcTo(x0, y0, x0 + w, y0, r)
      g.closePath()
      g.stroke()
    }
    g.restore()
    return { u: cx / ATLAS.w, v: cy / ATLAS.h, x: ax, z: 0 }
  })
}

// =================================================================================================
// the stickers, the contact shadow
// =================================================================================================
/** Two stickers side by side on a 512 x 256 canvas, transparent round them: a night roundel with the
 * moon and a small rover (left), "[citation needed]" on a black pill (right). 9.6 px a mm. */
export const STICKERS = { w: 512, h: 256, pxmm: 9.6, a: { d: 25 }, b: { w: 25, h: 11.5 } }
export function drawStickers(g, font) {
  const S = STICKERS
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, S.w, S.h)
  // the roundel: a die-cut white edge, a night sky, the moon, a horizon and a rover on it
  const R = (S.a.d / 2) * S.pxmm
  g.save()
  g.translate(128, 128)
  g.fillStyle = '#f4f1ea'
  g.beginPath()
  g.arc(0, 0, R, 0, Math.PI * 2)
  g.fill()
  const sky = g.createLinearGradient(0, -R, 0, R)
  sky.addColorStop(0, '#16203a')
  sky.addColorStop(1, '#2b3a5e')
  g.fillStyle = sky
  g.beginPath()
  g.arc(0, 0, R - 7, 0, Math.PI * 2)
  g.fill()
  g.save()
  g.clip()
  // (the moon, and the sky again over most of it: a crescent)
  g.fillStyle = '#efe3c4'
  g.beginPath()
  g.arc(-22, -30, 34, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = sky
  g.beginPath()
  g.arc(-6, -42, 30, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(239,227,196,0.85)'
  for (const [x, y, r] of [
    [38, -52, 2.6],
    [62, -18, 1.8],
    [20, -74, 1.6],
    [-60, 6, 1.6],
  ]) {
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  // (the ground, and the rover on it)
  g.fillStyle = '#c9bfa5'
  g.beginPath()
  g.ellipse(0, R * 1.05, R * 1.3, R * 0.62, 0, 0, Math.PI * 2)
  g.fill()
  // (the rover: cream against the sky, its wheels on the ground)
  g.fillStyle = '#efe3c4'
  g.fillRect(-8, 33, 36, 11)
  g.fillRect(15, 19, 4, 14)
  g.fillRect(10, 14, 14, 6)
  g.fillStyle = '#1b2440'
  for (const x of [-3, 10, 23]) {
    g.beginPath()
    g.arc(x, 48, 5.5, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
  g.restore()
  // the pill: white edge, black face, the words fitted to it (whatever the font)
  const bw = S.b.w * S.pxmm
  const bh = S.b.h * S.pxmm
  g.save()
  g.translate(384, 128)
  const pill = (w, h, col) => {
    const r = h / 2
    g.fillStyle = col
    g.beginPath()
    g.moveTo(-w / 2 + r, -h / 2)
    g.arcTo(w / 2, -h / 2, w / 2, h / 2, r)
    g.arcTo(w / 2, h / 2, -w / 2, h / 2, r)
    g.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r)
    g.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r)
    g.closePath()
    g.fill()
  }
  pill(bw, bh, '#f4f1ea')
  pill(bw - 12, bh - 12, '#141414')
  let size = 30
  const text = '[citation needed]'
  g.font = `600 ${size}px ${font}`
  const maxW = bw - 44
  const tw = g.measureText(text).width
  if (tw > maxW) size = Math.floor((size * maxW) / tw)
  g.font = `600 ${size}px ${font}`
  g.fillStyle = '#f4f1ea'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, 0, 2)
  g.restore()
}

/** The soft shadow under the base on the desk (black, its alpha the shade), on a w x h canvas that
 * covers the base and `m` mm round it. */
export function drawContact(g, w, h, size, m, feet) {
  const k = w / (size[0] + 2 * m)
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, w, h)
  const rr = (x, y, ww, hh, r) => {
    g.beginPath()
    g.moveTo(x + r, y)
    g.arcTo(x + ww, y, x + ww, y + hh, r)
    g.arcTo(x + ww, y + hh, x, y + hh, r)
    g.arcTo(x, y + hh, x, y, r)
    g.arcTo(x, y, x + ww, y, r)
    g.closePath()
  }
  const N = 26
  for (let i = 0; i < N; i++) {
    // rounded rects from m mm outside the base to 6 mm inside, each adding a little
    const t = i / (N - 1)
    const grow = m - (m + 6) * t
    const x0 = (m - grow) * k
    const y0 = (m - grow) * k
    g.fillStyle = `rgba(0,0,0,${(0.018 + 0.075 * t * t).toFixed(4)})`
    rr(x0, y0, w - 2 * x0, h - 2 * y0, Math.max(1, (10.5 + grow) * k))
    g.fill()
  }
  // (the feet: a little darker where they stand)
  for (const [fx, fz] of feet) {
    const cx = (fx + size[0] / 2 + m) * k
    const cy = (fz + size[1] / 2 + m) * k
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 9 * k)
    gr.addColorStop(0, 'rgba(0,0,0,0.35)')
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr
    g.fillRect(cx - 9 * k, cy - 9 * k, 18 * k, 18 * k)
  }
}
