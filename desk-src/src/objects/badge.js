// The ID badge (the owner's own card, its face drawn from their GitHub profile's id-card.svg): a
// laminated card, 56 x 79 x 0.76 mm, a nickel clip on its top edge with a split ring, and a purple
// lanyard (a ribbon loop, both ends on the ring) lying in a loose loop beside it.
//   at rest:   lying face up on the desk, the lanyard in the shape it fell in
//   held:      lifted and turned towards the camera, as a badge is held up to be read; follows the
//              pointer through a critically damped follower; the lanyard hangs from the ring and
//              trails on the desk (a ribbon of particles, position-based dynamics, 120 Hz)
//   set down:  let go, it is laid down where it is, face up (clear of the player and the ashtray)
//   home:      glides back to where it lay (Escape, the reset button)
// Frame: the card in its own x (across) and z (along it, its top, with the clip, towards -z), face
// up (+y), its back on y = 0. The ribbon is in world space.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { followVec } from '../core/follow.js'

export const CARD = { w: 56, h: 79, t: 0.76, r: 3.55 }
const HOLD_SMOOTH = 0.12
const HOLD_MAX_SPEED = 520
// the lanyard: a loop of N particles SP apart (both ends on the ring), WIDE across, R its half
// thickness
const N = 40
const SP = 6.5
const WIDE = 11
const R = 0.5
const SUB = 4
const G = 9810
const RING = new THREE.Vector3(0, 1.3, -CARD.h / 2 - 6.2) // (the ring's centre, in the card's frame)

function roundedRect(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/** The ribbon's weave: purple, a thin cyan line along it, a fine twill (across its width: v). */
function ribbonTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = '#5b33e3'
  g.fillRect(0, 0, 64, 128)
  // the cyan line, a third of the way across
  g.fillStyle = 'rgba(34, 211, 238, 0.62)'
  g.fillRect(0, 38, 64, 8)
  // selvedges: a touch darker
  g.fillStyle = 'rgba(30, 14, 90, 0.35)'
  g.fillRect(0, 0, 64, 5)
  g.fillRect(0, 123, 64, 5)
  // twill: fine diagonal ribs
  for (let i = -128; i < 64; i += 4) {
    g.strokeStyle = 'rgba(255, 255, 255, 0.06)'
    g.lineWidth = 1.2
    g.beginPath()
    g.moveTo(i, 0)
    g.lineTo(i + 128, 128)
    g.stroke()
    g.strokeStyle = 'rgba(0, 0, 0, 0.07)'
    g.beginPath()
    g.moveTo(i + 2, 0)
    g.lineTo(i + 130, 128)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

/**
 * faceTex, backTex: the card's two sides (textures); rest: { x, z, theta } where it lies (theta: the
 * heading of its top on the ground); sdf(x, y, z), sdfGrad(x, y, z, g): the other things on the desk
 * (the player, the ashtray), which the card is set down clear of; ground(x, y, z, r, out): what the
 * lanyard lies on (objects/deskGround.js: the desk, the player, the ashtray, the lighter, the card
 * itself), its push out in out[0..2].
 */
export function createBadge({ faceTex, backTex, rest, sdf, sdfGrad, ground, anisotropy = 8 }) {
  const root = new THREE.Group()
  const group = new THREE.Group() // (the card, the clip, the ring)
  group.matrixAutoUpdate = false
  root.add(group)
  const geometries = []
  const materials = []
  const textures = [faceTex, backTex]
  for (const t of [faceTex, backTex]) {
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = anisotropy
  }

  // ---- the card: its two faces (each its own print) and its edge
  const shape = roundedRect(CARD.w, CARD.h, CARD.r)
  const capGeo = (back) => {
    const g = new THREE.ShapeGeometry(shape, 12)
    const uv = g.attributes.uv
    const pos = g.attributes.position
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + CARD.w / 2) / CARD.w, (pos.getY(i) + CARD.h / 2) / CARD.h)
    g.rotateX(-Math.PI / 2)
    if (back) g.rotateZ(Math.PI)
    else g.translate(0, CARD.t, 0)
    geometries.push(g)
    return g
  }
  const laminate = (map) =>
    new THREE.MeshPhysicalMaterial({ map, roughness: 0.4, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.18, specularIntensity: 0.6 })
  const faceMat = laminate(faceTex)
  const backMat = laminate(backTex)
  const edgeGeo = new THREE.ExtrudeGeometry(shape, { depth: CARD.t, bevelEnabled: false, curveSegments: 12 })
  edgeGeo.rotateX(-Math.PI / 2)
  geometries.push(edgeGeo)
  const edgeMat = new THREE.MeshPhysicalMaterial({ color: 0xeceef1, roughness: 0.5 })
  const hidden = new THREE.MeshBasicMaterial({ visible: false })
  materials.push(faceMat, backMat, edgeMat, hidden)
  const face = new THREE.Mesh(capGeo(false), faceMat)
  const back = new THREE.Mesh(capGeo(true), backMat)
  // (the extrusion's own caps are the faces' places: only its side is drawn)
  const edge = new THREE.Mesh(edgeGeo, [hidden, edgeMat])

  // ---- the clip: a bar gripping the top edge, a tab out from it, the split ring through the tab
  const nickel = new THREE.MeshPhysicalMaterial({ color: 0xd9dbde, metalness: 1, roughness: 0.28 })
  materials.push(nickel)
  const barGeo = new RoundedBoxGeometry(15, 2.4, 4.6, 2, 0.8)
  const tabGeo = new RoundedBoxGeometry(8, 1.1, 8.5, 2, 0.5)
  const ringGeo = new THREE.TorusGeometry(2.9, 0.5, 10, 32).rotateX(Math.PI / 2)
  geometries.push(barGeo, tabGeo, ringGeo)
  const bar = new THREE.Mesh(barGeo, nickel)
  bar.position.set(0, CARD.t / 2, -CARD.h / 2 + 1.3)
  const tab = new THREE.Mesh(tabGeo, nickel)
  tab.position.set(0, CARD.t / 2 + 0.2, -CARD.h / 2 - 4.2)
  const ring = new THREE.Mesh(ringGeo, nickel)
  ring.position.copy(RING)
  group.add(face, back, edge, bar, tab, ring)
  const meshes = [face, back, edge, bar, tab, ring]
  for (const m of meshes) m.castShadow = true

  // ---- the lanyard: a ribbon drawn through its particles (resampled, smooth), both sides
  const M = (N - 1) * 3 + 1 // (points along the drawn ribbon)
  const rPos = new Float32Array(M * 2 * 3)
  const rNrm = new Float32Array(M * 2 * 3)
  const rUv = new Float32Array(M * 2 * 2)
  const rCol = new Float32Array(M * 2 * 3)
  const idx = []
  for (let k = 0; k < M - 1; k++) {
    const a = k * 2
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }
  const ribbonGeo = new THREE.BufferGeometry()
  ribbonGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3).setUsage(THREE.DynamicDrawUsage))
  ribbonGeo.setAttribute('normal', new THREE.BufferAttribute(rNrm, 3).setUsage(THREE.DynamicDrawUsage))
  ribbonGeo.setAttribute('uv', new THREE.BufferAttribute(rUv, 2))
  ribbonGeo.setAttribute('color', new THREE.BufferAttribute(rCol, 3))
  ribbonGeo.setIndex(idx)
  geometries.push(ribbonGeo)
  const weave = ribbonTexture()
  textures.push(weave)
  weave.repeat.set((N * SP) / 22, 1)
  const ribbonMat = new THREE.MeshPhysicalMaterial({ map: weave, vertexColors: true, roughness: 0.72, sheen: 0.6, sheenRoughness: 0.5, sheenColor: 0x9a86ff, side: THREE.DoubleSide })
  materials.push(ribbonMat)
  // (its colour along it: the strap's purple at the ring, a little bluer at the far end of the loop)
  const cA = new THREE.Color(0x7a3cf0)
  const cB = new THREE.Color(0x5a52ee)
  const cc = new THREE.Color()
  for (let k = 0; k < M; k++) {
    const s = k / (M - 1)
    cc.copy(cA).lerp(cB, Math.sin(Math.PI * s))
    for (let e = 0; e < 2; e++) {
      rCol.set([cc.r, cc.g, cc.b], (k * 2 + e) * 3)
      rUv.set([(s * N * SP) / (N * SP), e], (k * 2 + e) * 2)
    }
  }
  ribbonGeo.attributes.color.needsUpdate = true
  const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat)
  ribbon.castShadow = true
  ribbon.frustumCulled = false
  root.add(ribbon)

  // ---- the lanyard's particles
  const x = new Float64Array(N * 3)
  const p = new Float64Array(N * 3)
  const x0 = new Float64Array(N * 3) // (where each was at the start of the step: for sleeping)
  const onDesk = new Uint8Array(N)
  const gp = new Float64Array(6)
  const ringW = new THREE.Vector3()
  const ringFrom = new THREE.Vector3()
  const lan = { awake: true, still: 0 }

  // ---- state
  const REST = new THREE.Matrix4()
  const st = {
    mode: 'rest', // rest | held | down | glide
    P: new THREE.Vector3(),
    V: new THREE.Vector3(),
    T: new THREE.Vector3(),
    off: new THREE.Vector3(),
    offSet: false,
    holdY: 34,
    yaw: 0,
    up: 0,
    q0: new THREE.Quaternion(),
    qShow: new THREE.Quaternion(),
    t: 0,
    from: new THREE.Vector3(),
    fromQ: new THREE.Quaternion(),
    to: new THREE.Vector3(),
    toQ: new THREE.Quaternion(),
    hop: 0,
  }
  const tv = new THREE.Vector3()
  const tw = new THREE.Vector3()
  const ax = new THREE.Vector3()
  const ay = new THREE.Vector3()
  const az = new THREE.Vector3()
  const qa = new THREE.Quaternion()
  const qy = new THREE.Quaternion()
  const one = new THREE.Vector3(1, 1, 1)
  const m4 = new THREE.Matrix4()
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const before = new THREE.Matrix4()

  /** A pose lying face up at (x, z), its top heading theta (from +x towards +z). */
  function lyingAt(px, pz, theta, out) {
    // its top (-z local) along (cos, sin) on the ground
    az.set(-Math.cos(theta), 0, -Math.sin(theta))
    ay.set(0, 1, 0)
    ax.crossVectors(ay, az)
    out.makeBasis(ax, ay, az)
    out.setPosition(px, 0, pz)
    return out
  }
  lyingAt(rest.x, rest.z, rest.theta, REST)
  group.matrix.copy(REST)

  /** The ring's centre, world, now. */
  const ringNow = (out) => out.copy(RING).applyMatrix4(group.matrix)

  // ---- the lanyard laid out beside the card (pose m), flat on the desk: a loose loop out from the
  // ring, the way that leaves it clearest of the player and the ashtray (out[0..N*3])
  const tgt = new Float64Array(N * 3)
  const xs = new Float64Array(N * 3)
  const ringAt = new THREE.Vector3()
  const raw = new Float64Array(401 * 2)
  const rawAcc = new Float64Array(401)
  function loopPoints(turn, m, out) {
    const e = m.elements
    const dx = -e[8]
    const dz = -e[10]
    const ox = dx * Math.cos(turn) - dz * Math.sin(turn)
    const oz = dx * Math.sin(turn) + dz * Math.cos(turn)
    // a teardrop (112 mm out, 30 across), resampled to the particles' spacing
    for (let k = 0; k <= 400; k++) {
      const a = (2 * Math.PI * k) / 400
      const o = (1 - Math.cos(a)) / 2
      const side = Math.sin(a) * (0.55 + 0.45 * o) * 30
      raw[k * 2] = ringAt.x + ox * o * 112 - oz * side
      raw[k * 2 + 1] = ringAt.z + oz * o * 112 + ox * side
      rawAcc[k] = k ? rawAcc[k - 1] + Math.hypot(raw[k * 2] - raw[k * 2 - 2], raw[k * 2 + 1] - raw[k * 2 - 1]) : 0
    }
    const L = rawAcc[400]
    let clear = Infinity
    let k = 1
    for (let i = 0; i < N; i++) {
      const want = (i / (N - 1)) * L
      while (k < 400 && rawAcc[k] < want) k++
      const f = (want - rawAcc[k - 1]) / Math.max(1e-9, rawAcc[k] - rawAcc[k - 1])
      const px = raw[k * 2 - 2] + (raw[k * 2] - raw[k * 2 - 2]) * f
      const pz = raw[k * 2 - 1] + (raw[k * 2 + 1] - raw[k * 2 - 1]) * f
      out[i * 3] = px
      out[i * 3 + 1] = R
      out[i * 3 + 2] = pz
      clear = Math.min(clear, sdf(px, 1, pz))
    }
    return clear
  }
  const TURNS = [0.45, -0.45, 0.95, -0.95, 0, 1.5, -1.5]
  function layoutFor(m, out) {
    ringAt.copy(RING).applyMatrix4(m)
    let best = TURNS[0]
    let bestClear = -Infinity
    for (const t of TURNS) {
      const c = loopPoints(t, m, out)
      // (the first that is clear by a few millimetres wins: the loop prefers its own way)
      if (c > 6) {
        best = t
        bestClear = c
        break
      }
      if (c > bestClear) {
        bestClear = c
        best = t
      }
    }
    loopPoints(best, m, out)
    return out
  }
  /** At rest where the card lies: laid out, then let fall and settle into its own curves. */
  function layLanyard() {
    layoutFor(group.matrix, x)
    for (let i = 0; i < N; i++) x[i * 3 + 1] = R + 0.6
    p.set(x)
    ringNow(ringFrom)
    lan.awake = true
    lan.still = 0
    for (let k = 0; k < 360 && lan.awake; k++) stepLanyard(1 / 120)
    lan.awake = false
  }

  function stepLanyard(h) {
    ringNow(ringW)
    x0.set(x)
    const hs = h / SUB
    const keep = 1 - 2.5 * hs
    const gy = G * hs * hs
    for (let s = 0; s < SUB; s++) {
      const f = (s + 1) / SUB
      const rx = ringFrom.x + (ringW.x - ringFrom.x) * f
      const ry = ringFrom.y + (ringW.y - ringFrom.y) * f
      const rz = ringFrom.z + (ringW.z - ringFrom.z) * f
      // inertia, gravity, a little air
      for (let i = 1; i < N - 1; i++) {
        const j = i * 3
        const vx = (x[j] - p[j]) * keep
        const vy = (x[j + 1] - p[j + 1]) * keep
        const vz = (x[j + 2] - p[j + 2]) * keep
        p[j] = x[j]
        p[j + 1] = x[j + 1]
        p[j + 2] = x[j + 2]
        x[j] += vx
        x[j + 1] += vy - gy
        x[j + 2] += vz
      }
      // both ends on the ring (a little apart, as the strap is folded through it)
      for (const [i, sgn] of [[0, -1], [N - 1, 1]]) {
        const j = i * 3
        p[j] = x[j]
        p[j + 1] = x[j + 1]
        p[j + 2] = x[j + 2]
        x[j] = rx + sgn * 1.2 * group.matrix.elements[0]
        x[j + 1] = ry
        x[j + 2] = rz + sgn * 1.2 * group.matrix.elements[2]
      }
      for (let it = 0; it < 3; it++) {
        // lengths (the ends fixed)
        for (let i = 0; i < N - 1; i++) {
          const a = i * 3
          const b = a + 3
          const dx = x[b] - x[a]
          const dy = x[b + 1] - x[a + 1]
          const dz = x[b + 2] - x[a + 2]
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (d < 1e-9) continue
          const wa = i === 0 ? 0 : 1
          const wb = i + 1 === N - 1 ? 0 : 1
          if (wa + wb === 0) continue
          const c = (d - SP) / d / (wa + wb)
          x[a] += dx * c * wa
          x[a + 1] += dy * c * wa
          x[a + 2] += dz * c * wa
          x[b] -= dx * c * wb
          x[b + 1] -= dy * c * wb
          x[b + 2] -= dz * c * wb
        }
        // bending: each pair two apart drawn towards straight, softly (a strap curves, it does
        // not kink)
        for (let i = 0; i < N - 2; i++) {
          const a = i * 3
          const b = a + 6
          const dx = x[b] - x[a]
          const dy = x[b + 1] - x[a + 1]
          const dz = x[b + 2] - x[a + 2]
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
          const want = 2 * SP * 0.97
          if (d >= want || d < 1e-9) continue
          const wa = i === 0 ? 0 : 1
          const wb = i + 2 === N - 1 ? 0 : 1
          if (wa + wb === 0) continue
          const c = ((d - want) / d / (wa + wb)) * 0.18
          x[a] += dx * c * wa
          x[a + 1] += dy * c * wa
          x[a + 2] += dz * c * wa
          x[b] -= dx * c * wb
          x[b + 1] -= dy * c * wb
          x[b + 2] -= dz * c * wb
        }
      }
      // the desk and what is on it
      for (let i = 1; i < N - 1; i++) {
        const j = i * 3
        onDesk[i] = 0
        if (ground(x[j], x[j + 1], x[j + 2], R, gp)) {
          // (moved out, its previous place left: the push takes up its speed into the surface, no
          // bounce)
          x[j] += gp[0]
          x[j + 1] += gp[1]
          x[j + 2] += gp[2]
          onDesk[i] = 1
        }
        // friction where it lies: its slide slowed, a slow one stopped
        if (onDesk[i]) {
          const sx = x[j] - p[j]
          const sz = x[j + 2] - p[j + 2]
          const sl = Math.hypot(sx, sz)
          const k = sl < 0.004 ? 1 : 0.35
          x[j] -= sx * k
          x[j + 2] -= sz * k
        }
      }
    }
    ringFrom.copy(ringW)
    // asleep once nothing has moved a hundredth of a millimetre for half a second, with the card still
    let big = 0
    for (let i = 0; i < N * 3; i++) big = Math.max(big, Math.abs(x[i] - x0[i]))
    lan.still = big < 0.01 && st.mode === 'rest' ? lan.still + h : 0
    if (lan.still > 0.5) lan.awake = false
  }

  // ---- the ribbon drawn: smooth through the particles, flat on the desk, its width along the
  // ground where it lies and carried along it (parallel transport) where it hangs
  const C = new Float64Array(M * 3)
  const T = new THREE.Vector3()
  const B = new THREE.Vector3()
  const Bf = new THREE.Vector3()
  const Nn = new THREE.Vector3()
  const UP = new THREE.Vector3(0, 1, 0)
  function catmull(i, t, out, o) {
    const i0 = Math.max(0, i - 1) * 3
    const i1 = i * 3
    const i2 = Math.min(N - 1, i + 1) * 3
    const i3 = Math.min(N - 1, i + 2) * 3
    const t2 = t * t
    const t3 = t2 * t
    for (let a = 0; a < 3; a++) {
      const p0 = x[i0 + a]
      const p1 = x[i1 + a]
      const p2 = x[i2 + a]
      const p3 = x[i3 + a]
      out[o + a] = 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
    }
  }
  function drawRibbon() {
    for (let k = 0; k < M; k++) {
      const i = Math.min(N - 2, Math.floor(k / 3))
      catmull(i, k / 3 - i, C, k * 3)
    }
    B.set(0, 0, 0)
    for (let k = 0; k < M; k++) {
      const a = Math.max(0, k - 1) * 3
      const b = Math.min(M - 1, k + 1) * 3
      T.set(C[b] - C[a], C[b + 1] - C[a + 1], C[b + 2] - C[a + 2]).normalize()
      // where it lies flat: across it on the ground; where it hangs: the last across, carried on
      Bf.crossVectors(T, UP)
      const flatW = Bf.length()
      if (flatW > 1e-3) Bf.divideScalar(flatW)
      if (k === 0) B.copy(Bf)
      else {
        B.addScaledVector(T, -B.dot(T))
        if (B.lengthSq() < 1e-8) B.copy(Bf)
        B.normalize()
        if (flatW > 1e-3) {
          if (Bf.dot(B) < 0) Bf.negate()
          const low = C[k * 3 + 1] < R + 1.2 ? 0.85 : 0.18
          B.lerp(Bf, low * Math.min(1, flatW * 1.5)).normalize()
        }
      }
      Nn.crossVectors(B, T).normalize()
      if (Nn.y < 0 && flatW > 0.5) {
        Nn.negate()
        B.negate()
      }
      // (later stretches a hair above earlier ones: where the loop crosses itself, one lies on the
      // other, not through it)
      const lift = 0.012 * (k / 3)
      for (let e = 0; e < 2; e++) {
        const sg = e === 0 ? -0.5 : 0.5
        const o = (k * 2 + e) * 3
        rPos[o] = C[k * 3] + B.x * WIDE * sg
        rPos[o + 1] = C[k * 3 + 1] + B.y * WIDE * sg + lift
        rPos[o + 2] = C[k * 3 + 2] + B.z * WIDE * sg
        rNrm[o] = Nn.x
        rNrm[o + 1] = Nn.y
        rNrm[o + 2] = Nn.z
      }
    }
    ribbonGeo.attributes.position.needsUpdate = true
    ribbonGeo.attributes.normal.needsUpdate = true
  }

  // ---- set down clear of the player and the ashtray: the place moved out of them, a margin round
  const g3 = new Float64Array(3)
  function clearOf(v) {
    for (let k = 0; k < 4; k++) {
      const d = sdfGrad(v.x, 1, v.z, g3) - 36
      if (d >= 0) break
      const l = Math.hypot(g3[0], g3[2]) || 1
      v.x -= (g3[0] / l) * d
      v.z -= (g3[2] / l) * d
    }
    return v
  }

  layLanyard()
  drawRibbon()

  const api = {
    root,
    group,
    meshes,
    ribbon,
    st,
    /** The card's box, as the earbud cable lies on it ({ half, r, y0 } in its frame). */
    box: { half: [CARD.w / 2, CARD.t / 2, CARD.h / 2], r: 0.35, y0: CARD.t / 2 },
    /** The card's centre (world), for the camera. */
    center: (out) => out.set(0, CARD.t, 0).applyMatrix4(group.matrix),
    pick(camera) {
      before.copy(group.matrix)
      st.P.setFromMatrixPosition(group.matrix)
      st.V.set(0, 0, 0)
      group.matrix.decompose(tv, st.q0, tw)
      // held up to be read: its face turned most of the way towards the camera, its top up the
      // picture (the camera's own up), at a hand's height
      tv.subVectors(camera.position, st.P).normalize()
      az.copy(UP).lerp(tv, 0.62).normalize() // (the face's normal)
      ay.set(0, 1, 0).applyQuaternion(camera.quaternion) // (up the picture)
      ay.addScaledVector(az, -ay.dot(az)).normalize()
      // card frame: x across, y the face normal, z down the card (its top at -z)
      tw.copy(ay).negate() // (+z local: down the picture)
      ax.crossVectors(az, tw).normalize()
      m4.makeBasis(ax, az, tw)
      st.qShow.setFromRotationMatrix(m4)
      st.yaw = 0
      st.up = 0
      st.holdY = 34
      st.T.copy(st.P)
      st.T.y = st.holdY
      st.offSet = false
      st.mode = 'held'
      lan.awake = true
      lan.still = 0
    },
    aim(r) {
      plane.constant = -st.holdY
      if (!r.intersectPlane(plane, tw)) return
      if (!st.offSet) {
        st.off.set(st.P.x - tw.x, 0, st.P.z - tw.z)
        st.offSet = true
      }
      tw.add(st.off)
      st.T.copy(tw)
      // (over the ashtray, held higher)
      st.T.y = sdf(tw.x, 0, tw.z) < 25 ? 72 : st.holdY
    },
    twist(rad) {
      st.yaw += rad
    },
    cancel() {
      group.matrix.copy(before)
      group.matrixWorldNeedsUpdate = true
      st.mode = 'rest'
      layoutFor(before, x)
      p.set(x)
      lan.awake = false
      drawRibbon()
    },
    /** Let go: laid down where it is, face up, clear of the player and the ashtray. */
    release() {
      if (st.mode !== 'held') return
      group.matrix.decompose(st.from, st.fromQ, tw)
      // its top's heading on the ground, kept
      tv.set(0, 0, -1).applyQuaternion(st.fromQ)
      const theta = Math.atan2(tv.z, tv.x)
      tw.set(st.from.x, 0, st.from.z)
      clearOf(tw)
      lyingAt(tw.x, tw.z, theta, m4)
      m4.decompose(st.to, st.toQ, tv)
      st.t = 0
      st.hop = 0
      st.mode = 'down'
      // (its lanyard laid out beside it as it goes down: a hand puts a badge down, it does not drop
      // a heap of strap)
      layoutFor(m4, tgt)
      xs.set(x)
      lan.awake = false
    },
    /** Back where it lay (a short glide). */
    home() {
      if (st.mode === 'rest' && group.matrix.equals(REST)) return
      group.matrix.decompose(st.from, st.fromQ, tw)
      REST.decompose(st.to, st.toQ, tw)
      st.t = 0
      st.hop = 14
      st.mode = 'glide'
      layoutFor(REST, tgt)
      xs.set(x)
      lan.awake = false
    },
    /** For the physics scheduler: the lanyard. */
    physics: { awake: () => lan.awake, step: (h) => stepLanyard(h) },
    /** Each frame; returns true while anything of it moved. */
    update(dt) {
      let moved = false
      if (st.mode === 'held') {
        followVec(st.P, st.V, st.T, dt, HOLD_SMOOTH, HOLD_MAX_SPEED)
        st.up = Math.min(1, st.up + dt / 0.4)
        const eu = st.up * st.up * (3 - 2 * st.up)
        qa.slerpQuaternions(st.q0, st.qShow, eu)
        if (st.yaw) qa.premultiply(qy.setFromAxisAngle(UP, st.yaw))
        group.matrix.compose(st.P, qa, one)
        moved = true
      } else if (st.mode === 'down' || st.mode === 'glide') {
        st.t = Math.min(1, st.t + dt / (st.mode === 'down' ? 0.45 : 0.6))
        const e = st.t * st.t * st.t * (st.t * (6 * st.t - 15) + 10)
        tv.lerpVectors(st.from, st.to, e)
        tv.y += Math.sin(Math.PI * e) * st.hop
        qa.slerpQuaternions(st.fromQ, st.toQ, e)
        group.matrix.compose(tv, qa, one)
        // the lanyard, from where it hung to its place beside the card, lifted a little on the way
        const lift = Math.sin(Math.PI * e) * 4
        for (let i = 0; i < N * 3; i++) x[i] = xs[i] + (tgt[i] - xs[i]) * e
        for (let i = 1; i < N - 1; i++) x[i * 3 + 1] += lift
        p.set(x)
        if (st.t >= 1) st.mode = 'rest'
        group.matrixWorldNeedsUpdate = true
        drawRibbon()
        return true
      }
      if (moved) {
        group.matrixWorldNeedsUpdate = true
        lan.awake = true
        lan.still = 0
      }
      if (lan.awake || moved) drawRibbon()
      return moved || lan.awake
    },
    reset() {
      group.matrix.copy(REST)
      group.matrixWorldNeedsUpdate = true
      st.mode = 'rest'
      layLanyard()
      drawRibbon()
    },
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
      for (const t of textures) t.dispose()
    },
  }
  return api
}
