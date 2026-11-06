// The earphones page: the scene, the studio, the physics and the render loop.
import * as THREE from 'three'
import { EarphoneSim, PIECES } from './cable.js'
import { createControls } from './controls.js'
import { meshAll } from './jobs.js'
import { BUDS, LAYOUT, budElements } from './layout.js'
import { makeEarbud, makeMaterials, makePlug, makeRemote, makeSplitter, meshGeometry, mirrorX } from './parts.js'
import { raycastSDF } from './sdf.js'
import * as S from './shapes.js'
import { ContactShadow } from './shadow.js'
import { studioEnvironment } from './studio.js'
import { Tube } from './tube.js'

const params = new URLSearchParams(location.search)
const stage = document.getElementById('stage')
const html = document.documentElement

// the parts are meshed in background threads; the cable settles here meanwhile
const meshing = meshAll()

// ---------------------------------------------------------------- renderer, studio
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
renderer.setClearColor(0x000000, 0)
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.NeutralToneMapping
renderer.toneMappingExposure = 1
stage.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.environment = studioEnvironment(renderer)

const camera = new THREE.PerspectiveCamera(26, 1, 0.3, 500)

// a key light for shape; the studio's light panels do most of the lighting. The floor is the
// page's own backdrop: all it shows is the contact shadows
const key = new THREE.DirectionalLight('#ffffff', 0.85)
key.position.set(-12, 36, 22)
key.target.position.set(1, 2, 1)
scene.add(key, key.target)
const contact = new ContactShadow(renderer, { size: 36, centre: [1.5, 2] })
scene.add(contact.plane)

// light and dark: the same studio lights the parts; only the backdrop and the shadows change
const THEMES = {
  light: { contact: 0.62, exposure: 1 },
  dark: { contact: 0.85, exposure: 1.04 },
}
function setTheme(name) {
  const t = THEMES[name] || THEMES.light
  html.dataset.theme = name
  contact.opacity = t.contact
  renderer.toneMappingExposure = t.exposure
  try {
    localStorage.setItem('earpods-theme', name)
  } catch {}
}
let theme = 'light'
try {
  theme = localStorage.getItem('earpods-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
} catch {}
if (params.get('theme')) theme = params.get('theme')
setTheme(theme)

// ---------------------------------------------------------------- the earbuds' placement
// Each earbud is held somewhere: its home in the layout, plus wherever it has been dragged to,
// plus a little idle drift. A held or thrown earbud leans the way it is moving.
const bud = () => ({ off: new THREE.Vector3(), vel: new THREE.Vector3(), drift: new THREE.Vector3(), tilt: 0, held: false })
const buds = { left: bud(), right: bud() }
const els = { left: new Float64Array(16), right: new Float64Array(16) }
const mats4 = { left: new THREE.Matrix4(), right: new THREE.Matrix4() }
const _off = [0, 0, 0]

function budMatrix(side) {
  const b = buds[side]
  const pose = BUDS[side]
  _off[0] = b.off.x + b.drift.x
  _off[1] = b.off.y + b.drift.y
  _off[2] = b.off.z + b.drift.z
  budElements({ p: pose.p, yaw: pose.yaw, roll: pose.roll + b.tilt }, _off, els[side])
  mats4[side].fromArray(els[side])
  return els[side]
}

/** A point given in an earbud's own frame (the left one's; the right mirrors x), in world space. */
function budPoint(side, local, out = new THREE.Vector3()) {
  const mirror = side === 'right' ? -1 : 1
  return out.set(local[0] * mirror, local[1], local[2]).applyMatrix4(mats4[side])
}
const EXIT = [S.CABLE_EXIT.x, S.CABLE_EXIT.y, S.CABLE_EXIT.z]

// ---------------------------------------------------------------- physics
budMatrix('left')
budMatrix('right')
const sim = new EarphoneSim().build(els.left, els.right, LAYOUT, 4)

// ---------------------------------------------------------------- the parts
const meshes = await meshing
const mats = makeMaterials()
const shellL = meshGeometry(meshes.earbud)
const shells = { left: shellL, right: mirrorX(shellL) }
const earbuds = { left: makeEarbud('left', mats, shells), right: makeEarbud('right', mats, shells) }
const remote = makeRemote(mats, {
  body: meshGeometry(meshes.remote),
  plus: meshGeometry(meshes.plus),
  centre: meshGeometry(meshes.centre),
  minus: meshGeometry(meshes.minus),
})
const splitter = makeSplitter(mats, meshGeometry(meshes.splitter))
const plug = makePlug(mats, meshGeometry(meshes.plug))
const parts = { left: earbuds.left, right: earbuds.right, remote, splitter, plug }
for (const o of Object.values(parts)) {
  o.matrixAutoUpdate = false
  scene.add(o)
}

// the cable: a tube through the particles of each section, tucked into the parts at its ends
const tubes = {}
for (const [name, ids] of Object.entries(sim.chains)) {
  const t = new Tube(ids.length + 4, sim.s.cableR, 14, 2)
  const mesh = new THREE.Mesh(t.geometry, mats.cable)
  mesh.frustumCulled = false
  scene.add(mesh)
  tubes[name] = { t, pts: new Float32Array((ids.length + 4) * 3), n: 0, mesh }
}

// ---------------------------------------------------------------- per-frame placement
const P = (i, out) => out.set(sim.x[i * 3], sim.x[i * 3 + 1], sim.x[i * 3 + 2])
const X = new THREE.Vector3()
const Y = new THREE.Vector3()
const Z = new THREE.Vector3()
const C = new THREE.Vector3()
const va = new THREE.Vector3()
const vb = new THREE.Vector3()
// the remote's and the plug's facing are carried from frame to frame: nothing turns them about
// their own axis but the floor, which lays the remote flat
const remoteZ = new THREE.Vector3(0, 0, 1).applyAxisAngle(THREE.Object3D.DEFAULT_UP, -0.35)
const plugZ = new THREE.Vector3(0, 0, 1)
const splitX = new THREE.Vector3(1, 0, 0)
const fr = {
  remote: { top: new THREE.Vector3(), bottom: new THREE.Vector3(), axis: new THREE.Vector3() },
  split: { top: new THREE.Vector3(), bottom: new THREE.Vector3(), axis: new THREE.Vector3() },
  plug: { top: new THREE.Vector3(), axis: new THREE.Vector3() },
}

/** Z: the carried direction made square to the axis Y; X completes the frame. */
function carry(axis, keep, outX, outZ) {
  keep.addScaledVector(axis, -keep.dot(axis))
  if (keep.lengthSq() < 1e-6) keep.set(axis.y, -axis.x, 0)
  keep.normalize()
  outZ.copy(keep)
  outX.crossVectors(axis, outZ).normalize()
}

function placeParts() {
  earbuds.left.matrix.copy(mats4.left)
  earbuds.right.matrix.copy(mats4.right)

  // remote: centred between its two particles
  const [rt, rb] = sim.pieces.remote
  P(rt, fr.remote.top)
  P(rb, fr.remote.bottom)
  Y.subVectors(fr.remote.top, fr.remote.bottom).normalize()
  fr.remote.axis.copy(Y)
  // lying on the floor, it settles onto its back or its front, whichever is nearer
  const low = Math.max(fr.remote.top.y, fr.remote.bottom.y) < S.REMOTE.hw + 0.12
  if (low) {
    Z.set(0, Math.sign(remoteZ.y) || 1, 0)
    remoteZ.lerp(Z, 0.12)
  }
  carry(Y, remoteZ, X, Z)
  C.addVectors(fr.remote.top, fr.remote.bottom).multiplyScalar(0.5)
  remote.matrix.makeBasis(X, Y, Z).setPosition(C)

  // splitter: origin at the top; its sideways axis runs from the left cable to the right one
  const [st, sb] = sim.pieces.splitter
  P(st, fr.split.top)
  P(sb, fr.split.bottom)
  Y.subVectors(fr.split.top, fr.split.bottom).normalize()
  const [cl, cr] = sim.sleeves
  P(cl, va)
  P(cr, vb)
  X.subVectors(vb, va)
  X.addScaledVector(Y, -X.dot(Y))
  if (X.lengthSq() > 1e-8) splitX.copy(X.normalize())
  else splitX.addScaledVector(Y, -splitX.dot(Y)).normalize()
  Z.crossVectors(splitX, Y).normalize()
  X.crossVectors(Y, Z)
  splitter.matrix.makeBasis(X, Y, Z).setPosition(fr.split.top)
  fr.split.axis.copy(Y)
  fr.split.x = fr.split.x || new THREE.Vector3()
  fr.split.x.copy(X)

  // plug: origin where the cable goes in, the pin pointing away along its axis
  const [pt, pp] = sim.pieces.plug
  P(pt, fr.plug.top)
  P(pp, va)
  Y.subVectors(fr.plug.top, va).normalize()
  fr.plug.axis.copy(Y)
  carry(Y, plugZ, X, Z)
  plug.matrix.makeBasis(X, Y, Z).setPosition(fr.plug.top)
}

// cable ends: each tube starts and finishes a little way inside the part it plugs into
const tmp = new THREE.Vector3()
function push(tube, v) {
  const k = tube.n * 3
  tube.pts[k] = v.x
  tube.pts[k + 1] = v.y
  tube.pts[k + 2] = v.z
  tube.n++
}
function pushIds(tube, ids, from, to) {
  for (let q = from; q < to; q++) push(tube, P(ids[q], tmp))
}
const SLEEVE = { top: 0.115, depth: 0.2 } // the splitter's sleeves: x at the top, how far down they go
function updateTubes() {
  const s = fr.split
  const c = sim.chains
  let t = tubes.left
  t.n = 0
  push(t, budPoint('left', [EXIT[0], S.COLLAR.groove, EXIT[2]], tmp))
  pushIds(t, c.left, 0, c.left.length - 1)
  // into the splitter's left sleeve
  push(t, tmp.copy(s.top).addScaledVector(s.x, -SLEEVE.top).addScaledVector(s.axis, -0.03))
  push(t, tmp.copy(s.top).addScaledVector(s.x, -0.07).addScaledVector(s.axis, -SLEEVE.depth))
  t.t.update(t.pts, t.n)

  t = tubes.rightUpper
  t.n = 0
  push(t, budPoint('right', [EXIT[0], S.COLLAR.groove, EXIT[2]], tmp))
  pushIds(t, c.rightUpper, 0, c.rightUpper.length)
  push(t, tmp.copy(fr.remote.top).addScaledVector(fr.remote.axis, -0.25))
  t.t.update(t.pts, t.n)

  t = tubes.rightLower
  t.n = 0
  push(t, tmp.copy(fr.remote.bottom).addScaledVector(fr.remote.axis, 0.25))
  pushIds(t, c.rightLower, 0, c.rightLower.length - 1)
  push(t, tmp.copy(s.top).addScaledVector(s.x, SLEEVE.top).addScaledVector(s.axis, -0.03))
  push(t, tmp.copy(s.top).addScaledVector(s.x, 0.07).addScaledVector(s.axis, -SLEEVE.depth))
  t.t.update(t.pts, t.n)

  t = tubes.main
  t.n = 0
  push(t, tmp.copy(s.top).addScaledVector(s.axis, -(S.SPLITTER.len - 0.3)))
  pushIds(t, c.main, 0, c.main.length)
  push(t, tmp.copy(fr.plug.top).addScaledVector(fr.plug.axis, -0.3))
  t.t.update(t.pts, t.n)
}

// ---------------------------------------------------------------- picking
// Rays are traced against the real shapes (their distance functions) in each part's own frame,
// and against the cable's beads, with a few pixels' grace for the thin cable.
const ray = new THREE.Ray()
const inv = new THREE.Matrix4()
const lo = new THREE.Vector3()
const ld = new THREE.Vector3()
const SHAPES = {
  left: { sdf: S.earbud, centre: [0, -1.5, -0.2], r: 2.6 },
  right: { sdf: S.earbud, centre: [0, -1.5, -0.2], r: 2.6, mirror: true },
  remote: { sdf: S.remote, centre: [0, 0, 0], r: 2.0 },
  splitter: { sdf: S.splitter, centre: [0, -0.5, 0], r: 0.75 },
  plug: { sdf: S.plugHousing, centre: [0, -2, 0], r: 2.2 },
}
const plugLen = PIECES.plug.len
function pickShape(name, obj) {
  const sh = SHAPES[name]
  inv.copy(obj.matrix).invert()
  lo.copy(ray.origin).applyMatrix4(inv)
  ld.copy(ray.direction).transformDirection(inv)
  if (sh.mirror) {
    lo.x = -lo.x
    ld.x = -ld.x
  }
  // start where the ray meets the shape's bounding sphere
  const cx = lo.x - sh.centre[0]
  const cy = lo.y - sh.centre[1]
  const cz = lo.z - sh.centre[2]
  const b = cx * ld.x + cy * ld.y + cz * ld.z
  const c = cx * cx + cy * cy + cz * cz - sh.r * sh.r
  const disc = b * b - c
  if (disc < 0) return null
  const t0 = Math.max(0, -b - Math.sqrt(disc))
  let hit = raycastSDF(sh.sdf, lo.x + ld.x * t0, lo.y + ld.y * t0, lo.z + ld.z * t0, ld.x, ld.y, ld.z, sh.r * 2.2)
  // the plug's metal pin is a lathe, not a distance function: a cylinder will do
  if (!hit && name === 'plug') {
    for (let t = t0; t < t0 + sh.r * 2.2; t += 0.02) {
      const px = lo.x + ld.x * t
      const py = lo.y + ld.y * t
      const pz = lo.z + ld.z * t
      if (py < S.PLUG.pinTop && py > S.PLUG.tip && Math.hypot(px, pz) < 0.19) {
        hit = [px, py, pz]
        break
      }
    }
  }
  if (!hit) return null
  const local = new THREE.Vector3(sh.mirror ? -hit[0] : hit[0], hit[1], hit[2])
  const world = local.clone().applyMatrix4(obj.matrix)
  return { local, world, dist: world.distanceTo(ray.origin) }
}

/** What is under the pointer: an earbud, a piece, the cable, or nothing. */
function pick(clientX, clientY) {
  const r = renderer.domElement.getBoundingClientRect()
  const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
  camera.updateMatrixWorld()
  ray.origin.setFromMatrixPosition(camera.matrixWorld)
  ray.direction.set(ndc.x, ndc.y, 0.5).unproject(camera).sub(ray.origin).normalize()
  let best = null
  const consider = (h) => {
    if (h && (!best || h.dist < best.dist)) best = h
  }
  for (const side of ['left', 'right']) {
    const h = pickShape(side, parts[side])
    if (h) consider({ kind: 'bud', side, point: h.world, dist: h.dist })
  }
  for (const name of ['remote', 'splitter', 'plug']) {
    const h = pickShape(name, parts[name])
    if (!h) continue
    // where along the piece's axis (0 at its first particle, 1 at its second)
    let t
    if (name === 'remote') t = (S.REMOTE.len / 2 - h.local.y) / S.REMOTE.len
    else if (name === 'splitter') t = -h.local.y / S.SPLITTER.len
    else t = -h.local.y / plugLen
    consider({ kind: 'piece', piece: name, t: THREE.MathUtils.clamp(t, 0, 1), point: h.world, dist: h.dist })
  }
  // the cable: beads, fattened by a few pixels
  const pxWorld = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / r.height
  for (const i of sim.cab) {
    P(i, va)
    const toC = va.clone().sub(ray.origin)
    const along = toC.dot(ray.direction)
    if (along <= 0) continue
    const d2 = toC.lengthSq() - along * along
    const rr = sim.s.cableR + 7 * pxWorld * along
    if (d2 > rr * rr) continue
    const dist = along - Math.sqrt(Math.max(0, rr * rr - d2)) * 0.2
    if (!best || dist < best.dist - 0.05) best = { kind: 'cable', i, point: va.clone(), dist }
  }
  return best
}

// ---------------------------------------------------------------- the view
// An orbit round a target: azimuth (any amount), polar angle (from straight above to straight
// below), and a zoom over the distance that frames the whole set.
const HOME_VIEW = { theta: -0.16, phi: 1.36, zoom: 1, target: new THREE.Vector3(1.4, 5.9, 1.2) }
const view = {
  theta: HOME_VIEW.theta,
  phi: HOME_VIEW.phi,
  zoom: HOME_VIEW.zoom,
  target: HOME_VIEW.target.clone(),
  fit: 40,
  home: HOME_VIEW,
}
// what the default view must show: the earbuds' tops down to the floor, the set's full width.
// On a tall, narrow screen, the earbuds, the remote and the splitter; the plug can run off the side
const FRAME = { x: [-5.2, 8.4], y: [0, 13.4], z: [-1.6, 6.2] }
const FRAME_TALL = { x: [-4.6, 4.4], y: [0, 13.4], z: [-1.2, 2.5] }
function fitDistance() {
  const box = camera.aspect < 0.8 ? FRAME_TALL : FRAME
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  // the box's corners in the home view's camera frame
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(HOME_VIEW.phi - Math.PI / 2, HOME_VIEW.theta, 0, 'YXZ'))
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q)
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
  const back = new THREE.Vector3(0, 0, 1).applyQuaternion(q)
  let need = 0
  for (const x of box.x)
    for (const y of box.y)
      for (const z of box.z) {
        const d = new THREE.Vector3(x, y, z).sub(HOME_VIEW.target)
        const depth = d.dot(back)
        // distance at which this corner sits on the frame's edge, with a margin
        need = Math.max(need, (Math.abs(d.dot(up)) * 1.08) / t + depth, (Math.abs(d.dot(right)) * 1.08) / (t * camera.aspect) + depth)
      }
  return need
}
function placeCamera() {
  const d = view.fit / view.zoom
  const sp = Math.sin(view.phi)
  camera.position.set(sp * Math.sin(view.theta), Math.cos(view.phi), sp * Math.cos(view.theta)).multiplyScalar(d).add(view.target)
  // over the poles, keep "up" turning smoothly with the azimuth
  camera.up.set(0, 1, 0)
  camera.lookAt(view.target)
  // seen from below, the floor has nothing to show
  contact.plane.visible = camera.position.y > 0.05
}

function resize() {
  const w = stage.clientWidth
  const h = stage.clientHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  view.fit = fitDistance()
  placeCamera()
}
window.addEventListener('resize', resize)
resize()

// ---------------------------------------------------------------- input
const controls = createControls({
  dom: renderer.domElement,
  camera,
  view,
  buds,
  sim,
  pick,
  budPoint,
  exit: EXIT,
  budMatrix,
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
})

// the hint goes once someone has tried something
const hint = document.getElementById('hint')
const hideHint = () => hint.classList.add('gone')
renderer.domElement.addEventListener('pointerdown', hideHint, { once: true })
renderer.domElement.addEventListener('wheel', hideHint, { once: true })

for (const b of document.querySelectorAll('[data-action]'))
  b.addEventListener('click', () => {
    const a = b.dataset.action
    if (a === 'zoom-in') controls.zoomBy(1.4)
    else if (a === 'zoom-out') controls.zoomBy(1 / 1.4)
    else if (a === 'reset') controls.reset()
    else if (a === 'theme') setTheme(html.dataset.theme === 'dark' ? 'light' : 'dark')
  })

// ---------------------------------------------------------------- loop
let last = performance.now()
let running = true
// the contact shadow pass leaves out whatever is too high above the floor to cast one
const shadowHide = []
const CONTACT_HEIGHT = 4.5
function frame(now) {
  if (!running) return
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  controls.update(dt, now / 1000)
  budMatrix('left')
  budMatrix('right')
  sim.setEarbuds(els.left, els.right)
  sim.step(dt)
  placeParts()
  updateTubes()
  placeCamera()
  shadowHide.length = 0
  for (const side of ['left', 'right']) if (budPoint(side, EXIT, tmp).y > CONTACT_HEIGHT + 0.5) shadowHide.push(earbuds[side])
  contact.update(scene, shadowHide)
  renderer.render(scene, camera)
  if (stats) {
    stats.push(performance.now() - now)
    if (stats.length > 600) stats.shift()
  }
  requestAnimationFrame(frame)
}
// ?debug: how long each frame's own work takes (not counting the GPU)
const stats = params.has('debug') ? [] : null
placeParts()
updateTubes()
requestAnimationFrame(frame)
document.getElementById('loading').classList.add('done')
document.body.classList.add('ready')

// leaving the page: stop, and give the GPU its memory back
window.addEventListener('pagehide', (e) => {
  if (e.persisted) return
  running = false
  controls.dispose()
  window.removeEventListener('resize', resize)
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose()
    if (o.material)
      for (const m of [].concat(o.material)) {
        for (const v of Object.values(m)) if (v && v.isTexture) v.dispose()
        m.dispose()
      }
  })
  for (const t of Object.values(tubes)) t.t.dispose()
  contact.dispose()
  scene.environment?.dispose()
  renderer.dispose()
})

if (params.has('debug'))
  window.__ep = { THREE, scene, camera, renderer, sim, view, buds, parts, controls, pick, placeCamera, setTheme, budPoint, fr, stats }
