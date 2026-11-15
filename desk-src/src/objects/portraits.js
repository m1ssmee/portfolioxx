// Three framed pictures on the wall, and what is in them is not paint: each frame is a window onto
// a small lit scene of its own (the figure of objects/headRig.js: a head and shoulders with eyes,
// lids and a jaw that work), drawn into the picture whenever something in it changes, then toned
// like an old photograph (drained of colour, hard, dark to its edges, grainy).
//   face   it looks at you, wherever you are; it blinks; now and then its mouth comes open, wide
//   void   where its head should be, a dark oval with two lights in it that blink and follow you
//   coal   lit from below; every so often its hand comes up, takes out its eye and feeds it to
//          its mouth; it chews; the eye grows back
// A picture is drawn again only when its state changes (update() says when; render() draws), and
// only while it is in view. The figure's mesh is made in a worker (headGeo.js): until it comes the
// pictures are black (setHead()).
// The frame: x across the wall (u), y up, z out of the wall (the view's own axes, layout.js).
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { HEAD } from './headGeo.js'
import { createFigure, headGeometry, handGeometry, skinMaterial } from './headRig.js'

// (where each hangs: its middle across the wall and above the desk, its picture's size, mm; and
// from which side it is best seen close to, radians: the two on the right from a little to their
// left, clear of the speaker in front of them)
export const PORTRAITS = [
  { kind: 'void', u: -645, y: 500, w: 150, h: 205, turn: 0 },
  { kind: 'face', u: 512, y: 532, w: 118, h: 160, turn: -0.26 },
  { kind: 'coal', u: 512, y: 322, w: 118, h: 160, turn: -0.26 },
]
const MOUNT = 9 // (the card round the picture)
const BAR = 8 // (the frame's face)
const DEEP = 15 // (how far it stands off the wall)
const PX = 4 // (the picture: pixels a millimetre)

const sat = (t) => (t < 0 ? 0 : t > 1 ? 1 : t)
const ease = (t) => {
  t = sat(t)
  return t * t * (3 - 2 * t)
}
const lerp = (a, b, t) => a + (b - a) * t
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
/** A blink: 0 open, 1 shut, for a blink that began `dt` seconds ago. */
const blinkAt = (dt) => (dt < 0 || dt > 0.34 ? 0 : dt < 0.1 ? ease(dt / 0.1) : dt < 0.16 ? 1 : 1 - ease((dt - 0.16) / 0.18))
/** When something blinks: a few seconds apart, sometimes twice running. */
function blinker(seed) {
  const r = rng(seed)
  const times = []
  let t = 1.4 + r() * 2
  for (let i = 0; i < 64; i++) {
    times.push(t)
    if (r() < 0.2) times.push(t + 0.46)
    t += 3 + r() * 5
  }
  const loop = t
  return (time) => {
    const tt = ((time % loop) + loop) % loop
    let k = 0
    for (const b of times) k = Math.max(k, blinkAt(tt - b))
    return k
  }
}
/** A light with no falloff, from `at` towards `to`; shadow: it casts one. */
function lamp(scene, color, power, at, to, shadow = false) {
  const l = new THREE.SpotLight(color, power, 0, 0.5, 0.6, 0)
  l.position.set(...at)
  l.target.position.set(...to)
  if (shadow) {
    l.castShadow = true
    l.shadow.mapSize.set(1024, 1024)
    l.shadow.camera.near = 200
    l.shadow.camera.far = 1600
    l.shadow.bias = -0.0006
    l.shadow.normalBias = 1.2
    l.shadow.radius = 3
    l.shadow.blurSamples = 8
  }
  scene.add(l, l.target)
  return l
}
const quant = (v, q) => Math.round(v / q)

// ---- face: it looks at you, it blinks, sometimes its mouth comes open
function artFace(geo, aspect) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020202)
  const fig = createFigure({ geo, stretch: 1.1, tone: 0xcbbdb0, iris: 0xaab3a8, pupil: 0.1 })
  scene.add(fig.group)
  lamp(scene, 0xfff3e2, 5.0, [-380, 300, 520], [0, -20, 40], true)
  lamp(scene, 0x90a8cc, 0.45, [330, -120, 320], [0, -40, 0])
  lamp(scene, 0xffffff, 2.4, [300, 260, -360], [0, 0, 0])
  lamp(scene, 0xffffff, 0.35, [30, 10, 600], [0, 0, 50])
  const camera = new THREE.PerspectiveCamera(20.5, aspect, 60, 3000)
  camera.position.set(0, -50, 900)
  camera.lookAt(0, -36, 0)
  const blink = blinker(31)
  const LOOP = 53
  return {
    scene,
    camera,
    state(t, view) {
      const s = (((t % LOOP) + LOOP) % LOOP) - 41 // (into the scream, when it comes)
      let jaw = 0
      let lid = blink(t)
      if (s > 0 && s < 6.6) {
        const q = Math.floor(s * 12) / 12
        jaw = q < 1.4 ? ease(q / 1.4) : q < 3.8 ? 1 : 1 - ease((q - 3.8) / 2.6)
        lid = 0
      }
      const yaw = Math.max(-0.5, Math.min(0.5, view.yaw * 0.8))
      const pitch = Math.max(-0.3, Math.min(0.3, view.pitch * 0.8 - 0.03))
      return { jaw, lid, yaw, pitch, key: `${quant(jaw, 0.02)}|${quant(lid, 0.05)}|${quant(yaw, 0.03)}|${quant(pitch, 0.03)}` }
    },
    apply(st) {
      fig.setJaw(st.jaw)
      fig.setLids(st.lid, st.jaw)
      fig.look(st.yaw, st.pitch)
    },
    dispose: () => fig.dispose(),
  }
}

// ---- void: a dark oval where its head should be, two lights in it
function artVoid(geo, aspect) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020202)
  const fig = createFigure({ geo, tone: 0xc9bcae })
  for (const o of [...fig.eyes, ...fig.lids]) o.visible = false
  scene.add(fig.group)
  // (an oval laid over the face from brow to chin: nothing of it is lit, nothing shows through)
  const dark = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40).scale(50, 76, 34), new THREE.MeshBasicMaterial({ color: 0x000000 }))
  dark.position.set(0, -34, 78)
  dark.rotation.x = -0.12
  scene.add(dark)
  // the lights: two discs, and their glow on the dark round them
  const glowC = document.createElement('canvas')
  glowC.width = glowC.height = 128
  const gg = glowC.getContext('2d')
  const gr = gg.createRadialGradient(64, 64, 2, 64, 64, 64)
  gr.addColorStop(0, 'rgba(255,255,255,0.85)')
  gr.addColorStop(0.2, 'rgba(255,255,255,0.3)')
  gr.addColorStop(0.5, 'rgba(255,255,255,0.07)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  gg.fillStyle = gr
  gg.fillRect(0, 0, 128, 128)
  const glowT = new THREE.CanvasTexture(glowC)
  const discMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.97, 0.9).multiplyScalar(6) })
  const glowMat = new THREE.MeshBasicMaterial({ map: glowT, color: new THREE.Color(1, 0.96, 0.88).multiplyScalar(1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  const discGeo = new THREE.CircleGeometry(6.5, 40)
  const glowGeo = new THREE.PlaneGeometry(110, 110)
  const lights = [-1, 1].map((s) => {
    const g = new THREE.Group()
    g.position.set(s * 25, -4 + (s > 0 ? 1.5 : 0), 113)
    const disc = new THREE.Mesh(discGeo, discMat)
    const glow = new THREE.Mesh(glowGeo, glowMat.clone())
    glow.position.z = 1
    g.add(glow, disc)
    scene.add(g)
    return { g, disc, glow, x: s * 27 }
  })
  lamp(scene, 0xfff3e2, 4.4, [-260, 560, 380], [0, -40, 0], true)
  lamp(scene, 0x90a8cc, 0.4, [320, -60, 360], [0, -120, 0])
  lamp(scene, 0xffffff, 2.0, [-280, 200, -340], [0, -40, 0])
  const camera = new THREE.PerspectiveCamera(21, aspect, 60, 3000)
  camera.position.set(0, -40, 1000)
  camera.lookAt(0, -40, 0)
  const blink = blinker(57)
  return {
    scene,
    camera,
    state(t, view) {
      const lid = blink(t)
      const yaw = Math.max(-0.5, Math.min(0.5, view.yaw))
      const pitch = Math.max(-0.3, Math.min(0.3, view.pitch))
      return { lid, yaw, pitch, key: `${quant(lid, 0.05)}|${quant(yaw, 0.04)}|${quant(pitch, 0.04)}` }
    },
    apply(st) {
      for (const l of lights) {
        const open = 1 - st.lid
        l.g.position.x = l.x + st.yaw * 18
        l.g.position.y = -4 + st.pitch * 16
        l.disc.scale.set(1, Math.max(0.05, open), 1)
        l.glow.material.opacity = 0.2 + 0.8 * open
      }
    },
    dispose() {
      fig.dispose()
      for (const x of [dark.geometry, dark.material, glowT, discMat, glowMat, discGeo, glowGeo]) x.dispose()
      for (const l of lights) l.glow.material.dispose()
    },
  }
}

// ---- coal: lit from below; its hand takes out its eye and feeds it to its mouth
function artCoal(geo, aspect) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020202)
  const fig = createFigure({ geo, tone: 0xbfb6ac, iris: 0x6b6a62, pupil: 0.2 })
  scene.add(fig.group)
  const handSkin = skinMaterial({ tone: 0xb0a69c, face: false })
  const handOpen = new THREE.Mesh(handGeometry(false), handSkin)
  const handPinch = new THREE.Mesh(handGeometry(true), handSkin)
  const hand = new THREE.Group()
  hand.add(handOpen, handPinch)
  for (const m of [handOpen, handPinch]) m.castShadow = m.receiveShadow = true
  // (its fingers up and in towards the face, its back to the viewer, its arm away down to the right)
  {
    const Y = new THREE.Vector3(-0.42, 0.78, -0.46).normalize()
    const Z = new THREE.Vector3(0.25, 0.1, 1)
    Z.addScaledVector(Y, -Z.dot(Y)).normalize()
    const X = new THREE.Vector3().crossVectors(Y, Z)
    hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z))
  }
  hand.visible = false
  scene.add(hand)
  lamp(scene, 0xffe9d0, 5.0, [-90, -520, 430], [0, -30, 30], true)
  lamp(scene, 0x8fa4c6, 0.9, [300, 260, -300], [0, 20, 0])
  lamp(scene, 0xffffff, 0.3, [0, 40, 600], [0, 0, 40])
  // (low from the front right: enough on the back of the hand to read it as one)
  lamp(scene, 0xffe2c8, 1.1, [320, -330, 520], [60, -60, 120])
  const camera = new THREE.PerspectiveCamera(21.5, aspect, 60, 3000)
  camera.position.set(0, -40, 900)
  camera.lookAt(0, -46, 0)
  const E = new THREE.Vector3(HEAD.eye[0], HEAD.eye[1], HEAD.eye[2])
  const P = {
    rest: new THREE.Vector3(230, -470, 300),
    eye: new THREE.Vector3(E.x, E.y, E.z + 13.5),
    out: new THREE.Vector3(74, -14, 168),
    mouth: new THREE.Vector3(3, -76, 96),
  }
  const blink = blinker(77)
  const LOOP = 14
  const v = new THREE.Vector3()
  return {
    scene,
    camera,
    loop: LOOP,
    state(t, view) {
      const a = (((t % LOOP) + LOOP) % LOOP) - 3.4 // (into the act)
      const st = { hand: null, pinch: false, held: false, eaten: false, grow: 1, jaw: 0, lid: blink(t), yaw: Math.max(-0.4, Math.min(0.4, view.yaw * 0.7)), pitch: Math.max(-0.25, Math.min(0.25, view.pitch * 0.7)) }
      if (a > 0 && a < 8.6) {
        const q = Math.floor(a * 12) / 12
        st.lid = 0
        if (q < 1.0) {
          const k = ease(q)
          st.hand = v.lerpVectors(P.rest, P.eye, k).clone()
          st.yaw = lerp(st.yaw, 0.35, k)
          st.pitch = lerp(st.pitch, -0.2, k)
        } else if (q < 1.6) {
          st.hand = P.eye.clone()
          st.pinch = q > 1.2
          st.yaw = 0.35
          st.pitch = -0.2
        } else if (q < 2.4) {
          st.hand = v.lerpVectors(P.eye, P.out, ease((q - 1.6) / 0.8)).clone()
          st.pinch = st.held = true
          st.yaw = 0.3
        } else if (q < 3.5) {
          const k = ease((q - 2.4) / 1.1)
          st.hand = v.lerpVectors(P.out, P.mouth, k).clone()
          st.hand.z += Math.sin(k * Math.PI) * 26
          st.pinch = st.held = true
          st.jaw = 0.92 * ease((q - 2.6) / 0.8)
          st.pitch = -0.25
        } else if (q < 4.0) {
          st.hand = P.mouth.clone()
          st.pinch = q < 3.7
          st.held = q < 3.7
          st.eaten = !st.held
          st.jaw = 0.92 * (1 - ease((q - 3.65) / 0.35))
        } else if (q < 6.2) {
          const k = ease((q - 4.0) / 1.3)
          if (k < 1) st.hand = v.lerpVectors(P.mouth, P.rest, k).clone()
          st.eaten = true
          st.jaw = q < 5.9 ? 0.08 + 0.2 * Math.abs(Math.sin((q - 4.0) * 7.5)) : 0
        } else {
          st.eaten = true
          st.grow = ease((q - 6.2) / 2.2)
        }
        st.key = `a${Math.round(q * 12)}|${quant(st.yaw, 0.04)}`
      } else st.key = `${quant(st.lid, 0.05)}|${quant(st.yaw, 0.03)}|${quant(st.pitch, 0.03)}`
      return st
    },
    apply(st) {
      fig.setJaw(st.jaw)
      fig.setLids(st.lid, st.jaw * 0.5)
      fig.look(st.yaw, st.pitch)
      hand.visible = !!st.hand
      if (st.hand) hand.position.copy(st.hand)
      handPinch.visible = st.pinch
      handOpen.visible = !st.pinch
      // the eye on the viewer's right: in its socket, in the fingers, gone, or coming back
      const eye = fig.eyes[0]
      const lid = fig.lids[0]
      if (st.held) {
        eye.visible = true
        eye.scale.setScalar(1)
        eye.position.copy(st.hand).add(v.set(0, -3, -5))
        lid.visible = false
      } else if (st.eaten) {
        eye.position.copy(E)
        eye.visible = st.grow > 0.02
        eye.scale.setScalar(0.12 + 0.88 * st.grow)
        lid.visible = st.grow >= 1
      } else {
        eye.position.copy(E)
        eye.scale.setScalar(1)
        eye.visible = lid.visible = true
      }
    },
    dispose() {
      fig.dispose()
      handSkin.dispose()
      handOpen.geometry.dispose()
      handPinch.geometry.dispose()
    },
  }
}
const ARTS = { face: artFace, void: artVoid, coal: artCoal }
// (each picture's print: how much colour is left, how hard, its tone, how dark its edges, how much grain)
const PRINT = {
  face: { sat: 0.2, gamma: 1.18, tint: [1.0, 0.97, 0.9], vig: 0.9, grain: 0.07 },
  void: { sat: 0.0, gamma: 1.15, tint: [0.98, 0.98, 1.0], vig: 0.7, grain: 0.06 },
  coal: { sat: 0.06, gamma: 1.25, tint: [0.97, 0.98, 1.0], vig: 1.0, grain: 0.1 },
}

/** The print: the little scene's light, rolled off, toned and grained (see PRINT). */
function printMaterial(tex, p, size) {
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82 })
  const u = { uPrint: { value: new THREE.Vector4(p.sat, p.gamma, p.vig, p.grain) }, uTint: { value: new THREE.Vector3(...p.tint) }, uGrainN: { value: new THREE.Vector2(size[0] / 1.6, size[1] / 1.6) } }
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u)
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec4 uPrint;\nuniform vec3 uTint;\nuniform vec2 uGrainN;')
      .replace(
        '#include <map_fragment>',
        `{
          vec3 a = texture2D(map, vMapUv).rgb;
          a = a / (1.0 + a);
          float l = dot(a, vec3(0.3, 0.59, 0.11));
          a = pow(mix(vec3(l), a, uPrint.x), vec3(uPrint.y)) * uTint;
          vec2 q = vMapUv - 0.5;
          a *= 1.0 - uPrint.z * dot(q, q) * 2.2;
          vec2 gcell = floor(vMapUv * uGrainN);
          float gr = fract(sin(dot(gcell, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
          a += gr * uPrint.w * (0.25 + l);
          diffuseColor.rgb = max(a, vec3(0.0));
        }`,
      )
  }
  m.customProgramCacheKey = () => 'portraits.print'
  return m
}

/**
 * fwd, right: the view's axes (layout.js); wallV: the wall's face (in v, mm). The pictures are black
 * until setHead() is given the figure's mesh (headGeo.js's headMesh, out of the worker).
 * Returns { group, items: [{ kind, meshes, center (world), normal (world), side (world: along the
 *   wall, to its right), size: [w, h] (mm, the whole frame), turn (radians: the side to see it
 *   from) }], materials, setHead(mesh, renderer) -> Promise, update(t, viewer) -> anything
 *   changed, render(renderer, frustum, all) -> drew or has more to draw, play(kind, t), dispose() }.
 */
export function createPortraits({ fwd, right, wallV, anisotropy = 4 }) {
  const group = new THREE.Group()
  group.name = 'portraits'
  const down = new THREE.Vector3(-fwd[0], 0, -fwd[2])
  group.matrix.makeBasis(new THREE.Vector3(right[0], 0, right[2]), new THREE.Vector3(0, 1, 0), down)
  group.matrixAutoUpdate = false
  group.updateMatrixWorld(true)
  const wood = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.45 })
  const card = new THREE.MeshStandardMaterial({ color: 0xe9e4d9, roughness: 0.95 })
  wood.customProgramCacheKey = () => 'portraits.wood'
  card.customProgramCacheKey = () => 'portraits.card'
  const geometries = []
  const materials = [wood, card]
  const items = []
  const live = []
  for (const P of PORTRAITS) {
    const W = P.w + 2 * (MOUNT + BAR)
    const H = P.h + 2 * (MOUNT + BAR)
    const frame = new THREE.Group()
    frame.position.set(P.u, P.y, wallV)
    const bars = mergeGeometries([
      new THREE.BoxGeometry(W, BAR, DEEP).translate(0, H / 2 - BAR / 2, DEEP / 2),
      new THREE.BoxGeometry(W, BAR, DEEP).translate(0, -H / 2 + BAR / 2, DEEP / 2),
      new THREE.BoxGeometry(BAR, H - 2 * BAR, DEEP).translate(-W / 2 + BAR / 2, 0, DEEP / 2),
      new THREE.BoxGeometry(BAR, H - 2 * BAR, DEEP).translate(W / 2 - BAR / 2, 0, DEEP / 2),
    ])
    const cardGeo = new THREE.PlaneGeometry(W - 2 * BAR + 1, H - 2 * BAR + 1).translate(0, 0, DEEP - 5)
    const artGeo = new THREE.PlaneGeometry(P.w, P.h).translate(0, 0, DEEP - 4.6)
    geometries.push(bars, cardGeo, artGeo)
    const size = [Math.round(P.w * PX), Math.round(P.h * PX)]
    const rt = new THREE.WebGLRenderTarget(size[0], size[1], { type: THREE.HalfFloatType, samples: 4 })
    rt.texture.anisotropy = anisotropy
    const paper = printMaterial(rt.texture, PRINT[P.kind], size)
    materials.push(paper)
    const meshes = [new THREE.Mesh(bars, wood), new THREE.Mesh(cardGeo, card), new THREE.Mesh(artGeo, paper)]
    meshes[0].castShadow = true
    meshes.forEach((m, i) => (m.name = `portraits.${P.kind}.${['frame', 'card', 'art'][i]}`))
    frame.add(...meshes)
    group.add(frame)
    live.push({ kind: P.kind, aspect: P.w / P.h, art: null, rt, key: null, offset: 0, dirty: false, sphere: new THREE.Sphere() })
    items.push({ kind: P.kind, meshes, frame, size: [W, H], turn: P.turn })
  }
  group.updateMatrixWorld(true)
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(group.matrixWorld)
  const rightW = new THREE.Vector3(1, 0, 0).transformDirection(group.matrixWorld)
  items.forEach((it, i) => {
    it.center = new THREE.Vector3(0, 0, DEEP).applyMatrix4(it.frame.matrixWorld)
    it.normal = normal
    it.side = rightW
    live[i].sphere.set(it.center, Math.hypot(it.size[0], it.size[1]) / 2)
  })
  const view = { yaw: 0, pitch: 0 }
  const d = new THREE.Vector3()
  const api = {
    group,
    items,
    materials,
    /** True once every picture has its figure and has been drawn. */
    get ready() {
      return live.every((p) => p.art && !p.dirty && p.key !== null)
    },
    /** The figure's mesh has come: each picture's scene made, its shaders compiled. */
    async setHead(mesh, renderer) {
      const geo = headGeometry(mesh)
      geometries.push(geo)
      for (const p of live) {
        p.art = ARTS[p.kind](geo, p.aspect)
        p.key = null
        if (renderer?.compileAsync) await renderer.compileAsync(p.art.scene, p.art.camera)
      }
    },
    /** t: seconds; viewer: where the eye is (world). True if any picture's state has changed. */
    update(t, viewer) {
      let any = false
      live.forEach((p, i) => {
        if (!p.art) return
        if (viewer) {
          d.subVectors(viewer, items[i].center)
          const dn = Math.max(1, d.dot(normal))
          view.yaw = Math.atan2(d.dot(rightW), dn)
          view.pitch = Math.atan2(d.y, Math.hypot(dn, d.dot(rightW)))
        }
        const st = p.art.state(t + p.offset, view)
        if (st.key === p.key) return
        p.key = st.key
        p.art.apply(st)
        p.dirty = true
        any = true
      })
      return any
    },
    /**
     * Draws the pictures whose state has changed since they were last drawn: one a call, and only
     * one in view (frustum; the others wait until they are). all: every one that has changed, now.
     * True if one was drawn or one in view is still waiting.
     */
    render(r, frustum = null, all = false) {
      let drawn = 0
      let left = false
      const target = r.getRenderTarget()
      const auto = r.autoClear
      const pend = r.shadowMap.needsUpdate // (the room's own shadows: not to be taken by these)
      r.autoClear = true
      for (const p of live) {
        if (!p.art || !p.dirty) continue
        if (!all && frustum && !frustum.intersectsSphere(p.sphere)) continue
        if (!all && drawn) {
          left = true
          continue
        }
        p.dirty = false
        drawn++
        r.shadowMap.needsUpdate = true
        r.setRenderTarget(p.rt)
        r.render(p.art.scene, p.art.camera)
      }
      r.setRenderTarget(target)
      r.autoClear = auto
      r.shadowMap.needsUpdate = pend
      return drawn > 0 || left
    },
    /** The picture of this kind begins its act (if it has one) a moment from now. */
    play(kind, t) {
      for (const p of live) if (p.kind === kind && p.art?.loop) p.offset = 2.7 - ((((t % p.art.loop) + p.art.loop) % p.art.loop))
    },
    dispose() {
      for (const p of live) {
        p.art?.dispose()
        p.rt.dispose()
      }
      for (const x of [...geometries, ...materials]) x.dispose()
    },
  }
  return api
}
