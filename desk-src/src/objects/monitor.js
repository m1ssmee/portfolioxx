// A second screen behind the laptop: a 27-inch monitor, landscape, flat, held up over the laptop's
// lid on an arm from a pole clamped to the desk's back edge at its left (the "side stand"). It
// shows what the laptop's browser has open, bigger: a strip of tabs (a tap on one switches the
// laptop too), the project's page under it (up close, the live site itself: scene.js lays it over
// the page's part of the glass, as for the laptop).
// It is plugged into the laptop: the laptop has only USB-C, so a small aluminium USB-C to HDMI
// adapter hangs from its left side (a USB-C plug, a short tail, the adapter's block), an HDMI plug
// in the block, and the HDMI cable over the desk to the pole, up it and along the arm.
// The monitor's frame: y up from the desk, +z its front, the origin on the desk under the middle
// of its glass (mm).
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { drawPage, PAGE } from './laptopScreen.js'

export const MONITOR = {
  w: 612, // (the glass 597 x 336 inside a 7.5 mm border)
  h: 351,
  glass: [597, 336],
  bottom: 240, // (its lower edge above the desk: clear of the laptop's open lid)
  pole: [-400, -44], // (the pole: x, z in its frame; on the desk's back edge, left of the glass)
  poleR: 15,
  armZ: -46, // (the arm's depth, behind the panel)
  tex: [1920, 1080],
  bar: 64, // (the tab strip's height, in the picture's pixels)
  page: [1600, 847], // (the page under it, as a page would see it: px)
}
const M = MONITOR
const CY = M.bottom + M.h / 2

/**
 * The picture (1920 x 1080): a tab for each project, the open one's page under them (as the
 * laptop draws it: its screenshot, or drawn). Returns the tabs' rectangles ([x0, x1], px).
 */
export function drawBrowser(c, projects, tab, font, shots, pageC) {
  const g = c.getContext('2d')
  const [W, H] = M.tex
  const B = M.bar
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.fillStyle = '#1d1f23'
  g.fillRect(0, 0, W, B)
  const n = projects.length
  const tw = Math.min(300, (W - 40) / n)
  const rects = []
  g.font = `500 22px ${font || 'Inter'}, -apple-system, 'Segoe UI', Arial, sans-serif`
  g.textBaseline = 'middle'
  projects.forEach((p, i) => {
    const x = 20 + i * tw
    if (i === tab) {
      g.fillStyle = '#34373d'
      g.beginPath()
      g.roundRect(x, 10, tw - 6, B - 10, [10, 10, 0, 0])
      g.fill()
    }
    g.fillStyle = i === tab ? '#f1f3f5' : '#9aa0a8'
    let t = p.name
    while (g.measureText(t).width > tw - 36 && t.length > 2) t = t.slice(0, -2) + '…'
    g.fillText(t, x + 16, B / 2 + 4)
    rects.push([x, x + tw - 6])
  })
  // the page: drawn as the laptop draws it (1440 wide), shown 1920 wide from its top
  const pg = pageC.getContext('2d')
  pg.setTransform(PAGE.texW / PAGE.w, 0, 0, PAGE.texW / PAGE.w, 0, 0)
  pg.clearRect(0, 0, PAGE.w, PAGE.h)
  const p = projects[tab]
  drawPage(pg, p, font, shots[p.id])
  const k = PAGE.texW / PAGE.w
  const srcH = ((H - B) * PAGE.w) / W
  g.drawImage(pageC, 0, 0, PAGE.w * k, srcH * k, 0, B, W, H - B)
  return rects
}

/** What it shows with nothing plugged in: its own small box, on black. */
export function drawNoSignal(c) {
  const g = c.getContext('2d')
  const W = c.width
  const H = c.height
  g.fillStyle = '#020305'
  g.fillRect(0, 0, W, H)
  const bw = 520
  const bh = 210
  const x = (W - bw) / 2
  const y = H * 0.42 - bh / 2
  g.fillStyle = '#12161c'
  g.strokeStyle = '#3a4350'
  g.lineWidth = 3
  g.beginPath()
  g.roundRect(x, y, bw, bh, 14)
  g.fill()
  g.stroke()
  g.textAlign = 'center'
  g.fillStyle = '#8d99a8'
  g.font = "500 30px Inter, -apple-system, 'Segoe UI', Arial, sans-serif"
  g.fillText('HDMI 1', W / 2, y + 70)
  g.fillStyle = '#eef2f6'
  g.font = "600 52px Inter, -apple-system, 'Segoe UI', Arial, sans-serif"
  g.fillText('No signal', W / 2, y + 140)
  g.fillStyle = '#5d6877'
  g.font = "400 24px Inter, -apple-system, 'Segoe UI', Arial, sans-serif"
  g.fillText('Check the cable and the input source', W / 2, y + bh + 54)
  g.textAlign = 'left'
}

/**
 * The monitor. at: on the desk under the middle of its glass (world); yaw: the way it faces;
 * projects, font, shots: as the laptop's. Returns { group, meshes, display, materials, glow(on),
 *   setSignal(on), signal, showTab(i), tapAt(hit) -> a tab's index or -1, update(dt), screenCenter(out),
 *   screenNormal(out), pageSize, pageCorners(out), cableUp(), clamp (its foot: x, z in its frame),
 *   dispose() }.
 */
export function createMonitor({ at, yaw, projects, font, shots = {}, anisotropy = 4 }) {
  const group = new THREE.Group()
  group.name = 'monitor'
  group.position.copy(at)
  group.rotation.y = yaw
  const geometries = []
  const shell = new THREE.MeshStandardMaterial({ color: 0x161618, roughness: 0.58 })
  const metal = new THREE.MeshStandardMaterial({ color: 0x2c2d30, roughness: 0.42, metalness: 0.7 })
  shell.customProgramCacheKey = () => 'monitor.shell'
  metal.customProgramCacheKey = () => 'monitor.metal'
  const canvas = document.createElement('canvas')
  canvas.width = M.tex[0]
  canvas.height = M.tex[1]
  const pageC = document.createElement('canvas')
  pageC.width = PAGE.texW
  pageC.height = PAGE.texH
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = anisotropy
  const lost = document.createElement('canvas')
  lost.width = M.tex[0]
  lost.height = M.tex[1]
  drawNoSignal(lost)
  const lostMap = new THREE.CanvasTexture(lost)
  lostMap.colorSpace = THREE.SRGBColorSpace
  lostMap.anisotropy = anisotropy
  // (a matt panel: it shows its own picture, and little of the room in it)
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.92, roughness: 0.46, specularIntensity: 0.14, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })
  glass.customProgramCacheKey = () => 'monitor.glass'
  const meshes = []
  const add = (g, m, name, cast = true) => {
    geometries.push(g)
    const o = new THREE.Mesh(g, m)
    o.name = `monitor.${name}`
    o.castShadow = cast
    group.add(o)
    meshes.push(o)
    return o
  }
  // the panel, the bulge of its electronics behind, the mount's plate
  add(
    mergeGeometries([
      new THREE.BoxGeometry(M.w, M.h, 12).translate(0, CY, -6),
      new THREE.BoxGeometry(380, 220, 16).translate(0, CY - 10, -20),
      new THREE.BoxGeometry(110, 110, 6).translate(0, CY, -31),
    ]),
    shell,
    'body',
  )
  const display = add(new THREE.PlaneGeometry(M.glass[0], M.glass[1]).translate(0, CY, 0.3), glass, 'display', false)
  // the stand: a clamp on the desk's back edge, a pole up from it, a collar, an arm in two
  // pieces across behind the panel to the plate, a tilt block
  const [px, pz] = M.pole
  const R = M.poleR
  const armY = CY + 6
  const cyl = (r0, r1, h, x, y, z, seg = 24) => new THREE.CylinderGeometry(r0, r1, h, seg).translate(x, y, z)
  const bar = (a, b, r) => {
    const d = new THREE.Vector3().subVectors(b, a)
    const g = new THREE.CylinderGeometry(r, r, d.length(), 18)
    g.translate(0, d.length() / 2, 0)
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()))
    return g.translate(a.x, a.y, a.z)
  }
  const elbow = new THREE.Vector3(-170, armY, M.armZ - 2)
  add(
    mergeGeometries([
      // the clamp: a plate on the desk, its jaw down the back edge
      new THREE.BoxGeometry(70, 10, 64).translate(px, 5, pz + 6),
      new THREE.BoxGeometry(70, 70, 10).translate(px, -25, pz - 31),
      new THREE.BoxGeometry(70, 10, 46).translate(px, -55, pz - 10),
      cyl(R, R, armY + 40, px, (armY + 40) / 2, pz),
      cyl(R + 6, R + 6, 44, px, armY, pz),
      cyl(R, R * 0.7, 10, px, armY + 45, pz),
      bar(new THREE.Vector3(px, armY, pz), elbow, 12),
      cyl(16, 16, 40, elbow.x, elbow.y, elbow.z),
      bar(elbow, new THREE.Vector3(0, CY, -40), 11),
      new THREE.BoxGeometry(60, 60, 12).translate(0, CY, -40),
    ]),
    metal,
    'stand',
  )
  group.updateMatrixWorld(true)
  let lit = true
  let signal = true
  let blank = 0
  let tab = -1
  let tabs = []
  const show = () => (glass.emissiveIntensity = lit && blank <= 0 ? 0.92 : 0)
  const GW = M.glass[0]
  const GH = M.glass[1]
  const barMM = (M.bar / M.tex[1]) * GH
  return {
    group,
    meshes,
    display,
    materials: [shell, metal, glass],
    /** Its picture lit or dark (dark in the ember's own frame: the light is counted once). */
    glow(on) {
      lit = on
      show()
    },
    /** A signal on its input, or none: the picture goes black for a moment, then the page or its "No signal". */
    setSignal(on) {
      if (on === signal) return
      signal = on
      blank = on ? 0.9 : 0.35
      show()
    },
    get signal() {
      return signal
    },
    /** The laptop's open tab, shown here too (drawn again only when it changes). */
    showTab(i) {
      if (i === tab) return false
      tab = i
      tabs = drawBrowser(canvas, projects, tab, font, shots, pageC)
      map.needsUpdate = true
      return true
    },
    /** A tap on the glass (a raycast hit): on a tab, its index; else -1. */
    tapAt(hit) {
      if (!hit || hit.object !== display || !hit.uv || !signal) return -1
      const x = hit.uv.x * M.tex[0]
      const y = (1 - hit.uv.y) * M.tex[1]
      if (y > M.bar) return -1
      return tabs.findIndex((r) => x >= r[0] && x <= r[1])
    },
    /** Each frame: the blank moment running out (returns true while it lasts). */
    update(dt) {
      if (blank <= 0) return false
      blank -= dt
      if (blank <= 0) {
        glass.emissiveMap = signal ? map : lostMap
        show()
      }
      return true
    },
    screenCenter: (out) => out.set(0, CY, 0).applyMatrix4(group.matrixWorld),
    screenNormal: (out) => out.set(0, 0, 1).transformDirection(group.matrixWorld),
    /** The page's part of the glass (under the tabs), in the page's own pixels. */
    pageSize: M.page,
    /** Its corners (world): top left, top right, bottom right, bottom left (out: four vectors). */
    pageCorners(out) {
      const top = CY + GH / 2 - barMM
      const bot = CY - GH / 2
      out[0].set(-GW / 2, top, 0.4)
      out[1].set(GW / 2, top, 0.4)
      out[2].set(GW / 2, bot, 0.4)
      out[3].set(-GW / 2, bot, 0.4)
      for (const v of out) v.applyMatrix4(group.matrixWorld)
      return out
    },
    /** Its clamp on the desk (x, z in its frame; half its size), for what stands on the desk. */
    clamp: { x: px, z: pz + 6, hw: 35, hd: 32 },
    /** Points from the desk up the pole's front and along the arm to the panel's back (world). */
    cableUp: () =>
      [
        [px + 30, 3.4, pz + 30],
        [px + 6, 3.4, pz + R + 3],
        [px + 6, 14, pz + R + 3],
        [px + 6, armY - 40, pz + R + 3],
        [px + 16, armY - 16, pz + 8],
        [px + 80, armY - 14, M.armZ + 8],
        [-120, CY - 40, -30],
      ].map((p) => new THREE.Vector3(...p).applyMatrix4(group.matrixWorld)),
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of [shell, metal, glass]) m.dispose()
      map.dispose()
      lostMap.dispose()
    },
  }
}

/**
 * The link to the laptop. port: the laptop's USB-C port (world); out: the way out of it (world,
 * level); deskY; run: the HDMI cable's way over the desk after the adapter (world points, their
 * heights ignored); up: the points up the monitor's neck (monitor.cableUp()).
 * The USB-C plug comes out: toggle() pulls it and lays it on the desk beside the laptop, or puts it
 * back; onChange(plugged) as it leaves the port, or once it is home again.
 * Returns { group, meshes (what stays put), plugMeshes (the plug and its tail), materials,
 *   plugged, toggle(), plug(), update(dt) -> still moving, dispose() }.
 */
export function createHdmiLink({ port, out, fwd, deskY, run, up, onChange }) {
  const group = new THREE.Group()
  group.name = 'hdmi'
  const alu = new THREE.MeshStandardMaterial({ color: 0x8e9197, roughness: 0.36, metalness: 0.9 })
  const black = new THREE.MeshStandardMaterial({ color: 0x141415, roughness: 0.6 })
  alu.customProgramCacheKey = () => 'hdmi.alu'
  black.customProgramCacheKey = () => 'hdmi.black'
  const o = new THREE.Vector3(out.x, 0, out.z).normalize()
  const yawOf = (d) => Math.atan2(d.x, d.z)
  const parts = { alu: [], black: [] }
  /** A box, its length (z) along `dir`, its middle at `c`. */
  const box = (w, h, len, c, dir, to) => {
    const g = new THREE.BoxGeometry(w, h, len)
    g.rotateY(yawOf(dir))
    g.translate(c.x, c.y, c.z)
    parts[to].push(g)
  }
  const curve = (pts) => new THREE.CatmullRomCurve3(pts, false, 'centripetal')
  const py = port.y
  const P = (d, y = py) => new THREE.Vector3(port.x + o.x * d, y, port.z + o.z * d)
  // the adapter's block, on the desk: out from the port and towards the chair, lying along `axis`
  const axis = new THREE.Vector3().copy(o).multiplyScalar(0.72).addScaledVector(fwd, -0.69).normalize()
  const by = deskY + 5.4
  const B = P(34, by).addScaledVector(axis, 58)
  const bEnd = (s) => new THREE.Vector3().copy(B).addScaledVector(axis, s)
  box(24, 10.8, 56, B, axis, 'alu')
  // the HDMI plug in its far end, its strain relief, the cable
  box(21, 10.2, 30, bEnd(28 + 14), axis, 'black')
  box(14, 8.6, 12, bEnd(28 + 35), axis, 'black')
  const cy = deskY + 3.4
  const lift = (p, y = cy) => new THREE.Vector3(p.x, y, p.z)
  parts.black.push(new THREE.TubeGeometry(curve([bEnd(28 + 38).setY(by), bEnd(28 + 56).setY(by - 1), bEnd(28 + 80).setY(cy), ...run.map((p) => lift(p)), ...up]), 220, 3.3, 8, false))
  const meshes = []
  const materials = { alu, black }
  const geometries = []
  for (const k of ['alu', 'black']) {
    const g = mergeGeometries(parts[k].map((x) => (x.index ? x.toNonIndexed() : x)))
    for (const x of parts[k]) x.dispose()
    geometries.push(g)
    const m = new THREE.Mesh(g, materials[k])
    m.name = `hdmi.${k}`
    m.castShadow = true
    group.add(m)
    meshes.push(m)
  }
  // ---- the USB-C plug (its shell, its tongue) and the tail to the block: they move
  const plugGeo = mergeGeometries([new THREE.BoxGeometry(12.4, 6.2, 19), new THREE.BoxGeometry(8.2, 2.4, 6.4).translate(0, 0, -12.4)])
  geometries.push(plugGeo)
  const plugMesh = new THREE.Mesh(plugGeo, alu)
  plugMesh.name = 'hdmi.usbc'
  plugMesh.castShadow = true
  const tail = new THREE.Mesh(new THREE.BufferGeometry(), black)
  tail.name = 'hdmi.tail'
  tail.castShadow = true
  group.add(plugMesh, tail)
  const yaw0 = yawOf(o)
  const rear = new THREE.Vector3()
  const dir = new THREE.Vector3()
  let t = 0 // (0: in the port; 1: out, on the desk)
  let to = 0
  /** The plug and its tail at t: drawn out of the port, then swung a little and laid on the desk. */
  function place() {
    const pull = Math.min(1, t / 0.45)
    const drop = Math.max(0, (t - 0.3) / 0.7)
    const e1 = pull * pull * (3 - 2 * pull)
    const e2 = drop * drop * (3 - 2 * drop)
    const yaw = yaw0 + 0.55 * e2
    dir.set(Math.sin(yaw), 0, Math.cos(yaw))
    plugMesh.position.copy(P(11.5 + 30 * e1 + 6 * e2)).addScaledVector(fwd, -16 * e2)
    plugMesh.position.y = py + (deskY + 3.15 - py) * e2
    plugMesh.rotation.y = yaw
    plugMesh.updateMatrixWorld(true)
    rear.copy(plugMesh.position).addScaledVector(dir, 9.5)
    const mid = new THREE.Vector3().copy(rear).addScaledVector(dir, 12)
    const g = new THREE.TubeGeometry(curve([rear.clone(), mid, bEnd(-44).setY(by + 0.4), bEnd(-27)]), 28, 2.1, 8, false)
    tail.geometry.dispose()
    tail.geometry = g
  }
  place()
  group.updateMatrixWorld(true)
  const api = {
    group,
    meshes,
    plugMeshes: [plugMesh, tail],
    materials: [alu, black],
    get plugged() {
      return to === 0
    },
    toggle() {
      to = to ? 0 : 1
      // (out of the port at once; home only when it is back in)
      if (to === 1) onChange?.(false)
    },
    plug() {
      if (to === 0) return
      to = 0
    },
    update(dt) {
      if (t === to) return false
      const was = t
      t = to > t ? Math.min(to, t + dt / 0.5) : Math.max(to, t - dt / 0.5)
      place()
      if (to === 0 && t === 0 && was > 0) onChange?.(true)
      return true
    },
    dispose() {
      for (const g of geometries) g.dispose()
      tail.geometry.dispose()
      alu.dispose()
      black.dispose()
    },
  }
  return api
}
