// The room round the still life: a matte white desk, the off-white wall it stands against, and on
// the wall a cork board in a thin white frame: three handwritten sticky notes, a calendar page of
// the visitor's own month (today ringed in red marker) and a pin for the ID badge to hang from.
// Frame: the view's own axes (layout.js): x across the picture (u), z down it (v, towards the
// viewer), y up; the desk's top at y = ROOM.deskY (the felt mat's top, where everything rests, is
// y = 0: the mat is that much thick).
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export const ROOM = {
  deskY: -3,
  wallV: -470, // (the wall's face)
  deskFront: 460,
  deskHalf: 1700, // (the desk's half width: its ends never in the picture)
  deskThick: 28,
  // the cork board: its middle across the picture, its lower edge's height, its size (mm)
  board: { u: 100, y0: 255, w: 640, h: 430, depth: 18, frame: 13, off: 3 },
}

/** A seeded random: the same room every time. */
function rng(seed) {
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
/** Tiling: a stroke drawn at the eight neighbouring tiles too. */
const wrapped = (S, draw) => {
  for (let dx = -S; dx <= S; dx += S) for (let dy = -S; dy <= S; dy += S) draw(dx, dy)
}

/** Cork: pressed granules, warm tan with darker and lighter crumbs (sRGB), tiling. */
function corkCanvas() {
  const S = 1024
  const c = canvas(S, S)
  const g = c.getContext('2d')
  g.fillStyle = '#c29a6c'
  g.fillRect(0, 0, S, S)
  const r = rng(23)
  const tones = ['#9c7447', '#ae8456', '#cda679', '#dbb98f', '#8a6440', '#c49b6d']
  for (let i = 0; i < 26000; i++) {
    const x = r() * S
    const y = r() * S
    const rad = 0.8 + 3.2 * r() * r()
    const col = tones[(r() * tones.length) | 0]
    const a = 0.35 + 0.5 * r()
    const sx = 0.6 + 0.8 * r()
    const rot = r() * Math.PI
    wrapped(S, (dx, dy) => {
      g.save()
      g.translate(x + dx, y + dy)
      g.rotate(rot)
      g.scale(sx, 1)
      g.globalAlpha = a
      g.fillStyle = col
      g.beginPath()
      g.arc(0, 0, rad, 0, Math.PI * 2)
      g.fill()
      g.restore()
    })
  }
  g.globalAlpha = 1
  return c
}

/** A normal map from a canvas's brightness (its relief), tiling. */
function normalsFrom(src, strength) {
  const S = src.width
  const T = src.height
  const d = src.getContext('2d').getImageData(0, 0, S, T).data
  const out = canvas(S, T)
  const og = out.getContext('2d')
  const img = og.createImageData(S, T)
  const h = (x, y) => {
    const o = (((y + T) % T) * S + ((x + S) % S)) * 4
    return (d[o] + d[o + 1] + d[o + 2]) / 765
  }
  for (let y = 0; y < T; y++)
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

/** Handwriting, a line at a time, each line a little uneven (font: a loaded handwriting face). */
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

/** A sticky note's face (sRGB): its colour, the adhesive band's faint sheen, the handwriting. */
function noteCanvas(color, lines, font, seed) {
  const S = 512
  const c = canvas(S, S)
  const g = c.getContext('2d')
  g.fillStyle = color
  g.fillRect(0, 0, S, S)
  // (paper: the faintest fibres, and the glued band at the top a touch glossier and darker)
  const r = rng(seed)
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.02 + 0.02 * r()})`
    g.fillRect(r() * S, r() * S, 1 + 2 * r(), 1 + 2 * r())
  }
  const band = g.createLinearGradient(0, 0, 0, 96)
  band.addColorStop(0, 'rgba(0,0,0,0.05)')
  band.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = band
  g.fillRect(0, 0, S, 96)
  writeLines(g, lines, 46, 132, 74, 84, font, '#2a2e38', r)
  return c
}

/** The calendar page (sRGB): this month, its days, today ringed by hand in red. */
function calendarCanvas(now, font, handFont) {
  const W = 600
  const H = 840
  const c = canvas(W, H)
  const g = c.getContext('2d')
  g.fillStyle = '#f7f5f0'
  g.fillRect(0, 0, W, H)
  const r = rng(77)
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(0,0,0,${0.012 + 0.015 * r()})`
    g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2)
  }
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const y = now.getFullYear()
  const m = now.getMonth()
  // (the binding's punched holes at the top)
  g.fillStyle = 'rgba(40,40,40,0.18)'
  for (let k = 0; k < 9; k++) {
    g.beginPath()
    g.arc(84 + k * 54, 26, 7, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = '#20232a'
  g.font = `600 64px ${font}`
  g.textBaseline = 'alphabetic'
  g.fillText(months[m], 52, 132)
  g.fillStyle = '#8a8f98'
  g.font = `500 34px ${font}`
  g.fillText(String(y), 52, 178)
  g.fillStyle = '#c64a32'
  g.fillRect(52, 204, 64, 4)
  // the grid: Monday first
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const x0 = 52
  const cw = (W - 104) / 7
  const y0 = 270
  const ch = 72
  g.font = `600 22px ${font}`
  for (let k = 0; k < 7; k++) {
    g.fillStyle = k >= 5 ? '#c64a32' : '#8a8f98'
    g.fillText(days[k], x0 + k * cw + 8, y0)
  }
  g.fillStyle = 'rgba(32,35,42,0.12)'
  g.fillRect(x0, y0 + 16, W - 104, 2)
  const first = (new Date(y, m, 1).getDay() + 6) % 7
  const n = new Date(y, m + 1, 0).getDate()
  g.font = `500 30px ${font}`
  for (let d = 1; d <= n; d++) {
    const k = first + d - 1
    const col = k % 7
    const row = Math.floor(k / 7)
    const cx = x0 + col * cw + 8
    const cy = y0 + 64 + row * ch
    g.fillStyle = col >= 5 ? '#c64a32' : '#2b2f37'
    g.fillText(String(d), cx, cy)
    if (d === now.getDate()) {
      // (ringed by hand: an uneven loop of red marker, twice round and not quite closed)
      g.save()
      g.strokeStyle = 'rgba(205,48,36,0.9)'
      g.lineWidth = 5
      g.lineCap = 'round'
      g.beginPath()
      const ox = cx + (d > 9 ? 17 : 9)
      const oy = cy - 11
      for (let t = 0; t <= 1.08; t += 0.02) {
        const a = -2.2 + t * Math.PI * 2
        const rr = 1 + 0.08 * Math.sin(t * 9)
        const px = ox + Math.cos(a) * 34 * rr
        const py = oy + Math.sin(a) * 27 * rr
        if (t === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      g.stroke()
      g.restore()
    }
  }
  // (a note in the margin)
  g.save()
  g.translate(60, H - 58)
  g.rotate(-0.03)
  g.fillStyle = '#3a3f4b'
  g.font = `600 40px ${handFont}`
  g.fillText('ship something small, every day', 0, 0)
  g.restore()
  return c
}

/** A flat sheet (w x h mm) whose lower edge curls away from the board by `curl` mm; the pinned
 * or stuck edge at its top. Faces +z. */
function curledSheet(w, h, curl, segs = 10) {
  const g = new THREE.PlaneGeometry(w, h, 2, segs)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const t = (h / 2 - p.getY(i)) / h // (0 at the top, 1 at the bottom)
    const k = Math.max(0, (t - 0.45) / 0.55)
    p.setZ(i, curl * k * k)
  }
  g.computeVertexNormals()
  return g
}

/**
 * The room. fwd, right: the view's axes (layout.js); font, handFont: CSS font families (loaded);
 * notes: [{ color, lines }]. Returns { group, desk, wall, boardMeshes, pins: { badge: Vector3
 * (world) }, deskMaterials, dispose() }.
 */
export function createRoom({ fwd, right, font, handFont, notes, now = new Date(), anisotropy = 4 }) {
  const R = ROOM
  const group = new THREE.Group()
  const down = new THREE.Vector3(-fwd[0], 0, -fwd[2])
  group.matrix.makeBasis(new THREE.Vector3(right[0], 0, right[2]), new THREE.Vector3(0, 1, 0), down)
  group.matrixAutoUpdate = false
  group.updateMatrixWorld(true)
  const geometries = []
  const materials = []
  const textures = []
  const tex = (c, srgb, repeat) => {
    const t = new THREE.CanvasTexture(c)
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = anisotropy
    textures.push(t)
    return t
  }

  // ---- the desk: a white slab against the wall, its top at deskY
  const deskGeo = new THREE.BoxGeometry(2 * R.deskHalf, R.deskThick, R.deskFront - R.wallV)
  deskGeo.translate(0, R.deskY - R.deskThick / 2, (R.deskFront + R.wallV) / 2)
  {
    // (the top's uv in tiles of 260 mm)
    const p = deskGeo.attributes.position
    const uv = deskGeo.attributes.uv
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 260, p.getZ(i) / 260)
  }
  geometries.push(deskGeo)
  // (plain: a grain this fine is not seen at a desk's distance, and the desk fills half the picture)
  const deskMat = new THREE.MeshStandardMaterial({ color: 0xf2f0ec, roughness: 0.62, metalness: 0 })
  deskMat.customProgramCacheKey = () => 'room.desk'
  materials.push(deskMat)
  const desk = new THREE.Mesh(deskGeo, deskMat)
  desk.name = 'room.desk'
  desk.receiveShadow = true

  // ---- the wall: painted, off-white, a faint roller texture
  const wallGeo = new THREE.PlaneGeometry(2 * R.deskHalf + 600, 2600)
  wallGeo.translate(0, 1300 + R.deskY - 2, R.wallV)
  {
    const p = wallGeo.attributes.position
    const uv = wallGeo.attributes.uv
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 330, p.getY(i) / 330)
  }
  geometries.push(wallGeo)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1ebe0, roughness: 0.93, metalness: 0 })
  wallMat.customProgramCacheKey = () => 'room.wall'
  materials.push(wallMat)
  const wall = new THREE.Mesh(wallGeo, wallMat)
  wall.name = 'room.wall'
  wall.receiveShadow = true

  // ---- the board: cork in a white frame, a few millimetres off the wall
  const B = R.board
  const bx0 = B.u - B.w / 2
  const by0 = B.y0
  const zBack = R.wallV + B.off
  const zCork = zBack + B.depth - 3 // (the cork's face, a little inside the frame's front)
  const cork = corkCanvas()
  const corkTex = tex(cork, true, true)
  const corkNrm = tex(normalsFrom(cork, 3.2), false, true)
  const corkGeo = new THREE.PlaneGeometry(B.w - 2 * B.frame, B.h - 2 * B.frame)
  {
    const uv = corkGeo.attributes.uv
    const p = corkGeo.attributes.position
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 150, p.getY(i) / 150)
  }
  corkGeo.translate(B.u, by0 + B.h / 2, zCork)
  geometries.push(corkGeo)
  const corkMat = new THREE.MeshStandardMaterial({ map: corkTex, normalMap: corkNrm, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.92 })
  materials.push(corkMat)
  const corkMesh = new THREE.Mesh(corkGeo, corkMat)
  corkMesh.name = 'room.cork'
  corkMesh.receiveShadow = true
  // (the board's body behind the cork, so its sides are solid)
  const backGeo = new THREE.BoxGeometry(B.w - 4, B.h - 4, B.depth - 4)
  backGeo.translate(B.u, by0 + B.h / 2, zBack + (B.depth - 4) / 2)
  geometries.push(backGeo)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xf3f3f1, roughness: 0.42, metalness: 0.05 })
  materials.push(frameMat)
  const backMesh = new THREE.Mesh(backGeo, frameMat)
  const frameParts = []
  {
    const f = B.frame
    const bar = (w, h, x, y) => {
      const g = new RoundedBoxGeometry(w, h, B.depth, 2, 1.6)
      g.translate(x, y, zBack + B.depth / 2)
      geometries.push(g)
      const m = new THREE.Mesh(g, frameMat)
      m.castShadow = true
      frameParts.push(m)
    }
    bar(B.w, f, B.u, by0 + f / 2)
    bar(B.w, f, B.u, by0 + B.h - f / 2)
    bar(f, B.h - 2 * f + 0.4, bx0 + f / 2, by0 + B.h / 2)
    bar(f, B.h - 2 * f + 0.4, bx0 + B.w - f / 2, by0 + B.h / 2)
  }
  backMesh.castShadow = true

  // ---- what is on the board (positions on it: x from its left, y from its bottom, mm)
  const onBoard = (x, y, z = 0) => new THREE.Vector3(bx0 + x, by0 + y, zCork + z)
  const paperMat = (map) => {
    const m = new THREE.MeshStandardMaterial({ map, roughness: 0.86, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 })
    materials.push(m)
    return m
  }
  const items = []
  const pinAt = [] // (each pin: where, its colour)
  const r = rng(3)
  // the sticky notes: stuck, their lower edges curling off the cork a little
  const NOTE = 76
  const notePlaces = [
    [92, 318, -0.07],
    [196, 300, 0.05],
    [118, 180, -0.035],
  ]
  notes.forEach((n, i) => {
    const [x, y, rot] = notePlaces[i % notePlaces.length]
    const g = curledSheet(NOTE, NOTE, 4.5 + 2 * r())
    geometries.push(g)
    const m = new THREE.Mesh(g, paperMat(tex(noteCanvas(n.color, n.lines, handFont, 11 + i), true, false)))
    m.position.copy(onBoard(x, y, 0.6 + i * 0.05))
    m.rotation.z = rot
    m.name = 'room.note'
    m.castShadow = true
    items.push(m)
  })
  // the calendar page, pinned at its top
  {
    const g = curledSheet(150, 210, 7, 14)
    geometries.push(g)
    const m = new THREE.Mesh(g, paperMat(tex(calendarCanvas(now, font, handFont), true, false)))
    m.position.copy(onBoard(522, 228, 0.8))
    m.rotation.z = 0.025
    m.name = 'room.calendar'
    m.castShadow = true
    items.push(m)
    pinAt.push([onBoard(522 - 105 * Math.sin(0.025), 228 + 96, 0.8), 0xc8442f])
  }
  // the badge's pin (the badge itself is objects/badge.js, hung from it by the scene)
  const badgePin = onBoard(368, 372, 0)
  pinAt.push([badgePin.clone(), 0x22252b])

  // the pins: a short barrel and a domed head, standing out of the cork
  const pinGeo = (() => {
    const pts = [
      [0, 0],
      [3.4, 0],
      [3.6, 0.6],
      [3.0, 1.4],
      [2.6, 7.5],
      [3.6, 8.2],
      [3.9, 9.2],
      [3.4, 10.6],
      [2.0, 11.3],
      [0, 11.5],
    ].map(([a, b]) => new THREE.Vector2(a, b))
    const g = new THREE.LatheGeometry(pts, 20)
    g.rotateX(Math.PI / 2) // (out of the board: along +z)
    return g
  })()
  geometries.push(pinGeo)
  const pinMat = new THREE.MeshPhysicalMaterial({ roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 })
  materials.push(pinMat)
  const pins = new THREE.InstancedMesh(pinGeo, pinMat, pinAt.length)
  {
    const m4 = new THREE.Matrix4()
    const col = new THREE.Color()
    pinAt.forEach(([p, c], i) => {
      m4.makeTranslation(p.x, p.y, p.z)
      pins.setMatrixAt(i, m4)
      pins.setColorAt(i, col.set(c))
    })
    pins.instanceMatrix.needsUpdate = true
    pins.instanceColor.needsUpdate = true
  }
  pins.castShadow = true
  pins.name = 'room.pins'

  group.add(desk, wall, backMesh, corkMesh, ...frameParts, ...items, pins)
  group.updateMatrixWorld(true)

  const boardMeshes = [corkMesh, backMesh, ...frameParts, ...items, pins]
  return {
    group,
    desk,
    wall,
    boardMeshes,
    /** The badge's pin (world), and which way is out of the board (world). */
    badgePin: badgePin.applyMatrix4(group.matrixWorld),
    boardOut: new THREE.Vector3(0, 0, 1).transformDirection(group.matrixWorld),
    /** The board's middle on its face (world), and its size (mm). */
    boardCenter: onBoard(B.w / 2, B.h / 2, 0).applyMatrix4(group.matrixWorld),
    boardSize: [B.w, B.h],
    /** The lit surfaces (for the ember's and the flame's light). */
    litMaterials: [deskMat, wallMat, corkMat, frameMat, pinMat, ...items.map((m) => m.material)],
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
      for (const t of textures) t.dispose()
      pins.dispose()
    },
  }
}
