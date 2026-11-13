// The room round the still life: the matte white desk, the wall behind it and, on the wall, a cork
// board. The wall is an accent wall: vertical tongue-and-groove panelling (V-jointed boards, each its
// own stretch of brushed eggshell paint and a hair out of line with the next) painted a deep bottle
// green, capped by a slim oak picture rail, the plaster above it the same green. Its face stands a few
// millimetres behind the desk's back edge, so the two meet in a dark shadow gap; low on the right a
// black double socket, a plug in it, its cable running down into the gap.
// The board: thick natural cork in a bevelled oak frame (mitred, the grain turning at each corner),
// hung a little off the panelling. On it: the three handwritten sticky notes, a wire-bound calendar
// of the visitor's own month (today ringed in red marker) hanging from a pin, the pin the ID badge
// hangs from, a risograph postcard held by washi tape, a ticket stub hanging by its corner, a pencil
// sketch and a receipt in a brass bulldog clip, spare pins, old pin holes. A tap peels a note's
// lower edge up and lets it fall, turns the calendar to next month and back, swings what hangs from
// one pin (room.items, room.update).
// Frame: the view's own axes (layout.js): x across the picture (u), z down it (v, towards the
// viewer), y up; the desk's top at y = ROOM.deskY (the felt mat's top, where everything rests, is
// y = 0: the mat is that much thick). On the board: x from its left, y from its bottom, z out of it.
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { bakeRoom } from './roomTex.js'
import { noteCanvas, calendarCanvas, postcardCanvas, ticketCanvas, sketchCanvas, receiptCanvas, tapeCanvas } from './roomPaper.js'

export const ROOM = {
  deskY: -3,
  wallV: -470, // (the desk's back edge; the panelling's face is panel.gap behind it)
  deskFront: 460,
  deskHalf: 1700, // (the desk's half width: its ends never in the picture)
  deskThick: 28,
  // the panelling: V-jointed boards `pitch` wide and `thick` on the wall (the plaster above the rail
  // that much further back), their joints at x = joint + k pitch, their face `gap` behind wallV
  panel: { pitch: 120, joint: 60, thick: 12, gap: 6 },
  // the oak rail capping it, a slim picture ledge: its underside's height and its height (mm). (At
  // 790, about 1.5 m off the floor, it is just out of the seated view's top: lower, it crowded the
  // board's top or was cut by the picture's edge)
  rail: { y: 790, h: 17.6 },
  // the double socket low on the right: its middle (x, height) and its size (mm)
  socket: { u: 330, y: 86, w: 151, h: 80 },
  // the cork board: its middle across the picture, its lower edge's height, its size, the oak
  // frame's face width and depth, how far it hangs off the panelling (mm). On it (x from its left,
  // y from its bottom; rot anticlockwise): the badge's pin (nothing in the 80 x 140 mm below it),
  // the notes' middles, the pins the calendar, the bulldog clip and the ticket hang from, the
  // postcard's middle, spare pins, old pin holes, the ghost of a card long gone
  board: {
    u: 92,
    y0: 240,
    w: 580,
    h: 400,
    frame: 28,
    depth: 22,
    off: 5,
    badge: [322, 344],
    notes: [
      [90, 318, -0.07],
      [178, 330, 0.05],
      [240, 245, -0.035],
    ],
    calendar: [470, 362],
    clip: [104, 196],
    ticket: [434, 150],
    postcard: [300, 118, 0.03],
    spare: [
      [521, 114],
      [503, 64],
      [250, 356],
    ],
    holes: [
      [58, 198],
      [61, 203],
      [298, 58],
      [519, 302],
      [480, 44],
      [536, 46],
      [479, 95],
      [533, 97],
      [150, 122],
      [392, 360],
      [212, 98],
    ],
    ghost: [478, 42, 538, 98],
  },
  // the wall's contact shade: where it is baked (the room's frame: x0, y0, x1, y1) and its texels
  wallAO: { rect: [-1200, -40, 1200, 1160], size: [512, 256] },
}

// the panelling's paint (sRGB): a grey-green, lighter than it looks. The wall only gets the dusk's
// fill, the bounce from behind the chair and the environment (the lamp's cone does not reach it):
// together about 0.42 of the paint's own colour, which the tone mapping's toe darkens and saturates
// further. Under that it reads as a deep bottle green, about #263932 (a deeper paint read near black)
const WALL_GREEN = 0x6a8078
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
    paintN: dataTex(T.paint, T.paint.nrm),
    oak: dataTex(T.oak, T.oak.px, { srgb: true }),
    oakN: dataTex(T.oak, T.oak.nrm),
    oakR: dataTex(T.oak, T.oak.rough),
    cork: dataTex(T.cork, T.cork.px, { srgb: true }),
    corkN: dataTex(T.cork, T.cork.nrm),
    paperN: dataTex(T.paper, T.paper.nrm, { repeat: 3 }),
    wallAO: dataTex(T.wallAO, T.wallAO.px, { wrap: false, red: true }),
    corkAO: dataTex(T.corkAO, T.corkAO.px, { wrap: false, red: true }),
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
  lit.push(deskMat)
  const desk = new THREE.Mesh(deskGeo, deskMat)
  desk.name = 'room.desk'
  desk.receiveShadow = true

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
      normalMap: tex.paintN,
      normalScale: new THREE.Vector2(0.9, 0.9),
      vertexColors: true,
    }),
  )
  const wallU = { tContact: { value: tex.wallAO }, uContact: { value: new THREE.Vector4(ax0, ay0, 1 / (ax1 - ax0), 1 / (ay1 - ay0)) } }
  wallMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, wallU)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec4 uContact;\nvarying vec2 vContactUv;')
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        #ifdef USE_INSTANCING
          float seed = fract(instanceMatrix[3].x * 0.00917 + 0.37);
          vec2 tuv = vec2(seed > 0.5 ? 1.0 - vNormalMapUv.x : vNormalMapUv.x, vNormalMapUv.y + seed * 13.0);
          vNormalMapUv = tuv;
          vRoughnessMapUv = tuv;
        #endif`,
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
        diffuseColor.rgb *= (0.86 + 0.28 * texture2D(roughnessMap, vRoughnessMapUv).r) * texture2D(tContact, vContactUv).r;`,
      )
  }
  wallMat.customProgramCacheKey = () => 'room.wall'

  // the boards: one profile (its V-joints: each long edge chamfered, a hairline slot between it and
  // the next, closed at the tongue), from deep in the gap behind the desk up to the rail, the contact
  // shade along the desk and in the joints in its colour; instanced across the wall
  const ph = P.pitch / 2
  const boardProfile = [
    [-ph, -6.8, 0.12],
    [-ph + 0.45, -6.8, 0.22],
    [-ph + 0.45, -2.6, 0.5],
    [-ph + 2.65, -0.32, 0.88],
    [-ph + 3.4, 0, 1],
    [0, 0.12, 1],
    [ph - 3.4, 0, 1],
    [ph - 2.65, -0.32, 0.88],
    [ph - 0.45, -2.6, 0.5],
    [ph - 0.45, -6.8, 0.22],
    [ph, -6.8, 0.12],
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
    [R.rail.y, 0.9],
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
  const first = Math.ceil((-R.deskHalf - 300 - P.joint) / P.pitch)
  const last = Math.floor((R.deskHalf + 300 - P.joint) / P.pitch) - 1
  const panels = new THREE.InstancedMesh(panelGeo, wallMat, last - first + 1)
  panels.name = 'room.wall'
  panels.userData.takesShadow = true
  {
    // (each board a hair out of line with the next, and its paint a touch lighter or darker)
    const m4 = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const c = new THREE.Color()
    const r = (k, s) => (Math.sin(k * 127.1 + s * 311.7) * 43758.5453) % 1
    for (let k = first; k <= last; k++) {
      const i = k - first
      q.setFromEuler(e.set(0, r(k, 1) * 0.003, 0))
      m4.compose(new THREE.Vector3(P.joint + (k + 0.5) * P.pitch, 0, face + r(k, 2) * 0.3), q, new THREE.Vector3(1, 1, 1))
      panels.setMatrixAt(i, m4)
      panels.setColorAt(i, c.setScalar(1 + 0.03 * r(k, 3)))
    }
    panels.instanceMatrix.needsUpdate = true
    panels.instanceColor.needsUpdate = true
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
  const oakMat = mat(
    new THREE.MeshStandardMaterial({
      map: tex.oak,
      normalMap: tex.oakN,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughnessMap: tex.oakR,
      roughness: 1,
      vertexColors: true,
      envMapIntensity: 0.9,
    }),
  )
  oakMat.customProgramCacheKey = () => 'room.oak'
  const railProfile = [
    [-P.thick, 17.6, 0.72],
    [-P.thick + 0.8, 17.6, 0.92],
    [9.2, 17.6, 1],
    [10.6, 17.2, 1],
    [11.6, 16.2, 1],
    [12, 14.4, 1],
    [12, 1.6, 0.96],
    [11.6, 0.5, 0.9],
    [10.6, 0, 0.84],
    [6.5, 0, 0.8],
    [4.0, -0.5, 0.72],
    [1.9, -1.9, 0.66],
    [0.5, -4.0, 0.6],
    [0, -6.5, 0.55],
  ]
  const railLen = 2 * R.deskHalf + 600
  const railGeo = sweep(
    railProfile,
    () => Array.from({ length: 21 }, (_, k) => [railLen * (k / 20 - 0.5), 1]),
    (a, b, s, o) => o.set(s, R.rail.y + b, face + a),
    (na, nb, o) => o.set(0, nb, na),
    (p, arc, s, o) => o.set(s / 340 + 0.31, arc / 42.5),
  )
  dust(railGeo, 0.5)
  const rail = mesh(railGeo, oakMat, 'room.rail', { cast: true, takes: true })

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

  // ---- the board: its parts in its own frame (x from its left, y from its bottom, z out of it,
  // its back hung `off` off the panelling)
  const B = R.board
  const F = B.frame
  const zc = B.depth - 8 // (the cork's face: 8 mm inside the frame's)
  const board = new THREE.Group()
  board.position.set(B.u - B.w / 2, B.y0, face + B.off)
  const boardMeshes = []

  // the frame: one profile (a soft outer arris, a flat face, a bevel down to a small lip over the
  // cork) swept along each side, mitred; a dark seam where the mitres meet, a little dust on top
  {
    const D = B.depth
    const prof = [
      [0, 0, 0.7],
      [0, D - 1.8, 1],
      [0.45, D - 0.55, 1],
      [1.6, D, 1],
      [F - 9.2, D, 1],
      [F - 8.6, D - 0.3, 1],
      [F - 2.4, D - 5.7, 0.88],
      [F - 1.8, D - 6.15, 0.82],
      [F - 1.3, D - 6.3, 0.76],
      [F - 1.3, zc, 0.55],
    ]
    const sideOf = (len, put, turn, off) =>
      sweep(
        prof,
        (p) => [
          [p[0], 0.5],
          [p[0] + 0.7, 0.95],
          [len / 2, 1],
          [len - p[0] - 0.7, 0.95],
          [len - p[0], 0.5],
        ],
        put,
        turn,
        (p, arc, s, o) => o.set(s / 340 + off[0], arc / 42.5 + off[1]),
      )
    const W = B.w
    const H = B.h
    const sides = [
      sideOf(W, (a, z, s, o) => o.set(s, a, z), (na, nz, o) => o.set(0, na, nz), [0.12, 0.1]),
      sideOf(W, (a, z, s, o) => o.set(s, H - a, z), (na, nz, o) => o.set(0, -na, nz), [0.57, 0.45]),
      sideOf(H, (a, z, s, o) => o.set(a, s, z), (na, nz, o) => o.set(na, 0, nz), [0.33, 0.7]),
      sideOf(H, (a, z, s, o) => o.set(W - a, s, z), (na, nz, o) => o.set(-na, 0, nz), [0.81, 0.25]),
    ]
    const frameGeo = mergeGeometries(sides)
    for (const s of sides) s.dispose()
    dust(frameGeo, 0.35)
    boardMeshes.push(mesh(frameGeo, oakMat, 'room.frame', { cast: true, takes: true }))
  }
  // what casts the board's shadow on the wall (hidden behind the cork, facing the lamp)
  {
    const g = new THREE.PlaneGeometry(B.w - 4, B.h - 4)
    g.translate(B.w / 2, B.h / 2, 2)
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(12).fill(0.4), 3))
    boardMeshes.push(mesh(g, oakMat, 'room.boardBack', { cast: true }))
  }
  // the cork: granules in relief, darkened by its contact shade (the frame's lip, the pins, old
  // holes, the ghost of a card)
  const corkMat = mat(new THREE.MeshStandardMaterial({ map: tex.cork, normalMap: tex.corkN, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.9 }))
  {
    const corkU = { tContact: { value: tex.corkAO }, uContact: { value: new THREE.Vector4(F, F, 1 / (B.w - 2 * F), 1 / (B.h - 2 * F)) } }
    corkMat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, corkU)
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform vec4 uContact;\nvarying vec2 vContactUv;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvContactUv = (transformed.xy - uContact.xy) * uContact.zw;')
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D tContact;\nvarying vec2 vContactUv;')
        .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= texture2D(tContact, vContactUv).r;')
    }
    corkMat.customProgramCacheKey = () => 'room.cork'
    const g = new THREE.PlaneGeometry(B.w - 2 * F + 3, B.h - 2 * F + 3)
    g.translate(B.w / 2, B.h / 2, zc)
    const p = g.attributes.position
    const uv = g.attributes.uv
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 64, p.getY(i) / 64)
    boardMeshes.push(mesh(g, corkMat, 'room.cork', { takes: true }))
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
  /** A sheet's top edge's middle, from its middle (x, y), its height and its turn. */
  const topOf = (x, y, h, rot) => [x - (Math.sin(rot) * h) / 2, y + (Math.cos(rot) * h) / 2]
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

  // the sticky notes: stuck along their glued band, their lower edges curling off the cork, a corner
  // more than the other; a tap peels one up
  const NOTE = 76
  const BAND = 17
  notes.forEach((n, i) => {
    const [cx, cy, rot] = B.notes[i % B.notes.length]
    const g = sheet(NOTE, NOTE, 6, 14)
    const m = mesh(g, paperMat(canvasTex(noteCanvas(n.color, n.lines, handFont, 11 + i)), n.color, 2), 'room.note', { cast: true, takes: true })
    const [tx, ty] = topOf(cx, cy, NOTE, rot)
    m.position.set(tx, ty, zc + 0.9 + 0.15 * i)
    m.rotation.z = rot
    const tw = [0.28, -0.32, 0.18][i % 3]
    const sh = shadeOf(board, tx, ty, zc + 0.35, rot, NOTE, NOTE, [1, 1.5, 1.6, 1.5], 0.36, 0.6)
    const apply = (phi) => {
      bend(g, (s, x) => (s < BAND ? 0 : (phi * (1 + (tw * x) / (NOTE / 2)) * (s - BAND)) / (NOTE - BAND)))
      const lift = (phi * (NOTE - BAND)) / 2
      setShade(sh.geometry, NOTE, NOTE - Math.min(6, lift * 0.2), [1, 1.5 + lift * 0.12, 1.6 + lift * 0.45, 1.5 + lift * 0.12], 0.36 * (1 - Math.min(0.45, lift / 50)), 0.6 + lift * 0.3)
    }
    const rest = [0.17, 0.12, 0.2][i % 3]
    apply(rest)
    const a = peeler(apply, rest, 0.95)
    items.push({ name: 'note', meshes: [m], tap: a.tap })
    board.add(m)
    boardMeshes.push(m)
  })

  // the postcard, taped at its top corners: it curls a little, and lifts a little when tapped
  {
    const [cx, cy, rot] = B.postcard
    const W = 148
    const H = 105
    const card = new THREE.Group()
    card.position.set(...topOf(cx, cy, H, rot), zc + 0.8)
    card.rotation.z = rot
    const g = sheet(W, H, 8, 10)
    const m = mesh(g, paperMat(canvasTex(postcardCanvas(font)), 0xf1ece2, 1, { roughness: 0.6 }), 'room.postcard', { cast: true, takes: true })
    const sh = shadeOf(card, 0, 0, -0.45, 0, W, H, [1, 1.4, 1.8, 1.4], 0.34, 0.8)
    const apply = (phi) => {
      bend(g, (s) => (s < 12 ? 0 : (phi * (s - 12)) / (H - 12)))
      const lift = (phi * (H - 12)) / 2
      setShade(sh.geometry, W, H, [1, 1.4, 1.8 + lift * 0.4, 1.4], 0.34 * (1 - Math.min(0.4, lift / 60)), 0.8 + lift * 0.3)
    }
    apply(0.05)
    // the tape: two strips across its top corners, down onto the cork beyond the card's edge
    const tapeTex = canvasTex(tapeCanvas())
    const tapeMat = mat(new THREE.MeshStandardMaterial({ map: tapeTex, transparent: true, roughness: 0.7, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -10 }))
    const tapes = [-1, 1].map((sx, k) => {
      const t = new THREE.PlaneGeometry(15, 52, 2, 14)
      const p = t.attributes.position
      const a = sx * (Math.PI / 4 + (k ? 0.1 : -0.06))
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      for (let i = 0; i < p.count; i++) {
        // (in the card's frame: on it, a hair above it; past its edge, down on the cork)
        const x = p.getX(i) * ca - p.getY(i) * sa + sx * (W / 2 - 3)
        const y = p.getX(i) * sa + p.getY(i) * ca - 4
        const inside = Math.min(W / 2 - Math.abs(x), -y)
        const k2 = Math.max(0, Math.min(1, (inside + 1.2) / 2.4))
        p.setXYZ(i, x, y, -0.5 + 0.95 * k2 * k2 * (3 - 2 * k2))
      }
      t.computeVertexNormals()
      const tm = mesh(t, tapeMat, 'room.tape')
      card.add(tm)
      return tm
    })
    card.add(m)
    board.add(card)
    const a = peeler(apply, 0.05, 0.5)
    items.push({ name: 'postcard', meshes: [m, ...tapes], tap: a.tap })
    boardMeshes.push(m, ...tapes)
  }

  // the pins: map pins (a round head on a steel shaft) for what hangs, push pins for the spares
  const plasticPin = mat(new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 }))
  const hangPins = [
    [B.badge, 0x26282c],
    [B.calendar, 0xb6432f],
    [B.clip, 0xe4dccb],
    [B.ticket, 0xc4922f],
  ]
  {
    const head = geo(new THREE.SphereGeometry(2.6, 16, 12).translate(0, 0, 10.2))
    const shaft = geo(new THREE.CylinderGeometry(0.42, 0.42, 9, 8, 1).rotateX(Math.PI / 2).translate(0, 0, 4.5))
    const push = geo(
      new THREE.LatheGeometry(
        [
          [0, 0],
          [4.6, 0],
          [4.7, 0.5],
          [4.3, 1.1],
          [2.9, 1.6],
          [2.6, 3.5],
          [2.8, 6.4],
          [3.9, 7.1],
          [4.1, 8.3],
          [3.4, 9.6],
          [1.8, 10.3],
          [0, 10.5],
        ].map(([r, y]) => new THREE.Vector2(r, y)),
        18,
      ).rotateX(Math.PI / 2),
    )
    const heads = new THREE.InstancedMesh(head, plasticPin, hangPins.length)
    const shafts = new THREE.InstancedMesh(shaft, steel, hangPins.length)
    const pushes = new THREE.InstancedMesh(push, plasticPin, B.spare.length)
    const m4 = new THREE.Matrix4()
    const c = new THREE.Color()
    hangPins.forEach(([[x, y], col], i) => {
      m4.makeTranslation(x, y, zc)
      heads.setMatrixAt(i, m4)
      shafts.setMatrixAt(i, m4)
      heads.setColorAt(i, c.set(col))
    })
    const spareCols = [0xb6432f, 0xe9e2d2, 0x2a2c30]
    B.spare.forEach(([x, y], i) => {
      m4.makeRotationZ(i * 1.3).setPosition(x, y, zc)
      pushes.setMatrixAt(i, m4)
      pushes.setColorAt(i, c.set(spareCols[i % spareCols.length]))
    })
    for (const o of [heads, shafts, pushes]) {
      o.castShadow = true
      o.name = 'room.pins'
      board.add(o)
      boardMeshes.push(o)
    }
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
  const swing = (pivot, rest, ...k) => {
    pivot.rotation.z = rest
    return pendulum(pivot.position.x, (q) => (pivot.rotation.z = rest + q), ...k)
  }

  // the bulldog clip (brass, 51 mm) hanging from its pin by its handles, a pencil sketch in its jaws
  // and a till receipt behind it
  {
    const pivot = new THREE.Group()
    pivot.position.set(B.clip[0], B.clip[1], zc)
    const zs = 3.2 // (the sketch's face at the jaws)
    const sketch = sheet(100, 124, 6, 14)
    const sm = mesh(sketch, paperMat(canvasTex(sketchCanvas(handFont)), 0xf2f1ea, 2, { alphaTest: 0.5, roughness: 0.88 }), 'room.sketch', { cast: true, takes: true })
    sm.position.set(0, -36, zs)
    bend(sketch, (s) => (s < 46 ? -0.057 * (1 - s / 46) : 0), [[-50, 74, 50, 52, 0.45]])
    const receipt = sheet(58, 128, 4, 16)
    const rm = mesh(receipt, paperMat(canvasTex(receiptCanvas()), 0xeeede8, 1, { alphaTest: 0.5, roughness: 0.7 }), 'room.receipt', { cast: true, takes: true })
    rm.position.set(50, -31, zs - 0.9)
    rm.rotation.z = -0.05
    bend(receipt, (s) => (s < 46 ? -0.065 * (1 - s / 46) : 0), [[-29, 40, 29, 40, -0.3]])
    // the clip: its front plate (a thin curved shell, its lip pressed on the paper), the roll its
    // handles turn in, and the two wire handles up to the pin
    const brass = mat(new THREE.MeshStandardMaterial({ color: 0xc6a36a, metalness: 1, roughness: 0.32 }))
    const line = [
      [-44, 0.35],
      [-43, 1.5],
      [-41, 2.6],
      [-36, 3.6],
      [-28, 4.3],
      [-20, 4.5],
      [-15.5, 4.1],
      [-13, 3.4],
    ]
    const shell = new THREE.Shape()
    const off = (k, d) => {
      const a = line[Math.max(0, k - 1)]
      const b = line[Math.min(line.length - 1, k + 1)]
      const ty = b[0] - a[0]
      const tz = b[1] - a[1]
      const l = Math.hypot(ty, tz)
      return [line[k][0] - (tz / l) * d, line[k][1] + (ty / l) * d]
    }
    // (in the shape's plane: x = -z, y = y; extruded along the clip's width)
    line.forEach((_, k) => {
      const [y, z] = off(k, 0.35)
      if (k === 0) shell.moveTo(-z, y)
      else shell.lineTo(-z, y)
    })
    for (let k = line.length - 1; k >= 0; k--) {
      const [y, z] = off(k, -0.35)
      shell.lineTo(-z, y)
    }
    const plate = new THREE.ExtrudeGeometry(shell, { depth: 50.4, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.25, bevelSegments: 1, curveSegments: 4 })
    plate.rotateY(Math.PI / 2).translate(-25.2, 0, zs)
    const roll = new THREE.CylinderGeometry(2.5, 2.5, 51, 18, 1).rotateZ(Math.PI / 2).translate(0, -11, zs + 2.1)
    const handle = (dz, lean) =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(
          [
            [-23.5, -11],
            [-22.5, -6],
            [-19, -1.6],
            [-14, 0.95],
            [-7, 1.25],
            [0, 1.25],
            [7, 1.25],
            [14, 0.95],
            [19, -1.6],
            [22.5, -6],
            [23.5, -11],
          ].map(([x, y]) => new THREE.Vector3(x, y, zs + 2.1 + dz + lean * (y + 11))),
        ),
        56,
        0.8,
        6,
        false,
      )
    const clipGeo = mergeGeometries([plate, roll.toNonIndexed(), handle(0.9, -0.02).toNonIndexed(), handle(-0.9, -0.05).toNonIndexed()])
    for (const g of [plate, roll]) g.dispose()
    const clip = mesh(clipGeo, brass, 'room.clip', { cast: true })
    shadeOf(pivot, 14, -12, 0.35, 0, 132, 150, [3, 4, 4.5, 3.5], 0.42, 3)
    pivot.add(sm, rm, clip)
    board.add(pivot)
    const a = swing(pivot, 0.02, 10.5, 0.2, 1.5)
    items.push({ name: 'clip', meshes: [clip, sm, rm], tap: a.tap })
    boardMeshes.push(clip, sm, rm)
  }

  // the ticket stub, hanging by its corner from a pin through its hole
  {
    const pivot = new THREE.Group()
    pivot.position.set(B.ticket[0], B.ticket[1], zc)
    const g = sheet(90, 46, 8, 3)
    g.translate(45 - 5.4, 5.4, 0) // (its hole at the pin)
    const m = mesh(g, paperMat(canvasTex(ticketCanvas(font)), 0xc5d3df, 2, { alphaTest: 0.5, roughness: 0.75 }), 'room.ticket', { cast: true, takes: true })
    m.position.z = 2.2
    m.rotation.y = 0.02
    shadeOf(pivot, 39.6, 5.4, 0.35, 0, 90, 46, [2, 2.5, 2.5, 2], 0.36, 2.2)
    pivot.add(m)
    board.add(pivot)
    // (its middle below the pin, nearly: it rests a little short of it, held by the pin's friction)
    const a = swing(pivot, -1.05, 13, 0.24, 2.0)
    items.push({ name: 'ticket', meshes: [m], tap: a.tap })
    boardMeshes.push(m)
  }

  // the calendar: a wire-bound pad hanging from its pin by a wire hanger; this month on top, next
  // month under it. A tap turns the page up over the binding to show next month, and lets it fall
  {
    const CW = 130
    const CH = 182
    const cal = new THREE.Group()
    cal.position.set(B.calendar[0], B.calendar[1], zc)
    const yb = -12 // (the binding's line, below the pin)
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
    const hanger = mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(
          [
            [-13, yb, zb],
            [-8, yb + 6, zb + 0.6],
            [-2.2, 0.6, zb + 1.2],
            [0, 0.95, zb + 1.3],
            [2.2, 0.6, zb + 1.2],
            [8, yb + 6, zb + 0.6],
            [13, yb, zb],
          ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        ),
        40,
        0.5,
        6,
        false,
      ),
      steel,
      'room.hanger',
      { cast: true },
    )
    cal.add(loops, hanger)
    shadeOf(cal, 0, yb + 2.2, 0.35, 0, CW, CH, [2.5, 3, 4, 3], 0.42, 2.5)
    board.add(cal)
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
    items.push({ name: 'calendar', meshes: [top, under, backCard, loops, hanger], tap: f.tap })
    boardMeshes.push(top, under, backCard, loops, hanger)
  }

  // the badge's own soft shadow on the cork (the card hangs ~5 mm off it, from the pin; scene.js
  // hangs the badge: move this with it if it ever moves)
  const badgeShade = shadeOf(board, B.badge[0] + 0.3, B.badge[1] - 1, zc + 0.35, 0.06, 56, 85, [3, 3, 3.5, 3], 0.32, 3.5)

  board.add(...boardMeshes.filter((o) => !o.parent))
  group.add(desk, panels, plaster, rail, socket, board)
  group.updateMatrixWorld(true)

  const onBoard = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(board.matrixWorld)
  const wallMeshes = [panels, plaster, rail, ...socketMeshes]
  return {
    group,
    desk,
    /** The panelling (an InstancedMesh, a board an instance), and every part of the wall. */
    wall: panels,
    wallMeshes,
    boardMeshes,
    /** The badge's pin (world), and which way is out of the board (world). */
    badgePin: onBoard(B.badge[0], B.badge[1], zc),
    boardOut: new THREE.Vector3(0, 0, 1).transformDirection(board.matrixWorld),
    /** The board's middle on its face (world), and its size (mm). */
    boardCenter: onBoard(B.w / 2, B.h / 2, zc),
    boardSize: [B.w, B.h],
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
function dust(g, k) {
  const n = g.attributes.normal
  const c = g.attributes.color
  for (let i = 0; i < n.count; i++) {
    const t = n.getY(i)
    const d = k * Math.max(0, Math.min(1, (t - 0.35) / 0.6))
    c.setXYZ(i, c.getX(i) * (1 + 0.1 * d), c.getY(i) * (1 + 0.12 * d), c.getZ(i) * (1 + 0.17 * d))
  }
}
