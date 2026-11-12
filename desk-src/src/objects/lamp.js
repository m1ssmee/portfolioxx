// The desk lamp: a slim black architect's lamp, a weighted round base at the back corner of the
// desk, two arms of twin rods (a spring along the lower one), and a small round shade aimed down
// at the desk: the room's key light at dusk comes from its bulb (the scene's SpotLight).
// Built straight in world space from three points: the base, the head's pivot, and what it aims at.
import * as THREE from 'three'

const L1 = 420 // (the lower arm, from the base's swivel to the elbow)
const L2 = 340 // (the upper arm, from the elbow to the head)
const ROD = 3.1
const GAP = 7 // (each rod this far either side of the arm's plane)

/** A rod (a thin cylinder) from a to b. */
function rodBetween(a, b, r, mat, out) {
  const d = new THREE.Vector3().subVectors(b, a)
  const g = new THREE.CylinderGeometry(r, r, d.length(), 12, 1)
  const m = new THREE.Mesh(g, mat)
  m.position.copy(a).addScaledVector(d, 0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
  out.push(m)
  return m
}

/**
 * base: the middle of its foot on the desk (world); head: the shade's pivot (world); aim: the point
 * of the desk it lights (world). Returns { group, meshes, bulb (world position), axis (world unit
 * vector, the shade's), materials, dispose() }.
 */
export function createLamp({ base, head, aim }) {
  const group = new THREE.Group()
  const meshes = []
  const black = new THREE.MeshPhysicalMaterial({ color: 0x1a1a1c, roughness: 0.48, metalness: 0.15, clearcoat: 0.2, clearcoatRoughness: 0.5 })
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x8c9096, roughness: 0.32, metalness: 1 })
  const inner = new THREE.MeshStandardMaterial({ color: 0xf2ece2, roughness: 0.75, side: THREE.BackSide, emissive: 0xffd9a8, emissiveIntensity: 0.18 })
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.93, 0.8).multiplyScalar(3.2) })
  const materials = [black, steel, inner, bulbMat]

  // ---- the foot: a heavy disc with a rounded edge, a swivel on it
  const foot = new THREE.LatheGeometry(
    [
      [0, 0],
      [70, 0],
      [72.5, 2.2],
      [73, 8],
      [71.5, 14],
      [67, 16.5],
      [24, 17.5],
      [17, 20],
      [16, 34],
      [0, 34],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    48,
  )
  foot.translate(base.x, base.y, base.z)
  meshes.push(new THREE.Mesh(foot, black))
  const B = new THREE.Vector3(base.x, base.y + 34, base.z)

  // ---- the arms: the elbow where the two lengths meet, in the vertical plane through foot and head
  const H = head.clone()
  const flat = new THREE.Vector3(H.x - B.x, 0, H.z - B.z)
  const across = new THREE.Vector3(-flat.z, 0, flat.x).normalize() // (the joints' axis)
  const d = B.distanceTo(H)
  const toH = new THREE.Vector3().subVectors(H, B).normalize()
  const a = Math.acos(THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1))
  // (the elbow up above the line from foot to head: turned about the joints' axis)
  const E = toH.clone().applyAxisAngle(across, a).multiplyScalar(L1).add(B)
  if (E.y < Math.max(B.y, H.y)) E.copy(toH).applyAxisAngle(across, -a).multiplyScalar(L1).add(B)
  for (const s of [-1, 1]) {
    const o = across.clone().multiplyScalar(s * GAP)
    rodBetween(B.clone().add(o), E.clone().add(o), ROD, black, meshes)
    rodBetween(E.clone().add(o), H.clone().add(o), ROD * 0.92, black, meshes)
  }
  // the knuckles: short barrels across each joint
  const knuckle = (p, r, len) => {
    const g = new THREE.CylinderGeometry(r, r, len, 16)
    const m = new THREE.Mesh(g, black)
    m.position.copy(p)
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), across)
    meshes.push(m)
  }
  knuckle(B, 7, 2 * GAP + 9)
  knuckle(E, 6.5, 2 * GAP + 10)
  knuckle(H, 6, 2 * GAP + 8)
  // the spring: a coil beside the lower arm, from near the foot to a third of the way up
  {
    const s0 = B.clone().addScaledVector(across, GAP + 6).addScaledVector(new THREE.Vector3().subVectors(E, B).normalize(), 18)
    const s1 = B.clone().addScaledVector(across, GAP + 6).addScaledVector(new THREE.Vector3().subVectors(E, B).normalize(), 140)
    const ax = new THREE.Vector3().subVectors(s1, s0)
    const len = ax.length()
    ax.normalize()
    const u = new THREE.Vector3().crossVectors(ax, across).normalize()
    const v = new THREE.Vector3().crossVectors(ax, u).normalize()
    const pts = []
    const turns = 26
    for (let i = 0; i <= turns * 16; i++) {
      const t = i / (turns * 16)
      const ang = t * turns * Math.PI * 2
      pts.push(s0.clone().addScaledVector(ax, t * len).addScaledVector(u, Math.cos(ang) * 3.6).addScaledVector(v, Math.sin(ang) * 3.6))
    }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 16, 0.75, 6, false)
    meshes.push(new THREE.Mesh(g, steel))
    rodBetween(s1, s1.clone().addScaledVector(ax, 30), 0.9, steel, meshes)
  }

  // ---- the head: a short neck, then the shade opening towards what it lights
  const axis = new THREE.Vector3().subVectors(aim, H).normalize()
  const neckEnd = H.clone().addScaledVector(axis, 22)
  rodBetween(H, neckEnd, 5.5, black, meshes)
  const shadePts = [
    [0, 0],
    [16, 0],
    [24, 6],
    [34, 22],
    [50, 52],
    [58, 74],
    [60, 80],
  ]
  const shadeOuter = new THREE.LatheGeometry(shadePts.map(([r, y]) => new THREE.Vector2(r, y)), 40)
  const shadeInner = new THREE.LatheGeometry(shadePts.map(([r, y]) => new THREE.Vector2(Math.max(0, r - 1.6), y + 0.6)), 40)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis)
  for (const [g, m] of [
    [shadeOuter, black],
    [shadeInner, inner],
  ]) {
    const mesh = new THREE.Mesh(g, m)
    mesh.position.copy(neckEnd)
    mesh.quaternion.copy(q)
    meshes.push(mesh)
  }
  // (a lip round the opening)
  const lip = new THREE.TorusGeometry(59.4, 1.4, 8, 48)
  const lipMesh = new THREE.Mesh(lip, black)
  lipMesh.position.copy(neckEnd).addScaledVector(axis, 80)
  lipMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis)
  meshes.push(lipMesh)
  // the bulb, a warm globe in the shade
  const bulbPos = neckEnd.clone().addScaledVector(axis, 44)
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(17, 24, 16), bulbMat)
  bulb.position.copy(bulbPos)
  meshes.push(bulb)

  group.add(...meshes)
  for (const m of meshes) {
    m.castShadow = false
    m.receiveShadow = false
  }
  group.updateMatrixWorld(true)
  return {
    group,
    meshes,
    bulb: bulbPos,
    axis,
    head: H,
    elbow: E,
    materials: [black, steel, inner],
    /** Its own glow (the bulb, the lit inside of the shade) on or off. */
    glow(on) {
      bulb.visible = on
      inner.emissiveIntensity = on ? 0.18 : 0
    },
    dispose() {
      for (const m of meshes) m.geometry.dispose()
      for (const m of materials) m.dispose()
    },
  }
}
