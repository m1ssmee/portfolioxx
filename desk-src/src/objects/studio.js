// Beside the desk, on the floor: a pair of studio monitors (two-way, a matt black cabinet with
// soft edges, a woofer in a rubber surround, a dome tweeter in a shallow waveguide, a slot port
// along the bottom of the baffle, a small white power light; no maker's mark), each on a steel
// stand (a heavy square foot, a column, a top plate with four pads) and turned in towards the
// chair; and, right of the right stand, a small pedal bin in brushed stainless steel.
// Each thing in its own frame: y up from the floor, +z its front (mm).
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export const STUDIO = {
  speaker: { w: 200, h: 312, d: 250, r: 13, woofer: [0, 112, 60], tweeter: [0, 243, 13], port: [0, 27, 122, 13] },
  stand: { foot: 290, footH: 9, col: 58, top: [215, 235], topH: 6, pad: 5 },
  bin: { r: 104, h: 272, lid: 20 },
}

/** A rounded rectangle (w x d, corner r) as a Shape in x, y. */
function roundRect(w, d, r) {
  const s = new THREE.Shape()
  const x = w / 2
  const y = d / 2
  s.moveTo(-x + r, -y)
  s.lineTo(x - r, -y)
  s.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x, y - r)
  s.absarc(x - r, y - r, r, 0, Math.PI / 2, false)
  s.lineTo(-x + r, y)
  s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(-x, -y + r)
  s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}
/** A slab standing on y = 0: a rounded rectangle (w across x, d across z) h tall, its edges eased. */
function slab(w, d, h, r, bevel = 1.2) {
  const g = new THREE.ExtrudeGeometry(roundRect(w - 2 * bevel, d - 2 * bevel, Math.max(r - bevel, 0.5)), { depth: h - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 })
  g.rotateX(-Math.PI / 2) // (the shape's y to -z, its depth up)
  g.translate(0, bevel, 0)
  return g
}
const lathe = (pts, n = 48) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n)
/** A lathe about the baffle's normal: its axis (y) turned to +z, its origin at (x, y, z). */
const onBaffle = (g, x, y, z) => g.rotateX(Math.PI / 2).translate(x, y, z)

let shadeTex = null
function shadeTexture() {
  if (shadeTex) return shadeTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  for (let i = 0; i <= 10; i++) r.addColorStop(i / 10, `rgba(0,0,0,${Math.pow(1 - i / 10, 1.7).toFixed(3)})`)
  g.fillStyle = r
  g.fillRect(0, 0, 128, 128)
  shadeTex = new THREE.CanvasTexture(c)
  return shadeTex
}

/**
 * floorY: the floor (world y); top: the height of the stands' top plates (world y); left, right:
 * where the stands stand (world x, z); yawL, yawR: the way each speaker faces (about y, from +z);
 * bin: where the bin stands (world x, z); binYaw.
 * Returns { group, speakers: [{ group, meshes, center(out) }, ...], bin: { group, meshes },
 *   materials, setPower(on), dispose() }.
 */
export function createStudio({ floorY, top, left, right, yawL, yawR, bin, binYaw = 0 }) {
  const S = STUDIO.speaker
  const T = STUDIO.stand
  const B = STUDIO.bin
  const group = new THREE.Group()
  group.name = 'studio'
  const geometries = []
  const cabinet = new THREE.MeshStandardMaterial({ color: 0x3d3d41, roughness: 0.66, metalness: 0 })
  const rubber = new THREE.MeshStandardMaterial({ color: 0x29292c, roughness: 0.46 })
  const cone = new THREE.MeshStandardMaterial({ color: 0x7b7d84, roughness: 0.34, metalness: 0.3 })
  const dome = new THREE.MeshStandardMaterial({ color: 0x80828a, roughness: 0.5 })
  const hole = new THREE.MeshBasicMaterial({ color: 0x040404 })
  // (the drivers' dishes are open surfaces, seen from their hollow side)
  const guide = cabinet.clone()
  for (const m of [rubber, cone, dome, guide]) m.side = THREE.DoubleSide
  const steel = new THREE.MeshStandardMaterial({ color: 0x303033, roughness: 0.42, metalness: 0.35 })
  const stainless = new THREE.MeshStandardMaterial({ color: 0xcdd0d4, roughness: 0.3, metalness: 1 })
  const plastic = new THREE.MeshStandardMaterial({ color: 0x151516, roughness: 0.5 })
  const light = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.97, 0.9).multiplyScalar(2.4) })
  const shade = new THREE.MeshBasicMaterial({ color: 0x000000, map: shadeTexture(), transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -2 })
  const lit = [cabinet, rubber, cone, dome, steel, stainless, plastic, guide]
  const keys = ['cabinet', 'rubber', 'cone', 'dome', 'steel', 'stainless', 'plastic', 'guide']
  lit.forEach((m, i) => (m.customProgramCacheKey = () => `studio.${keys[i]}`))
  const materials = [...lit, hole, light, shade]
  const mk = (g, m, name, parent) => {
    geometries.push(g)
    const o = new THREE.Mesh(g, m)
    o.name = name
    parent.add(o)
    return o
  }
  const merged = (list) => {
    const g = mergeGeometries(list.map((x) => (x.index ? x.toNonIndexed() : x)))
    for (const x of list) x.dispose()
    return g
  }

  // ---- one stand and its speaker, built once (the geometries shared by both)
  const standH = top - floorY
  const colH = standH - T.footH - T.topH
  const standGeo = merged([
    slab(T.foot, T.foot, T.footH, 14, 1.5),
    new THREE.BoxGeometry(T.col, colH, T.col).translate(0, T.footH + colH / 2, 0),
    slab(T.top[0], T.top[1], T.topH, 8, 1).translate(0, standH - T.topH, 0),
  ])
  const padGeo = merged([-1, 1].flatMap((sx) => [-1, 1].map((sz) => new THREE.CylinderGeometry(11, 11, T.pad, 20).translate(sx * (T.top[0] / 2 - 26), standH + T.pad / 2, sz * (T.top[1] / 2 - 28)))))
  const baseY = standH + T.pad
  const zf = S.d / 2 // (the baffle)
  const [wx, wy, wr] = S.woofer
  const [tx, ty, tr] = S.tweeter
  // the cabinet: its front's outline (soft corners), drawn back through its depth, the drivers'
  // openings cut through it (each closed by a black disc sunk behind the driver)
  const CB = 3
  const front = roundRect(S.w - 2 * CB, S.h - 2 * CB, S.r - CB)
  for (const [x, y, r] of [
    [wx, wy - S.h / 2, wr + 13 + CB],
    [tx, ty - S.h / 2, tr + 27 + CB],
  ]) {
    const h = new THREE.Path()
    h.absarc(x, y, r, 0, Math.PI * 2, true)
    front.holes.push(h)
  }
  const cabGeo = new THREE.ExtrudeGeometry(front, { depth: S.d - 2 * CB, bevelEnabled: true, bevelThickness: CB, bevelSize: CB, bevelSegments: 3, curveSegments: 24 }).translate(0, baseY + S.h / 2, -S.d / 2 + CB)
  // the woofer: its surround (a half roll of rubber), its cone, its dust cap
  const surroundGeo = onBaffle(
    lathe([
      [wr - 1, -1.5],
      [wr + 1.2, 1.6],
      [wr + 4.5, 4.2],
      [wr + 8.5, 4.4],
      [wr + 11.5, 2.2],
      [wr + 13, -1.5],
    ]),
    wx,
    baseY + wy,
    zf,
  )
  const coneGeo = onBaffle(
    lathe([
      [18, -23],
      [30, -17],
      [44, -9.5],
      [wr - 0.5, -1.2],
    ]),
    wx,
    baseY + wy,
    zf,
  )
  const capGeo = onBaffle(
    lathe(
      Array.from({ length: 9 }, (_, i) => {
        const a = (i / 8) * (Math.PI / 2) * 0.82
        return [Math.sin(a) * 19.5, -23.5 + (Math.cos(a) - Math.cos((Math.PI / 2) * 0.82)) * 19.5 * 0.55]
      }),
      32,
    ),
    wx,
    baseY + wy,
    zf,
  )
  // the tweeter: a shallow waveguide (the cabinet's own black), a soft dome in its throat
  const guideGeo = onBaffle(
    lathe([
      [tr + 1, -9.5],
      [tr + 7, -7.6],
      [tr + 16, -4.2],
      [tr + 24, -1.4],
      [tr + 27, 0.05],
    ]),
    tx,
    baseY + ty,
    zf,
  )
  const domeGeo = onBaffle(
    lathe(
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 7) * (Math.PI / 2) * 0.9
        return [Math.sin(a) * (tr + 1), -9.8 + (Math.cos(a) - Math.cos((Math.PI / 2) * 0.9)) * (tr + 1) * 0.62]
      }),
      32,
    ),
    tx,
    baseY + ty,
    zf,
  )
  // the holes behind the drivers and the port's slot: black, a hair proud of the baffle
  const [px, py, pw, ph] = S.port
  const holeGeo = merged([
    new THREE.CircleGeometry(wr + 12, 48).translate(wx, baseY + wy, zf - 24),
    new THREE.CircleGeometry(tr + 26, 40).translate(tx, baseY + ty, zf - 10),
    new THREE.ShapeGeometry(roundRect(pw, ph, ph / 2), 8).translate(px, baseY + py, zf + 0.12),
  ])
  // (the baffle is cut by nothing: the drivers' dishes are drawn over a black disc sunk behind it,
  // through the depth test: the rings hide where they meet)
  const ledGeo = new THREE.CircleGeometry(1.7, 16).translate(S.w / 2 - 22, baseY + py + 1, zf + 0.15)
  const shadeGeo = new THREE.PlaneGeometry(T.foot * 1.9, T.foot * 1.9).rotateX(-Math.PI / 2).translate(0, 0.6, 0)
  for (const g of [standGeo, padGeo, cabGeo, surroundGeo, coneGeo, capGeo, guideGeo, domeGeo, holeGeo, ledGeo, shadeGeo]) geometries.push(g)

  const leds = []
  const speakers = [
    [left, yawL],
    [right, yawR],
  ].map(([at, yaw], i) => {
    const g = new THREE.Group()
    g.name = `studio.speaker.${i ? 'right' : 'left'}`
    g.position.set(at.x, floorY, at.z)
    g.rotation.y = yaw
    const meshes = [
      [standGeo, steel, 'stand'],
      [padGeo, rubber, 'pads'],
      [cabGeo, cabinet, 'cabinet'],
      [surroundGeo, rubber, 'surround'],
      [coneGeo, cone, 'cone'],
      [capGeo, cone, 'cap'],
      [guideGeo, guide, 'waveguide'],
      [domeGeo, dome, 'dome'],
      [holeGeo, hole, 'holes'],
    ].map(([geo, m, name]) => {
      const o = new THREE.Mesh(geo, m)
      o.name = `studio.${name}`
      g.add(o)
      return o
    })
    const led = new THREE.Mesh(ledGeo, light)
    led.name = 'studio.led'
    g.add(led)
    leds.push(led)
    const sh = new THREE.Mesh(shadeGeo, shade)
    sh.name = 'studio.contact'
    g.add(sh)
    group.add(g)
    return { group: g, meshes, center: (out) => out.set(0, baseY + S.h * 0.52, 0).applyMatrix4(g.matrixWorld), front: (out) => out.set(0, 0, 1).transformDirection(g.matrixWorld) }
  })

  // ---- the bin: a brushed steel drum on a black foot, a black collar, a low domed lid, a pedal
  const binGroup = new THREE.Group()
  binGroup.name = 'studio.bin'
  binGroup.position.set(bin.x, floorY, bin.z)
  binGroup.rotation.y = binYaw
  const drum = lathe(
    [
      [B.r - 3, 16],
      [B.r - 0.6, 19],
      [B.r, 24],
      [B.r, B.h - 26],
    ],
    64,
  )
  const lid = lathe(
    [
      [B.r + 1.2, B.h - 12],
      [B.r + 1.2, B.h - 5],
      [B.r - 1.5, B.h],
      [B.r - 16, B.h + 6.5],
      [B.r * 0.55, B.h + 13.5],
      [B.r * 0.22, B.h + 17.5],
      [0, B.h + 18.2],
    ],
    64,
  )
  const blackParts = merged([
    lathe([
      [0, 0],
      [B.r - 1, 0],
      [B.r + 1.5, 2.5],
      [B.r + 1.5, 15],
      [B.r - 3, 17],
    ], 64),
    lathe([
      [B.r + 0.8, B.h - 27],
      [B.r + 2.2, B.h - 25],
      [B.r + 2.2, B.h - 13],
      [B.r + 1.2, B.h - 11.5],
    ], 64),
    // the pedal: a bar out of the foot, its tread
    new THREE.BoxGeometry(46, 7, 34).translate(0, 9, B.r + 14),
    new THREE.BoxGeometry(58, 4, 16).translate(0, 13.5, B.r + 26),
  ])
  const binMeshes = [mk(merged([drum, lid]), stainless, 'studio.bin.steel', binGroup), mk(blackParts, plastic, 'studio.bin.black', binGroup)]
  const binShade = mk(new THREE.PlaneGeometry(B.r * 3.6, B.r * 3.6).rotateX(-Math.PI / 2).translate(0, 0.6, 0), shade, 'studio.bin.contact', binGroup)
  binShade.renderOrder = 1
  group.add(binGroup)
  group.updateMatrixWorld(true)

  return {
    group,
    speakers,
    bin: { group: binGroup, meshes: binMeshes, center: (out) => out.set(0, B.h / 2, 0).applyMatrix4(binGroup.matrixWorld) },
    materials: lit,
    /** The speakers' power lights. */
    setPower(on) {
      for (const l of leds) l.visible = on
    },
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
    },
  }
}
