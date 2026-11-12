// The visitors' book: an A5 spiral notebook (148 x 210 mm, 7 mm thick), a soft-touch charcoal cover
// with its title, a block of cream paper, a black wire spiral down its long left edge. It does not
// move: a tap opens it (visitors/book.js, the page laid over the scene).
// Frame: lying flat, x across it (the spiral at -x), z down it (its top at -z), y up; on y = 0.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export const BOOK = { w: 148, h: 210, t: 7, cover: 0.9 }
const COILS = 23

/** The cover's print: the title, small, and a line under it (sRGB canvas, drawn once). */
function coverTexture(fontFamily) {
  const W = 740
  const H = 1050 // (5 px per mm)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  g.fillStyle = '#2d2f34'
  g.fillRect(0, 0, W, H)
  // (a very fine tooth: soft-touch board is never quite flat)
  const img = g.getImageData(0, 0, W, H)
  let s = 7
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 16807) % 2147483647
    const n = ((s / 2147483647) - 0.5) * 7
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  g.putImageData(img, 0, 0)
  g.fillStyle = '#e9e6df'
  g.font = `500 54px ${fontFamily}`
  g.textBaseline = 'alphabetic'
  // (the title at the top, right of the spiral's margin)
  g.fillText('visitors', 150, 190)
  g.fillStyle = 'rgba(233, 230, 223, 0.55)'
  g.font = `400 24px ${fontFamily}`
  g.fillText('leave your print — no. 01', 152, 236)
  g.fillRect(152, 262, 120, 2)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** The paper block's edge: fine page lines along it. */
function edgeTexture() {
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 64
  const g = c.getContext('2d')
  g.fillStyle = '#f2efe6'
  g.fillRect(0, 0, 8, 64)
  for (let y = 0; y < 64; y += 2) {
    g.fillStyle = `rgba(120, 110, 90, ${0.08 + 0.06 * ((y * 7) % 3)})`
    g.fillRect(0, y, 8, 1)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export function createNotebook({ at, y = 0, turn, fontFamily = 'Inter, Helvetica, Arial, sans-serif', anisotropy = 8 }) {
  const group = new THREE.Group()
  const geometries = []
  const materials = []
  const textures = []
  const { w, h, t, cover } = BOOK
  const left = -w / 2

  // the paper block, a hair inside the covers
  const edgeTex = edgeTexture()
  edgeTex.repeat.set(1, 1)
  textures.push(edgeTex)
  const paperGeo = new RoundedBoxGeometry(w - 7, t - 2 * cover, h - 4, 2, 0.8)
  const paperMat = new THREE.MeshPhysicalMaterial({ color: 0xf3f0e7, map: edgeTex, roughness: 0.92 })
  const paper = new THREE.Mesh(paperGeo, paperMat)
  paper.position.set(2.5, t / 2, 0)
  // the covers: the front printed, the back plain
  const coverTex = coverTexture(fontFamily)
  coverTex.anisotropy = anisotropy
  textures.push(coverTex)
  const coverGeo = new RoundedBoxGeometry(w, cover, h, 2, 0.4)
  // (the box's top face samples the print: its uv already spans it, x across and z down)
  const frontMat = new THREE.MeshPhysicalMaterial({ map: coverTex, roughness: 0.82, sheen: 0.25, sheenRoughness: 0.7, sheenColor: 0x8a8f99 })
  const backMat = new THREE.MeshPhysicalMaterial({ color: 0x2d2f34, roughness: 0.85 })
  const front = new THREE.Mesh(coverGeo, frontMat)
  front.position.set(0, t - cover / 2, 0)
  const back = new THREE.Mesh(coverGeo, backMat)
  back.position.set(0, cover / 2, 0)
  geometries.push(paperGeo, coverGeo)
  materials.push(paperMat, frontMat, backMat)

  // the spiral: one coil per pair of holes, a wire loop round the spine
  const wire = new THREE.MeshPhysicalMaterial({ color: 0x1b1c1f, metalness: 0.85, roughness: 0.35 })
  const coilGeo = new THREE.TorusGeometry(t / 2 + 1.6, 0.75, 8, 28, Math.PI * 1.55)
  // (the open part of the loop inside the pages: turned so the arc wraps round the left edge)
  coilGeo.rotateZ(Math.PI * 0.225 + Math.PI / 2)
  geometries.push(coilGeo)
  materials.push(wire)
  const coils = new THREE.InstancedMesh(coilGeo, wire, COILS)
  const m4 = new THREE.Matrix4()
  const span = h - 22
  for (let i = 0; i < COILS; i++) {
    const z = -span / 2 + (i * span) / (COILS - 1)
    m4.makeRotationY(0.06)
    m4.setPosition(left + 4.5, t / 2, z)
    coils.setMatrixAt(i, m4)
  }
  coils.instanceMatrix.needsUpdate = true
  // (the holes the wire runs through: small dark dots on the cover, under the coils)
  const holeGeo = new THREE.CircleGeometry(1.25, 12).rotateX(-Math.PI / 2)
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x141518 })
  geometries.push(holeGeo)
  materials.push(holeMat)
  const holes = new THREE.InstancedMesh(holeGeo, holeMat, COILS)
  for (let i = 0; i < COILS; i++) {
    const z = -span / 2 + (i * span) / (COILS - 1)
    m4.makeTranslation(left + 6.2, t + 0.02, z)
    holes.setMatrixAt(i, m4)
  }
  holes.instanceMatrix.needsUpdate = true

  group.add(back, paper, front, holes, coils)
  const meshes = [front, back, paper]
  for (const m of [back, paper, front, coils]) m.castShadow = true
  group.position.set(at[0], y, at[2])
  group.rotation.y = turn
  group.updateMatrix()
  group.updateMatrixWorld(true)

  return {
    group,
    meshes,
    /** The cover's centre (world), for the camera. */
    center: (out) => out.set(0, t, 0).applyMatrix4(group.matrixWorld),
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
      for (const x of textures) x.dispose()
      coils.dispose()
      holes.dispose()
    },
  }
}
