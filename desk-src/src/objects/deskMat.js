// The desk mat: a wool-felt desk pad, 3 mm thick, its edge rolled and overlocked with a thread of
// its own colour, lying under the still life (the notebook beside it, on the bare desk). Its top
// is the desk's own height (y = 0), where everything already rests: nothing that lies or falls on
// the desk changes; the desk itself is moved down by the mat's thickness.
// Frame: x across the picture (u), z down it (v), y up: the view's own axes (layout.js), so its
// edges run straight across the picture.
import * as THREE from 'three'

export const MAT = {
  t: 3, // (mm, thick)
  // its extent in the view's axes (mm): from far off the picture's left to between the ashtray and
  // the notebook, a hand's width above and below the objects
  u0: -700,
  u1: 86,
  v0: -125, // (in front of the laptop, which stands on the bare desk)
  v1: 168,
  r: 16, // (the corners' radius)
  edge: 3.4, // (the rolled edge's width, mm)
  tile: 64, // (mm the felt's texture covers before it repeats)
}

/** The colours it comes in: the felt, the overlock thread round its edge, the felt's sheen. */
export const MAT_COLORS = {
  slate: { felt: 0x3d4452, thread: 0x2c313b, sheen: 0x8c95a8 },
  sage: { felt: 0x7e9183, thread: 0x627467, sheen: 0xcdd8cf },
  rust: { felt: 0x9a5640, thread: 0x7a412f, sheen: 0xe2a58c },
  oat: { felt: 0xc9bea9, thread: 0xa99d86, sheen: 0xf2ece0 },
  heather: { felt: 0xa3a5a8, thread: 0x7f8287, sheen: 0xe6e8ec },
}

/** A seeded random (the felt is the same every time). */
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * The felt, tiling: a mat of fine fibres laid every way, its colour a little uneven (RGB: the
 * fibres' shading, grey, the felt's colour comes from the material), and its relief (A). S px square.
 */
function feltCanvas(S) {
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  g.fillStyle = '#808080'
  g.fillRect(0, 0, S, S)
  const rnd = rng(11)
  // (each stroke drawn at the eight neighbouring tiles too: the texture tiles without a seam)
  const strokeWrapped = (draw) => {
    for (let dx = -S; dx <= S; dx += S) for (let dy = -S; dy <= S; dy += S) draw(dx, dy)
  }
  // soft blotches: felt is pressed, never quite even
  for (let i = 0; i < 90; i++) {
    const x = rnd() * S
    const y = rnd() * S
    const r = S * (0.05 + 0.12 * rnd())
    const l = rnd() < 0.5 ? 255 : 0
    strokeWrapped((dx, dy) => {
      const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r)
      gr.addColorStop(0, `rgba(${l},${l},${l},0.016)`)
      gr.addColorStop(1, `rgba(${l},${l},${l},0)`)
      g.fillStyle = gr
      g.fillRect(x + dx - r, y + dy - r, 2 * r, 2 * r)
    })
  }
  // the fibres: short, curling, light and dark, every way
  g.lineCap = 'round'
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * S
    const y = rnd() * S
    const a = rnd() * Math.PI * 2
    const len = S * (0.01 + 0.035 * rnd())
    const bend = (rnd() - 0.5) * 1.6
    const light = rnd() < 0.5
    const k = 0.05 + 0.1 * rnd()
    g.strokeStyle = light ? `rgba(255,255,255,${k})` : `rgba(0,0,0,${k})`
    g.lineWidth = 0.6 + 0.9 * rnd()
    const mx = x + Math.cos(a + bend) * len * 0.5
    const my = y + Math.sin(a + bend) * len * 0.5
    const ex = x + Math.cos(a) * len
    const ey = y + Math.sin(a) * len
    strokeWrapped((dx, dy) => {
      g.beginPath()
      g.moveTo(x + dx, y + dy)
      g.quadraticCurveTo(mx + dx, my + dy, ex + dx, ey + dy)
      g.stroke()
    })
  }
  return c
}

/** A normal map from the felt's shading (its relief, gently: felt is soft). */
function normalsFrom(src, strength) {
  const S = src.width
  const d = src.getContext('2d').getImageData(0, 0, S, S).data
  const out = document.createElement('canvas')
  out.width = out.height = S
  const og = out.getContext('2d')
  const img = og.createImageData(S, S)
  const h = (x, y) => d[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255
  for (let y = 0; y < S; y++)
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

/** The overlock thread: tight stitches across the edge, slanted (u along the edge, v across it). */
function threadCanvas() {
  const W = 64
  const H = 32
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  g.fillStyle = '#7a7a7a'
  g.fillRect(0, 0, W, H)
  // (eight stitches a tile; each a slanted strand, lit along its middle)
  for (let i = -2; i < 10; i++) {
    const x = i * 8
    const gr = g.createLinearGradient(x, 0, x + 6, 0)
    gr.addColorStop(0, 'rgba(40,40,40,0.9)')
    gr.addColorStop(0.5, 'rgba(200,200,200,0.9)')
    gr.addColorStop(1, 'rgba(40,40,40,0.9)')
    g.fillStyle = gr
    g.beginPath()
    g.moveTo(x, H)
    g.lineTo(x + 6, H)
    g.lineTo(x + 10, 0)
    g.lineTo(x + 4, 0)
    g.closePath()
    g.fill()
  }
  return c
}

/** The mat's outline: a rounded rectangle, as points with their outward normals (counter-clockwise seen from above). */
function outline(m, perCorner = 14) {
  const pts = []
  const { u0, u1, v0, v1, r } = m
  // corners, in order round the outline (in x = u, z = v; from above, +x right, +z towards the viewer)
  const corners = [
    [u1 - r, v1 - r, 0], // (lower right: from pointing right to pointing down the picture)
    [u0 + r, v1 - r, Math.PI / 2],
    [u0 + r, v0 + r, Math.PI],
    [u1 - r, v0 + r, (3 * Math.PI) / 2],
  ]
  for (const [cx, cz, a0] of corners)
    for (let k = 0; k <= perCorner; k++) {
      const a = a0 + (k / perCorner) * (Math.PI / 2)
      const nx = Math.cos(a)
      const nz = Math.sin(a)
      pts.push({ x: cx + nx * r, z: cz + nz * r, nx, nz })
    }
  return pts
}

/**
 * The mat. colors: one of MAT_COLORS. Returns { group, meshes, materials (for the ember's light),
 * setColors(c), dispose() }.
 */
export function createDeskMat({ fwd, right, colors = MAT_COLORS.slate, anisotropy = 4 }) {
  const m = MAT
  const group = new THREE.Group()
  // (x along RIGHT, z down the picture, y up)
  const down = new THREE.Vector3(-fwd[0], 0, -fwd[2])
  group.matrix.makeBasis(new THREE.Vector3(right[0], 0, right[2]), new THREE.Vector3(0, 1, 0), down)
  group.matrixAutoUpdate = false
  group.matrixWorldNeedsUpdate = true

  // ---- textures
  const felt = feltCanvas(512)
  const feltTex = new THREE.CanvasTexture(felt)
  const feltNrm = new THREE.CanvasTexture(normalsFrom(felt, 2.2))
  const threadTex = new THREE.CanvasTexture(threadCanvas())
  for (const t of [feltTex, feltNrm, threadTex]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = anisotropy
  }
  feltTex.colorSpace = threadTex.colorSpace = THREE.SRGBColorSpace

  // ---- the felt: the top, inside the rolled edge
  const inset = m.edge * 0.55
  const shape = new THREE.Shape()
  {
    const p = outline({ ...m, u0: m.u0 + inset, u1: m.u1 - inset, v0: m.v0 + inset, v1: m.v1 - inset, r: m.r - inset }, 10)
    shape.moveTo(p[0].x, p[0].z)
    for (let i = 1; i < p.length; i++) shape.lineTo(p[i].x, p[i].z)
  }
  const topGeo = new THREE.ShapeGeometry(shape)
  // (into the desk's plane, facing up; its uv in tiles of felt)
  topGeo.rotateX(Math.PI / 2)
  {
    const pos = topGeo.attributes.position
    const uv = topGeo.attributes.uv
    const nrm = topGeo.attributes.normal
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / m.tile, pos.getZ(i) / m.tile)
      nrm.setXYZ(i, 0, 1, 0)
    }
    // (rotateX turned it to face down: its triangles' winding turned back up)
    const idx = topGeo.index.array
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1]
      idx[i + 1] = idx[i + 2]
      idx[i + 2] = t
    }
  }
  // (a plain rough surface: felt's soft sheen is a grazing-angle effect, and from above, where the
  // camera always is, it showed as nothing but a full extra lighting term over the whole screen)
  const feltMat = new THREE.MeshStandardMaterial({
    map: feltTex,
    normalMap: feltNrm,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.94,
    metalness: 0,
    envMapIntensity: 0.85,
  })
  feltMat.customProgramCacheKey = () => 'deskMat.felt'

  // ---- the rolled edge: a profile swept round the outline, from inside the felt's top, over a
  // slight roll, down the side to the desk
  // (profile: [out from the outline (mm, negative is in), height])
  const T = m.t
  const prof = [
    [-m.edge, T - 0.05],
    [-m.edge * 0.75, T + 0.12],
    [-m.edge * 0.45, T + 0.3],
    [-m.edge * 0.2, T + 0.22],
    [-0.05, T - 0.35],
    [0, T * 0.5],
    [-0.1, 0.05],
  ]
  const ring = outline(m, 14)
  const N = ring.length
  const P = prof.length
  const pos = new Float32Array((N + 1) * P * 3)
  const nrm = new Float32Array((N + 1) * P * 3)
  const uv = new Float32Array((N + 1) * P * 2)
  // (the profile's own normals, in (out, up))
  const pn = prof.map((p, i) => {
    const a = prof[Math.max(0, i - 1)]
    const b = prof[Math.min(P - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    return [dy / l, -dx / l]
  })
  let along = 0
  for (let i = 0; i <= N; i++) {
    const q = ring[i % N]
    if (i > 0) {
      const w = ring[(i - 1) % N]
      along += Math.hypot(q.x - w.x, q.z - w.z)
    }
    for (let j = 0; j < P; j++) {
      const o = (i * P + j) * 3
      pos[o] = q.x + q.nx * prof[j][0]
      pos[o + 1] = prof[j][1] - T // (the top at y = 0)
      pos[o + 2] = q.z + q.nz * prof[j][0]
      nrm[o] = q.nx * pn[j][0]
      nrm[o + 1] = pn[j][1]
      nrm[o + 2] = q.nz * pn[j][0]
      const l = Math.hypot(nrm[o], nrm[o + 1], nrm[o + 2]) || 1
      nrm[o] /= l
      nrm[o + 1] /= l
      nrm[o + 2] /= l
      uv[(i * P + j) * 2] = along / 2.4 // (a stitch every 2.4 mm along the edge)
      uv[(i * P + j) * 2 + 1] = j / (P - 1)
    }
  }
  const idx = []
  for (let i = 0; i < N; i++)
    for (let j = 0; j + 1 < P; j++) {
      const a = i * P + j
      const b = (i + 1) * P + j
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  const edgeGeo = new THREE.BufferGeometry()
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  edgeGeo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3))
  edgeGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  edgeGeo.setIndex(idx)
  // (u: stitches along the edge, eight to a tile of the thread's texture)
  threadTex.repeat.set(1 / 8, 1)
  const threadMat = new THREE.MeshPhysicalMaterial({ map: threadTex, roughness: 0.7, sheen: 0.6, sheenRoughness: 0.5, envMapIntensity: 0.9 })
  threadMat.customProgramCacheKey = () => 'deskMat.thread'

  // the felt's top lies at y = 0 too (the edge's roll stands a fraction above it)
  const top = new THREE.Mesh(topGeo, feltMat)
  const edge = new THREE.Mesh(edgeGeo, threadMat)
  for (const o of [top, edge]) {
    o.receiveShadow = true
    o.castShadow = true
    // (drawn after the objects on it: what lies on the mat hides it, and those pixels are not shaded)
    o.renderOrder = 1
  }
  top.name = 'deskMat.felt'
  edge.name = 'deskMat.edge'
  group.add(top, edge)

  function setColors(c) {
    feltMat.color.set(c.felt)
    threadMat.color.set(c.thread)
    threadMat.sheenColor.set(c.sheen)
  }
  setColors(colors)

  return {
    group,
    meshes: [top, edge],
    materials: [feltMat, threadMat],
    setColors,
    /** Is (u, v) on the mat (mm, the view's axes)? */
    contains: (u, v) => u > m.u0 && u < m.u1 && v > m.v0 && v < m.v1,
    dispose() {
      for (const x of [topGeo, edgeGeo, feltMat, threadMat, feltTex, feltNrm, threadTex]) x.dispose()
    },
  }
}
