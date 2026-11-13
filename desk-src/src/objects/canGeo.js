// The can's shapes (mm), from a slim ("sleek") 355 ml can as made: 58 mm across and 150 mm tall, a
// domed base standing on a ring 44 mm across, the straight wall, a long tapered neck down to a 202
// end (52 mm), and the end itself: its double seam (2.8 mm tall, 1.1 mm proud of the neck), the
// chuck wall, the countersink and the flat panel 4.5 mm below the seam's top, scored round the
// opening; the rivet, the tab (0.25 mm sheet, its edges rolled to a millimetre) and the tongue the
// tab pushes in. The can's own frame: y up its axis from its bottom, the brand at +x; the opening
// lies at +x of the rivet, the tab's finger hole at -x. Each profile point carries its baked
// occlusion (where parts meet, or where the can faces the desk).
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

export const SEGS = 64 // (round the can: the silhouette is within 0.04 mm of a circle)
export const R = 29
export const LID_Y = 145.35 // (the panel's top)
export const HINGE_X = 3.6 // (the tongue's hinge, across x)
export const TAB_HINGE_X = 2.2 // (where the tab bends: the front of its rivet island)
export const TAB_Y = LID_Y + 0.12 // (the tab's underside, resting on the panel)
const TAB = { depth: 0.25, bevelThickness: 0.38, bevelSize: 0.4, bevelSegments: 3, curveSegments: 8 }
export const TAB_T = TAB.depth + 2 * TAB.bevelThickness
export const LID_UV = 55 // (the lid's textures span 55 mm, planar from above)

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Points about `step` mm apart on a smooth curve through `pts` ([r, y]). */
function spline(pts, step) {
  const c = new THREE.CatmullRomCurve3(
    pts.map(([r, y]) => new THREE.Vector3(r, y, 0)),
    false,
    'centripetal',
  )
  const n = Math.max(2, Math.round(c.getLength() / step))
  return c.getSpacedPoints(n).map((p) => [p.x, p.y])
}

// ---- the body: from the middle of the dome, round the ring it stands on, up the wall and the neck
const dome = []
for (let k = 0; k < 6; k++) {
  const r = (k / 6) * 16.6
  dome.push([r, 9.4 - (38 - Math.sqrt(38 * 38 - r * r))])
}
const ring = spline(
  [
    [16.6, 5.58],
    [18.3, 4.72],
    [19.7, 3.35],
    [20.6, 1.7],
    [21.2, 0.45],
    [21.95, 0],
    [22.7, 0.35],
    [23.6, 1.5],
    [24.9, 3.2],
    [26.3, 5.2],
    [27.7, 7.6],
    [28.6, 9.9],
    [28.95, 12],
    [29, 13.5],
  ],
  0.8,
)
const wall = [16, 20, 30, 60, 95, 118].map((y) => [R, y])
const neck = spline(
  [
    [29, 121],
    [29, 124],
    [28.85, 127],
    [28.3, 130.5],
    [27.4, 134.5],
    [26.55, 138.5],
    [26, 142],
    [25.75, 144.6],
    [25.7, 147.1],
  ],
  1.3,
)
const FOOT = 21.95
/** Occlusion along the body: the dome's corner, the ring and the curve facing the desk, the seam's lip. */
function bodyAo(r, y, inner) {
  if (inner) return r < 16.7 ? 0.92 - 0.1 * (r / 16.6) : 0.6 + 0.22 * smooth(1, 5.6, y)
  return (0.56 + 0.44 * smooth(0, 14, y)) * (1 - 0.16 * smooth(144, 147.1, y))
}
const BODY_PTS = [...dome.map(([r, y]) => [r, y, true]), ...ring.map(([r, y]) => [r, y, r < FOOT]), ...wall.map(([r, y]) => [r, y, false]), ...neck.map(([r, y]) => [r, y, false])]

// (arc lengths: the label's v runs by length along the profile, so the print is not squeezed on the
// curves; the base (the dome, the ring and the curve below the print) takes the bottom tenth)
const S = [0]
for (let i = 1; i < BODY_PTS.length; i++) S.push(S[i - 1] + Math.hypot(BODY_PTS[i][0] - BODY_PTS[i - 1][0], BODY_PTS[i][1] - BODY_PTS[i - 1][1]))
const iB = BODY_PTS.findIndex(([r, y, inner]) => !inner && r > FOOT && y > 6)
const iW = dome.length + ring.length // (the wall's first point, 16 mm up: there h = y)
const sB = S[iB]
const sTop = S[S.length - 1]
const vB = 0.1
/**
 * The label's layout: C (mm round at the wall), heights h (mm; h = y on the straight wall, by length
 * on the curves) from hB (where the base ends) to hTop (the neck's top); the base's arc s from the
 * middle of the dome to sB; vB (the v where the label begins).
 */
export const BODY = {
  C: 2 * Math.PI * R,
  hB: sB - S[iW] + 16,
  hTop: sTop - S[iW] + 16,
  sB,
  vB,
}
const vOf = (s) => (s < sB ? (vB * s) / sB : vB + ((1 - vB) * (s - sB)) / (sTop - sB))

/**
 * A surface of revolution: prof [[r, y, ao, v]], SEGS round (u round it, from +z towards +x: u = 1/4
 * is the front); uvOf(x, y, z) instead of (u, v) for planar maps. Normals from the profile's tangent.
 */
function revolve(prof, uvOf = null, segs = SEGS) {
  const n = prof.length
  const nv = n * (segs + 1)
  const pos = new Float32Array(nv * 3)
  const nrm = new Float32Array(nv * 3)
  const uv = new Float32Array(nv * 2)
  const col = new Float32Array(nv * 3)
  const pn = prof.map((_, i) => {
    const a = prof[Math.max(0, i - 1)]
    const b = prof[Math.min(n - 1, i + 1)]
    const dr = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dr, dy) || 1
    return [dy / l, -dr / l]
  })
  for (let j = 0; j <= segs; j++) {
    const phi = (j / segs) * Math.PI * 2
    const sn = Math.sin(phi)
    const cs = Math.cos(phi)
    for (let i = 0; i < n; i++) {
      const k = j * n + i
      const [r, y, ao, v] = prof[i]
      pos.set([sn * r, y, cs * r], k * 3)
      nrm.set([sn * pn[i][0], pn[i][1], cs * pn[i][0]], k * 3)
      if (uvOf) uv.set(uvOf(sn * r, y, cs * r), k * 2)
      else uv.set([j / segs, v], k * 2)
      col.set([ao, ao, ao], k * 3)
    }
  }
  const idx = []
  for (let j = 0; j < segs; j++)
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i
      const c = a + n
      idx.push(a, c, a + 1, c, c + 1, a + 1)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.setIndex(idx)
  return g
}

/** The body: base, wall and neck, one surface; the label's u round it, v up it; ao in its colour. */
export function bodyGeometry() {
  return revolve(BODY_PTS.map(([r, y, inner], i) => [r, y, bodyAo(r, y, inner), vOf(S[i])]))
}

// ---- the end (the lid): from inside the neck, over the double seam, down the chuck wall into the
// countersink and up onto the panel's edge
const LID_PTS = spline(
  [
    [25.66, 146.4],
    [25.95, 146.85],
    [26.5, 147.2],
    [26.78, 147.8],
    [26.83, 148.6],
    [26.76, 149.3],
    [26.5, 149.72],
    [26.08, 149.9],
    [25.68, 149.78],
    [25.43, 149.35],
    [25.28, 148.7],
    [24.95, 147.5],
    [24.45, 145.95],
    [23.95, 144.45],
    [23.6, 143.55],
    [23.32, 143.15],
    [23.02, 143.08],
    [22.75, 143.32],
    [22.6, 143.85],
    [22.5, 144.55],
    [22.32, 145.05],
    [21.98, 145.3],
    [21.6, LID_Y],
  ],
  0.5,
)
const lidUv = (x, y, z) => [0.5 + x / LID_UV, 0.5 - z / LID_UV]
/** The seam's lip where it meets the neck, the chuck wall darkening into the countersink. */
function lidAo(r, y, i, iTop) {
  if (i <= iTop) return 0.84 + 0.16 * smooth(146.5, 147.7, y)
  if (r > 23.5) return 0.62 + 0.38 * smooth(143.4, 149, y)
  return 0.5 + 0.42 * smooth(143.15, 145.3, y)
}

/** The opening's outline (its score), in the lid's (x, z): the hinge towards the rivet, the far end round. */
export function openingPoints(n = 56) {
  const p = new THREE.Path()
  p.moveTo(3.9, -4.4)
  p.bezierCurveTo(5.2, -7.6, 9, -8.3, 12, -8.3)
  p.bezierCurveTo(17.4, -8.3, 20.3, -4.6, 20.3, 0)
  p.bezierCurveTo(20.3, 4.6, 17.4, 8.3, 12, 8.3)
  p.bezierCurveTo(9, 8.3, 5.2, 7.6, 3.9, 4.4)
  p.bezierCurveTo(3.4, 3, 3.25, 1.4, 3.25, 0)
  p.bezierCurveTo(3.25, -1.4, 3.4, -3, 3.9, -4.4)
  return p.getSpacedPoints(n).slice(0, n)
}

// (a shape's 2D coordinates are the lid's (x, -z): turned flat by rotateX(-PI / 2) they land on (x, z))
const v2 = (x, z) => new THREE.Vector2(x, -z)

/** A flat plate of the given thickness, its top at y, from a Shape in the lid's (x, -z). */
function plate(shape, y, t) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 1 })
  g.rotateX(-Math.PI / 2)
  g.translate(0, y - t, 0)
  return g
}

/** Planar lid UVs and a colour (occlusion) of 1 on a geometry made elsewhere. */
function asLid(g, ao = 1) {
  const p = g.attributes.position
  const uv = new Float32Array(p.count * 2)
  const col = new Float32Array(p.count * 3).fill(ao)
  for (let i = 0; i < p.count; i++) uv.set(lidUv(p.getX(i), p.getY(i), p.getZ(i)), i * 2)
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}

/** The rivet's head, round over (on the tab's island). */
function rivetGeometry() {
  const top = TAB_Y + TAB_T
  const prof = [
    [0, 0.5],
    [0.75, 0.48],
    [1.3, 0.41],
    [1.65, 0.28],
    [1.85, 0.12],
    [1.95, -0.06],
  ].map(([r, y]) => [r, top + y, 1, 0])
  return revolve(prof, lidUv, 24)
}

/**
 * The end: seam, chuck wall, countersink and the panel (cut with the opening), and the rivet, one
 * geometry (lid's planar uv, ao in its colour); the tongue on its own, about its hinge (at the origin
 * of its geometry: placed at (HINGE_X, LID_Y, 0), it turns about z).
 */
export function lidGeometry() {
  const iTop = LID_PTS.reduce((b, p, i) => (p[1] > LID_PTS[b][1] ? i : b), 0)
  const ring = revolve(
    LID_PTS.map(([r, y], i) => [r, y, lidAo(r, y, i, iTop), 0]),
    lidUv,
  )
  // the panel: its outline on the ring's own points, the opening cut out
  const outer = []
  for (let j = 0; j < SEGS; j++) {
    const phi = (j / SEGS) * Math.PI * 2
    outer.push(v2(Math.sin(phi) * 21.62, Math.cos(phi) * 21.62))
  }
  const panel = new THREE.Shape(outer)
  const op = openingPoints()
  panel.holes.push(new THREE.Path(op.map((p) => v2(p.x, p.y))))
  const panelGeo = asLid(plate(panel, LID_Y, 0.24), 0.97)
  const rivet = rivetGeometry()
  const lid = mergeGeometries([ring.toNonIndexed(), panelGeo, rivet.toNonIndexed()])
  ring.dispose()
  panelGeo.dispose()
  rivet.dispose()
  const tongue = asLid(plate(new THREE.Shape(op.map((p) => v2(p.x, p.y))), LID_Y, 0.24), 0.97)
  tongue.translate(-HINGE_X, -LID_Y, 0)
  return { lid, tongue }
}

/** The tab's outline (inset by its rolled edge, which the bevel adds back), the finger hole, the slot. */
function tabShapes() {
  // (all symmetric across x: drawn straight in the lid's (x, z))
  const s = new THREE.Shape()
  s.moveTo(6, 0)
  s.bezierCurveTo(6, 2.2, 5.2, 3.5, 3.6, 3.7)
  s.bezierCurveTo(2.4, 3.8, 1.6, 5.8, 0.4, 5.8)
  s.lineTo(-8.8, 5.8)
  s.bezierCurveTo(-12.4, 5.8, -14.2, 3.6, -14.2, 0)
  s.bezierCurveTo(-14.2, -3.6, -12.4, -5.8, -8.8, -5.8)
  s.lineTo(0.4, -5.8)
  s.bezierCurveTo(1.6, -5.8, 2.4, -3.8, 3.6, -3.7)
  s.bezierCurveTo(5.2, -3.5, 6, -2.2, 6, 0)
  // the finger hole (a D: flat towards the rivet), drawn 0.4 mm large (the rolled edge narrows it)
  const fh = new THREE.Path()
  fh.moveTo(-7, 4.2)
  fh.bezierCurveTo(-7, 4.6, -7.3, 4.7, -7.8, 4.7)
  fh.lineTo(-10.2, 4.7)
  fh.bezierCurveTo(-12.4, 4.7, -13.2, 2.6, -13.2, 0)
  fh.bezierCurveTo(-13.2, -2.6, -12.4, -4.7, -10.2, -4.7)
  fh.lineTo(-7.8, -4.7)
  fh.bezierCurveTo(-7.3, -4.7, -7, -4.6, -7, -4.2)
  fh.lineTo(-7, 4.2)
  // the slot round the rivet's island (a U, open towards the nose: the island is joined there)
  const sl = new THREE.Path()
  sl.moveTo(TAB_HINGE_X + 0.4, 3.4)
  sl.lineTo(-2.2, 3.4)
  sl.quadraticCurveTo(-3.4, 3.4, -3.4, 2.2)
  sl.lineTo(-3.4, -2.2)
  sl.quadraticCurveTo(-3.4, -3.4, -2.2, -3.4)
  sl.lineTo(TAB_HINGE_X + 0.4, -3.4)
  sl.lineTo(TAB_HINGE_X + 0.4, 3.4)
  s.holes.push(fh, sl)
  const island = new THREE.Shape()
  island.moveTo(TAB_HINGE_X - 0.4, 2)
  island.lineTo(-1.2, 2)
  island.quadraticCurveTo(-2, 2, -2, 1.2)
  island.lineTo(-2, -1.2)
  island.quadraticCurveTo(-2, -2, -1.2, -2)
  island.lineTo(TAB_HINGE_X - 0.4, -2)
  island.lineTo(TAB_HINGE_X - 0.4, 2)
  return { lever: s, island }
}

/** A part of the tab: the shape extruded, its edges rounded (rolled), smooth normals; its underside at TAB_Y. */
function tabPart(shape) {
  let g = new THREE.ExtrudeGeometry(shape, { ...TAB, steps: 1 })
  g.rotateX(-Math.PI / 2)
  g.computeBoundingBox()
  g.translate(0, TAB_Y - g.boundingBox.min.y, 0)
  g.deleteAttribute('uv')
  g.deleteAttribute('normal')
  const m = mergeVertices(g, 1e-4)
  g.dispose()
  m.computeVertexNormals()
  return m
}

/** The tab: the lever (about its hinge: its geometry's origin at (TAB_HINGE_X, TAB_Y + TAB_T / 2, 0)) and the island. */
export function tabGeometry() {
  const { lever, island } = tabShapes()
  const l = tabPart(lever)
  l.translate(-TAB_HINGE_X, -(TAB_Y + TAB_T / 2), 0)
  return { lever: l, island: tabPart(island) }
}

/** The tab's outline for its soft shade on the lid (lid x, z). */
export function tabOutline(g) {
  const { lever } = tabShapes()
  const pts = lever.getPoints(12)
  g.beginPath()
  pts.forEach((p, i) => (i ? g.lineTo(p.x, -p.y) : g.moveTo(p.x, -p.y)))
  g.closePath()
}

/** Inside, seen through the opening: the neck's lacquered wall and the drink's surface. */
export function insideGeometry() {
  const wallGeo = new THREE.CylinderGeometry(25.4, 25.4, 13, 32, 1, true)
  wallGeo.translate(0, LID_Y - 6.8, 0)
  const surf = new THREE.CircleGeometry(25.4, 32).rotateX(-Math.PI / 2)
  surf.translate(0, LID_Y - 11, 0)
  return { wall: wallGeo, surface: surf }
}
