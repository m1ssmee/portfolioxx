// A second screen left of the laptop: a 27-inch curved monitor turned to portrait (so its curve
// runs from top to bottom: its top and bottom edges lean towards the chair), on a stand with a
// flat foot. It shows one thing, full screen: a terminal, split in four, a dev server running in
// each (the projects' and this desk's own), every one on localhost.
// It is plugged into the laptop: the laptop has only USB-C, so a small aluminium USB-C to HDMI
// adapter hangs from its left side (a USB-C plug, a short tail, the adapter's block), an HDMI plug
// in the block, and the HDMI cable round the front of the monitor's foot and up behind its neck.
// The monitor's frame: y up from the desk, +z its front, the origin under the middle of its foot (mm).
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export const MONITOR = {
  w: 346, // (portrait: the glass 336 x 597 inside a 5 mm border)
  h: 612,
  glass: [336, 597],
  bottom: 96, // (its lower edge above the desk)
  R: 1500, // (the curve's radius)
  z0: 18, // (the glass's middle, in front of the foot's middle)
  foot: [230, 172, 10],
}
const M = MONITOR
const CY = M.bottom + M.h / 2

/** The curve: how far forward a point at height y (from the screen's middle) stands. */
const sag = (y) => M.R - Math.sqrt(M.R * M.R - y * y)
function bend(g) {
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + sag(p.getY(i) - CY))
  g.computeVertexNormals()
  return g
}

/** The terminal (1080 x 1920): four panes, a dev server in each. projects: portfolio.ts's. */
export function drawTerminal(c, projects) {
  const g = c.getContext('2d')
  const W = c.width
  const H = c.height
  g.fillStyle = '#0c0f13'
  g.fillRect(0, 0, W, H)
  const FS = 23
  const LH = 33
  const mono = `${FS}px ui-monospace, 'SF Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace`
  g.font = mono
  g.textBaseline = 'alphabetic'
  const C = { dim: '#6b7684', text: '#c9d1d9', green: '#56d364', cyan: '#56b6c2', blue: '#79c0ff', yellow: '#e3b341', mag: '#d2a8ff', white: '#f0f3f6' }
  const X0 = 30
  /** A line of coloured runs: [[text, colour, underline?], ...]. */
  const line = (y, runs) => {
    let x = X0
    for (const [t, col, ul] of runs) {
      g.fillStyle = C[col] || col
      g.fillText(t, x, y)
      const w = g.measureText(t).width
      if (ul) g.fillRect(x, y + 4, w, 1.5)
      x += w
    }
    return x
  }
  const has = (id) => projects.some((p) => p.id === id)
  const name = (id, fallback) => (projects.find((p) => p.id === id)?.name || fallback).toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const next = (dir, port, extra) => [
    [['~/code/' + dir, 'cyan'], [' $ ', 'green'], [`npm run dev${port === 3000 ? '' : ` -- -p ${port}`}`, 'white']],
    [],
    [[`> ${dir}@0.1.0 dev`, 'dim']],
    [[`> next dev${port === 3000 ? '' : ` -p ${port}`}`, 'dim']],
    [],
    [['   ▲ Next.js', 'white']],
    [['   - Local:        ', 'text'], [`http://localhost:${port}`, 'blue', true]],
    [],
    [[' ✓ ', 'green'], ['Starting...', 'text']],
    [[' ✓ ', 'green'], ['Ready in 1.6s', 'text']],
    [[' ○ ', 'dim'], ['Compiling / ...', 'text']],
    [[' ✓ ', 'green'], ['Compiled / in 2.4s', 'text']],
    ...extra,
  ]
  const panes = []
  if (has('bodymap'))
    panes.push({
      title: 'bodymap',
      lines: next('bodymap', 3000, [
        [[' GET / ', 'text'], ['200', 'green'], [' in 2731ms', 'dim']],
        [[' GET / ', 'text'], ['200', 'green'], [' in 48ms', 'dim']],
      ]),
    })
  if (has('codebase-tavern'))
    panes.push({
      title: 'codebase-tavern',
      lines: next('codebase-tavern', 3001, [
        [[' GET / ', 'text'], ['200', 'green'], [' in 3120ms', 'dim']],
        [[' GET / ', 'text'], ['200', 'green'], [' in 61ms', 'dim']],
      ]),
    })
  if (has('cropscan'))
    panes.push({
      title: 'cropscan',
      lines: [
        [['~/code/CropScan', 'cyan'], [' $ ', 'green'], ['flask --app app run --debug', 'white']],
        [],
        [[" * Serving Flask app 'app'", 'text']],
        [[' * Debug mode: on', 'text']],
        [[' * Running on ', 'text'], ['http://127.0.0.1:5000', 'blue', true]],
        [['Press CTRL+C to quit', 'yellow']],
        [[' * Restarting with stat', 'dim']],
        [[' * Debugger is active!', 'dim']],
        [],
        [['127.0.0.1 - - ', 'dim'], ['"GET / HTTP/1.1" ', 'text'], ['200', 'green'], [' -', 'dim']],
        [['127.0.0.1 - - ', 'dim'], ['"GET /static/app.css HTTP/1.1" ', 'text'], ['200', 'green'], [' -', 'dim']],
        [['127.0.0.1 - - ', 'dim'], ['"POST /predict HTTP/1.1" ', 'text'], ['200', 'green'], [' -', 'dim']],
      ],
    })
  panes.push({
    title: 'portfolio',
    lines: [
      [['~/code/portfolioxx/desk-src', 'cyan'], [' $ ', 'green'], ['npm run dev', 'white']],
      [],
      [['> late-night-desk@1.0.0 dev', 'dim']],
      [['> vite', 'dim']],
      [],
      [['  VITE', 'green'], [' ready in ', 'text'], ['412 ms', 'white']],
      [],
      [['  ➜  ', 'green'], ['Local:   ', 'white'], ['http://localhost:5173/', 'blue', true]],
      [['  ➜  ', 'dim'], ['Network: use --host to expose', 'dim']],
      [['  ➜  ', 'dim'], ['press ', 'dim'], ['h + enter', 'text'], [' to show help', 'dim']],
      [],
      [['9:41:07 PM ', 'dim'], ['[vite] ', 'cyan'], ['hmr update ', 'green'], ['/src/scene.js', 'dim']],
    ],
    cursor: true,
  })
  const ph = H / panes.length
  panes.forEach((p, i) => {
    const top = i * ph
    // the pane's rule and its name, as a terminal multiplexer draws them
    if (i) {
      g.fillStyle = '#2a313a'
      g.fillRect(0, top, W, 2)
    }
    g.font = `${FS - 5}px ui-monospace, 'SF Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace`
    g.fillStyle = '#4d5866'
    const label = `${i + 1}:${p.title}`
    g.fillText(label, W - X0 - g.measureText(label).width, top + 34)
    g.font = mono
    let y = top + 52
    let endX = X0
    for (const l of p.lines) {
      if (y > top + ph - 14) break
      endX = l.length ? line(y, l) : X0
      y += LH
    }
    if (p.cursor) {
      g.fillStyle = C.text
      g.fillRect(X0, y - FS + 2, 13, FS + 3)
    }
  })
}

/**
 * The monitor. at: under the middle of its foot (world, on the desk); yaw: the way it faces.
 * Returns { group, meshes, materials, glow(on), screenCenter(out), screenNormal(out),
 *   cableEnd(out) (world: where its cable goes in, behind its neck), dispose() }.
 */
export function createMonitor({ at, yaw, projects, anisotropy = 4 }) {
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
  canvas.width = 1080
  canvas.height = 1920
  drawTerminal(canvas, projects)
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = anisotropy
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
  const zb = M.z0 - 13 // (the panel's back)
  add(
    mergeGeometries([
      bend(new THREE.BoxGeometry(M.w, M.h, 13, 1, 28, 1).translate(0, CY, M.z0 - 6.5)),
      // the bulge of its electronics, behind
      bend(new THREE.BoxGeometry(232, 330, 24, 1, 14, 1).translate(0, CY, zb - 12)),
    ]),
    shell,
    'body',
  )
  add(bend(new THREE.PlaneGeometry(M.glass[0], M.glass[1], 1, 28).translate(0, CY, M.z0 + 0.3)), glass, 'display', false)
  // the stand: a foot, a neck up its back, the pivot's block
  const [fw, fd, fh] = M.foot
  const neckZ = zb - 24 - 9
  add(
    mergeGeometries([
      new THREE.BoxGeometry(fw, fh, fd).translate(0, fh / 2, -6),
      new THREE.BoxGeometry(56, CY + 30 - fh, 18).translate(0, fh + (CY + 30 - fh) / 2, neckZ),
      new THREE.BoxGeometry(96, 78, 12).translate(0, CY, zb - 24 - 3 + sag(0)),
    ]),
    metal,
    'stand',
  )
  group.updateMatrixWorld(true)
  return {
    group,
    meshes,
    materials: [shell, metal, glass],
    /** Its picture lit or dark (dark in the ember's own frame: the light is counted once). */
    glow(on) {
      glass.emissiveIntensity = on ? 0.92 : 0
    },
    screenCenter: (out) => out.set(0, CY, M.z0).applyMatrix4(group.matrixWorld),
    screenNormal: (out) => out.set(0, 0, 1).transformDirection(group.matrixWorld),
    /** Points up the back of its neck, from the desk to where the cable goes in (world). */
    cableUp: () =>
      [
        // (onto the foot from its left, across it to the neck, up the neck's back)
        [-fw / 2 - 20, 3.4, -45],
        [-fw / 2 + 4, fh + 3.6, -44],
        [-45, fh + 3.4, neckZ - 15],
        [6, fh + 3.4, neckZ - 13.5],
        [12, fh + 26, neckZ - 12.6],
        [12, CY - 190, neckZ - 12.6],
        [12, CY - 150, neckZ - 4],
      ].map((p) => new THREE.Vector3(...p).applyMatrix4(group.matrixWorld)),
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of [shell, metal, glass]) m.dispose()
      map.dispose()
    },
  }
}

/**
 * The link to the laptop. port: the laptop's USB-C port (world); out: the way out of it (world,
 * level); deskY; run: the HDMI cable's way over the desk after the adapter (world points, their
 * heights ignored); up: the points up the monitor's neck (monitor.cableUp()).
 * Returns { group, meshes, materials, dispose() }.
 */
export function createHdmiLink({ port, out, fwd, deskY, run, up }) {
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
  const tube = (pts, r, to) => parts[to].push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), Math.max(16, pts.length * 14), r, 8, false))
  // the USB-C plug: its shell out of the port
  const py = port.y
  const P = (d, y = py) => new THREE.Vector3(port.x + o.x * d, y, port.z + o.z * d)
  box(12.4, 6.2, 19, P(11.5), o, 'alu')
  box(8.2, 2.4, 6, P(0), o, 'alu')
  // the adapter's block, on the desk: out from the port and towards the chair, lying along `axis`
  const axis = new THREE.Vector3().copy(o).multiplyScalar(0.72).addScaledVector(fwd, -0.69).normalize()
  const by = deskY + 5.4
  const B = P(34, by).addScaledVector(axis, 58)
  const bEnd = (s) => new THREE.Vector3().copy(B).addScaledVector(axis, s)
  box(24, 10.8, 56, B, axis, 'alu')
  // its tail from the plug
  tube([P(20.5), P(30), P(40, by + 0.5).addScaledVector(axis, 10), bEnd(-40), bEnd(-27)], 2.1, 'black')
  // the HDMI plug in its other end, its strain relief, the cable
  box(21, 10.2, 30, bEnd(28 + 14), axis, 'black')
  box(14, 8.6, 12, bEnd(28 + 35), axis, 'black')
  const cy = deskY + 3.4
  const lift = (p, y = cy) => new THREE.Vector3(p.x, y, p.z)
  tube([bEnd(28 + 38).setY(by), bEnd(28 + 56).setY(by - 1), bEnd(28 + 80).setY(cy), ...run.map((p) => lift(p)), ...up], 3.3, 'black')
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
  return {
    group,
    meshes,
    materials: [alu, black],
    dispose() {
      for (const g of geometries) g.dispose()
      alu.dispose()
      black.dispose()
    },
  }
}
