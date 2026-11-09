// The ID badge (the owner's own card, its face drawn from their GitHub profile's id-card.svg): a
// laminated card, 56 x 79 x 0.76 mm, a nickel clip on its top edge with a split ring.
//   at rest:   lying face up on the desk
//   held:      lifted and turned towards the camera, as a badge is held up to be read; follows the
//              pointer through a critically damped follower
//   set down:  let go, it is laid down where it is, face up (clear of the player and the ashtray)
//   home:      glides back to where it lay (Escape, the reset button)
// Frame: the card in its own x (across) and z (along it, its top, with the clip, towards -z), face
// up (+y), its back on y = 0.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { followVec } from '../core/follow.js'

export const CARD = { w: 56, h: 79, t: 0.76, r: 3.55 }
const HOLD_SMOOTH = 0.12
const HOLD_MAX_SPEED = 520
const UP = new THREE.Vector3(0, 1, 0)
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

/**
 * faceTex, backTex: the card's two sides (textures); rest: { x, z, theta } where it lies (theta: the
 * heading of its top on the ground); sdf(x, y, z), sdfGrad(x, y, z, g): the other things on the desk
 * (the player, the ashtray), which the card is set down clear of.
 */
export function createBadge({ faceTex, backTex, rest, sdf, sdfGrad, anisotropy = 8 }) {
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

  const api = {
    root,
    group,
    meshes,
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
    },
    /** Back where it lay (a short glide). */
    home() {
      if (st.mode === 'rest' && group.matrix.equals(REST)) return
      group.matrix.decompose(st.from, st.fromQ, tw)
      REST.decompose(st.to, st.toQ, tw)
      st.t = 0
      st.hop = 14
      st.mode = 'glide'
    },
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
        if (st.t >= 1) st.mode = 'rest'
        moved = true
      }
      if (moved) group.matrixWorldNeedsUpdate = true
      return moved
    },
    reset() {
      group.matrix.copy(REST)
      group.matrixWorldNeedsUpdate = true
      st.mode = 'rest'
    },
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
      for (const t of textures) t.dispose()
    },
  }
  return api
}
