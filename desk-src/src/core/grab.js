// Picking things up: one input handler for every grabbable object, one object held at a time.
//   mouse/pen: press on an object, then move more than 6 px or hold 200 ms: it is picked up;
//              released sooner it is a tap (the object's onTap). Elsewhere, the camera orbits.
//   touch:     press and hold ~150 ms on an object: picked up; a quick swipe orbits as usual.
//   while held: the camera stays put; the wheel (or two fingers twisting) turns the object about
//              the vertical; Escape (or the reset button, through drop('home')) sends it home.
//   the hand:  a held object is aimed once a frame (update()), at the pointer eased exponentially
//              (time constant POINTER_TAU): pointer events come unevenly, several a frame or none,
//              and each one straight to the object would jerk it.
// Each grabbable: { meshes, canGrab(), pick(hit), aim(ray), twist(rad), release(), home(), cancel(), onTap() }
// A fixed one ({ meshes, fixed: true, canGrab(), onTap() }, the notebook): only tapped; a drag on it
// turns the camera, as on the desk.
import * as THREE from 'three'

export const GRAB_LAYER = 5
/** The held object's aim follows the pointer with this time constant (s). */
export const POINTER_TAU = 0.12

/**
 * tapFirst(hit): called before an object's own tap; true if it took the tap instead (the scene:
 * from afar, a tap on an object first brings the camera to it).
 */
export function createGrab({ canvas, camera, controls, listen, onActive, tapFirst = () => false }) {
  const items = []
  const raycaster = new THREE.Raycaster()
  raycaster.layers.set(GRAB_LAYER)
  const ndc = new THREE.Vector2()
  const hits = []
  let held = null
  let heldFrom = null // (the press it was picked up by: a slow frame can make a tap look like a hold)
  let press = null // a press on an object, not yet a tap or a pickup
  let hoverAt = null
  let twistPrev = null // (two fingers: the angle between them)
  const touches = new Map()
  // the pointer as it is (raw), and as the held object is aimed at it (eased)
  const aim = { rx: 0, ry: 0, x: 0, y: 0, at: -1, ax: NaN, ay: NaN }

  function rayAt(cx, cy) {
    const r = canvas.getBoundingClientRect()
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    return raycaster.ray
  }
  function hitAt(cx, cy) {
    rayAt(cx, cy)
    hits.length = 0
    for (const it of items) if (it.canGrab()) raycaster.intersectObjects(it.meshes, false, hits)
    if (!hits.length) return null
    hits.sort((a, b) => a.distance - b.distance)
    const h = hits[0]
    const item = items.find((it) => it.meshes.includes(h.object))
    // (index: which particle of a cable, for a hit on its proxy)
    return item ? { item, point: h.point.clone(), object: h.object, index: h.index } : null
  }
  function start(p) {
    held = p.hit.item
    heldFrom = p
    controls.enabled = false
    canvas.style.cursor = 'grabbing'
    try {
      canvas.setPointerCapture(p.id)
    } catch {
      // (the pointer may already be gone; the window still hears the release)
    }
    held.pick(p.hit, rayAt(p.x, p.y))
    aim.rx = aim.x = p.x
    aim.ry = aim.y = p.y
    aim.ax = aim.ay = NaN
    navigator.vibrate?.(8)
  }
  function end(how) {
    if (!held) return
    const h = held
    held = heldFrom = null
    controls.enabled = true
    canvas.style.cursor = ''
    if (how === 'home') h.home()
    else h.release()
  }

  listen(
    canvas,
    'pointerdown',
    (e) => {
      onActive()
      if (e.pointerType === 'touch') touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (held) return
      if (e.pointerType === 'touch' && touches.size > 1) {
        // (a second finger: a pinch or a twist, never a pickup)
        if (press) clearTimeout(press.timer)
        press = null
        return
      }
      if (e.button > 0) return
      const hit = hitAt(e.clientX, e.clientY)
      if (!hit) return
      if (hit.item.fixed) {
        // (the camera has the press too: still and quick, it is a tap)
        press = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), stamp: e.timeStamp, hit, touch: e.pointerType === 'touch', timer: 0, moved: false, fixed: true }
        return
      }
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), stamp: e.timeStamp, hit, touch: e.pointerType === 'touch', timer: 0, moved: false }
      if (press.touch) {
        // touch: the camera may still orbit (a swipe); holding still picks it up
        press.timer = setTimeout(() => {
          if (press && !held) {
            const p = press
            press = null
            start(p)
          }
        }, 150)
      } else {
        // mouse: the camera must not turn while we wait to see a tap or a drag
        e.stopImmediatePropagation()
        press.timer = setTimeout(() => {
          if (press && !held) {
            const p = press
            press = null
            start(p)
          }
        }, 200)
      }
    },
    { capture: true },
  )
  listen(window, 'pointermove', (e) => {
    if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (held && touches.size === 2) {
        // two fingers twisting: the held object turns with them
        const [a, b] = [...touches.values()]
        const ang = Math.atan2(b.y - a.y, b.x - a.x)
        if (twistPrev !== null) {
          let d = ang - twistPrev
          if (d > Math.PI) d -= 2 * Math.PI
          if (d < -Math.PI) d += 2 * Math.PI
          held.twist(-d)
        }
        twistPrev = ang
        return
      }
    }
    if (press && e.pointerId === press.id && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) {
      clearTimeout(press.timer)
      const p = press
      press = null
      p.moved = true
      if (p.fixed) return
      // (a mouse drag that starts on an object picks it up; a touch swipe stays an orbit)
      if (!p.touch) start(p)
    }
    if (held) {
      // (only the pointer that holds it: a second thumb on the flame button does not move it)
      if (heldFrom && e.pointerId !== heldFrom.id) return
      onActive()
      // (where it is: the object is aimed at it once a frame, eased: update())
      aim.rx = e.clientX
      aim.ry = e.clientY
      return
    }
    if (e.pointerType === 'mouse' && !e.buttons && e.target === canvas) hoverAt = { x: e.clientX, y: e.clientY }
  })
  const up = (e) => {
    touches.delete(e.pointerId)
    if (touches.size < 2) twistPrev = null
    const tapMs = (p) => (p.touch ? 150 : 200)
    if (press && e.pointerId === press.id) {
      clearTimeout(press.timer)
      const p = press
      press = null
      // quick and still: a tap (timed by the events themselves, not by when they are handled)
      if (e.type === 'pointerup' && e.timeStamp - p.stamp < tapMs(p) && !tapFirst(p.hit)) p.hit.item.onTap(p.hit)
      return
    }
    if (held && heldFrom && e.pointerId === heldFrom.id && e.type === 'pointerup' && !heldFrom.moved && e.timeStamp - heldFrom.stamp < tapMs(heldFrom)) {
      // (picked up by the timer, but the release came in time: it was a tap after all)
      const h = held
      const p = heldFrom
      held = heldFrom = null
      controls.enabled = true
      canvas.style.cursor = ''
      h.cancel()
      if (!tapFirst(p.hit)) h.onTap(p.hit)
      return
    }
    // let go: a mouse or pen by its own button; a touch hold once no finger is left on the canvas
    // (a thumb lifted from the flame button is neither)
    if (!held) return
    if (heldFrom && heldFrom.touch) {
      if (touches.size === 0) end('release')
    } else if (!heldFrom || e.pointerId === heldFrom.id) end('release')
  }
  // (on the window: released anywhere, even dragged off the canvas)
  listen(window, 'pointerup', up)
  listen(window, 'pointercancel', up)
  listen(
    canvas,
    'wheel',
    (e) => {
      if (!held) return
      // (while something is held the wheel turns it; the camera does not zoom)
      e.preventDefault()
      e.stopImmediatePropagation()
      held.twist(Math.sign(e.deltaY) * 0.18)
    },
    { passive: false, capture: true },
  )
  listen(window, 'keydown', (e) => {
    if (e.key === 'Escape' && held) end('home')
  })

  return {
    add(item) {
      items.push(item)
      for (const m of item.meshes) m.layers.enable(GRAB_LAYER)
    },
    get held() {
      return held
    },
    /** End any hold: 'home' sends the object back where it belongs. */
    drop(how = 'release') {
      if (press) clearTimeout(press.timer)
      press = null
      end(how)
    },
    /** Once a frame, before the physics: the held object aimed at the pointer, eased. */
    update(dt) {
      if (!held) return
      const k = 1 - Math.exp(-Math.min(dt, 0.1) / POINTER_TAU)
      aim.x += (aim.rx - aim.x) * k
      aim.y += (aim.ry - aim.y) * k
      // (settled to a hundredth of a pixel: aimed no more until the pointer moves)
      if (Math.abs(aim.x - aim.ax) < 0.01 && Math.abs(aim.y - aim.ay) < 0.01) return
      aim.ax = aim.x
      aim.ay = aim.y
      held.aim(rayAt(aim.x, aim.y))
    },
    /** Once a frame: the hover cursor (one raycast, only for a mouse that moved). */
    hover() {
      if (!hoverAt || held || press) return
      const h = hitAt(hoverAt.x, hoverAt.y)
      canvas.style.cursor = h ? 'grab' : ''
      hoverAt = null
    },
    dispose() {
      if (press) clearTimeout(press.timer)
    },
  }
}
