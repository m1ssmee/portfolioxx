// The can's textures, drawn once on canvases (no pixel is read back or looped over: all of it is
// drawing). The body: its print (sRGB) and its finish (linear: height in r, roughness in g,
// metalness in b), so the matte ink and the bare brushed aluminium it leaves (the brand, the
// keylines, the neck, the base) differ in how they shine and not only in colour; the height (its
// normals are taken from it in the shader, can.js) holds the drawn aluminium's faint vertical
// brushing on the bare metal, a small dent, and the condensation: beads, denser and larger low down,
// and a few runs, glossy where they lie. The lid: its colour and its finish (the same channels: the
// score round the opening, the deboss, the tongue's bead, the embossed lettering, the coil's
// rolling lines). And the soft masks: the tab's shade on the lid, the wet ring and the contact
// shade on the desk. Canvases are filled opaque (no premultiplied edges); r, g and b are changed
// apart by 'lighter' (adds) and 'multiply' with the other channels at full.
import { BODY, LID_UV, openingPoints, tabOutline } from './canGeo.js'

// a dusty persimmon field (against the deep green wall, beside the sage mat, the cream lamp and the
// graphite laptop), cream ink, a near-black brown for the code, the aluminium itself
const COL = { field: '#b24b2d', cream: '#efe4cb', ink: '#2a1913', metal: '#d4d7da', metalLo: '#c6c9cc' }
// (the finish: height 128 at rest; roughness: matte ink about 0.6, the bare metal about 0.3)
const FIN = { field: 'rgb(128,158,0)', cream: 'rgb(128,138,0)', ink: 'rgb(128,148,0)' }

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}
const lcg = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647

/** EAN-13 (a made-up number, its check digit computed): the 95 modules as '0'/'1', and the 13 digits. */
function ean13(d12) {
  const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
  const Rc = L.map((c) => c.replace(/./g, (b) => (b === '0' ? '1' : '0')))
  const G = Rc.map((c) => [...c].reverse().join(''))
  const PAR = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']
  const d = [...d12].map(Number)
  let sum = 0
  for (let i = 0; i < 12; i++) sum += d[i] * (i % 2 ? 3 : 1)
  d.push((10 - (sum % 10)) % 10)
  let bits = '101'
  for (let i = 1; i <= 6; i++) bits += (PAR[d[0]][i - 1] === 'L' ? L : G)[d[i]]
  bits += '01010'
  for (let i = 7; i <= 12; i++) bits += Rc[d[i]]
  return { bits: bits + '101', digits: d.join('') }
}

/**
 * The bare metal's finish as a fill: one texel a column, its height and roughness streaked (the
 * drawing and ironing of the can's wall), metal throughout. rough: its mean roughness (0..255).
 */
function brushed(g, w, kx, ky, rough, seed) {
  const c = canvas(w, 1)
  const x = c.getContext('2d')
  const img = x.createImageData(w, 1)
  const r = lcg(seed)
  let slow = 0
  for (let i = 0; i < w; i++) {
    slow = slow * 0.85 + (r() - 0.5) * 0.5
    img.data[i * 4] = 128 + (r() - 0.5) * 0.9 + slow
    img.data[i * 4 + 1] = rough + (r() - 0.5) * 12 + slow * 6
    img.data[i * 4 + 2] = img.data[i * 4 + 3] = 255
  }
  x.putImageData(img, 0, 0)
  const p = g.createPattern(c, 'repeat')
  // (the canvas is drawn in mm: one column of the pattern a texel)
  p.setTransform(new DOMMatrix([1 / kx, 0, 0, 1 / ky, 0, 0]))
  return p
}

/**
 * The label's art, drawn the same into the print ('colour') and the finish ('finish'): the canvas
 * spans the can once round (C mm) and the profile from the dome's middle (bottom) to the neck's top.
 * In mm: X round from u = 0 (the front, the brand, at C / 4; the back at 3C / 4), h up (= y on the
 * straight wall).
 */
function labelArt(g, w, h, mode, family) {
  const { C, hB, hTop, sB, vB } = BODY
  const kx = w / C
  const ky = (h * (1 - vB)) / (hTop - hB)
  const P = mode === 'colour' ? COL : { ...FIN, metal: brushed(g, w, kx, ky, 74, 99), metalLo: brushed(g, w, kx, ky, 100, 98) }
  const Y = (hh) => hTop - hh
  const mm = () => g.setTransform(kx, 0, 0, ky, 0, 0)
  const rnd = lcg(20261113)
  let fieldFill = P.field
  if (mode === 'colour') {
    fieldFill = g.createLinearGradient(0, Y(127.4), 0, Y(9))
    fieldFill.addColorStop(0, '#bb5333')
    fieldFill.addColorStop(0.55, '#b14a2d')
    fieldFill.addColorStop(1, '#a3432a')
  }
  // (text in glyph units of one pixel up the reading direction: the font's own size is never tiny,
  // which some browsers would hint and blur; the canvas's anisotropy is in the transform)
  const font = (size, weight = 400, track = 0) => {
    g.font = `${weight} ${(size * ky).toFixed(2)}px ${family}`
    if ('letterSpacing' in g) g.letterSpacing = `${(track * size * ky).toFixed(2)}px`
    return (s) => g.measureText(s).width / ky
  }
  const txt = (s, X, hh, size, o = {}) => {
    g.save()
    mm()
    g.translate(X, Y(hh))
    if (o.rot) g.rotate(o.rot)
    g.scale(1 / ky, 1 / ky)
    font(size, o.weight, o.track)
    g.textAlign = o.align || 'left'
    g.textBaseline = o.base || 'alphabetic'
    g.fillStyle = P[o.ink || 'cream']
    g.fillText(s, 0, 0)
    g.restore()
  }
  /** Words wrapped to `width` mm; returns the height below the last line. */
  const para = (s, X, hh, width, size, lead, o = {}) => {
    g.save()
    mm()
    g.scale(1 / ky, 1 / ky)
    const m = font(size, o.weight)
    const lines = []
    let line = ''
    for (const word of s.split(' ')) {
      const t = line ? line + ' ' + word : word
      if (m(t) > width && line) {
        lines.push(line)
        line = word
      } else line = t
    }
    lines.push(line)
    g.restore()
    lines.forEach((l, i) => txt(l, X, hh - i * lead, size, o))
    return hh - lines.length * lead
  }
  /** The e-mark (the estimated sign: filled by average): an open e. */
  const emark = (X, hh, r) => {
    g.save()
    mm()
    g.strokeStyle = P.cream
    g.lineWidth = r * 0.24
    g.beginPath()
    g.moveTo(X - r * 0.92, Y(hh))
    g.lineTo(X + r * 0.92, Y(hh))
    g.arc(X, Y(hh), r * 0.92, 0, -Math.PI * 1.72, true)
    g.stroke()
    g.restore()
  }
  /** The brand's mark: a crescent. */
  const moon = (X, hh, r) => {
    g.save()
    mm()
    g.beginPath()
    g.arc(X, Y(hh), r, 0, Math.PI * 2)
    g.clip()
    g.fillStyle = P.cream
    g.fillRect(X - r, Y(hh) - r, 2 * r, 2 * r)
    g.fillStyle = fieldFill
    g.beginPath()
    g.arc(X + r * 0.42, Y(hh) - r * 0.3, r * 0.84, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }

  // ---- the ground: the base bare (duller: it was formed, not ironed), the neck bare, the field between
  mm()
  g.fillStyle = P.metalLo
  g.fillRect(-1, Y(hB) - 0.5, C + 2, 200)
  g.fillStyle = P.metal
  g.fillRect(-1, -1, C + 2, Y(127.4) + 1)
  g.fillRect(-1, Y(9), C + 2, 9 - hB + 0.5)
  g.fillStyle = fieldFill
  g.fillRect(-1, Y(127.4), C + 2, 127.4 - 9)
  if (mode === 'colour') {
    // (the ink is never one flat colour: a slow mottle in its density)
    const r = lcg(77)
    g.save()
    g.beginPath()
    g.rect(-1, Y(127.4), C + 2, 127.4 - 9)
    g.clip()
    for (let i = 0; i < 40; i++) {
      const X = r() * C
      const yy = 9 + r() * 118
      const rad = 9 + r() * 15
      const dark = r() < 0.5
      const gr = g.createRadialGradient(X, Y(yy), 0, X, Y(yy), rad)
      gr.addColorStop(0, dark ? 'rgba(70,20,8,0.08)' : 'rgba(255,190,150,0.07)')
      gr.addColorStop(1, dark ? 'rgba(70,20,8,0)' : 'rgba(255,190,150,0)')
      g.fillStyle = gr
      for (const off of X < rad ? [0, C] : X > C - rad ? [0, -C] : [0]) g.fillRect(X + off - rad, Y(yy) - rad, 2 * rad, 2 * rad)
    }
    g.restore()
  }
  // keylines, knocked out to the metal
  mm()
  g.fillStyle = P.metal
  g.fillRect(-1, Y(14.8), C + 2, 0.4)
  g.fillRect(-1, Y(123.9), C + 2, 0.4)

  // ---- the front: the brand up it, knocked out to the bare metal; its full stop a cream moon
  const FX = C / 4
  g.save()
  mm()
  g.translate(FX + 10.6, Y(27))
  g.rotate(-Math.PI / 2)
  g.scale(1 / ky, 1 / ky)
  const mw = font(36, 800, -0.035)
  g.fillStyle = P.metal
  // (the brushing stays down the can, one column a texel, in the turned letters too)
  if (P.metal.setTransform) P.metal.setTransform(g.getTransform().inverse())
  g.fillText('late', 0, 0)
  if (P.metal.setTransform) P.metal.setTransform(new DOMMatrix([1 / kx, 0, 0, 1 / ky, 0, 0]))
  const ww = mw('late')
  g.restore()
  moon(FX + 10.6 - 3.05, 27 + ww + 1.2 + 3.05, 3.05)
  txt('SPARKLING ENERGY', FX - 19.4, 27, 2.25, { rot: -Math.PI / 2, weight: 600, track: 0.24 })
  txt('YUZU & BLACK TEA', FX + 18.4, 27, 2.25, { rot: -Math.PI / 2, weight: 500, track: 0.24 })
  // the mark: a crescent in a ring
  moon(FX, 113.2, 2.9)
  g.save()
  mm()
  g.strokeStyle = P.cream
  g.lineWidth = 0.32
  g.beginPath()
  g.arc(FX, Y(113.2), 4.5, 0, Math.PI * 2)
  g.stroke()
  g.restore()
  txt('355 ml', FX - 1.4, 18.4, 2.5, { align: 'center', weight: 500, track: 0.04 })
  emark(FX + 5.1, 19.25, 1.05)

  // ---- the sides
  txt('for the second wind', C / 2 + 1.5, 34, 4.1, { rot: -Math.PI / 2, weight: 500, track: -0.01 })
  txt('LATE-NIGHT FORMULA · NO. 03', C - 9, 34, 2.2, { rot: -Math.PI / 2, weight: 600, track: 0.26 })

  // ---- the back: the small print
  const BX = (3 * C) / 4
  const x0 = BX - 19
  const x1 = BX + 19
  txt('late.', x0, 115.6, 6.4, { weight: 800, track: -0.03 })
  moon(x1 - 3, 117.8, 2.7)
  txt('SPARKLING ENERGY DRINK', x0, 110.4, 1.85, { weight: 700, track: 0.1 })
  txt('WITH YUZU AND BLACK TEA', x0, 108, 1.85, { weight: 700, track: 0.1 })
  let hh = para(
    'Ingredients: carbonated water, cane sugar, yuzu juice from concentrate (3%), black tea extract, acid: citric acid, natural flavourings, caffeine, antioxidant: ascorbic acid.',
    x0,
    104.2,
    38,
    1.6,
    2.2,
  )
  hh = para('High caffeine content (32 mg/100 ml; 113 mg a can). Not recommended for children or pregnant or breast-feeding women. Best served cold; once open, drink it soon.', x0, hh - 0.9, 38, 1.6, 2.2)
  // nutrition, with its rules
  const rows = [
    ['Nutrition', 'per 100 ml', 700],
    ['Energy', '92 kJ / 22 kcal'],
    ['Fat', '0 g'],
    ['Carbohydrate', '5.3 g'],
    ['  of which sugars', '5.1 g'],
    ['Protein', '0 g'],
    ['Salt', '0.01 g'],
  ]
  hh -= 1.6
  mm()
  g.fillStyle = P.cream
  g.fillRect(x0, Y(hh + 1.9), 38, 0.22)
  rows.forEach(([a, b, wt], i) => {
    const y = hh - i * 2.25
    txt(a, x0, y, 1.6, { weight: wt || 400 })
    txt(b, x1, y, 1.6, { weight: wt || 400, align: 'right' })
    mm()
    g.fillStyle = P.cream
    g.fillRect(x0, Y(y - 0.62), 38, i ? 0.1 : 0.2)
  })
  // the barcode, dark on a cream patch
  const bc = ean13('506091234001')
  const mod = 0.27
  const bw = 95 * mod
  const by = 39.5
  mm()
  g.fillStyle = P.cream
  g.fillRect(BX - bw / 2 - 3.2, Y(by + 15.6), bw + 6.4, 18.4)
  g.fillStyle = P.ink
  for (let i = 0; i < 95; i++) {
    if (bc.bits[i] !== '1') continue
    const guard = i < 3 || (i >= 45 && i < 50) || i >= 92
    g.fillRect(BX - bw / 2 + i * mod, Y(by + 14.2), mod + 0.004, guard ? 13.6 : 12.4)
  }
  const dg = bc.digits
  txt(dg[0], BX - bw / 2 - 1.1, by - 0.2, 1.9, { ink: 'ink', align: 'right', weight: 500 })
  txt(dg.slice(1, 7), BX - bw / 2 + 3 * mod + 21 * mod, by - 0.2, 1.9, { ink: 'ink', align: 'center', weight: 500, track: 0.28 })
  txt(dg.slice(7), BX - bw / 2 + 50 * mod + 21 * mod, by - 0.2, 1.9, { ink: 'ink', align: 'center', weight: 500, track: 0.28 })
  // the recycling marks: the chasing arrows round "41" over ALU, a loop, the e-mark and the volume
  g.save()
  mm()
  const tx = x0 + 3.6
  const ty = Y(32.6)
  const ts = 3.2
  g.strokeStyle = g.fillStyle = P.cream
  g.lineWidth = 0.42
  g.lineCap = 'round'
  const corner = [0, 1, 2].map((k) => [tx + ts * Math.sin((k * 2 * Math.PI) / 3), ty - ts * Math.cos((k * 2 * Math.PI) / 3)])
  for (let k = 0; k < 3; k++) {
    const a = corner[k]
    const b = corner[(k + 1) % 3]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy)
    const ex = a[0] + dx * 0.8
    const ey = a[1] + dy * 0.8
    g.beginPath()
    g.moveTo(a[0] + dx * 0.16, a[1] + dy * 0.16)
    g.lineTo(ex, ey)
    g.stroke()
    const ux = dx / l
    const uy = dy / l
    g.beginPath()
    g.moveTo(ex + ux * 0.9, ey + uy * 0.9)
    g.lineTo(ex - uy * 0.62, ey + ux * 0.62)
    g.lineTo(ex + uy * 0.62, ey - ux * 0.62)
    g.fill()
  }
  g.restore()
  txt('41', tx, 31.8, 1.5, { align: 'center', weight: 700 })
  txt('ALU', tx, 27.4, 1.5, { align: 'center', weight: 700, track: 0.1 })
  g.save()
  mm()
  const lx = x0 + 12.4
  const ly = Y(31.6)
  g.strokeStyle = g.fillStyle = P.cream
  g.lineWidth = 0.4
  g.beginPath()
  g.arc(lx, ly, 2.9, -1.2, 4.2)
  g.stroke()
  const ax = lx + 2.9 * Math.cos(4.2)
  const ay = ly + 2.9 * Math.sin(4.2)
  g.beginPath()
  g.moveTo(ax + 1.0, ay + 0.35)
  g.lineTo(ax - 0.45, ay - 0.75)
  g.lineTo(ax - 0.6, ay + 0.95)
  g.fill()
  g.fillRect(lx - 0.8, ly - 1.3, 1.6, 2.6)
  g.restore()
  txt('355 ml', x1, 31, 2.4, { align: 'right', weight: 600 })
  emark(x1 - 10.6, 31.85, 1)
  txt('PLEASE RECYCLE · EVERY CAN, AGAIN', x1, 27.5, 1.3, { align: 'right', weight: 600, track: 0.08 })
  txt('late drinks co. · Rua do Almada 9, Porto · latedrinks.co', BX, 22.6, 1.32, { align: 'center' })
  txt('Best before: see base.  Keep cold, away from sunlight.', BX, 20.6, 1.32, { align: 'center' })

  // ---- wear: the print rubbed through to the metal along the base's curve, a few fine scratches
  mm()
  g.fillStyle = P.metal
  for (let i = 0; i < 90; i++) {
    const X = rnd() * C
    const yy = 9 + Math.pow(rnd(), 2.4) * 6.5
    g.beginPath()
    g.ellipse(X, Y(yy), 0.08 + rnd() * 0.42, 0.05 + rnd() * 0.16, (rnd() - 0.5) * 0.4, 0, Math.PI * 2)
    g.fill()
  }
  g.strokeStyle = P.metal
  g.lineCap = 'round'
  for (let i = 0; i < 7; i++) {
    const X = rnd() * C
    const yy = 16 + rnd() * 100
    const a = (rnd() - 0.5) * 0.5
    const l = 2.5 + rnd() * 6
    g.lineWidth = 0.04 + rnd() * 0.04
    g.beginPath()
    g.moveTo(X, Y(yy))
    g.quadraticCurveTo(X + (Math.cos(a) * l) / 2, Y(yy) + Math.sin(a) * l * 0.5 + (rnd() - 0.5) * 0.4, X + Math.cos(a) * l, Y(yy) + Math.sin(a) * l)
    g.stroke()
  }

  // ---- the base: the date and lot, ink-jetted round the dome (read from below)
  const kb = (h * vB) / sB
  const rD = 12
  const st = C / (2 * Math.PI * rD)
  g.save()
  g.setTransform((kx * st) / kb, 0, 0, 1, 0.08 * w, h * (1 - vB) + (sB - rD) * kb)
  g.font = `600 ${(2 * kb).toFixed(2)}px ${family}`
  if ('letterSpacing' in g) g.letterSpacing = '0px'
  g.fillStyle = P.ink
  g.textBaseline = 'middle'
  g.fillText('BB 11.27  L2318 04:12', 0, 0)
  g.restore()
}

/** A radial sprite (alpha by stops [[t, a]], of one colour). */
function sprite(stops, rgb) {
  const c = canvas(64, 64)
  const x = c.getContext('2d')
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  for (const [t, a] of stops) gr.addColorStop(t, `rgba(${rgb},${a})`)
  x.fillStyle = gr
  x.fillRect(0, 0, 64, 64)
  return c
}

/** The condensation: runs (each swept its own track clear) and beads, denser and larger low down. */
function condensation() {
  const { C, hB, hTop } = BODY
  const rnd = lcg(4242)
  const runs = []
  for (let i = 0; i < 3; i++) {
    const X0 = 10 + rnd() * (C - 20)
    const h0 = 52 + rnd() * 50
    const h1 = 12 + rnd() * 22
    const w = 0.45 + rnd() * 0.35
    const pts = []
    let X = X0
    let drift = 0
    // (a run wanders, round the beads it meets, and slows where it thins)
    for (let y = h0; y > h1; y -= 1.2) {
      drift = drift * 0.7 + (rnd() - 0.5) * 0.5
      X += drift
      pts.push([X, y])
    }
    runs.push({ pts, w, end: [X, h1 - 0.4, 1.1 + rnd() * 0.5], top: [X0, h0 + 0.5, 0.45 + rnd() * 0.2] })
  }
  const nearRun = (X, y, r) => {
    for (const run of runs)
      for (const [px, py] of run.pts) if (Math.abs(py - y) < 2 && Math.abs(px - X) < run.w / 2 + r + 0.35) return true
    return false
  }
  // (a grid of 3 mm cells, for overlaps: beads merge rather than overlap)
  const CELL = 3
  const NX = Math.ceil(C / CELL)
  const grid = new Map()
  const beads = []
  const top = hTop - 2
  for (let k = 0; k < 9000 && beads.length < 1500; k++) {
    const X = rnd() * C
    const y = hB + 0.6 + rnd() * (top - hB - 0.6)
    const t = (y - hB) / (top - hB)
    if (rnd() > 0.2 + 0.8 * Math.pow(1 - t, 1.6)) continue
    const low = Math.pow(1 - t, 4)
    let r = 0.2 + 0.42 * Math.pow(rnd(), 2) + 1.05 * low * Math.pow(rnd(), 2.6)
    if (y > 124) r *= 0.7
    if (nearRun(X, y, r)) continue
    // (fewer on the brand's bare letters: water on bright metal shows as dark specks of the room)
    if (Math.abs(X - C / 4 + 2.5) < 14 && y > 26 && y < 98 && rnd() < 0.75) continue
    const cx = Math.floor(X / CELL)
    const cy = Math.floor(y / CELL)
    let ok = true
    for (let dy = -1; dy <= 1 && ok; dy++)
      for (let dx = -1; dx <= 1 && ok; dx++) {
        const list = grid.get(((cx + dx + NX) % NX) + (cy + dy) * NX)
        if (!list) continue
        for (const b of list) {
          let ddx = Math.abs(b[0] - X)
          if (ddx > C / 2) ddx = C - ddx
          if (Math.hypot(ddx, b[1] - y) < b[2] + r + 0.12) {
            ok = false
            break
          }
        }
      }
    if (!ok) continue
    const b = [X, y, r]
    beads.push(b)
    const key = cx + cy * NX
    if (!grid.has(key)) grid.set(key, [])
    grid.get(key).push(b)
  }
  for (const run of runs) beads.push(run.end, run.top)
  return { beads, runs }
}

/** The body's textures: { colour (2048 x 1024, sRGB), finish (1024 x 1024: height r, roughness g, metalness b) }. */
export function bodyTextures(family) {
  const { C, hTop, hB, vB } = BODY
  const Y = (hh) => hTop - hh
  const { beads, runs } = condensation()
  // (a bead's cap: its height a parabola to its edge; its tint, its gloss)
  const cap = sprite(
    [
      [0, 1],
      [0.25, 0.94],
      [0.5, 0.75],
      [0.75, 0.44],
      [0.9, 0.19],
      [1, 0],
    ],
    '255,0,0',
  )
  const wetC = sprite(
    [
      [0, 0.03],
      [0.75, 0.05],
      [0.9, 0.12],
      [1, 0],
    ],
    '120,96,88',
  )
  const wetR = sprite(
    [
      [0, 1],
      [0.82, 1],
      [1, 0],
    ],
    '255,198,255',
  )
  const each = (g, kx, ky, img, alphaOf, grow = 1) => {
    g.setTransform(kx, 0, 0, ky, 0, 0)
    for (const [X, y, r] of beads) {
      g.globalAlpha = alphaOf(r)
      const rr = r * grow
      for (const off of X < rr + 1 ? [0, C] : X > C - rr - 1 ? [0, -C] : [0]) g.drawImage(img, X + off - rr, Y(y) - rr, 2 * rr, 2 * rr)
    }
    g.globalAlpha = 1
  }
  const strokeRuns = (g, style, wGrow) => {
    g.strokeStyle = style
    g.lineCap = 'round'
    g.lineJoin = 'round'
    for (const run of runs) {
      g.lineWidth = run.w + wGrow
      g.beginPath()
      run.pts.forEach(([X, y], i) => (i ? g.lineTo(X, Y(y)) : g.moveTo(X, Y(y))))
      g.stroke()
    }
  }

  // the print: the art, the beads barely darker (their look is their gloss and their shape)
  const colour = canvas(2048, 1024)
  const gc = colour.getContext('2d')
  labelArt(gc, 2048, 1024, 'colour', family)
  gc.globalCompositeOperation = 'multiply'
  each(gc, 2048 / C, (1024 * (1 - vB)) / (hTop - hB), wetC, () => 1)
  gc.globalCompositeOperation = 'source-over'

  // the finish: the art's zones; a small dent low on the back; the beads' caps and the runs' thin
  // film in the height; the water's gloss, kept soft (glossier, curved beads mirror the dim room
  // and read as dark specks, not dew)
  const S = 1024
  const kx = S / C
  const ky = (S * (1 - vB)) / (hTop - hB)
  const finish = canvas(S, S)
  const g = finish.getContext('2d')
  labelArt(g, S, S, 'finish', family)
  g.setTransform(kx, 0, 0, ky, 0, 0)
  {
    const X = C * 0.62
    const y = Y(44)
    const gr = g.createRadialGradient(X, y, 0, X, y, 5)
    gr.addColorStop(0, 'rgba(148,255,255,1)')
    gr.addColorStop(0.45, 'rgba(165,255,255,1)')
    gr.addColorStop(0.8, 'rgba(230,255,255,1)')
    gr.addColorStop(1, 'rgba(255,255,255,1)')
    g.globalCompositeOperation = 'multiply'
    g.fillStyle = gr
    g.save()
    g.translate(X, y)
    g.scale(1, 0.62)
    g.translate(-X, -y)
    g.beginPath()
    g.arc(X, y, 5, 0, Math.PI * 2)
    g.fill()
    g.restore()
    // (its crease: the metal folded a little sharper along one side)
    g.globalCompositeOperation = 'lighter'
    g.strokeStyle = 'rgb(20,0,0)'
    g.lineWidth = 0.35
    g.beginPath()
    g.ellipse(X, y, 4.1, 2.4, 0, 3.6, 5.4)
    g.stroke()
  }
  each(g, kx, ky, cap, (r) => Math.min(1, (r * 40) / 255))
  g.setTransform(kx, 0, 0, ky, 0, 0)
  strokeRuns(g, 'rgb(3,0,0)', 0)
  g.globalCompositeOperation = 'multiply'
  each(g, kx, ky, wetR, () => 1, 1.05)
  g.setTransform(kx, 0, 0, ky, 0, 0)
  strokeRuns(g, 'rgb(255,180,255)', 0.15)
  g.globalCompositeOperation = 'source-over'
  return { colour, finish }
}

/** Draws `fn` (in the lid's mm, x right, z down) blurred `blur` px: drawn far off, its shadow brought back. */
function soft(g, k, S, blur, colour, fn) {
  const OFF = 4 * S
  g.save()
  g.setTransform(k, 0, 0, k, S / 2 - OFF, S / 2)
  g.shadowColor = colour
  g.shadowBlur = blur
  g.shadowOffsetX = OFF
  g.fillStyle = g.strokeStyle = colour
  fn()
  g.restore()
}

/** Text along a circle on the lid (mm; k px a mm), centred at angle a (rad, x towards z), its tops outward. */
function arcText(g, k, s, r, a, size, family, weight = 600) {
  g.font = `${weight} ${(size * k).toFixed(2)}px ${family}`
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  const ws = [...s].map((ch) => (g.measureText(ch).width / k) * 1.12)
  let t = a - ws.reduce((p, q) => p + q, 0) / r / 2
  for (let i = 0; i < ws.length; i++) {
    const am = t + ws[i] / r / 2
    g.save()
    g.translate(Math.cos(am) * r, Math.sin(am) * r)
    g.rotate(am + Math.PI / 2)
    g.scale(1 / k, 1 / k)
    g.fillText(s[i], 0, 0)
    g.restore()
    t += ws[i] / r
  }
}

/**
 * The lid's textures (planar from above, LID_UV mm across, x right, z down the canvas): colour
 * (512, sRGB) and finish (1024: height r, roughness g, metalness b; the score is 0.26 mm wide).
 */
export function lidTextures(family) {
  const op = openingPoints(96)
  const path = (g, pts, s = 1, cx = 12) => {
    g.beginPath()
    pts.forEach((p, i) => {
      const x = cx + (p.x - cx) * s
      const z = p.y * s
      i ? g.lineTo(x, z) : g.moveTo(x, z)
    })
    g.closePath()
  }
  const S = 1024
  const k = S / LID_UV
  const finish = canvas(S, S)
  const g = finish.getContext('2d')
  {
    // bare metal, the coil's rolling lines straight across the whole end (in its height and roughness)
    const rl = canvas(1, S)
    const x = rl.getContext('2d')
    const r = lcg(31)
    let slow = 0
    for (let j = 0; j < S; j++) {
      slow = slow * 0.8 + (r() - 0.5) * 0.4
      x.fillStyle = `rgb(${Math.round(128 + (r() - 0.5) * 0.6 + slow)},${Math.round(84 + (r() - 0.5) * 10 + slow * 8)},255)`
      x.fillRect(0, j, 1, 1)
    }
    g.drawImage(rl, 0, 0, S, S)
  }
  // raised: the deboss round the opening and the rivet, the tongue's own bead inside the score
  g.globalCompositeOperation = 'lighter'
  soft(g, k, S, 9, 'rgb(20,0,0)', () => {
    path(g, op, 1.08, 11)
    g.fill()
    g.beginPath()
    g.arc(0, 0, 5.6, 0, Math.PI * 2)
    g.fill()
    g.fillRect(0, -5.2, 7, 10.4)
  })
  soft(g, k, S, 4, 'rgb(30,0,0)', () => {
    g.lineWidth = 0.65
    path(g, op, 0.76, 12.2)
    g.stroke()
  })
  // embossed lettering behind the tab, the maker's code, the brand
  const emboss = (fn) => soft(g, k, S, 1.6, 'rgb(30,0,0)', fn)
  emboss(() => arcText(g, k, 'PLEASE RECYCLE · ALUMINIUM', 17.6, Math.PI, 1.45, family))
  emboss(() => arcText(g, k, 'B64 · 202 · 3R', 17.6, Math.PI / 2 + 0.25, 1.3, family))
  emboss(() => arcText(g, k, 'late.', 17.4, -Math.PI / 2 - 0.2, 1.7, family, 800))
  // the score: rougher, in a soft shallow channel, the cut itself; and the short score across the
  // hinge, which keeps the tongue on
  g.setTransform(k, 0, 0, k, S / 2, S / 2)
  g.strokeStyle = 'rgb(0,60,0)'
  g.lineWidth = 0.45
  path(g, op)
  g.stroke()
  g.globalCompositeOperation = 'multiply'
  soft(g, k, S, 4, 'rgb(225,255,255)', () => {
    g.lineWidth = 0.9
    path(g, op)
    g.stroke()
  })
  g.setTransform(k, 0, 0, k, S / 2, S / 2)
  g.strokeStyle = 'rgb(128,255,255)'
  g.lineWidth = 0.26
  path(g, op)
  g.stroke()
  g.strokeStyle = 'rgb(190,255,255)'
  g.lineWidth = 0.18
  g.beginPath()
  g.moveTo(5.4, -3.6)
  g.quadraticCurveTo(4.5, 0, 5.4, 3.6)
  g.stroke()
  g.globalCompositeOperation = 'source-over'

  // the colour (512): aluminium, lighter in the panel, the score's line, a few scuffs
  const C2 = 512
  const k2 = C2 / LID_UV
  const colour = canvas(C2, C2)
  const gc = colour.getContext('2d')
  gc.fillStyle = '#c7cace'
  gc.fillRect(0, 0, C2, C2)
  gc.setTransform(k2, 0, 0, k2, C2 / 2, C2 / 2)
  const gr = gc.createRadialGradient(0, 0, 0, 0, 0, 22)
  gr.addColorStop(0, '#d2d5d8')
  gr.addColorStop(1, '#c3c6ca')
  gc.fillStyle = gr
  gc.beginPath()
  gc.arc(0, 0, 22, 0, Math.PI * 2)
  gc.fill()
  gc.strokeStyle = 'rgba(52,50,52,0.5)'
  gc.lineWidth = 0.3
  path(gc, op)
  gc.stroke()
  const r = lcg(5)
  gc.strokeStyle = 'rgba(240,242,244,0.35)'
  gc.lineWidth = 0.08
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2
    const rr = 6 + r() * 14
    const x = Math.cos(a) * rr
    const z = Math.sin(a) * rr
    const b = r() * Math.PI
    const l = 1 + r() * 4
    gc.beginPath()
    gc.moveTo(x, z)
    gc.lineTo(x + Math.cos(b) * l, z + Math.sin(b) * l)
    gc.stroke()
  }
  return { colour, finish }
}

/** Soft masks (white on black, for alphaMap): the tab's shade on the lid (24 mm square, x -16..8). */
export function tabShadeCanvas() {
  const c = canvas(128, 128)
  const g = c.getContext('2d')
  g.fillStyle = '#000'
  g.fillRect(0, 0, 128, 128)
  const k = 128 / 24
  const OFF = 1024
  g.setTransform(k, 0, 0, k, 16 * k - OFF, 12 * k)
  g.shadowColor = '#fff'
  g.shadowBlur = 7
  g.shadowOffsetX = OFF
  g.fillStyle = '#fff'
  tabOutline(g)
  g.fill()
  return c
}

/** The wet ring the cold can leaves on the desk (80 mm square, its middle the can's), and the contact shade. */
export function deskCanvases() {
  const S = 256
  const k = S / 80
  const ring = canvas(S, S)
  const g = ring.getContext('2d')
  g.fillStyle = '#000'
  g.fillRect(0, 0, S, S)
  g.setTransform(k, 0, 0, k, S / 2, S / 2)
  const r = lcg(808)
  // (a film round where the base's curve met the desk, wider and fainter here and there, its edge soft)
  const OFF = 4 * S
  g.setTransform(k, 0, 0, k, S / 2 - OFF, S / 2)
  g.shadowColor = '#fff'
  g.shadowBlur = 3
  g.shadowOffsetX = OFF
  g.strokeStyle = '#fff'
  g.lineCap = 'round'
  for (let i = 0; i < 18; i++) {
    const a0 = (i / 18) * Math.PI * 2
    g.globalAlpha = 0.35 + 0.35 * r()
    g.lineWidth = 1.1 + r() * 1.3
    g.beginPath()
    g.arc(0, 0, 27.2 + (r() - 0.5) * 0.8, a0, a0 + (Math.PI * 2) / 18 + 0.12)
    g.stroke()
  }
  // (a few drops that fell from the base's curve, a little further out)
  g.fillStyle = '#fff'
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2
    const rr = 30.5 + r() * 3.5
    g.globalAlpha = 0.5 + 0.4 * r()
    g.beginPath()
    g.arc(Math.cos(a) * rr, Math.sin(a) * rr, 0.6 + r() * 0.8, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  const C = 128
  const shade = canvas(C, C)
  const gs = shade.getContext('2d')
  const gr = gs.createRadialGradient(C / 2, C / 2, 0, C / 2, C / 2, C / 2)
  // (84 mm across: dark under the base's curve, gone 40 mm out)
  const at = (mm) => mm / 42
  gr.addColorStop(0, '#fff')
  gr.addColorStop(at(26), '#fff')
  gr.addColorStop(at(29.5), '#888')
  gr.addColorStop(at(33), '#333')
  gr.addColorStop(at(37), '#0c0c0c')
  gr.addColorStop(1, '#000')
  gs.fillStyle = gr
  gs.fillRect(0, 0, C, C)
  return { ring, shade }
}
