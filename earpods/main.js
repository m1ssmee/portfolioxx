// The earphones page: scene, lighting, the cable simulation and the render loop.
import * as THREE from 'three'
import { EarphoneSim } from './cable.js'
import { createControls } from './controls.js'
import { meshAll } from './jobs.js'
import { makeEarbud, makeMaterials, makePlug, makeRemote, makeSplitter, meshGeometry, mirrorX } from './parts.js'
import { studioEnvironment } from './studio.js'
import { Tube } from './tube.js'

const params = new URLSearchParams(location.search)
const stage = document.getElementById('stage')

// ---------------------------------------------------------------- renderer and scene
// the page's light studio backdrop shows through the canvas
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
renderer.setClearColor(0x000000, 0)
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.NeutralToneMapping
renderer.toneMappingExposure = 1
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
stage.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.environment = studioEnvironment(renderer)
scene.environmentIntensity = 1

const camera = new THREE.PerspectiveCamera(20, 1, 1, 600)

// the key light only adds shape and casts the shadows; the studio's panels do most of the lighting
const key = new THREE.DirectionalLight('#ffffff', 0.9)
key.position.set(-30, 60, 45)
key.castShadow = true
key.shadow.mapSize.set(2048, 2048)
key.shadow.camera.left = key.shadow.camera.bottom = -22
key.shadow.camera.right = key.shadow.camera.top = 22
key.shadow.camera.near = 20
key.shadow.camera.far = 140
key.shadow.bias = -0.0003
key.shadow.normalBias = 0.02
key.shadow.radius = 3
scene.add(key)
scene.add(key.target)
scene.add(new THREE.HemisphereLight('#ffffff', '#b9b9bd', 0.18))

// ---------------------------------------------------------------- the earphones
// the parts' shapes are meshed in background threads
const meshes = await meshAll()
const shell = meshGeometry(meshes.earbud)
const shells = { left: shell, right: mirrorX(shell) }
const mats = makeMaterials()
const left = makeEarbud('left', mats, shells)
const right = makeEarbud('right', mats, shells)
const remote = makeRemote(mats, meshGeometry(meshes.remote))
const splitter = makeSplitter(mats, meshGeometry(meshes.splitter))
const plug = makePlug(mats, meshGeometry(meshes.plug))
for (const o of [left, right, remote, splitter, plug]) {
  o.matrixAutoUpdate = false
  scene.add(o)
}

// where the earbuds hang, in the assembly's frame: the left one shows its front, the right one is
// turned to show its speaker
const HOME = {
  left: { p: new THREE.Vector3(-2.9, 0, 0), yaw: -0.25 },
  right: { p: new THREE.Vector3(2.9, 0, 0), yaw: 0.95 },
}
// everything the controls move: the spin of the whole set, the camera's tilt, and each earbud's
// offset from home (world space) with its velocity
const bud = () => ({ off: new THREE.Vector3(), vel: new THREE.Vector3(), drift: new THREE.Vector3(), tilt: 0, held: false })
const state = {
  yaw: 0,
  yawVel: 0,
  pitch: 0.06,
  pitchVel: 0,
  sway: 0,
  idle: 0,
  lastInput: performance.now(),
  still: window.matchMedia('(prefers-reduced-motion: reduce)').matches, // no idle drift
  buds: { left: bud(), right: bud() },
}
const assembly = { get yaw() { return state.yaw + state.sway } }
const UP = THREE.Object3D.DEFAULT_UP
const _q = new THREE.Quaternion()
const _q2 = new THREE.Quaternion()
const _e = new THREE.Euler()
const _v = new THREE.Vector3()
const ONE = new THREE.Vector3(1, 1, 1)
const Zaxis = new THREE.Vector3(0, 0, 1)

function budHome(side, out) {
  const b = state.buds[side]
  return out.copy(HOME[side].p).add(b.drift).applyAxisAngle(UP, assembly.yaw)
}

function budMatrix(side, out) {
  const b = state.buds[side]
  budHome(side, _v).add(b.off)
  // a held or thrown earbud leans a little the way it's moving
  b.tilt += (THREE.MathUtils.clamp(-b.vel.x * 0.012, -0.35, 0.35) - b.tilt) * 0.2
  _q.setFromEuler(_e.set(0, assembly.yaw + HOME[side].yaw, 0, 'YXZ'))
  _q.premultiply(_q2.setFromAxisAngle(Zaxis, b.tilt))
  return out.compose(_v, _q, ONE)
}

/** Where an earbud is, for picking and dragging (world space). */
const LOCAL = { head: new THREE.Vector3(0, 0, 0), stemTop: new THREE.Vector3(-0.32, -0.8, -0.5), exit: new THREE.Vector3(-0.32, -3.7, -0.5) }
function budPose(side) {
  const m = side === 'left' ? mL : mR
  const mirror = side === 'right' ? -1 : 1
  const at = (p) => new THREE.Vector3(p.x * mirror, p.y, p.z).applyMatrix4(m)
  return {
    position: new THREE.Vector3().setFromMatrixPosition(m),
    home: budHome(side, new THREE.Vector3()),
    head: at(LOCAL.head),
    stemTop: at(LOCAL.stemTop),
    exit: at(LOCAL.exit),
  }
}

const mL = new THREE.Matrix4()
const mR = new THREE.Matrix4()
budMatrix('left', mL)
budMatrix('right', mR)
const sim = new EarphoneSim().build(mL.elements, mR.elements, 3)

// the cable: four tubes through the simulated particles, each tucked into the parts at its ends
const tubes = {}
for (const [name, ids] of Object.entries(sim.chains)) {
  const t = new Tube(ids.length + 3, sim.s.cableR)
  const mesh = new THREE.Mesh(t.geometry, mats.cable)
  mesh.frustumCulled = false
  mesh.castShadow = mesh.receiveShadow = true
  scene.add(mesh)
  tubes[name] = { t, pts: new Float32Array((ids.length + 3) * 3), n: 0 }
}

// ---------------------------------------------------------------- per-frame placement
const P = (i, out) => out.set(sim.x[i * 3], sim.x[i * 3 + 1], sim.x[i * 3 + 2])
const pa = new THREE.Vector3()
const pb = new THREE.Vector3()
const X = new THREE.Vector3()
const Y = new THREE.Vector3()
const Z = new THREE.Vector3()
const C = new THREE.Vector3()
// the remote's and the plug's facing, carried from frame to frame (they can roll freely)
const remoteZ = new THREE.Vector3(0, 0, 1)
const plugZ = new THREE.Vector3(0, 0, 1)
const splitX = new THREE.Vector3(1, 0, 0)
let lastYaw = assembly.yaw
// frames of the rigid parts, kept for the cable ends
const fr = {
  remote: { top: new THREE.Vector3(), bottom: new THREE.Vector3(), axis: new THREE.Vector3() },
  split: { top: new THREE.Vector3(), bottom: new THREE.Vector3(), axis: new THREE.Vector3(), x: new THREE.Vector3() },
  plug: { top: new THREE.Vector3(), axis: new THREE.Vector3() },
}

/** Z: the carried direction made perpendicular to the axis (Y); X completes the frame. */
function carry(axis, keep, outX, outZ) {
  keep.addScaledVector(axis, -keep.dot(axis))
  if (keep.lengthSq() < 1e-6) keep.set(axis.y, -axis.x, 0)
  keep.normalize()
  outZ.copy(keep)
  outX.crossVectors(axis, outZ).normalize()
}

function placeParts() {
  // carried facings turn with the assembly
  const dy = assembly.yaw - lastYaw
  lastYaw = assembly.yaw
  if (dy) {
    remoteZ.applyAxisAngle(THREE.Object3D.DEFAULT_UP, dy)
    plugZ.applyAxisAngle(THREE.Object3D.DEFAULT_UP, dy)
  }
  left.matrix.copy(mL)
  right.matrix.copy(mR)

  // remote: centred between its two particles, buttons facing its carried direction
  const [mt, mb] = sim.pieces.remote
  P(mt, fr.remote.top)
  P(mb, fr.remote.bottom)
  Y.subVectors(fr.remote.top, fr.remote.bottom).normalize()
  fr.remote.axis.copy(Y)
  carry(Y, remoteZ, X, Z)
  C.addVectors(fr.remote.top, fr.remote.bottom).multiplyScalar(0.5)
  remote.matrix.makeBasis(X, Y, Z).setPosition(C)

  // splitter: origin at the top; its sideways axis points from the left cable to the right one
  const [st, sb] = sim.pieces.splitter
  P(st, fr.split.top)
  P(sb, fr.split.bottom)
  Y.subVectors(fr.split.top, fr.split.bottom).normalize()
  const lc = sim.chains.left
  const rc = sim.chains.right2
  P(lc[lc.length - 2], pa)
  P(rc[rc.length - 2], pb)
  X.subVectors(pb, pa)
  X.addScaledVector(Y, -X.dot(Y))
  if (X.lengthSq() > 1e-6) splitX.copy(X.normalize())
  else splitX.addScaledVector(Y, -splitX.dot(Y)).normalize()
  Z.crossVectors(splitX, Y).normalize()
  X.crossVectors(Y, Z)
  splitter.matrix.makeBasis(X, Y, Z).setPosition(fr.split.top)
  fr.split.axis.copy(Y)
  fr.split.x.copy(X)

  // plug: origin where the cable goes in, pointing down along its two particles
  const [pt, pp] = sim.pieces.plug
  P(pt, fr.plug.top)
  P(pp, pb)
  Y.subVectors(fr.plug.top, pb).normalize()
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
function pushIds(tube, ids, from = 0, to = ids.length) {
  for (let q = from; q < to; q++) push(tube, P(ids[q], tmp))
}
function pushInside(tube, p, dir, d) {
  push(tube, tmp.copy(p).addScaledVector(dir, d))
}

function updateTubes() {
  const s = fr.split
  const lc = sim.chains.left
  const r1 = sim.chains.right1
  const r2 = sim.chains.right2
  const mc = sim.chains.main
  let t = tubes.left
  t.n = 0
  push(t, P(sim.anchors.left[1], tmp)) // up inside the earbud's strain relief
  pushIds(t, lc, 0, lc.length - 1)
  pushInside(t, s.top, s.x, -0.085) // into the splitter's left entry
  push(t, tmp.addScaledVector(s.axis, -0.25))
  t.t.update(t.pts, t.n)

  t = tubes.right1
  t.n = 0
  push(t, P(sim.anchors.right[1], tmp))
  pushIds(t, r1)
  pushInside(t, fr.remote.top, fr.remote.axis, -0.25)
  t.t.update(t.pts, t.n)

  t = tubes.right2
  t.n = 0
  pushInside(t, fr.remote.bottom, fr.remote.axis, 0.25)
  pushIds(t, r2, 0, r2.length - 1)
  pushInside(t, s.top, s.x, 0.085) // into the splitter's right entry
  push(t, tmp.addScaledVector(s.axis, -0.25))
  t.t.update(t.pts, t.n)

  t = tubes.main
  t.n = 0
  pushInside(t, s.bottom, s.axis, 0.25)
  pushIds(t, mc)
  pushInside(t, fr.plug.top, fr.plug.axis, -0.3)
  t.t.update(t.pts, t.n)
}

// ---------------------------------------------------------------- camera
// frame the earphones as they hang after settling: from the tops of the earbuds to the plug's tip
let lowest = 0
for (let i = 0; i < sim.n; i++) lowest = Math.min(lowest, sim.x[i * 3 + 1])
const TOP = 0.95
const HEIGHT = (TOP - lowest) * 1.12
const view = { home: new THREE.Vector3(0, (TOP + lowest) / 2, 0), target: new THREE.Vector3(), dist: 70, zoom: 1 }
view.target.copy(view.home)
function frameCamera() {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const byH = HEIGHT / 2 / t
  const byW = 11 / 2 / (t * camera.aspect)
  view.dist = Math.max(byH, byW) / view.zoom
  camera.position.set(0, Math.sin(state.pitch) * view.dist, Math.cos(state.pitch) * view.dist).add(view.target)
  camera.lookAt(view.target)
}

function resize() {
  const w = stage.clientWidth
  const h = stage.clientHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  frameCamera()
}
window.addEventListener('resize', resize)
resize()

// ---------------------------------------------------------------- input
const controls = createControls({ dom: renderer.domElement, camera, sim, state, view, budPose })

// ---------------------------------------------------------------- loop
let last = performance.now()
let running = true
function frame(now) {
  if (!running) return
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  controls.update(dt, now / 1000)
  if (!view.frozen) frameCamera()
  budMatrix('left', mL)
  budMatrix('right', mR)
  sim.setEarbuds(mL.elements, mR.elements)
  sim.step(dt)
  placeParts()
  updateTubes()
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}
placeParts()
updateTubes()
requestAnimationFrame(frame)
document.getElementById('loading').classList.add('done')

// leaving the page: stop, and give the GPU its memory back
window.addEventListener('pagehide', (e) => {
  if (e.persisted) return // kept in the back/forward cache: it will be shown again as it was
  running = false
  controls.dispose()
  window.removeEventListener('resize', resize)
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose()
    if (o.material) for (const m of [].concat(o.material)) {
      for (const v of Object.values(m)) if (v && v.isTexture) v.dispose()
      m.dispose()
    }
  })
  for (const t of Object.values(tubes)) t.t.dispose()
  scene.environment?.dispose()
  renderer.dispose()
})

if (params.has('debug')) window.__ep = { THREE, scene, camera, renderer, sim, state, view, frameCamera, HOME, budPose, controls }
