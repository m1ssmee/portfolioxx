import * as THREE from 'three'

// Pod dimensions in model units: 0.6 wide, 1 tall, ~0.09 thick.
// It's built like a clear phone: a metal frame band, glass front and back, parts inside.
export const POD = {
  W: 0.6,
  H: 1,
  R: 0.085, // corner radius of the outline
  FRONT: 0.046, // outer face of the front glass
  ZC: 0.002, // middle of the body's depth
  HALF_Z: 0.044,
  frame: { t: 0.012, z0: -0.036, z1: 0.04 }, // the metal band and its wall thickness
  display: { y: 0.176, w: 0.548, h: 0.6, r: 0.066 }, // black panel, flush with the glass
  active: { w: 0.53, h: 0.582, r: 0.058 }, // the lit area
  lens: { y: 0.434, r: 0.017 }, // punch-hole camera at the top of the display
  wheel: { y: -0.312, r: 0.146, hole: 0.058, button: 0.053 },
  port: { x: 0, z: 0.002 }, // USB-C on the bottom edge
  power: { y: 0.3, len: 0.09 }, // side button
}

/** Rounded rectangle centred at (cx, cy). Pass `hole` to wind it the other way. */
export function roundedRect(w: number, h: number, r: number, cx = 0, cy = 0, hole = false) {
  const s = hole ? new THREE.Path() : new THREE.Shape()
  const x = cx - w / 2
  const y = cy - h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - r)
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, y + h)
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + r)
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return s as THREE.Shape
}

function slab(shape: THREE.Shape, z0: number, z1: number, bevel: number, segs = 48) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: z1 - z0 - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.9,
    bevelSegments: 4,
    curveSegments: segs,
  })
  g.translate(0, 0, z0 + bevel)
  return g
}

/** The metal band around the edge. */
export function frameGeometry() {
  const { W, H, R, frame } = POD
  const b = 0.0035
  const outer = roundedRect(W - 2 * b * 0.9, H - 2 * b * 0.9, R - b * 0.9)
  outer.holes.push(roundedRect(W - 2 * frame.t, H - 2 * frame.t, R - frame.t, 0, 0, true))
  return slab(outer, frame.z0, frame.z1, b)
}

/** Front glass with windows for the display and the wheel. */
export function frontGlassGeometry() {
  const { W, H, R, display, wheel, frame, FRONT } = POD
  const inset = 0.004
  const s = roundedRect(W - 2 * inset, H - 2 * inset, R - inset)
  s.holes.push(roundedRect(display.w + 0.002, display.h + 0.002, display.r, 0, display.y, true))
  const hole = new THREE.Path()
  hole.absarc(0, wheel.y, wheel.r + 0.003, 0, Math.PI * 2, true)
  s.holes.push(hole)
  return slab(s, frame.z1, FRONT, 0.0016, 64)
}

/** Back glass. */
export function backGlassGeometry() {
  const { W, H, R, frame } = POD
  const inset = 0.004
  return slab(roundedRect(W - 2 * inset, H - 2 * inset, R - inset), frame.z0 - 0.006, frame.z0, 0.0016)
}

/** The clear acrylic wheel: a ring around the centre button. */
export function wheelGeometry() {
  const { wheel, frame } = POD
  const s = new THREE.Shape()
  s.absarc(0, 0, wheel.r, 0, Math.PI * 2, false)
  const h = new THREE.Path()
  h.absarc(0, 0, wheel.hole, 0, Math.PI * 2, true)
  s.holes.push(h)
  return slab(s, frame.z1 + 0.0004, POD.FRONT + 0.0016, 0.0016, 96)
}

/** Domed centre button, facing +z. */
export function buttonGeometry() {
  const r = POD.wheel.button
  const pts = [
    new THREE.Vector2(0, 0.0042),
    new THREE.Vector2(r * 0.5, 0.004),
    new THREE.Vector2(r * 0.8, 0.0033),
    new THREE.Vector2(r * 0.94, 0.0021),
    new THREE.Vector2(r * 0.99, 0.001),
    new THREE.Vector2(r, 0),
    new THREE.Vector2(r, -0.004),
    new THREE.Vector2(0, -0.004),
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
