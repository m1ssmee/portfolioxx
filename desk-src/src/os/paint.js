// The screen texture, painted from the live DOM: the browser lays the OS out (the same layout the
// visitor sees up close), this walks it and paints each box, border, glyph and icon into a canvas.
// Only what Pod OS uses is supported: solid backgrounds with rounded corners, the wallpaper tile,
// 1 px borders, focus outlines, text, the icon set, images and canvases, scrolling clips.
import { iconPaths } from './icons.js'

const ascents = new Map()
function ascentOf(ctx, font) {
  let a = ascents.get(font)
  if (a === undefined) {
    ctx.font = font
    const m = ctx.measureText('Hg')
    a = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent
    ascents.set(font, a)
  }
  return a
}
const px = (v) => parseFloat(v) || 0
const clear = (c) => !c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)'
function radius(cs, w, h) {
  const r = cs.borderTopLeftRadius
  if (!r || r === '0px') return 0
  const v = r.endsWith('%') ? (Math.min(w, h) * parseFloat(r)) / 100 : px(r)
  return Math.min(v, w / 2, h / 2)
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  if (r > 0) ctx.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

/**
 * Paint `root` (laid out, not transformed) into `canvas` at `scale` canvas px per CSS px.
 * patterns: { name: CanvasPattern } for elements with data-wall; images are drawn as they are.
 */
export function paintDom(root, canvas, scale, patterns = {}) {
  const ctx = canvas.getContext('2d')
  const rr = root.getBoundingClientRect()
  const ox = rr.left
  const oy = rr.top
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const range = document.createRange()

  const walk = (el, alpha) => {
    if (el.dataset && el.dataset.paint === 'skip') return
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return
    const a = alpha * px(cs.opacity === '' ? '1' : cs.opacity)
    if (a <= 0.003) return
    const b = el.getBoundingClientRect()
    const x = b.left - ox
    const y = b.top - oy
    const w = b.width
    const h = b.height
    if (w <= 0 || h <= 0) return
    ctx.globalAlpha = a
    const r = radius(cs, w, h)
    // the box: background colour, the wallpaper, the border
    if (!clear(cs.backgroundColor)) {
      ctx.fillStyle = cs.backgroundColor
      rrect(ctx, x, y, w, h, r)
      ctx.fill()
    }
    const wall = el.dataset && el.dataset.wallTile && patterns[el.dataset.wallTile]
    if (wall) {
      ctx.save()
      ctx.translate(x, y)
      ctx.fillStyle = wall
      rrect(ctx, 0, 0, w, h, r)
      ctx.fill()
      ctx.restore()
    }
    const bw = px(cs.borderTopWidth)
    const sides = [bw, px(cs.borderRightWidth), px(cs.borderBottomWidth), px(cs.borderLeftWidth)]
    if (sides[0] === sides[1] && sides[1] === sides[2] && sides[2] === sides[3]) {
      if (bw > 0 && cs.borderTopStyle !== 'none' && !clear(cs.borderTopColor)) {
        ctx.strokeStyle = cs.borderTopColor
        ctx.lineWidth = bw
        rrect(ctx, x + bw / 2, y + bw / 2, w - bw, h - bw, Math.max(0, r - bw / 2))
        ctx.stroke()
      }
    } else {
      // (sides of their own: straight lines, as the UI's rules are)
      const col = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor]
      const seg = [
        [x, y + sides[0] / 2, x + w, y + sides[0] / 2],
        [x + w - sides[1] / 2, y, x + w - sides[1] / 2, y + h],
        [x, y + h - sides[2] / 2, x + w, y + h - sides[2] / 2],
        [x + sides[3] / 2, y, x + sides[3] / 2, y + h],
      ]
      for (let i = 0; i < 4; i++) {
        if (!(sides[i] > 0) || clear(col[i])) continue
        ctx.strokeStyle = col[i]
        ctx.lineWidth = sides[i]
        ctx.beginPath()
        ctx.moveTo(seg[i][0], seg[i][1])
        ctx.lineTo(seg[i][2], seg[i][3])
        ctx.stroke()
      }
    }
    // what the element is
    const tag = el.tagName
    if (tag === 'svg' || tag === 'SVG') {
      const name = el.dataset.ic
      if (name) {
        ctx.save()
        ctx.translate(x, y)
        const s = w / 24
        ctx.scale(s, h / 24)
        ctx.strokeStyle = cs.color
        ctx.lineWidth = px(cs.strokeWidth || '1.5') / s
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        for (const p of iconPaths(name)) ctx.stroke(p)
        ctx.restore()
      }
      paintOutline(ctx, cs, x, y, w, h, r)
      return
    }
    if (tag === 'IMG' || tag === 'CANVAS') {
      const src = el
      const sw = tag === 'IMG' ? src.naturalWidth : src.width
      const sh = tag === 'IMG' ? src.naturalHeight : src.height
      if (sw && sh) {
        // (object-fit: cover)
        const k = Math.max(w / sw, h / sh)
        const cw = w / k
        const ch = h / k
        ctx.save()
        rrect(ctx, x, y, w, h, r)
        ctx.clip()
        ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, w, h)
        ctx.restore()
      }
      return
    }
    if (tag === 'INPUT') {
      if (el.value) {
        const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
        ctx.font = font
        ctx.fillStyle = cs.color
        const lh = px(cs.lineHeight) || h
        ctx.fillText(el.value, x + px(cs.paddingLeft), y + (h - lh) / 2 + (lh - px(cs.fontSize)) / 2 + ascentOf(ctx, font) * (px(cs.fontSize) / px(cs.fontSize)))
      }
      return
    }
    // the children, clipped to the box if it scrolls or hides overflow
    const clips = cs.overflowX !== 'visible' || cs.overflowY !== 'visible'
    if (clips) {
      ctx.save()
      rrect(ctx, x, y, w, h, r)
      ctx.clip()
    }
    for (const n of el.childNodes) {
      if (n.nodeType === 1) walk(n, a)
      else if (n.nodeType === 3 && n.data.trim()) paintText(n, cs, a)
    }
    if (clips) ctx.restore()
    ctx.globalAlpha = a
    paintOutline(ctx, cs, x, y, w, h, r)
  }

  const paintText = (node, cs, a) => {
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    ctx.font = font
    ctx.fillStyle = cs.color
    ctx.globalAlpha = a
    const asc = ascentOf(ctx, font)
    ctx.font = font
    const s = node.data
    // (tabular figures: canvas text has none, so each character goes where the DOM put it)
    const tabular = cs.fontVariantNumeric.includes('tabular')
    // word by word (a word never breaks across lines here; a long one in the terminal may: then
    // letter by letter)
    const re = /\S+/g
    let m
    while ((m = re.exec(s))) {
      range.setStart(node, m.index)
      range.setEnd(node, m.index + m[0].length)
      const rects = range.getClientRects()
      if (rects.length === 1 && !(tabular && /\d/.test(m[0]))) {
        const q = rects[0]
        ctx.fillText(m[0], q.left - ox, q.top - oy + asc)
      } else
        for (let i = 0; i < m[0].length; i++) {
          range.setStart(node, m.index + i)
          range.setEnd(node, m.index + i + 1)
          const q = range.getBoundingClientRect()
          if (q.width > 0) ctx.fillText(m[0][i], q.left - ox, q.top - oy + asc)
        }
    }
  }
  walk(root, 1)
  ctx.globalAlpha = 1
  range.detach?.()
}

function paintOutline(ctx, cs, x, y, w, h, r) {
  const ow = px(cs.outlineWidth)
  if (ow > 0 && cs.outlineStyle !== 'none' && !clear(cs.outlineColor)) {
    const off = px(cs.outlineOffset)
    ctx.strokeStyle = cs.outlineColor
    ctx.lineWidth = ow
    const d = off + ow / 2
    rrect(ctx, x - d, y - d, w + 2 * d, h + 2 * d, r > 0 ? r + d : 10 + d)
    ctx.stroke()
  }
}
