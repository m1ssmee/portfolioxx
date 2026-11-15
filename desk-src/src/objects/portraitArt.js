// Three pictures for the wall, drawn here stroke by stroke on a 2D canvas (no three.js, no image
// files), each with something alive in it:
//   ink    a long pale face on black, in pen and hatching, its eyes cast down: it blinks;
//   void   a figure whose head is a dark oval in a wreath, two lit eyes in it: they blink;
//   coal   a bald figure in charcoal that, every so often, picks out one of its eyes and eats it;
//          the eye grows back.
// Each: make(w, h) -> { draw(g, state), state(t) }: draw() paints the whole picture for a state;
// state(t) is the picture's state at time t (s), and `key`, a number that changes only when the
// picture does (so it is painted again only then).

/** A seeded random. */
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
const lerp = (a, b, t) => a + (b - a) * t
const sat = (t) => (t < 0 ? 0 : t > 1 ? 1 : t)
const ease = (t) => {
  t = sat(t)
  return t * t * (3 - 2 * t)
}
/** 0..1 over [a, b]. */
const span = (t, a, b) => sat((t - a) / (b - a))
const layer = (w, h) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/**
 * Hatching: a region (path(g) builds it) filled with pen strokes at `angle`, `gap` px apart, each
 * a little unsteady and broken here and there.
 */
function hatch(g, path, { angle = 0.6, gap = 5, alpha = 0.7, width = 1, color = '#0a0909', wobble = 1.2, r }) {
  g.save()
  g.beginPath()
  path(g)
  g.clip()
  g.strokeStyle = color
  g.lineWidth = width
  g.lineCap = 'round'
  const W = g.canvas.width
  const H = g.canvas.height
  const L = Math.hypot(W, H)
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  for (let d = -L; d < L; d += gap) {
    // a line across the canvas at distance d from its middle, drawn in short runs
    const ox = W / 2 - s * d
    const oy = H / 2 + c * d
    let t = -L
    while (t < L) {
      const run = 14 + r() * 46
      g.globalAlpha = alpha * (0.55 + 0.45 * r())
      g.beginPath()
      g.moveTo(ox + c * t + (r() - 0.5) * wobble, oy + s * t + (r() - 0.5) * wobble)
      g.lineTo(ox + c * (t + run) + (r() - 0.5) * wobble, oy + s * (t + run) + (r() - 0.5) * wobble)
      g.stroke()
      t += run + (r() < 0.12 ? 5 + r() * 9 : 0.5)
    }
  }
  g.restore()
}
/** A pen line through points, its weight swelling in the middle. */
function pen(g, pts, width = 2, color = '#0a0909') {
  g.save()
  g.strokeStyle = color
  g.lineCap = g.lineJoin = 'round'
  for (const k of [1, 0.55]) {
    g.lineWidth = width * k
    g.globalAlpha = k === 1 ? 0.9 : 1
    g.beginPath()
    g.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2)
    g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1])
    g.stroke()
  }
  g.restore()
}
/** A blink: 0 open, 1 shut, for a blink that began `dt` seconds ago. */
const blinkAt = (dt) => (dt < 0 || dt > 0.3 ? 0 : dt < 0.09 ? ease(dt / 0.09) : dt < 0.14 ? 1 : 1 - ease((dt - 0.14) / 0.16))
/** When something blinks: its blinks' times from a seed, a few seconds apart, sometimes twice running. */
function blinker(seed) {
  const r = rng(seed)
  const times = []
  let t = 1.2 + r() * 2
  for (let i = 0; i < 64; i++) {
    times.push(t)
    if (r() < 0.22) times.push(t + 0.42)
    t += 2.6 + r() * 4.2
  }
  const loop = t
  return (time) => {
    const tt = time % loop
    let k = 0
    for (const b of times) k = Math.max(k, blinkAt(tt - b))
    return k
  }
}

// =================================================================================================
// ink: a long pale face on black, its eyes cast down
// =================================================================================================
export function makeInk(w, h) {
  const r = rng(11)
  const cx = w * 0.5
  const cy = h * 0.47
  const rx = w * 0.3
  const ry = h * 0.385
  const face = (g) => {
    g.moveTo(cx, cy - ry)
    g.bezierCurveTo(cx + rx * 1.3, cy - ry, cx + rx * 1.08, cy + ry * 0.56, cx + rx * 0.04, cy + ry)
    g.bezierCurveTo(cx - rx * 1.02, cy + ry * 0.56, cx - rx * 1.3, cy - ry, cx, cy - ry)
  }
  const still = layer(w, h)
  {
    const g = still.getContext('2d')
    g.fillStyle = '#0b0a0a'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(255,250,240,${0.015 + r() * 0.03})`
      g.fillRect(r() * w, r() * h, 1 + r() * 1.6, 1 + r() * 1.6)
    }
    g.save()
    g.translate(cx, cy)
    g.rotate(-0.07)
    g.translate(-cx, -cy)
    g.beginPath()
    face(g)
    g.fillStyle = '#f2ede3'
    g.fill()
    // ---- shade, in hatching: down its right side, a little down its left, under the brow, in
    // the cheeks, under the lip, over the top of the head
    const ell = (x, y, a, b, rot = 0) => (q) => q.ellipse(x, y, a, b, rot, 0, Math.PI * 2)
    g.save()
    g.beginPath()
    face(g)
    g.clip()
    hatch(g, (q) => { q.rect(0, 0, w, h); q.ellipse(cx - rx * 0.3, cy - ry * 0.02, rx * 1.02, ry * 1.04, 0, 0, Math.PI * 2, true) }, { angle: 1.25, gap: 4.2, alpha: 0.85, r })
    hatch(g, (q) => { q.rect(0, 0, w, h); q.ellipse(cx - rx * 0.12, cy - ry * 0.02, rx * 0.98, ry * 1.06, 0, 0, Math.PI * 2, true) }, { angle: 1.25, gap: 6.5, alpha: 0.6, r })
    hatch(g, (q) => { q.rect(0, 0, w, h); q.ellipse(cx + rx * 0.34, cy + ry * 0.02, rx * 1.06, ry * 1.08, 0, 0, Math.PI * 2, true) }, { angle: -1.15, gap: 6, alpha: 0.6, r })
    hatch(g, (q) => { q.rect(0, 0, w, h); q.ellipse(cx, cy + ry * 0.2, rx * 1.3, ry * 1.05, 0, 0, Math.PI * 2, true) }, { angle: 0.1, gap: 5, alpha: 0.6, r })
    for (const s of [-1, 1]) {
      hatch(g, ell(cx + s * rx * 0.42, cy - ry * 0.2, rx * 0.36, ry * 0.15, s * 0.25), { angle: s * 0.5, gap: 4.4, alpha: 0.55, r })
      hatch(g, ell(cx + s * rx * 0.44, cy - ry * 0.09, rx * 0.3, ry * 0.07, s * 0.2), { angle: -s * 0.9, gap: 4, alpha: 0.5, r })
      hatch(g, ell(cx + s * rx * 0.56, cy + ry * 0.3, rx * 0.2, ry * 0.26, s * 0.3), { angle: s * 1.0, gap: 5.5, alpha: 0.5, r })
    }
    hatch(g, ell(cx, cy + ry * 0.67, rx * 0.26, ry * 0.05), { angle: 0.3, gap: 3.6, alpha: 0.6, r })
    hatch(g, ell(cx + rx * 0.08, cy + ry * 0.2, rx * 0.11, ry * 0.05), { angle: 0.9, gap: 3.4, alpha: 0.55, r })
    g.restore()
    g.beginPath()
    face(g)
    g.lineWidth = 2.4
    g.strokeStyle = '#0a0909'
    g.stroke()
    // ---- the features, in pen
    const P = (x, y) => [cx + x * rx, cy + y * ry]
    for (const s of [-1, 1]) {
      // the brow: its inner end drawn up
      pen(g, [P(s * 0.1, -0.385), P(s * 0.3, -0.37), P(s * 0.55, -0.31), P(s * 0.74, -0.24)], 3.6)
      pen(g, [P(s * 0.12, -0.41), P(s * 0.32, -0.4), P(s * 0.52, -0.345)], 1.3)
      // the lines under the eye
      pen(g, [P(s * 0.2, -0.085), P(s * 0.42, -0.045), P(s * 0.66, -0.085)], 1.2)
      pen(g, [P(s * 0.26, -0.045), P(s * 0.44, -0.012), P(s * 0.62, -0.04)], 1)
      // from the nose down round the mouth
      pen(g, [P(s * 0.2, 0.2), P(s * 0.36, 0.3), P(s * 0.4, 0.46), P(s * 0.34, 0.58)], 1.5)
    }
    // the forehead
    pen(g, [P(-0.3, -0.62), P(0, -0.66), P(0.32, -0.61)], 1.1)
    pen(g, [P(-0.36, -0.54), P(0.02, -0.585), P(0.4, -0.53)], 1.2)
    pen(g, [P(-0.05, -0.47), P(-0.03, -0.38)], 1.3)
    pen(g, [P(0.06, -0.47), P(0.05, -0.39)], 1.2)
    // the nose
    pen(g, [P(0.07, -0.3), P(0.1, -0.06), P(0.16, 0.12), P(0.1, 0.2), P(-0.02, 0.22)], 1.9)
    pen(g, [P(-0.16, 0.13), P(-0.19, 0.19), P(-0.1, 0.21)], 1.7)
    pen(g, [P(-0.07, 0.2), P(-0.02, 0.185), P(0.04, 0.2)], 2.4)
    // the mouth: a little open, its corners down
    pen(g, [P(-0.3, 0.47), P(-0.14, 0.415), P(-0.03, 0.44), P(0.08, 0.41), P(0.28, 0.47)], 2.6)
    pen(g, [P(-0.27, 0.48), P(-0.1, 0.5), P(0.1, 0.5), P(0.25, 0.48)], 1.3)
    pen(g, [P(-0.2, 0.52), P(0, 0.575), P(0.2, 0.52)], 2.1)
    g.fillStyle = '#0a0909'
    g.beginPath()
    g.moveTo(...P(-0.26, 0.475))
    g.quadraticCurveTo(...P(0, 0.445), ...P(0.25, 0.475))
    g.quadraticCurveTo(...P(0, 0.52), ...P(-0.26, 0.475))
    g.fill()
    g.restore()
  }
  const blink = blinker(31)
  return {
    state(t) {
      const lid = blink(t)
      // (half shut at rest: it looks down)
      const shut = lerp(0.42, 1, lid)
      return { shut, key: Math.round(shut * 40) }
    },
    draw(g, st) {
      g.drawImage(still, 0, 0)
      g.save()
      g.translate(cx, cy)
      g.rotate(-0.07)
      g.translate(-cx, -cy)
      for (const s of [-1, 1]) {
        const ex = cx + s * rx * 0.43
        const ey = cy - ry * 0.155
        const ew = rx * 0.25
        const eh = ry * 0.062
        const droop = s * 0.13
        g.save()
        g.translate(ex, ey)
        g.rotate(droop)
        // the eye's opening
        const opening = () => {
          g.beginPath()
          g.moveTo(-ew, 0)
          g.quadraticCurveTo(0, -eh * 1.9, ew, eh * 0.2)
          g.quadraticCurveTo(0, eh * 1.5, -ew, 0)
          g.closePath()
        }
        opening()
        g.fillStyle = '#e4dfd4'
        g.fill()
        g.save()
        opening()
        g.clip()
        // the iris, looking down
        g.fillStyle = '#0a0909'
        g.beginPath()
        g.arc(-s * ew * 0.08, eh * 0.55, eh * 1.05, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#f2ede3'
        g.beginPath()
        g.arc(-s * ew * 0.16, eh * 0.2, eh * 0.24, 0, Math.PI * 2)
        g.fill()
        // the lid, coming down over it
        const edge = lerp(-eh * 1.9, eh * 1.5, st.shut)
        g.fillStyle = '#f2ede3'
        g.beginPath()
        g.moveTo(-ew * 1.2, -eh * 3)
        g.lineTo(ew * 1.2, -eh * 3)
        g.lineTo(ew * 1.2, eh * 0.2 * st.shut)
        g.quadraticCurveTo(0, edge * 1.02 + eh * 0.3, -ew * 1.2, 0)
        g.closePath()
        g.fill()
        g.strokeStyle = 'rgba(10,9,9,0.5)'
        g.lineWidth = 1
        for (let k = 1; k <= 3; k++) {
          g.beginPath()
          g.moveTo(-ew, -eh * 0.5 * k)
          g.quadraticCurveTo(0, edge - eh * 0.75 * k, ew, -eh * 0.3 * k)
          g.stroke()
        }
        g.restore()
        // the lid's edge, heavy; the lower lid, light
        g.strokeStyle = '#0a0909'
        g.lineCap = 'round'
        g.lineWidth = 2.6
        g.beginPath()
        g.moveTo(-ew, 0)
        g.quadraticCurveTo(0, edge + eh * 0.3, ew, eh * 0.2)
        g.stroke()
        g.lineWidth = 1.2
        g.beginPath()
        g.moveTo(-ew, 0)
        g.quadraticCurveTo(0, eh * 1.5, ew, eh * 0.2)
        g.stroke()
        g.lineWidth = 1.4
        g.beginPath()
        g.moveTo(-ew * 1.02, -eh * 0.9)
        g.quadraticCurveTo(0, -eh * 2.9, ew * 1.05, -eh * 0.5)
        g.stroke()
        g.restore()
      }
      g.restore()
    },
  }
}

// =================================================================================================
// void: a figure whose head is a dark oval in a wreath, two lit eyes in it
// =================================================================================================
export function makeVoid(w, h) {
  const r = rng(23)
  const cx = w * 0.5
  const cy = h * 0.36
  const rx = w * 0.215
  const ry = h * 0.235
  const still = layer(w, h)
  {
    const g = still.getContext('2d')
    g.fillStyle = '#0b0a0a'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 3000; i++) {
      g.fillStyle = `rgba(255,250,240,${0.012 + r() * 0.028})`
      g.fillRect(r() * w, r() * h, 1 + r() * 1.6, 1 + r() * 1.6)
    }
    // the bust: a neck, sloping shoulders, out of the picture's foot
    const bust = (q) => {
      q.moveTo(w * 0.04, h)
      q.bezierCurveTo(w * 0.06, h * 0.84, w * 0.2, h * 0.79, w * 0.34, h * 0.75)
      q.bezierCurveTo(w * 0.41, h * 0.73, w * 0.41, h * 0.66, w * 0.405, h * 0.56)
      q.lineTo(w * 0.6, h * 0.56)
      q.bezierCurveTo(w * 0.6, h * 0.66, w * 0.61, h * 0.72, w * 0.7, h * 0.745)
      q.bezierCurveTo(w * 0.86, h * 0.79, w * 0.96, h * 0.85, w * 0.98, h)
      q.closePath()
    }
    g.beginPath()
    bust(g)
    g.fillStyle = '#f0ebe1'
    g.fill()
    g.save()
    g.beginPath()
    bust(g)
    g.clip()
    hatch(g, (q) => { q.rect(0, 0, w, h); q.ellipse(w * 0.6, h * 0.86, w * 0.26, h * 0.13, -0.2, 0, Math.PI * 2, true) }, { angle: 0.32, gap: 4.6, alpha: 0.75, r })
    hatch(g, (q) => q.rect(0, h * 0.74, w * 0.42, h), { angle: -0.5, gap: 6, alpha: 0.55, r })
    hatch(g, (q) => q.rect(w * 0.38, h * 0.54, w * 0.12, h * 0.24), { angle: 1.35, gap: 4, alpha: 0.7, r })
    hatch(g, (q) => q.rect(w * 0.4, h * 0.54, w * 0.2, h * 0.07), { angle: 0.1, gap: 3.6, alpha: 0.8, r })
    g.restore()
    g.beginPath()
    bust(g)
    g.lineWidth = 2.2
    g.strokeStyle = '#0a0909'
    g.stroke()
    pen(g, [[w * 0.36, h * 0.8], [w * 0.47, h * 0.83], [w * 0.56, h * 0.8]], 1.4)
    // the wreath: leaves round the oval, lapping one over the next, tips out
    const N = 34
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2 - Math.PI / 2
      const px = cx + Math.cos(a) * rx * 1.07
      const py = cy + Math.sin(a) * ry * 1.06
      const tangent = Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx)
      const side = Math.cos(a) >= 0 ? 1 : -1
      g.save()
      g.translate(px, py)
      g.rotate(tangent + side * 0.55 + (r() - 0.5) * 0.25)
      const L = w * (0.058 + r() * 0.02)
      g.beginPath()
      g.moveTo(-L * 0.5, 0)
      g.quadraticCurveTo(0, -L * 0.36, L * 0.62, 0)
      g.quadraticCurveTo(0, L * 0.3, -L * 0.5, 0)
      g.fillStyle = '#efe9de'
      g.fill()
      g.lineWidth = 1.3
      g.strokeStyle = '#0a0909'
      g.stroke()
      g.lineWidth = 0.9
      g.beginPath()
      g.moveTo(-L * 0.42, 0)
      g.lineTo(L * 0.5, 0)
      g.stroke()
      for (let q = 0; q < 3; q++) {
        g.globalAlpha = 0.6
        g.beginPath()
        g.moveTo(-L * 0.25 + q * L * 0.2, L * 0.02)
        g.lineTo(-L * 0.12 + q * L * 0.2, L * 0.16)
        g.stroke()
      }
      g.restore()
    }
    // the oval itself
    g.beginPath()
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    g.fillStyle = '#050505'
    g.fill()
    g.lineWidth = 2
    g.strokeStyle = '#0a0909'
    g.stroke()
  }
  const blink = blinker(57)
  return {
    state(t) {
      const lid = blink(t)
      return { lid, key: Math.round(lid * 40) }
    },
    draw(g, st) {
      g.drawImage(still, 0, 0)
      for (const s of [-1, 1]) {
        const ex = cx + s * rx * 0.4
        const ey = cy - ry * 0.02 + (s > 0 ? ry * 0.03 : 0)
        const er = rx * 0.165
        const open = 1 - st.lid
        // its light on the dark round it
        const glow = g.createRadialGradient(ex, ey, er * 0.4, ex, ey, er * 3.4)
        glow.addColorStop(0, `rgba(255,250,236,${0.34 * (0.25 + 0.75 * open)})`)
        glow.addColorStop(0.45, `rgba(255,250,236,${0.08 * open})`)
        glow.addColorStop(1, 'rgba(255,250,236,0)')
        g.fillStyle = glow
        g.fillRect(ex - er * 3.5, ey - er * 3.5, er * 7, er * 7)
        g.fillStyle = '#fffaf0'
        g.beginPath()
        g.ellipse(ex, ey, er, Math.max(er * 0.06, er * open), 0, 0, Math.PI * 2)
        g.fill()
      }
    },
  }
}

// =================================================================================================
// coal: a bald figure in charcoal; now and then it picks out an eye and eats it
// =================================================================================================
export function makeCoal(w, h) {
  const r = rng(41)
  const cx = w * 0.47
  const cy = h * 0.4
  const rx = w * 0.225
  const ry = h * 0.27
  const eyeY = cy - ry * 0.05
  const eyeL = [cx - rx * 0.44, eyeY]
  const eyeR = [cx + rx * 0.42, eyeY]
  const mouth = [cx - rx * 0.02, cy + ry * 0.56]
  const ER = rx * 0.235 // (an eye's radius)
  const still = layer(w, h)
  const grain = layer(w, h)
  {
    const g = grain.getContext('2d')
    for (let i = 0; i < w * h * 0.11; i++) {
      const v = r() < 0.5 ? 0 : 255
      g.fillStyle = `rgba(${v},${v},${v},${0.03 + r() * 0.07})`
      g.fillRect(r() * w, r() * h, 1 + r() * 1.8, 1 + r() * 1.8)
    }
  }
  /** A smudged shape: filled soft, as charcoal rubbed with a finger. */
  const smudge = (g, path, fill, blur) => {
    g.save()
    g.shadowColor = fill
    g.shadowBlur = blur
    g.fillStyle = fill
    g.beginPath()
    path(g)
    g.fill()
    g.restore()
  }
  {
    const g = still.getContext('2d')
    g.fillStyle = '#1c1c1d'
    g.fillRect(0, 0, w, h)
    // the ground: charcoal laid on in strokes every way
    g.lineCap = 'round'
    for (let i = 0; i < 900; i++) {
      const x = r() * w
      const y = r() * h
      const a = r() * Math.PI
      const L = 20 + r() * 70
      g.strokeStyle = `rgba(${r() < 0.5 ? '70,70,72' : '8,8,9'},${0.05 + r() * 0.08})`
      g.lineWidth = 2 + r() * 7
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L)
      g.stroke()
    }
    // the figure: shoulders, neck, a long bald head
    smudge(g, (q) => {
      q.moveTo(-w * 0.05, h * 1.02)
      q.bezierCurveTo(w * 0.02, h * 0.8, w * 0.22, h * 0.76, w * 0.36, h * 0.72)
      q.lineTo(w * 0.6, h * 0.72)
      q.bezierCurveTo(w * 0.78, h * 0.76, w * 0.98, h * 0.82, w * 1.05, h * 1.02)
      q.closePath()
    }, '#8c8985', 14)
    smudge(g, (q) => q.rect(cx - rx * 0.4, cy + ry * 0.7, rx * 0.84, ry * 0.75), '#96938e', 10)
    smudge(g, (q) => {
      q.moveTo(cx, cy - ry)
      q.bezierCurveTo(cx + rx * 1.28, cy - ry, cx + rx * 1.12, cy + ry * 0.5, cx + rx * 0.1, cy + ry)
      q.bezierCurveTo(cx - rx * 1.0, cy + ry * 0.55, cx - rx * 1.28, cy - ry, cx, cy - ry)
    }, '#b4b1ab', 12)
    // light on the crown, shade down one side and under the jaw
    const light = g.createRadialGradient(cx - rx * 0.25, cy - ry * 0.55, 4, cx - rx * 0.1, cy - ry * 0.3, rx * 1.3)
    light.addColorStop(0, 'rgba(232,229,222,0.5)')
    light.addColorStop(1, 'rgba(232,229,222,0)')
    g.fillStyle = light
    g.fillRect(0, 0, w, h)
    smudge(g, (q) => q.ellipse(cx + rx * 0.72, cy + ry * 0.2, rx * 0.2, ry * 0.6, 0.15, 0, Math.PI * 2), 'rgba(40,40,42,0.35)', 22)
    smudge(g, (q) => q.ellipse(cx, cy + ry * 1.02, rx * 0.5, ry * 0.1, 0, 0, Math.PI * 2), 'rgba(30,30,32,0.5)', 14)
    // the hollows its eyes sit in
    for (const e of [eyeL, eyeR]) smudge(g, (q) => q.ellipse(e[0], e[1] + ER * 0.2, ER * 1.75, ER * 1.5, 0, 0, Math.PI * 2), 'rgba(48,47,48,0.55)', 18)
    // a few white marks where the chalk skipped
    g.strokeStyle = 'rgba(240,238,232,0.4)'
    g.lineWidth = 1.4
    for (let i = 0; i < 5; i++) {
      const x = cx - rx * 0.5 + r() * rx * 0.8
      const y = cy - ry * 0.8 + r() * ry * 0.3
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + 18 + r() * 16, y - 6 - r() * 8)
      g.stroke()
    }
    // the dark at the picture's foot
    for (let i = 0; i < 700; i++) {
      const x = r() * w
      const y = h * (0.86 + r() * 0.16)
      g.strokeStyle = `rgba(6,6,7,${0.2 + r() * 0.35})`
      g.lineWidth = 1.5 + r() * 3
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + (r() - 0.5) * 14, y - 10 - r() * 26)
      g.stroke()
    }
  }
  /** An eye: white, its pupil looking (lx, ly); `k` its size, `lid` how far shut. */
  function eyeball(g, x, y, k, lx, ly, lid = 0) {
    g.save()
    g.translate(x, y)
    g.shadowColor = 'rgba(10,10,10,0.6)'
    g.shadowBlur = 5
    g.fillStyle = '#f1efe9'
    g.beginPath()
    g.ellipse(0, 0, ER * k, ER * k * Math.max(0.08, 0.72 * (1 - lid)), 0, 0, Math.PI * 2)
    g.fill()
    g.shadowBlur = 0
    if (lid < 0.7) {
      g.fillStyle = '#0a0a0a'
      g.beginPath()
      g.arc(lx * ER * k * 0.42, ly * ER * k * 0.3, ER * k * 0.44, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#f1efe9'
      g.beginPath()
      g.arc(lx * ER * k * 0.42 + ER * k * 0.16, ly * ER * k * 0.3 - ER * k * 0.16, ER * k * 0.1, 0, Math.PI * 2)
      g.fill()
    }
    g.restore()
  }
  /** Its hand, dark, at (x, y), turned `a`; pinch: 0 open, 1 finger and thumb together. */
  function hand(g, x, y, a, pinch) {
    g.save()
    g.translate(x, y)
    g.rotate(a)
    const U = rx * 0.2
    const part = (px, py, len, wid, rot) => {
      g.save()
      g.translate(px, py)
      g.rotate(rot)
      g.beginPath()
      g.roundRect(-wid / 2, -len, wid, len, wid / 2)
      g.fill()
      g.stroke()
      g.restore()
    }
    g.fillStyle = '#343335'
    g.strokeStyle = 'rgba(214,210,203,0.7)'
    g.lineWidth = 1.6
    g.shadowColor = 'rgba(0,0,0,0.5)'
    g.shadowBlur = 8
    // the wrist and the arm down out of the picture
    part(0, U * 9.5, U * 9, U * 2.3, 0)
    g.shadowBlur = 0
    g.beginPath()
    g.roundRect(-U * 1.5, -U * 0.3, U * 3, U * 2.6, U)
    g.fill()
    g.stroke()
    // three fingers curled back, then the first finger and the thumb, which do the work
    part(U * 1.15, U * 0.1, U * 1.9, U * 0.82, 0.5)
    part(U * 0.5, -U * 0.15, U * 2.2, U * 0.84, 0.3)
    part(-U * 0.25, -U * 0.25, U * 2.5, U * 0.86, lerp(0.05, -0.16, pinch))
    part(-U * 1.25, U * 0.75, U * 2.2, U * 0.9, lerp(-1.0, -0.46, pinch))
    g.restore()
  }
  const blink = blinker(77)
  const LOOP = 13
  // (where its finger and thumb meet, from the hand's own point: up its first finger)
  const TIP = [-rx * 0.13, -rx * 0.5]
  return {
    loop: LOOP,
    /** t: seconds; the act begins `at` seconds into each loop (3.4). */
    state(t) {
      const u = t % LOOP
      const a = u - 3.4 // (time into the act)
      // (drawn like an animation: twelve pictures a second while anything moves)
      const acting = a > 0 && a < 8.4
      const q = acting ? Math.floor(a * 12) / 12 : a
      const st = { reach: 0, pinch: 0, out: 0, eye: [eyeR[0], eyeR[1]], mouth: 0, chew: 0, grow: 1, gone: false, look: [0, 0], lid: blink(t), hand: null }
      if (q > 0 && q < 8.4) {
        st.lid = 0
        const rest = [w * 0.86, h * 1.2]
        const atEye = [eyeR[0] - TIP[0], eyeR[1] - TIP[1]]
        const atMouth = [mouth[0] - TIP[0] + rx * 0.1, mouth[1] - TIP[1]]
        let hp
        if (q < 1.0) {
          // the hand comes up to the eye
          const k = ease(q / 1.0)
          hp = [lerp(rest[0], atEye[0], k), lerp(rest[1], atEye[1], k)]
          st.look = [0.9 * k, 0.5 * k]
        } else if (q < 1.6) {
          // it takes hold
          hp = atEye
          st.pinch = ease((q - 1.0) / 0.5)
          st.look = [0.9, 0.5]
        } else if (q < 2.4) {
          // and draws it out
          const k = ease((q - 1.6) / 0.8)
          hp = [atEye[0] + rx * 0.5 * k, atEye[1] + ry * 0.12 * k]
          st.pinch = 1
          st.out = k
          st.gone = true
          st.look = [0.6, 0.2]
        } else if (q < 3.5) {
          // down to its mouth, which opens
          const k = ease((q - 2.4) / 1.1)
          const from = [atEye[0] + rx * 0.5, atEye[1] + ry * 0.12]
          hp = [lerp(from[0], atMouth[0], k), lerp(from[1], atMouth[1], k) - Math.sin(k * Math.PI) * ry * 0.08]
          st.pinch = 1
          st.out = 1
          st.gone = true
          st.mouth = ease((q - 2.7) / 0.7)
          st.look = [0.2, 0.9]
        } else if (q < 4.0) {
          // in it goes
          hp = atMouth
          st.pinch = 1 - ease((q - 3.5) / 0.4)
          st.out = 2
          st.gone = true
          st.mouth = 1 - ease((q - 3.6) / 0.4)
          st.look = [0, 0.4]
        } else if (q < 6.2) {
          // it chews; the hand goes
          const k = ease((q - 4.0) / 1.2)
          hp = [lerp(atMouth[0], rest[0], k), lerp(atMouth[1], rest[1], k)]
          st.out = 2
          st.gone = true
          st.chew = q < 5.9 ? Math.abs(Math.sin((q - 4.0) * 7.5)) : 0
        } else {
          // and the eye comes back, small at first
          st.out = 2
          st.gone = true
          st.grow = ease((q - 6.2) / 2.0)
        }
        if (hp && q < 5.3) st.hand = hp
        if (hp) st.eye = [hp[0] + TIP[0], hp[1] + TIP[1]]
      }
      st.key = acting ? 1000 + Math.round(q * 12) : Math.round(st.lid * 40)
      return st
    },
    draw(g, st) {
      g.drawImage(still, 0, 0)
      // the eye it keeps
      eyeball(g, eyeL[0], eyeL[1], 1, st.look[0], st.look[1], st.lid)
      // the other: there, taken, or coming back
      if (!st.gone) eyeball(g, eyeR[0], eyeR[1], 1, st.look[0], st.look[1], st.lid)
      else {
        smudge(g, (q) => q.ellipse(eyeR[0], eyeR[1], ER * 0.92, ER * 0.7, 0, 0, Math.PI * 2), '#0c0c0d', 9)
        if (st.out === 2 && st.grow > 0 && st.grow < 1.01 && st.chew === 0 && st.mouth === 0 && !st.hand) eyeball(g, eyeR[0], eyeR[1], 0.15 + 0.85 * st.grow, 0, 0, 0)
      }
      // its mouth: a line; open for the eye; working as it chews
      g.save()
      g.translate(mouth[0], mouth[1])
      g.fillStyle = '#0c0c0d'
      g.strokeStyle = '#1a1a1b'
      g.lineCap = 'round'
      if (st.mouth > 0.05) {
        g.shadowColor = '#0c0c0d'
        g.shadowBlur = 5
        g.beginPath()
        g.ellipse(0, 0, rx * 0.2 * (0.6 + 0.4 * st.mouth), rx * 0.24 * st.mouth, 0, 0, Math.PI * 2)
        g.fill()
      } else {
        g.lineWidth = 3
        g.beginPath()
        g.moveTo(-rx * 0.17, st.chew * 2)
        g.quadraticCurveTo(0, 2 - st.chew * 7, rx * 0.17, st.chew * 2)
        g.stroke()
        if (st.chew > 0) {
          // (its cheek, full)
          g.fillStyle = 'rgba(205,202,196,0.28)'
          g.beginPath()
          g.ellipse(rx * 0.3, -rx * 0.04, rx * 0.2, rx * (0.13 + 0.05 * st.chew), 0, 0, Math.PI * 2)
          g.fill()
        }
      }
      g.restore()
      // the eye in its fingers (till it is eaten), and the hand
      if (st.gone && st.out < 2) {
        // (what it leaves behind it: a thread, till it gives)
        if (st.out < 0.75) {
          g.strokeStyle = 'rgba(220,216,208,0.55)'
          g.lineWidth = 1.5 * (1 - st.out)
          g.beginPath()
          g.moveTo(eyeR[0], eyeR[1])
          g.quadraticCurveTo((eyeR[0] + st.eye[0]) / 2, (eyeR[1] + st.eye[1]) / 2 + 8 * st.out, st.eye[0], st.eye[1])
          g.stroke()
        }
        eyeball(g, st.eye[0], st.eye[1], 0.92, -0.3, 0.1, 0)
      }
      if (st.hand) hand(g, st.hand[0], st.hand[1], -0.42, st.pinch)
      g.save()
      g.globalCompositeOperation = 'overlay'
      g.drawImage(grain, 0, 0)
      g.restore()
    },
  }
}

export const PORTRAIT_KINDS = { ink: makeInk, void: makeVoid, coal: makeCoal }
