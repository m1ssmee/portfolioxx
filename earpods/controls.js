// Mouse and touch: drag an earbud, grab the cable (or the remote, splitter or plug), spin the
// whole set by dragging empty space, zoom with the wheel or a pinch. Everything has momentum and
// eases back: a dropped earbud springs home, a spin slows to a stop. When nobody touches anything
// for a few seconds the earbuds drift a little, and the cable answers through the physics.
import * as THREE from 'three'

const SPRING = 34 // 1/s^2, how hard a released earbud is pulled home
const SPRING_DAMP = 6.5 // 1/s
const SPIN_DRAG = 2.6 // 1/s, how quickly a spin slows down
const PITCH = [-0.35, 0.55]
const ZOOM = [1, 4.5]
const PICK_PX = 12 // grab tolerance around the thin cable, in CSS pixels

export function createControls({ dom, camera, sim, state, view, budPose }) {
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const plane = new THREE.Plane()
  const hit = new THREE.Vector3()
  const tmp = new THREE.Vector3()
  const tmp2 = new THREE.Vector3()
  const pointers = new Map() // active pointers, for pinches
  let mode = null // 'bud' | 'particle' | 'spin' | 'pinch'
  let grip = null
  let lastMove = 0
  let pinch = null

  const rect = () => dom.getBoundingClientRect()
  function setRay(cx, cy) {
    const r = rect()
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
  }
  /** Screen position (CSS px) of a world point, and how many px one cm is there. */
  function screen(v, out) {
    const r = rect()
    tmp2.copy(v).project(camera)
    out.x = ((tmp2.x + 1) / 2) * r.width + r.left
    out.y = ((1 - tmp2.y) / 2) * r.height + r.top
    const d = camera.position.distanceTo(v)
    out.pxPerCm = r.height / 2 / (d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
    return out
  }
  const segDist = (px, py, a, b) => {
    const ux = b.x - a.x
    const uy = b.y - a.y
    const t = Math.max(0, Math.min(1, ((px - a.x) * ux + (py - a.y) * uy) / (ux * ux + uy * uy || 1)))
    return [Math.hypot(px - a.x - ux * t, py - a.y - uy * t), t]
  }

  /** What is under the pointer: an earbud, a particle of the cable or its parts, or nothing. */
  function pick(cx, cy) {
    const sa = {}
    const sb = {}
    // earbuds first: a disc for the head, a thick segment for the stem
    let best = null
    for (const side of ['left', 'right']) {
      const pose = budPose(side)
      screen(pose.head, sa)
      const dHead = Math.hypot(cx - sa.x, cy - sa.y) - 0.95 * sa.pxPerCm
      screen(pose.stemTop, sa)
      screen(pose.exit, sb)
      const [dStem] = segDist(cx, cy, sa, sb)
      const d = Math.min(dHead, dStem - 0.35 * sa.pxPerCm)
      if (d < 4 && (!best || d < best.d)) best = { kind: 'bud', side, d, point: pose.head.clone() }
    }
    if (best) return best
    // then the cable and its parts, as segments on screen
    const P = (i, out) => out.set(sim.x[i * 3], sim.x[i * 3 + 1], sim.x[i * 3 + 2])
    const va = new THREE.Vector3()
    const vb = new THREE.Vector3()
    for (const [a, b] of sim.stretch) {
      if (sim.w0[a] === 0 && sim.w0[b] === 0) continue
      screen(P(a, va), sa)
      screen(P(b, vb), sb)
      const [d, t] = segDist(cx, cy, sa, sb)
      const reach = Math.max(PICK_PX, Math.min(sim.rad[a], sim.rad[b]) * sa.pxPerCm + 4)
      if (d < reach && (!best || d < best.d)) {
        let i = t < 0.5 ? a : b
        if (sim.w0[i] === 0) i = i === a ? b : a
        best = { kind: 'particle', i, d, point: P(i, new THREE.Vector3()) }
      }
    }
    return best
  }

  /** Point on the plane through `through`, facing the camera, under the pointer. */
  function onPlane(cx, cy, through, out) {
    setRay(cx, cy)
    camera.getWorldDirection(tmp)
    plane.setFromNormalAndCoplanarPoint(tmp.negate(), through)
    return ray.ray.intersectPlane(plane, out)
  }

  function down(e) {
    if (e.button !== undefined && e.button > 0) return
    dom.setPointerCapture?.(e.pointerId)
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    state.lastInput = performance.now()
    if (pointers.size === 2) {
      // second finger: a pinch replaces whatever the first one was doing
      endGrip()
      const [p, q] = [...pointers.values()]
      pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), zoom: view.zoom }
      mode = 'pinch'
      return
    }
    const h = pick(e.clientX, e.clientY)
    lastMove = performance.now()
    if (h?.kind === 'bud') {
      const b = state.buds[h.side]
      const pose = budPose(h.side)
      grip = { side: h.side, through: pose.head.clone(), offset: new THREE.Vector3(), last: new THREE.Vector3() }
      onPlane(e.clientX, e.clientY, grip.through, hit)
      grip.offset.copy(pose.position).sub(hit)
      grip.last.copy(pose.position)
      b.held = true
      b.vel.set(0, 0, 0)
      mode = 'bud'
    } else if (h?.kind === 'particle') {
      grip = { i: h.i, through: h.point.clone() }
      onPlane(e.clientX, e.clientY, grip.through, hit)
      sim.grab(h.i, hit.x, hit.y, hit.z)
      mode = 'particle'
    } else {
      grip = { x: e.clientX, y: e.clientY }
      state.yawVel = 0
      state.pitchVel = 0
      mode = 'spin'
    }
    dom.style.cursor = 'grabbing'
  }

  function move(e) {
    const p = pointers.get(e.pointerId)
    if (!p) {
      // hovering: show what can be grabbed
      const h = pick(e.clientX, e.clientY)
      dom.style.cursor = h ? 'grab' : 'auto'
      return
    }
    const now = performance.now()
    const dt = Math.max(1, now - lastMove) / 1000
    lastMove = now
    state.lastInput = now
    p.x = e.clientX
    p.y = e.clientY
    if (mode === 'pinch') {
      const [a, b] = [...pointers.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      zoomTo(pinch.zoom * (d / pinch.d), (a.x + b.x) / 2, (a.y + b.y) / 2)
    } else if (mode === 'bud') {
      if (!onPlane(e.clientX, e.clientY, grip.through, hit)) return
      const b = state.buds[grip.side]
      const target = hit.add(grip.offset)
      // no further from the other earbud than the cable between them allows
      const other = budPose(grip.side === 'left' ? 'right' : 'left').position
      const span = sim.budSpan
      tmp.subVectors(target, other)
      if (tmp.length() > span) target.copy(other).add(tmp.setLength(span))
      const home = budPose(grip.side).home
      const off = tmp.subVectors(target, home)
      // velocity, smoothed, for the throw when it's let go
      b.vel.lerp(new THREE.Vector3().subVectors(off, b.off).divideScalar(dt), 0.5)
      b.off.copy(off)
    } else if (mode === 'particle') {
      if (onPlane(e.clientX, e.clientY, grip.through, hit)) sim.grab(grip.i, hit.x, hit.y, hit.z)
    } else if (mode === 'spin') {
      const dx = e.clientX - grip.x
      const dy = e.clientY - grip.y
      grip.x = e.clientX
      grip.y = e.clientY
      const yaw = dx * 0.0085
      const pitch = dy * 0.004
      state.yaw += yaw
      state.pitch = Math.max(PITCH[0], Math.min(PITCH[1], state.pitch + pitch))
      state.yawVel = THREE.MathUtils.lerp(state.yawVel, yaw / dt, 0.4)
      state.pitchVel = THREE.MathUtils.lerp(state.pitchVel, pitch / dt, 0.4)
    }
  }

  function endGrip() {
    if (mode === 'bud' && grip) state.buds[grip.side].held = false
    if (mode === 'particle') sim.release()
    grip = null
  }

  function up(e) {
    pointers.delete(e.pointerId)
    dom.releasePointerCapture?.(e.pointerId)
    // a flick stopped before letting go shouldn't keep spinning
    if (performance.now() - lastMove > 90) {
      state.yawVel = 0
      state.pitchVel = 0
    }
    if (mode === 'pinch' && pointers.size < 2) mode = null
    else {
      endGrip()
      mode = null
    }
    dom.style.cursor = 'auto'
  }

  /** Zoom towards a point on screen. */
  function zoomTo(z, cx, cy) {
    const next = Math.max(ZOOM[0], Math.min(ZOOM[1], z))
    if (next === view.zoom) return
    // the point under the pointer, on the plane through the view's centre
    onPlane(cx, cy, view.target, hit)
    const k = 1 - view.zoom / next
    view.target.lerp(hit, k)
    view.zoom = next
    // back at the full view, drift back to the centre
    if (next === ZOOM[0]) view.target.copy(view.home)
  }

  function wheel(e) {
    e.preventDefault()
    state.lastInput = performance.now()
    zoomTo(view.zoom * Math.exp(-e.deltaY * 0.0016), e.clientX, e.clientY)
  }

  dom.addEventListener('pointerdown', down)
  dom.addEventListener('pointermove', move)
  dom.addEventListener('pointerup', up)
  dom.addEventListener('pointercancel', up)
  dom.addEventListener('wheel', wheel, { passive: false })

  /** Momentum, springs and the idle drift; call once a frame. */
  function update(dt, t) {
    if (mode !== 'spin') {
      state.yaw += state.yawVel * dt
      state.pitch = Math.max(PITCH[0], Math.min(PITCH[1], state.pitch + state.pitchVel * dt))
      const k = Math.exp(-SPIN_DRAG * dt)
      state.yawVel *= k
      state.pitchVel *= k
    }
    // released earbuds: a damped spring back home, keeping the speed they were thrown with
    for (const b of Object.values(state.buds)) {
      if (b.held) continue
      const n = Math.max(1, Math.ceil(dt / 0.004))
      const h = dt / n
      for (let q = 0; q < n; q++) {
        b.vel.addScaledVector(b.off, -SPRING * h).multiplyScalar(1 - SPRING_DAMP * h)
        b.off.addScaledVector(b.vel, h)
      }
    }
    // left alone for a few seconds: a gentle drift
    const quiet = (performance.now() - state.lastInput) / 1000
    const w = state.still ? 0 : THREE.MathUtils.smoothstep(quiet, 2.5, 5)
    state.idle = w
    state.buds.left.drift.set(0.1 * Math.sin(t * 0.7 + 1), 0.16 * Math.sin(t * 0.9), 0.12 * Math.sin(t * 0.55)).multiplyScalar(w)
    state.buds.right.drift.set(0.1 * Math.sin(t * 0.62), 0.16 * Math.sin(t * 0.83 + 2), 0.12 * Math.sin(t * 0.5 + 1)).multiplyScalar(w)
    state.sway = w * 0.1 * Math.sin(t * 0.24)
  }

  function dispose() {
    dom.removeEventListener('pointerdown', down)
    dom.removeEventListener('pointermove', move)
    dom.removeEventListener('pointerup', up)
    dom.removeEventListener('pointercancel', up)
    dom.removeEventListener('wheel', wheel)
  }

  return { update, dispose, pick }
}
