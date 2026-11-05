import * as THREE from 'three'

// Pod dimensions in model units: 0.6 wide, 1 tall, ~0.09 thick. Front glass at z = FRONT.
export const POD = {
  W: 0.6,
  H: 1,
  R: 0.085, // corner radius of the outline
  FRONT: 0.046,
  ZC: 0.002, // middle of the body's depth
  HALF_Z: 0.044,
  display: { y: 0.185, w: 0.52, h: 0.56, r: 0.036 }, // black panel under the glass
  active: { w: 0.496, h: 0.536, r: 0.026 }, // the lit area
  wheel: { y: -0.3, r: 0.15, button: 0.056 },
  port: { x: 0.06, z: 0.02 }, // USB-C on the top edge
}

export function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - r)
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, y + h)
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + r)
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

/**
 * The body is two extrusions:
 *  - front: a slab whose front cap is the glass (material group 0) with aluminium sides (group 1)
 *  - back: a softly rounded aluminium shell
 */
export function bodyGeometries() {
  const { W, H, R } = POD
  const fb = 0.005
  const depth = 0.042
  const front = new THREE.ExtrudeGeometry(roundedRect(W - 2 * fb, H - 2 * fb, R - fb), {
    depth,
    bevelEnabled: true,
    bevelThickness: fb,
    bevelSize: fb,
    bevelSegments: 6,
    curveSegments: 48,
  })
  front.translate(0, 0, POD.FRONT - depth - fb) // front cap lands on z = FRONT

  const bb = 0.036
  const back = new THREE.ExtrudeGeometry(roundedRect(W - 2 * bb, H - 2 * bb, R - bb), {
    depth: 0.002,
    bevelEnabled: true,
    bevelThickness: 0.034,
    bevelSize: bb,
    bevelSegments: 16,
    curveSegments: 48,
  })
  back.translate(0, 0, -0.008)
  return { front, back }
}

/** Domed centre button, facing +z. */
export function buttonGeometry() {
  const r = POD.wheel.button
  const pts = [
    new THREE.Vector2(0, 0.0036),
    new THREE.Vector2(r * 0.5, 0.0034),
    new THREE.Vector2(r * 0.8, 0.0028),
    new THREE.Vector2(r * 0.94, 0.0018),
    new THREE.Vector2(r * 0.99, 0.0008),
    new THREE.Vector2(r, 0),
  ]
  const g = new THREE.LatheGeometry(pts, 96)
  g.rotateX(Math.PI / 2)
  return g
}

/** A flat stadium (pill) shape lying in the xz plane, facing +y. */
export function stadiumGeometry(w: number, d: number) {
  const g = new THREE.ShapeGeometry(roundedRect(w, d, d / 2 - 0.0001), 16)
  g.rotateX(-Math.PI / 2)
  return g
}

/**
 * Signed distance from a point (model units) to the pod's body:
 * a rounded rectangle extruded along z with softened edges.
 */
export function podSdf(x: number, y: number, z: number) {
  const rc = POD.R
  const re = 0.02
  const qx = Math.abs(x) - (POD.W / 2 - rc)
  const qy = Math.abs(y) - (POD.H / 2 - rc)
  const d2 = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rc
  const wx = d2 + re
  const wz = Math.abs(z - POD.ZC) - (POD.HALF_Z - re)
  return Math.hypot(Math.max(wx, 0), Math.max(wz, 0)) + Math.min(Math.max(wx, wz), 0) - re
}
