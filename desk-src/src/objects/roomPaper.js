// What is pinned to the board, drawn on canvases (sRGB): the sticky notes, the calendar's pages, a
// risograph postcard, a ticket stub, a pencil sketch on squared paper, a till receipt and a strip of
// washi tape. Each a little uneven, as things written by hand and printed by old machines are. The
// paper's grain is not drawn here: every sheet shares a fibre normal map (roomTex.js).
// The fonts: CSS families, already loaded (Inter, and a handwriting face).

/** A seeded random: the same board every time. */
export function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
const canvas = (w, h) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace'

/** Handwriting, a line at a time, each line a little uneven. */
function writeLines(g, lines, x, y, size, lead, font, ink, r) {
  g.fillStyle = ink
  g.textBaseline = 'alphabetic'
  for (let i = 0; i < lines.length; i++) {
    g.save()
    g.translate(x + (r() - 0.5) * 6, y + i * lead + (r() - 0.5) * 4)
    g.rotate((r() - 0.5) * 0.035)
    g.font = `600 ${size}px ${font}`
    g.fillText(lines[i], 0, 0)
    g.restore()
  }
}

/** Faint mottling in a sheet's colour (paper is never one flat colour), and its cut edges a hair lighter. */
function paperFace(g, W, H, r, k = 1) {
  for (let i = 0; i < 120; i++) {
    const x = r() * W
    const y = r() * H
    const rad = 14 + 70 * r()
    const gr = g.createRadialGradient(x, y, 0, x, y, rad)
    const c = r() < 0.5 ? '255,255,255' : '90,70,40'
    gr.addColorStop(0, `rgba(${c},${(0.025 * k).toFixed(3)})`)
    gr.addColorStop(1, `rgba(${c},0)`)
    g.fillStyle = gr
    g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad)
  }
  g.strokeStyle = 'rgba(255,255,255,0.3)'
  g.lineWidth = 3
  g.strokeRect(1.5, 1.5, W - 3, H - 3)
}

/** A pencil line: a few faint, slightly different passes along the points (graphite builds up). */
function pencil(g, pts, r, { w = 1.6, a = 0.32, passes = 2, jit = 1.1, close = false } = {}) {
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (let p = 0; p < passes; p++) {
    g.strokeStyle = `rgba(52,54,62,${a})`
    g.lineWidth = w * (0.8 + 0.4 * r())
    g.beginPath()
    const ox = (r() - 0.5) * jit
    const oy = (r() - 0.5) * jit
    pts.forEach(([x, y], i) => {
      const px = x + ox + (r() - 0.5) * jit * 0.6
      const py = y + oy + (r() - 0.5) * jit * 0.6
      if (i === 0) g.moveTo(px, py)
      else g.lineTo(px, py)
    })
    if (close) g.closePath()
    g.stroke()
  }
}
const circlePts = (cx, cy, rad, n = 28, a0 = 0, a1 = Math.PI * 2) => {
  const out = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    out.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad])
  }
  return out
}

/** A torn edge: cut away beyond a ragged line from (x0, y0) to (x1, y1), on the side `side` points to. */
function tear(g, x0, y0, x1, y1, side, r, depth = 5, step = 5) {
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  g.save()
  g.globalCompositeOperation = 'destination-out'
  g.beginPath()
  g.moveTo(x0 + side[0] * 400, y0 + side[1] * 400)
  for (let s = 0; s <= len; s += step * (0.6 + 0.8 * r())) {
    const d = (r() - 0.35) * depth
    g.lineTo(x0 + ux * s + side[0] * d, y0 + uy * s + side[1] * d)
  }
  g.lineTo(x1 + side[0] * 400, y1 + side[1] * 400)
  g.closePath()
  g.fill()
  g.restore()
}

/** A sticky note's face: its colour, the glued band's faint sheen, the handwriting. 512 px for 76 mm. */
export function noteCanvas(color, lines, font, seed) {
  const S = 512
  const c = canvas(S, S)
  const g = c.getContext('2d')
  g.fillStyle = color
  g.fillRect(0, 0, S, S)
  const r = rng(seed)
  paperFace(g, S, S, r)
  // (the glued band at the top: a touch darker, where it has been pressed on and peeled off before)
  const band = g.createLinearGradient(0, 0, 0, 118)
  band.addColorStop(0, 'rgba(0,0,0,0.055)')
  band.addColorStop(0.85, 'rgba(0,0,0,0.03)')
  band.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = band
  g.fillRect(0, 0, S, 118)
  writeLines(g, lines, 46, 140, 72, 82, font, '#262a33', r)
  return c
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/**
 * A calendar page (130 x 180 mm, 4 px a mm): `month` (a Date in it), its days Monday first, `today`
 * ringed by hand in red if it is in this month; `note`, a line in the margin. Punched along the top
 * for its wire binding (transparent).
 */
export function calendarCanvas(month, today, font, handFont, note, seed) {
  const W = 520
  const H = 720
  const c = canvas(W, H)
  const g = c.getContext('2d')
  g.fillStyle = '#f6f4ee'
  g.fillRect(0, 0, W, H)
  const r = rng(seed)
  paperFace(g, W, H, r, 0.7)
  const y = month.getFullYear()
  const m = month.getMonth()
  g.fillStyle = '#20232a'
  g.font = `600 58px ${font}`
  g.textBaseline = 'alphabetic'
  g.fillText(MONTHS[m], 44, 132)
  g.fillStyle = '#8a8f98'
  g.font = `500 30px ${font}`
  g.fillText(String(y), 46, 174)
  g.fillStyle = '#c64a32'
  g.fillRect(46, 196, 56, 4)
  // the grid: Monday first
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const x0 = 44
  const cw = (W - 88) / 7
  const y0 = 258
  const ch = 60 // (six weeks fit above the margin's note: a month can start on a Sunday)
  g.font = `600 20px ${font}`
  for (let k = 0; k < 7; k++) {
    g.fillStyle = k >= 5 ? '#c64a32' : '#8a8f98'
    g.fillText(days[k], x0 + k * cw + 8, y0)
  }
  g.fillStyle = 'rgba(32,35,42,0.12)'
  g.fillRect(x0, y0 + 15, W - 88, 2)
  const first = (new Date(y, m, 1).getDay() + 6) % 7
  const n = new Date(y, m + 1, 0).getDate()
  const ringed = today && today.getFullYear() === y && today.getMonth() === m ? today.getDate() : 0
  g.font = `500 27px ${font}`
  for (let d = 1; d <= n; d++) {
    const k = first + d - 1
    const col = k % 7
    const row = Math.floor(k / 7)
    const cx = x0 + col * cw + 8
    const cy = y0 + 60 + row * ch
    g.fillStyle = col >= 5 ? '#c64a32' : '#2b2f37'
    g.fillText(String(d), cx, cy)
    if (d === ringed) {
      // (ringed by hand: an uneven loop of red marker, twice round and not quite closed)
      g.save()
      g.strokeStyle = 'rgba(205,48,36,0.9)'
      g.lineWidth = 4.5
      g.lineCap = 'round'
      g.beginPath()
      const ox = cx + (d > 9 ? 15 : 8)
      const oy = cy - 10
      for (let t = 0; t <= 1.08; t += 0.02) {
        const a = -2.2 + t * Math.PI * 2
        const rr = 1 + 0.08 * Math.sin(t * 9)
        const px = ox + Math.cos(a) * 30 * rr
        const py = oy + Math.sin(a) * 24 * rr
        if (t === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      g.stroke()
      g.restore()
    }
  }
  if (note) {
    g.save()
    g.translate(50, H - 34)
    g.rotate(-0.03)
    g.fillStyle = '#3a3f4b'
    g.font = `600 36px ${handFont}`
    g.fillText(note, 0, 0)
    g.restore()
  }
  // (punched for the binding: a row of small slots along the top)
  g.save()
  g.globalCompositeOperation = 'destination-out'
  const slots = 15
  for (let k = 0; k < slots; k++) {
    if (k === 7) continue // (the hanger's gap)
    const sx = 26 + (k * (W - 52)) / (slots - 1)
    g.beginPath()
    g.ellipse(sx, 21, 7, 9, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
  return c
}

/**
 * A risograph postcard (148 x 105 mm): the moon over the mare, two inks (teal and coral, a hair out
 * of register), halftone dots, a little rover on the ridge; a white border and a printed caption.
 */
export function postcardCanvas(font) {
  const W = 640
  const H = 454
  const c = canvas(W, H)
  const g = c.getContext('2d')
  g.fillStyle = '#f3eee3'
  g.fillRect(0, 0, W, H)
  const r = rng(91)
  const B = 22
  const IW = W - 2 * B
  const IH = H - 2 * B - 26
  g.save()
  g.beginPath()
  g.rect(B, B, IW, IH)
  g.clip()
  g.globalCompositeOperation = 'multiply'
  // halftone: dots on a grid, each as large as the ink's density there
  // (one path an ink, every dot in it: drawn in one fill)
  const dots = (ink, dens, ox, oy, step, angle) => {
    g.fillStyle = ink
    g.beginPath()
    const ca = Math.cos(angle)
    const sa = Math.sin(angle)
    for (let i = -10; i < (IW + IH) / step + 10; i++)
      for (let j = -10; j < (IW + IH) / step + 10; j++) {
        const gx = i * step
        const gy = j * step
        const x = B + gx * ca - gy * sa
        const y = B + gx * sa + gy * ca - IH * 0.4
        if (x < B - step || x > B + IW + step || y < B - step || y > B + IH + step) continue
        const d = dens(x - B, y - B)
        if (d <= 0.02) continue
        const rad = (step / 2) * Math.sqrt(Math.min(1, d)) * 1.05
        g.moveTo(x + ox + rad, y + oy)
        g.arc(x + ox, y + oy, rad, 0, Math.PI * 2)
      }
    g.fill()
  }
  const moon = [IW * 0.68, IH * 0.32, IH * 0.2]
  const inMoon = (x, y) => Math.hypot(x - moon[0], y - moon[1]) < moon[2]
  const ridge = (x, k) => IH * (0.58 + 0.06 * k) + Math.sin(x * 0.011 + k * 2) * 18 + Math.sin(x * 0.031 + k) * 7
  // teal: the sky, darker up high; the moon knocked out of it, a few craters in it
  dots(
    'rgb(47,112,117)',
    (x, y) => {
      if (inMoon(x, y)) {
        const cr = [
          [0.62, 0.27, 0.035],
          [0.72, 0.36, 0.05],
          [0.66, 0.4, 0.025],
        ]
        for (const [a, b, rad] of cr) if (Math.hypot(x - IW * a, y - IH * b) < IH * rad) return 0.28
        return 0.06
      }
      if (y > ridge(x, 0)) return 0.55
      return 0.95 - (y / IH) * 0.85
    },
    0,
    0,
    6.2,
    0.26,
  )
  // coral: the ground, in bands, and a glow round the horizon
  dots(
    'rgb(230,118,92)',
    (x, y) => {
      if (y > ridge(x, 2)) return 0.95
      if (y > ridge(x, 1)) return 0.62
      if (y > ridge(x, 0)) return 0.34
      return Math.max(0, 0.32 - Math.abs(y - IH * 0.6) / (IH * 0.3)) * 0.8
    },
    2,
    -1.5,
    5.6,
    -0.18,
  )
  // the rover on the middle ridge, its tracks behind it (both inks over each other: near black)
  g.globalCompositeOperation = 'source-over'
  const rx = IW * 0.34
  const ry = ridge(rx, 1) - 1
  g.fillStyle = 'rgba(40,46,52,0.92)'
  g.fillRect(B + rx - 16, B + ry - 13, 32, 9)
  g.fillRect(B + rx + 9, B + ry - 25, 2.5, 13)
  g.fillRect(B + rx + 6, B + ry - 28, 9, 4)
  for (const wx of [-12, 0, 12]) {
    g.beginPath()
    g.arc(B + rx + wx, B + ry - 2, 4, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = 'rgba(40,46,52,0.5)'
  for (let k = 1; k < 14; k++) g.fillRect(B + rx - 20 - k * 9, B + ridge(rx - 20 - k * 9, 1) - 1.5, 4, 1.5)
  g.restore()
  // (the print's grain: a little ink where none was meant, a little missing where it was)
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(243,238,227,0.5)' : 'rgba(47,112,117,0.12)'
    g.fillRect(B + r() * IW, B + r() * IH, 1.5, 1.5)
  }
  g.fillStyle = '#5d5a54'
  g.font = `600 13px ${font}`
  g.textBaseline = 'alphabetic'
  if ('letterSpacing' in g) g.letterSpacing = '2px'
  g.fillText('MARE TRANQUILLITATIS  ·  STUDY No. 3', B, H - 19)
  if ('letterSpacing' in g) g.letterSpacing = '0px'
  paperFace(g, W, H, r, 0.5)
  return c
}

/**
 * A ticket stub (90 x 46 mm, 4.8 px a mm): pale blue card, a navy band, its print, a serial number in
 * red; torn along its perforation on the right; punched near its top left corner for the pin.
 */
export function ticketCanvas(font) {
  const W = 432
  const H = 221
  const c = canvas(W, H)
  const g = c.getContext('2d')
  const r = rng(57)
  g.fillStyle = '#c7d6e3'
  g.fillRect(0, 0, W, H)
  paperFace(g, W, H, r, 0.8)
  g.fillStyle = '#2c4766'
  g.fillRect(0, 0, 92, H)
  g.save()
  g.translate(58, H - 18)
  g.rotate(-Math.PI / 2)
  g.fillStyle = '#e9eef3'
  g.font = `700 25px ${font}`
  if ('letterSpacing' in g) g.letterSpacing = '4px'
  g.fillText('ADMIT ONE', 0, 0)
  g.restore()
  g.fillStyle = '#1f3550'
  g.textBaseline = 'alphabetic'
  if ('letterSpacing' in g) g.letterSpacing = '1px'
  g.font = `800 34px ${font}`
  g.fillText('PLANETARIUM', 112, 64)
  g.font = `600 16px ${font}`
  if ('letterSpacing' in g) g.letterSpacing = '3px'
  g.fillText('THE SKY TONIGHT', 114, 96)
  g.fillStyle = 'rgba(31,53,80,0.35)'
  g.fillRect(114, 112, 262, 2)
  g.fillStyle = '#1f3550'
  g.font = `700 21px ${font}`
  if ('letterSpacing' in g) g.letterSpacing = '1px'
  g.fillText('ROW F', 114, 148)
  g.fillText('SEAT 12', 202, 148)
  g.fillText('21:30', 314, 148)
  g.font = `500 13px ${font}`
  g.fillStyle = 'rgba(31,53,80,0.7)'
  g.fillText('DOME 2  ·  KEEP THIS PART', 114, 182)
  g.save()
  g.translate(404, 34)
  g.rotate(Math.PI / 2)
  g.fillStyle = '#b4463a'
  g.font = `600 15px ${MONO}`
  g.fillText('No 004217', 0, 0)
  g.restore()
  if ('letterSpacing' in g) g.letterSpacing = '0px'
  // (a crease across it, where it was folded into a pocket)
  g.strokeStyle = 'rgba(255,255,255,0.22)'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(250, 0)
  g.lineTo(232, H)
  g.stroke()
  // torn off along the perforation
  tear(g, W - 8, 0, W - 8, H, [1, 0], r, 6, 4)
  g.save()
  g.globalCompositeOperation = 'destination-out'
  for (let y = 6; y < H; y += 13) {
    g.beginPath()
    g.arc(W - 9, y, 2.6, 0, Math.PI * 2)
    g.fill()
  }
  // the pin's hole
  g.beginPath()
  g.arc(26, 26, 9, 0, Math.PI * 2)
  g.fill()
  g.restore()
  return c
}

/**
 * A pencil sketch on squared paper (100 x 124 mm, 4.48 px a mm), torn from a spiral pad: the lunar
 * rover in side view, its rocker-bogie, its mast and its panel, with a dimension and a few notes.
 */
export function sketchCanvas(handFont) {
  const W = 448
  const H = 556
  const c = canvas(W, H)
  const g = c.getContext('2d')
  const r = rng(33)
  g.fillStyle = '#f5f4ee'
  g.fillRect(0, 0, W, H)
  // the squares: 5 mm, every fifth line a little darker
  for (let k = 0; k * 22.4 < W + 1; k++) {
    g.fillStyle = k % 5 ? 'rgba(120,160,190,0.28)' : 'rgba(120,160,190,0.45)'
    g.fillRect(Math.round(k * 22.4), 0, 1.2, H)
  }
  for (let k = 0; k * 22.4 < H + 1; k++) {
    g.fillStyle = k % 5 ? 'rgba(120,160,190,0.28)' : 'rgba(120,160,190,0.45)'
    g.fillRect(0, Math.round(k * 22.4), W, 1.2)
  }
  paperFace(g, W, H, r, 0.6)
  // the drawing (side view, the ground at y = 400)
  const gy = 402
  pencil(g, [[30, gy + 2], [420, gy - 2]], r, { a: 0.12, w: 1.2 })
  // wheels
  const wheels = [92, 214, 344]
  for (const wx of wheels) {
    pencil(g, circlePts(wx, gy - 30, 30), r, { a: 0.36, w: 2 })
    pencil(g, circlePts(wx, gy - 30, 21, 20), r, { a: 0.18, w: 1.2, passes: 1 })
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2
      pencil(g, [[wx + Math.cos(a) * 26, gy - 30 + Math.sin(a) * 26], [wx + Math.cos(a) * 31, gy - 30 + Math.sin(a) * 31]], r, { a: 0.3, w: 1.6, passes: 1 })
    }
    pencil(g, circlePts(wx, gy - 30, 5, 10), r, { a: 0.4, w: 1.8, passes: 1 })
  }
  // the rocker and the bogie
  pencil(g, [[92, gy - 30], [168, gy - 96], [262, gy - 64], [214, gy - 30]], r, { a: 0.4, w: 2.2 })
  pencil(g, [[262, gy - 64], [344, gy - 30]], r, { a: 0.4, w: 2.2 })
  pencil(g, circlePts(168, gy - 96, 6, 10), r, { a: 0.45, w: 2, passes: 1 })
  // the body, hatched
  pencil(g, [[110, gy - 150], [330, gy - 150], [338, gy - 112], [118, gy - 106]], r, { a: 0.42, w: 2.2, close: true })
  for (let k = 0; k < 16; k++) {
    const x = 128 + k * 13
    pencil(g, [[x, gy - 110], [x + 18, gy - 146]], r, { a: 0.14, w: 1.1, passes: 1, jit: 0.6 })
  }
  // the panel on top, its cells
  pencil(g, [[96, gy - 168], [352, gy - 176], [352, gy - 162], [96, gy - 156]], r, { a: 0.38, w: 1.8, close: true })
  for (let k = 1; k < 8; k++) pencil(g, [[96 + k * 32, gy - 168 - k], [96 + k * 32, gy - 157 - k * 0.6]], r, { a: 0.2, w: 1, passes: 1 })
  // the mast and its head
  pencil(g, [[300, gy - 176], [300, gy - 262]], r, { a: 0.42, w: 2.2 })
  pencil(g, [[280, gy - 262], [328, gy - 262], [328, gy - 284], [280, gy - 284]], r, { a: 0.42, w: 2, close: true })
  pencil(g, circlePts(318, gy - 273, 6, 12), r, { a: 0.45, w: 1.6, passes: 1 })
  // the antenna
  pencil(g, [[140, gy - 170], [128, gy - 236]], r, { a: 0.36, w: 1.6 })
  pencil(g, circlePts(127, gy - 240, 5, 10), r, { a: 0.38, w: 1.6, passes: 1 })
  // the dimension under it
  const dy = gy + 26
  pencil(g, [[62, dy], [374, dy]], r, { a: 0.28, w: 1.3, passes: 1 })
  pencil(g, [[62, dy - 9], [62, dy + 9]], r, { a: 0.28, w: 1.3, passes: 1 })
  pencil(g, [[374, dy - 9], [374, dy + 9]], r, { a: 0.28, w: 1.3, passes: 1 })
  pencil(g, [[62, dy], [74, dy - 5], [74, dy + 5], [62, dy]], r, { a: 0.3, w: 1.2, passes: 1 })
  pencil(g, [[374, dy], [362, dy - 5], [362, dy + 5], [374, dy]], r, { a: 0.3, w: 1.2, passes: 1 })
  const hand = (t, x, y, size, rot = 0) => {
    g.save()
    g.translate(x, y)
    g.rotate(rot)
    g.fillStyle = 'rgba(48,50,58,0.78)'
    g.font = `600 ${size}px ${handFont}`
    g.fillText(t, 0, 0)
    g.restore()
  }
  hand('≈ 420', 186, dy + 34, 30, -0.02)
  // notes and their leaders
  pencil(g, [[322, gy - 290], [356, gy - 330], [372, gy - 330]], r, { a: 0.3, w: 1.2, passes: 1 })
  hand('LIDAR', 352, gy - 338, 30, -0.04)
  pencil(g, [[190, gy - 84], [214, gy + 70], [236, gy + 76]], r, { a: 0.26, w: 1.2, passes: 1 })
  hand('rocker-bogie', 238, gy + 84, 28, 0.02)
  hand('v3', 40, 172, 44, -0.06)
  pencil(g, circlePts(58, 158, 32, 26, -0.4, Math.PI * 2 - 0.9), r, { a: 0.3, w: 1.6, passes: 1 })
  hand('keep it light', 40, 92, 32, -0.03)
  pencil(g, [[40, 102], [196, 98]], r, { a: 0.22, w: 1.2, passes: 1 })
  // torn from the pad: the spiral's holes torn open along the top
  tear(g, 0, 16, W, 16, [0, -1], r, 6, 6)
  g.save()
  g.globalCompositeOperation = 'destination-out'
  for (let x = 14; x < W; x += 28) {
    g.beginPath()
    g.ellipse(x + (r() - 0.5) * 2, 14, 7, 9 + r() * 3, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
  return c
}

/** A till receipt (58 x 128 mm, 5 px a mm): thermal print, a little faded, torn off at the bottom. */
export function receiptCanvas() {
  const W = 290
  const H = 640
  const c = canvas(W, H)
  const g = c.getContext('2d')
  const r = rng(71)
  g.fillStyle = '#f3f2ed'
  g.fillRect(0, 0, W, H)
  paperFace(g, W, H, r, 0.6)
  g.textBaseline = 'alphabetic'
  const line = (t, y, size = 17, align = 'left', weight = 500) => {
    g.font = `${weight} ${size}px ${MONO}`
    g.fillStyle = `rgba(40,40,46,${0.62 + 0.25 * r()})`
    const w = g.measureText(t).width
    g.fillText(t, align === 'center' ? (W - w) / 2 : align === 'right' ? W - 22 - w : 22, y)
  }
  line('CAFE LUNA', 58, 26, 'center', 700)
  line('14 HARBOUR ROW', 86, 14, 'center')
  line('13/11  08:42   T04', 112, 14, 'center')
  g.fillStyle = 'rgba(40,40,46,0.4)'
  for (let x = 22; x < W - 22; x += 8) g.fillRect(x, 130, 4, 1.5)
  line('FLAT WHITE', 170)
  line('3.40', 170, 17, 'right')
  line('CROISSANT', 200)
  line('2.80', 200, 17, 'right')
  line('OAT  +0.40', 230)
  line('0.40', 230, 17, 'right')
  g.fillStyle = 'rgba(40,40,46,0.4)'
  for (let x = 22; x < W - 22; x += 8) g.fillRect(x, 252, 4, 1.5)
  line('TOTAL', 292, 22, 'left', 700)
  line('6.60', 292, 22, 'right', 700)
  line('CARD ****0412', 324, 14)
  line('thank you!', 380, 17, 'center')
  // a barcode
  for (let x = 40, k = 0; x < W - 40; k++) {
    const w = 1 + Math.floor(r() * 3)
    if (k % 2 === 0) {
      g.fillStyle = 'rgba(30,30,36,0.7)'
      g.fillRect(x, 420, w, 52)
    }
    x += w + 1
  }
  // (thermal print fades from its edge in)
  const fade = g.createLinearGradient(W, 0, W * 0.55, 0)
  fade.addColorStop(0, 'rgba(243,242,237,0.55)')
  fade.addColorStop(1, 'rgba(243,242,237,0)')
  g.fillStyle = fade
  g.fillRect(0, 0, W, H)
  tear(g, 0, H - 10, W, H - 10, [0, 1], r, 7, 5)
  return c
}

/** Washi tape (15 x 52 mm): a soft rose paper tape with a fine print, torn at both ends. */
export function tapeCanvas() {
  const W = 96
  const H = 333
  const c = canvas(W, H)
  const g = c.getContext('2d')
  const r = rng(13)
  g.fillStyle = 'rgba(214,160,150,0.86)'
  g.fillRect(0, 0, W, H)
  g.fillStyle = 'rgba(255,248,240,0.75)'
  for (let y = 8; y < H; y += 16)
    for (let x = (y / 16) % 2 ? 10 : 18; x < W; x += 16) {
      g.beginPath()
      g.arc(x, y, 2.6, 0, Math.PI * 2)
      g.fill()
    }
  // (its fibres: a little lighter and darker streaks along it)
  for (let i = 0; i < 160; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(120,70,60,0.06)'
    g.fillRect(r() * W, r() * H, 1, 10 + 30 * r())
  }
  tear(g, 0, 8, W, 8, [0, -1], r, 7, 4)
  tear(g, 0, H - 8, W, H - 8, [0, 1], r, 7, 4)
  return c
}
