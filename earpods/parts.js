// three.js objects for the earphone parts: the moulded shells (meshed from the signed distance
// functions in shapes.js), what sits inside their openings (a black chamber behind a woven wire
// mesh), the remote's three separate button caps, the plug's turned metal pin, and the printed
// marks.
import * as THREE from 'three'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import { GRILLE, LETTER, PILL, PLUG, PORT, REMOTE } from './shapes.js'

/** A BufferGeometry from mesher output; ambient occlusion goes into the vertex colours. */
export function meshGeometry(m) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3))
  const n = m.ao.length
  const col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = m.ao[i]
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.setIndex(new THREE.BufferAttribute(m.indices, 1))
  g.computeBoundingSphere()
  g.computeBoundingBox()
  return g
}

/** The same geometry mirrored in x (for the right earbud): positions, normals and winding. */
export function mirrorX(src) {
  const g = src.clone()
  const p = g.attributes.position.array
  const n = g.attributes.normal.array
  for (let i = 0; i < p.length; i += 3) {
    p[i] = -p[i]
    n[i] = -n[i]
  }
  const idx = g.index.array
  for (let i = 0; i < idx.length; i += 3) {
    const t = idx[i + 1]
    idx[i + 1] = idx[i + 2]
    idx[i + 2] = t
  }
  g.computeBoundingSphere()
  g.computeBoundingBox()
  return g
}

// ---------------------------------------------------------------- textures

function canvas(size) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return c
}

/**
 * The speaker mesh: a plain weave of fine dark wire. Each wire is a round strand that rises over
 * one crossing and dips under the next; the colour map is that height field lit from above, and
 * the alpha map leaves the gaps between wires open, so the black chamber behind shows through.
 */
function weaveTextures() {
  const S = 512
  const N = 8 // wires each way per tile
  const p = S / N
  const half = p * 0.29 // the wire's radius, in px
  const A = half * 0.55 // how far a wire rises and dips
  const col = new Uint8ClampedArray(S * S * 4)
  const alp = new Uint8ClampedArray(S * S * 4)
  const L = [-0.42, 0.5, 0.76] // light, in texture space (x right, y up, z out)
  const ll = Math.hypot(...L)
  for (let k = 0; k < 3; k++) L[k] /= ll
  const Hv = [L[0], L[1], L[2] + 1]
  const hl = Math.hypot(...Hv)
  for (let k = 0; k < 3; k++) Hv[k] /= hl
  for (let py = 0; py < S; py++)
    for (let px = 0; px < S; px++) {
      let best = -Infinity
      let nx = 0
      let ny = 0
      let cover = 0
      // horizontal wire j runs along x; it is on top where (i + j) is even
      const j = Math.floor(py / p)
      const dy = py + 0.5 - (j + 0.5) * p
      if (Math.abs(dy) < half + 1) {
        const q = Math.min(1, Math.abs(dy) / half)
        const sec = Math.sqrt(1 - q * q)
        const u = (px + 0.5) / p - 0.5
        const sgn = j % 2 ? -1 : 1
        const h = A * Math.cos(Math.PI * u) * sgn + sec * half
        if (h > best) {
          best = h
          nx = A * (Math.PI / p) * Math.sin(Math.PI * u) * sgn
          ny = sec > 0.05 ? dy / (half * sec) : Math.sign(dy) * 20
          ny = -ny // texture y runs down, the light's runs up
          cover = Math.max(cover, Math.min(1, half + 0.5 - Math.abs(dy)))
        }
      }
      // vertical wire i runs along y; it is on top where (i + j) is odd
      const i = Math.floor(px / p)
      const dx = px + 0.5 - (i + 0.5) * p
      if (Math.abs(dx) < half + 1) {
        const q = Math.min(1, Math.abs(dx) / half)
        const sec = Math.sqrt(1 - q * q)
        const v = (py + 0.5) / p - 0.5
        const sgn = i % 2 ? 1 : -1
        const h = A * Math.cos(Math.PI * v) * sgn + sec * half
        if (h > best) {
          best = h
          nx = sec > 0.05 ? dx / (half * sec) : Math.sign(dx) * 20
          ny = -A * (Math.PI / p) * Math.sin(Math.PI * v) * sgn
          cover = Math.max(cover, Math.min(1, half + 0.5 - Math.abs(dx)))
        }
      }
      const o = (py * S + px) * 4
      if (best === -Infinity || cover <= 0) {
        alp[o + 3] = 255
        col[o + 3] = 255
        continue
      }
      const nl = Math.hypot(nx, ny, 1)
      const N0 = nx / nl
      const N1 = ny / nl
      const N2 = 1 / nl
      const diff = Math.max(0, N0 * L[0] + N1 * L[1] + N2 * L[2])
      const spec = Math.pow(Math.max(0, N0 * Hv[0] + N1 * Hv[1] + N2 * Hv[2]), 30)
      // lower parts of the weave sit in each other's shade
      const ao = 0.45 + 0.55 * Math.min(1, Math.max(0, (best + A) / (half + 2 * A)))
      const base = 0.16
      const c = Math.min(1, (base * (0.3 + 0.9 * diff) + 0.55 * spec) * ao)
      const g = Math.round(Math.pow(c, 1 / 2.2) * 255)
      col[o] = g
      col[o + 1] = Math.min(255, g + 2)
      col[o + 2] = Math.min(255, g + 6)
      col[o + 3] = 255
      alp[o] = alp[o + 1] = alp[o + 2] = Math.round(cover * 255)
      alp[o + 3] = 255
    }
  const tex = (data, srgb) => {
    const cv = canvas(S)
    cv.getContext('2d').putImageData(new ImageData(data, S, S), 0, 0)
    const t = new THREE.CanvasTexture(cv)
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
    // one tile covers 2.4 mm: a wire pitch of 0.3 mm
    t.repeat.set(1 / 0.24, 1 / 0.24)
    return t
  }
  return { map: tex(col, true), alpha: tex(alp, false) }
}

/** A thin print (letters and symbols on the earphones), white on clear, tinted by the material. */
export function printTexture(draw, size = 128) {
  const cv = canvas(size)
  const x = cv.getContext('2d')
  x.strokeStyle = '#ffffff'
  x.fillStyle = '#ffffff'
  x.lineCap = 'butt'
  x.lineJoin = 'miter'
  draw(x, size)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export const plusSign = (x, s) => {
  x.lineWidth = s * 0.07
  x.beginPath()
  x.moveTo(s * 0.22, s * 0.5)
  x.lineTo(s * 0.78, s * 0.5)
  x.moveTo(s * 0.5, s * 0.22)
  x.lineTo(s * 0.5, s * 0.78)
  x.stroke()
}
export const minusSign = (x, s) => {
  x.lineWidth = s * 0.07
  x.beginPath()
  x.moveTo(s * 0.22, s * 0.5)
  x.lineTo(s * 0.78, s * 0.5)
  x.stroke()
}
export const letterL = (x, s) => {
  x.lineWidth = s * 0.075
  x.beginPath()
  x.moveTo(s * 0.4, s * 0.14)
  x.lineTo(s * 0.4, s * 0.86)
  x.lineTo(s * 0.7, s * 0.86)
  x.stroke()
}
export const letterR = (x, s) => {
  x.lineWidth = s * 0.075
  x.beginPath()
  x.moveTo(s * 0.36, s * 0.86)
  x.lineTo(s * 0.36, s * 0.14)
  x.lineTo(s * 0.5, s * 0.14)
  x.arc(s * 0.5, s * 0.32, s * 0.18, -Math.PI / 2, Math.PI / 2)
  x.lineTo(s * 0.36, s * 0.5)
  x.moveTo(s * 0.5, s * 0.5)
  x.lineTo(s * 0.7, s * 0.86)
  x.stroke()
}

// ---------------------------------------------------------------- materials

export function makeMaterials() {
  const weave = weaveTextures()
  return {
    // glossy white polycarbonate: a slightly soft base under a sharp clear coat; the ambient
    // occlusion baked into the vertex colours darkens creases and the insides of the openings
    shell: new THREE.MeshPhysicalMaterial({
      color: '#f6f6f3',
      roughness: 0.36,
      metalness: 0,
      clearcoat: 0.55,
      clearcoatRoughness: 0.085,
      specularIntensity: 0.7,
      vertexColors: true,
    }),
    // the cable's softer, less glossy white
    cable: new THREE.MeshPhysicalMaterial({
      color: '#f4f4f1',
      roughness: 0.46,
      metalness: 0,
      clearcoat: 0.22,
      clearcoatRoughness: 0.3,
      specularIntensity: 0.6,
    }),
    weave: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: weave.map,
      alphaMap: weave.alpha,
      alphaTest: 0.5,
      alphaToCoverage: true,
      metalness: 0.6,
      roughness: 0.42,
      side: THREE.DoubleSide,
    }),
    chamber: new THREE.MeshStandardMaterial({ color: '#030303', roughness: 0.9, side: THREE.DoubleSide }),
    // the plug's pin: polished nickel, and the black insulating bands between its contacts
    metal: new THREE.MeshStandardMaterial({ color: '#dcdcd8', metalness: 1, roughness: 0.17 }),
    insulator: new THREE.MeshStandardMaterial({ color: '#101010', metalness: 0, roughness: 0.32 }),
    print: new THREE.MeshStandardMaterial({
      color: '#9d9d9b',
      transparent: true,
      roughness: 0.45,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    }),
  }
}

// ---------------------------------------------------------------- helpers

function roundRectShape(hu, hv, r) {
  r = Math.min(r, hu, hv)
  const s = new THREE.Shape()
  s.moveTo(-hu + r, -hv)
  s.lineTo(hu - r, -hv)
  s.absarc(hu - r, -hv + r, r, -Math.PI / 2, 0)
  s.lineTo(hu, hv - r)
  s.absarc(hu - r, hv - r, r, 0, Math.PI / 2)
  s.lineTo(-hu + r, hv)
  s.absarc(-hu + r, hv - r, r, Math.PI / 2, Math.PI)
  s.lineTo(-hu, -hv + r)
  s.absarc(-hu + r, -hv + r, r, Math.PI, Math.PI * 1.5)
  return s
}

function ellipseShape(a, b) {
  const s = new THREE.Shape()
  s.absellipse(0, 0, a, b, 0, Math.PI * 2, false, 0)
  return s
}

/** Place a flat mesh in an opening's frame, `depth` below its rim (mirrored in x for the right earbud). */
function inFrame(mesh, o, mirror, depth) {
  const { o: p, u, v, n } = o.f
  const s = mirror ? -1 : 1
  // mirroring flips the frame's handedness; turning u round keeps it a proper rotation
  const U = new THREE.Vector3(u[0] * s, u[1], u[2]).multiplyScalar(s)
  const V = new THREE.Vector3(v[0] * s, v[1], v[2])
  const N = new THREE.Vector3(n[0] * s, n[1], n[2])
  mesh.matrixAutoUpdate = false
  mesh.matrix.makeBasis(U, V, N).setPosition(p[0] * s - N.x * depth, p[1] - N.y * depth, p[2] - N.z * depth)
  return mesh
}

/**
 * What fills an opening: a black chamber at the bottom of the recess, and in front of it the wire
 * mesh. Both are a little larger than the opening, so its walls frame them and their edges never show.
 */
function fillOpening(o, mats, mirror, withMesh) {
  const g = new THREE.Group()
  const grow = 0.03
  const shape = o.ellipse ? ellipseShape(o.hu + grow, o.hv + grow) : roundRectShape(o.hu + grow, o.hv + grow, o.r + grow)
  const chamber = new THREE.Mesh(new THREE.ShapeGeometry(shape, 32), mats.chamber)
  g.add(inFrame(chamber, o, mirror, o.depth - 0.012))
  if (withMesh) {
    const weave = new THREE.Mesh(new THREE.ShapeGeometry(shape, 32), mats.weave)
    g.add(inFrame(weave, o, mirror, o.depth * 0.42))
  }
  return g
}

/** A print (letter or symbol) projected onto a mesh at a point, seen along a normal. */
function decal(target, mats, draw, pos, nrm, size) {
  // the projector's z points out of the surface, so the print reads the right way round
  const look = new THREE.Matrix4().lookAt(pos, pos.clone().sub(nrm), new THREE.Vector3(0, 1, 0))
  target.updateMatrixWorld()
  const geo = new DecalGeometry(target, pos, new THREE.Euler().setFromRotationMatrix(look), new THREE.Vector3(size, size, 0.3))
  const mat = mats.print.clone()
  mat.map = printTexture(draw)
  const m = new THREE.Mesh(geo, mat)
  m.renderOrder = 1
  return m
}

const solid = (geo, mat) => {
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = m.receiveShadow = true
  return m
}

// ---------------------------------------------------------------- earbuds

/** An earbud; `shells` holds the left shell and its mirror image for the right. */
export function makeEarbud(side, mats, shells) {
  const mirror = side === 'right'
  const group = new THREE.Group()
  group.name = `earbud-${side}`
  const shell = solid(mirror ? shells.right : shells.left, mats.shell)
  group.add(shell)
  group.add(fillOpening(GRILLE, mats, mirror, true))
  group.add(fillOpening(PILL, mats, mirror, true))
  group.add(fillOpening(PORT, mats, mirror, true))

  // the printed letter, projected onto the curved shell
  const s = mirror ? -1 : 1
  const pos = new THREE.Vector3(LETTER.p[0] * s, LETTER.p[1], LETTER.p[2])
  const nrm = new THREE.Vector3(LETTER.n[0] * s, LETTER.n[1], LETTER.n[2])
  group.add(decal(shell, mats, mirror ? letterR : letterL, pos, nrm, 0.19))
  return group
}

// ---------------------------------------------------------------- remote, splitter

/** The inline remote: the body with its button bay, three separate caps, the microphone. */
export function makeRemote(mats, geos) {
  const group = new THREE.Group()
  group.name = 'remote'
  group.add(solid(geos.body, mats.shell))
  const caps = {}
  for (const k of ['plus', 'centre', 'minus']) {
    caps[k] = solid(geos[k], mats.shell)
    caps[k].name = `button-${k}`
    group.add(caps[k])
  }
  const front = new THREE.Vector3(0, 0, 1)
  const z = REMOTE.ht + 0.01
  group.add(decal(caps.plus, mats, plusSign, new THREE.Vector3(0, REMOTE.plus, z), front, 0.22))
  group.add(decal(caps.minus, mats, minusSign, new THREE.Vector3(0, -REMOTE.plus, z), front, 0.22))
  // the microphone: a dark floor at the bottom of its hole in the back
  const mic = new THREE.Mesh(new THREE.CircleGeometry(REMOTE.mic.r + 0.012, 24), mats.chamber)
  mic.position.set(0, REMOTE.mic.y, -REMOTE.ht + 0.088)
  mic.rotation.y = Math.PI
  group.add(mic)
  return group
}

export function makeSplitter(mats, geo) {
  const g = new THREE.Group()
  g.name = 'splitter'
  g.add(solid(geo, mats.shell))
  return g
}

// ---------------------------------------------------------------- plug

/**
 * A turned part from a profile of [radius, y, smooth] points, top to bottom. Corners that aren't
 * smooth get two vertices, one for each side, so their edges stay crisp.
 */
function lathe(profile, segments = 64) {
  const segN = (a, b) => {
    const dr = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dr, dy) || 1
    return [-dy / l, dr / l]
  }
  const rows = [] // [r, y, nr, ny]
  for (let i = 0; i < profile.length; i++) {
    const [r, y, smooth] = profile[i]
    const a = i > 0 ? segN(profile[i - 1], profile[i]) : null
    const b = i < profile.length - 1 ? segN(profile[i], profile[i + 1]) : null
    if (a && b && smooth) {
      const l = Math.hypot(a[0] + b[0], a[1] + b[1]) || 1
      rows.push([r, y, (a[0] + b[0]) / l, (a[1] + b[1]) / l])
    } else {
      if (a) rows.push([r, y, ...a])
      if (b) rows.push([r, y, ...b])
    }
  }
  const pos = []
  const nrm = []
  for (const [r, y, nr, ny] of rows)
    for (let j = 0; j <= segments; j++) {
      const t = (j / segments) * Math.PI * 2
      const sn = Math.sin(t)
      const cs = Math.cos(t)
      pos.push(r * sn, y, r * cs)
      nrm.push(nr * sn, ny, nr * cs)
    }
  const idx = []
  const W = segments + 1
  for (let i = 0; i + 1 < rows.length; i++)
    for (let j = 0; j < segments; j++) {
      const a = i * W + j
      const b = a + W
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  g.setIndex(idx)
  g.computeBoundingSphere()
  return g
}

/** The plug: moulded housing, then the 3.5 mm pin (sleeve, ring, ring, tip, with insulating bands). */
export function makePlug(mats, geo) {
  const group = new THREE.Group()
  group.name = 'plug'
  group.add(solid(geo, mats.shell))
  const R = 0.175 // 3.5 mm
  const c = 0.009 // chamfer on the metal edges
  let y = PLUG.pinTop + 0.03 // the pin starts inside the collar
  const add = (profile, mat) => {
    const m = new THREE.Mesh(lathe(profile), mat)
    m.castShadow = true
    group.add(m)
  }
  const metal = (len) => {
    add(
      [
        [0, y],
        [R - c, y],
        [R, y - c],
        [R, y - len + c],
        [R - c, y - len],
        [0, y - len],
      ],
      mats.metal,
    )
    y -= len
  }
  const band = (len) => {
    const r = R - 0.003
    add(
      [
        [0, y],
        [r, y],
        [r, y - len],
        [0, y - len],
      ],
      mats.insulator,
    )
    y -= len
  }
  metal(0.45) // sleeve
  band(0.06)
  metal(0.24) // ring
  band(0.06)
  metal(0.22) // ring
  band(0.06)
  // the tip: a short collar, the detent groove, then the rounded point
  const t = y
  add(
    [
      [0, t],
      [R - c, t],
      [R, t - c],
      [R, t - 0.05],
      [0.128, t - 0.08],
      [0.128, t - 0.11],
      [R, t - 0.14],
      [R, t - 0.185, true],
      [0.158, t - 0.235, true],
      [0.118, t - 0.27, true],
      [0.07, t - 0.294, true],
      [0.03, t - 0.305, true],
      [0, t - 0.308],
    ],
    mats.metal,
  )
  group.userData.tip = t - 0.308
  return group
}
