// The desk mat: a wool-felt desk pad, 3 mm thick, its edge rolled and overlocked with a thread of
// its own colour, lying under the still life (the notebook beside it, on the bare desk). Its top
// is the desk's own height (y = 0), where everything already rests: nothing that lies or falls on
// the desk changes; the desk itself is moved down by the mat's thickness.
// Frame: x across the picture (u), z down it (v), y up: the view's own axes (layout.js), so its
// edges run straight across the picture.
import * as THREE from 'three'

export const MAT = {
  t: 3, // (mm, thick)
  // its extent in the view's axes (mm): from far off the picture's left to between the ashtray and
  // the notebook, a hand's width above and below the objects
  u0: -700,
  u1: 112, // (a hand short of the notebook)
  v0: -125, // (in front of the laptop, which stands on the bare desk)
  v1: 224, // (a wide pad now: 812 x 349 mm)
  r: 16, // (the corners' radius)
  edge: 3.4, // (the rolled edge's width, mm)
  tile: 64, // (mm the felt's texture covers before it repeats)
}

/** The colours it comes in: the felt, the overlock thread round its edge, the felt's sheen. */
export const MAT_COLORS = {
  slate: { felt: 0x3d4452, thread: 0x2c313b, sheen: 0x8c95a8 },
  sage: { felt: 0x7e9183, thread: 0x627467, sheen: 0xcdd8cf },
  rust: { felt: 0x9a5640, thread: 0x7a412f, sheen: 0xe2a58c },
  oat: { felt: 0xc9bea9, thread: 0xa99d86, sheen: 0xf2ece0 },
  heather: { felt: 0xa3a5a8, thread: 0x7f8287, sheen: 0xe6e8ec },
  // (the printed pad: a deep ink blue, a map's contour lines on it: `print` their colour, `sun` the
  // disc's)
  ink: { felt: 0x39415c, thread: 0x232838, sheen: 0x8f9cc4, print: '#7fe0d2', sun: '#ff8a4c' },
  // (a printed pad: a koi pond under cherry blossom, drawn by koiCanvas below)
  koi: { felt: 0x62c3c4, thread: 0x2c8794, sheen: 0xc8f2ec, art: 'koi' },
}

/** A seeded random (the felt is the same every time). */
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * The felt, tiling: a mat of fine fibres laid every way, its colour a little uneven (RGB: the
 * fibres' shading, grey, the felt's colour comes from the material), and its relief (A). S px square.
 */
function feltCanvas(S) {
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  g.fillStyle = '#808080'
  g.fillRect(0, 0, S, S)
  const rnd = rng(11)
  // (each stroke drawn at the eight neighbouring tiles too: the texture tiles without a seam)
  const strokeWrapped = (draw) => {
    for (let dx = -S; dx <= S; dx += S) for (let dy = -S; dy <= S; dy += S) draw(dx, dy)
  }
  // soft blotches: felt is pressed, never quite even
  for (let i = 0; i < 90; i++) {
    const x = rnd() * S
    const y = rnd() * S
    const r = S * (0.05 + 0.12 * rnd())
    const l = rnd() < 0.5 ? 255 : 0
    strokeWrapped((dx, dy) => {
      const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r)
      gr.addColorStop(0, `rgba(${l},${l},${l},0.016)`)
      gr.addColorStop(1, `rgba(${l},${l},${l},0)`)
      g.fillStyle = gr
      g.fillRect(x + dx - r, y + dy - r, 2 * r, 2 * r)
    })
  }
  // the fibres: short, curling, light and dark, every way
  g.lineCap = 'round'
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * S
    const y = rnd() * S
    const a = rnd() * Math.PI * 2
    const len = S * (0.01 + 0.035 * rnd())
    const bend = (rnd() - 0.5) * 1.6
    const light = rnd() < 0.5
    const k = 0.05 + 0.1 * rnd()
    g.strokeStyle = light ? `rgba(255,255,255,${k})` : `rgba(0,0,0,${k})`
    g.lineWidth = 0.6 + 0.9 * rnd()
    const mx = x + Math.cos(a + bend) * len * 0.5
    const my = y + Math.sin(a + bend) * len * 0.5
    const ex = x + Math.cos(a) * len
    const ey = y + Math.sin(a) * len
    strokeWrapped((dx, dy) => {
      g.beginPath()
      g.moveTo(x + dx, y + dy)
      g.quadraticCurveTo(mx + dx, my + dy, ex + dx, ey + dy)
      g.stroke()
    })
  }
  return c
}

/** A normal map from the felt's shading (its relief, gently: felt is soft). */
function normalsFrom(src, strength) {
  const S = src.width
  const d = src.getContext('2d').getImageData(0, 0, S, S).data
  const out = document.createElement('canvas')
  out.width = out.height = S
  const og = out.getContext('2d')
  const img = og.createImageData(S, S)
  const h = (x, y) => d[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const nx = (h(x - 1, y) - h(x + 1, y)) * strength
      const ny = (h(x, y - 1) - h(x, y + 1)) * strength
      const l = Math.hypot(nx, ny, 1)
      const o = (y * S + x) * 4
      img.data[o] = (nx / l) * 127.5 + 127.5
      img.data[o + 1] = (-ny / l) * 127.5 + 127.5
      img.data[o + 2] = (1 / l) * 127.5 + 127.5
      img.data[o + 3] = 255
    }
  og.putImageData(img, 0, 0)
  return out
}

/** The overlock thread: tight stitches across the edge, slanted (u along the edge, v across it). */
function threadCanvas() {
  const W = 64
  const H = 32
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  g.fillStyle = '#7a7a7a'
  g.fillRect(0, 0, W, H)
  // (eight stitches a tile; each a slanted strand, lit along its middle)
  for (let i = -2; i < 10; i++) {
    const x = i * 8
    const gr = g.createLinearGradient(x, 0, x + 6, 0)
    gr.addColorStop(0, 'rgba(40,40,40,0.9)')
    gr.addColorStop(0.5, 'rgba(200,200,200,0.9)')
    gr.addColorStop(1, 'rgba(40,40,40,0.9)')
    g.fillStyle = gr
    g.beginPath()
    g.moveTo(x, H)
    g.lineTo(x + 6, H)
    g.lineTo(x + 10, 0)
    g.lineTo(x + 4, 0)
    g.closePath()
    g.fill()
  }
  return c
}

/** The mat's outline: a rounded rectangle, as points with their outward normals (counter-clockwise seen from above). */
function outline(m, perCorner = 14) {
  const pts = []
  const { u0, u1, v0, v1, r } = m
  // corners, in order round the outline (in x = u, z = v; from above, +x right, +z towards the viewer)
  const corners = [
    [u1 - r, v1 - r, 0], // (lower right: from pointing right to pointing down the picture)
    [u0 + r, v1 - r, Math.PI / 2],
    [u0 + r, v0 + r, Math.PI],
    [u1 - r, v0 + r, (3 * Math.PI) / 2],
  ]
  for (const [cx, cz, a0] of corners)
    for (let k = 0; k <= perCorner; k++) {
      const a = a0 + (k / perCorner) * (Math.PI / 2)
      const nx = Math.cos(a)
      const nz = Math.sin(a)
      pts.push({ x: cx + nx * r, z: cz + nz * r, nx, nz })
    }
  return pts
}

/**
 * The mat. colors: one of MAT_COLORS. Returns { group, meshes, materials (for the ember's light),
 * setColors(c), dispose() }.
 */
/**
 * The pad's print (W x H px over the whole pad): a map's contour lines, every fifth one heavier,
 * a low sun cut by horizontal slits, a small legend in a corner. Transparent where the felt shows.
 */
function printCanvas(W, H, c) {
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')
  // the land: a few octaves of smooth noise, a ridge running across it
  const N = 64
  const lat = new Float32Array(N * N)
  const r = rng(4242)
  for (let i = 0; i < N * N; i++) lat[i] = r()
  const smooth = (t) => t * t * (3 - 2 * t)
  const noise = (x, y) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const fx = smooth(x - xi)
    const fy = smooth(y - yi)
    const at = (a, b) => lat[((b % N) + N) % N * N + (((a % N) + N) % N)]
    return (at(xi, yi) * (1 - fx) + at(xi + 1, yi) * fx) * (1 - fy) + (at(xi, yi + 1) * (1 - fx) + at(xi + 1, yi + 1) * fx) * fy
  }
  const K = 15 // (contour levels)
  const lev = new Int16Array(W * H)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = (x / W) * 4.6
      const v = (y / W) * 4.6
      let h = noise(u, v) * 0.56 + noise(u * 2.1 + 9, v * 2.1 + 3) * 0.27 + noise(u * 4.3 + 1, v * 4.3 + 7) * 0.12
      h += 0.16 * Math.sin(u * 0.9 + v * 0.5)
      lev[y * W + x] = Math.floor(h * K)
    }
  const img = g.createImageData(W, H)
  const col = [parseInt(c.print.slice(1, 3), 16), parseInt(c.print.slice(3, 5), 16), parseInt(c.print.slice(5, 7), 16)]
  for (let y = 1; y < H - 2; y++)
    for (let x = 1; x < W - 2; x++) {
      const l = lev[y * W + x]
      // (a line where the level changes; a heavier one at every fifth)
      const edge = l !== lev[y * W + x + 1] || l !== lev[(y + 1) * W + x]
      const major = Math.max(l, lev[y * W + x + 1], lev[(y + 1) * W + x]) % 5 === 0
      const wide = major && (l !== lev[y * W + x + 2] || l !== lev[(y + 2) * W + x] || l !== lev[y * W + x - 1] || l !== lev[(y - 1) * W + x])
      if (!edge && !wide) continue
      const o = (y * W + x) * 4
      img.data[o] = col[0]
      img.data[o + 1] = col[1]
      img.data[o + 2] = col[2]
      img.data[o + 3] = edge && major ? 235 : wide ? 190 : 120
    }
  g.putImageData(img, 0, 0)
  // the sun, low on the left: a disc, cut by slits that widen towards its foot
  const sx = W * 0.2
  const sy = H * 0.5
  const sr = H * 0.27
  g.save()
  g.globalCompositeOperation = 'destination-out'
  g.beginPath()
  g.arc(sx, sy, sr * 1.16, 0, Math.PI * 2)
  g.fill()
  g.restore()
  g.save()
  g.beginPath()
  g.arc(sx, sy, sr, 0, Math.PI * 2)
  g.clip()
  const sun = g.createLinearGradient(0, sy - sr, 0, sy + sr)
  sun.addColorStop(0, '#ffd27a')
  sun.addColorStop(0.55, c.sun)
  sun.addColorStop(1, '#f0527a')
  g.fillStyle = sun
  g.fillRect(sx - sr, sy - sr, 2 * sr, 2 * sr)
  g.globalCompositeOperation = 'destination-out'
  for (let k = 0; k < 7; k++) {
    const t = k / 6
    const yy = sy + sr * (0.06 + 0.86 * t)
    g.fillRect(sx - sr, yy, 2 * sr, sr * (0.022 + 0.062 * t))
  }
  g.restore()
  // the legend
  g.fillStyle = c.print
  g.globalAlpha = 0.85
  g.font = `600 ${Math.round(H * 0.026)}px ui-monospace, Menlo, Consolas, monospace`
  g.fillText('LATE NIGHT DESK', W * 0.035, H * 0.905)
  g.globalAlpha = 0.55
  g.font = `400 ${Math.round(H * 0.02)}px ui-monospace, Menlo, Consolas, monospace`
  g.fillText('CONTOUR INTERVAL 5 M  ·  SHEET 26', W * 0.035, H * 0.94)
  g.globalAlpha = 1
  return cv
}

/**
 * The pad's picture, "koi" (W x H px over the whole pad, its top edge the pad's far one): a pond
 * seen from above. Teal water, lighter towards the near edge; the soft dark shapes of trees
 * mirrored in it; two koi circling, one white with coral patches, one dark with red, rings on
 * the water where the white one has just turned; cherry branches reaching in from two corners,
 * their petals fallen on the water. Drawn here, stroke by stroke: no picture is loaded.
 */
function koiCanvas(W, H) {
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')
  const r = rng(90210)
  const R = (a, b) => a + (b - a) * r()
  const u = H / 880 // (the drawing's unit: it was laid out 880 px tall)
  // ---- the water
  const water = g.createLinearGradient(W * 0.75, 0, W * 0.3, H)
  water.addColorStop(0, '#2f93a8')
  water.addColorStop(0.45, '#56bfc2')
  water.addColorStop(1, '#aee9dc')
  g.fillStyle = water
  g.fillRect(0, 0, W, H)
  // the trees' reflections: clusters of soft round shapes, darker than the water
  const canopy = (cx, cy, n, spread, rad, col) => {
    g.fillStyle = col
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2
      const d = Math.sqrt(r()) * spread
      g.beginPath()
      g.ellipse(cx + Math.cos(a) * d * 1.5, cy + Math.sin(a) * d, R(0.5, 1) * rad, R(0.4, 0.8) * rad, R(0, 3), 0, Math.PI * 2)
      g.fill()
    }
  }
  canopy(W * 0.34, H * 0.2, 60, 150 * u, 46 * u, 'rgba(24,110,128,0.2)')
  canopy(W * 0.62, H * 0.3, 70, 170 * u, 50 * u, 'rgba(24,110,128,0.17)')
  canopy(W * 0.9, H * 0.14, 50, 130 * u, 44 * u, 'rgba(20,98,122,0.24)')
  canopy(W * 0.78, H * 0.78, 60, 150 * u, 46 * u, 'rgba(52,150,150,0.2)')
  canopy(W * 0.08, H * 0.3, 40, 110 * u, 40 * u, 'rgba(24,110,128,0.16)')
  // light on the water: a few pale streaks
  g.strokeStyle = 'rgba(255,255,255,0.16)'
  g.lineCap = 'round'
  for (let i = 0; i < 46; i++) {
    const x = R(0, W)
    const y = R(0, H)
    g.lineWidth = R(1.5, 4) * u
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + R(30, 110) * u, y + R(-4, 4) * u)
    g.stroke()
  }

  // ---- a koi along a spine (a cubic curve, head first), `len` long and `wide` across
  const cubic = (p, t) => {
    const m = 1 - t
    return [m * m * m * p[0] + 3 * m * m * t * p[2] + 3 * m * t * t * p[4] + t * t * t * p[6], m * m * m * p[1] + 3 * m * m * t * p[3] + 3 * m * t * t * p[5] + t * t * t * p[7]]
  }
  const PROFILE = [0, 0.02, 0.05, 0.56, 0.12, 0.86, 0.26, 1, 0.45, 0.9, 0.64, 0.56, 0.8, 0.24, 0.88, 0.15]
  const widthAt = (t) => {
    for (let i = 2; i < PROFILE.length; i += 2) if (t <= PROFILE[i]) return PROFILE[i - 1] + ((PROFILE[i + 1] - PROFILE[i - 1]) * (t - PROFILE[i - 2])) / (PROFILE[i] - PROFILE[i - 2])
    return 0.15
  }
  function koi(spine, wide, pal, patches) {
    const N = 40
    const L = []
    const Rr = []
    const mid = []
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * 0.88
      const p = cubic(spine, t)
      const q = cubic(spine, t + 0.01)
      let nx = -(q[1] - p[1])
      let ny = q[0] - p[0]
      const l = Math.hypot(nx, ny) || 1
      nx /= l
      ny /= l
      const w = widthAt(t) * wide
      L.push([p[0] + nx * w, p[1] + ny * w])
      Rr.push([p[0] - nx * w, p[1] - ny * w])
      mid.push([p[0], p[1], nx, ny])
    }
    const body = () => {
      g.beginPath()
      g.moveTo(L[0][0], L[0][1])
      for (const p of L) g.lineTo(p[0], p[1])
      for (let i = N; i >= 0; i--) g.lineTo(Rr[i][0], Rr[i][1])
      g.closePath()
    }
    // its shade on the pond's floor, a little off it
    g.save()
    g.translate(14 * u, 18 * u)
    body()
    g.fillStyle = 'rgba(16,84,104,0.22)'
    g.fill()
    g.restore()
    // the tail: two long veils from the tail's root, swept the way the body bends
    const e = mid[N]
    const dx = e[0] - mid[N - 4][0]
    const dy = e[1] - mid[N - 4][1]
    const dl = Math.hypot(dx, dy) || 1
    const tx = dx / dl
    const ty = dy / dl
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(e[0], e[1])
      g.bezierCurveTo(e[0] + tx * wide * 1.4 + e[2] * s * wide * 0.5, e[1] + ty * wide * 1.4 + e[3] * s * wide * 0.5, e[0] + tx * wide * 2.6 + e[2] * s * wide * 1.5, e[1] + ty * wide * 2.6 + e[3] * s * wide * 1.5, e[0] + tx * wide * 3.3 + e[2] * s * wide * 1.2, e[1] + ty * wide * 3.3 + e[3] * s * wide * 1.2)
      g.bezierCurveTo(e[0] + tx * wide * 2.4 + e[2] * s * wide * 0.3, e[1] + ty * wide * 2.4 + e[3] * s * wide * 0.3, e[0] + tx * wide * 1.2, e[1] + ty * wide * 1.2, e[0], e[1])
      g.fillStyle = pal.fin
      g.fill()
    }
    // the breast fins, spread
    const f = mid[Math.round(N * 0.3)]
    for (const s of [-1, 1]) {
      g.save()
      g.translate(f[0] + f[2] * s * wide * 0.95, f[1] + f[3] * s * wide * 0.95)
      g.rotate(Math.atan2(f[3] * s, f[2] * s) + s * 0.75)
      g.beginPath()
      g.ellipse(wide * 0.55, 0, wide * 0.78, wide * 0.36, 0, 0, Math.PI * 2)
      g.fillStyle = pal.fin
      g.fill()
      g.restore()
    }
    body()
    g.fillStyle = pal.body
    g.fill()
    // its markings, kept inside it
    g.save()
    body()
    g.clip()
    for (const [t, off, rad, col] of patches) {
      const m = mid[Math.round((t / 0.88) * N)]
      g.fillStyle = col
      for (let k = 0; k < 5; k++) {
        g.beginPath()
        g.ellipse(m[0] + m[2] * off * wide + R(-0.3, 0.3) * rad * wide, m[1] + m[3] * off * wide + R(-0.3, 0.3) * rad * wide, R(0.6, 1) * rad * wide, R(0.5, 0.9) * rad * wide, R(0, 3), 0, Math.PI * 2)
        g.fill()
      }
    }
    // a soft line of light down its back
    g.strokeStyle = pal.back
    g.lineWidth = wide * 0.16
    g.beginPath()
    for (let i = 3; i < N - 2; i++) (i === 3 ? g.moveTo : g.lineTo).call(g, mid[i][0], mid[i][1])
    g.stroke()
    g.restore()
    // eyes, and the two whiskers
    const h = mid[3]
    g.fillStyle = pal.eye
    for (const s of [-1, 1]) {
      g.beginPath()
      g.arc(h[0] + h[2] * s * wide * 0.5, h[1] + h[3] * s * wide * 0.5, wide * 0.085, 0, Math.PI * 2)
      g.fill()
    }
    const n0 = mid[0]
    const hx = n0[0] - mid[2][0]
    const hy = n0[1] - mid[2][1]
    const hl = Math.hypot(hx, hy) || 1
    g.strokeStyle = pal.body
    g.lineWidth = Math.max(1.2, wide * 0.045)
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(n0[0] + n0[2] * s * wide * 0.22, n0[1] + n0[3] * s * wide * 0.22)
      g.quadraticCurveTo(n0[0] + (hx / hl) * wide * 0.5 + n0[2] * s * wide * 0.5, n0[1] + (hy / hl) * wide * 0.5 + n0[3] * s * wide * 0.5, n0[0] + (hx / hl) * wide * 0.25 + n0[2] * s * wide * 0.95, n0[1] + (hy / hl) * wide * 0.25 + n0[3] * s * wide * 0.95)
      g.stroke()
    }
  }
  // the rings where the white one turned
  const ringAt = [W * 0.335, H * 0.4]
  g.strokeStyle = 'rgba(255,255,255,0.5)'
  for (let k = 0; k < 6; k++) {
    g.lineWidth = (3.2 - k * 0.4) * u
    const rad = (70 + k * 34) * u
    for (let a = 0; a < 3; a++) {
      const a0 = R(0, Math.PI * 2)
      g.beginPath()
      g.ellipse(ringAt[0], ringAt[1], rad * 1.15, rad * 0.86, 0.2, a0, a0 + R(0.5, 1.5))
      g.stroke()
    }
  }
  // the white koi: turning, head down and to the left
  koi([W * 0.325, H * 0.56, W * 0.33, H * 0.36, W * 0.4, H * 0.2, W * 0.5, H * 0.26].map((v) => v), 40 * u, { body: '#fdf5ec', fin: 'rgba(255,250,244,0.78)', back: 'rgba(255,255,255,0.55)', eye: '#3a2a30' }, [
    [0.1, 0.2, 0.55, '#f28a9a'],
    [0.3, -0.3, 0.6, '#ee6f86'],
    [0.5, 0.25, 0.5, '#f28a9a'],
    [0.7, -0.1, 0.4, '#ee6f86'],
  ])
  // the dark one, smaller, further left, swimming the other way
  koi([W * 0.225, H * 0.6, W * 0.2, H * 0.44, W * 0.15, H * 0.34, W * 0.105, H * 0.2], 31 * u, { body: '#2c3554', fin: 'rgba(44,53,84,0.72)', back: 'rgba(120,140,190,0.4)', eye: '#10131f' }, [
    [0.14, 0.1, 0.5, '#ef4d67'],
    [0.4, -0.2, 0.55, '#ef4d67'],
    [0.62, 0.2, 0.4, '#f0707f'],
  ])

  // ---- cherry: branches from the near left corner and the far right one, blossoms along them
  const blossom = (x, y, rad, rot) => {
    for (let k = 0; k < 5; k++) {
      const a = rot + (k / 5) * Math.PI * 2
      g.save()
      g.translate(x + Math.cos(a) * rad * 0.55, y + Math.sin(a) * rad * 0.55)
      g.rotate(a)
      const pg = g.createRadialGradient(-rad * 0.4, 0, 0, 0, 0, rad * 0.75)
      pg.addColorStop(0, '#f3a0bd')
      pg.addColorStop(1, '#fde6ee')
      g.fillStyle = pg
      g.beginPath()
      g.ellipse(0, 0, rad * 0.62, rad * 0.46, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
    g.fillStyle = '#e8648e'
    g.beginPath()
    g.arc(x, y, rad * 0.17, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#ffd98a'
    for (let k = 0; k < 6; k++) {
      const a = rot + k * 1.05
      g.beginPath()
      g.arc(x + Math.cos(a) * rad * 0.3, y + Math.sin(a) * rad * 0.3, rad * 0.045, 0, Math.PI * 2)
      g.fill()
    }
  }
  function branch(x, y, ang, len, wide, depth) {
    const x1 = x + Math.cos(ang) * len
    const y1 = y + Math.sin(ang) * len
    const bend = R(-0.3, 0.3)
    g.strokeStyle = depth > 1 ? '#6b3f5a' : '#8a5673'
    g.lineWidth = wide
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + Math.cos(ang + bend) * len * 0.5, y + Math.sin(ang + bend) * len * 0.5, x1, y1)
    g.stroke()
    if (depth > 0) {
      branch(x1, y1, ang + R(0.25, 0.6), len * R(0.6, 0.8), wide * 0.62, depth - 1)
      branch(x1, y1, ang - R(0.25, 0.6), len * R(0.55, 0.78), wide * 0.62, depth - 1)
    }
    const n = depth > 1 ? 1 : 3
    for (let i = 0; i < n; i++) {
      const t = R(0.35, 1)
      blossoms.push([x + (x1 - x) * t + R(-14, 14) * u, y + (y1 - y) * t + R(-14, 14) * u, R(20, 36) * u * (depth > 1 ? 1.15 : 1), R(0, 6)])
    }
  }
  let blossoms = []
  branch(-10 * u, H + 10 * u, -0.5, 230 * u, 11 * u, 3)
  branch(W * 0.52, H + 24 * u, -1.5, 120 * u, 7 * u, 1)
  branch(W + 10 * u, -10 * u, 2.55, 220 * u, 10 * u, 3)
  branch(W * 0.8, -20 * u, 1.75, 150 * u, 8 * u, 2)
  for (const b of blossoms) blossom(...b)
  // petals fallen on the water
  for (let i = 0; i < 120; i++) {
    const x = R(0, W)
    const y = R(0, H)
    g.save()
    g.translate(x, y)
    g.rotate(R(0, 6))
    g.fillStyle = r() < 0.5 ? 'rgba(253,220,232,0.9)' : 'rgba(246,170,198,0.85)'
    g.beginPath()
    g.ellipse(0, 0, R(5, 11) * u, R(2.5, 5) * u, 0, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  return cv
}

export function createDeskMat({ fwd, right, colors = MAT_COLORS.slate, anisotropy = 4 }) {
  const m = MAT
  const group = new THREE.Group()
  // (x along RIGHT, z down the picture, y up)
  const down = new THREE.Vector3(-fwd[0], 0, -fwd[2])
  group.matrix.makeBasis(new THREE.Vector3(right[0], 0, right[2]), new THREE.Vector3(0, 1, 0), down)
  group.matrixAutoUpdate = false
  group.matrixWorldNeedsUpdate = true

  // ---- textures
  const felt = feltCanvas(512)
  const feltTex = new THREE.CanvasTexture(felt)
  const feltNrm = new THREE.CanvasTexture(normalsFrom(felt, 2.2))
  const threadTex = new THREE.CanvasTexture(threadCanvas())
  for (const t of [feltTex, feltNrm, threadTex]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = anisotropy
  }
  feltTex.colorSpace = threadTex.colorSpace = THREE.SRGBColorSpace

  // ---- the felt: the top, inside the rolled edge
  const inset = m.edge * 0.55
  const shape = new THREE.Shape()
  {
    const p = outline({ ...m, u0: m.u0 + inset, u1: m.u1 - inset, v0: m.v0 + inset, v1: m.v1 - inset, r: m.r - inset }, 10)
    shape.moveTo(p[0].x, p[0].z)
    for (let i = 1; i < p.length; i++) shape.lineTo(p[i].x, p[i].z)
  }
  const topGeo = new THREE.ShapeGeometry(shape)
  // (into the desk's plane, facing up; its uv in tiles of felt)
  topGeo.rotateX(Math.PI / 2)
  {
    const pos = topGeo.attributes.position
    const uv = topGeo.attributes.uv
    const nrm = topGeo.attributes.normal
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / m.tile, pos.getZ(i) / m.tile)
      nrm.setXYZ(i, 0, 1, 0)
    }
    // (rotateX turned it to face down: its triangles' winding turned back up)
    const idx = topGeo.index.array
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1]
      idx[i + 1] = idx[i + 2]
      idx[i + 2] = t
    }
  }
  // (a plain rough surface: felt's soft sheen is a grazing-angle effect, and from above, where the
  // camera always is, it showed as nothing but a full extra lighting term over the whole screen)
  const feltMat = new THREE.MeshStandardMaterial({
    map: feltTex,
    normalMap: feltNrm,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.94,
    metalness: 0,
    envMapIntensity: 0.85,
  })
  // (the print, where the pad has one: laid over the felt by the pad's own extent, the felt's weave
  // still showing through it)
  let printTex = null
  if (colors.print || colors.art) {
    const PH = Math.round((2048 * (m.v1 - m.v0)) / (m.u1 - m.u0))
    printTex = new THREE.CanvasTexture(colors.art === 'koi' ? koiCanvas(2048, PH) : printCanvas(2048, PH, colors))
    printTex.colorSpace = THREE.SRGBColorSpace
    printTex.anisotropy = anisotropy
    const pu = { tPrint: { value: printTex }, uPrint: { value: new THREE.Vector4(m.u0, m.v0, 1 / (m.u1 - m.u0), 1 / (m.v1 - m.v0)) } }
    feltMat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, pu)
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform vec4 uPrint;\nvarying vec2 vPrintUv;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPrintUv = vec2((position.x - uPrint.x) * uPrint.z, 1.0 - (position.z - uPrint.y) * uPrint.w);')
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D tPrint;\nvarying vec2 vPrintUv;')
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          {
            vec4 pr = texture2D(tPrint, vPrintUv);
            float weave = dot(texture2D(map, vMapUv).rgb, vec3(0.3333));
            diffuseColor.rgb = mix(diffuseColor.rgb, pr.rgb * (0.55 + 0.6 * weave), pr.a * 0.94);
          }`,
        )
    }
  }
  feltMat.customProgramCacheKey = () => (colors.print || colors.art ? 'deskMat.print' : 'deskMat.felt')

  // ---- the rolled edge: a profile swept round the outline, from inside the felt's top, over a
  // slight roll, down the side to the desk
  // (profile: [out from the outline (mm, negative is in), height])
  const T = m.t
  const prof = [
    [-m.edge, T - 0.05],
    [-m.edge * 0.75, T + 0.12],
    [-m.edge * 0.45, T + 0.3],
    [-m.edge * 0.2, T + 0.22],
    [-0.05, T - 0.35],
    [0, T * 0.5],
    [-0.1, 0.05],
  ]
  const ring = outline(m, 14)
  const N = ring.length
  const P = prof.length
  const pos = new Float32Array((N + 1) * P * 3)
  const nrm = new Float32Array((N + 1) * P * 3)
  const uv = new Float32Array((N + 1) * P * 2)
  // (the profile's own normals, in (out, up))
  const pn = prof.map((p, i) => {
    const a = prof[Math.max(0, i - 1)]
    const b = prof[Math.min(P - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    return [dy / l, -dx / l]
  })
  let along = 0
  for (let i = 0; i <= N; i++) {
    const q = ring[i % N]
    if (i > 0) {
      const w = ring[(i - 1) % N]
      along += Math.hypot(q.x - w.x, q.z - w.z)
    }
    for (let j = 0; j < P; j++) {
      const o = (i * P + j) * 3
      pos[o] = q.x + q.nx * prof[j][0]
      pos[o + 1] = prof[j][1] - T // (the top at y = 0)
      pos[o + 2] = q.z + q.nz * prof[j][0]
      nrm[o] = q.nx * pn[j][0]
      nrm[o + 1] = pn[j][1]
      nrm[o + 2] = q.nz * pn[j][0]
      const l = Math.hypot(nrm[o], nrm[o + 1], nrm[o + 2]) || 1
      nrm[o] /= l
      nrm[o + 1] /= l
      nrm[o + 2] /= l
      uv[(i * P + j) * 2] = along / 2.4 // (a stitch every 2.4 mm along the edge)
      uv[(i * P + j) * 2 + 1] = j / (P - 1)
    }
  }
  const idx = []
  for (let i = 0; i < N; i++)
    for (let j = 0; j + 1 < P; j++) {
      const a = i * P + j
      const b = (i + 1) * P + j
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  const edgeGeo = new THREE.BufferGeometry()
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  edgeGeo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3))
  edgeGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  edgeGeo.setIndex(idx)
  // (u: stitches along the edge, eight to a tile of the thread's texture)
  threadTex.repeat.set(1 / 8, 1)
  const threadMat = new THREE.MeshPhysicalMaterial({ map: threadTex, roughness: 0.7, sheen: 0.6, sheenRoughness: 0.5, envMapIntensity: 0.9 })
  threadMat.customProgramCacheKey = () => 'deskMat.thread'

  // the felt's top lies at y = 0 too (the edge's roll stands a fraction above it)
  const top = new THREE.Mesh(topGeo, feltMat)
  const edge = new THREE.Mesh(edgeGeo, threadMat)
  for (const o of [top, edge]) {
    o.receiveShadow = true
    o.castShadow = true
    // (drawn after the objects on it: what lies on the mat hides it, and those pixels are not shaded)
    o.renderOrder = 1
  }
  top.name = 'deskMat.felt'
  edge.name = 'deskMat.edge'
  group.add(top, edge)

  function setColors(c) {
    feltMat.color.set(c.felt)
    threadMat.color.set(c.thread)
    threadMat.sheenColor.set(c.sheen)
  }
  setColors(colors)

  return {
    group,
    meshes: [top, edge],
    materials: [feltMat, threadMat],
    setColors,
    /** Is (u, v) on the mat (mm, the view's axes)? */
    contains: (u, v) => u > m.u0 && u < m.u1 && v > m.v0 && v < m.v1,
    dispose() {
      for (const x of [topGeo, edgeGeo, feltMat, threadMat, feltTex, feltNrm, threadTex]) x.dispose()
    },
  }
}
