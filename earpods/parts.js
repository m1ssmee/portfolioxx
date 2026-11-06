// three.js objects for the earphone parts: meshes from the signed distance functions, the
// speaker meshes in the openings, and the printed letters.
import * as THREE from 'three'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import { GRILLE, LETTER, PILL, PLUG, REMOTE } from './shapes.js'

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

/** The fine woven speaker mesh: dark wire with light catching the crossings. */
export function meshTexture() {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const x = c.getContext('2d')
  x.fillStyle = '#16171a'
  x.fillRect(0, 0, S, S)
  // a twill: short diagonal strands, alternating over and under
  const n = 16
  const p = S / n
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const cx = (i + 0.5) * p
      const cy = (j + 0.5) * p
      x.save()
      x.translate(cx, cy)
      x.rotate((((i + j) % 2 ? 1 : -1) * Math.PI) / 4)
      const g = x.createLinearGradient(0, -p * 0.3, 0, p * 0.3)
      g.addColorStop(0, '#3b3e43')
      g.addColorStop(0.5, '#8d9197')
      g.addColorStop(1, '#33363a')
      x.fillStyle = g
      x.beginPath()
      x.roundRect(-p * 0.46, -p * 0.2, p * 0.92, p * 0.4, p * 0.2)
      x.fill()
      x.restore()
    }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}

/** A thin grey print, like the letters and symbols on the earphones. */
export function printTexture(draw, size = 128) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const x = c.getContext('2d')
  x.strokeStyle = '#ffffff'
  x.fillStyle = '#ffffff'
  x.lineCap = 'square'
  draw(x, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export const plusSign = (x, s) => {
  x.lineWidth = s * 0.05
  x.beginPath()
  x.moveTo(s * 0.2, s * 0.5)
  x.lineTo(s * 0.8, s * 0.5)
  x.moveTo(s * 0.5, s * 0.2)
  x.lineTo(s * 0.5, s * 0.8)
  x.stroke()
}
export const minusSign = (x, s) => {
  x.lineWidth = s * 0.05
  x.beginPath()
  x.moveTo(s * 0.2, s * 0.5)
  x.lineTo(s * 0.8, s * 0.5)
  x.stroke()
}

export const letterL = (x, s) => {
  x.lineWidth = s * 0.06
  x.beginPath()
  x.moveTo(s * 0.4, s * 0.12)
  x.lineTo(s * 0.4, s * 0.88)
  x.lineTo(s * 0.68, s * 0.88)
  x.stroke()
}
export const letterR = (x, s) => {
  x.lineWidth = s * 0.06
  x.beginPath()
  x.moveTo(s * 0.36, s * 0.88)
  x.lineTo(s * 0.36, s * 0.12)
  x.lineTo(s * 0.5, s * 0.12)
  x.arc(s * 0.5, s * 0.3, s * 0.18, -Math.PI / 2, Math.PI / 2)
  x.lineTo(s * 0.36, s * 0.48)
  x.moveTo(s * 0.5, s * 0.48)
  x.lineTo(s * 0.68, s * 0.88)
  x.stroke()
}

// ---------------------------------------------------------------- materials

export function makeMaterials() {
  const grille = meshTexture()
  grille.repeat.set(3.6, 3.6) // the tile covers 2.8 mm
  return {
    shell: new THREE.MeshPhysicalMaterial({
      color: '#f5f5f2',
      roughness: 0.3,
      metalness: 0,
      clearcoat: 0.75,
      clearcoatRoughness: 0.12,
      vertexColors: true,
    }),
    grille: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: grille,
      bumpMap: grille,
      bumpScale: 1.5,
      roughness: 0.48,
      metalness: 0.35,
      side: THREE.DoubleSide, // the right earbud's inserts are mirrored, which flips their winding
    }),
    // a separate, slightly less glossy white for the cable
    cable: new THREE.MeshPhysicalMaterial({
      color: '#f3f3f0',
      roughness: 0.38,
      metalness: 0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25,
    }),
    // the plug's pin: polished nickel, with black insulating rings
    metal: new THREE.MeshStandardMaterial({ color: '#e7e7e4', metalness: 1, roughness: 0.16 }),
    insulator: new THREE.MeshStandardMaterial({ color: '#141414', metalness: 0, roughness: 0.35 }),
    print: new THREE.MeshStandardMaterial({
      color: '#a2a2a0',
      transparent: true,
      roughness: 0.4,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    }),
  }
}

// ---------------------------------------------------------------- earbuds

function roundRectShape(hu, hv, r) {
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

/**
 * The speaker mesh in an opening: a flat sheet halfway down, a little larger than the opening, so
 * the opening's own walls frame it and its edge never shows.
 */
function insert(o, mat, mirror) {
  const grow = 0.025
  const geo = new THREE.ShapeGeometry(roundRectShape(o.hu + grow, o.hv + grow, o.r + grow), 24)
  const m = new THREE.Mesh(geo, mat)
  const { o: p, u, v, n } = o.f
  const s = mirror ? -1 : 1
  const basis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(u[0] * s, u[1], u[2]),
    new THREE.Vector3(v[0] * s, v[1], v[2]),
    new THREE.Vector3(n[0] * s, n[1], n[2]),
  )
  m.matrixAutoUpdate = false
  const depth = o.depth * 0.5
  m.matrix
    .copy(basis)
    .setPosition(new THREE.Vector3((p[0] - n[0] * depth) * s, p[1] - n[1] * depth, p[2] - n[2] * depth))
  return m
}

/** An earbud; `geos` holds the left shell and its mirror image for the right. */
export function makeEarbud(side, mats, geos) {
  const mirror = side === 'right'
  const group = new THREE.Group()
  group.name = `earbud-${side}`
  const shell = new THREE.Mesh(mirror ? geos.right : geos.left, mats.shell)
  shell.castShadow = shell.receiveShadow = true
  group.add(shell)
  group.add(insert(GRILLE, mats.grille, mirror))
  group.add(insert(PILL, mats.grille, mirror))

  // the printed letter, projected onto the curved shell
  const s = mirror ? -1 : 1
  const pos = new THREE.Vector3(LETTER.p[0] * s, LETTER.p[1], LETTER.p[2])
  const nrm = new THREE.Vector3(LETTER.n[0] * s, LETTER.n[1], LETTER.n[2])
  // the projector's z points out of the surface, so the letter reads the right way round
  const look = new THREE.Matrix4().lookAt(pos, pos.clone().sub(nrm), new THREE.Vector3(0, 1, 0))
  const orient = new THREE.Euler().setFromRotationMatrix(look)
  shell.updateMatrixWorld()
  const decal = new DecalGeometry(shell, pos, orient, new THREE.Vector3(0.2, 0.2, 0.3))
  const print = mats.print.clone()
  print.map = printTexture(mirror ? letterR : letterL)
  const letter = new THREE.Mesh(decal, print)
  letter.renderOrder = 1
  group.add(letter)
  return group
}

// ---------------------------------------------------------------- remote, splitter, plug

/** A print (letter or symbol) projected onto a mesh at a point, facing along a normal. */
function decal(target, mats, draw, pos, nrm, size) {
  const look = new THREE.Matrix4().lookAt(pos, pos.clone().sub(nrm), new THREE.Vector3(0, 1, 0))
  target.updateMatrixWorld()
  const geo = new DecalGeometry(target, pos, new THREE.Euler().setFromRotationMatrix(look), new THREE.Vector3(size, size, 0.3))
  const mat = mats.print.clone()
  mat.map = printTexture(draw)
  const m = new THREE.Mesh(geo, mat)
  m.renderOrder = 1
  return m
}

export function makeRemote(mats, geo) {
  const group = new THREE.Group()
  group.name = 'remote'
  const body = new THREE.Mesh(geo, mats.shell)
  body.castShadow = body.receiveShadow = true
  group.add(body)
  const z = REMOTE.ht + 0.001
  const front = new THREE.Vector3(0, 0, 1)
  group.add(decal(body, mats, plusSign, new THREE.Vector3(0, REMOTE.plus, z), front, 0.26))
  group.add(decal(body, mats, minusSign, new THREE.Vector3(0, -REMOTE.plus, z), front, 0.26))
  return group
}

export function makeSplitter(mats, geo) {
  const m = new THREE.Mesh(geo, mats.shell)
  m.name = 'splitter'
  m.castShadow = m.receiveShadow = true
  return m
}

/** The 3.5 mm TRRS pin: sleeve, ring, ring, tip, with three black insulators between them. */
function pinGeometry(profile) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y))
  return new THREE.LatheGeometry(pts, 48)
}

export function makePlug(mats, geo) {
  const group = new THREE.Group()
  group.name = 'plug'
  const housing = new THREE.Mesh(geo, mats.shell)
  housing.castShadow = housing.receiveShadow = true
  group.add(housing)
  const top = PLUG.housingBottom - 0.06 // the pin starts inside the collar
  const r = 0.175
  // metal sections and black rings, top to bottom (lengths in cm)
  const sections = [
    ['metal', 0.45],
    ['ring', 0.06],
    ['metal', 0.25],
    ['ring', 0.06],
    ['metal', 0.22],
    ['ring', 0.06],
  ]
  let y = top
  for (const [kind, len] of sections) {
    const rr = kind === 'ring' ? r - 0.004 : r
    const geo = pinGeometry([
      [0, y],
      [rr, y],
      [rr, y - len],
      [0, y - len],
    ])
    const m = new THREE.Mesh(geo, kind === 'ring' ? mats.insulator : mats.metal)
    m.castShadow = true
    group.add(m)
    y -= len
  }
  // the tip: a short neck, then a rounded point
  const tip = pinGeometry([
    [0, y],
    [r, y],
    [r - 0.002, y - 0.02],
    [0.125, y - 0.04],
    [0.125, y - 0.07],
    [r, y - 0.1],
    [r, y - 0.13],
    [0.15, y - 0.2],
    [0.09, y - 0.26],
    [0.03, y - 0.285],
    [0, y - 0.29],
  ])
  const tipMesh = new THREE.Mesh(tip, mats.metal)
  tipMesh.castShadow = true
  group.add(tipMesh)
  group.userData.length = top - (y - 0.29)
  return group
}
