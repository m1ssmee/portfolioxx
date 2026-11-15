// Three framed pictures on the wall (objects/portraitArt.js draws them: no image files): each a
// slim black frame, a card mount, the picture on its own canvas. They are alive: two of them
// blink, and one, every so often, picks out its eye and eats it. A picture is painted again only
// when its state changes (update() says when), so nothing is drawn while nothing moves.
// The frame: x across the picture (u), y up, z out of the wall (the view's own axes, layout.js).
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { PORTRAIT_KINDS } from './portraitArt.js'

// (where each hangs: its middle across the picture and above the desk, its picture's size; mm)
export const PORTRAITS = [
  { kind: 'void', u: -645, y: 500, w: 150, h: 205 },
  { kind: 'ink', u: 512, y: 532, w: 118, h: 160 },
  { kind: 'coal', u: 512, y: 322, w: 118, h: 160 },
]
const MOUNT = 9 // (the card round the picture)
const BAR = 8 // (the frame's face)
const DEEP = 15 // (how far it stands off the wall)
const PX = 4 // (the picture's canvas: pixels a millimetre)

/**
 * fwd, right: the view's axes (layout.js); wallV: the wall's face (in v, mm); anisotropy.
 * Returns { group, items: [{ kind, meshes, center (world), normal (world), size: [w, h] (mm, the
 *   whole frame) }], materials, update(t) -> anything repainted, play(kind, t), dispose() }.
 */
export function createPortraits({ fwd, right, wallV, anisotropy = 4 }) {
  const group = new THREE.Group()
  group.name = 'portraits'
  const down = new THREE.Vector3(-fwd[0], 0, -fwd[2])
  group.matrix.makeBasis(new THREE.Vector3(right[0], 0, right[2]), new THREE.Vector3(0, 1, 0), down)
  group.matrixAutoUpdate = false
  group.updateMatrixWorld(true)
  const wood = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.45 })
  const card = new THREE.MeshStandardMaterial({ color: 0xe9e4d9, roughness: 0.95 })
  wood.customProgramCacheKey = () => 'portraits.wood'
  card.customProgramCacheKey = () => 'portraits.card'
  const geometries = []
  const textures = []
  const materials = [wood, card]
  const items = []
  const live = []
  for (const P of PORTRAITS) {
    const W = P.w + 2 * (MOUNT + BAR)
    const H = P.h + 2 * (MOUNT + BAR)
    const frame = new THREE.Group()
    frame.position.set(P.u, P.y, wallV)
    // the frame: four bars; the card inside it; the picture set a hair into the card
    const bars = mergeGeometries([
      new THREE.BoxGeometry(W, BAR, DEEP).translate(0, H / 2 - BAR / 2, DEEP / 2),
      new THREE.BoxGeometry(W, BAR, DEEP).translate(0, -H / 2 + BAR / 2, DEEP / 2),
      new THREE.BoxGeometry(BAR, H - 2 * BAR, DEEP).translate(-W / 2 + BAR / 2, 0, DEEP / 2),
      new THREE.BoxGeometry(BAR, H - 2 * BAR, DEEP).translate(W / 2 - BAR / 2, 0, DEEP / 2),
    ])
    const cardGeo = new THREE.PlaneGeometry(W - 2 * BAR + 1, H - 2 * BAR + 1).translate(0, 0, DEEP - 5)
    const artGeo = new THREE.PlaneGeometry(P.w, P.h).translate(0, 0, DEEP - 4.6)
    geometries.push(bars, cardGeo, artGeo)
    const art = PORTRAIT_KINDS[P.kind](Math.round(P.w * PX), Math.round(P.h * PX))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(P.w * PX)
    canvas.height = Math.round(P.h * PX)
    const g = canvas.getContext('2d')
    const st = art.state(0)
    art.draw(g, st)
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = anisotropy
    textures.push(map)
    const paper = new THREE.MeshStandardMaterial({ map, roughness: 0.9 })
    paper.customProgramCacheKey = () => 'portraits.paper'
    materials.push(paper)
    const meshes = [new THREE.Mesh(bars, wood), new THREE.Mesh(cardGeo, card), new THREE.Mesh(artGeo, paper)]
    meshes[0].castShadow = true
    meshes.forEach((m, i) => (m.name = `portraits.${P.kind}.${['frame', 'card', 'art'][i]}`))
    frame.add(...meshes)
    group.add(frame)
    live.push({ kind: P.kind, art, g, map, key: st.key, offset: 0 })
    items.push({ kind: P.kind, meshes, frame, size: [W, H] })
  }
  group.updateMatrixWorld(true)
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(group.matrixWorld)
  for (const it of items) {
    it.center = new THREE.Vector3(0, 0, DEEP).applyMatrix4(it.frame.matrixWorld)
    it.normal = normal
  }
  return {
    group,
    items,
    materials,
    /** t: seconds. Each picture whose state has changed is painted again; true if any was. */
    update(t) {
      let any = false
      for (const p of live) {
        const st = p.art.state(t + p.offset)
        if (st.key === p.key) continue
        p.key = st.key
        p.art.draw(p.g, st)
        p.map.needsUpdate = true
        any = true
      }
      return any
    },
    /** The picture of this kind begins its act (if it has one) a moment from now. */
    play(kind, t) {
      for (const p of live) if (p.kind === kind && p.art.loop) p.offset = 2.7 - ((t % p.art.loop) + p.art.loop) % p.art.loop
    },
    dispose() {
      for (const x of [...geometries, ...textures, ...materials]) x.dispose()
    },
  }
}
