// Wired earphones plugged into the top of the pod.
// A Verlet rope: pinned at the plug, collides with the pod's rounded body,
// swings when you scroll, and the earbuds can be grabbed and flung.

import { rig } from './rig'

type Pt = { x: number; y: number; px: number; py: number; inv: number }

const MAIN = 46 // segments from plug to splitter
const BRANCH = 9 // segments per earbud branch
const ITER = 18
const GRAVITY = 0.42
const DAMP = 0.986
const JACK_X = 0.79 // jack position along the top edge (fraction of width)

export function startEarphones(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  let dpr = 1
  let vw = 0
  let vh = 0
  let pts: Pt[] = []
  let edges: [number, number, number][] = [] // a, b, rest length as a fraction of pod width
  let splitIdx = 0
  let budIdx: [number, number] = [0, 0]
  let raf = 0
  let t0 = performance.now()
  let acc = 0

  // geometry of the pod, refreshed each frame
  const g = { W: 0, H: 0, cx: 0, cy: 0, cos: 1, sin: 0, rr: 0, th: 0 }
  // things measured while drawing, used for hit testing
  const budHeads: { x: number; y: number; r: number }[] = [
    { x: -1e4, y: -1e4, r: 0 },
    { x: -1e4, y: -1e4, r: 0 },
  ]
  let drag: { i: number; dx: number; dy: number; x: number; y: number } | null = null

  const toWorld = (lx: number, ly: number) => {
    const dx = lx - g.W / 2
    const dy = ly - g.H / 2
    return { x: g.cx + dx * g.cos - dy * g.sin, y: g.cy + dx * g.sin + dy * g.cos }
  }
  const toLocal = (x: number, y: number) => {
    const dx = x - g.cx
    const dy = y - g.cy
    return { x: dx * g.cos + dy * g.sin + g.W / 2, y: -dx * g.sin + dy * g.cos + g.H / 2 }
  }
  const sdf = (lx: number, ly: number) => {
    const qx = Math.abs(lx - g.W / 2) - (g.W / 2 - g.rr)
    const qy = Math.abs(ly - g.H / 2) - (g.H / 2 - g.rr)
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - g.rr
  }

  const plugLen = () => g.W * 0.1
  const plugTip = () => toWorld(JACK_X * g.W, -plugLen())
  const reliefDir = () => {
    // strain relief leans slightly right so the cable drapes over that corner
    const a = (14 * Math.PI) / 180
    const lx = Math.sin(a)
    const ly = -Math.cos(a)
    return { x: lx * g.cos - ly * g.sin, y: lx * g.sin + ly * g.cos }
  }

  function measure(): boolean {
    const el = rig.frameEl
    if (!el) return false
    const r = el.getBoundingClientRect()
    if (r.width < 10) return false
    g.W = r.width
    g.H = r.height
    g.th = (rig.rot * Math.PI) / 180
    g.cos = Math.cos(g.th)
    g.sin = Math.sin(g.th)
    g.cx = r.left + r.width / 2 + rig.ox
    g.cy = r.top + r.height / 2 + rig.oy
    g.rr = g.W * 0.085
    return true
  }

  function build() {
    pts = []
    edges = []
    const mainLen = g.H * 0.98
    const branchLen = g.H * 0.17
    const seg = mainLen / MAIN
    const bseg = branchLen / BRANCH

    // lay the rope along a believable resting path (local coords), then convert
    const tipL = { x: JACK_X * g.W, y: -plugLen() }
    const way = [
      tipL,
      { x: tipL.x + g.W * 0.06, y: tipL.y - g.W * 0.08 },
      { x: g.W + 4, y: -g.W * 0.02 },
      { x: g.W + 8, y: g.H * 3 },
    ]
    const along = (d: number) => {
      for (let i = 0; i < way.length - 1; i++) {
        const a = way[i]
        const b = way[i + 1]
        const l = Math.hypot(b.x - a.x, b.y - a.y)
        if (d <= l) return { x: a.x + ((b.x - a.x) * d) / l, y: a.y + ((b.y - a.y) * d) / l }
        d -= l
      }
      return way[way.length - 1]
    }
    for (let i = 0; i <= MAIN; i++) {
      const l = along(i * seg)
      const w = toWorld(l.x, l.y)
      pts.push({ x: w.x, y: w.y, px: w.x, py: w.y, inv: i < 2 ? 0 : 1 })
      if (i > 0) edges.push([i - 1, i, seg / g.W])
    }
    splitIdx = MAIN
    const split = pts[splitIdx]
    for (const side of [-1, 1]) {
      let prev = splitIdx
      for (let j = 1; j <= BRANCH; j++) {
        const x = split.x + side * j * bseg * 0.3
        const y = split.y + j * bseg * 0.95
        pts.push({ x, y, px: x, py: y, inv: j === BRANCH ? 0.45 : 1 })
        const idx = pts.length - 1
        edges.push([prev, idx, bseg / g.W])
        prev = idx
      }
      budIdx[side < 0 ? 0 : 1] = prev
    }
  }

  function pinPlug() {
    const tip = plugTip()
    const d = reliefDir()
    const seg = edges[0][2] * g.W
    pts[0].x = pts[0].px = tip.x
    pts[0].y = pts[0].py = tip.y
    pts[1].x = pts[1].px = tip.x + d.x * seg
    pts[1].y = pts[1].py = tip.y + d.y * seg
  }

  function step(time: number) {
    // ---- device spring: idle float + pointer parallax + kicks
    const still = rig.reducedMotion
    const p = rig.pointer
    const tx = still ? 0 : (p.x - 0.5) * 14
    const ty = still ? 0 : (p.y - 0.5) * 10 + Math.sin(time * 0.0011) * 4
    const tr = still ? 0 : (p.x - 0.5) * 1.6 + Math.sin(time * 0.0007) * 0.35
    rig.vox = (rig.vox + (tx - rig.ox) * 0.03) * 0.88
    rig.voy = (rig.voy + (ty - rig.oy) * 0.05) * 0.86
    rig.vrot = (rig.vrot + (tr - rig.rot) * 0.05) * 0.86
    rig.ox += rig.vox
    rig.oy += rig.voy
    rig.rot += rig.vrot

    if (!measure()) return
    if (!pts.length) build()

    // ---- integrate
    const gust = Math.max(-3, Math.min(3, rig.gust))
    rig.gust = 0
    const n = pts.length
    for (let i = 0; i < n; i++) {
      const q = pts[i]
      if (q.inv === 0 && i < 2) continue
      const vx = (q.x - q.px) * DAMP
      const vy = (q.y - q.py) * DAMP
      q.px = q.x
      q.py = q.y
      // how far down the cable this point is (0 at plug, 1 at buds)
      const reach = i <= MAIN ? i / MAIN : 1
      q.x += vx + gust * 1.6 * reach
      q.y += vy + GRAVITY - Math.abs(gust) * 0.7 * reach
    }

    // ---- cursor brushes the cable
    if (!drag && p.moved > 0) {
      const R = 16
      for (let i = 2; i < n; i++) {
        const q = pts[i]
        const dx = q.x - p.px
        const dy = q.y - p.py
        const d2 = dx * dx + dy * dy
        if (d2 < R * R && d2 > 0.01) {
          const d = Math.sqrt(d2)
          q.x += (dx / d) * (R - d) * 0.35
          q.y += (dy / d) * (R - d) * 0.35
        }
      }
      p.moved = Math.max(0, p.moved - 1)
    }

    // ---- constraints
    pinPlug()
    const budR = g.W * 0.05
    for (let k = 0; k < ITER; k++) {
      for (let e = 0; e < edges.length; e++) {
        const [ia, ib, frac] = edges[e]
        const rest = frac * g.W
        const a = pts[ia]
        const b = pts[ib]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.hypot(dx, dy) || 0.0001
        const wsum = a.inv + b.inv
        if (wsum === 0) continue
        const diff = (d - rest) / d / wsum
        a.x += dx * diff * a.inv
        a.y += dy * diff * a.inv
        b.x -= dx * diff * b.inv
        b.y -= dy * diff * b.inv
      }
      if (drag) {
        const q = pts[drag.i]
        q.x = drag.x
        q.y = drag.y
      }
      // collide with the pod and the viewport
      for (let i = 2; i < n; i++) {
        const q = pts[i]
        const isBud = i === budIdx[0] || i === budIdx[1]
        const margin = isBud ? budR : 2.5
        const l = toLocal(q.x, q.y)
        const d = sdf(l.x, l.y)
        if (d < margin) {
          const e = 0.5
          let nx = sdf(l.x + e, l.y) - sdf(l.x - e, l.y)
          let ny = sdf(l.x, l.y + e) - sdf(l.x, l.y - e)
          const nl = Math.hypot(nx, ny) || 1
          nx /= nl
          ny /= nl
          const push = margin - d
          const lx = l.x + nx * push
          const ly = l.y + ny * push
          const w = toWorld(lx, ly)
          q.x = w.x
          q.y = w.y
          // friction against the body
          q.px += (q.x - q.px) * 0.25
          q.py += (q.y - q.py) * 0.25
        }
        const pad = isBud ? budR : 3
        if (q.y > vh - pad) {
          q.y = vh - pad
          q.px += (q.x - q.px) * 0.4
        }
        if (q.x < pad) q.x = pad
        if (q.x > vw - pad) q.x = vw - pad
      }
      pinPlug()
    }
  }

  // ---------------------------------------------------------------- drawing
  function trace(ids: number[]) {
    ctx.beginPath()
    ctx.moveTo(pts[ids[0]].x, pts[ids[0]].y)
    for (let i = 1; i < ids.length - 1; i++) {
      const a = pts[ids[i]]
      const b = pts[ids[i + 1]]
      ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2)
    }
    const last = pts[ids[ids.length - 1]]
    ctx.lineTo(last.x, last.y)
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
  }

  function drawPlug() {
    const W = g.W
    const jack = toWorld(JACK_X * W, 0)
    ctx.save()
    ctx.translate(jack.x, jack.y)
    ctx.rotate(g.th)
    const L = plugLen()
    const bw = W * 0.052
    // chrome collar sitting in the jack
    const chrome = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0)
    chrome.addColorStop(0, '#7d7d7d')
    chrome.addColorStop(0.45, '#f4f4f4')
    chrome.addColorStop(1, '#8a8a8a')
    ctx.fillStyle = chrome
    roundRect(-bw * 0.36, -W * 0.016, bw * 0.72, W * 0.02, 1.5)
    ctx.fill()
    // plug body
    const body = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0)
    body.addColorStop(0, '#d8d8d2')
    body.addColorStop(0.35, '#ffffff')
    body.addColorStop(1, '#c9c9c2')
    ctx.fillStyle = body
    roundRect(-bw / 2, -L * 0.72, bw, L * 0.58, bw * 0.28)
    ctx.fill()
    // strain relief, tapering into the cable
    ctx.beginPath()
    ctx.moveTo(-bw * 0.32, -L * 0.7)
    ctx.lineTo(-bw * 0.14, -L)
    ctx.lineTo(bw * 0.14, -L)
    ctx.lineTo(bw * 0.32, -L * 0.7)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  function drawBud(endIdx: number, prevIdx: number, side: number, slot: number) {
    const e = pts[endIdx]
    const pr = pts[prevIdx]
    const ang = Math.atan2(e.y - pr.y, e.x - pr.x) - Math.PI / 2
    const W = g.W
    const sw = W * 0.032
    const stem = W * 0.07
    const hr = W * 0.05
    ctx.save()
    ctx.translate(e.x, e.y)
    ctx.rotate(ang)
    // stem
    const sg = ctx.createLinearGradient(-sw / 2, 0, sw / 2, 0)
    sg.addColorStop(0, '#d4d4ce')
    sg.addColorStop(0.4, '#ffffff')
    sg.addColorStop(1, '#c6c6bf')
    ctx.fillStyle = sg
    roundRect(-sw / 2, -sw * 0.2, sw, stem + sw * 0.4, sw / 2)
    ctx.fill()
    // head
    const hy = stem + hr * 0.62
    const hg = ctx.createRadialGradient(-hr * 0.35, hy - hr * 0.4, hr * 0.1, 0, hy, hr)
    hg.addColorStop(0, '#ffffff')
    hg.addColorStop(0.65, '#ecece7')
    hg.addColorStop(1, '#bdbdb6')
    ctx.fillStyle = hg
    ctx.beginPath()
    ctx.ellipse(0, hy, hr, hr * 0.92, 0, 0, Math.PI * 2)
    ctx.fill()
    // speaker grille, facing inwards
    const gx = side * hr * 0.32
    const gg = ctx.createRadialGradient(gx, hy, 1, gx, hy, hr * 0.5)
    gg.addColorStop(0, '#5a5a58')
    gg.addColorStop(1, '#2a2a29')
    ctx.fillStyle = gg
    ctx.beginPath()
    ctx.ellipse(gx, hy + hr * 0.04, hr * 0.38, hr * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
    // remember for hit testing (world coords of head centre)
    const c = Math.cos(ang)
    const s = Math.sin(ang)
    budHeads[slot] = { x: e.x - s * hy, y: e.y + c * hy, r: hr }
  }

  function drawSplitter() {
    const a = pts[splitIdx]
    const b = pts[splitIdx - 1]
    const ang = Math.atan2(a.y - b.y, a.x - b.x) - Math.PI / 2
    const W = g.W
    ctx.save()
    ctx.translate(a.x, a.y)
    ctx.rotate(ang)
    const w = W * 0.036
    const h = W * 0.075
    const sg = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
    sg.addColorStop(0, '#d2d2cc')
    sg.addColorStop(0.4, '#ffffff')
    sg.addColorStop(1, '#c4c4bd')
    ctx.fillStyle = sg
    roundRect(-w / 2, -h, w, h, w * 0.45)
    ctx.fill()
    ctx.restore()
  }

  function drawAll(shadow: boolean) {
    const W = g.W
    const lw = Math.max(2.4, W * 0.0068)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.45)'
      ctx.shadowBlur = 14
      ctx.shadowOffsetX = 8
      ctx.shadowOffsetY = 14
    }
    const main = Array.from({ length: MAIN + 1 }, (_, i) => i)
    const left = [splitIdx, ...Array.from({ length: BRANCH }, (_, j) => MAIN + 1 + j)]
    const right = [splitIdx, ...Array.from({ length: BRANCH }, (_, j) => MAIN + 1 + BRANCH + j)]

    ctx.strokeStyle = '#e4e4de'
    ctx.lineWidth = lw
    trace(main)
    ctx.stroke()
    ctx.lineWidth = lw * 0.82
    trace(left)
    ctx.stroke()
    trace(right)
    ctx.stroke()

    if (!shadow) {
      // highlight along the top of the cable
      ctx.save()
      ctx.translate(-lw * 0.18, -lw * 0.18)
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'
      ctx.lineWidth = lw * 0.32
      trace(main)
      ctx.stroke()
      trace(left)
      ctx.stroke()
      trace(right)
      ctx.stroke()
      ctx.restore()
    }

    drawPlug()
    drawSplitter()
    drawBud(budIdx[0], budIdx[0] - 1, 1, 0)
    drawBud(budIdx[1], budIdx[1] - 1, -1, 1)
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, vw, vh)
    if (!pts.length) return
    drawAll(true)
    drawAll(false)
  }

  // ------------------------------------------------------------- the beam
  function updateBeam() {
    const beam = rig.beamEl
    const panel = rig.panelEl
    const screen = rig.screenEl
    if (!beam) return
    if (!panel || !screen) {
      beam.setAttribute('points', '')
      return
    }
    const s = screen.getBoundingClientRect()
    const p = panel.getBoundingClientRect()
    if (p.width < 10) return
    const inset = s.height * 0.08
    beam.setAttribute(
      'points',
      `${s.right - 4},${s.top + inset} ${p.left},${p.top} ${p.left},${p.bottom} ${s.right - 4},${s.bottom - inset}`,
    )
  }

  // ---------------------------------------------------------------- loop
  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    acc += Math.min(100, now - t0)
    t0 = now
    let steps = 0
    while (acc >= 16.67 && steps < 4) {
      step(now)
      acc -= 16.67
      steps++
    }
    if (steps === 4) acc = 0
    if (rig.deviceEl) {
      rig.deviceEl.style.transform = `translate3d(${rig.ox.toFixed(2)}px, ${rig.oy.toFixed(2)}px, 0) rotate(${rig.rot.toFixed(3)}deg)`
    }
    render()
    updateBeam()
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1)
    vw = window.innerWidth
    vh = window.innerHeight
    canvas.width = Math.round(vw * dpr)
    canvas.height = Math.round(vh * dpr)
    canvas.style.width = vw + 'px'
    canvas.style.height = vh + 'px'
  }

  // ---------------------------------------------------------------- input
  const hitBud = (x: number, y: number) => {
    for (let s = 0; s < 2; s++) {
      const b = budHeads[s]
      if (Math.hypot(x - b.x, y - b.y) < b.r * 1.5) return budIdx[s]
    }
    const sp = pts[splitIdx]
    if (sp && Math.hypot(x - sp.x, y - sp.y) < g.W * 0.06) return splitIdx
    return -1
  }
  const onMove = (e: PointerEvent) => {
    rig.pointer.x = e.clientX / window.innerWidth
    rig.pointer.y = e.clientY / window.innerHeight
    rig.pointer.px = e.clientX
    rig.pointer.py = e.clientY
    rig.pointer.moved = 6
    if (drag) {
      drag.x = e.clientX + drag.dx
      drag.y = e.clientY + drag.dy
    } else if (e.pointerType === 'mouse') {
      document.documentElement.classList.toggle('grab-bud', hitBud(e.clientX, e.clientY) >= 0)
    }
  }
  const onDown = (e: PointerEvent) => {
    const i = hitBud(e.clientX, e.clientY)
    if (i < 0) return
    e.preventDefault()
    e.stopPropagation()
    const q = pts[i]
    drag = { i, dx: q.x - e.clientX, dy: q.y - e.clientY, x: q.x, y: q.y }
    document.documentElement.classList.add('grabbing-bud')
  }
  const onUp = () => {
    if (!drag) return
    drag = null
    document.documentElement.classList.remove('grabbing-bud')
  }

  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { capture: true })
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
  raf = requestAnimationFrame((t) => {
    t0 = t
    frame(t)
  })

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onDown, { capture: true })
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
  }
}
