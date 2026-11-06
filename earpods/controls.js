// Mouse and touch.
//   drag an earbud           move it; let go and it glides on a little, then stays
//   drag the cable or a part pull it (the physics does the rest)
//   drag empty space         orbit: all the way round, and from straight above to straight below
//   right-drag, two fingers  pan
//   wheel, pinch, buttons    zoom (towards the pointer)
// Everything has momentum and eases. Left alone for a few seconds, the earbuds drift a little
// in the hand that holds them, and the cable answers.
import * as THREE from 'three'

const ORBIT = 0.0062 // radians per pixel
const SPIN_DRAG = 3.2 // 1/s, how quickly an orbit flick slows down
const GLIDE_DRAG = 5 // 1/s, how quickly a thrown earbud stops
const ZOOM = [0.55, 9] // as a multiple of the distance that frames the whole set
const PHI = [0.02, Math.PI - 0.02]
const FLOOR_CLEAR = 0.35 // the earbud's cable exit stays this far above the floor

export function createControls({ dom, camera, view, buds, sim, pick, budPoint, exit, budMatrix, reducedMotion }) {
  const pointers = new Map()
  const plane = new THREE.Plane()
  const hit = new THREE.Vector3()
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const v1 = new THREE.Vector3()
  const v2 = new THREE.Vector3()
  let mode = null // 'orbit' | 'pan' | 'bud' | 'grab' | 'pinch'
  let grip = null
  let lastMoveT = 0
  let lastInput = performance.now()
  let goal = null // an eased change of view (zoom buttons, reset)
  const spin = { theta: 0, phi: 0 }
  let hoverQueued = null

  const rect = () => dom.getBoundingClientRect()
  function setRay(cx, cy) {
    const r = rect()
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
    camera.updateMatrixWorld()
    ray.setFromCamera(ndc, camera)
  }
  /** The point under the pointer on the plane through `through`, square to the view. */
  function onPlane(cx, cy, through, out) {
    setRay(cx, cy)
    camera.getWorldDirection(v1)
    plane.setFromNormalAndCoplanarPoint(v1.negate(), through)
    return ray.ray.intersectPlane(plane, out)
  }
  /** World units per pixel at the view's target. */
  function worldPerPixel() {
    const d = camera.position.distanceTo(view.target)
    return (2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / rect().height
  }

  // ---------------------------------------------------------------- earbuds
  /** Keep an earbud's offset where it can be: above the floor, and no further from the other one than the cable allows. */
  function clampBud(side) {
    const b = buds[side]
    const other = side === 'left' ? 'right' : 'left'
    for (let it = 0; it < 3; it++) {
      budMatrix(side)
      // the floor
      const e = budPoint(side, exit, v1)
      if (e.y < FLOOR_CLEAR) b.off.y += FLOOR_CLEAR - e.y
      // the cable between the two earbuds
      budMatrix(side)
      const a = budPoint(side, exit, v1)
      const o = budPoint(other, exit, v2)
      const d = a.distanceTo(o)
      if (d > sim.budSpan) b.off.addScaledVector(v1.sub(o).normalize(), sim.budSpan - d)
      // and not out of sight upwards
      if (b.off.y > 14) b.off.y = 14
    }
    budMatrix(side)
  }

  // ---------------------------------------------------------------- pointer
  function down(e) {
    if (e.button === 1) return
    dom.setPointerCapture?.(e.pointerId)
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    lastInput = performance.now()
    goal = null
    if (pointers.size === 2) {
      // a second finger: pinch and pan replace whatever the first was doing
      endGrip()
      const [p, q] = [...pointers.values()]
      grip = { d: Math.hypot(p.x - q.x, p.y - q.y), cx: (p.x + q.x) / 2, cy: (p.y + q.y) / 2, zoom: view.zoom }
      mode = 'pinch'
      return
    }
    if (pointers.size > 2) return
    lastMoveT = performance.now()
    if (e.button === 2 || e.shiftKey) {
      grip = { x: e.clientX, y: e.clientY }
      mode = 'pan'
      dom.style.cursor = 'move'
      return
    }
    const h = pick(e.clientX, e.clientY)
    if (h?.kind === 'bud') {
      const b = buds[h.side]
      grip = { side: h.side, through: h.point.clone(), offset: new THREE.Vector3() }
      if (!onPlane(e.clientX, e.clientY, grip.through, hit)) return
      // the offset from the point grabbed to the earbud's own offset
      grip.offset.copy(b.off).sub(hit)
      b.held = true
      b.vel.set(0, 0, 0)
      mode = 'bud'
    } else if (h && (h.kind === 'cable' || h.kind === 'piece')) {
      grip = { through: h.point.clone() }
      sim.grab(h.kind === 'cable' ? { i: h.i } : { piece: h.piece, t: h.t }, h.point.x, h.point.y, h.point.z)
      mode = 'grab'
    } else {
      grip = { x: e.clientX, y: e.clientY }
      spin.theta = spin.phi = 0
      mode = 'orbit'
    }
    dom.style.cursor = 'grabbing'
  }

  function move(e) {
    const p = pointers.get(e.pointerId)
    if (!p) {
      // hovering: show what can be grabbed (one pick per frame at most)
      if (e.pointerType === 'mouse') hoverQueued = { x: e.clientX, y: e.clientY }
      return
    }
    const now = performance.now()
    const dt = Math.max(4, now - lastMoveT) / 1000
    lastMoveT = now
    lastInput = now
    const dx = e.clientX - p.x
    const dy = e.clientY - p.y
    p.x = e.clientX
    p.y = e.clientY
    if (mode === 'pinch') {
      const [a, b] = [...pointers.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const cx = (a.x + b.x) / 2
      const cy = (a.y + b.y) / 2
      zoomAt(grip.zoom * (d / grip.d), cx, cy)
      panBy(cx - grip.cx, cy - grip.cy)
      grip.cx = cx
      grip.cy = cy
    } else if (mode === 'orbit') {
      const dth = -dx * ORBIT
      const dph = -dy * ORBIT
      view.theta += dth
      view.phi = THREE.MathUtils.clamp(view.phi + dph, PHI[0], PHI[1])
      spin.theta = THREE.MathUtils.lerp(spin.theta, dth / dt, 0.45)
      spin.phi = THREE.MathUtils.lerp(spin.phi, dph / dt, 0.45)
    } else if (mode === 'pan') {
      panBy(dx, dy)
    } else if (mode === 'bud') {
      if (!onPlane(e.clientX, e.clientY, grip.through, hit)) return
      const b = buds[grip.side]
      const before = v2.copy(b.off)
      b.off.copy(hit).add(grip.offset)
      clampBud(grip.side)
      // velocity, smoothed, for the throw when it's let go
      v1.subVectors(b.off, before).divideScalar(dt)
      b.vel.lerp(v1, 0.5)
    } else if (mode === 'grab') {
      if (onPlane(e.clientX, e.clientY, grip.through, hit)) sim.moveGrab(hit.x, hit.y, hit.z)
    }
  }

  function endGrip() {
    if (mode === 'bud' && grip) buds[grip.side].held = false
    if (mode === 'grab') sim.release()
    grip = null
  }

  function up(e) {
    if (!pointers.has(e.pointerId)) return
    pointers.delete(e.pointerId)
    dom.releasePointerCapture?.(e.pointerId)
    // a flick stopped before letting go shouldn't keep going
    if (performance.now() - lastMoveT > 80) {
      spin.theta = spin.phi = 0
      for (const b of Object.values(buds)) if (b.held) b.vel.set(0, 0, 0)
    }
    if (mode === 'pinch') {
      if (pointers.size === 1) {
        // back to one finger: carry on orbiting from where it is
        const [q] = [...pointers.values()]
        grip = { x: q.x, y: q.y }
        mode = 'orbit'
        return
      }
    }
    endGrip()
    mode = null
    dom.style.cursor = 'auto'
  }

  // ---------------------------------------------------------------- zoom and pan
  function zoomAt(z, cx, cy) {
    const next = THREE.MathUtils.clamp(z, ZOOM[0], ZOOM[1])
    if (next === view.zoom) return
    // keep the point under the pointer where it is on screen
    if (onPlane(cx, cy, view.target, hit)) {
      const k = view.zoom / next
      view.target.sub(hit).multiplyScalar(k).add(hit)
    }
    view.zoom = next
    clampTarget()
  }
  function panBy(dx, dy) {
    const s = worldPerPixel()
    camera.updateMatrixWorld()
    v1.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(-dx * s)
    v2.setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(dy * s)
    view.target.add(v1).add(v2)
    clampTarget()
  }
  function clampTarget() {
    // the target stays among the earphones
    view.target.x = THREE.MathUtils.clamp(view.target.x, -9, 11)
    view.target.y = THREE.MathUtils.clamp(view.target.y, -1, 20)
    view.target.z = THREE.MathUtils.clamp(view.target.z, -8, 10)
  }
  function wheel(e) {
    e.preventDefault()
    lastInput = performance.now()
    goal = null
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
    zoomAt(view.zoom * Math.exp(-dy * 0.0015), e.clientX, e.clientY)
  }

  /** Zoom by a factor about the middle of the screen, eased (the buttons). */
  function zoomBy(f) {
    lastInput = performance.now()
    goal = { zoom: THREE.MathUtils.clamp(view.zoom * f, ZOOM[0], ZOOM[1]) }
  }
  /** Back to the starting view, and the earbuds back to where they started. */
  function reset() {
    lastInput = performance.now()
    goal = { zoom: view.home.zoom, theta: nearestTurn(view.home.theta, view.theta), phi: view.home.phi, target: view.home.target.clone() }
    spin.theta = spin.phi = 0
    for (const b of Object.values(buds)) b.home = true
  }
  const nearestTurn = (a, from) => a + Math.round((from - a) / (Math.PI * 2)) * Math.PI * 2

  function hover() {
    if (!hoverQueued || mode) return
    const h = pick(hoverQueued.x, hoverQueued.y)
    dom.style.cursor = h ? 'grab' : 'auto'
    hoverQueued = null
  }

  const block = (e) => e.preventDefault()
  dom.addEventListener('pointerdown', down)
  dom.addEventListener('pointermove', move)
  dom.addEventListener('pointerup', up)
  dom.addEventListener('pointercancel', up)
  dom.addEventListener('wheel', wheel, { passive: false })
  dom.addEventListener('contextmenu', block)

  // ---------------------------------------------------------------- per frame
  function update(dt, t) {
    hover()
    // orbit momentum
    if (mode !== 'orbit') {
      view.theta += spin.theta * dt
      view.phi = THREE.MathUtils.clamp(view.phi + spin.phi * dt, PHI[0], PHI[1])
      const k = Math.exp(-SPIN_DRAG * dt)
      spin.theta *= k
      spin.phi *= k
    }
    // eased view changes
    if (goal) {
      const k = 1 - Math.exp(-7 * dt)
      let done = true
      if (goal.zoom !== undefined) {
        view.zoom += (goal.zoom - view.zoom) * k
        done &&= Math.abs(goal.zoom - view.zoom) < 1e-3
      }
      if (goal.theta !== undefined) {
        view.theta += (goal.theta - view.theta) * k
        view.phi += (goal.phi - view.phi) * k
        view.target.lerp(goal.target, k)
        done &&= Math.abs(goal.theta - view.theta) < 1e-3 && Math.abs(goal.phi - view.phi) < 1e-3 && view.target.distanceTo(goal.target) < 1e-3
      }
      if (done) goal = null
    }
    // earbuds: a thrown one glides to a stop; one sent home eases back. A moving one leans a
    // little the way it goes.
    for (const side of ['left', 'right']) {
      const b = buds[side]
      b.tilt += (THREE.MathUtils.clamp(-b.vel.x * 0.012, -0.3, 0.3) - b.tilt) * (1 - Math.exp(-10 * dt))
      if (b.held) continue
      if (b.home) {
        b.vel.set(0, 0, 0)
        b.off.multiplyScalar(Math.exp(-4 * dt))
        if (b.off.length() < 1e-3) {
          b.off.set(0, 0, 0)
          b.home = false
        }
      } else if (b.vel.lengthSq() > 1e-6) {
        b.off.addScaledVector(b.vel, dt)
        b.vel.multiplyScalar(Math.exp(-GLIDE_DRAG * dt))
        clampBud(side)
      }
    }
    // left alone: a gentle drift, as if held in a hand
    const quiet = (performance.now() - lastInput) / 1000
    const w = reducedMotion ? 0 : THREE.MathUtils.smoothstep(quiet, 3, 6)
    buds.left.drift.set(0.12 * Math.sin(t * 0.61 + 1), 0.18 * Math.sin(t * 0.83), 0.14 * Math.sin(t * 0.47)).multiplyScalar(w)
    buds.right.drift.set(0.12 * Math.sin(t * 0.55), 0.18 * Math.sin(t * 0.77 + 2), 0.14 * Math.sin(t * 0.43 + 1)).multiplyScalar(w)
  }

  function dispose() {
    dom.removeEventListener('pointerdown', down)
    dom.removeEventListener('pointermove', move)
    dom.removeEventListener('pointerup', up)
    dom.removeEventListener('pointercancel', up)
    dom.removeEventListener('wheel', wheel)
    dom.removeEventListener('contextmenu', block)
  }

  return { update, dispose, zoomBy, reset, get mode() { return mode }, get lastInput() { return lastInput } }
}
