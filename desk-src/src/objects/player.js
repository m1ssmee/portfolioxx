// The music player: a white plastic shell round a face with a screen, a speaker grille and three
// keys, built from the design's SVG (index.html: 1 SVG unit = 0.1 mm, the face 66.3 x 118.9 mm),
// given a body 10.5 mm thick with softly rounded sides. Units mm. It lies face up: +y is the face's
// normal, y = 0 the bottom it rests on, the screen end towards -z, the keys and the AUX jack
// towards +z, centred in x and z.
//   shell   one piece of slightly warm white plastic with a satin clearcoat: the rim rolls over at
//           the top and under at the bottom and stands 0.3 mm proud of the face, a fine seam
//           between. The face, its print (one atlas texture), the speaker grille's 140 real holes,
//           the mic hole, the keypad's well, the side button and the jack's bore are all in the
//           same mesh and material: one draw call
//   screen  dark glass with a clearcoat, a hair below the face, the punch-hole camera under it; the
//           display is its emissive map (a canvas: status, title, artist, times) plus a few lines of
//           shader for what moves (the spectrum, the progress bar), so the canvas is redrawn only
//           when its text changes (once a second while playing)
//   keys    three meshes (they sink when pressed) in the same plastic, their symbols printed (the
//           atlas); the rec key's dome is glossy red (its own mesh, the key's child)
//   jack    a 3.5 mm bore in the bottom edge under the AUX label, a nickel ring at its mouth
//
// createPlayer(THREE, opts) -> { group, meshes, keys, port, screen, update, dispose, ready, bounds }
// opts (all optional):
//   fontUrl          a URL of Inter (or any sans) to load with FontFace for the print and the display
//                    (relative to the page); without it the family below is used if the page has it,
//                    else a system sans. `ready` resolves once the textures are redrawn in it
//   fontFamily       'Inter'
//   color            the plastic's colour (0xf2f0eb, a slightly warm white)
//   screenBrightness the display's emissive intensity while playing (1.15); paused it dims to
//   pausedLevel      this fraction of it (0.3)
//   bars             spectrum bars drawn (24); setState's bars (any length) are resampled to it
//   screenWidth      the display canvas's width in px (800; 13.5 px per mm)
//   anisotropy       for the print and display textures (8)
//   contactShadow    a soft contact shadow on the desk under it (true; one transparent quad)
//   castShadow / receiveShadow   for the meshes (true / true)

import { runSteps, runStepsAsync } from '../core/steps.js'

// ---- the design's frame
const SVG_W = 663
const SVG_H = 1189
const MM = 0.1 // mm per SVG unit
const HX = (SVG_W * MM) / 2 // 33.15
const HZ = (SVG_H * MM) / 2 // 59.45
const X = (u) => (u - SVG_W / 2) * MM // SVG x -> local x
const Z = (v) => (v - SVG_H / 2) * MM // SVG y -> local z (the top edge, SVG y = 0, at -z)

// ---- the body
const R_OUT = 10.6 // the outline's corner radius (rx 106)
const CXC = HX - R_OUT // the corners' centres: (+-22.55, +-48.85)
const CZC = HZ - R_OUT
const H = 10.5 // the top of the rim
const HF = H - 0.3 // the face (the shell stands 0.3 mm proud of it)
const RB = 3.2 // the fillet rolling under the bottom edge
const RT = 1.4 // the fillet over the top of the rim
const D_SEAM = 2.34 // the shell's inner wall, in from the outline
const D_FACE = 2.46 // the face's edge: a 0.12 mm seam (the SVG's line at 24)
const RI = 0.18 // the rim's inner edge, rounded
const RE = 0.1 // the face's edge, rounded
const Y_FLOOR = HF - 1.6 // the floor of the seam and of the keypad's well
const HG = HF - 0.08 // the screen's glass
const VROWS = 12 // rows up the straight part of the side wall (and the jack's window)
const NC = 40 // segments in a corner of the outline
const AO = 0.1 // the shade on the face along the seam (the rim stands proud of it)

// ---- the jack: under the AUX label (its letters' centre, SVG x 98.07: 9.8 mm in from the left)
const XJ = X(98.07)
const YJ = (RB + H - RT) / 2 // the middle of the straight part of the wall
const WH = (H - RT - RB) / 2 // half the square window cut round it in the wall's grid
const R_BORE = 1.8
const R_RING = 2.45
const BORE_DEPTH = 15 // (a 14 mm pin goes all the way in)

// ---- the keys (SVG: x 14 / 230.33 / 436.67, y 913, w 212.33 / 202.33 / 212.33, h 170, rx 3; the
// outer two end at the seam), their domes (r 60) and the side button (x 659..670.5, y 275.5..425.5)
const KEYS = [
  { name: 'prev', x0: 24.6, x1: 226.33, cx: 125.17 },
  { name: 'play', x0: 230.33, x1: 432.67, cx: 331.5 },
  { name: 'rec', x0: 436.67, x1: 638.4, cx: 537.83 },
]
const KEY_Y0 = 913
const KEY_Y1 = 1083
const KEY_CY = 998
const KEY_R = 0.3 // corner radius in plan
const KEY_E = 0.25 // the top edge, rounded
const KEY_WALL = 0.95
const TRAVEL = 0.7 // how far a key sinks
const DOME_A = 6.0
const DOME_H = 1.1
const DOME_R = (DOME_A * DOME_A + DOME_H * DOME_H) / (2 * DOME_H)
const SYM_R = 2.4 // the printed symbol's disc on a dome
const RED_A = 2.1 // the rec key's red dome (r 21)
const RED_H = 0.55
const BTN = { z: Z(350.5), half: 7.5, h: 1.3, r: 1.0, out: 0.75, edge: 0.35 }

// ---- the display (in SVG units within the glass, 591 x 629)
const SCR_W = 591
const SCR_H = 629

// the print: [rect on the face (SVG units), how it is drawn]. The rects are generous (a fallback font
// may be wider than Inter); the text is placed by the SVG's own rules inside them. (No two rects share
// an edge's line: earcut drops collinear points where it bridges holes, which would leave T-junctions.)
const PRINT = [
  { id: 'hd', rect: [51, 685, 148.4, 718] },
  { id: 'display', rect: [286.3, 691.8, 379, 711.8], text: ['DISPLAY', 332.65, 706.77, 'middle'] },
  { id: 'phones', rect: [557.7, 685.6, 612.3, 717.3] },
  { id: 'speakers', rect: [277.9, 866.3, 387.4, 886.3], text: ['SPEAKERS', 332.65, 881.27, 'middle'] },
  { id: 'aux', rect: [72.4, 1116.3, 126.2, 1136.3], text: ['AUX', 80.4, 1131.27, 'start'] },
  { id: 'mic', rect: [544.6, 1116.9, 593.3, 1135.6], text: ['MIC', 550.57, 1131.27, 'start'] },
  { id: 'prev', rect: [125.17 - 24, 974, 125.17 + 24, 1022] }, // (on the domes)
  { id: 'play', rect: [331.5 - 24, 974, 331.5 + 24, 1022] },
]
const ATLAS_S = 6 // px per SVG unit (60 per mm)

/**
 * A mesh being built: positions, normals, uvs (and a second set), grey vertex colours (the shade
 * in cavities), triangles. Each triangle is wound to face its vertices' normals, so the builders
 * below need not care about orientation.
 */
function builder(THREE, uv1) {
  const P = []
  const N = []
  const T = []
  const T1 = uv1 ? [] : null
  const C = []
  const I = []
  const B = {
    P,
    v(x, y, z, nx, ny, nz, u, w, c, u1 = 0, w1 = 0) {
      P.push(x, y, z)
      N.push(nx, ny, nz)
      T.push(u, w)
      C.push(c, c, c)
      if (T1) T1.push(u1, w1)
      return P.length / 3 - 1
    },
    tri(a, b, c) {
      const ax = P[3 * a]
      const ay = P[3 * a + 1]
      const az = P[3 * a + 2]
      const ux = P[3 * b] - ax
      const uy = P[3 * b + 1] - ay
      const uz = P[3 * b + 2] - az
      const vx = P[3 * c] - ax
      const vy = P[3 * c + 1] - ay
      const vz = P[3 * c + 2] - az
      const nx = N[3 * a] + N[3 * b] + N[3 * c]
      const ny = N[3 * a + 1] + N[3 * b + 1] + N[3 * c + 1]
      const nz = N[3 * a + 2] + N[3 * b + 2] + N[3 * c + 2]
      if ((uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz < 0) I.push(a, c, b)
      else I.push(a, b, c)
    },
    quad(a, b, c, d) {
      B.tri(a, b, c)
      B.tri(a, c, d)
    },
    geometry() {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
      g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3))
      g.setAttribute('uv', new THREE.Float32BufferAttribute(T, 2))
      if (T1) g.setAttribute('uv1', new THREE.Float32BufferAttribute(T1, 2))
      g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3))
      g.setIndex(I)
      g.computeBoundingBox()
      g.computeBoundingSphere()
      return g
    },
  }
  return B
}

/** A closed loop in the xz-plane: points with their outward normals; each segment adds its start. */
function loop() {
  const s = []
  const L = {
    s,
    pt(x, z, nx, nz, f) {
      s.push({ x, z, nx, nz, seam: f?.seam ?? 0, bw: f?.bw ?? 0 })
      return L
    },
    arc(cx, cz, r, a0, a1, n, f) {
      for (let k = 0; k < n; k++) {
        const a = a0 + ((a1 - a0) * k) / n
        L.pt(cx + r * Math.cos(a), cz + r * Math.sin(a), Math.cos(a), Math.sin(a), f)
      }
      return L
    },
  }
  return L
}

/** A rounded rectangle as a loop (counter-clockwise in x, z: the normal's angle increasing). */
function roundRect(x0, z0, x1, z1, r, n) {
  const P2 = Math.PI / 2
  return loop()
    .pt(x1, z0 + r, 1, 0)
    .arc(x1 - r, z1 - r, r, 0, P2, n)
    .pt(x1 - r, z1, 0, 1)
    .arc(x0 + r, z1 - r, r, P2, Math.PI, n)
    .pt(x0, z1 - r, -1, 0)
    .arc(x0 + r, z0 + r, r, Math.PI, 3 * P2, n)
    .pt(x0 + r, z0, 0, -1)
    .arc(x1 - r, z0 + r, r, 3 * P2, 4 * P2, n).s
}

/** A circle as a loop (phase: its first point's angle). */
function circle(cx, cz, r, n, phase = 0) {
  return loop().arc(cx, cz, r, phase, phase + Math.PI * 2, n).s
}

/** The outline's z along the bottom edge (+z) at x, and its normal there. */
function bottomEdge(x) {
  const ax = Math.abs(x)
  if (ax <= CXC) return { z: HZ, nx: 0, nz: 1 }
  const dx = ax - CXC
  const dz = Math.sqrt(Math.max(0, R_OUT * R_OUT - dx * dx))
  return { z: CZC + dz, nx: (Math.sign(x) * dx) / R_OUT, nz: dz / R_OUT }
}

/**
 * Sweep a profile round a loop. Profile points: { d (in from the loop), band (times the sample's
 * bw, added to d), y, no/ny (the normal: out along the loop's normal, up), c (shade), aoW (how much
 * of the seam's shade) }. Returns the vertex index grid [sample][profile point].
 */
function sweep(B, S, prof, uvw, skip) {
  const idx = []
  for (let i = 0; i < S.length; i++) {
    const s = S[i]
    const row = []
    for (const p of prof) {
      const d = p.d + (p.band ?? 0) * s.bw
      const c = (p.c ?? 1) * (1 - AO * s.seam * (p.aoW ?? 0))
      row.push(B.v(s.x - d * s.nx, p.y, s.z - d * s.nz, s.nx * p.no, p.ny, s.nz * p.no, uvw[0], uvw[1], c))
    }
    idx.push(row)
  }
  for (let i = 0; i < S.length; i++) {
    const i1 = (i + 1) % S.length
    for (let j = 0; j < prof.length - 1; j++) if (!skip || !skip(i, j)) B.quad(idx[i][j], idx[i1][j], idx[i1][j + 1], idx[i][j + 1])
  }
  return idx
}

/** The points of a row of existing vertices (for fill's contour). */
function pts(B, ids) {
  return ids.map((i) => ({ x: B.P[3 * i], z: B.P[3 * i + 2], i }))
}

/** Fill a flat region (earcut): contour and holes are point lists; points with .i reuse a vertex. */
function fill(THREE, B, contour, holes, y, uvw, c) {
  const vert = (p) => p.i ?? B.v(p.x, y, p.z, 0, 1, 0, uvw[0], uvw[1], c)
  const ids = contour.map(vert)
  for (const h of holes) for (const p of h) ids.push(vert(p))
  const tris = THREE.ShapeUtils.triangulateShape(
    contour.map((p) => new THREE.Vector2(p.x, p.z)),
    holes.map((h) => h.map((p) => new THREE.Vector2(p.x, p.z))),
  )
  for (const t of tris) B.tri(ids[t[0]], ids[t[1]], ids[t[2]])
}

/** A short tube down from a ring of points (a hole's wall): rows [y, shade]. Returns the top ring. */
function holeWall(B, ring, cx, cz, rows, uvw) {
  // (normals point in, towards the axis)
  const grid = rows.map(([y, c]) =>
    ring.map((p) => {
      const l = Math.hypot(cx - p.x, cz - p.z)
      return B.v(p.x, y, p.z, (cx - p.x) / l, 0, (cz - p.z) / l, uvw[0], uvw[1], c)
    }),
  )
  for (let j = 0; j < rows.length - 1; j++)
    for (let k = 0; k < ring.length; k++) {
      const k1 = (k + 1) % ring.length
      B.quad(grid[j][k], grid[j][k1], grid[j + 1][k1], grid[j + 1][k])
    }
  return grid
}

function makeCanvas(w, h) {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    return c
  }
  return new OffscreenCanvas(w, h)
}

/** The player, built in steps (core/steps.js): it yields between its heavier parts. */
function* playerSteps(THREE, opts = {}) {
  const o = {
    fontUrl: opts.fontUrl ?? null,
    fontFamily: opts.fontFamily ?? 'Inter',
    color: opts.color ?? 0xf2f0eb,
    screenBrightness: opts.screenBrightness ?? 1.15,
    pausedLevel: opts.pausedLevel ?? 0.3,
    bars: Math.max(4, Math.min(64, opts.bars ?? 24) | 0),
    screenWidth: opts.screenWidth ?? 800,
    anisotropy: opts.anisotropy ?? 8,
    contactShadow: opts.contactShadow ?? true,
    castShadow: opts.castShadow ?? true,
    receiveShadow: opts.receiveShadow ?? true,
  }
  const family = `"${o.fontFamily}", Inter, "Helvetica Neue", Helvetica, Arial, sans-serif`
  let disposed = false
  const geometries = []
  const textures = []

  // =============================================================================================
  // the print atlas: every label and key symbol at 60 px per mm, white round them (the plastic's
  // own colour comes from the material; the rest of the shell samples one white texel)
  // =============================================================================================
  const GUT = 12
  const items = PRINT.map((it) => ({ ...it, w: Math.ceil((it.rect[2] - it.rect[0]) * ATLAS_S), h: Math.ceil((it.rect[3] - it.rect[1]) * ATLAS_S) }))
  const white = { id: 'white', w: 16, h: 16 }
  const AW = 1024
  let AH = 0
  {
    // shelves, tallest first
    const order = [...items, white].sort((a, b) => b.h - a.h)
    const shelves = []
    let top = GUT
    for (const it of order) {
      let sh = shelves.find((s) => s.x + it.w + GUT <= AW && it.h <= s.h)
      if (!sh) {
        sh = { x: GUT, y: top, h: it.h }
        shelves.push(sh)
        top += it.h + GUT
      }
      it.px = sh.x
      it.py = sh.y
      sh.x += it.w + GUT
    }
    AH = Math.ceil(top / 64) * 64
  }
  const WUV = [(white.px + 8) / AW, (white.py + 8) / AH]
  const atlasUv = (it, sx, sy) => [(it.px + (sx - it.rect[0]) * ATLAS_S) / AW, (it.py + (sy - it.rect[1]) * ATLAS_S) / AH]
  const item = (id) => items.find((it) => it.id === id)
  const atlasCanvas = makeCanvas(AW, AH)
  const atlasTex = new THREE.CanvasTexture(atlasCanvas)
  atlasTex.colorSpace = THREE.SRGBColorSpace
  atlasTex.flipY = false
  atlasTex.anisotropy = o.anisotropy
  textures.push(atlasTex)

  function drawText(c, str, x, y, anchor, weight, size, spacing, color) {
    c.font = `${weight} ${size}px ${family}`
    c.fillStyle = color
    c.textAlign = 'left'
    c.textBaseline = 'alphabetic'
    if ('letterSpacing' in c) {
      c.letterSpacing = `${spacing}px`
      const w = c.measureText(str).width // (with the trailing spacing, as SVG's text-anchor has it)
      c.fillText(str, anchor === 'middle' ? x - w / 2 : x, y)
      c.letterSpacing = '0px'
    } else {
      let w = 0
      for (const ch of str) w += c.measureText(ch).width + spacing
      let px = anchor === 'middle' ? x - w / 2 : x
      for (const ch of str) {
        c.fillText(ch, px, y)
        px += c.measureText(ch).width + spacing
      }
    }
  }
  function rrect(c, x, y, w, h, r) {
    c.beginPath()
    c.moveTo(x + r, y)
    c.arcTo(x + w, y, x + w, y + h, r)
    c.arcTo(x + w, y + h, x, y + h, r)
    c.arcTo(x, y + h, x, y, r)
    c.arcTo(x, y, x + w, y, r)
    c.closePath()
  }
  function drawAtlas() {
    const c = atlasCanvas.getContext('2d')
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.fillStyle = '#ffffff'
    c.fillRect(0, 0, AW, AH)
    for (const it of items) {
      c.save()
      c.beginPath()
      c.rect(it.px, it.py, it.w, it.h)
      c.clip()
      c.setTransform(ATLAS_S, 0, 0, ATLAS_S, it.px - it.rect[0] * ATLAS_S, it.py - it.rect[1] * ATLAS_S)
      if (it.text) drawText(c, it.text[0], it.text[1], it.text[2], it.text[3], 500, 14.5, 2.3, '#9a9a9a')
      else if (it.id === 'hd') {
        c.fillStyle = '#c3c3c1'
        rrect(c, 55, 689, 89.4, 25, 5)
        c.fill()
        drawText(c, 'HD AUDIO', 100.1, 706.41, 'middle', 650, 13.5, 0.8, '#ffffff')
      } else if (it.id === 'phones') {
        c.fillStyle = '#c3c3c1'
        rrect(c, 562, 689, 46, 25, 5)
        c.fill()
        c.strokeStyle = '#ffffff'
        c.lineWidth = 1.8
        c.lineCap = 'round'
        c.lineJoin = 'round'
        c.beginPath()
        c.moveTo(578, 705)
        c.lineTo(578, 702)
        c.arc(585, 702, 7, Math.PI, 0)
        c.lineTo(592, 705)
        c.stroke()
        c.fillStyle = '#ffffff'
        rrect(c, 576.4, 702.1, 4.2, 6.4, 1.6)
        c.fill()
        rrect(c, 589.4, 702.1, 4.2, 6.4, 1.6)
        c.fill()
      } else if (it.id === 'prev' || it.id === 'play') {
        const v = it.id === 'prev' ? [107.17, 998, 134.17, 983, 134.17, 1013] : [349.5, 998, 322.5, 983, 322.5, 1013]
        c.fillStyle = '#8a8a8a'
        c.beginPath()
        c.moveTo(v[0], v[1])
        c.lineTo(v[2], v[3])
        c.lineTo(v[4], v[5])
        c.closePath()
        c.fill()
      }
      c.restore()
    }
    atlasTex.needsUpdate = true
  }

  yield

  // =============================================================================================
  // the shell: outline, profile and the sweep; bottom; face (two pieces round the keypad's well),
  // with its print, grille and mic; the floor under the seam and the well; the side button; the jack
  // =============================================================================================
  const shell = builder(THREE, false)

  // the outline, walked with its normal's angle increasing from +x; on the bottom edge, 13 columns
  // at even x across the jack's window, in place of the corner's own samples there
  const outline = []
  let winStart = -1
  {
    const push = (x, z, nx, nz) => outline.push({ x, z, nx, nz, seam: 0, bw: 0 })
    const arc = (cx, cz, a0, a1, keep) => {
      for (let k = 0; k < NC; k++) {
        const a = a0 + ((a1 - a0) * k) / NC
        const x = cx + R_OUT * Math.cos(a)
        if (!keep || keep(x)) push(x, cz + R_OUT * Math.sin(a), Math.cos(a), Math.sin(a))
      }
    }
    const P2 = Math.PI / 2
    push(HX, -CZC, 1, 0)
    arc(CXC, CZC, 0, P2)
    push(CXC, HZ, 0, 1)
    winStart = outline.length
    for (let c = 12; c >= 0; c--) {
      const x = XJ - WH + (2 * WH * c) / 12
      const e = bottomEdge(x)
      push(x, e.z, e.nx, e.nz)
    }
    arc(-CXC, CZC, P2, Math.PI, (x) => x < XJ - WH - 0.25)
    push(-HX, CZC, -1, 0)
    arc(-CXC, -CZC, Math.PI, 3 * P2)
    push(-CXC, -HZ, 0, -1)
    arc(CXC, -CZC, 3 * P2, 4 * P2)
  }

  // the profile: under the bottom fillet, up the wall, over the top fillet, across the rim, round
  // its inner edge and down the inner wall into the seam
  const prof = []
  const NBF = 10
  for (let k = 0; k <= NBF; k++) {
    const f = (k / NBF) * (Math.PI / 2)
    prof.push({ d: RB * (1 - Math.sin(f)), y: RB * (1 - Math.cos(f)), no: Math.sin(f), ny: -Math.cos(f), c: 1 })
  }
  const ROW0 = NBF // (the straight wall's first row)
  for (let k = 1; k <= VROWS; k++) prof.push({ d: 0, y: RB + ((H - RT - RB) * k) / VROWS, no: 1, ny: 0, c: 1 })
  const NTF = 9
  for (let k = 1; k <= NTF; k++) {
    const f = (k / NTF) * (Math.PI / 2)
    prof.push({ d: RT * (1 - Math.cos(f)), y: H - RT + RT * Math.sin(f), no: Math.cos(f), ny: Math.sin(f), c: 1 })
  }
  prof.push({ d: D_SEAM - RI, y: H, no: 0, ny: 1, c: 1 })
  for (let k = 1; k <= 3; k++) {
    const f = (k / 3) * (Math.PI / 2)
    prof.push({ d: D_SEAM - RI + RI * Math.sin(f), y: H - RI + RI * Math.cos(f), no: -Math.sin(f), ny: Math.cos(f), c: 1 })
  }
  prof.push({ d: D_SEAM, y: HF, no: -1, ny: 0, c: 0.9 })
  prof.push({ d: D_SEAM, y: HF - 0.4, no: -1, ny: 0, c: 0.7 })
  prof.push({ d: D_SEAM, y: Y_FLOOR, no: -1, ny: 0, c: 0.5 })

  const inWindow = (i, j) => i >= winStart && i < winStart + 12 && j >= ROW0 && j < ROW0 + VROWS
  const sh = sweep(shell, outline, prof, WUV, inWindow)

  // the bottom: flat, inside the bottom fillet
  {
    const c0 = shell.v(0, 0, 0, 0, -1, 0, WUV[0], WUV[1], 0.9)
    for (let i = 0; i < outline.length; i++) shell.tri(c0, sh[i][0], sh[(i + 1) % outline.length][0])
  }

  // the jack's window: from the bore's ring out to the window's square edge (the wall's own
  // vertices), rings of points laid on the wall (it curves into the corner on the left)
  const jackAngles = []
  {
    const colI = (c) => winStart + (12 - c)
    const edge = []
    for (let c = 0; c < 12; c++) edge.push(sh[colI(c)][ROW0])
    for (let r = 0; r < 12; r++) edge.push(sh[colI(12)][ROW0 + r])
    for (let c = 12; c > 0; c--) edge.push(sh[colI(c)][ROW0 + 12])
    for (let r = 12; r > 0; r--) edge.push(sh[colI(0)][ROW0 + r])
    const P = shell.P
    const rings = [0, 0.3, 0.65].map((t) =>
      edge.map((vi) => {
        const bx = P[3 * vi]
        const by = P[3 * vi + 1]
        const a = Math.atan2(by - YJ, bx - XJ)
        if (t === 0) jackAngles.push(a)
        const x = XJ + R_RING * Math.cos(a) + (bx - XJ - R_RING * Math.cos(a)) * t
        const y = YJ + R_RING * Math.sin(a) + (by - YJ - R_RING * Math.sin(a)) * t
        const e = bottomEdge(x)
        return shell.v(x, y, e.z, e.nx, 0, e.nz, WUV[0], WUV[1], 1)
      }),
    )
    rings.push(edge)
    for (let j = 0; j < rings.length - 1; j++)
      for (let k = 0; k < edge.length; k++) {
        const k1 = (k + 1) % edge.length
        shell.quad(rings[j][k], rings[j][k1], rings[j + 1][k1], rings[j + 1][k])
      }
    // the bore, past the metal ring's lip: black, down to its end
    const rows = [
      [0.9, 0.05],
      [2.5, 0.03],
      [6, 0.02],
      [BORE_DEPTH, 0.015],
    ]
    const grid = rows.map(([dp, c]) =>
      jackAngles.map((a) => {
        const x = XJ + R_BORE * Math.cos(a)
        return shell.v(x, YJ + R_BORE * Math.sin(a), bottomEdge(x).z - dp, -Math.cos(a), -Math.sin(a), 0, WUV[0], WUV[1], c)
      }),
    )
    for (let j = 0; j < rows.length - 1; j++)
      for (let k = 0; k < jackAngles.length; k++) {
        const k1 = (k + 1) % jackAngles.length
        shell.quad(grid[j][k], grid[j][k1], grid[j + 1][k1], grid[j + 1][k])
      }
    const endZ = bottomEdge(XJ).z - BORE_DEPTH
    const cap = jackAngles.map((a) => {
      const x = XJ + R_BORE * Math.cos(a)
      return shell.v(x, YJ + R_BORE * Math.sin(a), bottomEdge(x).z - BORE_DEPTH, 0, 0, 1, WUV[0], WUV[1], 0.01)
    })
    const cc = shell.v(XJ, YJ, endZ, 0, 0, 1, WUV[0], WUV[1], 0.01)
    for (let k = 0; k < cap.length; k++) shell.tri(cc, cap[k], cap[(k + 1) % cap.length])
  }

  // the face: two pieces, above the keypad's well (screen, labels, grille) and below it (AUX, MIC).
  // Their loops run along the seam (shaded a little: the rim stands proud) and round the well's
  // edges (small fillets at its corners); the face's edge is rounded and drops into the seam.
  const fx = HX - D_FACE
  const fz = HZ - D_FACE
  const rf = R_OUT - D_FACE
  const rk = 0.4
  const zk0 = Z(910)
  const zk1 = Z(1087)
  const SEAM = { seam: 1, bw: 0.6 }
  const EDGE = { seam: 0, bw: 0.25 }
  const P2 = Math.PI / 2
  const upper = loop()
    .pt(fx, -CZC, 1, 0, SEAM)
    .pt(fx, zk0 - rk - 1.2, 1, 0, SEAM)
    .arc(fx - rk, zk0 - rk, rk, 0, P2, 6, EDGE)
    .pt(fx - rk, zk0, 0, 1, EDGE)
    .arc(-fx + rk, zk0 - rk, rk, P2, Math.PI, 6, EDGE)
    .pt(-fx, zk0 - rk, -1, 0, EDGE)
    .pt(-fx, zk0 - rk - 1.2, -1, 0, SEAM)
    .arc(-CXC, -CZC, rf, Math.PI, 3 * P2, NC, SEAM)
    .pt(-CXC, -fz, 0, -1, SEAM)
    .arc(CXC, -CZC, rf, 3 * P2, 4 * P2, NC, SEAM).s
  const lower = (() => {
    // fillets between the well's lower edge and the face's rounded corners
    const zf = zk1 + rk
    const xf = CXC + Math.sqrt((rf - rk) ** 2 - (zf - CZC) ** 2)
    const tu = Math.atan2(zf - CZC, xf - CXC)
    const n = Math.round((NC * (P2 - tu)) / P2)
    const L = loop()
      .pt(CXC + rf * Math.cos(tu), CZC + rf * Math.sin(tu), Math.cos(tu), Math.sin(tu), EDGE)
      .arc(CXC, CZC, rf, tu + (P2 - tu) / n, P2, n - 1, SEAM)
      .pt(CXC, fz, 0, 1, SEAM)
      .arc(-CXC, CZC, rf, P2, Math.PI - tu, n, SEAM)
      .arc(-xf, zf, rk, Math.PI - tu, 3 * P2, 6, EDGE)
      .pt(-xf, zk1, 0, -1, EDGE)
      .arc(xf, zf, rk, 3 * P2, 4 * P2 + tu, 6, EDGE)
    return L.s
  })()
  // its profile: the shaded band in along the seam (the inner ring is the flat fill's edge), the
  // rounded edge, the drop into the seam
  const fprof = [
    { d: RE, band: 1, y: HF, no: 0, ny: 1, c: 1, aoW: 0 },
    { d: RE, band: 0.4, y: HF, no: 0, ny: 1, c: 1, aoW: 0.4 },
    { d: RE, band: 0, y: HF, no: 0, ny: 1, c: 1, aoW: 1 },
  ]
  for (let k = 1; k <= 3; k++) {
    const f = (k / 3) * P2
    fprof.push({ d: RE * (1 - Math.sin(f)), y: HF - RE * (1 - Math.cos(f)), no: Math.sin(f), ny: Math.cos(f), c: 1, aoW: 1 })
  }
  fprof.push({ d: 0, y: HF - 0.3, no: 1, ny: 0, c: 0.82, aoW: 0 })
  fprof.push({ d: 0, y: Y_FLOOR, no: 1, ny: 0, c: 0.55, aoW: 0 })

  // holes in the face: the screen (with its chamfer down to the glass), the print's rects (filled
  // with their own quads, uv'd into the atlas), the grille, the mic
  const screenLoop = roundRect(X(35), Z(35), X(628), Z(666), 7.1, NC)
  const printHoles = (ids) =>
    ids.map((id) => {
      const r = item(id).rect
      return [
        { x: X(r[0]), z: Z(r[1]) },
        { x: X(r[2]), z: Z(r[1]) },
        { x: X(r[2]), z: Z(r[3]) },
        { x: X(r[0]), z: Z(r[3]) },
      ]
    })
  const printQuads = (ids) => {
    for (const id of ids) {
      const it = item(id)
      const [x0, y0, x1, y1] = it.rect
      const q = [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ].map(([sx, sy]) => {
        const uv = atlasUv(it, sx, sy)
        return shell.v(X(sx), HF, Z(sy), 0, 1, 0, uv[0], uv[1], 1)
      })
      shell.quad(q[0], q[1], q[2], q[3])
    }
  }
  const GRILLE_N = 16
  // (each hole's points turned a little differently: no exactly collinear runs along a row)
  const grille = []
  for (let r = 0; r < 5; r++) for (let c = 0; c < 28; c++) grille.push({ x: X(59.34 + 20.16 * c), z: Z(753 + 20 * r), ph: 0.05 + 0.0137 * ((c * 5 + r) % 23) })
  const MIC = { x: X(538.57), z: Z(1126) }

  {
    const up = sweep(shell, upper, fprof, WUV)
    const holes = [screenLoop, ...printHoles(['hd', 'display', 'phones', 'speakers'])]
    for (const g of grille) holes.push(circle(g.x, g.z, 0.4, GRILLE_N, g.ph))
    fill(THREE, shell, pts(shell, up.map((row) => row[0])), holes, HF, WUV, 1)
    printQuads(['hd', 'display', 'phones', 'speakers'])
    // the grille's holes: walls down to the speaker's dark cloth
    for (const g of grille)
      holeWall(
        shell,
        circle(g.x, g.z, 0.4, GRILLE_N, g.ph),
        g.x,
        g.z,
        [
          [HF, 0.86],
          [HF - 0.18, 0.55],
          [HF - 0.7, 0.22],
        ],
        WUV,
      )
    const cloth = [
      [X(48), Z(742)],
      [X(615), Z(742)],
      [X(615), Z(844)],
      [X(48), Z(844)],
    ].map(([x, z]) => shell.v(x, HF - 0.7, z, 0, 1, 0, WUV[0], WUV[1], 0.07))
    shell.quad(cloth[0], cloth[1], cloth[2], cloth[3])
  }
  {
    const lo = sweep(shell, lower, fprof, WUV)
    const mic = circle(MIC.x, MIC.z, 0.32, 16, 0.11)
    fill(THREE, shell, pts(shell, lo.map((row) => row[0])), [mic, ...printHoles(['aux', 'mic'])], HF, WUV, 1)
    printQuads(['aux', 'mic'])
    holeWall(
      shell,
      mic,
      MIC.x,
      MIC.z,
      [
        [HF, 0.8],
        [HF - 0.15, 0.45],
        [HF - 0.5, 0.15],
      ],
      WUV,
    )
    const ring = circle(MIC.x, MIC.z, 0.32, 16, 0.11).map((p) => shell.v(p.x, HF - 0.5, p.z, 0, 1, 0, WUV[0], WUV[1], 0.05))
    const cc = shell.v(MIC.x, HF - 0.5, MIC.z, 0, 1, 0, WUV[0], WUV[1], 0.05)
    for (let k = 0; k < ring.length; k++) shell.tri(cc, ring[k], ring[(k + 1) % ring.length])
  }
  // the screen's opening: a narrow chamfer from the face down to the glass (the SVG's light ring)
  {
    const cn = Math.hypot(0.08, 0.1)
    sweep(
      shell,
      screenLoop,
      [
        { d: 0, y: HF, no: -0.08 / cn, ny: 0.1 / cn, c: 0.95 },
        { d: 0.1, y: HG, no: -0.08 / cn, ny: 0.1 / cn, c: 0.95 },
      ],
      WUV,
    )
  }
  // the floor under the seam and the keypad's well (seen only between the keys)
  {
    const fl = roundRect(-HX + D_SEAM, -HZ + D_SEAM, HX - D_SEAM, HZ - D_SEAM, R_OUT - D_SEAM, 10)
    const ring = fl.map((p) => shell.v(p.x, Y_FLOOR, p.z, 0, 1, 0, WUV[0], WUV[1], 0.55))
    const cc = shell.v(0, Y_FLOOR, 0, 0, 1, 0, WUV[0], WUV[1], 0.55)
    for (let k = 0; k < ring.length; k++) shell.tri(cc, ring[k], ring[(k + 1) % ring.length])
  }
  // the side button: a rounded slab standing 0.75 mm out of the right side, dark where it meets
  // the wall (its slot)
  {
    const bl = roundRect(BTN.z - BTN.half, YJ - BTN.h, BTN.z + BTN.half, YJ + BTN.h, BTN.r, 6) // (z, y)
    const x0 = HX - 0.2
    const xo = HX + BTN.out
    const bprof = [
      { d: 0, x: x0, no: 1, nx: 0, c: 0.3 },
      { d: 0, x: HX + 0.04, no: 1, nx: 0, c: 0.55 },
      { d: 0, x: HX + 0.25, no: 1, nx: 0, c: 0.95 },
      { d: 0, x: xo - BTN.edge, no: 1, nx: 0, c: 1 },
    ]
    for (let k = 1; k <= 5; k++) {
      const f = (k / 5) * P2
      bprof.push({ d: BTN.edge * (1 - Math.cos(f)), x: xo - BTN.edge + BTN.edge * Math.sin(f), no: Math.cos(f), nx: Math.sin(f), c: 1 })
    }
    const g = bl.map((s) => bprof.map((p) => shell.v(p.x, s.z - p.d * s.nz, s.x - p.d * s.nx, p.nx, s.nz * p.no, s.nx * p.no, WUV[0], WUV[1], p.c)))
    for (let i = 0; i < bl.length; i++) {
      const i1 = (i + 1) % bl.length
      for (let j = 0; j < bprof.length - 1; j++) shell.quad(g[i][j], g[i1][j], g[i1][j + 1], g[i][j + 1])
    }
    const cc = shell.v(xo, YJ, BTN.z, 1, 0, 0, WUV[0], WUV[1], 1)
    for (let i = 0; i < bl.length; i++) shell.tri(cc, g[i][bprof.length - 1], g[(i + 1) % bl.length][bprof.length - 1])
  }
  const shellGeo = shell.geometry()
  geometries.push(shellGeo)

  yield

  // =============================================================================================
  // the glass: flat, the display its emissive map (uv), the camera's lens in its colour map (uv1)
  // =============================================================================================
  const glassB = builder(THREE, true)
  {
    const gx0 = X(36)
    const gz0 = Z(36)
    const camX = X(106)
    const camZ = Z(106)
    const uvOf = (x, z) => [(x - gx0) / (SCR_W * MM), (z - gz0) / (SCR_H * MM)]
    const vert = (x, z) => {
      const uv = uvOf(x, z)
      return glassB.v(x, HG, z, 0, 1, 0, uv[0], uv[1], 1, (x - camX) / 3.2 + 0.5, (z - camZ) / 3.2 + 0.5)
    }
    const ring = screenLoop.map((s) => vert(s.x - 0.1 * s.nx, s.z - 0.1 * s.nz))
    const cc = vert(0, Z(350.5))
    for (let k = 0; k < ring.length; k++) glassB.tri(cc, ring[k], ring[(k + 1) % ring.length])
  }
  const glassGeo = glassB.geometry()
  geometries.push(glassGeo)

  // =============================================================================================
  // the keys: a rounded block each, its top edge rolled, a dome on it (the symbol printed on its
  // crown); the rec key's crown is a red dome of its own
  // =============================================================================================
  const keyGeos = []
  let redGeo = null
  for (const K of KEYS) {
    const B = builder(THREE, false)
    const kl = roundRect(X(K.x0), Z(KEY_Y0), X(K.x1), Z(KEY_Y1), KEY_R, 5)
    const kp = [{ d: KEY_E, y: HF, no: 0, ny: 1, c: 1 }]
    for (let k = 1; k <= 5; k++) {
      const f = (k / 5) * P2
      kp.push({ d: KEY_E * (1 - Math.sin(f)), y: HF - KEY_E * (1 - Math.cos(f)), no: Math.sin(f), ny: Math.cos(f), c: 1 })
    }
    kp.push({ d: 0, y: HF - 0.45, no: 1, ny: 0, c: 0.78 })
    kp.push({ d: 0, y: HF - KEY_WALL, no: 1, ny: 0, c: 0.55 })
    const kg = sweep(B, kl, kp, WUV)
    const cx = X(K.cx)
    const cz = Z(KEY_CY)
    const NA = 72
    const base = circle(cx, cz, DOME_A, NA)
    fill(THREE, B, pts(B, kg.map((row) => row[0])), [base], HF, WUV, 1)
    // the dome: a spherical cap, a little shade in its crease; rings in to the symbol's disc (or the
    // red dome's edge)
    const yS = HF + DOME_H - DOME_R
    const sym = K.name === 'rec' ? null : item(K.name)
    const radii = [6.0, 5.82, 5.55, 5.2, 4.8, 4.35, 3.85, 3.35, 2.85, SYM_R]
    const symRadii = [SYM_R, 2.0, 1.6, 1.2, 0.8, 0.4]
    if (K.name === 'rec') radii.push(RED_A)
    const domeV = (r, a, inSym) => {
      const x = cx + r * Math.cos(a)
      const z = cz + r * Math.sin(a)
      const y = yS + Math.sqrt(DOME_R * DOME_R - r * r)
      const uv = inSym ? atlasUv(sym, x / MM + SVG_W / 2, z / MM + SVG_H / 2) : WUV
      const c = r > 5.9 ? 0.84 : r > 5.7 ? 0.95 : 1
      return B.v(x, y, z, (x - cx) / DOME_R, (y - yS) / DOME_R, (z - cz) / DOME_R, uv[0], uv[1], c)
    }
    const rings = radii.map((r) => base.map((_, k) => domeV(r, (k / NA) * Math.PI * 2, false)))
    const stitch = (rs) => {
      for (let j = 0; j < rs.length - 1; j++)
        for (let k = 0; k < NA; k++) {
          const k1 = (k + 1) % NA
          B.quad(rs[j][k], rs[j][k1], rs[j + 1][k1], rs[j + 1][k])
        }
    }
    stitch(rings)
    if (sym) {
      const srings = symRadii.map((r) => base.map((_, k) => domeV(r, (k / NA) * Math.PI * 2, true)))
      stitch(srings)
      const uv = atlasUv(sym, K.cx, KEY_CY)
      const apex = B.v(cx, HF + DOME_H, cz, 0, 1, 0, uv[0], uv[1], 1)
      const last = srings[srings.length - 1]
      for (let k = 0; k < NA; k++) B.tri(apex, last[k], last[(k + 1) % NA])
    } else {
      // the red dome: from the white one's ring at r 2.1, rising another 0.55 mm
      const R = builder(THREE, false)
      const yb = yS + Math.sqrt(DOME_R * DOME_R - RED_A * RED_A)
      const rr = (RED_A * RED_A + RED_H * RED_H) / (2 * RED_H)
      const yc = yb + RED_H - rr
      const rrings = []
      for (let j = 0; j < 12; j++) {
        const r = RED_A * (1 - j / 12) ** 0.85
        rrings.push(
          base.map((_, k) => {
            const a = (k / NA) * Math.PI * 2
            const x = cx + r * Math.cos(a)
            const z = cz + r * Math.sin(a)
            const h = Math.sqrt(rr * rr - r * r)
            return R.v(x, j === 0 ? yb : yc + h, z, (x - cx) / rr, h / rr, (z - cz) / rr, 0, 0, 1)
          }),
        )
      }
      for (let j = 0; j < rrings.length - 1; j++)
        for (let k = 0; k < NA; k++) {
          const k1 = (k + 1) % NA
          R.quad(rrings[j][k], rrings[j][k1], rrings[j + 1][k1], rrings[j + 1][k])
        }
      const apex = R.v(cx, yb + RED_H, cz, 0, 1, 0, 0, 0, 1)
      const last = rrings[rrings.length - 1]
      for (let k = 0; k < NA; k++) R.tri(apex, last[k], last[(k + 1) % NA])
      redGeo = R.geometry()
      geometries.push(redGeo)
    }
    const g = B.geometry()
    keyGeos.push(g)
    geometries.push(g)
  }

  // =============================================================================================
  // the jack's ring: flush with the wall (which curves a little into the corner here), its inner
  // edge rolled into the bore
  // =============================================================================================
  const ringB = builder(THREE, false)
  {
    const prof2 = [
      { r: R_RING, dp: 0, w: 0 },
      { r: 2.2, dp: 0, w: 0 },
      { r: 2.05, dp: 0, w: 0 },
    ]
    for (let k = 1; k <= 5; k++) {
      const f = (k / 5) * P2
      prof2.push({ r: 2.05 - 0.25 * Math.sin(f), dp: 0.25 - 0.25 * Math.cos(f), w: f })
    }
    prof2.push({ r: R_BORE, dp: 0.9, w: P2 })
    const grid = prof2.map((p) =>
      jackAngles.map((a) => {
        const x = XJ + p.r * Math.cos(a)
        const e = bottomEdge(x)
        const cw = Math.cos(p.w)
        const sw = Math.sin(p.w)
        const nx = e.nx * cw - Math.cos(a) * sw
        const ny = -Math.sin(a) * sw
        const nz = e.nz * cw
        const nl = Math.hypot(nx, ny, nz)
        return ringB.v(x, YJ + p.r * Math.sin(a), e.z - p.dp, nx / nl, ny / nl, nz / nl, 0, 0, 1)
      }),
    )
    for (let j = 0; j < prof2.length - 1; j++)
      for (let k = 0; k < jackAngles.length; k++) {
        const k1 = (k + 1) % jackAngles.length
        ringB.quad(grid[j][k], grid[j][k1], grid[j + 1][k1], grid[j + 1][k])
      }
  }
  const ringGeo = ringB.geometry()
  geometries.push(ringGeo)

  yield

  // =============================================================================================
  // the display: a canvas for what is text, the shader for what moves
  // =============================================================================================
  const NB = o.bars
  const SW = Math.round(o.screenWidth)
  const SH = Math.round((SW * SCR_H) / SCR_W)
  const sk = SW / SCR_W
  const screenCanvas = makeCanvas(SW, SH)
  const screenTex = new THREE.CanvasTexture(screenCanvas)
  screenTex.colorSpace = THREE.SRGBColorSpace
  screenTex.flipY = false
  screenTex.anisotropy = o.anisotropy
  textures.push(screenTex)

  // the camera under the glass: its ring, the lens, the lens's coating (the glass's colour map, on
  // uv1: 3.2 mm round the camera, clamped to the glass's own near-black elsewhere)
  const lensCanvas = makeCanvas(256, 256)
  {
    const c = lensCanvas.getContext('2d')
    const s = 256 / 32
    c.setTransform(s, 0, 0, s, -(106 - 16) * s, -(106 - 16) * s)
    c.fillStyle = '#0a0a0b'
    c.fillRect(90, 90, 32, 32)
    c.fillStyle = '#232428'
    c.beginPath()
    c.arc(106, 106, 13, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = 'rgba(255,255,255,0.12)'
    c.lineWidth = 1
    c.beginPath()
    c.arc(106, 106, 12.25, 0, Math.PI * 2)
    c.stroke()
    const g = c.createRadialGradient(105.15, 104.3, 0, 105.15, 104.3, 10.2)
    g.addColorStop(0, '#141a27')
    g.addColorStop(1, '#020203')
    c.fillStyle = g
    c.beginPath()
    c.arc(106, 106, 8.5, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = 'rgba(92,123,196,0.3)'
    c.beginPath()
    c.arc(106, 106, 5.2, 0, Math.PI * 2)
    c.stroke()
    c.fillStyle = 'rgba(255,255,255,0.3)'
    c.beginPath()
    c.arc(103.4, 103.2, 1.9, 0, Math.PI * 2)
    c.fill()
  }
  const lensTex = new THREE.CanvasTexture(lensCanvas)
  lensTex.colorSpace = THREE.SRGBColorSpace
  lensTex.flipY = false
  lensTex.channel = 1
  lensTex.wrapS = lensTex.wrapT = THREE.ClampToEdgeWrapping
  lensTex.anisotropy = o.anisotropy
  textures.push(lensTex)

  // (the numbers that change every frame live in typed arrays: writing them never allocates)
  const st = { title: 'Untitled', artist: '', playing: false }
  const num = new Float64Array(3) // [time, duration, brightness level]
  const T = 0
  const D = 1
  const LV = 2
  num[LV] = o.pausedLevel
  const barsIn = new Float32Array(NB) // what setState gave (resampled)
  const barsU = { value: new Float32Array(NB) } // what is shown (eased)
  const scrU = { value: new Float32Array(4) } // [progress 0..1, -, -, -]
  const drawn = { title: null, artist: null, playing: null, t: -1, d: -1 }

  const fmt = (s) => {
    s = Math.max(0, Math.floor(s))
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${r < 10 ? '0' : ''}${r}`
  }
  function fit(c, str, max) {
    if (c.measureText(str).width <= max) return str
    let n = str.length
    while (n > 1 && c.measureText(`${str.slice(0, n)}…`).width > max) n--
    return `${str.slice(0, n).trimEnd()}…`
  }
  function drawScreen() {
    const c = screenCanvas.getContext('2d')
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.fillStyle = '#000000'
    c.fillRect(0, 0, SW, SH)
    c.setTransform(sk, 0, 0, sk, 0, 0)
    c.textBaseline = 'alphabetic'
    // the status line, beside the camera
    drawText(c, st.playing ? 'NOW PLAYING' : 'PAUSED', 104, 76.5, 'start', 600, 15, 2.6, '#9a9b9d')
    c.fillStyle = '#eceef0'
    if (st.playing) {
      c.beginPath()
      c.moveTo(519, 62.5)
      c.lineTo(533, 70.5)
      c.lineTo(519, 78.5)
      c.closePath()
      c.fill()
    } else {
      rrect(c, 518, 62.5, 5, 16, 1.2)
      c.fill()
      rrect(c, 527.5, 62.5, 5, 16, 1.2)
      c.fill()
    }
    c.textAlign = 'left'
    c.letterSpacing = '0px'
    c.font = `600 44px ${family}`
    c.fillStyle = '#f3f5f7'
    c.fillText(fit(c, st.title, 471), 60, 452)
    c.font = `400 28px ${family}`
    c.fillStyle = '#9b9ea2'
    c.fillText(fit(c, st.artist, 471), 60, 497)
    c.font = `500 22px ${family}`
    c.fillStyle = '#a3a6aa'
    c.fillText(fmt(num[T]), 60, 590)
    c.textAlign = 'right'
    c.fillText(fmt(num[D]), 531, 590)
    c.textAlign = 'left'
    screenTex.needsUpdate = true
    drawn.title = st.title
    drawn.artist = st.artist
    drawn.playing = st.playing
    drawn.t = Math.floor(num[T])
    drawn.d = Math.floor(num[D])
  }
  // (redraw only when something the canvas shows has changed)
  function syncScreen() {
    if (
      drawn.title !== st.title ||
      drawn.artist !== st.artist ||
      drawn.playing !== st.playing ||
      drawn.t !== Math.floor(num[T]) ||
      drawn.d !== Math.floor(num[D])
    )
      drawScreen()
    scrU.value[0] = num[D] > 0 ? Math.min(1, num[T] / num[D]) : 0
  }

  // =============================================================================================
  // materials (one instance each)
  // =============================================================================================
  const plastic = new THREE.MeshPhysicalMaterial({
    name: 'player.plastic',
    color: o.color,
    map: atlasTex,
    vertexColors: true,
    roughness: 0.46,
    metalness: 0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.24,
    specularIntensity: 0.7,
  })
  // (a molded surface is never quite even: its roughness wanders a little, in object space, so the
  // keys keep theirs as they move)
  plastic.onBeforeCompile = (sh2) => {
    sh2.vertexShader = sh2.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPlObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPlObj = transformed;')
    sh2.fragmentShader = sh2.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vPlObj;
        float plH(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float plN(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(plH(i), plH(i + vec3(1, 0, 0)), f.x), mix(plH(i + vec3(0, 1, 0)), plH(i + vec3(1, 1, 0)), f.x), f.y),
                     mix(mix(plH(i + vec3(0, 0, 1)), plH(i + vec3(1, 0, 1)), f.x), mix(plH(i + vec3(0, 1, 1)), plH(i + vec3(1, 1, 1)), f.x), f.y), f.z);
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `#include <roughnessmap_fragment>
        float plSm = 0.65 * plN(vPlObj * 0.23 + 3.7) + 0.35 * plN(vPlObj * 0.97);
        roughnessFactor *= 0.87 + 0.26 * plSm;`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        /* glsl */ `#include <lights_physical_fragment>
        #ifdef USE_CLEARCOAT
          material.clearcoatRoughness = min(material.clearcoatRoughness * (0.8 + 0.4 * plSm), 1.0);
        #endif`,
      )
  }
  plastic.customProgramCacheKey = () => 'player.plastic'
  const glass = new THREE.MeshPhysicalMaterial({
    name: 'player.glass',
    color: 0xffffff,
    map: lensTex,
    roughness: 0.1,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    ior: 1.52,
    emissive: 0xffffff,
    emissiveMap: screenTex,
    emissiveIntensity: o.screenBrightness * num[LV],
  })
  glass.onBeforeCompile = (sh2) => {
    sh2.uniforms.uBars = barsU
    sh2.uniforms.uScr = scrU
    sh2.fragmentShader = sh2.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform float uBars[${NB}];
        uniform vec4 uScr;
        float plBox(vec2 p, vec2 c, vec2 h, float r) {
          vec2 q = abs(p - c) - h + r;
          return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
        }
        float plSeg(vec2 p, vec2 a, vec2 b) {
          vec2 pa = p - a, ba = b - a;
          return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        {
          // (in the design's units across the glass: 591 x 629)
          vec2 sp = vEmissiveMapUv * vec2(${SCR_W}.0, ${SCR_H}.0);
          float aa = 0.6 * length(fwidth(sp)) + 1e-3;
          vec3 ui = vec3(0.0);
          // the spectrum: rounded bars on a baseline, a faint reflection under it
          const float NB = ${NB}.0;
          const float PITCH = 471.0 / NB;
          float bi = clamp(floor((sp.x - 60.0) / PITCH), 0.0, NB - 1.0);
          float lv = clamp(uBars[int(bi)], 0.0, 1.0);
          float bw = 0.58 * PITCH;
          float bh = bw + lv * 180.0;
          float bx = 60.0 + (bi + 0.5) * PITCH;
          float d = plBox(sp, vec2(bx, 372.0 - bh * 0.5), vec2(bw * 0.5, bh * 0.5), bw * 0.5);
          float g = clamp((372.0 - sp.y) / 190.0, 0.0, 1.0);
          ui += (1.0 - smoothstep(-aa, aa, d)) * mix(vec3(0.42, 0.43, 0.45), vec3(0.97, 0.98, 1.0), g);
          float dr = plBox(vec2(sp.x, 750.0 - sp.y), vec2(bx, 372.0 - bh * 0.5), vec2(bw * 0.5, bh * 0.5), bw * 0.5);
          ui += (1.0 - smoothstep(-aa, aa, dr)) * clamp(1.0 - (sp.y - 378.0) / 34.0, 0.0, 1.0) * step(378.0, sp.y) * smoothstep(0.0, 0.12, lv) * vec3(0.1);
          // the progress bar: the track, what has played, the knob
          float px = mix(60.0, 531.0, clamp(uScr.x, 0.0, 1.0));
          ui = max(ui, vec3(0.15) * (1.0 - smoothstep(-aa, aa, plSeg(sp, vec2(60.0, 545.0), vec2(531.0, 545.0)) - 2.5)));
          ui = max(ui, vec3(0.86, 0.87, 0.88) * (1.0 - smoothstep(-aa, aa, plSeg(sp, vec2(60.0, 545.0), vec2(px, 545.0)) - 2.5)));
          ui = max(ui, vec3(1.0) * (1.0 - smoothstep(-aa, aa, length(sp - vec2(px, 545.0)) - 7.0)));
          totalEmissiveRadiance += emissive * ui;
        }`,
      )
  }
  glass.customProgramCacheKey = () => `player.screen.${NB}`
  const red = new THREE.MeshPhysicalMaterial({
    name: 'player.red',
    color: 0xd9271b,
    roughness: 0.2,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
  })
  const metal = new THREE.MeshPhysicalMaterial({
    name: 'player.nickel',
    color: 0xd2cdc4,
    metalness: 1,
    roughness: 0.3,
  })
  // (the closed parts cast their shadows from their back faces: the lit side never shades itself,
  // so no acne on grazing edges, whatever bias the scene's light has)
  plastic.shadowSide = red.shadowSide = metal.shadowSide = THREE.BackSide
  const materials = [plastic, glass, red, metal]

  yield

  // =============================================================================================
  // meshes
  // =============================================================================================
  const group = new THREE.Group()
  group.name = 'player'
  const mk = (geo, mat, name, part) => {
    const m = new THREE.Mesh(geo, mat)
    m.name = name
    m.castShadow = o.castShadow
    m.receiveShadow = o.receiveShadow
    m.userData.part = part
    return m
  }
  const shellMesh = mk(shellGeo, plastic, 'player.shell', 'shell')
  const glassMesh = mk(glassGeo, glass, 'player.screen', 'screen')
  const ringMesh = mk(ringGeo, metal, 'player.jack', 'port')
  group.add(shellMesh, glassMesh, ringMesh)
  const meshes = [shellMesh, glassMesh, ringMesh]
  const keyMeshes = KEYS.map((K, i) => {
    const m = mk(keyGeos[i], plastic, `player.key.${K.name}`, 'key')
    m.userData.key = K.name
    group.add(m)
    meshes.push(m)
    if (K.name === 'rec') {
      const r = mk(redGeo, red, 'player.key.rec.dome', 'key')
      r.userData.key = K.name
      m.add(r)
      meshes.push(r)
    }
    return m
  })
  const keyY = new Float64Array(KEYS.length) // where each key is (0 up, -TRAVEL down)
  const keyTo = new Float64Array(KEYS.length) // and where it is going
  const keys = KEYS.map((K, i) => ({
    name: K.name,
    mesh: keyMeshes[i],
    press(down) {
      keyTo[i] = down ? -TRAVEL : 0
    },
  }))

  // a soft contact shadow on the desk (a quad just above it), for the ambient light the shadow map
  // does not take away
  if (o.contactShadow) {
    const m = 10 // mm beyond the outline
    const W = 2 * (HX + m)
    const L = 2 * (HZ + m)
    const cw = 128
    const ch = Math.round((cw * L) / W)
    const pxmm = cw / W
    const cv = makeCanvas(cw, ch)
    const c = cv.getContext('2d')
    c.clearRect(0, 0, cw, ch)
    const N = 28
    for (let k = 0; k < N; k++) {
      // rounded rects from 4 mm outside the outline to 3 mm inside, each adding a little (densest
      // under the bottom's roll, where it meets the desk)
      const t = k / (N - 1)
      const g = 4 - 7 * t
      const x0 = (m - g) * pxmm
      const y0 = (m - g) * pxmm
      c.fillStyle = `rgba(0,0,0,${0.02 + 0.07 * t * t})`
      rrect(c, x0, y0, cw - 2 * x0, ch - 2 * y0, Math.max(0.5, (R_OUT + g) * pxmm))
      c.fill()
    }
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    textures.push(tex)
    const geo = new THREE.PlaneGeometry(W, L).rotateX(-Math.PI / 2)
    geometries.push(geo)
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    mat.name = 'player.contactShadow'
    materials.push(mat)
    const cs = new THREE.Mesh(geo, mat)
    cs.name = 'player.contactShadow'
    cs.position.y = 0.04
    cs.renderOrder = -1
    group.add(cs)
  }

  // the jack: its mouth's centre on the wall, pointing out along +z
  const port = {
    position: new THREE.Vector3(XJ, YJ, bottomEdge(XJ).z),
    direction: new THREE.Vector3(0, 0, 1),
    radius: 1.75,
    depth: BORE_DEPTH,
  }
  const bounds = new THREE.Box3()
  for (const g of [shellGeo, glassGeo, ringGeo, ...keyGeos, redGeo]) bounds.union(g.boundingBox)

  // =============================================================================================
  // the API
  // =============================================================================================
  const screen = {
    /** Any of { title, artist, playing, time (s), duration (s), bars (0..1 levels, any length) }. */
    setState(s) {
      if (!s || disposed) return
      if (s.title !== undefined) st.title = String(s.title ?? '')
      if (s.artist !== undefined) st.artist = String(s.artist ?? '')
      if (s.playing !== undefined) st.playing = !!s.playing
      if (s.duration !== undefined) num[D] = Math.max(0, +s.duration || 0)
      if (s.time !== undefined) num[T] = Math.max(0, +s.time || 0)
      if (s.bars) {
        const n = s.bars.length
        for (let i = 0; i < NB; i++) {
          // (each bar the loudest of the levels it covers; fewer levels than bars: the nearest)
          const a = Math.floor((i * n) / NB)
          const b = Math.max(a + 1, Math.floor(((i + 1) * n) / NB))
          let v = 0
          for (let j = a; j < b && j < n; j++) v = Math.max(v, +s.bars[j] || 0)
          barsIn[i] = Math.min(1, Math.max(0, v))
        }
      }
      syncScreen()
    },
  }

  /** Advance the keys' travel, the clock (while playing), the bars and the brightness. Returns true if anything visible changed. */
  function update(dt) {
    if (disposed) return false
    dt = Math.min(0.1, Math.max(0, +dt || 0))
    let changed = false
    for (let i = 0; i < keyY.length; i++) {
      const y = keyY[i]
      const to = keyTo[i]
      if (y !== to) {
        const y2 = y + (to - y) * (1 - Math.exp(-(to < y ? 75 : 32) * dt)) // (down at once, back up a little slower)
        keyY[i] = Math.abs(to - y2) < 0.002 ? to : y2
        keyMeshes[i].position.y = keyY[i]
        changed = true
      }
    }
    if (st.playing) {
      num[T] += dt
      if (num[D] > 0 && num[T] > num[D]) num[T] = num[D]
      changed = true
    }
    const lt = st.playing ? 1 : o.pausedLevel
    if (num[LV] !== lt) {
      const l2 = num[LV] + (lt - num[LV]) * (1 - Math.exp(-7 * dt))
      num[LV] = Math.abs(lt - l2) < 0.002 ? lt : l2
      glass.emissiveIntensity = o.screenBrightness * num[LV]
      changed = true
    }
    const bars = barsU.value
    for (let i = 0; i < NB; i++) {
      const t = st.playing ? barsIn[i] : 0
      const v = bars[i]
      if (v !== t) {
        const v2 = v + (t - v) * (1 - Math.exp(-(t > v ? 28 : 7) * dt))
        bars[i] = Math.abs(t - v2) < 0.002 ? t : v2
        changed = true
      }
    }
    syncScreen()
    return changed
  }

  function dispose() {
    if (disposed) return
    disposed = true
    group.removeFromParent()
    for (const g of geometries) g.dispose()
    for (const m of materials) m.dispose()
    for (const t of textures) t.dispose()
  }

  // the print and the display now (in whatever font there is), again once the font has loaded
  drawAtlas()
  drawScreen()
  const redraw = () => {
    if (disposed) return
    drawAtlas()
    drawScreen()
  }
  let ready = Promise.resolve()
  if (typeof document !== 'undefined' && document.fonts) {
    if (o.fontUrl && typeof FontFace !== 'undefined') {
      const ff = new FontFace(o.fontFamily, `url(${o.fontUrl})`, { weight: '100 900' })
      ready = ff
        .load()
        .then((f) => {
          document.fonts.add(f)
          redraw()
        })
        .catch(() => {})
    } else {
      ready = Promise.all([document.fonts.load(`500 16px "${o.fontFamily}"`), document.fonts.load(`650 16px "${o.fontFamily}"`)])
        .then(() => {
          if (document.fonts.check(`500 16px "${o.fontFamily}"`)) redraw()
        })
        .catch(() => {})
    }
  }

  return { group, meshes, keys, port, screen, update, dispose, ready, bounds }
}
/** The player, built at once. */
export function createPlayer(THREE, opts = {}) {
  return runSteps(playerSteps(THREE, opts))
}
/** The player, built a part per task (`tick`: a promise between them), for a page that is loading. */
export function createPlayerAsync(THREE, opts = {}, tick) {
  return runStepsAsync(playerSteps(THREE, opts), tick)
}
