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
import { githubUser, isSite, topStack, TILE, BENTO } from '../content/homePage.js'

export const CHROME = { h: 110, texW: 2048, texH: 160 } // (its strip: 160 px for 112.5 of the screen's)
export const PAGE = { w: 1440, h: 1440, texW: 2048, texH: 2048 }
export const VIEW_H = SCREEN.h - CHROME.h // (the page's window: 826)

// ---- each project's look
export const THEMES = {
  home: { dark: false, bg: '#ecebe6', surface: '#ffffff', ink: '#16171a', sub: '#4a4b50', faint: '#86837c', line: '#dcdad3', accent: '#141517', accentInk: '#f3f1ec', soft: '#e6e1f7', chip: '#e6e1f7', tag: 'Portfolio', glow: [0.8, 0.79, 0.76] },
  github: { dark: false, bg: '#f6f7f9', surface: '#ffffff', ink: '#1d2127', sub: '#59616d', faint: '#8a919c', line: '#e1e4e8', accent: '#2f6fdf', accentInk: '#ffffff', soft: '#eef3fc', chip: '#e9ebef', tag: 'Code', glow: [0.9, 0.91, 0.93] },
  bodymap: { dark: false, bg: '#f6f8fb', surface: '#ffffff', ink: '#0f172a', sub: '#4f5d73', faint: '#8a96a8', line: '#e2e8f0', accent: '#e0464e', accentInk: '#ffffff', soft: '#fdebec', chip: '#eef2f7', tag: 'Health · AI', glow: [0.86, 0.88, 0.92] },
  'codebase-tavern': { dark: true, bg: '#1a120d', surface: '#231812', ink: '#f6e7c9', sub: '#cdb08a', faint: '#8d7559', line: '#3b2b20', accent: '#f0a33a', accentInk: '#1a120d', soft: '#3a2614', chip: '#2c1f17', tag: 'Developer tools · AI', glow: [0.15, 0.11, 0.07] },
  'lunar-rover': { dark: true, bg: '#0d1117', surface: '#161b22', ink: '#e6edf3', sub: '#9198a1', faint: '#6e7681', line: '#30363d', accent: '#4493f8', accentInk: '#ffffff', soft: '#1f2a3a', chip: '#121d2f', tag: 'Robotics', glow: [0.07, 0.08, 0.1], green: '#238636' },
  meshh: { dark: false, bg: '#dedcd6', surface: '#eceae4', ink: '#1c1c1a', sub: '#55534d', faint: '#8b8880', line: '#c9c6be', accent: '#1c1c1a', accentInk: '#f2f0ea', soft: '#d2cfc7', chip: '#d6d3cb', tag: 'Developer tools · AI', glow: [0.8, 0.79, 0.76] },
  blinkscope: { dark: true, bg: '#05070c', surface: '#0d1118', ink: '#e8edf5', sub: '#98a3b5', faint: '#667085', line: '#1e2632', accent: '#8fb8ff', accentInk: '#05070c', soft: '#111a2a', chip: '#0f1622', tag: 'Astronomy', glow: [0.06, 0.07, 0.1] },
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
export const urlOf = (p) => (p.live ? host(p.live) : p.local ? p.local : isRepo(p) ? host(p.github) : 'localhost:5000')

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
/** A page with no picture of its own: the project's name and line, plainly, in its colours. */
function plainPage(g, p, T, font) {
  g.fillStyle = T.bg
  g.fillRect(0, 0, PAGE.w, PAGE.h)
  setFont(g, font, 800, 66)
  track(g, -1.6)
  g.fillStyle = T.ink
  g.fillText(fit(g, p.name || '', 1200), 96, 240)
  track(g, 0)
  setFont(g, font, 400, 21)
  g.fillStyle = T.sub
  para(g, p.oneLiner || '', 96, 300, 760, 33, 4)
  return { h: VIEW_H, button: null }
}

/**
 * The page for project `p` on a context in the screen's pixels (1440 wide, from its top): returns
 * { h (its height), button ([x, y, w, h], its main button), thumb (the scroll thumb's colour, rgba),
 * glow ([r, g, b]: how much light it gives, linear) }.
 */
/** A site's own screenshot as its page (shot: an image, as wide as the page): its light worked out once. */
function shotPage(g, shot) {
  const h = Math.min(PAGE.h, (PAGE.w * shot.height) / shot.width)
  g.drawImage(shot, 0, 0, PAGE.w, (PAGE.w * shot.height) / shot.width)
  if (!shot._glow) {
    const c = document.createElement('canvas')
    c.width = c.height = 8
    const x = c.getContext('2d', { willReadFrequently: true })
    x.drawImage(shot, 0, 0, 8, 8)
    const d = x.getImageData(0, 0, 8, 8).data
    const m = [0, 0, 0]
    for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) m[k] += Math.pow(d[i + k] / 255, 2.2) / 64
    shot._glow = m
  }
  const dark = 0.2126 * shot._glow[0] + 0.7152 * shot._glow[1] + 0.0722 * shot._glow[2] < 0.2
  return { h, button: null, thumb: dark ? [0.9, 0.93, 0.96, 0.32] : [0.06, 0.09, 0.16, 0.3], glow: shot._glow }
}

/**
 * The portfolio (the first tab): content/homePage.js's bento grid, as it lays out 1440 wide (the
 * same measures: BENTO), which replaces it up close. shots: { id: image }.
 */
function homePage(g, C, T, font, shots = {}) {
  const W = PAGE.w
  g.fillStyle = T.bg
  g.fillRect(0, 0, W, PAGE.h)
  const x0 = (W - BENTO.max) / 2 + BENTO.pad
  const cw = BENTO.max - 2 * BENTO.pad
  const gap = BENTO.gap
  const col = (cw - 11 * gap) / 12
  const span = (n) => n * col + (n - 1) * gap
  const R = BENTO.r
  const two = (p) => `${p.year}${p.live ? ' · Live' : p.local ? ' · Runs locally' : ''}`
  /** A tile's ground, clipped to its rounded corners while `draw` paints in it. */
  const box = (x, y, w, h, fill, draw) => {
    g.save()
    rr(g, x, y, w, h, R)
    g.fillStyle = fill
    g.fill()
    g.clip()
    draw?.()
    g.restore()
  }
  const project = (p, x, y, w, h) => {
    if (!p) return
    const shot = shots[p.id]
    if (shot) {
      box(x, y, w, h, '#ddd', () => {
        // (its picture: as wide as the tile, from its top)
        const k = w / shot.width
        g.drawImage(shot, 0, 0, shot.width, Math.min(shot.height, h / k), x, y, w, Math.min(h, shot.height * k))
      })
      setFont(g, font, 700, 16)
      const nw = g.measureText(p.name).width
      setFont(g, font, 400, 13)
      const tw = g.measureText(two(p)).width
      g.save()
      g.shadowColor = 'rgba(0,0,0,0.14)'
      g.shadowBlur = 14
      g.shadowOffsetY = 4
      rr(g, x + 14, y + h - 14 - 42, nw + tw + 42, 42, 21)
      g.fillStyle = 'rgba(255,255,255,0.95)'
      g.fill()
      g.restore()
      setFont(g, font, 700, 16)
      g.fillStyle = '#16171a'
      g.fillText(p.name, x + 30, y + h - 29)
      setFont(g, font, 400, 13)
      g.fillStyle = '#5c5d61'
      g.fillText(two(p), x + 40 + nw, y + h - 29)
      return
    }
    const [bg, ink] = TILE[p.id] || ['#ffffff', '#16171a']
    box(x, y, w, h, bg)
    setFont(g, font, 400, 13)
    g.fillStyle = ink
    g.globalAlpha = 0.7
    g.fillText(two(p), x + 28, y + 44)
    g.globalAlpha = 0.82
    setFont(g, font, 400, 15)
    const lines = wrap(g, p.oneLiner, w - 56).slice(0, 4)
    let ty = y + h - 26 - 14 - 20 - (lines.length - 1) * 22.5
    lines.forEach((l, i) => g.fillText(l, x + 28, ty + i * 22.5))
    g.globalAlpha = 1
    setFont(g, font, 750, 30)
    track(g, -0.9)
    const nl = wrap(g, p.name, w - 56).slice(0, 2)
    nl.forEach((l, i) => g.fillText(l, x + 28, ty - 18 - (nl.length - 1 - i) * 33))
    track(g, 0)
    setFont(g, font, 650, 14)
    g.fillText('Read →', x + 28, y + h - 28)
  }
  const sites = C.projects.filter(isSite)
  const rest = C.projects.filter((p) => !isSite(p))
  let y = BENTO.pad
  // who
  {
    const w = span(5)
    const h = BENTO.rows[0]
    box(x0, y, w, h, '#141517')
    g.fillStyle = '#62d28a'
    dot(g, x0 + 32.5, y + 36, 4.5)
    setFont(g, font, 400, 13)
    g.fillStyle = '#a9a69f'
    g.fillText(C.role.replace(/\s*·\s*builder$/i, ''), x0 + 46, y + 40.5)
    setFont(g, font, 400, 15.5)
    const bio = wrap(g, C.bio, w - 56).slice(0, 6)
    const by = y + h - 26 - (bio.length - 1) * 24 - 5
    g.fillStyle = '#d5d2cb'
    bio.forEach((l, i) => g.fillText(l, x0 + 28, by + i * 24))
    setFont(g, font, 750, 44)
    track(g, -1.5)
    g.fillStyle = '#f3f1ec'
    g.fillText(C.name, x0 + 28, by - 36)
    track(g, 0)
  }
  project(sites[0], x0 + span(5) + gap, y, span(7), BENTO.rows[0])
  y += BENTO.rows[0] + gap
  project(sites[1], x0, y, span(4), BENTO.rows[1])
  project(sites[2], x0 + span(4) + gap, y, span(4), BENTO.rows[1])
  if (C.links.github) {
    const x = x0 + 2 * (span(4) + gap)
    const w = span(4)
    const h = BENTO.rows[1]
    box(x, y, w, h, '#d6eede')
    setFont(g, font, 400, 13)
    g.fillStyle = 'rgba(22,23,26,0.7)'
    g.fillText('GitHub', x + 28, y + 44)
    setFont(g, font, 400, 15)
    g.fillStyle = 'rgba(22,23,26,0.82)'
    const ls = wrap(g, 'Everything here is open: the code for each project is a click away.', w - 56)
    const ty = y + h - 30 - (ls.length - 1) * 22.5
    ls.forEach((l, i) => g.fillText(l, x + 28, ty + i * 22.5))
    setFont(g, font, 750, 26)
    track(g, -0.8)
    g.fillStyle = '#16171a'
    g.fillText(`${githubUser(C)} ↗`, x + 28, ty - 30)
    track(g, 0)
  }
  y += BENTO.rows[1] + gap
  project(sites[3], x0, y, span(6), BENTO.rows[2])
  project(rest[0], x0 + span(6) + gap, y, span(3), BENTO.rows[2])
  project(rest[1], x0 + span(6) + gap + span(3) + gap, y, span(3), BENTO.rows[2])
  y += BENTO.rows[2] + gap
  // the stack
  box(x0, y, cw, 118, '#e6e1f7')
  setFont(g, font, 650, 13)
  g.fillStyle = 'rgba(22,23,26,0.55)'
  track(g, 0.5)
  g.fillText('WHAT I BUILD WITH', x0 + 28, y + 44)
  track(g, 0)
  setFont(g, font, 550, 13)
  let cx = x0 + 28
  for (const t of topStack(C, 14)) {
    const tw = g.measureText(t).width + 22
    if (cx + tw > x0 + cw - 28) break
    rr(g, cx, y + 62, tw, 29, 14.5)
    g.fillStyle = 'rgba(255,255,255,0.72)'
    g.fill()
    g.fillStyle = '#16171a'
    g.fillText(t, cx + 11, y + 81.5)
    cx += tw + 7
  }
  return { h: PAGE.h, button: null, thumb: [0.06, 0.09, 0.16, 0.3], glow: T.glow }
}

/** The GitHub tab: content/homePage.js's githubHtml, as it is before GitHub's own list comes. */
function githubPage(g, C, T, font) {
  const W = PAGE.w
  g.fillStyle = T.bg
  g.fillRect(0, 0, W, PAGE.h)
  const user = githubUser(C)
  const x0 = (W - 1180) / 2 + 56
  const cw = 1068
  g.fillStyle = T.surface
  g.fillRect(0, 0, W, 58)
  g.fillStyle = T.line
  g.fillRect(0, 58, W, 1)
  setFont(g, font, 650, 14)
  g.fillStyle = T.ink
  g.fillText(user, x0, 34)
  const uw = g.measureText(user).width
  setFont(g, font, 400, 14)
  g.fillStyle = T.sub
  g.fillText(' / repositories', x0 + uw, 34)
  g.textAlign = 'right'
  g.fillText('Open the profile ↗', x0 + cw, 34)
  g.textAlign = 'left'
  // the profile
  const ay = 98
  const av = g.createLinearGradient(x0, ay, x0 + 220, ay + 220)
  av.addColorStop(0, '#2b3340')
  av.addColorStop(1, '#11151b')
  g.fillStyle = av
  g.beginPath()
  g.arc(x0 + 110, ay + 110, 110, 0, Math.PI * 2)
  g.fill()
  setFont(g, font, 700, 76)
  g.fillStyle = '#f0b46a'
  g.textAlign = 'center'
  g.fillText(C.initials, x0 + 110, ay + 137)
  g.textAlign = 'left'
  setFont(g, font, 700, 26)
  g.fillStyle = T.ink
  g.fillText(C.name, x0, ay + 270)
  setFont(g, font, 400, 18)
  g.fillStyle = T.sub
  g.fillText(user, x0, ay + 298)
  setFont(g, font, 400, 15)
  g.fillStyle = T.ink
  g.fillText(C.role, x0, ay + 332)
  rr(g, x0, ay + 352, 220, 40, 8)
  g.fillStyle = T.surface
  g.fill()
  g.strokeStyle = '#d0d5dc'
  g.stroke()
  setFont(g, font, 600, 14)
  g.textAlign = 'center'
  g.fillText('Follow on GitHub ↗', x0 + 110, ay + 377)
  g.textAlign = 'left'
  // the repositories
  const rx = x0 + 328
  const rw = cw - 328
  const repos = C.projects.filter((p) => p.github)
  setFont(g, font, 600, 15)
  g.fillStyle = T.ink
  g.fillText('Repositories', rx + 2, ay + 2)
  g.fillStyle = T.ink
  g.fillRect(rx, ay + 18, 104, 2)
  g.fillStyle = T.line
  g.fillRect(rx, ay + 20, rw, 1)
  const w = (rw - 14) / 2
  repos.forEach((p, i) => {
    const cx = rx + (i % 2) * (w + 14)
    const cy = ay + 40 + Math.floor(i / 2) * 146
    rr(g, cx, cy, w, 132, 12)
    g.fillStyle = T.surface
    g.fill()
    g.strokeStyle = T.line
    g.stroke()
    setFont(g, font, 650, 16)
    g.fillStyle = T.accent
    const name = p.github.replace(/\/+$/, '').split('/').pop()
    g.fillText(name, cx + 20, cy + 32)
    setFont(g, font, 400, 14)
    g.fillStyle = T.sub
    para(g, p.oneLiner, cx + 20, cy + 60, w - 40, 21, 2)
    g.fillStyle = '#9aa3ae'
    dot(g, cx + 25, cy + 110, 5)
    setFont(g, font, 400, 12.5)
    g.fillStyle = T.faint
    g.fillText(p.stack[0] || '', cx + 36, cy + 114)
  })
  return { h: PAGE.h, button: null, thumb: [0.06, 0.09, 0.16, 0.3], glow: T.glow }
}

export function drawPage(g, p, font, shot) {
  if (p.home) return homePage(g, p.content, themeOf(p), font, p.shots)
  if (p.githubTab) return githubPage(g, p.content, themeOf(p), font)
  if (shot) return shotPage(g, shot)
  const T = themeOf(p)
  return { ...plainPage(g, p, T, font), thumb: T.dark ? [0.9, 0.93, 0.96, 0.32] : [0.06, 0.09, 0.16, 0.3], glow: T.glow }
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
