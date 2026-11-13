// The laptop's shapes, as flat arrays (mm; y up; x across its width, z towards the person at it,
// the hinge at -z; standing on the desk at y = 0). laptop.js hands them to three.js. Proportions
// from a 13-inch aluminium notebook: a 304 x 215 base 7.2 mm thick on rubber feet, a 4.2 mm lid on
// a clutch hinge along the back, a full-height keyboard in a well, a glass trackpad, speaker
// grilles either side of the keys.
//   base    one machined piece: its bottom rolls under (r 2.4), its walls stand straight, a 0.5 mm
//           polished chamfer runs round its top edge and round the thumb scoop cut into its front
//           edge; the keyboard well is sunk 1.4 mm into the deck (its top edge rounded). The hinge's
//           barrel and the four rubber feet are in the same mesh (one draw)
//   lid     its own frame: the hinge's axis at the origin, lying closed along +z, its face (the
//           glass) at y = LID.face facing -y; opened, it turns about x. Its back edge is rounded
//           (r 1.4), its face edge chamfered and polished like the base's
//   glass   the face of the lid, one flat panel (the display, the bezel, the camera and the rubber
//           gasket round it are all drawn by its shader)
//   key     one key, 1u: stretched to each key's width by its shader without stretching its corners
import { ShapeUtils, Vector2 } from 'three'

const deg = (d) => (d * Math.PI) / 180
const W = 304
const D = 215
export const LAPTOP = {
  w: W,
  d: D,
  r: 10.5, // (the corners, in plan)
  foot: 0.9, // (the rubber feet: the base's bottom this far off the desk)
  body: 7.2,
  base: 8.1, // (the deck's height above the desk)
  chamfer: 0.5,
  lid: 4.2,
  lidD: 208, // (the lid, from its hinge end to its top edge)
  open: deg(110),
  // the clutch: the hinge's axis (y, z), its barrel's radius and half length
  hinge: { y: 9.0, z: -D / 2 + 3.3, r: 2.9, half: 126 },
  // what scene.js's collision wants: the base as a rounded box (half extents, edge radius, its
  // middle's height) from the desk to the deck (the barrel stands 3.8 mm higher along the back)
  box: { half: [W / 2, 4.05, D / 2], r: 2.4, y: 4.05 },
  // the screen's own pixels, as a page sees them (the panel's 1.538): a drag over the display
  // scrolls by the hit's uv moved times screen.h
  screen: { w: 1440, h: 936 },
}
const L = LAPTOP
const TOP = L.base
const TILE = 5 // (mm per tile of the bead-blast's normal map: the uv)

// the lid, in its own frame (the hinge's axis at the origin, closed: along +z, face down)
export const LID = { face: -0.4, back: -0.4 + L.lid, s0: 3.0, s1: 3.0 + L.lidD, rim: 0.9 }
// the display in the lid's face: mm from the lid's left edge and from its top edge (s1)
export const DISP = { x: 7.7, y: 8.0, w: 288.6, h: 187.6 }
export const SCREEN = LAPTOP.screen
// the camera, in the top bezel (the lid's frame)
export const CAM = { x: 0, s: LID.s1 - 4.1, r: 0.95 }

// ---- the deck's layout (the base's frame, mm)
export const WELL = { hw: 135.6, z0: -96, z1: 13.8, r: 2.4, depth: 1.4, round: 0.3 }
export const PAD = { w: 128, d: 76, r: 4.5, z: 60.3 }
export const GRILLE = { x0: 139.2, x1: 148.2, z0: -93, z1: 11, pitch: 1.15, hole: 0.29 }
export const SCOOP = { w: 46, depth: 3.4, height: 2.6 }
// the ports, in the side walls: [side (-1 left, 1 right), z, kind]
export const PORTS = [
  [-1, -62, 'usbc'],
  [-1, -44, 'usbc'],
  [1, -56, 'jack'],
]
export const FEET = [
  [-128, -87],
  [128, -87],
  [-128, 87],
  [128, 87],
]

// ---- the keys: a full US layout, the function row full height, Touch ID at its end
const PITCH = (268 + 2.6) / 14.5 // (18.66: a row is 14.5 units, 268 mm of caps)
const GAP = 2.6
const KD = 15.6 // (a key's depth)
const ROWP = 18.2
export const KEY = { w0: PITCH - GAP, d0: KD, h: 1.15, top: TOP - 0.25, travel: 1, rc: 1.6, re: 0.5 }
// [id, units, legend]; a legend: { c } one letter, { t, b } stacked, corners { tl, tr, bl, br }, a
// function key's { icon, f }, or { touchid }. '@name' is a symbol, drawn by laptopTex.js
const k1 = (c) => [c, 1, { c }]
const k2 = (b, t) => [b, 1, { t, b }]
const FN = ['sun-', 'sun+', 'mission', 'search', 'mic', 'moon', 'rew', 'play', 'ff', 'mute', 'vol-', 'vol+']
const ROWS = [
  [['esc', 1.5, { bl: 'esc' }], ...FN.map((icon, i) => [`f${i + 1}`, 1, { icon, f: `F${i + 1}` }]), ['touchid', 1, { touchid: true }]],
  [...'`~ 1! 2@ 3# 4$ 5% 6^ 7& 8* 9( 0) -_ =+'.split(' ').map((p) => k2(p[0], p[1])), ['delete', 1.5, { br: 'delete' }]],
  [['tab', 1.5, { tl: '@tab', bl: 'tab' }], ...'QWERTYUIOP'.split('').map(k1), k2('[', '{'), k2(']', '}'), k2('\\', '|')],
  [['caps', 1.8, { tl: '@dot', bl: 'caps lock' }], ...'ASDFGHJKL'.split('').map(k1), k2(';', ':'), k2("'", '"'), ['return', 1.7, { br: 'return' }]],
  [['shiftL', 2.25, { tl: '@shift', bl: 'shift' }], ...'ZXCVBNM'.split('').map(k1), k2(',', '<'), k2('.', '>'), k2('/', '?'), ['shiftR', 2.25, { tr: '@shift', br: 'shift' }]],
  [['fn', 1, { tr: 'fn', bl: '@globe' }], ['ctrl', 1, { tr: '@ctrl', br: 'control' }], ['optL', 1, { tr: '@opt', br: 'option' }], ['cmdL', 1.25, { tr: '@cmd', br: 'command' }], ['space', 5, null], ['cmdR', 1.25, { tl: '@cmd', bl: 'command' }], ['optR', 1, { tl: '@opt', bl: 'option' }], ['arrows', 3, null]],
]
// the wear of the most used keys (their tops polished by fingers)
const WEAR = { space: 1, cmdL: 0.85, E: 0.75, A: 0.7, S: 0.65, D: 0.55, T: 0.6, N: 0.5, O: 0.5, I: 0.45, R: 0.5, H: 0.35, L: 0.35, C: 0.6, V: 0.6, Z: 0.4, W: 0.4, delete: 0.6, return: 0.45, shiftL: 0.5, tab: 0.3, esc: 0.3, up: 0.25, down: 0.25, left: 0.3, right: 0.3, K: 0.3, J: 0.3, M: 0.25, P: 0.25, U: 0.3 }

/**
 * Every key: { id, legend, x, z, w, d, wear, row } (the middle of its top, in the base's frame; its
 * cap's width and depth), the arrows' four half keys included.
 */
export function keyLayout() {
  const keys = []
  const x0 = -268 / 2
  const z0 = WELL.z0 + 1.6 + KD / 2
  ROWS.forEach((row, r) => {
    const z = z0 + r * ROWP
    let x = x0
    for (const [id, u, legend] of row) {
      if (id === 'arrows') {
        // ← and → half height at the bottom, ↑ and ↓ stacked between them
        const kw = PITCH - GAP
        const hd = (KD - 0.8) / 2
        const zt = z - KD / 2 + hd / 2
        const zb = z + KD / 2 - hd / 2
        keys.push({ id: 'left', legend: { c: '@left' }, x: x + kw / 2, z: zb, w: kw, d: hd, row: r })
        keys.push({ id: 'up', legend: { c: '@up' }, x: x + PITCH + kw / 2, z: zt, w: kw, d: hd, row: r })
        keys.push({ id: 'down', legend: { c: '@down' }, x: x + PITCH + kw / 2, z: zb, w: kw, d: hd, row: r })
        keys.push({ id: 'right', legend: { c: '@right' }, x: x + 2 * PITCH + kw / 2, z: zb, w: kw, d: hd, row: r })
        x += 3 * PITCH
        continue
      }
      const kw = u * PITCH - GAP
      keys.push({ id, legend, x: x + kw / 2, z, w: kw, d: KD, row: r })
      x += u * PITCH
    }
  })
  for (const k of keys) k.wear = WEAR[k.id] || 0
  return keys
}

// =================================================================================================
// building meshes
// =================================================================================================

/** A mesh being built: positions, normals, uvs, a zone per vertex, triangles. Each triangle is wound
 * to face its vertices' normals (the builders need not care about orientation); slivers are dropped. */
function builder() {
  const P = []
  const N = []
  const T = []
  const Z = []
  const I = []
  return {
    P,
    N,
    T,
    Z,
    I,
    v(x, y, z, nx, ny, nz, u, w, zone) {
      P.push(x, y, z)
      N.push(nx, ny, nz)
      T.push(u, w)
      Z.push(zone)
      return P.length / 3 - 1
    },
    tri(a, b, c) {
      const ax = P[3 * a]
      const ay = P[3 * a + 1]
      const az = P[3 * a + 2]
      const ux = P[3 * b] - ax
      const uy = P[3 * b + 1] - ay
      const uz = P[3 * b + 2] - az
      const vx = P[3 * c] - ax
      const vy = P[3 * c + 1] - ay
      const vz = P[3 * c + 2] - az
      const cx = uy * vz - uz * vy
      const cy = uz * vx - ux * vz
      const cz = ux * vy - uy * vx
      if (cx * cx + cy * cy + cz * cz < 1e-12) return
      const nx = N[3 * a] + N[3 * b] + N[3 * c]
      const ny = N[3 * a + 1] + N[3 * b + 1] + N[3 * c + 1]
      const nz = N[3 * a + 2] + N[3 * b + 2] + N[3 * c + 2]
      if (cx * nx + cy * ny + cz * nz < 0) I.push(a, c, b)
      else I.push(a, b, c)
    },
    out() {
      return { position: new Float32Array(P), normal: new Float32Array(N), uv: new Float32Array(T), zone: new Float32Array(Z), index: P.length / 3 > 65535 ? new Uint32Array(I) : new Uint16Array(I) }
    },
  }
}

/**
 * A rounded rectangle's outline in a plane (a, b), centred on (ca, cb): points { a, b, na, nb, s }
 * (s: the distance along it), corners in `nc` steps; `cuts(edge)` may add points along an edge
 * (edge 0..3: +a, +b, -a, -b), as fractions 0..1 along it.
 */
function roundRect(ha, hb, r, nc, ca = 0, cb = 0, cuts = null) {
  const pts = []
  const corner = (cxa, cxb, a0) => {
    for (let i = 0; i <= nc; i++) {
      const t = a0 + (i / nc) * (Math.PI / 2)
      pts.push({ a: cxa + r * Math.cos(t), b: cxb + r * Math.sin(t), na: Math.cos(t), nb: Math.sin(t) })
    }
  }
  const edge = (k, a0, b0, a1, b1, na, nb) => {
    for (const f of cuts?.(k) || []) pts.push({ a: a0 + (a1 - a0) * f, b: b0 + (b1 - b0) * f, na, nb })
  }
  const A = ha - r
  const B = hb - r
  edge(0, ca + ha, cb - B, ca + ha, cb + B, 1, 0)
  corner(ca + A, cb + B, 0)
  edge(1, ca + A, cb + hb, ca - A, cb + hb, 0, 1)
  corner(ca - A, cb + B, Math.PI / 2)
  edge(2, ca - ha, cb + B, ca - ha, cb - B, -1, 0)
  corner(ca - A, cb - B, Math.PI)
  edge(3, ca - A, cb - hb, ca + A, cb - hb, 0, -1)
  corner(ca + A, cb - B, Math.PI * 1.5)
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    if (i) s += Math.hypot(pts[i].a - pts[i - 1].a, pts[i].b - pts[i - 1].b)
    pts[i].s = s
  }
  return pts
}

/**
 * Sweep profile strips round an outline: each strip a list of rows [inset, y, nOut, nUp] (inset in
 * from the outline, the normal's part outward and up), joined row to row. rows(i) gives outline
 * point i's strips (they may differ point to point). Frame: the outline in (x, z), y up.
 */
function sweep(B, outline, rows, zoneOf, closed = true) {
  const n = outline.length
  const strips = outline.map((p, i) => rows(p, i))
  const S = strips[0].length
  for (let k = 0; k < S; k++) {
    const R = strips[0][k].length
    const idx = []
    for (let i = 0; i < n; i++) {
      const p = outline[i]
      const st = strips[i][k]
      let vlen = 0
      const col = []
      for (let j = 0; j < R; j++) {
        const [ins, y, no, nu] = st[j]
        if (j) vlen += Math.hypot(ins - st[j - 1][0], y - st[j - 1][1])
        const l = Math.hypot(no, nu) || 1
        col.push(B.v(p.a - p.na * ins, y, p.b - p.nb * ins, (p.na * no) / l, nu / l, (p.nb * no) / l, p.s / TILE, vlen / TILE, zoneOf(k)))
      }
      idx.push(col)
    }
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = idx[i]
      const b = idx[(i + 1) % n]
      for (let j = 0; j < R - 1; j++) {
        B.tri(a[j], b[j], b[j + 1])
        B.tri(a[j], b[j + 1], a[j + 1])
      }
    }
  }
}

/** A flat cap: the polygon `ring` ([x, z] points) less its holes, at height y, its normal up or down. */
function cap(B, ring, holes, y, up, zone) {
  const c = ring.map(([x, z]) => new Vector2(x, z))
  const hs = holes.map((h) => h.map(([x, z]) => new Vector2(x, z)))
  const faces = ShapeUtils.triangulateShape(c, hs)
  const all = [...c, ...hs.flat()]
  const base = B.P.length / 3
  for (const p of all) B.v(p.x, y, p.y, 0, up ? 1 : -1, 0, p.x / TILE, p.y / TILE, zone)
  for (const [a, b, d] of faces) B.tri(base + a, base + b, base + d)
}

/** A solid of revolution about an axis: profile rows [along, radius, nAlong, nRadial]. */
function lathe(B, prof, segs, place, zone) {
  const cols = []
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    let vlen = 0
    cols.push(
      prof.map(([al, rad, na, nr], j) => {
        if (j) vlen += Math.hypot(al - prof[j - 1][0], rad - prof[j - 1][1])
        const l = Math.hypot(na, nr) || 1
        const [x, y, z, nx, ny, nz] = place(al, rad * c, rad * s, na / l, (nr / l) * c, (nr / l) * s)
        return B.v(x, y, z, nx, ny, nz, (t * Math.max(rad, 1)) / TILE, vlen / TILE, zone)
      }),
    )
  }
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < prof.length - 1; j++) {
      B.tri(cols[i][j], cols[i + 1][j], cols[i + 1][j + 1])
      B.tri(cols[i][j], cols[i + 1][j + 1], cols[i][j + 1])
    }
}

// zones (laptop.js's shaders read them): the base's aluminium, the well, the lid's shell, the clutch,
// the rubber feet, the polished chamfers (the base's, the lid's)
export const ZONE = { shell: 0, well: 1, lid: 2, clutch: 3, foot: 4, chamfer: 5, lidChamfer: 6 }

/** The base, its well, the hinge's barrel and the feet: one mesh. */
export function baseGeometry() {
  const B = builder()
  const RB = 2.4
  const CH = L.chamfer
  const S = SCOOP
  // the outline, with the thumb scoop's span sampled finely along the front edge (edge 1: +x to -x)
  const run = W - 2 * L.r
  const cuts = (k) => {
    if (k !== 1) return []
    const f = []
    const n = 26
    for (let i = 0; i <= n; i++) f.push(0.5 + ((i / n - 0.5) * S.w * 1.04) / run)
    return f
  }
  const outline = roundRect(W / 2, D / 2, L.r, 12, 0, 0, cuts)
  // how deep the scoop is at an outline point (0 away from it): a smooth bump across its width
  const scoopK = (p) => (p.nb > 0.99 && Math.abs(p.a) < S.w / 2 ? Math.cos((Math.PI * p.a) / S.w) ** 2 : 0)
  const rows = (p) => {
    const k = scoopK(p)
    const y1 = TOP - CH
    const y0 = y1 - k * S.height
    // the roll under the bottom, the wall
    const A = [[RB, L.foot, 0, -1]]
    for (let j = 1; j < 5; j++) {
      const a = (j / 5) * (Math.PI / 2)
      A.push([RB - RB * Math.sin(a), L.foot + RB - RB * Math.cos(a), Math.sin(a), -Math.cos(a)])
    }
    A.push([0, L.foot + RB, 1, 0], [0, y0, 1, 0])
    // the scoop (a floor, then its back wall rising to the chamfer; nothing where k = 0)
    const Sc = []
    for (let j = 0; j <= 4; j++) {
      const t = j / 4
      const ins = k * S.depth * (2 * t - t * t)
      const y = y0 + (y1 - y0) * t * t
      // (the curve's tangent (-dins, dy) turned clockwise: its outward normal)
      const no = 2 * (y1 - y0) * t
      const nu = 2 * k * S.depth * (1 - t)
      Sc.push(k < 1e-4 ? [0, y1, 1, 0] : [ins, y, no, nu + (no === 0 && nu === 0 ? 1 : 0)])
    }
    const e = k * S.depth
    const C = [
      [e, y1, 1, 1],
      [e + CH, TOP, 1, 1],
    ]
    return [A, Sc, C]
  }
  sweep(B, outline, rows, (k) => (k === 2 ? ZONE.chamfer : ZONE.shell))
  // the deck: the ring at the chamfer's top, less the well's opening
  const deckRing = outline.map((p) => {
    const ins = scoopK(p) * S.depth + CH
    return [p.a - p.na * ins, p.b - p.nb * ins]
  })
  const wz = (WELL.z0 + WELL.z1) / 2
  const wellOut = roundRect(WELL.hw, (WELL.z1 - WELL.z0) / 2, WELL.r, 6, 0, wz)
  const rho = WELL.round
  const wellHole = wellOut.map((p) => [p.a + p.na * rho, p.b + p.nb * rho])
  cap(B, deckRing, [wellHole], TOP, true, ZONE.shell)
  // the bottom
  cap(
    B,
    outline.map((p) => [p.a - p.na * RB, p.b - p.nb * RB]),
    [],
    L.foot,
    false,
    ZONE.shell,
  )
  // the well: its rounded top edge, its wall, its floor (the normals face into it: inset negative)
  sweep(
    B,
    wellOut,
    () => {
      const R = []
      for (let j = 0; j <= 4; j++) {
        const a = (j / 4) * (Math.PI / 2)
        R.push([-(rho - rho * Math.sin(a)), TOP - rho + rho * Math.cos(a), -Math.sin(a), Math.cos(a)])
      }
      R.push([0, TOP - WELL.depth, -1, 0])
      return [R]
    },
    () => ZONE.well,
  )
  cap(
    B,
    wellOut.map((p) => [p.a, p.b]),
    [],
    TOP - WELL.depth,
    true,
    ZONE.well,
  )
  // the clutch: a barrel along the back, its ends rounded, half sunk in the deck
  const H = L.hinge
  const re = 0.7
  const prof = [[-H.half, 0, -1, 0], [-H.half, H.r - re, -1, 0]]
  for (let j = 1; j < 4; j++) {
    const a = (j / 4) * (Math.PI / 2)
    prof.push([-H.half + re - re * Math.cos(a), H.r - re + re * Math.sin(a), -Math.cos(a), Math.sin(a)])
  }
  prof.push([-H.half + re, H.r, 0, 1], [H.half - re, H.r, 0, 1])
  for (let j = 1; j < 4; j++) {
    const a = (j / 4) * (Math.PI / 2)
    prof.push([H.half - re + re * Math.sin(a), H.r - re + re * Math.cos(a), Math.sin(a), Math.cos(a)])
  }
  prof.push([H.half, H.r - re, 1, 0], [H.half, 0, 1, 0])
  lathe(B, prof, 28, (al, c, s, na, nc, ns) => [al, H.y + c, H.z + s, na, nc, ns], ZONE.clutch)
  // the rubber feet: low discs, their edge rounded, a little into the base's bottom
  for (const [fx, fz] of FEET) {
    const fp = [
      [0, 0, 0, -1],
      [4.3, 0, 0, -1],
      [4.3 + 0.5 * Math.sin(Math.PI / 4), 0.5 - 0.5 * Math.cos(Math.PI / 4), 1, -1],
      [4.8, 0.5, 1, 0],
      [4.8, L.foot + 0.3, 1, 0],
    ]
    lathe(B, fp.map(([r, y, nr, ny]) => [y, r, ny, nr]), 18, (al, c, s, na, nc, ns) => [fx + c, al, fz + s, nc, na, ns], ZONE.foot)
  }
  return B.out()
}

/** The lid's shell (its own frame): a slab with a rounded back edge and a chamfered face edge. */
export function lidGeometry() {
  const B = builder()
  const F = LID.face
  const K = LID.back
  const cs = (LID.s0 + LID.s1) / 2
  const outline = roundRect(W / 2, L.lidD / 2, L.r, 12, 0, cs)
  const rb = 1.4
  const rows = () => {
    const rim = [
      [LID.rim, F, 0, -1],
      [0.4, F, 0, -1],
    ]
    const ch = [
      [0.4, F, 1, -1],
      [0, F + 0.4, 1, -1],
    ]
    const wall = [[0, F + 0.4, 1, 0], [0, K - rb, 1, 0]]
    for (let j = 1; j <= 4; j++) {
      const a = (j / 4) * (Math.PI / 2)
      wall.push([rb - rb * Math.cos(a), K - rb + rb * Math.sin(a), Math.cos(a), Math.sin(a)])
    }
    return [rim, ch, wall]
  }
  sweep(B, outline, rows, (k) => (k === 1 ? ZONE.lidChamfer : ZONE.lid))
  cap(
    B,
    outline.map((p) => [p.a - p.na * rb, p.b - p.nb * rb]),
    [],
    K,
    true,
    ZONE.lid,
  )
  return B.out()
}

/** The glass (its own frame, the lid's): the face inside the rim, flat, facing -y. uv: the display's
 * own (0..1 across it, v up), outside 0..1 on the bezel. */
export function glassGeometry() {
  const cs = (LID.s0 + LID.s1) / 2
  const ring = roundRect(W / 2 - LID.rim, L.lidD / 2 - LID.rim, L.r - LID.rim, 12, 0, cs)
  const n = ring.length
  const pos = new Float32Array((n + 1) * 3)
  const nrm = new Float32Array((n + 1) * 3)
  const uv = new Float32Array((n + 1) * 2)
  const put = (i, x, s) => {
    pos.set([x, LID.face, s], i * 3)
    nrm.set([0, -1, 0], i * 3)
    uv.set(displayUv(x, s), i * 2)
  }
  put(0, 0, cs)
  ring.forEach((p, i) => put(i + 1, p.a, p.b))
  const idx = []
  // (the ring runs anticlockwise in (x, s): wound this way, the panel faces -y)
  for (let i = 0; i < n; i++) idx.push(0, 1 + i, 1 + ((i + 1) % n))
  return { position: pos, normal: nrm, uv, index: new Uint16Array(idx) }
}
/** The display's uv at a point of the lid's face (x across, s along the lid). */
export function displayUv(x, s) {
  const u = (x + W / 2 - DISP.x) / DISP.w
  const v = (s - (LID.s1 - DISP.y - DISP.h)) / DISP.h
  return [u, v]
}

/** One key (1u), its top at y = 0: a cap with drafted sides and a rounded top edge. */
export function keyGeometry() {
  const B = builder()
  const K = KEY
  const outline = roundRect(K.w0 / 2, K.d0 / 2, K.rc, 4)
  const rows = () => {
    const R = [
      [-0.12, -K.h, 1, 0.1],
      [0, -K.re, 1, 0.1],
    ]
    for (let j = 1; j <= 3; j++) {
      const a = (j / 3) * (Math.PI / 2)
      R.push([K.re - K.re * Math.cos(a), -K.re + K.re * Math.sin(a), Math.cos(a), Math.sin(a)])
    }
    return [R]
  }
  sweep(B, outline, rows, () => 0)
  // the top: a fan from the middle (the middle stays put when the key is stretched)
  const c = B.v(0, 0, 0, 0, 1, 0, 0, 0, 0)
  const ring = outline.map((p) => B.v(p.a - p.na * K.re, 0, p.b - p.nb * K.re, 0, 1, 0, 0, 0, 0))
  for (let i = 0; i < ring.length; i++) B.tri(c, ring[i], ring[(i + 1) % ring.length])
  return B.out()
}

/** Where the hinge's barrel shows: its middle (base frame) and half length; and the lid's reach
 * behind the base's back edge when open (mm). */
export function lidReach(theta = L.open) {
  // (the lid's top back corner, turned about the axis)
  const y = LID.back
  const s = LID.s1
  const z = -y * Math.sin(theta) + s * Math.cos(theta)
  return Math.max(0, -(L.hinge.z + z) - D / 2)
}
