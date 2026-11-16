// The room round the still life: the matte white desk, the plain warm white wall behind it and, on
// the wall, a shelf. The wall's face stands a few millimetres behind the desk's back edge, so the
// two meet in a dark shadow gap; low on the right a black double socket, a plug in it, its cable
// running down into the gap.
// The shelf: an oak plank over the monitor, nothing showing that holds it. On it a snake plant in
// a clay pot, a few books, a risograph postcard in a thin black frame and a wire-bound calendar of
// the visitor's own month (today ringed in red marker), both leaning back on the wall; three
// handwritten sticky notes on its front edge; under its right end a brass hook, the ID badge on
// it. A tap peels a note's lower edge up and lets it fall, turns the calendar to next month and
// back, swings the badge (room.items, room.update).
// Frame: the view's own axes (layout.js): x across the picture (u), z down it (v, towards the
// viewer), y up; the desk's top at y = ROOM.deskY (the felt mat's top, where everything rests, is
// y = 0: the mat is that much thick). On the shelf: x from its left end, y up from its underside, z out
// of the wall.
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { bakeRoom } from './roomTex.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { noteCanvas, calendarCanvas, postcardCanvas } from './roomPaper.js'

export const ROOM = {
  deskY: -3,
  wallV: -470, // (the desk's back edge; the panelling's face is panel.gap behind it)
  deskFront: 276, // (its front edge: a hand in front of the mat, no further)
  deskHalf: 1700, // (the wall's half width: its ends never in the picture)
  // the desk itself: its two ends (its left and right, across the picture), 1.32 m of it, on two
  // black steel end frames; the floor 730 mm below its top; the skirting along the wall
  desk: { u0: -760, u1: 560, leg: 46, inset: 40 },
  floorY: -733,
  skirting: { h: 72, t: 13 },
  deskThick: 28,
  // the panelling: V-jointed boards `pitch` wide and `thick` on the wall (the plaster above the rail
  // that much further back), their joints at x = joint + k pitch, their face `gap` behind wallV
  panel: { pitch: 120, joint: 80, thick: 0, gap: 6 }, // (a joint at each end of the desk)
  // the oak rail capping it, a slim picture ledge: its underside's height and its height (mm). (At
  // 790, about 1.5 m off the floor, it is just out of the seated view's top: lower, it crowded the
  // board's top or was cut by the picture's edge)
  rail: { y: 790, h: 0, none: true }, // (no rail now: only where the wall's two parts meet)
  // the double socket low on the right: its middle (x, height) and its size (mm)
  socket: { u: 330, y: 86, w: 151, h: 80 },
  // the shelf (the name is the old board's), right of the monitor's middle: its middle across the
  // picture, its underside's height, its length, how high what stands on it reaches above its
  // underside (for the views), its thickness and depth (mm). On it (x from its left end): the
  // badge's hook under it ([x, y from its underside]), the notes on its front edge ([x, turn]),
  // where the books lying flat start and the plant on them ([x, z out of the wall]), where the
  // row of books starts, the framed print's middle, the calendar's
  board: {
    u: 356,
    y0: 700,
    w: 680,
    h: 330,
    thick: 28,
    deep: 168,
    badge: [652, -14],
    notes: [
      [334, -0.05],
      [424, 0.04],
      [514, -0.03],
    ],
    stack: 22,
    plant: [132, 92],
    books: 264,
    postcard: 502,
    calendar: 616,
  },
  // the wall's contact shade: where it is baked (the room's frame: x0, y0, x1, y1) and its texels
  wallAO: { rect: [-1200, -40, 1200, 1160], size: [512, 256] },
}

// the panelling's paint (sRGB): a grey-green, lighter than it looks. The wall only gets the dusk's
// fill, the bounce from behind the chair and the environment (the lamp's cone does not reach it):
// together about 0.42 of the paint's own colour, which the tone mapping's toe darkens and saturates
// further. Under that it reads as a deep bottle green, about #263932 (a deeper paint read near black)
const WALL_GREEN = 0xe9e4da // (a warm white now: the name is the old paint's)
const DEG = Math.PI / 180

/**
 * A profile swept along a straight run. prof: the section's points [a, b, shade] in order, the
 * outside on their left (shade: the contact shade there); runs(point): the run's stations [s, shade]
 * (as many for every point: a mitred end's station depends on the point); put(a, b, s, out): the
 * point in space; turn(na, nb, out): a section's normal in space; uv(point, arc, s, out). Each
 * point's normal is the mean of its two sides' weighted by their lengths (a long flat stays flat, a
 * small round rounds), split where the section turns by more than 50 degrees.
 */
function sweep(prof, runs, put, turn, uv) {
  const sides = []
  for (let i = 0; i + 1 < prof.length; i++) {
    const da = prof[i + 1][0] - prof[i][0]
    const db = prof[i + 1][1] - prof[i][1]
    const l = Math.hypot(da, db)
    sides.push({ na: -db / l, nb: da / l, l })
  }
  const arc = [0]
  for (let i = 0; i < sides.length; i++) arc.push(arc[i] + sides[i].l)
  const pos = []
  const nrm = []
  const uvs = []
  const col = []
  const idx = []
  const P = new THREE.Vector3()
  const N = new THREE.Vector3()
  const U = new THREE.Vector2()
  sides.forEach((s, i) => {
    const ends = [sides[i - 1], sides[i + 1]].map((o) => {
      if (!o || s.na * o.na + s.nb * o.nb < Math.cos(50 * DEG)) return [s.na, s.nb]
      const a = s.na * s.l + o.na * o.l
      const b = s.nb * s.l + o.nb * o.l
      const l = Math.hypot(a, b)
      return [a / l, b / l]
    })
    const st = [runs(prof[i]), runs(prof[i + 1])]
    const base = pos.length / 3
    for (let r = 0; r < st[0].length; r++)
      for (let e = 0; e < 2; e++) {
        const p = prof[i + e]
        const [at, shade] = st[e][r]
        put(p[0], p[1], at, P)
        turn(ends[e][0], ends[e][1], N)
        uv(p, arc[i + e], at, U)
        pos.push(P.x, P.y, P.z)
        nrm.push(N.x, N.y, N.z)
        uvs.push(U.x, U.y)
        const k = p[2] * shade
        col.push(k, k, k)
      }
    for (let r = 0; r + 1 < st[0].length; r++) {
      const a = base + r * 2
      idx.push(a, a + 1, a + 3, a, a + 3, a + 2)
    }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  return orient(g)
}

/** Its triangles wound to face the way its normals do (checked on its first proper face). */
function orient(g) {
  const p = g.attributes.position
  const n = g.attributes.normal
  const ix = g.index.array
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  for (let t = 0; t < ix.length; t += 3) {
    a.fromBufferAttribute(p, ix[t])
    b.fromBufferAttribute(p, ix[t + 1]).sub(a)
    c.fromBufferAttribute(p, ix[t + 2]).sub(a)
    b.cross(c)
    if (b.lengthSq() < 1e-8) continue
    if (b.dot(a.fromBufferAttribute(n, ix[t])) < 0)
      for (let k = 0; k < ix.length; k += 3) {
        const s = ix[k + 1]
        ix[k + 1] = ix[k + 2]
        ix[k + 2] = s
      }
    break
  }
  return g
}

/** A sheet w x h (mm) on nx x ny cells, its top edge's middle at the origin, hanging down -y, face +z. */
function sheet(w, h, nx, ny) {
  const g = new THREE.PlaneGeometry(w, h, nx, ny)
  g.translate(0, -h / 2, 0)
  g.userData.grid = [w, h, nx, ny]
  return g
}
/**
 * Bend a sheet: down from its top edge each column follows the angle alpha(s, x) (0: flat on the
 * board, pointing down it; pi / 2: straight out of it), s the distance down the paper; creases
 * ([x0, s0, x1, s1, depth]: a narrow tent along a line, where it was once folded) ride on it.
 */
function bend(g, alpha, creases) {
  const [w, h, nx, ny] = g.userData.grid
  const p = g.attributes.position
  const ds = h / ny
  for (let i = 0; i <= nx; i++) {
    const x = -w / 2 + (w * i) / nx
    let y = 0
    let z = 0
    for (let j = 0; j <= ny; j++) {
      if (j > 0) {
        const a = alpha((j - 0.5) * ds, x)
        y -= Math.cos(a) * ds
        z += Math.sin(a) * ds
      }
      let c = 0
      if (creases)
        for (const [x0, s0, x1, s1, d] of creases) {
          const ex = x1 - x0
          const es = s1 - s0
          const t = Math.max(0, Math.min(1, ((x - x0) * ex + (j * ds - s0) * es) / (ex * ex + es * es)))
          c += d * Math.max(0, 1 - Math.hypot(x - x0 - t * ex, j * ds - s0 - t * es) / (0.8 * ds))
        }
      p.setXYZ(j * (nx + 1) + i, x, y, z + c)
    }
  }
  p.needsUpdate = true
  g.computeVertexNormals()
  g.computeBoundingSphere()
}

/** A soft shadow's quad: a w x h rectangle (its top edge's middle at the origin), alpha per vertex. */
function shadeGeometry() {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(48), 3))
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(64), 4))
  const idx = []
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 3; i++) {
      const a = j * 4 + i
      idx.push(a, a + 4, a + 1, a + 1, a + 4, a + 5)
    }
  g.setIndex(idx)
  return g
}
/** Set a soft shadow: its edges blurred by soft [top, right, bottom, left] mm, `a` dark, `dy` below. */
function setShade(g, w, h, soft, a, dy = 0) {
  const [t, r, b, l] = soft.map((s, k) => Math.min(s, (k % 2 ? w : h) / 2 - 0.5))
  const xs = [-w / 2 - l, -w / 2 + l, w / 2 - r, w / 2 + r]
  const ys = [t - dy, -t - dy, -h + b - dy, -h - b - dy]
  const p = g.attributes.position.array
  const c = g.attributes.color.array
  for (let j = 0; j < 4; j++)
    for (let i = 0; i < 4; i++) {
      const k = j * 4 + i
      p[k * 3] = xs[i]
      p[k * 3 + 1] = ys[j]
      p[k * 3 + 2] = 0
      c[k * 4 + 3] = i > 0 && i < 3 && j > 0 && j < 3 ? a : 0
    }
  g.attributes.position.needsUpdate = true
  g.attributes.color.needsUpdate = true
  g.computeBoundingSphere()
}

/**
 * The room. fwd, right: the view's axes (layout.js); font, handFont: CSS font families (loaded);
 * notes: [{ color, lines }]; now: today (the calendar's month); baked: bakeRoom(ROOM)'s textures if
 * already made (in a worker), else they are made here. Returns { group, desk, wall, wallMeshes,
 * boardMeshes, badgePin, boardOut, boardCenter, boardSize, badgeShade, items, update(dt),
 * litMaterials, dispose() }.
 */
export function createRoom({ fwd, right, font, handFont, notes, now = new Date(), anisotropy = 4, baked }) {
  const R = ROOM
  const group = new THREE.Group()
  const down = new THREE.Vector3(-fwd[0], 0, -fwd[2])
  group.matrix.makeBasis(new THREE.Vector3(right[0], 0, right[2]), new THREE.Vector3(0, 1, 0), down)
  group.matrixAutoUpdate = false
  group.updateMatrixWorld(true)
  const geometries = []
  const materials = []
  const textures = []
  const lit = [] // (every lit material: the ember's and the flame's light)
  const T = baked || bakeRoom(R)
  const dataTex = (d, arr, { srgb = false, wrap = true, red = false, repeat = 1 } = {}) => {
    const t = new THREE.DataTexture(arr, d.size[0], d.size[1], red ? THREE.RedFormat : THREE.RGBAFormat)
    t.wrapS = t.wrapT = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping
    t.repeat.setScalar(repeat)
    t.magFilter = THREE.LinearFilter
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.generateMipmaps = true
    t.anisotropy = anisotropy
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    textures.push(t)
    return t
  }
  const canvasTex = (c) => {
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = anisotropy
    textures.push(t)
    return t
  }
  const mat = (m) => {
    materials.push(m)
    if (m.isMeshStandardMaterial) lit.push(m)
    return m
  }
  const geo = (g) => (geometries.push(g), g)
  const mesh = (g, m, name, { cast = false, takes = false } = {}) => {
    const o = new THREE.Mesh(geo(g), m)
    o.name = name
    o.castShadow = cast
    o.userData.takesShadow = takes
    return o
  }
  const tex = {
    paint: dataTex(T.paint, T.paint.px),
    paperN: dataTex(T.paper, T.paper.nrm, { repeat: 3 }),
    wallAO: dataTex(T.wallAO, T.wallAO.px, { wrap: false, red: true }),
  }

  // ---- the desk: a white slab against the wall, its top at deskY
  const DK = R.desk
  const deskGeo = new THREE.BoxGeometry(DK.u1 - DK.u0, R.deskThick, R.deskFront - R.wallV)
  deskGeo.translate((DK.u0 + DK.u1) / 2, R.deskY - R.deskThick / 2, (R.deskFront + R.wallV) / 2)
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
  lit.push(deskMat)
  const desk = new THREE.Mesh(deskGeo, deskMat)
  desk.name = 'room.desk'
  desk.receiveShadow = true

  // its two end frames: black steel tube, a leg front and back and a rail under the top
  const steelMat = mat(new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.48, metalness: 0.2 }))
  steelMat.customProgramCacheKey = () => 'room.legs'
  const under = R.deskY - R.deskThick
  const legH = under - R.floorY
  const legParts = []
  for (const x of [DK.u0 + DK.inset + DK.leg / 2, DK.u1 - DK.inset - DK.leg / 2]) {
    for (const z of [R.wallV + 40, R.deskFront - 60]) legParts.push(new THREE.BoxGeometry(DK.leg, legH, 28).translate(x, R.floorY + legH / 2, z))
    legParts.push(new THREE.BoxGeometry(DK.leg, 28, R.deskFront - R.wallV - 100).translate(x, under - 14, (R.wallV + R.deskFront - 20) / 2))
    legParts.push(new THREE.BoxGeometry(DK.leg, 28, R.deskFront - R.wallV - 100).translate(x, R.floorY + 14, (R.wallV + R.deskFront - 20) / 2))
  }
  const legs = mesh(mergeGeometries(legParts), steelMat, 'room.legs')
  for (const g of legParts) g.dispose()

  // ---- the floor: oak boards running along the wall, darker towards the wall and under the desk
  // (the sky's light does not reach there); a white skirting where it meets the wall
  const floorTex = canvasTex(floorCanvas())
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping
  const floorMat = mat(new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.58, metalness: 0, vertexColors: true }))
  floorMat.customProgramCacheKey = () => 'room.floor'
  const floorGeo = new THREE.PlaneGeometry(2 * R.deskHalf + 600, 3000, 80, 50)
  floorGeo.rotateX(-Math.PI / 2)
  floorGeo.translate(0, R.floorY, R.wallV - R.panel.gap + 1500)
  {
    const p = floorGeo.attributes.position
    const uv = floorGeo.attributes.uv
    const col = new Float32Array(p.count * 3)
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const z = p.getZ(i)
      uv.setXY(i, x / 1120, z / 1120)
      // (by the wall; under and beside the desk)
      const wallD = z - (R.wallV - R.panel.gap)
      const out = Math.hypot(Math.max(DK.u0 - x, 0, x - DK.u1), Math.max(z - R.deskFront, 0))
      const k = (1 - 0.3 * Math.exp(-wallD / 90)) * (1 - 0.5 * Math.exp(-out / 260))
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k
    }
    floorGeo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  }
  const floor = mesh(floorGeo, floorMat, 'room.floor')
  const SK = R.skirting
  const skirting = mesh(new THREE.BoxGeometry(2 * R.deskHalf + 600, SK.h, SK.t).translate(0, R.floorY + SK.h / 2, R.wallV - R.panel.gap + SK.t / 2), deskMat, 'room.skirting')

  // ---- the wall
  const P = R.panel
  const face = R.wallV - P.gap
  // the paint: the board's own stretch of brushed eggshell (each board shifted up the texture, every
  // other one mirrored), its tone and roughness from one texture, darkened by the wall's contact
  // shade (round the board, the rail and the socket) and the limewash's slow clouds
  const [ax0, ay0, ax1, ay1] = R.wallAO.rect
  const wallMat = mat(
    new THREE.MeshStandardMaterial({
      color: WALL_GREEN,
      roughness: 1,
      roughnessMap: tex.paint,
      vertexColors: true, // (smooth plaster: no relief to light, one texture fewer over half the picture)
    }),
  )
  const wallU = { tContact: { value: tex.wallAO }, uContact: { value: new THREE.Vector4(ax0, ay0, 1 / (ax1 - ax0), 1 / (ay1 - ay0)) } }
  wallMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, wallU)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec4 uContact;\nvarying vec2 vContactUv;')
      .replace(
        '#include <uv_vertex>',
`#include <uv_vertex>`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 roomP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          roomP = instanceMatrix * roomP;
        #endif
        vContactUv = (roomP.xy - uContact.xy) * uContact.zw;`,
      )
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tContact;\nvarying vec2 vContactUv;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        diffuseColor.rgb *= (0.97 + 0.06 * texture2D(roughnessMap, vRoughnessMapUv).r) * texture2D(tContact, vContactUv).r;`,
      )
  }
  wallMat.customProgramCacheKey = () => 'room.wall'

  // the boards: one profile (its V-joints: each long edge chamfered, a hairline slot between it and
  // the next, closed at the tongue), from deep in the gap behind the desk up to the rail, the contact
  // shade along the desk and in the joints in its colour; instanced across the wall
  const ph = P.pitch / 2
  // (plain plaster now: each strip flat, edge to edge)
  const boardProfile = [
    [-ph, 0, 1],
    [0, 0, 1],
    [ph, 0, 1],
  ]
  const dy = R.deskY
  const boardRows = [
    [dy - 140, 0.07],
    [dy - 6, 0.14],
    [dy - 1.5, 0.3],
    [dy + 0.5, 0.5],
    [dy + 3, 0.66],
    [dy + 9, 0.83],
    [dy + 26, 0.95],
    // (then every 60 mm or so up to the rail: no long thin triangles)
    ...Array.from({ length: 12 }, (_, k) => [dy + 70 + ((R.rail.y - 10 - dy - 70) * k) / 12, 1]),
    [R.rail.y - 10, 1],
    [R.rail.y, 1],
  ]
  const panelGeo = geo(
    sweep(
      boardProfile,
      () => boardRows,
      (a, b, s, o) => o.set(a, s, b),
      (na, nb, o) => o.set(na, 0, nb),
      (p, arc, s, o) => o.set((p[0] + ph) / P.pitch, s / 480),
    ),
  )
  // (beside the desk the wall runs down to the floor, with no desk to shade it)
  const sideRows = [[R.floorY, 0.8], [R.floorY + 50, 0.95], ...Array.from({ length: 13 }, (_, k) => [R.floorY + 120 + ((R.rail.y - 10 - R.floorY - 120) * k) / 13, 1]), [R.rail.y - 10, 1], [R.rail.y, 1]]
  const sideGeo = geo(
    sweep(
      boardProfile,
      () => sideRows,
      (a, b, s, o) => o.set(a, s, b),
      (na, nb, o) => o.set(na, 0, nb),
      (p, arc, s, o) => o.set((p[0] + ph) / P.pitch, s / 480),
    ),
  )
  const first = Math.ceil((-R.deskHalf - 300 - P.joint) / P.pitch)
  const last = Math.floor((R.deskHalf + 300 - P.joint) / P.pitch) - 1
  const behindDesk = (k) => P.joint + (k + 0.5) * P.pitch > R.desk.u0 && P.joint + (k + 0.5) * P.pitch < R.desk.u1
  let nBehind = 0
  for (let k = first; k <= last; k++) if (behindDesk(k)) nBehind++
  const panels = new THREE.InstancedMesh(panelGeo, wallMat, nBehind)
  panels.name = 'room.wall'
  panels.userData.takesShadow = true
  const sidePanels = new THREE.InstancedMesh(sideGeo, wallMat, last - first + 1 - nBehind)
  sidePanels.name = 'room.wall.side'
  sidePanels.userData.takesShadow = true
  {
    // (each board a hair out of line with the next, and its paint a touch lighter or darker)
    const m4 = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const c = new THREE.Color()
    const r = (k, s) => (Math.sin(k * 127.1 + s * 311.7) * 43758.5453) % 1
    let ia = 0
    let ib = 0
    for (let k = first; k <= last; k++) {
      q.setFromEuler(e.set(0, 0, 0))
      m4.compose(new THREE.Vector3(P.joint + (k + 0.5) * P.pitch, 0, face), q, new THREE.Vector3(1, 1, 1))
      const to = behindDesk(k) ? panels : sidePanels
      const i = behindDesk(k) ? ia++ : ib++
      to.setMatrixAt(i, m4)
      to.setColorAt(i, c.setScalar(1))
    }
    for (const o of [panels, sidePanels]) {
      o.instanceMatrix.needsUpdate = true
      o.instanceColor.needsUpdate = true
    }
  }

  // the plaster above the rail, as far back as the panelling is thick
  const railTop = R.rail.y + R.rail.h
  const plasterGeo = new THREE.PlaneGeometry(2 * R.deskHalf + 600, 2600, 20, 10)
  plasterGeo.translate(0, railTop + 1300, face - P.thick)
  {
    const p = plasterGeo.attributes.position
    const uv = plasterGeo.attributes.uv
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 120, p.getY(i) / 480)
    plasterGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(p.count * 3).fill(1), 3))
  }
  const plaster = mesh(plasterGeo, wallMat, 'room.plaster', { takes: true })

  // the oak rail: a picture ledge on the panelling's top: a cove under its lip, a rounded nose, a
  // flat top running back to the plaster (oak: the frame's)
  const rail = new THREE.Group() // (no rail on a plain wall)
  rail.name = 'room.rail'

  // the socket: a matt black double frame (soft edges, two round recesses, each with its pin holes
  // and earth clips); a plug in the left one, its cable down into the gap behind the desk
  const S = R.socket
  const plastic = mat(new THREE.MeshStandardMaterial({ color: 0x1d1e20, roughness: 0.46, envMapIntensity: 0.8 }))
  const steel = mat(new THREE.MeshStandardMaterial({ color: 0xc4c7cc, metalness: 1, roughness: 0.24 }))
  const cableMat = mat(new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.6 }))
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x050505 })
  materials.push(holeMat)
  const socket = new THREE.Group()
  socket.position.set(S.u, S.y, face)
  const socketMeshes = []
  {
    const sw = S.w - 3.2
    const sh = S.h - 3.2
    const rr = 5
    const shape = new THREE.Shape()
    shape.moveTo(-sw / 2 + rr, -sh / 2)
    shape.lineTo(sw / 2 - rr, -sh / 2)
    shape.quadraticCurveTo(sw / 2, -sh / 2, sw / 2, -sh / 2 + rr)
    shape.lineTo(sw / 2, sh / 2 - rr)
    shape.quadraticCurveTo(sw / 2, sh / 2, sw / 2 - rr, sh / 2)
    shape.lineTo(-sw / 2 + rr, sh / 2)
    shape.quadraticCurveTo(-sw / 2, sh / 2, -sw / 2, sh / 2 - rr)
    shape.lineTo(-sw / 2, -sh / 2 + rr)
    shape.quadraticCurveTo(-sw / 2, -sh / 2, -sw / 2 + rr, -sh / 2)
    const cx = S.w / 4
    for (const x of [-cx, cx]) {
      const h = new THREE.Path()
      h.absarc(x, 0, 21, 0, Math.PI * 2, true)
      shape.holes.push(h)
    }
    const plate = new THREE.ExtrudeGeometry(shape, { depth: 6.2, bevelEnabled: true, bevelThickness: 1.6, bevelSize: 1.6, bevelSegments: 2, curveSegments: 16 })
    plate.translate(0, 0, 1.6)
    socketMeshes.push(mesh(plate, plastic, 'room.socket', { cast: true }))
    // the recesses' floors, their pin holes and clips
    const floor = new THREE.Shape()
    floor.absarc(0, 0, 21.5, 0, Math.PI * 2, false)
    for (const x of [-9.5, 9.5]) {
      const h = new THREE.Path()
      h.absarc(x, 0, 2.4, 0, Math.PI * 2, true)
      floor.holes.push(h)
    }
    const floorGeo = new THREE.ShapeGeometry(floor, 20)
    const pinHole = new THREE.CircleGeometry(2.8, 12)
    const clip = new THREE.BoxGeometry(9, 1.1, 6)
    const floors = [-cx, cx].map((x) => floorGeo.clone().translate(x, 0, 1.4))
    const clips = [-cx, cx].flatMap((x) => [-19.9, 19.9].map((y) => clip.clone().translate(x, y, 4.8)))
    const holes = [-cx, cx].flatMap((x) => [-9.5, 9.5].map((d) => pinHole.clone().translate(x + d, 0, 0.9)))
    socketMeshes.push(mesh(mergeGeometries(floors), plastic, 'room.socketFloor'))
    socketMeshes.push(mesh(mergeGeometries(clips), steel, 'room.socketClips'))
    socketMeshes.push(mesh(mergeGeometries(holes), holeMat, 'room.socketHoles'))
    for (const g of [floorGeo, pinHole, clip, ...floors, ...clips, ...holes]) g.dispose()
    // the plug (an angled one: its cable leaves it downwards), and the cable
    const plug = new THREE.LatheGeometry(
      [
        [0, 1.4],
        [18.6, 1.4],
        [18.6, 9.2],
        [19.6, 10],
        [19.8, 12.4],
        [19.2, 13.3],
        [19.2, 14.8],
        [19.8, 15.6],
        [19.5, 19],
        [18.6, 22.4],
        [16.8, 24.8],
        [12.5, 26.4],
        [0, 27],
      ].map(([r, z]) => new THREE.Vector2(r, z)),
      32,
    )
    plug.rotateX(Math.PI / 2)
    plug.translate(-cx, 0, 0)
    const relief = new THREE.CylinderGeometry(4.8, 3.4, 15, 16, 1)
    relief.translate(-cx, -24, 17)
    socketMeshes.push(mesh(mergeGeometries([plug.toNonIndexed(), relief.toNonIndexed()]), plastic, 'room.plug', { cast: true }))
    plug.dispose()
    relief.dispose()
    const below = R.deskY - S.y
    const path = new THREE.CatmullRomCurve3(
      [
        [-cx, -30, 17],
        [-cx + 0.3, -46, 15],
        [-cx + 0.8, -62, 10.5],
        [-cx + 1.2, below + 12, 6.2],
        [-cx + 1.5, below + 3, 3.4],
        [-cx + 1.6, below - 8, 3],
        [-cx + 1.6, below - 60, 3],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    )
    socketMeshes.push(mesh(new THREE.TubeGeometry(path, 48, 2.4, 8, false), cableMat, 'room.cable', { cast: true }))
  }
  socket.add(...socketMeshes)

  // ---- the shelf: its parts in its own frame (x from its left end, y up from its underside, z
  // out of the wall). An oak plank, nothing holding it up that shows. On it, from the left: two
  // books lying flat, a snake plant in a glazed pot on them; a row of clothbound books, the last
  // leaning on the rest; a print in a thin frame with a wide mount and the calendar, both leaning
  // back on the wall; three sticky notes on its front edge; under its right end a brass hook in
  // the wall, the badge hanging from it. (A warm spot lights it and casts its shadows: scene.js)
  const B = R.board
  const TH = B.thick
  const D = B.deep
  const zc = 1 // (the wall's face, a hair off it: where what hangs against the wall lies)
  const board = new THREE.Group()
  board.position.set(B.u - B.w / 2, B.y0, face)
  const boardMeshes = []
  const woodMat = mat(new THREE.MeshStandardMaterial({ map: canvasTex(plankCanvas()), roughness: 0.6, metalness: 0 }))
  {
    // (its grain along its length on every face that shows: the box's own UVs stretched to it)
    const g = new RoundedBoxGeometry(B.w + 24, TH, D, 4, 2.2).translate(B.w / 2, TH / 2, D / 2)
    const p = g.attributes.position
    const uv = g.attributes.uv
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 620, (p.getZ(i) + p.getY(i) * 0.6) / 170)
    boardMeshes.push(mesh(g, woodMat, 'room.shelf', { cast: true, takes: true }))
  }
  const brass = mat(new THREE.MeshStandardMaterial({ color: 0xc6a36a, metalness: 1, roughness: 0.32 }))
  // the hook the badge hangs from: a peg out of the wall, a ball on its end
  {
    const [hx, hy] = B.badge
    const peg = new THREE.CylinderGeometry(1.5, 1.5, 12, 12).rotateX(Math.PI / 2).translate(hx, hy, 6)
    const ball = new THREE.SphereGeometry(2.7, 16, 12).translate(hx, hy, 12.4)
    boardMeshes.push(mesh(mergeGeometries([peg, ball]), brass, 'room.hook', { cast: true }))
    peg.dispose()
    ball.dispose()
  }
  // the books: clothbound, each two boards and a spine round a block of pages (the boards a little
  // proud of the pages all round), its spine printed (bookCanvas: one picture for them all).
  // Standing in a row, the last leaning on the rest; two lying flat at the left, under the plant
  const BOOKS = [
    // [thickness, height, depth, cloth, ink, title, author, lying]
    [31, 226, 158, '#1f3a34', '#d9c79a', 'A FIELD GUIDE TO DUSK', 'H. Marlow', 1],
    [24, 204, 150, '#b7b0a0', '#2a2a2a', 'Small Machines', 'I. Okafor', 1],
    [27, 212, 146, '#27364f', '#e6dcc3', 'NOTES ON LIGHT', 'R. Vance'],
    [35, 222, 150, '#7d2e23', '#e9d9b0', 'CARTOGRAPHY', 'Vol. II'],
    [23, 198, 140, '#c58a2e', '#2a2114', 'How Rovers Think', 'S. Anand'],
    [28, 208, 144, '#22332a', '#d9c79a', 'THE LONG EVENING', 'K. Desrosiers', 0, 0.16],
  ]
  let stackTop = TH
  {
    const atlas = bookCanvas(BOOKS, font)
    const bookMat = mat(new THREE.MeshStandardMaterial({ map: canvasTex(atlas.canvas), roughness: 0.82 }))
    const parts = []
    /** A box whose every face shows one spot of the picture (uv), but face `f` a rectangle of it. */
    const part = (w, h, d, x, y, z, spot, f = -1, rect = null, turn = false) => {
      const g = new THREE.BoxGeometry(w, h, d).toNonIndexed().translate(x + w / 2, y + h / 2, z + d / 2)
      const uv = g.attributes.uv
      for (let i = 0; i < uv.count; i++) {
        if (Math.floor(i / 6) === f) {
          // (the face's own u, v in 0..1; turned: a quarter turn, for a spine read along the shelf)
          const a = turn ? uv.getY(i) : uv.getX(i)
          const b = turn ? 1 - uv.getX(i) : uv.getY(i)
          uv.setXY(i, rect[0] + a * (rect[2] - rect[0]), rect[1] + b * (rect[3] - rect[1]))
        } else uv.setXY(i, spot[0], spot[1])
      }
      return g
    }
    const BD = 2.4 // (a board's thickness)
    const IN = 3.2 // (how far the pages stand back from the boards' edges)
    /** One book, standing at the origin: x its thickness, y its height, z its depth (its spine at z = d). */
    const book = (i) => {
      const [t, h, d] = BOOKS[i]
      const { spine, cloth, pages } = atlas.at[i]
      return [
        part(BD, h, d, 0, 0, 0, cloth),
        part(BD, h, d, t - BD, 0, 0, cloth),
        part(t, h, BD, 0, 0, d - BD, cloth, 4, spine),
        // (the pages: their edges on top, underneath and at the fore-edge)
        part(t - 2 * BD, h - 2 * IN, d - BD - IN, BD, IN, IN, [pages[0], pages[1]], 2, pages),
      ]
    }
    // the two lying flat, the second a little askew on the first
    let y = TH
    BOOKS.forEach((b, i) => {
      if (!b[7]) return
      const [t, h, d] = b
      const skew = i ? 0.07 : -0.02
      for (const g of book(i)) {
        // (laid on its side: its height along the shelf, its thickness up, its spine to the room)
        g.rotateZ(Math.PI / 2).translate(h, 0, 0).translate(-h / 2, 0, -d / 2).rotateY(skew).translate(B.stack + 113 + (i ? 6 : 0), y, 12 + d / 2 + (i ? 5 : 0))
        parts.push(g)
      }
      y += t
    })
    stackTop = y
    // the row standing
    let x = B.books
    BOOKS.forEach((b, i) => {
      if (b[7]) return
      const [t, h, d, , , , , , lean = 0] = b
      const x0 = x + Math.sin(lean) * h
      for (const g of book(i)) parts.push(g.rotateZ(lean).translate(x0, TH, 10 + (i % 3) * 2.5))
      x = x0 + t / Math.cos(lean) + 0.5
    })
    boardMeshes.push(mesh(mergeGeometries(parts), bookMat, 'room.books', { cast: true, takes: true }))
    for (const g of parts) g.dispose()
  }
  // the plant: a snake plant in a glazed pot on its saucer, on the two books. Its blades stand out
  // of dark soil, each cupped and a little twisted, tapering to a point, banded across in two
  // greens with a yellow line down each edge (leafCanvas)
  {
    const [px, pz] = B.plant
    const y0 = stackTop
    const prof = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y))
    const pot = new THREE.LatheGeometry(
      prof([
        [0, 3],
        [27, 3],
        [34, 4.5],
        [38.5, 9],
        [41, 20],
        [43, 62],
        [43.6, 76],
        [44.6, 79],
        [44.2, 81.5],
        [41.6, 81.5],
        [40.8, 76],
        [0, 76],
      ]),
      56,
    ).translate(px, y0, pz)
    const saucer = new THREE.LatheGeometry(
      prof([
        [0, 0],
        [40, 0],
        [47, 1.6],
        [50, 6.5],
        [48.6, 7],
        [45.5, 3.4],
        [0, 3.4],
      ]),
      56,
    ).translate(px, y0, pz)
    // (stoneware, an off-white glaze with a little speckle in it)
    const glaze = mat(new THREE.MeshPhysicalMaterial({ color: 0xe6e1d6, roughness: 0.36, clearcoat: 0.5, clearcoatRoughness: 0.3, map: canvasTex(speckleCanvas()) }))
    boardMeshes.push(mesh(mergeGeometries([pot, saucer]), glaze, 'room.pot', { cast: true, takes: true }))
    pot.dispose()
    saucer.dispose()
    const soil = new THREE.CircleGeometry(40.6, 40).rotateX(-Math.PI / 2).translate(px, y0 + 73.5, pz)
    boardMeshes.push(mesh(soil, mat(new THREE.MeshStandardMaterial({ color: 0x1f1a16, roughness: 1 })), 'room.soil', { takes: true }))
    let seed = 11
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const blades = []
    const N = 15
    for (let k = 0; k < N; k++) {
      // (the middle ones tallest and upright; the outer ones shorter, leaning out)
      const out = k / (N - 1)
      const H = (198 - 96 * out) * (0.86 + rnd() * 0.28)
      const w = 30 + rnd() * 12 - 6 * out
      const yaw = k * 2.39996 + rnd() * 0.6
      const lean = 0.03 + out * 0.3 + rnd() * 0.06
      const curl = 0.02 + rnd() * 0.07 + out * 0.05
      const twist = (rnd() - 0.5) * 1.1
      const rad = 4 + out * 17
      const g = new THREE.PlaneGeometry(w, H, 6, 18).translate(0, H / 2, 0)
      const p = g.attributes.position
      for (let i = 0; i < p.count; i++) {
        const s = Math.min(1, Math.max(0, p.getY(i) / H))
        const u = p.getX(i) / (w / 2)
        // (narrow at its foot, widest a third up, a point at its tip; cupped; wavy at its edges)
        const f = (0.5 + 0.5 * Math.min(1, s * 2.6)) * Math.pow(1 - s, 0.5) * (1 + 0.05 * Math.sin(s * 13 + k))
        const x = p.getX(i) * f
        const z = u * u * 7.5 * f + s * s * H * curl
        const a = twist * s
        p.setXYZ(i, x * Math.cos(a) - z * Math.sin(a) * 0.35, p.getY(i), z + x * Math.sin(a) * 0.5)
      }
      g.rotateX(lean).rotateY(yaw).translate(px + Math.sin(yaw) * rad, y0 + 72, pz + Math.cos(yaw) * rad)
      g.computeVertexNormals()
      blades.push(g)
    }
    const leafMat = mat(new THREE.MeshStandardMaterial({ map: canvasTex(leafCanvas()), side: THREE.DoubleSide, roughness: 0.42 }))
    boardMeshes.push(mesh(mergeGeometries(blades), leafMat, 'room.plant', { cast: true, takes: true }))
    for (const g of blades) g.dispose()
  }

  // ---- what is pinned up: paper (its back plain where a curl shows it), each with a soft shadow
  // on the cork under it (moving with it)
  const paperMat = (map, back, layer, { roughness = 0.84, alphaTest = 0 } = {}) => {
    const m = mat(
      new THREE.MeshStandardMaterial({
        map,
        color: map ? 0xffffff : back,
        roughness,
        side: THREE.DoubleSide,
        normalMap: tex.paperN,
        normalScale: new THREE.Vector2(0.5, 0.5),
        alphaTest,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2 - 2 * layer,
      }),
    )
    const u = { uBack: { value: new THREE.Color(back) } }
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u)
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uBack;')
        .replace('#include <map_fragment>', '#include <map_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb = uBack;')
    }
    m.customProgramCacheKey = () => 'room.paper'
    return m
  }
  // (0.35 mm off the cork and pulled a little nearer: from the seat, 4 m off, the depth buffer's steps
  // are about 0.2 mm, and less made the shadows flicker against the cork; every sheet is further out)
  const shadeMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthWrite: false, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })
  materials.push(shadeMat)
  const shadeOf = (parent, x, y, z, rot, w, h, soft, a, dy) => {
    const g = geo(shadeGeometry())
    setShade(g, w, h, soft, a, dy)
    const m = new THREE.Mesh(g, shadeMat)
    m.position.set(x, y, z)
    m.rotation.z = rot
    m.name = 'room.shade'
    parent.add(m)
    return m
  }
  const items = []
  const active = new Set()

  // a sheet stuck (or taped) along its top: a tap lifts its lower edge to `peak` (radians at its
  // tip) and lets it fall back, as paper does: a little past its rest and back
  const peeler = (apply, rest, peak) => {
    const a = { phi: rest, vel: 0, t: -1, from: rest }
    a.tap = () => {
      if (a.t >= 0) return
      a.t = 0
      a.from = a.phi
      active.add(a)
    }
    a.step = (dt) => {
      if (a.t >= 0) {
        a.t += dt
        const k = Math.min(1, a.t / 0.2)
        a.phi = a.from + (peak - a.from) * k * k * (3 - 2 * k)
        if (a.t >= 0.32) {
          a.t = -1
          a.vel = 0
        }
      } else {
        for (let n = 0; n < 4; n++) {
          const h = dt / 4
          a.vel += (-170 * (a.phi - rest) - 15 * a.vel) * h
          a.phi = Math.max(0.01, a.phi + a.vel * h)
        }
        if (Math.abs(a.phi - rest) < 2e-4 && Math.abs(a.vel) < 3e-3) {
          a.phi = rest
          a.vel = 0
          apply(rest)
          return false
        }
      }
      apply(a.phi)
      return true
    }
    return a
  }

  // the sticky notes: stuck by their glued band to the shelf's front edge, hanging below it, their
  // lower edges curling out, a corner more than the other; a tap peels one up
  const NOTE = 76
  const BAND = 17
  notes.forEach((n, i) => {
    const [cx, rot] = B.notes[i % B.notes.length]
    const g = sheet(NOTE, NOTE, 6, 14)
    const m = mesh(g, paperMat(canvasTex(noteCanvas(n.color, n.lines, handFont, 11 + i)), n.color, 2), 'room.note', { cast: true, takes: true })
    m.position.set(cx, TH - 3, D + 0.6 + 0.1 * i)
    m.rotation.z = rot
    const tw = [0.28, -0.32, 0.18][i % 3]
    const apply = (phi) => bend(g, (s, x) => (s < BAND ? 0 : (phi * (1 + (tw * x) / (NOTE / 2)) * (s - BAND)) / (NOTE - BAND)))
    const rest = [0.17, 0.12, 0.2][i % 3]
    apply(rest)
    const a = peeler(apply, rest, 0.95)
    items.push({ name: 'note', meshes: [m], tap: a.tap })
    board.add(m)
    boardMeshes.push(m)
  })

  // the print: the postcard in a wide off-white mount, in a thin black frame leaning back on the
  // wall (its mount a card's thickness proud of the print: a shadow line round it)
  {
    const W = 196
    const H = 152
    const bar = 6
    const dp = 16
    const mount = 26
    const fr = new THREE.Group()
    fr.position.set(B.postcard, TH, 44)
    fr.rotation.x = -0.15
    const bars = [
      new THREE.BoxGeometry(W, bar, dp).translate(0, H - bar / 2, dp / 2),
      new THREE.BoxGeometry(W, bar, dp).translate(0, bar / 2, dp / 2),
      new THREE.BoxGeometry(bar, H - 2 * bar, dp).translate(-W / 2 + bar / 2, H / 2, dp / 2),
      new THREE.BoxGeometry(bar, H - 2 * bar, dp).translate(W / 2 - bar / 2, H / 2, dp / 2),
      new THREE.BoxGeometry(W - 2, H - 2, 2).translate(0, H / 2, 1),
    ]
    const frame = mesh(mergeGeometries(bars), mat(new THREE.MeshStandardMaterial({ color: 0x161617, roughness: 0.42 })), 'room.frame', { cast: true, takes: true })
    for (const g of bars) g.dispose()
    // (the mount: a card with a window cut in it, its bevel white)
    const iw = W - 2 * bar
    const ih = H - 2 * bar
    const mw = iw - 2 * mount
    const mh = ih - 2 * mount
    const card = new THREE.Shape()
    card.moveTo(-iw / 2, -ih / 2).lineTo(iw / 2, -ih / 2).lineTo(iw / 2, ih / 2).lineTo(-iw / 2, ih / 2).closePath()
    const hole = new THREE.Path()
    hole.moveTo(-mw / 2, -mh / 2).lineTo(-mw / 2, mh / 2).lineTo(mw / 2, mh / 2).lineTo(mw / 2, -mh / 2).closePath()
    card.holes.push(hole)
    const mountGeo = new THREE.ExtrudeGeometry(card, { depth: 1.6, bevelEnabled: false }).translate(0, H / 2, dp - 5.2)
    const mountMesh = mesh(mountGeo, mat(new THREE.MeshStandardMaterial({ color: 0xefece4, roughness: 0.9 })), 'room.mount', { cast: true, takes: true })
    const cardMat = mat(new THREE.MeshStandardMaterial({ map: canvasTex(postcardCanvas(font)), roughness: 0.6 }))
    const print = mesh(new THREE.PlaneGeometry(mw + 4, mh + 4).translate(0, H / 2, dp - 5.4), cardMat, 'room.postcard', { takes: true })
    fr.add(frame, mountMesh, print)
    board.add(fr)
    boardMeshes.push(frame, mountMesh, print)
  }

  // a pendulum: what hangs from one pin (x0: the pin's x on the board; set(q): turn it by q about
  // the pin, 0 at rest); a tap swings it away from the side tapped; w0: its own frequency (rad/s),
  // zeta: its damping
  let side = 1
  const pendulum = (x0, set, w0 = 10, zeta = 0.2, kick = 1.4) => {
    const a = { q: 0, w: 0 }
    const p = new THREE.Vector3()
    a.tap = (hit) => {
      const dx = hit?.point ? board.worldToLocal(p.copy(hit.point)).x - x0 : 0
      side = Math.abs(dx) > 3 ? -Math.sign(dx) : -side
      // (taps in a row swing it harder, but never round its pin)
      a.w = Math.max(-2.5 * kick, Math.min(2.5 * kick, a.w + side * kick))
      active.add(a)
    }
    a.step = (dt) => {
      for (let n = 0; n < 6; n++) {
        const h = dt / 6
        a.w += (-w0 * w0 * Math.sin(a.q) - 2 * zeta * w0 * a.w) * h
        a.q += a.w * h
      }
      if (Math.abs(a.q) < 2e-4 && Math.abs(a.w) < 4e-3) {
        a.q = a.w = 0
        set(0)
        return false
      }
      set(a.q)
      return true
    }
    return a
  }

  // the calendar: a wire-bound pad standing on the shelf, leaning back on the wall; this month on
  // top, next month under it. A tap turns the page up over the binding to show next month, and
  // lets it fall
  {
    const CW = 130
    const CH = 182
    const cal = new THREE.Group()
    const yb = -12 // (the binding's line, below the pad's top)
    // (its foot on the shelf, out from the wall; its top back against it)
    const stand = new THREE.Group()
    stand.position.set(B.calendar, TH, 66)
    stand.rotation.x = -0.24
    cal.position.set(0, CH - (yb + 2.2), 0)
    stand.add(cal)
    const zb = 4.4
    const lean = (s) => (s < 40 ? -0.05 : s < 70 ? -0.05 * (1 - (s - 40) / 30) : 0)
    // (every sheet of the pad on the same grid, half a millimetre apart: their depth offsets then
    // agree everywhere, and the back never shows through the front where its slope differs)
    const page = (map, back, layer, z) => {
      const g = sheet(CW, CH, 6, 24)
      const m = mesh(g, paperMat(map, back, layer, { alphaTest: map ? 0.5 : 0, roughness: 0.82 }), 'room.calendar', { cast: true, takes: true })
      m.position.set(0, yb + 2.2, zb + z)
      bend(g, lean)
      cal.add(m)
      return m
    }
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const backCard = page(null, 0x8e887d, 0, -0.5)
    const under = page(canvasTex(calendarCanvas(next, null, font, handFont, 'then do it again', 78)), 0xf2f0ea, 1, 0)
    const top = page(canvasTex(calendarCanvas(now, now, font, handFont, 'ship something small, every day', 77)), 0xf2f0ea, 2, 0.5)
    // the binding: wire loops through the pages' slots, round their top edge
    const loopGeo = geo(new THREE.TorusGeometry(3.1, 0.42, 6, 14, Math.PI * 2 - 0.7).rotateY(Math.PI / 2))
    const loops = new THREE.InstancedMesh(loopGeo, steel, 14)
    {
      const m4 = new THREE.Matrix4()
      let i = 0
      for (let k = 0; k < 15; k++) {
        if (k === 7) continue
        loops.setMatrixAt(i++, m4.makeTranslation(-58.5 + 8.357 * k, yb, zb))
      }
    }
    loops.castShadow = true
    loops.name = 'room.binding'
    cal.add(loops)
    board.add(stand)
    // (the turn: th, the page's angle at the binding; while it turns its free end lags, and gravity
    // droops it; it falls back onto the pad, bounces a little and lies still)
    const G = top.geometry
    const f = { th: 0, prev: 0, vel: 0, phase: null, t: 0, from: 0 }
    const TOP = 2.55
    const shape = (dt) => {
      const v = dt > 0 ? (f.th - f.prev) / dt : 0
      f.prev = f.th
      const droop = 0.3 * Math.sin(f.th)
      const lag = Math.max(-0.6, Math.min(0.6, 0.05 * v))
      bend(G, (s) => Math.max(-0.1, Math.min(Math.PI, lean(s) + (f.th > 0 ? f.th - ((droop + lag) * s) / CH : 0))))
    }
    f.tap = () => {
      if (f.phase === 'hold') {
        f.phase = 'down'
        f.t = 0
        f.from = f.th
      } else if (!f.phase) {
        f.phase = 'up'
        f.t = 0
        active.add(f)
      }
    }
    f.step = (dt) => {
      f.t += dt
      if (f.phase === 'up') {
        const k = Math.min(1, f.t / 0.55)
        f.th = TOP * (1 - (1 - k) ** 3)
        if (k >= 1) {
          f.phase = 'hold'
          f.t = 0
        }
      } else if (f.phase === 'hold') {
        if (f.t >= 1.6) {
          f.phase = 'down'
          f.t = 0
          f.from = f.th
        }
      } else if (f.phase === 'down') {
        const k = Math.min(1, f.t / 0.42)
        f.th = f.from * (1 - k * k)
        if (k >= 1) {
          f.phase = 'settle'
          f.th = 0
          f.vel = 3
        }
      } else if (f.phase === 'settle') {
        // (bounced off the pad: up a little, and down again; each bounce a quarter of the last)
        f.vel -= 30 * dt
        f.th += f.vel * dt
        if (f.th <= 0) {
          f.th = 0
          f.vel = -f.vel * 0.25
          if (f.vel < 0.4) {
            f.phase = null
            f.vel = 0
            f.prev = 0
            bend(G, lean)
            return false
          }
        }
      }
      shape(dt)
      return true
    }
    items.push({ name: 'calendar', meshes: [top, under, backCard, loops], tap: f.tap })
    boardMeshes.push(top, under, backCard, loops)
  }

  // the badge's own soft shadow on the wall (the card hangs ~5 mm off it, from the hook; scene.js
  // hangs the badge: move this with it if it ever moves)
  const badgeShade = shadeOf(board, B.badge[0] + 0.3, B.badge[1] - 1, zc + 0.35, 0.06, 56, 85, [3, 3, 3.5, 3], 0.32, 3.5)

  board.add(...boardMeshes.filter((o) => !o.parent))
  group.add(desk, legs, floor, skirting, panels, sidePanels, plaster, rail, socket, board)
  group.updateMatrixWorld(true)

  const onBoard = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(board.matrixWorld)
  const wallMeshes = [panels, sidePanels, plaster, ...socketMeshes]
  return {
    group,
    desk,
    /** The panelling (an InstancedMesh, a board an instance), and every part of the wall. */
    wall: panels,
    wallMeshes,
    floor,
    boardMeshes,
    /** The badge's hook (world), and which way is out of the wall (world). */
    badgePin: onBoard(B.badge[0], B.badge[1], zc),
    boardOut: new THREE.Vector3(0, 0, 1).transformDirection(board.matrixWorld),
    /** The shelf's middle, with what stands on it and hangs under it (world), and that's size (mm). */
    boardCenter: onBoard(B.w / 2, (B.h - 150) / 2, D / 2),
    boardSize: [B.w + 30, B.h + 150],
    badgeShade,
    /** What a tap moves: { name, meshes, tap(hit) } (hit: the raycast's intersection). */
    items,
    /**
     * Something else hanging from one pin (the badge): pin (world), set(q) turns it by q (radians,
     * about boardOut through the pin, 0 at rest). Returns { tap(hit) }; update(dt) swings it.
     */
    hang(pin, set, w0 = 9, zeta = 0.2, kick = 1.3) {
      return pendulum(board.worldToLocal(pin.clone()).x, set, w0, zeta, kick)
    },
    /** Advance what moves (dt: s); true while anything still does (nothing moves when idle). */
    update(dt) {
      if (!active.size) return false
      const h = Math.min(dt, 0.05)
      for (const a of active) if (!a.step(h)) active.delete(a)
      return active.size > 0
    },
    /** The lit surfaces (for the ember's and the flame's light). */
    litMaterials: lit,
    dispose() {
      // (the instanced meshes' own buffers: the panelling, the pins, the binding)
      group.traverse((o) => o.isInstancedMesh && o.dispose())
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
      for (const t of textures) t.dispose()
    },
  }
}

/** A little dust where a surface faces up (its vertex colour lighter and greyer): k, how much. */

/** The floor's boards (1120 mm square, tiling): eight rows of oak, their ends staggered. */
function floorCanvas() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const rowH = 64
  for (let r = 0; r < 8; r++) {
    let x = -rnd() * 300
    while (x < 512) {
      const len = 260 + rnd() * 260
      const l = 50 + rnd() * 7
      g.fillStyle = `hsl(${29 + rnd() * 5}, ${34 + rnd() * 8}%, ${l}%)`
      for (const dx of [0, -512, 512]) g.fillRect(x + dx, r * rowH, len, rowH)
      // the grain: a few faint long streaks
      for (let k = 0; k < 7; k++) {
        g.fillStyle = `rgba(70,45,22,${0.03 + rnd() * 0.05})`
        const gy = r * rowH + 3 + rnd() * (rowH - 6)
        const gx = x + rnd() * len * 0.5
        for (const dx of [0, -512, 512]) g.fillRect(gx + dx, gy, len * (0.3 + rnd() * 0.5), 1)
      }
      // the board's end
      g.fillStyle = 'rgba(40,26,14,0.5)'
      for (const dx of [0, -512, 512]) g.fillRect(x + len - 1 + dx, r * rowH, 1, rowH)
      x += len
    }
    g.fillStyle = 'rgba(40,26,14,0.55)'
    g.fillRect(0, r * rowH, 512, 1)
  }
  return c
}

/** A small steady random source. */
function rng(seed) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

/**
 * The shelf's oak (1024 x 256, along the grain): a warm ground, the growth rings' long lines
 * drifting and closing into a few cathedral arches, fine pores, a soft light and dark across it.
 */
function plankCanvas() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 256
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#a87c4f')
  grad.addColorStop(0.5, '#b58a5a')
  grad.addColorStop(1, '#a47648')
  g.fillStyle = grad
  g.fillRect(0, 0, 1024, 256)
  const r = rng(41)
  // the rings: lines that wander together, pinched into arches at two places
  const arch = [[260, 96], [760, 170]]
  for (let i = 0; i < 46; i++) {
    const y0 = (i / 46) * 256 + (r() - 0.5) * 3
    g.strokeStyle = `rgba(84,52,24,${0.1 + r() * 0.2})`
    g.lineWidth = 0.6 + r() * 1.5
    g.beginPath()
    for (let x = -8; x <= 1032; x += 8) {
      let y = y0 + Math.sin(x / 170 + 1.3) * 5 + Math.sin(x / 61 + i * 0.4) * 1.2
      for (const [ax, ay] of arch) {
        const d = y0 - ay
        y += (d * 0.75 * 60 * 60) / ((x - ax) * (x - ax) * 0.02 + 60 * 60 + d * d * 6) - 0
      }
      g.lineTo(x, y)
    }
    g.stroke()
  }
  // the pores: short dark dashes along the grain
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(70,42,18,${0.06 + r() * 0.16})`
    g.fillRect(r() * 1024, r() * 256, 3 + r() * 9, 0.7)
  }
  // light and dark, slowly
  for (let i = 0; i < 9; i++) {
    const x = r() * 1024
    const w = 120 + r() * 260
    const lg = g.createLinearGradient(x, 0, x + w, 0)
    const col = r() < 0.5 ? '255,226,180' : '70,40,14'
    lg.addColorStop(0, `rgba(${col},0)`)
    lg.addColorStop(0.5, `rgba(${col},0.07)`)
    lg.addColorStop(1, `rgba(${col},0)`)
    g.fillStyle = lg
    g.fillRect(x, 0, w, 256)
  }
  return c
}

/**
 * The books' picture (2048 x 1024): each one's spine upright (4 px a mm: its cloth, a little darker
 * to its edges and worn pale at its head and foot, two bands, its title down it, the author at its
 * foot), a patch of its plain cloth, and one strip of page edges. Returns { canvas, at: [{ spine:
 * [u0, v0, u1, v1], cloth: [u, v], pages: [u0, v0, u1, v1] }] }.
 */
function bookCanvas(books, font) {
  const W = 2048
  const H = 1024
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  g.fillStyle = '#888'
  g.fillRect(0, 0, W, H)
  const r = rng(5)
  const K = 4
  const uvOf = (x, y) => [x / W, 1 - y / H]
  // the page edges: cream, fine lines across the strip's width (sheets), a few darker (signatures)
  const PX = 1700
  g.fillStyle = '#e4dccb'
  g.fillRect(PX, 0, 340, 200)
  for (let x = PX; x < PX + 340; x += 1) {
    g.fillStyle = `rgba(120,104,78,${r() < 0.12 ? 0.22 : 0.04 + r() * 0.07})`
    g.fillRect(x, 0, 1, 200)
  }
  const pages = [...uvOf(PX + 4, 196), ...uvOf(PX + 336, 4)]
  const at = []
  let x = 0
  books.forEach(([t, h, , cloth, ink, title, author], i) => {
    const w = t * K
    const hh = h * K
    // the cloth: its colour, darker to the spine's edges (it is a little round), its weave
    g.fillStyle = cloth
    g.fillRect(x, 0, w + 44, hh)
    const sh = g.createLinearGradient(x, 0, x + w, 0)
    sh.addColorStop(0, 'rgba(0,0,0,0.28)')
    sh.addColorStop(0.22, 'rgba(0,0,0,0)')
    sh.addColorStop(0.78, 'rgba(0,0,0,0)')
    sh.addColorStop(1, 'rgba(0,0,0,0.3)')
    g.fillStyle = sh
    g.fillRect(x, 0, w, hh)
    for (let k = 0; k < w * hh * 0.05; k++) {
      g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.06)'
      g.fillRect(x + r() * (w + 44), r() * hh, 1 + r() * 2, 1)
    }
    // worn at its head and foot
    for (const y0 of [0, hh - 14]) {
      const wg = g.createLinearGradient(0, y0, 0, y0 + 14)
      wg.addColorStop(y0 ? 1 : 0, 'rgba(255,244,220,0.2)')
      wg.addColorStop(y0 ? 0 : 1, 'rgba(255,244,220,0)')
      g.fillStyle = wg
      g.fillRect(x, y0, w, 14)
    }
    // two bands, the title down the spine, the author at its foot
    g.fillStyle = ink
    g.globalAlpha = 0.85
    g.fillRect(x + 4, 50, w - 8, 2.5)
    g.fillRect(x + 4, hh - 132, w - 8, 2.5)
    g.save()
    g.translate(x + w / 2, 84)
    g.rotate(Math.PI / 2)
    const serif = i % 2 === 0
    const size = Math.min(w * 0.5, 46)
    g.font = `${serif ? 600 : 650} ${size}px ${serif ? "'Iowan Old Style', Palatino, Georgia, serif" : font}`
    g.textBaseline = 'middle'
    g.letterSpacing = serif ? '2px' : '0px'
    const maxW = hh - 84 - 160
    let tt = title
    while (g.measureText(tt).width > maxW && tt.length > 3) tt = tt.slice(0, -1)
    g.fillText(tt, 0, 2)
    g.restore()
    g.save()
    g.translate(x + w / 2, hh - 116)
    g.rotate(Math.PI / 2)
    g.font = `500 ${Math.min(w * 0.3, 24)}px ${font}`
    g.textBaseline = 'middle'
    g.globalAlpha = 0.7
    let aa = author
    while (g.measureText(aa).width > 96 && aa.length > 3) aa = aa.slice(0, -1)
    g.fillText(aa, 0, 1)
    g.restore()
    g.globalAlpha = 1
    at.push({ spine: [...uvOf(x + 1, hh - 1), ...uvOf(x + w - 1, 1)], cloth: uvOf(x + w + 24, hh / 2), pages })
    x += w + 48
  })
  return { canvas: c, at }
}

/** A snake plant's blade (128 x 512, its foot at the bottom): two greens in ragged bands across it, a yellow line down each edge. */
function leafCanvas() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 512
  const g = c.getContext('2d')
  g.fillStyle = '#5f7f62'
  g.fillRect(0, 0, 128, 512)
  const r = rng(23)
  for (let y = 0; y < 512; ) {
    const h = 5 + r() * 15
    g.fillStyle = `rgba(30,62,42,${0.55 + r() * 0.4})`
    g.beginPath()
    g.moveTo(0, y)
    for (let x = 0; x <= 128; x += 8) g.lineTo(x, y + Math.sin(x / 14 + y) * 2.4 + (r() - 0.5) * 3)
    for (let x = 128; x >= 0; x -= 8) g.lineTo(x, y + h + Math.sin(x / 11 + y * 1.3) * 2.6 + (r() - 0.5) * 3)
    g.fill()
    y += h + 5 + r() * 13
  }
  // (darker down its middle: the fold)
  const mid = g.createLinearGradient(0, 0, 128, 0)
  mid.addColorStop(0, 'rgba(0,0,0,0)')
  mid.addColorStop(0.5, 'rgba(8,28,16,0.34)')
  mid.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = mid
  g.fillRect(0, 0, 128, 512)
  for (const [x0, x1] of [[0, 11], [117, 128]]) {
    const e = g.createLinearGradient(x0, 0, x1, 0)
    e.addColorStop(x0 ? 0 : 1, 'rgba(206,190,104,0)')
    e.addColorStop(x0 ? 1 : 0, 'rgba(206,190,104,0.95)')
    g.fillStyle = e
    g.fillRect(x0, 0, 11, 512)
  }
  return c
}

/** A glaze's speckle (128 square, tiling well enough): off-white, a few small iron spots. */
function speckleCanvas() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, 128, 128)
  const r = rng(77)
  for (let i = 0; i < 130; i++) {
    g.fillStyle = `rgba(96,74,52,${0.12 + r() * 0.3})`
    g.beginPath()
    g.arc(r() * 128, r() * 128, 0.4 + r() * 1.1, 0, 7)
    g.fill()
  }
  return c
}
