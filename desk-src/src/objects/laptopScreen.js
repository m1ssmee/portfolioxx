// The laptop's screen: a browser, full screen under the menu bar, a tab for each project, each page
// in that project's own look (drawn from portfolio.ts, not screenshots). No three.js: plain 2D
// drawing, in the screen's own pixels (1440 x 936, as a page would see them).
//   chrome  the menu bar, the tabs and the toolbar: a strip 2048 px wide, drawn again only when the
//           tab changes
//   page    the page, 1440 px wide and up to 1440 tall (the screen shows 826 of it under the chrome):
//           drawn once per tab into a 2048 x 2048 canvas; the display's shader moves a window over
//           it as it scrolls, so nothing is drawn while scrolling
// Every text is measured where it is laid out (wrapped, or cut with an ellipsis): a fallback font,
// wider or narrower than Inter, still fits.
import { SCREEN } from './laptopGeo.js'

export const CHROME = { h: 110, texW: 2048, texH: 160 } // (its strip: 160 px for 112.5 of the screen's)
export const PAGE = { w: 1440, h: 1440, texW: 2048, texH: 2048 }
export const VIEW_H = SCREEN.h - CHROME.h // (the page's window: 826)

// ---- each project's look
export const THEMES = {
  bodymap: { dark: false, bg: '#f6f8fb', surface: '#ffffff', ink: '#0f172a', sub: '#4f5d73', faint: '#8a96a8', line: '#e2e8f0', accent: '#e0464e', accentInk: '#ffffff', soft: '#fdebec', chip: '#eef2f7', tag: 'Health · AI', glow: [0.86, 0.88, 0.92] },
  'codebase-tavern': { dark: true, bg: '#1a120d', surface: '#231812', ink: '#f6e7c9', sub: '#cdb08a', faint: '#8d7559', line: '#3b2b20', accent: '#f0a33a', accentInk: '#1a120d', soft: '#3a2614', chip: '#2c1f17', tag: 'Developer tools · AI', glow: [0.15, 0.11, 0.07] },
  'lunar-rover': { dark: true, bg: '#0d1117', surface: '#161b22', ink: '#e6edf3', sub: '#9198a1', faint: '#6e7681', line: '#30363d', accent: '#4493f8', accentInk: '#ffffff', soft: '#1f2a3a', chip: '#121d2f', tag: 'Robotics', glow: [0.07, 0.08, 0.1], green: '#238636' },
  cropscan: { dark: false, bg: '#f3f7f0', surface: '#ffffff', ink: '#12301e', sub: '#4a6853', faint: '#86a08d', line: '#dbe6d5', accent: '#2f9e55', accentInk: '#ffffff', soft: '#e2f0df', chip: '#e7f0e3', tag: 'Computer vision', glow: [0.84, 0.89, 0.84] },
}
const themeOf = (p) => THEMES[p.id] || THEMES.bodymap

// ---- drawing helpers (all in the screen's pixels)
const setFont = (g, font, weight, size) => (g.font = `${weight} ${size}px ${font}`)
const track = (g, px) => {
  if ('letterSpacing' in g) g.letterSpacing = `${px}px`
}
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}
const dot = (g, x, y, r) => {
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
}
/** The words of `text` in lines no wider than maxW (with the context's font). */
function wrap(g, text, maxW) {
  const out = []
  let line = ''
  for (const word of String(text || '').split(/\s+/)) {
    if (!word) continue
    const t = line ? `${line} ${word}` : word
    if (line && g.measureText(t).width > maxW) {
      out.push(line)
      line = word
    } else line = t
  }
  if (line) out.push(line)
  return out
}
/** Text cut to maxW with an ellipsis. */
function fit(g, text, maxW) {
  if (g.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && g.measureText(`${t}…`).width > maxW) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}
/** A paragraph: at most maxLines (the last cut with an ellipsis); returns the lines drawn. */
function para(g, text, x, y, maxW, lead, maxLines = 99) {
  const ls = wrap(g, text, maxW)
  const n = Math.min(ls.length, maxLines)
  for (let i = 0; i < n; i++) g.fillText(i === n - 1 && ls.length > n ? fit(g, `${ls[i]} …`, maxW) : ls[i], x, y + i * lead)
  return n
}
const host = (url) => (url || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
/** Is the project's page its repository's (it has only code to show)? */
const isRepo = (p) => p.id === 'lunar-rover' || (!p.live && p.id !== 'cropscan' && !!p.github)
/** The address the browser shows: the live site, the repository, or (a demo not deployed) the
 * local server it runs on. */
export const urlOf = (p) => (p.live ? host(p.live) : isRepo(p) ? host(p.github) : 'localhost:5000')

// =================================================================================================
// the browser's chrome
// =================================================================================================
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A small favicon for a project: its accent, rounded, its initial. */
function favicon(g, p, x, y, s, font) {
  const T = themeOf(p)
  rr(g, x, y, s, s, s * 0.26)
  g.fillStyle = T.accent
  g.fill()
  setFont(g, font, 800, s * 0.62)
  g.fillStyle = T.accentInk
  g.textAlign = 'center'
  g.fillText((p.name || '?')[0], x + s / 2, y + s * 0.73)
  g.textAlign = 'left'
}

/**
 * The menu bar, the tabs and the toolbar (the top CHROME.h of the screen), on a context in the
 * screen's pixels. Returns the tabs' boxes [x0, x1, y0, y1] (for taps).
 */
export function drawChrome(g, projects, active, font, now = new Date()) {
  const W = SCREEN.w
  const p = projects[active]
  // the menu bar
  g.fillStyle = '#1d1d1f'
  g.fillRect(0, 0, W, 26)
  g.fillStyle = 'rgba(255,255,255,0.9)'
  dot(g, 19, 13, 6)
  g.fillStyle = '#1d1d1f'
  dot(g, 19, 13, 2.6)
  g.fillStyle = 'rgba(255,255,255,0.92)'
  setFont(g, font, 700, 13.5)
  g.fillText('Browser', 36, 17.8)
  let mx = 36 + g.measureText('Browser').width + 22
  setFont(g, font, 400, 13.5)
  for (const t of ['File', 'Edit', 'View', 'History', 'Bookmarks', 'Profiles', 'Tab', 'Window', 'Help']) {
    g.fillText(t, mx, 17.8)
    mx += g.measureText(t).width + 19
  }
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const clock = `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}  ${hh}:${mm}`
  const cw = g.measureText(clock).width
  g.fillText(clock, W - 16 - cw, 17.8)
  // (status: control centre, search, wifi, battery, right to left)
  g.strokeStyle = 'rgba(255,255,255,0.88)'
  g.fillStyle = 'rgba(255,255,255,0.88)'
  g.lineWidth = 1.4
  let ix = W - 16 - cw - 26
  rr(g, ix - 8, 7.5, 16, 5, 2.5)
  g.stroke()
  rr(g, ix - 8, 14, 16, 5, 2.5)
  g.stroke()
  dot(g, ix - 5, 10, 1.6)
  dot(g, ix + 5, 16.5, 1.6)
  ix -= 30
  g.beginPath()
  g.arc(ix - 1, 12, 4.5, 0, Math.PI * 2)
  g.moveTo(ix + 2.3, 15.3)
  g.lineTo(ix + 6, 19)
  g.stroke()
  ix -= 30
  for (let i = 0; i < 3; i++) {
    g.beginPath()
    g.arc(ix, 18, 3 + i * 3.6, -Math.PI * 0.75, -Math.PI * 0.25)
    g.stroke()
  }
  dot(g, ix, 17.6, 1.4)
  ix -= 44
  rr(g, ix, 7.5, 24, 11, 3)
  g.stroke()
  rr(g, ix + 2, 9.5, 16, 7, 1.5)
  g.fill()
  g.fillRect(ix + 25, 11, 1.6, 4)
  // the tab strip
  g.fillStyle = '#202124'
  g.fillRect(0, 26, W, 42)
  for (const [i, col] of ['#ff5f57', '#febc2e', '#28c840'].entries()) {
    g.fillStyle = col
    dot(g, 22 + i * 20, 47, 6)
  }
  const n = projects.length
  const tx0 = 88
  const tabW = Math.min(244, (W - tx0 - 70) / n)
  const tabs = []
  projects.forEach((q, i) => {
    const x = tx0 + i * tabW
    const on = i === active
    if (on) {
      // (the active tab joins the toolbar, with the little curves at its feet)
      g.fillStyle = '#35363a'
      g.beginPath()
      g.moveTo(x - 8, 68)
      g.arcTo(x, 68, x, 60, 8)
      g.lineTo(x, 41)
      g.arcTo(x, 33, x + 8, 33, 8)
      g.lineTo(x + tabW - 8, 33)
      g.arcTo(x + tabW, 33, x + tabW, 41, 8)
      g.lineTo(x + tabW, 60)
      g.arcTo(x + tabW, 68, x + tabW + 8, 68, 8)
      g.closePath()
      g.fill()
    } else if (i !== active - 1 && i < n - 1) {
      g.fillStyle = '#4a4c50'
      g.fillRect(x + tabW - 0.5, 42, 1, 16)
    }
    favicon(g, q, x + 14, 43, 15, font)
    setFont(g, font, on ? 500 : 400, 13)
    g.fillStyle = on ? '#e8eaed' : '#aeb1b6'
    g.fillText(fit(g, q.name, tabW - 36 - (on ? 30 : 12)), x + 37, 55)
    if (on) {
      g.strokeStyle = '#c4c7c5'
      g.lineWidth = 1.5
      g.beginPath()
      g.moveTo(x + tabW - 24, 46)
      g.lineTo(x + tabW - 16, 54)
      g.moveTo(x + tabW - 16, 46)
      g.lineTo(x + tabW - 24, 54)
      g.stroke()
    }
    tabs.push([x, x + tabW, 30, 68])
  })
  g.strokeStyle = '#c4c7c5'
  g.lineWidth = 1.6
  const px = tx0 + n * tabW + 22
  g.beginPath()
  g.moveTo(px - 6, 50)
  g.lineTo(px + 6, 50)
  g.moveTo(px, 44)
  g.lineTo(px, 56)
  g.stroke()
  // the toolbar
  g.fillStyle = '#35363a'
  g.fillRect(0, 68, W, 42)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  const arrow = (x, dir, alpha) => {
    g.strokeStyle = `rgba(232,234,237,${alpha})`
    g.lineWidth = 1.8
    g.beginPath()
    g.moveTo(x + 7 * dir, 89)
    g.lineTo(x - 7 * dir, 89)
    g.moveTo(x - 1 * dir, 83)
    g.lineTo(x - 7 * dir, 89)
    g.lineTo(x - 1 * dir, 95)
    g.stroke()
  }
  arrow(24, 1, 0.9)
  arrow(56, -1, 0.35)
  g.strokeStyle = 'rgba(232,234,237,0.9)'
  g.beginPath()
  g.arc(88, 89, 6.5, -Math.PI * 0.3, Math.PI * 1.55)
  g.stroke()
  g.beginPath()
  g.moveTo(91.5, 80.5)
  g.lineTo(92.5, 84.8)
  g.lineTo(88.2, 85.4)
  g.stroke()
  // the address bar
  const ox = 112
  const ow = W - ox - 152
  rr(g, ox, 74.5, ow, 29, 14.5)
  g.fillStyle = '#202124'
  g.fill()
  // (the site's settings: two sliders)
  g.strokeStyle = '#c4c7c5'
  g.lineWidth = 1.4
  g.beginPath()
  g.moveTo(ox + 13, 85.5)
  g.lineTo(ox + 25, 85.5)
  g.moveTo(ox + 13, 92.5)
  g.lineTo(ox + 25, 92.5)
  g.stroke()
  g.fillStyle = '#202124'
  dot(g, ox + 21, 85.5, 2.2)
  dot(g, ox + 17, 92.5, 2.2)
  g.beginPath()
  g.arc(ox + 21, 85.5, 2.2, 0, Math.PI * 2)
  g.moveTo(ox + 19.2, 92.5)
  g.arc(ox + 17, 92.5, 2.2, 0, Math.PI * 2)
  g.stroke()
  const url = urlOf(p)
  const cut = url.indexOf('/')
  setFont(g, font, 400, 14.5)
  const hostPart = cut < 0 ? url : url.slice(0, cut)
  const path = cut < 0 ? '' : url.slice(cut)
  g.fillStyle = '#e8eaed'
  g.fillText(fit(g, hostPart, ow - 90), ox + 40, 94.2)
  const hw = Math.min(g.measureText(hostPart).width, ow - 90)
  g.fillStyle = '#9aa0a6'
  g.fillText(fit(g, path, Math.max(0, ow - 90 - hw)), ox + 40 + hw, 94.2)
  // (the bookmark's star, at its end)
  g.strokeStyle = '#c4c7c5'
  g.lineWidth = 1.3
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 ? 3.2 : 7
    const x = ox + ow - 22 + r * Math.cos(a)
    const y = 89.5 + r * Math.sin(a)
    if (i) g.lineTo(x, y)
    else g.moveTo(x, y)
  }
  g.closePath()
  g.stroke()
  // (an extension, the profile, the menu)
  g.strokeStyle = '#c4c7c5'
  g.lineWidth = 1.5
  rr(g, W - 128, 83, 12, 12, 2)
  g.stroke()
  g.beginPath()
  g.arc(W - 122, 82, 2.4, Math.PI, 0)
  g.stroke()
  g.fillStyle = '#8ab4f8'
  dot(g, W - 86, 89, 11)
  g.fillStyle = '#35363a'
  dot(g, W - 86, 86, 4)
  g.beginPath()
  g.arc(W - 86, 97, 7, Math.PI, 0)
  g.fill()
  g.fillStyle = '#c4c7c5'
  for (let i = 0; i < 3; i++) dot(g, W - 40, 83 + i * 6, 1.7)
  g.fillStyle = 'rgba(0,0,0,0.45)'
  g.fillRect(0, CHROME.h - 1, W, 1)
  g.lineCap = 'butt'
  return tabs
}

// =================================================================================================
// the pages
// =================================================================================================
/** A pill of text: returns its width. */
function chip(g, text, x, y, h, bg, fg, font, size = 14, weight = 500, padX = 14) {
  setFont(g, font, weight, size)
  const w = g.measureText(text).width + 2 * padX
  rr(g, x, y, w, h, h / 2)
  g.fillStyle = bg
  g.fill()
  g.fillStyle = fg
  g.fillText(text, x + padX, y + h / 2 + size * 0.36)
  return w
}
/** A row of chips that wraps (at most `rows` rows); returns the height used. */
function chips(g, items, x, y, maxW, T, font, rows = 2) {
  let cx = x
  let cy = y
  let r = 1
  for (const s of items) {
    setFont(g, font, 500, 14)
    const w = g.measureText(s).width + 28
    if (cx + w > x + maxW && cx > x) {
      if (++r > rows) break
      cx = x
      cy += 42
    }
    chip(g, s, cx, cy, 34, T.chip, T.sub, font)
    cx += w + 8
  }
  return cy + 34 - y
}
/** A small uppercase label, tracked out. */
function eyebrow(g, text, x, y, col, font, size = 12.5) {
  setFont(g, font, 700, size)
  track(g, 1.4)
  g.fillStyle = col
  g.fillText(text.toUpperCase(), x, y)
  track(g, 0)
}
/** A button: filled or outlined; returns [x, y, w, h]. */
function button(g, text, x, y, T, font, filled, h = 52) {
  setFont(g, font, 600, 16.5)
  const w = g.measureText(text).width + (filled ? 66 : 48)
  rr(g, x, y, w, h, h / 2)
  if (filled) {
    g.fillStyle = T.accent
    g.fill()
    g.fillStyle = T.accentInk
  } else {
    g.strokeStyle = T.dark ? 'rgba(255,255,255,0.28)' : 'rgba(15,23,42,0.22)'
    g.lineWidth = 1.5
    g.stroke()
    g.fillStyle = T.ink
  }
  g.fillText(text, x + 24, y + h / 2 + 6)
  if (filled) {
    // (an arrow after the words)
    const ax = x + w - 30
    g.strokeStyle = T.accentInk
    g.lineWidth = 2
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(ax - 6, y + h / 2)
    g.lineTo(ax + 6, y + h / 2)
    g.moveTo(ax + 1, y + h / 2 - 5)
    g.lineTo(ax + 6, y + h / 2)
    g.lineTo(ax + 1, y + h / 2 + 5)
    g.stroke()
    g.lineCap = 'butt'
  }
  return [x, y, w, h]
}
/** A card with a soft shadow. */
function card(g, x, y, w, h, r, fill, shadow) {
  g.save()
  if (shadow) {
    g.shadowColor = shadow
    g.shadowBlur = 36
    g.shadowOffsetY = 12
  }
  rr(g, x, y, w, h, r)
  g.fillStyle = fill
  g.fill()
  g.restore()
}

// ---- each project's picture, in a box
function artBodyMap(g, x, y, w, h, T, font) {
  card(g, x, y, w, h, 26, T.surface, 'rgba(15,23,42,0.10)')
  g.save()
  rr(g, x, y, w, h, 26)
  g.clip()
  const bgG = g.createRadialGradient(x + w * 0.62, y + h * 0.45, 20, x + w * 0.62, y + h * 0.45, h * 0.7)
  bgG.addColorStop(0, '#eef3fa')
  bgG.addColorStop(1, '#ffffff')
  g.fillStyle = bgG
  g.fillRect(x, y, w, h)
  // the figure, front on
  const cx = x + w * 0.64
  const top = y + 46
  const s = (h - 80) / 560
  g.fillStyle = '#dde5ef'
  g.strokeStyle = '#c5d1df'
  g.lineWidth = 2
  const part = (px, py, rx, ry, rot = 0) => {
    g.beginPath()
    g.ellipse(cx + px * s, top + py * s, rx * s, ry * s, rot, 0, Math.PI * 2)
    g.fill()
    g.stroke()
  }
  part(-36, 440, 25, 112, 0.04)
  part(36, 440, 25, 112, -0.04)
  part(-94, 196, 18, 96, 0.12)
  part(94, 196, 18, 96, -0.12)
  part(0, 300, 58, 72)
  part(0, 172, 72, 96)
  part(0, 92, 16, 14)
  part(0, 42, 34, 40)
  const finding = (px, py, col, r) => {
    const gx = cx + px * s
    const gy = top + py * s
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r * 3.4 * s)
    gr.addColorStop(0, col)
    gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr
    dot(g, gx, gy, r * 3.4 * s)
    g.fillStyle = col
    dot(g, gx, gy, r * s)
    g.fillStyle = '#ffffff'
    dot(g, gx, gy, r * 0.38 * s)
    return [gx, gy]
  }
  const hot = finding(-26, 168, '#e0464e', 10)
  finding(30, 292, '#f0a33a', 8.5)
  finding(-36, 470, '#22a06b', 7.5)
  finding(4, 50, '#f0a33a', 6.5)
  // a finding's card, its line to the place
  const fx = x + 34
  const fy = y + h * 0.3
  g.strokeStyle = 'rgba(224,70,78,0.5)'
  g.lineWidth = 1.5
  g.setLineDash([4, 5])
  g.beginPath()
  g.moveTo(fx + 226, fy + 46)
  g.lineTo(hot[0] - 14, hot[1])
  g.stroke()
  g.setLineDash([])
  card(g, fx, fy, 226, 112, 16, '#ffffff', 'rgba(15,23,42,0.14)')
  g.fillStyle = '#e0464e'
  dot(g, fx + 22, fy + 28, 6)
  setFont(g, font, 600, 16)
  g.fillStyle = T.ink
  g.fillText(fit(g, 'Hemoglobin  10.9 g/dL', 180), fx + 36, fy + 34)
  setFont(g, font, 400, 13.5)
  g.fillStyle = T.sub
  g.fillText(fit(g, 'Below the range (13–17):', 196), fx + 16, fy + 62)
  g.fillText(fit(g, 'a little low, explained.', 196), fx + 16, fy + 82)
  // the key to the colours
  setFont(g, font, 500, 13)
  let lx = x + 34
  for (const [t, col] of [
    ['Needs attention', '#e0464e'],
    ['Watch', '#f0a33a'],
    ['Normal', '#22a06b'],
  ]) {
    g.fillStyle = col
    dot(g, lx + 5, y + h - 30, 5)
    g.fillStyle = T.sub
    g.fillText(t, lx + 16, y + h - 25.5)
    lx += g.measureText(t).width + 40
  }
  g.restore()
}

function artTavern(g, x, y, w, h, T, font) {
  card(g, x, y, w, h, 24, '#241912', 'rgba(0,0,0,0.45)')
  g.save()
  rr(g, x, y, w, h, 24)
  g.clip()
  const lamp = g.createRadialGradient(x + w * 0.52, y + h * 0.5, 10, x + w * 0.52, y + h * 0.5, h * 0.75)
  lamp.addColorStop(0, 'rgba(240,163,58,0.22)')
  lamp.addColorStop(1, 'rgba(240,163,58,0)')
  g.fillStyle = lamp
  g.fillRect(x, y, w, h)
  const cx = x + w * 0.52
  const cy = y + h * 0.53
  const k = Math.min(w / 600, h / 540)
  const ppl = [
    ['auth.ts', -175, -112, '#f0a33a'],
    ['db.py', 160, -128, '#d96a3a'],
    ['api/routes', -196, 96, '#c99a4a'],
    ['cache.go', 178, 104, '#e8c06a'],
    ['main.rs', 0, 168, '#b8653a'],
  ]
  g.strokeStyle = 'rgba(240,163,58,0.22)'
  g.lineWidth = 1.5
  g.setLineDash([3, 6])
  for (let i = 0; i < ppl.length; i++)
    for (let j = i + 1; j < ppl.length; j++) {
      if ((i + j) % 2) continue
      g.beginPath()
      g.moveTo(cx + ppl[i][1] * k, cy + ppl[i][2] * k)
      g.lineTo(cx + ppl[j][1] * k, cy + ppl[j][2] * k)
      g.stroke()
    }
  g.setLineDash([])
  // the table
  g.fillStyle = '#3d2a1d'
  g.beginPath()
  g.ellipse(cx, cy, 128 * k, 72 * k, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#5a3e2a'
  g.lineWidth = 3
  g.stroke()
  // (two mugs on it, a candle between)
  for (const [mx, my] of [
    [-44, -8],
    [38, 12],
  ]) {
    g.fillStyle = '#e8c06a'
    rr(g, cx + (mx - 8) * k, cy + (my - 10) * k, 16 * k, 20 * k, 3 * k)
    g.fill()
    g.strokeStyle = '#e8c06a'
    g.lineWidth = 2.5 * k
    g.beginPath()
    g.arc(cx + (mx + 9) * k, cy + my * k, 5 * k, -Math.PI / 2, Math.PI / 2)
    g.stroke()
    g.fillStyle = '#fff3d6'
    rr(g, cx + (mx - 8) * k, cy + (my - 12) * k, 16 * k, 5 * k, 2.5 * k)
    g.fill()
  }
  const flame = g.createRadialGradient(cx, cy - 16 * k, 0, cx, cy - 16 * k, 30 * k)
  flame.addColorStop(0, 'rgba(255,214,140,0.55)')
  flame.addColorStop(1, 'rgba(255,214,140,0)')
  g.fillStyle = flame
  dot(g, cx, cy - 16 * k, 30 * k)
  g.fillStyle = '#f6e7c9'
  rr(g, cx - 4 * k, cy - 14 * k, 8 * k, 16 * k, 2 * k)
  g.fill()
  g.fillStyle = '#ffcf6b'
  g.beginPath()
  g.ellipse(cx, cy - 20 * k, 3 * k, 6 * k, 0, 0, Math.PI * 2)
  g.fill()
  for (const [name, px, py, col] of ppl) {
    const ax = cx + px * k
    const ay = cy + py * k
    g.fillStyle = col
    rr(g, ax - 25 * k, ay - 26 * k, 50 * k, 56 * k, 22 * k)
    g.fill()
    g.fillStyle = '#1a120d'
    dot(g, ax - 9 * k, ay - 6 * k, 4 * k)
    dot(g, ax + 9 * k, ay - 6 * k, 4 * k)
    g.fillRect(ax - 7 * k, ay + 8 * k, 14 * k, 3 * k)
    setFont(g, font, 600, 13.5)
    g.fillStyle = T.sub
    g.textAlign = 'center'
    g.fillText(name, ax, ay + 50 * k)
    g.textAlign = 'left'
  }
  // a speech bubble, citing a line
  const bx = x + 28
  const by = y + 26
  setFont(g, font, 600, 15)
  const l1 = '“Not me. The bug is in'
  const l2 = 'db.py:142, see the retry.”'
  const bw = Math.max(g.measureText(l1).width, g.measureText(l2).width) + 36
  g.fillStyle = '#f6e7c9'
  rr(g, bx, by, bw, 70, 14)
  g.fill()
  g.beginPath()
  g.moveTo(bx + bw * 0.55, by + 70)
  g.lineTo(bx + bw * 0.62, by + 88)
  g.lineTo(bx + bw * 0.7, by + 70)
  g.fill()
  g.fillStyle = '#1a120d'
  g.fillText(l1, bx + 18, by + 30)
  g.fillStyle = '#9a4f1c'
  g.fillText(l2, bx + 18, by + 52)
  g.restore()
}

function artCrop(g, x, y, w, h, T, font) {
  card(g, x, y, w, h, 24, T.surface, 'rgba(18,48,30,0.10)')
  g.save()
  rr(g, x, y, w, h, 24)
  g.clip()
  // the photo: a leaf on a soft ground
  const px = x + 24
  const py = y + 24
  const pw = w * 0.56
  const ph = h - 48
  const ground = g.createLinearGradient(px, py, px + pw, py + ph)
  ground.addColorStop(0, '#e9e2d0')
  ground.addColorStop(1, '#d8cfb8')
  rr(g, px, py, pw, ph, 16)
  g.fillStyle = ground
  g.fill()
  g.save()
  rr(g, px, py, pw, ph, 16)
  g.clip()
  const cx = px + pw * 0.5
  const cy = py + ph * 0.52
  const s = Math.min(pw, ph) / 420
  g.fillStyle = '#5ea75a'
  g.beginPath()
  g.moveTo(cx - 170 * s, cy + 120 * s)
  g.bezierCurveTo(cx - 190 * s, cy - 60 * s, cx - 40 * s, cy - 200 * s, cx + 160 * s, cy - 175 * s)
  g.bezierCurveTo(cx + 180 * s, cy + 10 * s, cx + 40 * s, cy + 160 * s, cx - 170 * s, cy + 120 * s)
  g.fill()
  g.strokeStyle = '#3f8a3c'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(cx - 170 * s, cy + 120 * s)
  g.quadraticCurveTo(cx - 10 * s, cy - 10 * s, cx + 160 * s, cy - 175 * s)
  g.stroke()
  for (const [dx, dy, r] of [
    [-40, 10, 12],
    [-12, 40, 8],
    [10, -30, 10],
    [-62, 52, 7],
    [-24, -6, 5],
  ]) {
    g.fillStyle = '#8a6a2e'
    dot(g, cx + dx * s, cy + dy * s, r * s)
    g.fillStyle = 'rgba(214,190,90,0.6)'
    dot(g, cx + dx * s, cy + dy * s, r * 0.45 * s)
  }
  g.strokeStyle = '#e0464e'
  g.lineWidth = 2.5
  g.strokeRect(cx - 88 * s, cy - 58 * s, 116 * s, 128 * s)
  setFont(g, font, 600, 13)
  const lab = 'early blight 94%'
  const lw = g.measureText(lab).width + 14
  g.fillStyle = '#e0464e'
  g.fillRect(cx - 88 * s, cy - 58 * s - 24, lw, 24)
  g.fillStyle = '#fff'
  g.fillText(lab, cx - 88 * s + 7, cy - 58 * s - 7.5)
  g.restore()
  // the predictions
  const rx = px + pw + 26
  const rw = x + w - 24 - rx
  eyebrow(g, 'Top predictions', rx, py + 18, T.faint, font, 11.5)
  const preds = [
    ['Tomato · early blight', 0.94],
    ['Tomato · late blight', 0.04],
    ['Tomato · healthy', 0.01],
  ]
  preds.forEach(([k, v], i) => {
    const yy = py + 56 + i * 58
    setFont(g, font, 500, 14.5)
    g.fillStyle = T.ink
    g.fillText(fit(g, k, rw - 46), rx, yy)
    g.fillStyle = T.sub
    g.textAlign = 'right'
    g.fillText(`${Math.round(v * 100)}%`, rx + rw, yy)
    g.textAlign = 'left'
    rr(g, rx, yy + 12, rw, 8, 4)
    g.fillStyle = T.chip
    g.fill()
    rr(g, rx, yy + 12, Math.max(8, rw * v), 8, 4)
    g.fillStyle = i ? '#9cc9a4' : T.accent
    g.fill()
  })
  const ty = py + 56 + 3 * 58 + 6
  rr(g, rx, ty, rw, ph - (ty - py), 14)
  g.fillStyle = T.soft
  g.fill()
  eyebrow(g, 'Treatment', rx + 16, ty + 28, T.accent, font, 11.5)
  setFont(g, font, 400, 14)
  g.fillStyle = T.ink
  para(g, 'Remove the spotted leaves, water at the base, and use a copper fungicide every 7–10 days.', rx + 16, ty + 54, rw - 32, 21, Math.max(1, Math.floor((ph - (ty - py) - 64) / 21)))
  g.restore()
}

function artRover(g, x, y, w, h, T, font) {
  // the map the rover built (an occupancy grid), its path, and its telemetry
  const mw = Math.round(w * 0.6)
  rr(g, x, y, mw, h, 10)
  g.fillStyle = '#0a0f15'
  g.fill()
  g.save()
  rr(g, x, y, mw, h, 10)
  g.clip()
  g.strokeStyle = 'rgba(68,147,248,0.10)'
  g.lineWidth = 1
  for (let gx = x + 16; gx < x + mw; gx += 24) {
    g.beginPath()
    g.moveTo(gx, y)
    g.lineTo(gx, y + h)
    g.stroke()
  }
  for (let gy = y + 16; gy < y + h; gy += 24) {
    g.beginPath()
    g.moveTo(x, gy)
    g.lineTo(x + mw, gy)
    g.stroke()
  }
  g.fillStyle = 'rgba(230,237,243,0.08)'
  g.beginPath()
  g.ellipse(x + mw * 0.5, y + h * 0.52, mw * 0.46, h * 0.42, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(230,237,243,0.78)'
  for (const [rx, ry, r] of [
    [0.22, 0.3, 13],
    [0.62, 0.22, 18],
    [0.76, 0.66, 11],
    [0.34, 0.72, 8],
    [0.5, 0.45, 6],
  ])
    dot(g, x + rx * mw, y + ry * h, r)
  g.strokeStyle = 'rgba(230,237,243,0.35)'
  g.lineWidth = 2
  g.beginPath()
  g.arc(x + 0.82 * mw, y + 0.3 * h, 22, 0, Math.PI * 2)
  g.stroke()
  g.strokeStyle = T.accent
  g.lineWidth = 3
  g.setLineDash([8, 6])
  g.beginPath()
  g.moveTo(x + 0.08 * mw, y + 0.86 * h)
  g.bezierCurveTo(x + 0.4 * mw, y + 0.96 * h, x + 0.42 * mw, y + 0.5 * h, x + 0.88 * mw, y + 0.46 * h)
  g.stroke()
  g.setLineDash([])
  g.fillStyle = '#3fb950'
  g.beginPath()
  g.moveTo(x + 0.08 * mw + 10, y + 0.86 * h)
  g.lineTo(x + 0.08 * mw - 6, y + 0.86 * h - 8)
  g.lineTo(x + 0.08 * mw - 6, y + 0.86 * h + 8)
  g.closePath()
  g.fill()
  setFont(g, font, 500, 12)
  g.fillStyle = T.faint
  g.fillText('/map  ·  SLAM Toolbox', x + 14, y + 22)
  g.restore()
  const tx = x + mw + 18
  const tw = w - mw - 18
  const items = [
    ['O₂', '20.9 %', 'NOMINAL', '#3fb950'],
    ['Temperature', '21.4 °C', 'NOMINAL', '#3fb950'],
    ['Pressure', '99.1 kPa', 'WARNING', '#d29922'],
  ]
  const ih = (h - 2 * 12) / 3
  items.forEach(([k, v, st, col], i) => {
    const ty = y + i * (ih + 12)
    rr(g, tx, ty, tw, ih, 10)
    g.fillStyle = T.surface
    g.fill()
    g.strokeStyle = T.line
    g.lineWidth = 1
    g.stroke()
    setFont(g, font, 500, 13)
    g.fillStyle = T.sub
    g.fillText(fit(g, k, tw - 110), tx + 16, ty + 26)
    setFont(g, font, 700, 11)
    track(g, 0.8)
    g.fillStyle = col
    g.textAlign = 'right'
    g.fillText(st, tx + tw - 14, ty + 26)
    g.textAlign = 'left'
    track(g, 0)
    setFont(g, font, 600, 24)
    g.fillStyle = T.ink
    g.fillText(v, tx + 16, ty + ih - 18)
  })
}

const ART = { bodymap: artBodyMap, 'codebase-tavern': artTavern, cropscan: artCrop }

/** The site's header: its mark and name, its links, a call to action (filled). */
function siteHeader(g, p, T, font, links, cta, mark) {
  const W = PAGE.w
  g.fillStyle = T.surface
  g.fillRect(0, 0, W, 76)
  g.fillStyle = T.line
  g.fillRect(0, 75, W, 1)
  mark(g, 64, 23, 30, T)
  setFont(g, font, 700, 21)
  track(g, -0.3)
  g.fillStyle = T.ink
  g.fillText(fit(g, p.name, 360), 106, 45.5)
  track(g, 0)
  let x = W - 64
  setFont(g, font, 600, 15)
  const cw = g.measureText(cta).width + 40
  x -= cw
  rr(g, x, 18, cw, 40, 20)
  g.fillStyle = T.accent
  g.fill()
  g.fillStyle = T.accentInk
  g.fillText(cta, x + 20, 43)
  setFont(g, font, 500, 15.5)
  g.fillStyle = T.sub
  for (const t of links) {
    x -= g.measureText(t).width + 36
    g.fillText(t, x, 43)
  }
}
const MARKS = {
  bodymap: (g, x, y, s, T) => {
    rr(g, x, y, s, s, 9)
    g.fillStyle = T.accent
    g.fill()
    g.fillStyle = '#fff'
    dot(g, x + s / 2, y + 9, 3.8)
    rr(g, x + s / 2 - 4.5, y + 14, 9, 11, 4.5)
    g.fill()
  },
  'codebase-tavern': (g, x, y, s, T) => {
    // a mug
    g.fillStyle = T.accent
    rr(g, x + 3, y + 5, 19, 22, 4)
    g.fill()
    g.strokeStyle = T.accent
    g.lineWidth = 3
    g.beginPath()
    g.arc(x + 23, y + 16, 5.5, -Math.PI / 2, Math.PI / 2)
    g.stroke()
    g.fillStyle = '#f6e7c9'
    rr(g, x + 3, y + 3, 19, 6, 3)
    g.fill()
  },
  cropscan: (g, x, y, s, T) => {
    g.fillStyle = T.accent
    g.beginPath()
    g.moveTo(x + 4, y + s - 4)
    g.bezierCurveTo(x + 2, y + 10, x + 12, y + 2, x + s - 2, y + 3)
    g.bezierCurveTo(x + s - 1, y + 16, x + 18, y + s - 2, x + 4, y + s - 4)
    g.fill()
    g.strokeStyle = '#ffffff'
    g.lineWidth = 1.6
    g.beginPath()
    g.moveTo(x + 6, y + s - 6)
    g.lineTo(x + s - 7, y + 7)
    g.stroke()
  },
}

/** A landing page: header, a hero (the project's words left, its picture right), what it is and
 * what was built, what was hard, a footer. Returns { h, button }. */
function landingPage(g, p, T, font, o) {
  const W = PAGE.w
  g.fillStyle = T.bg
  g.fillRect(0, 0, W, PAGE.h)
  siteHeader(g, p, T, font, o.links, o.cta, MARKS[p.id] || MARKS.bodymap)
  // ---- the hero
  const hx = 96
  const colW = 600
  let y = 150
  eyebrow(g, `${T.tag} · ${p.year || ''}`.replace(/ · $/, ''), hx, y, T.accent, font)
  y += 30
  setFont(g, font, 800, 66)
  track(g, -1.6)
  g.fillStyle = T.ink
  const h1 = wrap(g, p.name, colW)
  const h1n = Math.min(2, h1.length)
  for (let i = 0; i < h1n; i++) g.fillText(i === h1n - 1 && h1.length > h1n ? fit(g, h1[i], colW) : h1[i], hx, y + 58 + i * 72)
  track(g, 0)
  y += 58 + (h1n - 1) * 72 + 34
  setFont(g, font, 400, 21)
  g.fillStyle = T.sub
  y += 22 + (para(g, p.oneLiner, hx, y + 22, colW, 33, 4) - 1) * 33 + 38
  const main = button(g, o.primary, hx, y, T, font, true)
  if (o.secondary) button(g, o.secondary, hx + main[2] + 14, y, T, font, false)
  y += 52 + 30
  y += chips(g, p.stack || [], hx, y, colW, T, font)
  const heroBottom = Math.max(y, 620)
  ;(ART[p.id] || artBodyMap)(g, 748, 118, 596, heroBottom - 118, T, font)
  // ---- what it is, what was built (two columns)
  y = heroBottom + 70
  const cols = [
    ['What it is', p.whatItIs],
    ['What I built', p.whatIBuilt],
  ].filter(([, t]) => t)
  if (cols.length) {
    g.fillStyle = T.line
    g.fillRect(hx, y - 34, W - 2 * hx, 1)
    let tallest = 0
    cols.forEach(([head, text], i) => {
      const cx = hx + i * 640
      eyebrow(g, head, cx, y, T.accent, font, 12.5)
      setFont(g, font, 400, 18)
      g.fillStyle = T.ink
      tallest = Math.max(tallest, para(g, text, cx, y + 38, 584, 30, 7))
    })
    y += 38 + tallest * 30 + 40
  }
  // ---- what was hard
  const ch = p.challenges || []
  if (ch.length) {
    setFont(g, font, 700, 30)
    track(g, -0.6)
    g.fillStyle = T.ink
    g.fillText('Under the hood', hx, y + 26)
    track(g, 0)
    y += 56
    const cw = (W - 2 * hx - 24) / 2
    setFont(g, font, 400, 17)
    const lines = ch.slice(0, 2).map((t) => Math.min(4, wrap(g, t, cw - 64).length))
    const chh = 64 + Math.max(...lines) * 27 + 20
    ch.slice(0, 2).forEach((t, i) => {
      const cx = hx + i * (cw + 24)
      rr(g, cx, y, cw, chh, 18)
      g.fillStyle = T.surface
      g.fill()
      g.strokeStyle = T.line
      g.lineWidth = 1
      g.stroke()
      setFont(g, font, 700, 14)
      g.fillStyle = T.accent
      g.fillText(`0${i + 1}`, cx + 32, y + 42)
      setFont(g, font, 400, 17)
      g.fillStyle = T.ink
      para(g, t, cx + 32, y + 74, cw - 64, 27, 4)
    })
    y += chh + 44
  }
  // ---- the footer
  g.fillStyle = T.line
  g.fillRect(0, y, W, 1)
  setFont(g, font, 400, 14.5)
  g.fillStyle = T.faint
  g.fillText(`© ${p.year || new Date().getFullYear()} ${p.name}`, hx, y + 44)
  let fx = W - hx
  for (const t of [host(p.live), host(p.github)].filter(Boolean).reverse()) {
    fx -= g.measureText(t).width
    g.fillStyle = T.sub
    g.fillText(t, fx, y + 44)
    fx -= 32
  }
  return { h: Math.min(PAGE.h, y + 80), button: main }
}

/** A repository's page (for a project with only code to show): its files, its README. */
function repoPage(g, p, T, font) {
  const W = PAGE.w
  g.fillStyle = T.bg
  g.fillRect(0, 0, W, PAGE.h)
  const path = host(p.github).replace(/^github\.com\//, '')
  const [owner = 'me', repo = p.id] = path.split('/')
  // the site's header
  g.fillStyle = '#010409'
  g.fillRect(0, 0, W, 64)
  g.fillStyle = T.ink
  dot(g, 40, 32, 15)
  g.fillStyle = '#010409'
  dot(g, 40, 30, 6.5)
  g.beginPath()
  g.arc(40, 46, 10, Math.PI * 1.2, Math.PI * 1.8)
  g.fill()
  setFont(g, font, 400, 16)
  g.fillStyle = T.ink
  g.fillText(owner, 72, 38)
  let bx = 72 + g.measureText(owner).width
  g.fillStyle = T.faint
  g.fillText(' / ', bx, 38)
  bx += g.measureText(' / ').width
  setFont(g, font, 600, 16)
  g.fillStyle = T.ink
  g.fillText(fit(g, repo, 400), bx, 38)
  rr(g, W - 380, 16, 272, 32, 7)
  g.strokeStyle = T.line
  g.lineWidth = 1
  g.stroke()
  setFont(g, font, 400, 14)
  g.fillStyle = T.faint
  g.fillText('Type / to search', W - 362, 37)
  rr(g, W - 88, 16, 32, 32, 16)
  g.fillStyle = '#2f81f7'
  g.fill()
  // the repository's tabs
  g.fillStyle = '#010409'
  g.fillRect(0, 64, W, 48)
  let tx = 40
  setFont(g, font, 500, 15)
  for (const [i, t] of ['Code', 'Issues', 'Pull requests', 'Actions', 'Projects', 'Security', 'Insights'].entries()) {
    g.fillStyle = i ? T.sub : T.ink
    g.fillText(t, tx, 94)
    const tw = g.measureText(t).width
    if (!i) {
      g.fillStyle = '#f78166'
      rr(g, tx - 8, 108, tw + 16, 3, 1.5)
      g.fill()
    }
    tx += tw + 36
  }
  g.fillStyle = T.line
  g.fillRect(0, 111, W, 1)
  // the title, the buttons
  const mx = 40
  const mw = 940
  setFont(g, font, 600, 22)
  g.fillStyle = T.ink
  g.fillText(fit(g, repo, 520), mx, 160)
  const px = mx + Math.min(520, g.measureText(repo).width) + 14
  chip(g, 'Public', px, 141, 26, 'rgba(0,0,0,0)', T.sub, font, 12.5, 500, 10)
  setFont(g, font, 500, 12.5)
  rr(g, px, 141, g.measureText('Public').width + 20, 26, 13)
  g.strokeStyle = T.line
  g.stroke()
  let rx = W - 40
  for (const t of ['Star', 'Fork', 'Watch']) {
    setFont(g, font, 500, 13.5)
    const w = g.measureText(t).width + 30
    rx -= w
    rr(g, rx, 138, w, 32, 7)
    g.fillStyle = T.surface
    g.fill()
    g.strokeStyle = T.line
    g.stroke()
    g.fillStyle = T.ink
    g.fillText(t, rx + 15, 159)
    rx -= 10
  }
  g.fillStyle = T.line
  g.fillRect(mx, 196, W - 2 * mx, 1)
  // the branch, the code button
  let y = 220
  rr(g, mx, y, 96, 34, 7)
  g.fillStyle = T.surface
  g.fill()
  g.strokeStyle = T.line
  g.stroke()
  setFont(g, font, 600, 14)
  g.fillStyle = T.ink
  g.fillText('main', mx + 30, y + 22)
  g.strokeStyle = T.sub
  g.lineWidth = 1.5
  g.beginPath()
  g.arc(mx + 16, y + 17, 4, 0, Math.PI * 2)
  g.stroke()
  setFont(g, font, 400, 14)
  g.fillStyle = T.sub
  g.fillText('1 branch    0 tags', mx + 112, y + 22)
  setFont(g, font, 600, 14)
  const codeW = g.measureText('Code').width + 44
  const codeX = mx + mw - codeW
  rr(g, codeX, y, codeW, 34, 7)
  g.fillStyle = T.green
  g.fill()
  g.fillStyle = '#ffffff'
  g.fillText('Code', codeX + 22, y + 22)
  const main = [codeX, y, codeW, 34]
  setFont(g, font, 500, 14)
  const gw = g.measureText('Go to file').width + 28
  rr(g, codeX - gw - 10, y, gw, 34, 7)
  g.fillStyle = T.surface
  g.fill()
  g.strokeStyle = T.line
  g.lineWidth = 1
  g.stroke()
  g.fillStyle = T.ink
  g.fillText('Go to file', codeX - gw + 4, y + 22)
  // the files
  y += 52
  const files = [
    ['rover_description', 'URDF, the skid-steer base and its sensors', true],
    ['rover_navigation', 'Nav2 goals, EKF fusion of IMU and odometry', true],
    ['habitat_monitor', 'The monitor and its own ROS 2 messages', true],
    ['launch', 'One launch for the yard, the rover, the stack', true],
    ['README.md', 'docs', false],
  ]
  const rowH = 40
  const fh = 46 + files.length * rowH
  rr(g, mx, y, mw, fh, 8)
  g.strokeStyle = T.line
  g.stroke()
  g.save()
  rr(g, mx, y, mw, fh, 8)
  g.clip()
  g.fillStyle = T.surface
  g.fillRect(mx, y, mw, 46)
  g.fillStyle = '#8b5cf6'
  dot(g, mx + 24, y + 23, 10)
  setFont(g, font, 600, 14)
  g.fillStyle = T.ink
  g.fillText(owner, mx + 44, y + 28)
  setFont(g, font, 400, 14)
  g.fillStyle = T.sub
  g.fillText(fit(g, 'Habitat alerts are edge-triggered', 420), mx + 54 + g.measureText(owner).width, y + 28)
  g.textAlign = 'right'
  g.fillText('last week', mx + mw - 18, y + 28)
  g.textAlign = 'left'
  files.forEach(([name, msg, dir], i) => {
    const ry = y + 46 + i * rowH
    g.fillStyle = T.line
    g.fillRect(mx, ry, mw, 1)
    g.fillStyle = dir ? '#54aeff' : T.sub
    if (dir) {
      rr(g, mx + 18, ry + 13, 18, 14, 2.5)
      g.fill()
    } else {
      g.strokeStyle = T.sub
      g.lineWidth = 1.4
      rr(g, mx + 20, ry + 11, 14, 18, 2)
      g.stroke()
    }
    setFont(g, font, 400, 14.5)
    g.fillStyle = T.ink
    g.fillText(name, mx + 48, ry + 26)
    g.fillStyle = T.sub
    g.fillText(fit(g, msg, 420), mx + 300, ry + 26)
    g.textAlign = 'right'
    g.fillText('last week', mx + mw - 18, ry + 26)
    g.textAlign = 'left'
  })
  g.restore()
  // the README
  y += fh + 22
  const readTop = y
  const pad = 32
  const cw = mw - 2 * pad
  let ry = y + 46 + 46
  // (drawn first into the box's space, the box's frame after: its height is the content's)
  setFont(g, font, 600, 32)
  g.fillStyle = T.ink
  const t1 = wrap(g, p.name, cw)
  t1.slice(0, 2).forEach((l, i) => g.fillText(l, mx + pad, ry + i * 40))
  ry += (Math.min(2, t1.length) - 1) * 40 + 16
  g.fillStyle = T.line
  g.fillRect(mx + pad, ry, cw, 1)
  ry += 36
  setFont(g, font, 400, 16)
  g.fillStyle = T.ink
  ry += para(g, p.oneLiner, mx + pad, ry, cw, 26, 3) * 26 + 10
  artRover(g, mx + pad, ry, cw, 250, T, font)
  ry += 250 + 40
  const section = (head, body) => {
    setFont(g, font, 600, 22)
    g.fillStyle = T.ink
    g.fillText(head, mx + pad, ry)
    g.fillStyle = T.line
    g.fillRect(mx + pad, ry + 12, cw, 1)
    ry += 42
    setFont(g, font, 400, 16)
    g.fillStyle = T.ink
    body()
    ry += 18
  }
  const room = (lines) => ry + 42 + lines * 26 < PAGE.h - 60
  if (p.whatItIs && room(4))
    section('What it is', () => {
      ry += para(g, p.whatItIs, mx + pad, ry, cw, 26, 4) * 26
    })
  if ((p.challenges || []).length && room(4))
    section('Under the hood', () => {
      for (const c of p.challenges.slice(0, 2)) {
        g.fillStyle = T.sub
        dot(g, mx + pad + 6, ry - 5, 3)
        g.fillStyle = T.ink
        ry += para(g, c, mx + pad + 22, ry, cw - 22, 26, 3) * 26 + 8
      }
    })
  const readBottom = Math.min(PAGE.h - 24, ry + 10)
  rr(g, mx, readTop, mw, readBottom - readTop, 8)
  g.strokeStyle = T.line
  g.lineWidth = 1
  g.stroke()
  g.fillStyle = T.line
  g.fillRect(mx, readTop + 46, mw, 1)
  setFont(g, font, 600, 14)
  g.fillStyle = T.ink
  g.fillText('README', mx + 46, readTop + 28)
  g.strokeStyle = T.sub
  g.lineWidth = 1.5
  for (let i = 0; i < 3; i++) {
    g.beginPath()
    g.moveTo(mx + 20, readTop + 18 + i * 5)
    g.lineTo(mx + 32, readTop + 18 + i * 5)
    g.stroke()
  }
  // the sidebar
  const sx = mx + mw + 40
  const sw = W - 40 - sx
  let sy = 236
  setFont(g, font, 600, 16)
  g.fillStyle = T.ink
  g.fillText('About', sx, sy)
  sy += 30
  setFont(g, font, 400, 15)
  g.fillStyle = T.ink
  sy += para(g, p.oneLiner, sx, sy, sw, 23, 5) * 23 + 14
  let cx = sx
  for (const s of p.stack || []) {
    const t = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setFont(g, font, 500, 12.5)
    const w = g.measureText(t).width + 22
    if (cx + w > sx + sw) {
      cx = sx
      sy += 32
    }
    chip(g, t, cx, sy, 25, 'rgba(56,139,253,0.15)', T.accent, font, 12.5, 500, 11)
    cx += w + 7
  }
  sy += 56
  setFont(g, font, 400, 14)
  for (const t of ['Readme', 'Activity', '0 stars', '1 watching']) {
    g.fillStyle = T.sub
    g.fillText(t, sx + 24, sy)
    g.strokeStyle = T.sub
    g.lineWidth = 1.3
    g.beginPath()
    g.arc(sx + 7, sy - 5, 5, 0, Math.PI * 2)
    g.stroke()
    sy += 30
  }
  sy += 20
  g.fillStyle = T.line
  g.fillRect(sx, sy, sw, 1)
  sy += 40
  setFont(g, font, 600, 16)
  g.fillStyle = T.ink
  g.fillText('Languages', sx, sy)
  sy += 20
  const langs = [
    ['Python', '#3572A5', 0.78],
    ['CMake', '#DA3434', 0.14],
    ['Shell', '#89e051', 0.08],
  ]
  let lx = sx
  langs.forEach(([, col, f], i) => {
    g.fillStyle = col
    const w = sw * f - (i < langs.length - 1 ? 2 : 0)
    rr(g, lx, sy, w, 8, i === 0 || i === langs.length - 1 ? 4 : 0)
    g.fill()
    lx += sw * f
  })
  sy += 34
  setFont(g, font, 500, 13)
  lx = sx
  for (const [name, col] of langs) {
    g.fillStyle = col
    dot(g, lx + 5, sy - 4, 4.5)
    g.fillStyle = T.ink
    g.fillText(name, lx + 15, sy)
    lx += g.measureText(name).width + 34
  }
  return { h: Math.min(PAGE.h, readBottom + 40), button: main }
}

/**
 * The page for project `p` on a context in the screen's pixels (1440 wide, from its top): returns
 * { h (its height), button ([x, y, w, h], its main button), thumb (the scroll thumb's colour, rgba),
 * glow ([r, g, b]: how much light it gives, linear) }.
 */
export function drawPage(g, p, font) {
  const T = themeOf(p)
  let out
  if (isRepo(p)) out = repoPage(g, p, T, font)
  else if (p.id === 'codebase-tavern')
    out = landingPage(g, p, T, font, { links: ['GitHub', 'How it works', 'The Tribunal'], cta: 'Open a repo', primary: p.live ? 'Enter the tavern' : 'View the code', secondary: p.live && p.github ? 'GitHub' : null })
  else if (p.id === 'cropscan')
    out = landingPage(g, p, T, font, { links: ['GitHub', 'API', 'Model'], cta: 'Try a leaf', primary: 'Upload a leaf photo', secondary: p.github ? 'View the code' : null })
  else out = landingPage(g, p, T, font, { links: ['GitHub', 'Privacy', 'How it works'], cta: p.live ? 'Upload a report' : 'View the code', primary: p.live ? 'Try it live' : 'View the code', secondary: p.live && p.github ? 'GitHub' : null })
  return { ...out, thumb: T.dark ? [0.9, 0.93, 0.96, 0.32] : [0.06, 0.09, 0.16, 0.3], glow: T.glow }
}

/**
 * The whole screen into a canvas (any size, the screen's shape): the browser at project `active`,
 * its page scrolled `scroll` px. (The live display draws the chrome and the page apart: this is the
 * picture of it, for a poster or a test.)
 */
export function drawDisplay(c, projects, active, font, scroll = 0) {
  const g = c.getContext('2d')
  const k = c.width / SCREEN.w
  g.setTransform(k, 0, 0, k, 0, 0)
  g.save()
  g.beginPath()
  g.rect(0, CHROME.h, SCREEN.w, VIEW_H)
  g.clip()
  g.translate(0, CHROME.h - scroll)
  drawPage(g, projects[active], font)
  g.restore()
  drawChrome(g, projects, active, font)
  g.setTransform(1, 0, 0, 1, 0, 0)
}
