// A thin silver laptop in the style of a 13-inch aluminium notebook (no maker's mark): a
// unibody base with black keys and a glass trackpad, the lid open at 110 degrees, a black glass
// face with a notch, and on its display a browser with the owner's projects, a tab each.
// Frame: x across (its width), z towards the person at it (the hinge at -z), y up; on y = 0.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export const LAPTOP = { w: 304, d: 215, base: 6.4, lid: 4.6, lidD: 212, r: 9.5, open: THREE.MathUtils.degToRad(110) }
// the display, in the lid's face (mm from the lid's left and its top edge)
const DISP = { x: 7.4, y: 9.5, w: 289.2, h: 188 }
const NOTCH = { w: 31, h: 5.6 }

/** A rounded rectangle (centred), as a Shape. */
function rrShape(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}
/** A slab with a soft edge all round: an extruded rounded rectangle, lying flat (y up), its top at
 * y = t, the shape's x across and its y along -z (so the uv of the top runs as the plan reads). */
function slab(w, d, t, r, bevel) {
  const g = new THREE.ExtrudeGeometry(rrShape(w, d, r), { depth: t - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 })
  g.translate(0, 0, bevel)
  g.rotateX(-Math.PI / 2)
  return g
}

/** Rounded-rectangle path on a 2D context. */
function rr(g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}
/** Text cut to a width (with an ellipsis), on its own lines (a crude wrap). */
function wrap(g, text, x, y, maxW, lead, maxLines = 4) {
  const words = text.split(' ')
  let line = ''
  let n = 0
  for (let i = 0; i < words.length; i++) {
    const t = line ? line + ' ' + words[i] : words[i]
    if (g.measureText(t).width > maxW && line) {
      g.fillText(n === maxLines - 1 ? line + '…' : line, x, y + n * lead)
      n++
      if (n >= maxLines) return n
      line = words[i]
    } else line = t
  }
  if (line) g.fillText(line, x, y + n * lead)
  return n + 1
}
/** How many lines `wrap` would take for text in maxW (nothing drawn). */
function measureLines(g, text, maxW) {
  let line = ''
  let n = 1
  for (const word of text.split(' ')) {
    const t = line ? line + ' ' + word : word
    if (g.measureText(t).width > maxW && line) {
      n++
      line = word
    } else line = t
  }
  return n
}

// ---- the projects' pages, each in its own look (drawn, not screenshots)
const THEMES = {
  bodymap: { bg: '#f6f8fb', ink: '#0f172a', sub: '#475569', accent: '#e0464e', soft: '#e6ecf4' },
  'codebase-tavern': { bg: '#1c1410', ink: '#f5e6c8', sub: '#c8ad84', accent: '#f0a33a', soft: '#2c2019' },
  'lunar-rover': { bg: '#0d1117', ink: '#e6edf3', sub: '#8b949e', accent: '#58a6ff', soft: '#161b22' },
  cropscan: { bg: '#f3f8f0', ink: '#14301f', sub: '#4d6b57', accent: '#2f9e55', soft: '#e1eedb' },
}

function drawBodyMap(g, x, y, w, h, th, font) {
  // a figure, front on, its findings pinned and glowing by severity
  const cx = x + w * 0.73
  const top = y + 46
  const s = h / 560
  g.save()
  g.fillStyle = '#dfe6ef'
  g.strokeStyle = '#c3cfdd'
  g.lineWidth = 2
  const part = (px, py, rx, ry) => {
    g.beginPath()
    g.ellipse(cx + px * s, top + py * s, rx * s, ry * s, 0, 0, Math.PI * 2)
    g.fill()
    g.stroke()
  }
  part(0, 40, 34, 40) // head
  part(0, 170, 70, 95) // chest
  part(0, 300, 58, 70) // belly
  part(-92, 190, 18, 92) // arms
  part(92, 190, 18, 92)
  part(-34, 450, 26, 110) // legs
  part(34, 450, 26, 110)
  const dot = (px, py, col, r) => {
    const gx = cx + px * s
    const gy = top + py * s
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r * 3 * s)
    gr.addColorStop(0, col)
    gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr
    g.beginPath()
    g.arc(gx, gy, r * 3 * s, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = col
    g.beginPath()
    g.arc(gx, gy, r * s, 0, Math.PI * 2)
    g.fill()
  }
  dot(-24, 165, '#e0464e', 9)
  dot(28, 290, '#f0a33a', 8)
  dot(-34, 470, '#33b07a', 7)
  dot(4, 52, '#f0a33a', 6)
  // (a finding's card beside the body)
  g.fillStyle = '#ffffff'
  g.shadowColor = 'rgba(15,23,42,0.12)'
  g.shadowBlur = 18
  rr(g, cx - 250 * s - 120, top + 120 * s, 190, 92, 14)
  g.fill()
  g.shadowBlur = 0
  g.fillStyle = '#e0464e'
  g.beginPath()
  g.arc(cx - 250 * s - 98, top + 120 * s + 26, 6, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = th.ink
  g.font = `600 17px ${font}`
  g.fillText('Hemoglobin  10.9', cx - 250 * s - 84, top + 120 * s + 32)
  g.fillStyle = th.sub
  g.font = `400 14px ${font}`
  g.fillText('Below range (13 – 17 g/dL):', cx - 250 * s - 104, top + 120 * s + 58)
  g.fillText('a little low, explained', cx - 250 * s - 104, top + 120 * s + 77)
  g.restore()
}
function drawTavern(g, x, y, w, h, th, font) {
  // the modules as characters round a table, a speech bubble citing a line
  const cx = x + w * 0.7
  const cy = y + h * 0.5
  const ppl = [
    ['auth.ts', -170, -120, '#f0a33a'],
    ['db.py', 150, -140, '#d96a3a'],
    ['api/routes', -190, 110, '#c99a4a'],
    ['cache.go', 170, 120, '#e8c06a'],
    ['main.rs', 0, 190, '#b8653a'],
  ]
  g.save()
  g.strokeStyle = 'rgba(240,163,58,0.25)'
  g.lineWidth = 2
  for (let i = 0; i < ppl.length; i++)
    for (let j = i + 1; j < ppl.length; j++) {
      if ((i + j) % 2) continue
      g.beginPath()
      g.moveTo(cx + ppl[i][1], cy + ppl[i][2])
      g.lineTo(cx + ppl[j][1], cy + ppl[j][2])
      g.stroke()
    }
  g.fillStyle = '#3a2a1e'
  g.beginPath()
  g.ellipse(cx, cy, 120, 70, 0, 0, Math.PI * 2)
  g.fill()
  for (const [name, px, py, col] of ppl) {
    g.fillStyle = col
    g.beginPath()
    g.arc(cx + px, cy + py, 26, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#1c1410'
    g.beginPath()
    g.arc(cx + px - 8, cy + py - 4, 3.5, 0, Math.PI * 2)
    g.arc(cx + px + 8, cy + py - 4, 3.5, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = th.sub
    g.font = `500 14px ${font}`
    g.textAlign = 'center'
    g.fillText(name, cx + px, cy + py + 46)
    g.textAlign = 'left'
  }
  g.fillStyle = '#f5e6c8'
  rr(g, cx - 330, cy - 230, 260, 64, 12)
  g.fill()
  g.fillStyle = '#1c1410'
  g.font = `600 15px ${font}`
  g.fillText('“Not me. The bug is in', cx - 316, cy - 204)
  g.fillText('  db.py:142, see the retry.”', cx - 316, cy - 182)
  g.restore()
}
function drawRover(g, x, y, w, h, th, font) {
  // a repository page: the files, then the map the rover built and its telemetry
  const fx = x + 40
  let fy = y + 28
  g.save()
  g.fillStyle = th.soft
  rr(g, fx, fy, w * 0.52, 196, 10)
  g.fill()
  g.font = `500 15px ${font}`
  const files = ['rover_description/', 'rover_navigation/', 'habitat_monitor/', 'launch/', 'README.md']
  files.forEach((f, i) => {
    g.fillStyle = i < 4 ? th.accent : th.ink
    g.fillText(f, fx + 22, fy + 34 + i * 34)
    g.fillStyle = th.sub
    g.fillText(i < 4 ? 'feat: Nav2 goals, EKF fusion' : 'docs', fx + w * 0.22, fy + 34 + i * 34)
  })
  fy += 220
  // the map
  const mx = fx
  const my = fy
  const mw = w * 0.52
  const mh = h - (fy - y) - 24
  g.fillStyle = '#0a0f15'
  rr(g, mx, my, mw, mh, 10)
  g.fill()
  g.strokeStyle = 'rgba(88,166,255,0.12)'
  g.lineWidth = 1
  for (let gx = mx + 20; gx < mx + mw; gx += 26) {
    g.beginPath()
    g.moveTo(gx, my)
    g.lineTo(gx, my + mh)
    g.stroke()
  }
  for (let gy = my + 20; gy < my + mh; gy += 26) {
    g.beginPath()
    g.moveTo(mx, gy)
    g.lineTo(mx + mw, gy)
    g.stroke()
  }
  g.fillStyle = 'rgba(230,237,243,0.75)'
  for (const [rx, ry, rad] of [
    [0.2, 0.3, 14],
    [0.62, 0.22, 20],
    [0.75, 0.68, 12],
    [0.33, 0.72, 9],
  ]) {
    g.beginPath()
    g.arc(mx + rx * mw, my + ry * mh, rad, 0, Math.PI * 2)
    g.fill()
  }
  g.strokeStyle = th.accent
  g.lineWidth = 3
  g.setLineDash([8, 6])
  g.beginPath()
  g.moveTo(mx + 0.08 * mw, my + 0.85 * mh)
  g.bezierCurveTo(mx + 0.4 * mw, my + 0.95 * mh, mx + 0.45 * mw, my + 0.45 * mh, mx + 0.86 * mw, my + 0.4 * mh)
  g.stroke()
  g.setLineDash([])
  // telemetry
  const tx = x + w * 0.62
  const items = [
    ['O₂', '20.9 %', 'NOMINAL', '#3fb950'],
    ['Temp', '21.4 °C', 'NOMINAL', '#3fb950'],
    ['Pressure', '99.1 kPa', 'WARNING', '#d29922'],
    ['Localization', 'EKF + SLAM', 'OK', '#3fb950'],
  ]
  items.forEach(([k, v, st, col], i) => {
    const ty = y + 40 + i * 104
    g.fillStyle = th.soft
    rr(g, tx, ty, w * 0.33, 86, 10)
    g.fill()
    g.fillStyle = th.sub
    g.font = `500 15px ${font}`
    g.fillText(k, tx + 18, ty + 30)
    g.fillStyle = th.ink
    g.font = `600 26px ${font}`
    g.fillText(v, tx + 18, ty + 66)
    g.fillStyle = col
    g.font = `600 13px ${font}`
    g.fillText(st, tx + w * 0.33 - 18 - g.measureText(st).width, ty + 30)
  })
  g.restore()
}
function drawCrop(g, x, y, w, h, th, font) {
  // a leaf, scanned: its outline, a box round the lesions and the top predictions
  const cx = x + w * 0.62
  const cy = y + h * 0.48
  g.save()
  g.fillStyle = '#5fae5a'
  g.beginPath()
  g.moveTo(cx - 170, cy + 120)
  g.bezierCurveTo(cx - 180, cy - 60, cx - 40, cy - 190, cx + 150, cy - 170)
  g.bezierCurveTo(cx + 170, cy + 10, cx + 40, cy + 150, cx - 170, cy + 120)
  g.fill()
  g.strokeStyle = '#3f8a3c'
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(cx - 170, cy + 120)
  g.quadraticCurveTo(cx - 10, cy - 10, cx + 150, cy - 170)
  g.stroke()
  g.fillStyle = '#8a6a2e'
  for (const [px, py, rad] of [
    [-40, 10, 12],
    [-12, 40, 8],
    [10, -30, 10],
    [-62, 52, 7],
  ]) {
    g.beginPath()
    g.arc(cx + px, cy + py, rad, 0, Math.PI * 2)
    g.fill()
  }
  g.strokeStyle = '#e0464e'
  g.lineWidth = 3
  g.strokeRect(cx - 90, cy - 60, 120, 130)
  g.fillStyle = '#e0464e'
  g.font = `600 14px ${font}`
  g.fillText('lesions', cx - 88, cy - 68)
  // predictions
  const px = x + 44
  const py = y + h * 0.56
  const preds = [
    ['Tomato · early blight', 0.94],
    ['Tomato · late blight', 0.04],
    ['Tomato · healthy', 0.01],
  ]
  preds.forEach(([k, v], i) => {
    g.fillStyle = th.ink
    g.font = `500 16px ${font}`
    g.fillText(k, px, py + i * 54)
    g.fillStyle = th.soft
    rr(g, px, py + 12 + i * 54, w * 0.3, 10, 5)
    g.fill()
    g.fillStyle = i ? '#9cc9a4' : th.accent
    rr(g, px, py + 12 + i * 54, Math.max(10, w * 0.3 * v), 10, 5)
    g.fill()
    g.fillStyle = th.sub
    g.fillText(`${Math.round(v * 100)}%`, px + w * 0.3 + 12, py + 22 + i * 54)
  })
  g.restore()
}
const ART = { bodymap: drawBodyMap, 'codebase-tavern': drawTavern, 'lunar-rover': drawRover, cropscan: drawCrop }

/** The display (sRGB, W x H px): a dusk wallpaper, the menu bar, a browser at the project. */
export function drawDisplay(c, projects, active, font) {
  const g = c.getContext('2d')
  const W = c.width
  const H = c.height
  const k = W / 1600
  g.setTransform(k, 0, 0, k, 0, 0)
  const w = 1600
  const h = H / k
  // wallpaper
  const wp = g.createLinearGradient(0, 0, w, h)
  wp.addColorStop(0, '#2b2540')
  wp.addColorStop(0.55, '#5b4a6e')
  wp.addColorStop(1, '#d98f6b')
  g.fillStyle = wp
  g.fillRect(0, 0, w, h)
  // the menu bar (the notch sits in its middle)
  g.fillStyle = 'rgba(12,12,16,0.82)'
  g.fillRect(0, 0, w, 34)
  g.fillStyle = 'rgba(255,255,255,0.88)'
  g.font = `600 17px ${font}`
  g.fillText('Browser', 52, 23)
  g.font = `400 17px ${font}`
  ;['File', 'Edit', 'View', 'History', 'Window'].forEach((t, i) => g.fillText(t, 140 + i * 74, 23))
  const now = new Date()
  const hh = now.getHours() % 12 || 12
  const mm = String(now.getMinutes()).padStart(2, '0')
  const clock = `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()]} ${hh}:${mm} ${now.getHours() < 12 ? 'AM' : 'PM'}`
  g.fillText(clock, w - 34 - g.measureText(clock).width, 23)
  // the window
  const wx = 46
  const wy = 58
  const ww = w - 92
  const wh = h - 58 - 34
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.45)'
  g.shadowBlur = 40
  g.shadowOffsetY = 12
  g.fillStyle = '#23252b'
  rr(g, wx, wy, ww, wh, 14)
  g.fill()
  g.restore()
  // tab strip
  g.save()
  rr(g, wx, wy, ww, wh, 14)
  g.clip()
  g.fillStyle = '#1b1d22'
  g.fillRect(wx, wy, ww, 50)
  ;['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
    g.fillStyle = col
    g.beginPath()
    g.arc(wx + 26 + i * 22, wy + 25, 7, 0, Math.PI * 2)
    g.fill()
  })
  const tabW = Math.min(250, (ww - 120) / projects.length)
  projects.forEach((p, i) => {
    const tx = wx + 100 + i * (tabW + 6)
    const on = i === active
    g.fillStyle = on ? '#2f3239' : 'rgba(255,255,255,0.04)'
    rr(g, tx, wy + 9, tabW, 34, 9)
    g.fill()
    const th = THEMES[p.id] || THEMES.bodymap
    g.fillStyle = th.accent
    g.beginPath()
    g.arc(tx + 18, wy + 26, 6, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = on ? '#f1f2f4' : '#9aa0aa'
    g.font = `500 15px ${font}`
    let t = p.name
    while (g.measureText(t).width > tabW - 48 && t.length > 4) t = t.slice(0, -2)
    if (t !== p.name) t = t.trimEnd() + '…'
    g.fillText(t, tx + 32, wy + 31)
  })
  // address bar
  g.fillStyle = '#2f3239'
  g.fillRect(wx, wy + 50, ww, 50)
  const p = projects[active]
  const url = (p.live || p.github || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  g.fillStyle = '#1b1d22'
  rr(g, wx + 140, wy + 59, ww - 280, 32, 16)
  g.fill()
  // (a padlock, drawn)
  g.strokeStyle = '#9aa0aa'
  g.fillStyle = '#9aa0aa'
  g.lineWidth = 2
  g.beginPath()
  g.arc(wx + 163, wy + 72, 4.5, Math.PI, 0)
  g.stroke()
  g.fillRect(wx + 157, wy + 72, 12, 9)
  g.fillStyle = '#e8eaee'
  g.font = `500 15px ${font}`
  g.fillText(url, wx + 184, wy + 81)
  // back, forward, reload
  g.strokeStyle = '#9aa0aa'
  g.lineWidth = 2.2
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(wx + 32, wy + 68)
  g.lineTo(wx + 25, wy + 75)
  g.lineTo(wx + 32, wy + 82)
  g.moveTo(wx + 58, wy + 68)
  g.lineTo(wx + 65, wy + 75)
  g.lineTo(wx + 58, wy + 82)
  g.stroke()
  g.beginPath()
  g.arc(wx + 102, wy + 75, 7, -Math.PI * 0.35, Math.PI * 1.45)
  g.stroke()
  g.beginPath()
  g.moveTo(wx + 104, wy + 64)
  g.lineTo(wx + 108, wy + 69)
  g.lineTo(wx + 102, wy + 71)
  g.stroke()
  // the page
  const th = THEMES[p.id] || THEMES.bodymap
  const px = wx
  const py = wy + 100
  const pw = ww
  const ph = wh - 100
  g.fillStyle = th.bg
  g.fillRect(px, py, pw, ph)
  // its own header
  g.fillStyle = th.accent
  g.beginPath()
  g.arc(px + 46, py + 38, 10, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = th.ink
  g.font = `700 20px ${font}`
  g.fillText(p.name, px + 66, py + 45)
  g.fillStyle = th.sub
  g.font = `500 15px ${font}`
  const nav = p.live ? ['How it works', 'Privacy', 'GitHub'] : ['Code', 'Issues', 'README']
  nav.forEach((t, i) => g.fillText(t, px + pw - 320 + i * 110, py + 44))
  g.fillStyle = th.soft
  g.fillRect(px, py + 72, pw, 2)
  // the hero: the project's own words on the left, its picture on the right
  const hx = px + 46
  const hy = py + 150
  g.fillStyle = th.ink
  g.font = `700 52px ${font}`
  const lines = wrap(g, p.name, hx, hy, pw * 0.42, 60, 2)
  g.fillStyle = th.sub
  g.font = `400 21px ${font}`
  const n2 = wrap(g, p.oneLiner, hx, hy + lines * 60 + 12, pw * 0.4, 31, 4)
  const by = hy + lines * 60 + 12 + n2 * 31 + 26
  g.fillStyle = th.accent
  rr(g, hx, by, 196, 50, 25)
  g.fill()
  g.fillStyle = th.bg
  g.font = `600 17px ${font}`
  g.fillText(p.live ? 'Try it live' : 'View the code', hx + 30, by + 31)
  g.strokeStyle = th.sub
  g.lineWidth = 1.5
  rr(g, hx + 212, by, 150, 50, 25)
  g.stroke()
  g.fillStyle = th.ink
  g.fillText(p.live ? 'GitHub' : 'README', hx + 250, by + 31)
  // its stack
  g.font = `500 14px ${font}`
  let sx = hx
  const sy = by + 92
  for (const s of p.stack.slice(0, 5)) {
    const tw = g.measureText(s).width + 26
    if (sx + tw > hx + pw * 0.44) break
    g.fillStyle = th.soft
    rr(g, sx, sy, tw, 32, 16)
    g.fill()
    g.fillStyle = th.sub
    g.fillText(s, sx + 13, sy + 21)
    sx += tw + 8
  }
  // below the fold: what was hard, from the project's own notes (as many cards as fit)
  const bottom = py + ph - 26
  let cy = sy + 84
  const cw = pw * 0.42
  if ((p.challenges || []).length && cy + 90 < bottom) {
    g.fillStyle = th.sub
    g.font = `600 13px ${font}`
    g.fillText('UNDER THE HOOD', hx, cy)
    cy += 20
    for (const text of p.challenges) {
      g.font = `400 16px ${font}`
      // (measured first: its height from the lines it wraps to, at most three)
      const lines = Math.min(3, measureLines(g, text, cw - 58))
      const chh = 30 + lines * 24
      if (cy + chh > bottom) break
      g.fillStyle = th.soft
      rr(g, hx, cy, cw, chh, 12)
      g.fill()
      g.fillStyle = th.accent
      rr(g, hx + 18, cy + 20, 4, chh - 40 + 8, 2)
      g.fill()
      g.fillStyle = th.ink
      wrap(g, text, hx + 38, cy + 33, cw - 58, 24, 3)
      cy += chh + 12
    }
  }
  ;(ART[p.id] || drawBodyMap)(g, px + pw * 0.46, py + 80, pw * 0.54, ph - 80, th, font)
  g.restore()
  // the dock's hint, below the window
  g.fillStyle = 'rgba(255,255,255,0.16)'
  rr(g, w / 2 - 170, h - 26, 340, 18, 9)
  g.fill()
  g.setTransform(1, 0, 0, 1, 0, 0)
}

/**
 * The laptop at `at` (world, on the desk at its height), turned `yaw`. projects: portfolio.ts's;
 * font: a loaded CSS family for the display. Returns { group, meshes, screen, center(out),
 * screenCenter(out), screenNormal(out), tab, nextTab(), materials, dispose() }.
 */
export function createLaptop({ at, yaw, projects, font, anisotropy = 4 }) {
  const L = LAPTOP
  const group = new THREE.Group()
  group.position.set(at[0], at[1], at[2])
  group.rotation.y = yaw
  const geometries = []
  const materials = []
  const textures = []

  // ---- materials
  // (anodised, bead-blasted: a little of the room's light scattered too, so it stays silver at dusk)
  const alu = new THREE.MeshPhysicalMaterial({ color: 0xdadde1, metalness: 0.72, roughness: 0.38, clearcoat: 0.15, clearcoatRoughness: 0.4 })
  const aluDark = new THREE.MeshPhysicalMaterial({ color: 0xb9bdc3, metalness: 1, roughness: 0.42 })
  const keyMat = new THREE.MeshPhysicalMaterial({ color: 0x18191c, roughness: 0.55, metalness: 0, sheen: 0.3, sheenRoughness: 0.6, sheenColor: 0x2a2c31 })
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x060607, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 0.8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })
  const pad = new THREE.MeshPhysicalMaterial({ color: 0xc9cdd3, metalness: 0.9, roughness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })
  const hinge = new THREE.MeshPhysicalMaterial({ color: 0x3c3f45, metalness: 0.8, roughness: 0.5 })
  materials.push(alu, aluDark, keyMat, glass, pad, hinge)

  // ---- the base: a slab, its back edge (the hinge) at z = -d/2
  const baseGeo = slab(L.w, L.d, L.base, L.r, 1.4)
  geometries.push(baseGeo)
  const base = new THREE.Mesh(baseGeo, alu)
  // the keyboard well: a shallow dark recess the keys stand in
  const kbW = 278
  const kbD = 106
  const kbZ = -L.d / 2 + 12 + kbD / 2
  const wellGeo = new THREE.PlaneGeometry(kbW + 2, kbD + 2).rotateX(-Math.PI / 2)
  wellGeo.translate(0, L.base + 0.02, kbZ)
  geometries.push(wellGeo)
  const wellMat = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })
  materials.push(wellMat)
  const well = new THREE.Mesh(wellGeo, wellMat)
  // the keys: six rows, a short function row, the arrows' half keys at the end of the last
  const rows = [
    { h: 9, keys: [1.55, ...Array(12).fill(1), 1] },
    { h: 16.3, keys: [...Array(13).fill(1), 1.55] },
    { h: 16.3, keys: [1.55, ...Array(13).fill(1)] },
    { h: 16.3, keys: [1.85, ...Array(11).fill(1), 1.85] },
    { h: 16.3, keys: [2.4, ...Array(10).fill(1), 2.4] },
    { h: 16.3, keys: [1, 1, 1, 1.25, 5.1, 1.25, 1, 'arrows'] },
  ]
  const pitch = 18.9
  const keyGeo = new RoundedBoxGeometry(1, 0.9, 1, 2, 0.32)
  geometries.push(keyGeo)
  const placed = []
  {
    let z = kbZ - kbD / 2 + 2
    for (const row of rows) {
      const units = row.keys.reduce((a, u) => a + (u === 'arrows' ? 3 : u), 0)
      const scale = (kbW - 4) / (units * pitch)
      let x = -kbW / 2 + 2
      for (const u of row.keys) {
        if (u === 'arrows') {
          const kw = pitch * scale - 2.4
          const half = (row.h - 1.2) / 2
          // ← and →, full width and half height; ↑ ↓ stacked
          placed.push([x + kw / 2, z + row.h / 2 + half / 2 + 0.3, kw, half])
          placed.push([x + pitch * scale + kw / 2, z + half / 2, kw, half])
          placed.push([x + pitch * scale + kw / 2, z + row.h - half / 2, kw, half])
          placed.push([x + 2 * pitch * scale + kw / 2, z + row.h / 2 + half / 2 + 0.3, kw, half])
          x += 3 * pitch * scale
          continue
        }
        const kw = u * pitch * scale - 2.4
        placed.push([x + kw / 2 + 1.2, z + row.h / 2, kw, row.h - 2.2])
        x += u * pitch * scale
      }
      z += row.h + 2.6
    }
  }
  const keys = new THREE.InstancedMesh(keyGeo, keyMat, placed.length)
  {
    const m4 = new THREE.Matrix4()
    placed.forEach(([x, z, w, d], i) => {
      m4.makeScale(w, 1, d).setPosition(x, L.base + 0.45, z)
      keys.setMatrixAt(i, m4)
    })
    keys.instanceMatrix.needsUpdate = true
  }
  // the trackpad: glass, flush, a hair glossier than the deck
  const tpGeo = new THREE.ShapeGeometry(rrShape(132, 82, 5), 8).rotateX(-Math.PI / 2)
  tpGeo.translate(0, L.base + 0.03, L.d / 2 - 9 - 41)
  geometries.push(tpGeo)
  const trackpad = new THREE.Mesh(tpGeo, pad)
  // the hinge: a dark barrel along the back
  const hingeGeo = new THREE.CylinderGeometry(3.4, 3.4, L.w - 46, 20).rotateZ(Math.PI / 2)
  hingeGeo.translate(0, L.base + 1.6, -L.d / 2 + 2.4)
  geometries.push(hingeGeo)
  const hingeMesh = new THREE.Mesh(hingeGeo, hinge)

  // ---- the lid: hinged at the back edge, open; its face (glass, display) towards the person
  const lid = new THREE.Group()
  lid.position.set(0, L.base + 1.6, -L.d / 2 + 2.4)
  // (upright it would stand at 90 degrees: open to 110, it leans back by the difference)
  lid.rotation.x = -(L.open - Math.PI / 2)
  const lidGeo = slab(L.w, L.lidD, L.lid, L.r, 1.1)
  // (the slab lies with its top at y = lid: stood up, its face (y = 0 side) towards the person)
  lidGeo.rotateX(Math.PI / 2)
  lidGeo.translate(0, L.lidD / 2, 0)
  geometries.push(lidGeo)
  const lidShell = new THREE.Mesh(lidGeo, alu)
  lidShell.position.z = -L.lid
  // the face: black glass over the whole inside of the lid, the display in it
  const faceGeo = new THREE.ShapeGeometry(rrShape(L.w - 1.2, L.lidD - 1.2, L.r - 0.6), 10)
  // (a quarter of a millimetre proud of the shell: at a desk's distance, closer is one depth step)
  faceGeo.translate(0, L.lidD / 2, 0.25)
  geometries.push(faceGeo)
  const face = new THREE.Mesh(faceGeo, glass)
  // the display: its own canvas, a browser
  const dispCanvas = document.createElement('canvas')
  dispCanvas.width = 2048
  dispCanvas.height = Math.round((2048 * DISP.h) / DISP.w)
  let tab = 0
  drawDisplay(dispCanvas, projects, tab, font)
  const dispTex = new THREE.CanvasTexture(dispCanvas)
  dispTex.colorSpace = THREE.SRGBColorSpace
  dispTex.anisotropy = anisotropy
  textures.push(dispTex)
  // (the notch: cut from the display's top edge)
  const dShape = new THREE.Shape()
  {
    const w = DISP.w
    const h = DISP.h
    const x0 = -w / 2
    const r = 7
    dShape.moveTo(x0, 0)
    dShape.lineTo(x0 + w, 0)
    dShape.lineTo(x0 + w, h - r)
    dShape.quadraticCurveTo(x0 + w, h, x0 + w - r, h)
    dShape.lineTo(NOTCH.w / 2 + 1.5, h)
    dShape.quadraticCurveTo(NOTCH.w / 2, h, NOTCH.w / 2, h - 1.5)
    dShape.lineTo(NOTCH.w / 2, h - NOTCH.h + 2)
    dShape.quadraticCurveTo(NOTCH.w / 2, h - NOTCH.h, NOTCH.w / 2 - 2, h - NOTCH.h)
    dShape.lineTo(-NOTCH.w / 2 + 2, h - NOTCH.h)
    dShape.quadraticCurveTo(-NOTCH.w / 2, h - NOTCH.h, -NOTCH.w / 2, h - NOTCH.h + 2)
    dShape.lineTo(-NOTCH.w / 2, h - 1.5)
    dShape.quadraticCurveTo(-NOTCH.w / 2, h, -NOTCH.w / 2 - 1.5, h)
    dShape.lineTo(x0 + r, h)
    dShape.quadraticCurveTo(x0, h, x0, h - r)
    dShape.lineTo(x0, 0)
  }
  const dispGeo = new THREE.ShapeGeometry(dShape, 6)
  {
    const p = dispGeo.attributes.position
    const uv = dispGeo.attributes.uv
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + DISP.w / 2) / DISP.w, p.getY(i) / DISP.h)
  }
  dispGeo.translate(0, L.lidD - DISP.y - DISP.h, 0.35)
  geometries.push(dispGeo)
  // (its own light, under glass: the picture is emitted, the room's reflections lie over it)
  // (an anti-glare display: the room's reflections soft and faint on it)
  const dispMat = new THREE.MeshPhysicalMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: dispTex, emissiveIntensity: 0.9, roughness: 0.42, metalness: 0, specularIntensity: 0.12, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })
  materials.push(dispMat)
  const display = new THREE.Mesh(dispGeo, dispMat)
  display.name = 'laptop.display'
  // the camera's dot, in the notch
  const camGeo = new THREE.CircleGeometry(0.9, 12)
  camGeo.translate(0, L.lidD - DISP.y - 2.6, 0.4)
  geometries.push(camGeo)
  const camDot = new THREE.Mesh(camGeo, hinge)
  lid.add(lidShell, face, display, camDot)

  group.add(base, well, keys, trackpad, hingeMesh, lid)
  for (const m of [base, keys, lidShell, hingeMesh]) m.castShadow = true
  group.updateMatrixWorld(true)

  const api = {
    group,
    meshes: [base, well, keys, trackpad, hingeMesh, lidShell, face, display],
    display,
    materials: [alu, aluDark, keyMat, glass, pad, hinge, wellMat],
    get tab() {
      return tab
    },
    /** The display's light on or off. */
    glow(on) {
      dispMat.emissiveIntensity = on ? 0.9 : 0
    },
    /** The next project's tab (wrapping); returns its index. */
    nextTab() {
      tab = (tab + 1) % projects.length
      drawDisplay(dispCanvas, projects, tab, font)
      dispTex.needsUpdate = true
      return tab
    },
    setTab(i) {
      if (i === tab) return
      tab = ((i % projects.length) + projects.length) % projects.length
      drawDisplay(dispCanvas, projects, tab, font)
      dispTex.needsUpdate = true
    },
    /** The middle of the base (world). */
    center: (out) => out.set(0, L.base, 0).applyMatrix4(group.matrixWorld),
    /** The display's middle (world) and the way it faces (world). */
    screenCenter: (out) => out.set(0, L.lidD - DISP.y - DISP.h / 2, 0.1).applyMatrix4(lid.matrixWorld),
    screenNormal: (out) => out.set(0, 0, 1).transformDirection(lid.matrixWorld),
    /** Its footprint on the desk, in its own frame: half width, half depth (mm), and the lid's
     * reach behind the hinge. */
    footprint: { hw: L.w / 2, hd: L.d / 2, back: L.lidD * Math.sin(L.open - Math.PI / 2) + 3 },
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
      for (const t of textures) t.dispose()
      keys.dispose()
    },
  }
  return api
}
