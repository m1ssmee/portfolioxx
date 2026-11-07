// A cigarette burning in an ashtray, smoke curling up through a beam of light: a procedural,
// interactive still life.   const s = createScene(container, options)  ...  s.destroy()
// 1 unit = 1 mm. Everything is generated here: the ashtray is meshed from a signed distance field
// and the textures are baked in a worker; the smoke is computed on the GPU.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createFrame, LAYER } from './core/frame.js'
import { withEmber, setEmberLight, setFlameLight, installEmberLight, FLAME_COLOR } from './core/emberlight.js'
import { createGrab } from './core/grab.js'
import { createAudio } from './core/audio.js'
import { createFocus } from './core/focus.js'
import { createPhysics } from './core/physics.js'
import * as LAYOUT from './layout.js'
import { createPlayerAsync } from './objects/player.js'
import { createEarbudsAsync } from './objects/earbuds.js'
import { createEarbudsLive } from './objects/earbudsLive.js'
import { createDeskGround } from './objects/deskGround.js'
import { createPickup } from './objects/pickup.js'
import { createLighter } from './objects/lighter.js'
import { TRAY, notchSeat, ashtraySDF } from './objects/ashtray.js'
import { CIG, cigaretteMaterials, bodyGeometry, emberGeometry, ashGeometry, strandGeometry, buttGeometry, flakeGeometry, matchStick } from './objects/cigarette.js'
import { createSmoke, SmokeHistory } from './objects/smoke.js'
import { noise3 } from './core/noise.js'

// highlights stay under the bloom threshold (only the ember blooms)
if (!THREE.ShaderChunk.lights_fragment_end.includes('(only the ember blooms)'))
  THREE.ShaderChunk.lights_fragment_end += `
// (only the ember blooms)
reflectedLight.directSpecular = min( reflectedLight.directSpecular, vec3( 2.2 ) );
#ifdef USE_CLEARCOAT
clearcoatSpecularDirect = min( clearcoatSpecularDirect, vec3( 2.2 ) );
#endif
`
installEmberLight()

// One quality: the reference look, on every device. (Internal effect buffers: the smoke at half
// resolution, upsampled by depth, and the bloom's mip chain from half resolution: side by side with
// full-resolution buffers they are indistinguishable; see the report.)
const Q = { strands: 10, segments: 160, haze: 1800, smokeSteps: 10, smokeScale: 0.5, bloomScale: 0.5, shadow: 2048, msaa: 4, trayH: 0.6, segs: 64, lighterH: 0.5 }
/** The canvas at full sharpness: CSS size x devicePixelRatio, capped at 2 only on 3x screens. */
const pixelRatio = () => {
  const d = window.devicePixelRatio || 1
  return d >= 3 ? 2 : d
}

const CSS = `
.cg-root{position:absolute;inset:0;overflow:hidden;color:#d9d4cc;font:500 12.5px/1.4 -apple-system,BlinkMacSystemFont,Inter,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.cg-poster{position:absolute;left:50%;top:0;height:100%;width:auto;min-width:100%;max-width:none;object-fit:cover;transform:translateX(-50%);pointer-events:none}
.cg-stage{position:absolute;inset:0;opacity:0;transition:opacity .8s ease}
.cg-ready .cg-stage{opacity:1}
.cg-reveal .cg-stage{transition:opacity 1.2s cubic-bezier(.3,0,.2,1)}
.cg-reveal .cg-ui{transition:opacity 1s ease .9s}
.cg-lost .cg-stage,.cg-fallback .cg-stage{opacity:0}
.cg-canvas{display:block;width:100%;height:100%;touch-action:none}
.cg-ui{transition:opacity .5s}
.cg-root:not(.cg-ready) .cg-ui,.cg-fallback .cg-ui{opacity:0;pointer-events:none}
.cg-hint{position:absolute;top:max(16px,env(safe-area-inset-top));left:max(16px,env(safe-area-inset-left));right:calc(max(16px,env(safe-area-inset-right)) + 150px);width:fit-content;box-sizing:border-box;margin:0 auto;padding:6px 13px;border-radius:14px;color:rgba(230,224,214,.62);background:rgba(28,26,24,.42);border:1px solid rgba(255,255,255,.07);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);text-align:center;pointer-events:none;letter-spacing:.02em;transition:opacity .8s}
.cg-coarse{display:none}
@media (hover:none) and (pointer:coarse){.cg-fine{display:none}.cg-coarse{display:inline}}
.cg-hint.gone{opacity:0}
.cg-tools{position:absolute;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));display:flex;gap:9px}
.cg-root button{font:inherit;cursor:pointer;color:inherit}
.cg-round{width:40px;height:40px;padding:0;border-radius:50%;display:grid;place-items:center;background:rgba(32,30,28,.45);border:1px solid rgba(255,255,255,.08);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);box-shadow:0 4px 18px rgba(0,0,0,.35);transition:transform .15s,background .2s}
.cg-round:hover{transform:scale(1.06);background:rgba(44,42,40,.55)}
.cg-round:active{transform:scale(.94)}
.cg-round:focus-visible{outline:2px solid #e8a868;outline-offset:2px}
.cg-round svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.cg-round[aria-pressed='false'] .on,.cg-round[aria-pressed='true'] .off{display:none}
.cg-round[hidden]{display:none}
.cg-swatches{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));display:flex;gap:8px;padding:7px 9px;border-radius:999px;background:rgba(32,30,28,.45);border:1px solid rgba(255,255,255,.08);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.cg-swatch{width:18px;height:18px;padding:0;border-radius:50%;background:var(--c);border:1px solid rgba(255,255,255,.25);box-shadow:inset 0 1px 2px rgba(255,255,255,.25);transition:transform .15s,box-shadow .15s}
.cg-swatch[aria-pressed='true']{box-shadow:0 0 0 2px rgba(20,18,16,.9),0 0 0 3.5px rgba(232,168,104,.85)}
.cg-swatch:hover{transform:scale(1.12)}
.cg-swatch:focus-visible{outline:2px solid #e8a868;outline-offset:3px}
.cg-flame{position:absolute;left:50%;bottom:max(22px,calc(env(safe-area-inset-bottom) + 10px));width:64px;height:64px;padding:0;border-radius:50%;display:grid;place-items:center;background:rgba(32,30,28,.5);border:1px solid rgba(255,255,255,.1);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);box-shadow:0 4px 18px rgba(0,0,0,.4);opacity:0;visibility:hidden;transform:translate(-50%,10px) scale(.92);transition:opacity .2s,transform .2s,visibility 0s .2s,background .12s,border-color .12s,box-shadow .12s;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
.cg-lighter .cg-flame{opacity:1;visibility:visible;transform:translate(-50%,0) scale(1);transition:opacity .2s,transform .2s,visibility 0s,background .12s,border-color .12s,box-shadow .12s}
.cg-flame svg{width:26px;height:26px;fill:rgba(240,200,150,.85);transition:fill .12s,transform .12s}
.cg-flame[aria-pressed='true']{background:rgba(255,128,40,.3);border-color:rgba(255,178,104,.75);box-shadow:0 0 0 3px rgba(255,150,70,.18),0 0 28px rgba(255,130,40,.5)}
.cg-flame[aria-pressed='true'] svg{fill:#ffd9a0;transform:scale(.9)}
.cg-flame:focus-visible{outline:2px solid #e8a868;outline-offset:3px}
@container cg (max-width: 720px){.cg-hint{margin:0;text-align:left}}
.cg-root{container:cg/inline-size}
`
const UI = `<div class="cg-ui">
  <p class="cg-hint">drag to look around · <span class="cg-fine">double-click</span><span class="cg-coarse">double-tap</span> anything to look closer · pick up the cigarette, the lighter or the earbuds · hold 🔥<span class="cg-fine"> or Space</span> to light</p>
  <button class="cg-flame" data-flame aria-label="Hold to light the lighter" aria-pressed="false" aria-hidden="true" tabindex="-1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 2.2c.9 3.6 5.6 6.2 5.6 11.6a5.8 5.8 0 0 1-11.6 0c0-3.2 1.8-4.9 3-6.7.3 2 1.2 3.3 2.4 3.8-.6-3.4.3-6.3.6-8.7z"/></svg></button>
  <div class="cg-swatches" role="group" aria-label="Earbuds colour">
    <button class="cg-swatch" data-colorway="graphite" aria-label="Graphite earbuds" aria-pressed="false" style="--c:#34363a"></button>
    <button class="cg-swatch" data-colorway="sage" aria-label="Sage earbuds" aria-pressed="false" style="--c:#8b9984"></button>
    <button class="cg-swatch" data-colorway="bone" aria-label="Bone earbuds" aria-pressed="true" style="--c:#e2dbcd"></button>
  </div>
  <div class="cg-tools">
    <button class="cg-round" data-act="sound" aria-label="Sound" aria-pressed="false" title="Sound">
      <svg class="off" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>
      <svg class="on" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>
    </button>
    <button class="cg-round" data-act="back" aria-label="Back to the whole desk" title="Back to the whole desk" hidden><svg viewBox="0 0 24 24"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg></button>
    <button class="cg-round" data-act="reset" aria-label="Reset view" title="Reset view"><svg viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/></svg></button>
  </div>
</div>`

export function createScene(container, options = {}) {
  const params = new URLSearchParams(location.search)
  const opts = {
    poster: options.poster ?? null,
    debug: options.debug ?? params.has('debug'),
    // (with a loader in front: the scene stays out of sight once ready, until enter())
    hold: !!options.hold,
    fontUrl: options.fontUrl ?? null,
  }
  // the loading stages, as they really happen (the loader's sentences follow them): 'start', a
  // fraction done (0..1) within a long one, 'done'
  const stage = (key, state) => {
    try {
      options.onStage?.(key, state)
    } catch {
      // (a loader's problem is not the scene's)
    }
  }
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  let destroyed = false
  const cleanups = []
  const listen = (t, type, fn, o) => {
    t.addEventListener(type, fn, o)
    cleanups.push(() => t.removeEventListener(type, fn, o))
  }
  const api = {}
  const handle = {
    destroy,
    ready: null,
  }
  let root
  let lastInput = performance.now() // (any input: back to the full frame rate)
  const initSteps = []
  // (between heavy steps of the set-up, the page gets the main thread back)
  const yieldNow = () => (globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise((r) => setTimeout(r, 0)))
  const active = () => (lastInput = performance.now())
  handle.ready = init().catch((e) => {
    if (!destroyed) console.error('desk:', e)
    handle.failed = true
    root?.classList.add('cg-fallback')
  })
  return handle

  async function init() {
    let stepAt = performance.now()
    const step = (name) => {
      const now = performance.now()
      initSteps.push({ step: name, ms: now - stepAt })
      stepAt = now
    }
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative'
    root = document.createElement('div')
    root.className = 'cg-root'
    const style = document.createElement('style')
    style.textContent = CSS
    root.appendChild(style)
    if (opts.poster) {
      const img = document.createElement('img')
      img.className = 'cg-poster'
      img.alt = ''
      img.src = opts.poster
      root.appendChild(img)
    }
    const stageEl = document.createElement('div')
    stageEl.className = 'cg-stage'
    root.appendChild(stageEl)
    root.insertAdjacentHTML('beforeend', UI)
    container.appendChild(root)


    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
    } catch {
      handle.failed = true
      root.classList.add('cg-fallback')
      return
    }
    renderer.setPixelRatio(pixelRatio())
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping // (deep blacks, a saturated ember)
    renderer.toneMappingExposure = 1.0
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.shadowMap.autoUpdate = false
    // (the earbud tips' translucency samples the scene behind them, blurred: as the standalone
    // earbuds had it, half resolution, indistinguishable from full)
    renderer.transmissionResolutionScale = 0.5
    const canvas = renderer.domElement
    canvas.className = 'cg-canvas'
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', 'A cigarette burning in a hand-thrown stoneware ashtray on a dark walnut table, its smoke curling up through a beam of light.')
    stageEl.appendChild(canvas)

    // ---- the worker: the ashtray's mesh and every texture, off this thread
    const worker = (() => {
      try {
        return new Worker(new URL('./core/worker.js', import.meta.url), { type: 'module' })
      } catch {
        return null
      }
    })()
    if (worker) cleanups.push(() => worker.terminate())
    let jid = 0
    const pending = new Map()
    if (worker)
      worker.onmessage = (e) => {
        pending.get(e.data.id)?.(e.data)
        pending.delete(e.data.id)
      }
    const job = (msg) =>
      worker
        ? new Promise((res) => {
            const id = ++jid
            pending.set(id, res)
            worker.postMessage({ ...msg, id })
          })
        : Promise.reject(new Error('no worker'))
    // (in the order the build below needs them: the worker takes them one after another)
    const bakeJob = job({ type: 'bake' })
    const budJob = job({ type: 'earbud', name: 'bud' })
    const remoteJob = job({ type: 'earbud', name: 'remote' })
    const earTexJob = job({ type: 'earbudsTex' })
    const collisionJob = job({ type: 'collision' })
    const trayJob = job({ type: 'tray', h: Q.trayH })
    const lighterJob = job({ type: 'lighter', h: Q.lighterH })
    const curlJob = job({ type: 'curl' })

    const scene = new THREE.Scene()
    // (no scene.background: a colour background makes three.js clear before every render, even
    // the frame cache's region pass drawn over the restored cache; the clears are explicit, black)
    scene.fog = new THREE.FogExp2(0x000000, 0.0011)
    const camera = new THREE.PerspectiveCamera(24, 1, 6, 5000)

    // ---- the studio: a dark room with one soft strip (the glaze's one highlight)
    function studioEnv() {
      const env = new THREE.Scene()
      env.background = new THREE.Color(0.006, 0.006, 0.007)
      const geo = new THREE.PlaneGeometry(1, 1)
      const strip = (w, h, pos, k, tint) => {
        const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(...tint).multiplyScalar(k), side: THREE.DoubleSide })
        const mesh = new THREE.Mesh(geo, m)
        mesh.scale.set(w, h, 1)
        mesh.position.set(...pos)
        mesh.lookAt(0, 0, 0)
        env.add(mesh)
        return m
      }
      const mats = [strip(500, 2600, [-1700, 1500, 900], 2.4, [1, 0.88, 0.76]), strip(1800, 260, [700, 1600, -1800], 0.7, [0.7, 0.8, 1])]
      const pm = new THREE.PMREMGenerator(renderer)
      const t = pm.fromScene(env, 0, 10, 6000).texture
      pm.dispose()
      geo.dispose()
      for (const m of mats) m.dispose()
      return t
    }
    stage('desk', 'start')
    step('renderer')
    await yieldNow()
    let envTex = studioEnv()
    step('environment (PMREM)')
    await yieldNow()
    scene.environment = envTex
    scene.environmentIntensity = 0.55

    // ---- the desk (mm; the ashtray at the origin). Places are given in the default view's own
    // axes: u to the right of the picture, v towards the camera; the view looks along FWD.
    // (layout.js: shared with the cable's settling tool)
    const FWD = new THREE.Vector3(...LAYOUT.FWD)
    const RIGHT = new THREE.Vector3(...LAYOUT.RIGHT)
    const DESK = {
      centre: new THREE.Vector3(...LAYOUT.DESK.centre), // (the whole-desk view's target)
      player: new THREE.Vector3(LAYOUT.PLAYER.x, 0, LAYOUT.PLAYER.z), // centre left
      lighter: new THREE.Vector3(...LAYOUT.DESK.lighter), // in the front pool of light
    }
    // ---- where things are: the cigarette rests in a notch, burning end over the bowl
    const seats = [0, 1, 2].map((k) => notchSeat(k))
    function cigarettePose(k, out) {
      const s = seats[k]
      // it pivots on the notch's inner edge, its burning end a few degrees down
      const inward = new THREE.Vector3(-s.dir[0], 0, -s.dir[2])
      const tilt = THREE.MathUtils.degToRad(4.5)
      const axis = inward.clone().multiplyScalar(Math.cos(tilt)).add(new THREE.Vector3(0, -Math.sin(tilt), 0)).normalize()
      const rEdge = TRAY.bowlTop + 2.3
      const contact = new THREE.Vector3(s.dir[0] * rEdge, s.y + CIG.radius + 0.05, s.dir[2] * rEdge)
      const xContact = 35 // (filter outside the rim, the paper resting in the notch)
      const origin = contact.clone().addScaledVector(axis, -xContact)
      // the local frame: x along the cigarette; turned a little about its axis (seam not on top)
      const up = new THREE.Vector3(0, 1, 0)
      const z = new THREE.Vector3().crossVectors(axis, up).normalize()
      const y = new THREE.Vector3().crossVectors(z, axis).normalize()
      out.makeBasis(axis, y, z).setPosition(origin)
      return out
    }

    // ---- textures (pixels from the worker)
    const baked = (await bakeJob).tex
    step('textures baked (worker)')
    if (destroyed) return
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    const disposables = []
    function dataTex(d, arr, srgb, repeat = true) {
      const t = new THREE.DataTexture(arr, d.size, d.size)
      if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.magFilter = THREE.LinearFilter
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.generateMipmaps = true
      t.anisotropy = aniso
      if (srgb) t.colorSpace = THREE.SRGBColorSpace
      t.needsUpdate = true
      disposables.push(t)
      return t
    }
    const tex = {
      walnut: dataTex(baked.walnut, baked.walnut.px, true),
      walnutN: dataTex(baked.walnut, baked.walnut.nrm, false),
      walnutR: dataTex(baked.walnut, baked.walnut.rough, false),
      speckle: dataTex(baked.speckle, baked.speckle.px, false),
      cork: dataTex(baked.cork, baked.cork.px, true),
      paper: dataTex(baked.paper, baked.paper.px, false),
      fibre: dataTex(baked.fibre, baked.fibre.px, false),
      bead: dataTex(baked.bead, baked.bead.px, false),
    }

    // ---- shared animated uniforms
    const U = {
      uTime: { value: 0 },
      uEmber: { value: 1 },
      uFlame: { value: 0 }, // (the lighter's flame, 0 out .. 1, with its flicker)
    }

    // ---- the table: oiled walnut, lit only round the ashtray, falling off into black
    const tableMat = new THREE.MeshPhysicalMaterial({ map: tex.walnut, normalMap: tex.walnutN, roughnessMap: tex.walnutR, roughness: 1, clearcoat: 0.22, clearcoatRoughness: 0.32, normalScale: new THREE.Vector2(0.6, 0.6) })
    for (const t of [tex.walnut, tex.walnutN, tex.walnutR]) t.repeat.set(6, 6) // (a 400 mm tile)
    tableMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;')
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
        .replace('#include <fog_fragment>', `gl_FragColor.rgb *= smoothstep(700.0, 240.0, length(vWp.xz - vec2(${DESK.centre.x.toFixed(1)}, ${DESK.centre.z.toFixed(1)})));\n#include <fog_fragment>`)
    }
    const table = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2), tableMat)
    table.receiveShadow = true
    scene.add(table)
    stage('desk', 'done')
    // ---- the earbuds (objects/earbuds.js): their meshes, textures and collision shapes from the worker
    stage('earbuds', 'start')
    const [budMesh, remoteMesh, earTex, collision] = await Promise.all([budJob, remoteJob, earTexJob, collisionJob])
    step('earbuds meshed (worker)')
    if (destroyed) return
    // (bone by default: on the dark desk the lightest of the three reads best; all three stay)
    const earbuds = await createEarbudsAsync({ renderer, meshes: { bud: budMesh.mesh, remote: remoteMesh.mesh }, textures: earTex.tex, colorway: 'bone' }, yieldNow)
    scene.add(earbuds.group)
    for (const m of earbuds.materials) if (m.isMeshStandardMaterial) withEmber(m)
    step('earbuds built')
    stage('earbuds', 'done')
    await yieldNow()

    // ---- the music player (objects/player.js): centre left, face up, its jack towards the viewer;
    // the earbuds plugged into it, their cable settled across the desk (earbudsLive.js, tools/settle.mjs)
    stage('player', 'start')
    const player = await createPlayerAsync(THREE, { anisotropy: aniso, fontUrl: opts.fontUrl }, yieldNow)
    step('player built')
    await yieldNow()
    player.group.position.copy(DESK.player)
    player.group.rotation.y = LAYOUT.PLAYER.yaw
    player.group.updateMatrixWorld(true)
    scene.add(player.group)
    player.group.traverse((o) => {
      if (!o.isMesh) return
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m.isMeshStandardMaterial) withEmber(m)
    })
    // (its screen changes while it plays: drawn every frame over the cache, like the ember)
    const playerScreen = player.meshes.find((m) => m.name === 'player.screen')
    playerScreen.layers.set(LAYER.REGION)
    // the player as the lighter and the cigarette see it: a box with rounded edges
    const playerInv = new THREE.Matrix4().copy(player.group.matrixWorld).invert()
    const playerRot = new THREE.Matrix4().extractRotation(player.group.matrixWorld)
    const PH = LAYOUT.PLAYER.half
    const pbox = (x, y, z) => {
      const qx = Math.abs(x) - PH[0] + LAYOUT.PLAYER.r
      const qy = Math.abs(y - PH[1]) - PH[1] + LAYOUT.PLAYER.r
      const qz = Math.abs(z) - PH[2] + LAYOUT.PLAYER.r
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - LAYOUT.PLAYER.r
    }
    const pp = new THREE.Vector3()
    const pn = new THREE.Vector3()
    function playerSdfGrad(x, y, z, g) {
      pp.set(x, y, z).applyMatrix4(playerInv)
      const d = pbox(pp.x, pp.y, pp.z)
      if (d > 30 || !g) return d
      const e = 0.2
      pn.set(pbox(pp.x + e, pp.y, pp.z) - d, pbox(pp.x, pp.y + e, pp.z) - d, pbox(pp.x, pp.y, pp.z + e) - d).applyMatrix4(playerRot).normalize()
      g[0] = pn.x
      g[1] = pn.y
      g[2] = pn.z
      return d
    }
    // (so: the ashtray and the player, for the lighter's and the cigarette's collisions)
    const gP2 = new Float64Array(3)
    function deskSdfGrad(x, y, z, g) {
      const d = traySdfGrad(x, y, z, g)
      const dp = playerSdfGrad(x, y, z, gP2)
      if (dp < d) {
        g[0] = gP2[0]
        g[1] = gP2[1]
        g[2] = gP2[2]
        return dp
      }
      return d
    }
    const deskSdf = (x, y, z) => Math.min(ashtraySDF(x, y, z), playerSdfGrad(x, y, z, null))

    // (its print and display in their font)
    await Promise.race([player.ready, new Promise((r) => setTimeout(r, 4000))])
    step('player')
    // what the cable lies on: the desk, the ashtray, the player and the lighter (wherever it is)
    const boxOf = (m, half, r, y0, reach) => ({ m: new Float64Array(12), half, r, y0, reach, set(mat) {
      const e = mat.elements
      this.m.set([e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10], e[12], e[13], e[14]])
    } })
    const playerBox = boxOf(null, LAYOUT.PLAYER.half, LAYOUT.PLAYER.r, LAYOUT.PLAYER.half[1], 75)
    playerBox.set(player.group.matrixWorld)
    const lighterBox = boxOf(null, [12, 31, 6], 3.5, 0, 40)
    // (the lighter's box joins once the lighter is on the desk)
    const deskBoxes = [playerBox]
    const ropeGround = createDeskGround({ ashtraySDF, boxes: () => deskBoxes })
    const jack = {
      mouth: new THREE.Vector3().copy(player.port.position).applyMatrix4(player.group.matrixWorld),
      out: new THREE.Vector3().copy(player.port.direction).transformDirection(player.group.matrixWorld),
    }
    const earbudsLive = createEarbudsLive({
      visual: earbuds,
      collision: collision.collision,
      ground: ropeGround,
      jack,
      onPlug: (on) => {
        audio.setPlugged(on)
        screenT = 0
      },
      onTap: (part) => {
        // (the remote's button: play and pause, as on any wired earbuds)
        if (part === 'remote') audio.setPlaying(!audio.playing)
        screenT = 0
      },
    })
    step('earbuds plugged in, settled')
    await yieldNow()
    stage('player', 'done')
    stage('ashtray', 'start')

    // ---- the ashtray: glazes by zone (glossy dark inside, speckled matte outside, raw foot)
    const trayMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, clearcoat: 1, clearcoatRoughness: 0.06, vertexColors: true })
    trayMat.onBeforeCompile = (sh) => {
      sh.uniforms.tSpeck = { value: tex.speckle }
      sh.uniforms.uFloor = { value: TRAY.floor }
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec2 aZone;\nvarying vec2 vZone;\nvarying vec3 vOP;\nvarying vec3 vON;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZone = aZone;\nvOP = position;\nvON = normal;')
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec2 vZone; varying vec3 vOP; varying vec3 vON;
          uniform sampler2D tSpeck; uniform float uFloor;
          float trayInterior; float trayRaw; float trayDust; float trayPool;
          vec4 triplanar(sampler2D t, vec3 p, vec3 n, float s) {
            vec3 w = pow(abs(n), vec3(4.0)); w /= dot(w, vec3(1.0));
            return texture2D(t, p.yz * s) * w.x + texture2D(t, p.zx * s) * w.y + texture2D(t, p.xy * s) * w.z;
          }`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          vec4 sp = triplanar(tSpeck, vOP, normalize(vON), 0.022);
          vec4 sp2 = triplanar(tSpeck, vOP, normalize(vON), 0.09);
          trayInterior = vZone.x;
          trayRaw = vZone.y;
          float r = length(vOP.xz);
          // the inner glaze pools deeper and glassier towards the floor; it thins and breaks amber over the rim
          trayPool = smoothstep(uFloor + 9.0, uFloor + 0.5, vOP.y);
          float thin = smoothstep(26.0, 31.5, vOP.y) * (1.0 - trayPool);
          vec3 inner = mix(vec3(0.075, 0.052, 0.04), vec3(0.028, 0.022, 0.02), trayPool);
          inner = mix(inner, vec3(0.32, 0.19, 0.09), thin * (0.45 + 0.4 * sp.g));
          // outside: warm grey, mottled, iron speckles
          vec3 outer = vec3(0.47, 0.44, 0.405) * (0.88 + 0.22 * sp.g);
          outer = mix(outer, vec3(0.2, 0.12, 0.07), clamp(sp2.r * 1.1, 0.0, 1.0));
          vec3 raw = vec3(0.6, 0.5, 0.39) * (0.85 + 0.25 * sp2.b);
          vec3 c = mix(outer, inner, trayInterior);
          c = mix(c, raw, trayRaw);
          // fine ash dust settled on the floor of the bowl: thickest a little off centre, specks
          // and soot smudges, thinning out towards the walls
          float dens = smoothstep(27.0, 5.0, length(vOP.xz - vec2(4.0, -3.0))) * (0.4 + 0.6 * smoothstep(0.3, 0.72, sp.g));
          float specks = smoothstep(0.6, 0.8, sp2.b);
          trayDust = trayInterior * smoothstep(uFloor + 2.4, uFloor + 0.4, vOP.y) * clamp(dens * 0.5 + specks * dens * 0.55, 0.0, 0.8);
          vec3 dustCol = mix(vec3(0.34, 0.33, 0.32), vec3(0.11, 0.1, 0.095), smoothstep(0.55, 0.8, sp2.g));
          c = mix(c, dustCol, trayDust);
          diffuseColor.rgb = c * vColor.rgb;`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
          roughnessFactor = mix(0.62 + 0.06 * sp2.b, mix(0.2, 0.07, trayPool), trayInterior);
          roughnessFactor = mix(roughnessFactor, 0.94, max(trayRaw, trayDust));`,
        )
        .replace(
          '#include <lights_physical_fragment>',
          `#include <lights_physical_fragment>
          material.clearcoat = trayInterior * (1.0 - trayDust) * (1.0 - trayRaw);`,
        )
        .replace(/TRAY_BOTTOM/g, TRAY.bowlBottom.toFixed(1))
    }
    trayMat.customProgramCacheKey = () => 'tray'

    // ---- lights: warm key (the only shadow), cool rim behind the cigarette, a faint fill,
    // and the ember itself
    const key = new THREE.SpotLight(0xffd6ae, 2.8, 0, 0.42, 0.95, 0)
    key.castShadow = true
    key.shadow.mapSize.set(Q.shadow, Q.shadow)
    key.shadow.camera.near = 250
    key.shadow.camera.far = 1600
    key.shadow.bias = -0.0004
    key.shadow.normalBias = 0.6
    key.shadow.radius = 5
    scene.add(key, key.target)
    // (narrow and aimed above the ember: it grazes the cigarette and lights the smoke, not the bowl)
    const rim = new THREE.SpotLight(0xa9c2ff, 1.4, 0, 0.22, 0.6, 0)
    scene.add(rim, rim.target)
    const fill = new THREE.HemisphereLight(0x223042, 0x0c0806, 0.09)
    scene.add(fill)
    // (three.js lights only what the camera's layers include: these light every layer, the frame
    // cache's region layer too)
    for (const l of [key, rim, fill]) l.layers.enableAll()
    // (the ember's own light is a term in the lit materials: core/emberlight.js; so is the lighter's
    // flame, except below it, where a spotlight pointing down carries it with a shadow: dark, never
    // drawn, until the flame is lit)
    // (each light's shadow is drawn only when asked for: the flame's only while it burns)
    key.shadow.autoUpdate = false
    const flameSpot = new THREE.SpotLight(FLAME_COLOR, 0, 420, 1.3, 0.6, 2)
    flameSpot.castShadow = true
    flameSpot.shadow.mapSize.set(1024, 1024)
    flameSpot.shadow.camera.near = 3
    flameSpot.shadow.camera.far = 420
    flameSpot.shadow.bias = -0.0006
    flameSpot.shadow.normalBias = 0.5
    flameSpot.shadow.radius = 4
    flameSpot.shadow.autoUpdate = false
    flameSpot.layers.enableAll()
    flameSpot.position.set(0, 200, 0)
    scene.add(flameSpot, flameSpot.target)

    // ---- the parts
    await yieldNow()
    const tray = await trayJob
    step('materials; ashtray meshed (worker)')
    if (destroyed) return
    const tm = tray.mesh
    const trayGeo = new THREE.BufferGeometry()
    trayGeo.setAttribute('position', new THREE.BufferAttribute(tm.positions, 3))
    trayGeo.setAttribute('normal', new THREE.BufferAttribute(tm.normals, 3))
    const ao = new Float32Array((tm.ao.length) * 3)
    for (let i = 0; i < tm.ao.length; i++) ao[i * 3] = ao[i * 3 + 1] = ao[i * 3 + 2] = 0.45 + 0.55 * tm.ao[i]
    trayGeo.setAttribute('color', new THREE.BufferAttribute(ao, 3))
    trayGeo.setAttribute('aZone', new THREE.BufferAttribute(tm.zone, 2))
    trayGeo.setIndex(new THREE.BufferAttribute(tm.indices, 1))
    const trayMesh = new THREE.Mesh(trayGeo, trayMat)
    trayMesh.castShadow = trayMesh.receiveShadow = true
    scene.add(trayMesh)

    // two cigarettes: the one burning, and the next (waiting, invisible) for the next notch
    await yieldNow()
    const bodyGeo = bodyGeometry(Q.segs)
    const emberGeo = emberGeometry(Q.segs)
    const ashGeo = ashGeometry(Q.segs)
    const strandGeos = strandGeometry()
    await yieldNow()
    const cigs = [0, 1].map((n) => {
      const m = cigaretteMaterials(tex, U)
      m.u.uSeed.value = 0.3 + n * 0.37
      const g = new THREE.Group()
      g.matrixAutoUpdate = false
      const body = new THREE.Mesh(bodyGeo, m.body)
      body.castShadow = body.receiveShadow = true
      body.customDepthMaterial = m.bodyDepth
      body.layers.enable(LAYER.REGION)
      const burn = new THREE.Group() // moves with the burn line
      const ember = new THREE.Mesh(emberGeo, m.ember)
      const ash = new THREE.Mesh(ashGeo, m.ash)
      ash.position.x = 0.7
      ash.castShadow = ash.receiveShadow = true
      const strands = new THREE.Mesh(strandGeos, m.tobacco)
      burn.add(ember, ash, strands)
      for (const o of [ember, ash, strands]) o.layers.set(LAYER.REGION)
      g.add(body, burn)
      scene.add(g)
      // (state: unlit | lighting | burning | out, and arriving | leaving | waiting as they swap;
      // lightProg: how far lit (the specks round its foot); scorch, filterScorch: where a flame
      // has been; coal: the ember's dome forming once lit)
      return { group: g, body, burn, ember, ash, mats: m, notch: n, b: 64.5, ashLen: 13, fallAt: 15, lit: 1, fade: n === 0 ? 1 : 0, state: n === 0 ? 'burning' : 'waiting', after: 'unlit', lightProg: 1, scorch: 0, filterScorch: 0, coal: 1 }
    })
    const poseM = new THREE.Matrix4()
    function placeCig(c, notch) {
      c.notch = notch
      cigarettePose(notch, poseM)
      c.group.matrix.copy(poseM)
      c.group.matrixWorldNeedsUpdate = true
    }
    placeCig(cigs[0], 0)
    placeCig(cigs[1], 1)
    cigs[1].group.visible = false
    let cur = 0

    function applyCig(c) {
      c.mats.u.uBurn.value = c.b
      c.mats.u.uLit.value = c.lit
      c.mats.u.uFade.value = c.fade
      c.mats.u.uLightProg.value = c.lightProg
      c.mats.u.uScorch.value = c.scorch
      c.mats.u.uFilterScorch.value = c.filterScorch
      // (unlit, its paper whole: the ember, while it is being lit, a thin disc on its foot)
      c.burn.position.x = c.b > CIG.length ? CIG.length + 0.1 : c.b
      c.ember.scale.x = 0.25 + 0.75 * c.coal
      c.ash.scale.x = Math.max(0.001, c.ashLen / CIG.ashMax)
      c.mats.u.uAshScale.value = c.ash.scale.x
      c.ash.visible = c.ashLen > 0.05
      const fading = c.fade < 0.999
      for (const m of [c.mats.body, c.mats.ash]) m.transparent = fading
      c.ember.visible = c.fade > 0.01 && (c.lit > 0.01 || c.lightProg > 0)
    }

    // the old butt, stubbed out in the bowl, and a burnt match
    step('cigarettes')
    await yieldNow()
    const buttMats = cigaretteMaterials(tex, { uTime: U.uTime, uEmber: { value: 0 } })
    buttMats.u.uBurn.value = 29.6
    buttMats.u.uLit.value = 0
    const butt = buttGeometry(Q.segs)
    const buttMesh = new THREE.Mesh(butt.geometry, buttMats.body)
    buttMesh.customDepthMaterial = buttMats.bodyDepth
    buttMesh.castShadow = buttMesh.receiveShadow = true
    const crumb = new THREE.Mesh(new THREE.IcosahedronGeometry(3.1, 3), new THREE.MeshPhysicalMaterial({ color: 0x2a2724, roughness: 0.96 }))
    {
      const p = crumb.geometry.attributes.position
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i)
        const y = p.getY(i)
        const z = p.getZ(i)
        const k = 1 + 0.22 * noise3(x * 0.9, y * 0.9 + 2, z * 0.9)
        p.setXYZ(i, x * k * 0.75, y * k * 0.55, z * k)
      }
      crumb.geometry.computeVertexNormals()
      crumb.position.copy(butt.end).addScaledVector(butt.endDir, -0.4)
    }
    const buttGroup = new THREE.Group()
    buttGroup.add(buttMesh, crumb)
    buttGroup.position.set(-6, TRAY.floor + CIG.radius - 0.15, 16)
    buttGroup.rotation.set(0, 2.55, -0.05)
    scene.add(buttGroup)
    const woodMat = new THREE.MeshPhysicalMaterial({ color: 0xc8a57a, roughness: 0.78 })
    woodMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vX;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvX = position.x;')
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vX;')
        .replace('#include <color_fragment>', '#include <color_fragment>\nfloat ch = smoothstep(20.0, 39.0, vX);\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.008, 0.006, 0.005), ch);\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.107, 0.033, 0.01), smoothstep(14.0, 20.0, vX) * (1.0 - ch) * 0.7);')
    }
    const stick = new THREE.Mesh(matchStick(), woodMat)
    const headGeo = new THREE.IcosahedronGeometry(1.6, 3)
    {
      const p = headGeo.attributes.position
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i)
        const y = p.getY(i)
        const z = p.getZ(i)
        const k = 1 + 0.2 * noise3(x * 1.4 + 3, y * 1.4, z * 1.4)
        p.setXYZ(i, x * 1.35 * k + 42.4, y * k, z * k)
      }
      headGeo.computeVertexNormals()
    }
    const head = new THREE.Mesh(headGeo, new THREE.MeshPhysicalMaterial({ color: 0x1c1a19, roughness: 0.9, sheen: 0.4, sheenColor: new THREE.Color(0.35, 0.34, 0.33) }))
    const match = new THREE.Group()
    match.add(stick, head)
    for (const m of [stick, head]) m.castShadow = m.receiveShadow = true
    match.position.set(-21, TRAY.floor + 1.08, -2)
    match.rotation.set(0, 0.42, 0.035)
    scene.add(match)

    step('butt, match')
    await yieldNow()
    // ash flakes: a pool, simulated while they fall, asleep once they settle
    const FL = 48
    const flakeMat = new THREE.MeshPhysicalMaterial({ color: 0x6e6b67, roughness: 0.97 })
    const flakes = new THREE.InstancedMesh(flakeGeometry(), flakeMat, FL)
    flakes.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    flakes.frustumCulled = false
    scene.add(flakes)
    // every lit material takes the ember's light (a term in its shader: core/emberlight.js)
    for (const m of [tableMat, trayMat, buttMats.body, crumb.material, woodMat, head.material, flakeMat, ...cigs.flatMap((q) => [q.mats.body, q.mats.ash, q.mats.tobacco])]) withEmber(m)
    const fl = {
      p: new Float32Array(FL * 3),
      v: new Float32Array(FL * 3),
      q: Array.from({ length: FL }, () => new THREE.Quaternion()),
      w: new Float32Array(FL * 3),
      s: new Float32Array(FL),
      awake: new Uint8Array(FL),
      used: new Uint8Array(FL),
      next: 0,
    }
    const fm = new THREE.Matrix4()
    const fsv = new THREE.Vector3()
    const fqv = new THREE.Quaternion()
    const fpv = new THREE.Vector3()
    const feul = new THREE.Euler()
    function setFlake(i) {
      fpv.set(fl.p[i * 3], fl.p[i * 3 + 1], fl.p[i * 3 + 2])
      fsv.setScalar(fl.used[i] ? fl.s[i] : 0)
      fm.compose(fpv, fl.q[i], fsv)
      flakes.setMatrixAt(i, fm)
    }
    // a few old flakes already in the bowl
    {
      let r = 3
      const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647)
      for (let i = 0; i < 9; i++) {
        const a = rnd() * Math.PI * 2
        const d = 6 + rnd() * 20
        fl.p.set([Math.cos(a) * d, TRAY.floor + 0.25, Math.sin(a) * d], i * 3)
        fl.q[i].setFromEuler(new THREE.Euler(rnd() * 0.2, rnd() * 6.28, rnd() * 0.2))
        fl.s[i] = 0.8 + rnd() * 1.2
        fl.used[i] = 1
      }
      fl.next = 9
      for (let i = 0; i < FL; i++) setFlake(i)
    }
    const eps = 0.25
    function traySdfGrad(x, y, z, out) {
      const d = ashtraySDF(x, y, z)
      out[0] = ashtraySDF(x + eps, y, z) - d
      out[1] = ashtraySDF(x, y + eps, z) - d
      out[2] = ashtraySDF(x, y, z + eps) - d
      const l = Math.hypot(out[0], out[1], out[2]) || 1
      out[0] /= l
      out[1] /= l
      out[2] /= l
      return d
    }
    const gradT = new Float64Array(3)
    let flakesAwake = 0
    function stepFlakes(dt) {
      if (!flakesAwake) return false
      flakesAwake = 0
      for (let i = 0; i < FL; i++) {
        if (!fl.awake[i]) continue
        const o = i * 3
        // gravity, and air: ash is light, it drifts down
        fl.v[o + 1] -= 9810 * 0.32 * dt
        const drag = Math.exp(-dt * 4)
        fl.v[o] *= drag
        fl.v[o + 1] *= drag
        fl.v[o + 2] *= drag
        fl.p[o] += fl.v[o] * dt
        fl.p[o + 1] += fl.v[o + 1] * dt
        fl.p[o + 2] += fl.v[o + 2] * dt
        // the ashtray and the table
        const d = traySdfGrad(fl.p[o], fl.p[o + 1], fl.p[o + 2], gradT)
        let hit = false
        if (d < 0.25) {
          const push = 0.25 - d
          fl.p[o] += gradT[0] * push
          fl.p[o + 1] += gradT[1] * push
          fl.p[o + 2] += gradT[2] * push
          const vn = fl.v[o] * gradT[0] + fl.v[o + 1] * gradT[1] + fl.v[o + 2] * gradT[2]
          if (vn < 0) {
            fl.v[o] -= 1.15 * vn * gradT[0]
            fl.v[o + 1] -= 1.15 * vn * gradT[1]
            fl.v[o + 2] -= 1.15 * vn * gradT[2]
          }
          hit = true
        }
        if (fl.p[o + 1] < 0.15) {
          fl.p[o + 1] = 0.15
          if (fl.v[o + 1] < 0) fl.v[o + 1] *= -0.1
          hit = true
        }
        if (hit) {
          // rough ash: it stops quickly, lying flat
          fl.v[o] *= 0.6
          fl.v[o + 2] *= 0.6
          fl.w[o] *= 0.5
          fl.w[o + 1] *= 0.5
          fl.w[o + 2] *= 0.5
          fqv.setFromUnitVectors(fsv.set(0, 1, 0).applyQuaternion(fl.q[i]), fpv.set(gradT[0], gradT[1], gradT[2]))
          fl.q[i].premultiply(fqv.slerp(fqv.identity(), 0.85))
        }
        fqv.setFromEuler(feul.set(fl.w[o] * dt, fl.w[o + 1] * dt, fl.w[o + 2] * dt))
        fl.q[i].premultiply(fqv)
        const speed = Math.abs(fl.v[o]) + Math.abs(fl.v[o + 1]) + Math.abs(fl.v[o + 2])
        if (hit && speed < 6) fl.awake[i] = 0
        else flakesAwake++
        setFlake(i)
      }
      flakes.instanceMatrix.needsUpdate = true
      return true
    }
    const tmpV = new THREE.Vector3()
    /** The ash column breaks off: flakes from where it was, falling. */
    function breakAsh(c, push) {
      const n = Math.max(3, Math.round(c.ashLen * 0.7))
      for (let k = 0; k < n; k++) {
        const i = fl.next
        fl.next = (fl.next + 1) % FL
        const x = c.b + 0.5 + (k / n) * c.ashLen
        tmpV.set(x, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3).applyMatrix4(c.group.matrix)
        fl.p.set([tmpV.x, tmpV.y, tmpV.z], i * 3)
        fl.v.set([(Math.random() - 0.5) * 60 + push[0], -40 - Math.random() * 60 + push[1], (Math.random() - 0.5) * 60 + push[2]], i * 3)
        fl.w.set([(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12], i * 3)
        fl.q[i].setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3))
        fl.s[i] = 0.9 + Math.random() * 1.3
        fl.used[i] = 1
        fl.awake[i] = 1
        flakesAwake++
      }
      c.ashLen = 0
      c.fallAt = 12 + Math.random() * 5
    }

    // ---- the lighter (objects/lighter.js): meshed in the worker, lying in the pool of light
    step('flakes')
    stage('ashtray', 'done')
    stage('lighter', 'start')
    const lmesh = (await lighterJob).mesh
    step('lighter meshed (worker)')
    if (destroyed) return
    // the cigarette as the lighter sees it (a capsule, the current one), and its ends
    const capA = new THREE.Vector3()
    const capB = new THREE.Vector3()
    let capOn = false
    const capT = new THREE.Vector3()
    function cigCapsule(p, n) {
      if (!capOn) {
        n.set(0, 1, 0)
        return 1e9
      }
      capT.subVectors(capB, capA)
      const t = THREE.MathUtils.clamp(n.subVectors(p, capA).dot(capT) / capT.lengthSq(), 0, 1)
      n.subVectors(p, capA).addScaledVector(capT, -t)
      const d = n.length()
      n.divideScalar(d || 1)
      return d - CIG.radius
    }
    const lightTarget = { on: false, foot: new THREE.Vector3(), filter: new THREE.Vector3(), filterOn: false, axis: new THREE.Vector3(1, 0, 0) }
    // (where it lies: beside the ashtray, in view; on a tall screen behind it, seen over its rim)
    const rest = { x: DESK.lighter.x, z: DESK.lighter.z, theta: Math.atan2(FWD.z, FWD.x) + 0.55 }
    const lighter = createLighter({ mesh: lmesh, tex, U, sdf: (x, y, z) => deskSdf(x, y, z), sdfGrad: (x, y, z, g) => deskSdfGrad(x, y, z, g), groundGrad: lighterGround, cigCapsule, target: lightTarget, onIgnite: () => audio.click(), rest })
    lighter.group.traverse((o) => o.isMesh && o.layers.enable(LAYER.REGION))
    scene.add(lighter.group)
    for (const m of lighter.group.children) if (m.material?.isMeshPhysicalMaterial) withEmber(m.material)
    // (when the lighter falls it lands on the cigarette too: its capsule as part of the ground)
    const gC = new THREE.Vector3()
    const gP = new THREE.Vector3()
    function lighterGround(x, y, z, g) {
      const d = deskSdfGrad(x, y, z, g)
      const dc = cigCapsule(gP.set(x, y, z), gC)
      if (dc < d) {
        g[0] = gC.x
        g[1] = gC.y
        g[2] = gC.z
        return dc
      }
      return d
    }
    // the lighter as the cigarette sees it (held, falling): a rounded box in the lighter's frame
    const lInv = new THREE.Matrix4()
    const lRot = new THREE.Matrix4()
    const lp = new THREE.Vector3()
    const ln = new THREE.Vector3()
    const lbox = (x, y, z) => {
      const qx = Math.abs(x) - 12 + 3.5
      const qy = Math.abs(y) - 31 + 3.5
      const qz = Math.abs(z) - 6 + 3.5
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - 3.5
    }
    function lighterSdfGrad(x, y, z, g) {
      lp.set(x, y, z).applyMatrix4(lInv)
      const d = lbox(lp.x, lp.y, lp.z)
      if (d > 30) return d
      const e = 0.2
      ln.set(lbox(lp.x + e, lp.y, lp.z) - d, lbox(lp.x, lp.y + e, lp.z) - d, lbox(lp.x, lp.y, lp.z + e) - d).applyMatrix4(lRot).normalize()
      g[0] = ln.x
      g[1] = ln.y
      g[2] = ln.z
      return d
    }
    const gL = new Float64Array(3)
    /** The ashtray and the lighter, for the cigarette (held or falling). */
    function cigObstacles(x, y, z, g) {
      const d = deskSdfGrad(x, y, z, g)
      const dl = lighterSdfGrad(x, y, z, gL)
      if (dl < d) {
        g[0] = gL[0]
        g[1] = gL[1]
        g[2] = gL[2]
        return dl
      }
      return d
    }
    function lighterFrame() {
      lInv.copy(lighter.group.matrix).invert()
      lRot.extractRotation(lighter.group.matrix)
    }
    lighterFrame()
    // (the lighter as the cable lies on it)
    lighterBox.set(lighter.group.matrix)
    deskBoxes.push(lighterBox)
    stage('lighter', 'done')

    // ---- smoke (the smoke, the burn and the ember, and all that moves them: the cigarette lit)
    stage('light', 'start')
    const curl = (await curlJob).curl
    step('curl volume (worker)')
    if (destroyed) return
    const curlTex = new THREE.Data3DTexture(curl.data, curl.size, curl.size, curl.size)
    curlTex.format = THREE.RGBAFormat
    curlTex.type = THREE.HalfFloatType
    curlTex.wrapS = curlTex.wrapT = curlTex.wrapR = THREE.RepeatWrapping
    curlTex.minFilter = curlTex.magFilter = THREE.LinearFilter
    curlTex.unpackAlignment = 1
    curlTex.needsUpdate = true
    disposables.push(curlTex)
    const history = new SmokeHistory()
    const emberWorld = new THREE.Vector3()
    const SU = {
      uTime: U.uTime,
      uHist: { value: history.tex },
      uHistHead: { value: 0 },
      uViewDir: { value: new THREE.Vector3() },
      uCalm: { value: reduceMotion ? 0.35 : 1 },
      uLife: { value: 11 },
      uHazeLife: { value: 12 },
      uPx: { value: 500 },
      uRimPos: { value: new THREE.Vector3() },
      uRimDir: { value: new THREE.Vector3() },
      uRimCone: { value: new THREE.Vector2() },
      uKeyPos: { value: new THREE.Vector3() },
      uCam: { value: new THREE.Vector3() },
      uBright: { value: 1 },
      uEmberPos: { value: new THREE.Vector3() },
      uEmberI: { value: 1 },
      uDepthZ: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uCurl: { value: curlTex },
    }
    const smoke = createSmoke(Q, SU)
    step('smoke')
    await yieldNow()
    const smokeScene = new THREE.Scene()
    smokeScene.add(smoke.ribbons, smoke.haze)

    function emberPos(c, out) {
      return out.set(c.b > CIG.length ? CIG.length + 0.3 : c.b + 0.9, 0, 0).applyMatrix4(c.group.matrix)
    }
    emberPos(cigs[0], emberWorld)
    history.fill([emberWorld.x, emberWorld.y, emberWorld.z], 1)

    // camera and lights: the whole desk, three-quarters from the front left, a little above
    const HOME = { target: new THREE.Vector3(), pos: new THREE.Vector3() }
    /** The home view for the screen's shape: on a tall screen from a little higher, so the desk's
     * depth fills more of the picture (its width is kept by the field of view: resize()). */
    function fitHome() {
      const t = THREE.MathUtils.clamp((1.25 - camera.aspect) / 0.75, 0, 1)
      const el = THREE.MathUtils.degToRad(29 + 16 * t)
      HOME.pos.copy(FWD).multiplyScalar(-Math.cos(el) * 720).add(HOME.target)
      HOME.pos.y += Math.sin(el) * 720
    }
    {
      const e = emberWorld
      HOME.target.copy(DESK.centre).setY(16)
      fitHome()
      // key: upper left of the view, over the whole desk; rim: behind the cigarette, into the smoke
      const left = new THREE.Vector3().copy(RIGHT).negate()
      key.position.copy(DESK.centre).addScaledVector(left, 430).addScaledVector(FWD, -260).add(new THREE.Vector3(0, 620, 0))
      key.target.position.copy(DESK.centre).setY(10)
      key.angle = 0.6
      rim.position.copy(e).addScaledVector(FWD, 300).addScaledVector(left, -60).add(new THREE.Vector3(0, 62, 0))
      rim.target.position.copy(e).add(new THREE.Vector3(0, 50, 0))
      key.target.updateMatrixWorld()
      rim.target.updateMatrixWorld()
    }
    SU.uRimPos.value.copy(rim.position)
    SU.uRimDir.value.subVectors(rim.target.position, rim.position).normalize()
    SU.uRimCone.value.set(Math.cos(rim.angle), Math.cos(rim.angle * (1 - rim.penumbra)))
    SU.uKeyPos.value.copy(key.position)

    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.minDistance = 60
    controls.maxDistance = 1000
    controls.minPolarAngle = THREE.MathUtils.degToRad(8) // (high enough to look down into the bowl)
    controls.maxPolarAngle = THREE.MathUtils.degToRad(86) // (never under the table)
    controls.enablePan = false
    controls.rotateSpeed = 0.6
    camera.position.copy(HOME.pos)
    controls.target.copy(HOME.target)
    controls.update()

    // ---- focus (core/focus.js): a double-click or double-tap on an object closes in on it; Escape
    // or the back button returns to the whole desk
    const HERO_AZ = Math.atan2(-0.834, 0.549) // (the still life's own view of the ashtray)
    const focusTargets = {
      ashtray: { center: (o) => o.set(4, 28, 2), radius: 56, el: THREE.MathUtils.degToRad(20), az: HERO_AZ },
      lighter: { center: (o) => o.setFromMatrixPosition(lighter.group.matrix), radius: 42, el: THREE.MathUtils.degToRad(24) },
      // (the player from above its keys' end, steep enough to read its screen)
      player: { center: (o) => o.copy(DESK.player).setY(6), radius: 68, el: THREE.MathUtils.degToRad(52), az: Math.atan2(-FWD.x, -FWD.z) },
      earbuds: { center: (o) => earbudsLive.focusCenter(o), radius: 52, el: THREE.MathUtils.degToRad(34) },
    }
    const focusMeshes = { ashtray: [trayMesh, ...cigs.flatMap((c) => [c.body, c.ash, c.ember])], lighter: lighter.meshes, player: [] }
    player.group.traverse((o) => o.isMesh && focusMeshes.player.push(o))
    focusMeshes.earbuds = earbudsLive.item.meshes
    const focus = createFocus({
      camera,
      controls,
      home: HOME,
      targets: focusTargets,
      reduceMotion,
      onChange: (name) => {
        backBtn.hidden = !name
        frameCache.valid = false
        wake()
      },
    })
    const focusRay = new THREE.Raycaster()
    focusRay.layers.enableAll()
    const focusHits = []
    const focusNdc = new THREE.Vector2()
    /** The object under a point of the screen (by name), or null. */
    function focusableAt(cx, cy) {
      const r = canvas.getBoundingClientRect()
      focusNdc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
      focusRay.setFromCamera(focusNdc, camera)
      let best = null
      let bd = Infinity
      for (const name in focusMeshes) {
        focusHits.length = 0
        focusRay.intersectObjects(focusMeshes[name], false, focusHits)
        if (focusHits.length && focusHits[0].distance < bd) {
          bd = focusHits[0].distance
          best = name
        }
      }
      return best
    }
    function focusAt(cx, cy) {
      const name = focusableAt(cx, cy)
      if (name) focus.focusOn(name)
      else focus.back()
    }
    listen(canvas, 'dblclick', (e) => {
      if (grab.held) return
      focusAt(e.clientX, e.clientY)
    })
    // (a double tap: two quick taps close together)
    let lastTap = { t: -1e9, x: 0, y: 0, down: 0, dx: 0, dy: 0 }
    listen(canvas, 'pointerdown', (e) => {
      if (e.pointerType !== 'touch') return
      lastTap.down = e.timeStamp
      lastTap.dx = e.clientX
      lastTap.dy = e.clientY
    }, { passive: true })
    listen(canvas, 'pointerup', (e) => {
      if (e.pointerType !== 'touch' || grab.held) return
      const quick = e.timeStamp - lastTap.down < 250 && Math.hypot(e.clientX - lastTap.dx, e.clientY - lastTap.dy) < 12
      if (!quick) return
      if (e.timeStamp - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
        lastTap.t = -1e9
        focusAt(e.clientX, e.clientY)
      } else lastTap = { ...lastTap, t: e.timeStamp, x: e.clientX, y: e.clientY }
    }, { passive: true })
    // (Escape: an object held goes home first, core/grab.js; with nothing held, the view goes back)
    listen(window, 'keydown', (e) => {
      if (e.key === 'Escape' && !grab.held && focus.focused) focus.back()
    }, { capture: true })
    const backBtn = root.querySelector('[data-act="back"]')

    // ---- the frame, cached (core/frame.js): what does not move is drawn once and re-used; each
    // frame draws the smoke, the ember's few millimetres and one composite pass
    const EMBER_CD = 180 // (the ember's light at full glow, candela)
    const LIGHTS = { key: key.intensity, rim: rim.intensity, fill: fill.intensity, env: scene.environmentIntensity }
    let emberNow = 0 // (the ember's light this frame)
    function setMode(mode) {
      // the burning cigarette's paper: all of it, all but its last 4 mm (cache), or only those
      const part = mode === 'static' || mode === 'ember' ? 1 : mode === 'region' ? 2 : 0
      for (const q of cigs) q.mats.u.uPart.value = q === cigs[cur] ? part : 0
      const only = mode === 'ember'
      key.intensity = only ? 0 : LIGHTS.key
      rim.intensity = only ? 0 : LIGHTS.rim
      fill.intensity = only ? 0 : LIGHTS.fill
      scene.environmentIntensity = only ? 0 : LIGHTS.env
      setEmberLight(emberWorld, camera, mode === 'static' ? 0 : only ? 1 : emberNow / EMBER_CD, EMBER_CD)
    }
    const frameCache = createFrame({ renderer, camera, Q, smokeScene, SU, setMode })
    // where things are on the screen (UV boxes): the ember region, the ember, the smoke
    const F = { still: false, scene, emberI: 0, dofK: 0, regionBox: new THREE.Vector4(), emberBox: new THREE.Vector4(), smokeBox: new THREE.Vector4(), focus: { s: 300, home: 300 }, seed: 0, truth: false, shim: null, time: 0 }
    const bv = new THREE.Vector3()
    const box = { x0: 0, y0: 0, x1: 0, y1: 0, behind: false }
    function boxStart() {
      box.x0 = box.y0 = Infinity
      box.x1 = box.y1 = -Infinity
      box.behind = false
    }
    function boxAdd(v) {
      v.project(camera)
      if (v.z > 1 || v.z < -1) box.behind = true
      const u = v.x * 0.5 + 0.5
      const w = v.y * 0.5 + 0.5
      if (u < box.x0) box.x0 = u
      if (u > box.x1) box.x1 = u
      if (w < box.y0) box.y0 = w
      if (w > box.y1) box.y1 = w
    }
    const cl = (x) => Math.min(1, Math.max(0, x))
    function boxEnd(out) {
      return box.behind ? out.set(0, 0, 1, 1) : out.set(cl(box.x0), cl(box.y0), cl(box.x1), cl(box.y1))
    }
    /** A box along the cigarette (x from x0 to x1, radius r; the ash's droop below), on the screen. */
    function cigBox(c, x0, x1, r, out) {
      boxStart()
      for (let i = 0; i < 8; i++) boxAdd(bv.set(i & 1 ? x1 : x0, i & 2 ? r : -r - 1.6, i & 4 ? r : -r).applyMatrix4(c.group.matrix))
      return boxEnd(out)
    }
    function smokeBoxOf(e, out) {
      boxStart()
      for (let i = 0; i < 8; i++) boxAdd(bv.set(e.x + (i & 1 ? 120 : -120), e.y + (i & 2 ? 260 : -6), e.z + (i & 4 ? 120 : -120)))
      return boxEnd(out)
    }

    // ---- sizing
    function resize() {
      const w = Math.max(1, container.clientWidth)
      const h = Math.max(1, container.clientHeight)
      const dpr = pixelRatio()
      camera.aspect = w / h
      // (the whole desk on every screen: at least its width as a 5:4 screen frames it, with a little
      // more room on a tall one, and at least its depth as a 16:9 screen does)
      const t = THREE.MathUtils.clamp((1.25 - camera.aspect) / 0.75, 0, 1)
      const tanWidth = Math.tan(THREE.MathUtils.degToRad(12)) * 1.25 * (1 + 0.08 * t)
      const tanDepth = (Math.tan(THREE.MathUtils.degToRad(12)) * 1.25) / (16 / 9)
      const tanH = Math.max(tanWidth, tanDepth * camera.aspect)
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanH / camera.aspect))
      camera.updateProjectionMatrix()
      // (the home view follows the screen's shape; the camera with it, if it is there)
      const atHome = camera.position.distanceTo(HOME.pos) < 0.5 && controls.target.distanceTo(HOME.target) < 0.5
      fitHome()
      if (atHome && !focus.moving) {
        camera.position.copy(HOME.pos)
        controls.update()
      }
      renderer.setPixelRatio(dpr)
      renderer.setSize(w, h, false)
      renderer.getDrawingBufferSize(dbs)
      frameCache.setSize(dbs.x, dbs.y)
    }
    const dbs = new THREE.Vector2()
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    cleanups.push(() => ro.disconnect())
    resize()

    // ---- the burn, the ash, the ember
    const BURN_RATE = reduceMotion ? 0 : (CIG.length - CIG.filter) / 300 // a full burn in about five minutes
    let flare = 0
    let puff = 0
    let swapT = 0
    function stepBurn(dt) {
      const c = cigs[cur]
      if (c.state === 'burning') {
        // (just lit: the glow comes up and the coal forms)
        c.lit = Math.min(1, c.lit + dt / 0.9)
        c.coal = Math.min(1, c.coal + dt / 1.4)
        c.b -= BURN_RATE * dt
        c.ashLen = Math.min(CIG.ashMax, c.ashLen + BURN_RATE * dt * 0.92)
        if (c.ashLen > c.fallAt) breakAsh(c, [0, 0, 0])
        if (c.b <= CIG.filter + 0.8) {
          c.state = 'out'
          swapT = 0
        }
      } else if (c.state === 'out') {
        // it goes out: one last thin wisp, then the next one fades in in the next notch
        swapT += dt
        c.lit = Math.max(0, c.lit - dt / 1.6)
        if (swapT > 3.5) {
          // the next one, fresh and unlit, in the next notch
          const n = cigs[1 - cur]
          placeCig(n, (c.notch + 1) % 3)
          n.b = CIG.length + 3.5
          n.ashLen = 0
          n.lit = 0
          n.lightProg = 0
          n.scorch = 0
          n.filterScorch = 0
          n.coal = 0
          n.fade = 0
          n.state = 'arriving'
          n.after = 'unlit'
          n.group.visible = true
          c.state = 'leaving'
          if (cigItems.includes(grab.held)) grab.drop()
          cur = 1 - cur
          pickup.reset(n)
          shadowDirty = true
        }
      }
      for (const k of [0, 1]) {
        const q = cigs[k]
        if (q.state === 'arriving') {
          q.fade = Math.min(1, q.fade + dt / 1.6)
          if (q.fade >= 1) q.state = q.after
          shadowDirty = true
        } else if (q.state === 'leaving') {
          q.fade = Math.max(0, q.fade - dt / 1.6)
          if (q.fade <= 0) {
            q.state = 'waiting'
            q.group.visible = false
          }
          shadowDirty = true
        }
        if (q.group.visible) applyCig(q)
      }
    }

    // ---- pointer: stirring the smoke (position on a plane through the smoke, and velocity)
    const ptr = { x: 0, y: 0, inside: false, world: new THREE.Vector3(), prev: new THREE.Vector3(), vel: new THREE.Vector3(), strength: 0, has: false }
    const raycaster = new THREE.Raycaster()
    raycaster.layers.enableAll() // (the coal and the ash live on the region layer)
    const ndc = new THREE.Vector2()
    const plane = new THREE.Plane()
    const camFwd = new THREE.Vector3()
    function pointerWorld(cx, cy, out) {
      const r = canvas.getBoundingClientRect()
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      camera.getWorldDirection(camFwd)
      camFwd.y = 0
      camFwd.normalize()
      plane.setFromNormalAndCoplanarPoint(camFwd, emberWorld)
      return raycaster.ray.intersectPlane(plane, out)
    }
    const passive = { passive: true }
    listen(canvas, 'pointermove', (e) => {
      active()
      ptr.x = e.clientX
      ptr.y = e.clientY
      ptr.inside = true
    }, passive)
    listen(canvas, 'pointerleave', () => (ptr.inside = false), passive)
    const ptrArr = [0, 0, 0]
    const velArr = [0, 0, 0]
    const srcArr = [0, 0, 0]
    function stepPointer(dt) {
      if (ptr.inside && pointerWorld(ptr.x, ptr.y, ptr.world)) {
        if (ptr.has) {
          ptr.vel.subVectors(ptr.world, ptr.prev).divideScalar(Math.max(dt, 1e-3))
          if (ptr.vel.length() > 1500) ptr.vel.setLength(1500)
        } else ptr.vel.set(0, 0, 0)
        ptr.prev.copy(ptr.world)
        ptr.has = true
        const target = Math.min(1, ptr.vel.length() / 350)
        ptr.strength += (Math.max(target, ptr.strength * Math.exp(-dt / 1.2)) - ptr.strength) * Math.min(1, dt * 8)
      } else {
        ptr.has = false
        ptr.strength *= Math.exp(-dt / 1.2)
        ptr.vel.multiplyScalar(Math.exp(-dt / 0.6))
      }
    }

    // ---- tap to flick: a short press on the cigarette
    listen(canvas, 'wheel', active, passive)
    listen(window, 'keydown', active)
    listen(canvas, 'pointerdown', () => {
      active()
      hideHint()
      wake()
    }, passive)
    function flick(c) {
      const dir = [0, 0, 0]
      // the flick pushes the ash down and a little outward
      if (c.ashLen > 0.3) breakAsh(c, dir)
      puff = 1
      flare = 1
      audio.burst(1)
      api.lastFlick = performance.now()
    }

    // ---- picking the cigarette up (only the cigarette: core/grab.js, objects/pickup.js)
    const seatPts = seats.map((s) => new THREE.Vector3(s.dir[0] * (TRAY.bowlTop + 2.3), s.y + CIG.radius + 0.05, s.dir[2] * (TRAY.bowlTop + 2.3)))
    const grab = createGrab({ canvas, camera, controls, listen, onActive: () => (active(), hideHint(), wake()) })
    const pickup = createPickup({
      camera,
      sdfGrad: cigObstacles,
      notchPose: (k, out) => cigarettePose(k, out),
      notchSeat: (k) => seatPts[k],
      onBreak: (c, v) => {
        // (too sudden: the ash comes off and falls from where it is; the ember flares)
        breakAsh(c, [v.x * 0.7, v.y * 0.7, v.z * 0.7])
        flare = 1
        puff = Math.max(puff, 0.6)
        audio.burst(0.8)
      },
      onChange: () => (shadowDirty = true),
    })
    pickup.reset(cigs[0])
    const cigItems = cigs.map((c) => ({
      meshes: [c.body, c.ash, c.ember],
      canGrab: () => c === cigs[cur] && (c.state === 'burning' || c.state === 'out' || c.state === 'unlit' || c.state === 'lighting') && pickup.st.mode !== 'glide',
      pick: (hit) => {
        pickup.pick(c, hit.point)
        api.lastPick = performance.now()
      },
      aim: (ray) => pickup.aim(ray),
      twist: (r) => pickup.twist(r),
      // (a cigarette that has gone out and is fading stays where it is)
      release: () => (c.state === 'leaving' || c.state === 'waiting' ? null : pickup.release()),
      home: () => pickup.glideTo(c.notch),
      cancel: () => pickup.cancel(),
      onTap: () => {
        if (c.state === 'burning') flick(c)
      },
    }))
    for (const it of cigItems) grab.add(it)
    // the lighter: the only other thing that can be picked up
    const lighterItem = {
      meshes: lighter.meshes,
      canGrab: () => lighter.st.mode !== 'glide',
      pick: (hit) => {
        lighter.pick(hit.point)
        api.lastPick = performance.now()
      },
      aim: (ray) => lighter.aim(ray),
      twist: (r) => lighter.twist(r),
      release: () => lighter.release(),
      home: () => lighter.home(),
      cancel: () => lighter.cancel(),
      onTap: () => {},
    }
    grab.add(lighterItem)
    // the flame: the round button (only while the lighter is held) or Space; held, it burns
    const flameBtn = root.querySelector('[data-flame]')
    let flameBtnShown = false
    let flamePointer = -1
    const flameDown = (e) => {
      if (grab.held !== lighterItem) return
      e.preventDefault()
      flamePointer = e.pointerId
      try {
        flameBtn.setPointerCapture(e.pointerId)
      } catch {
        // (a synthetic or already-ended pointer)
      }
      active()
      lighter.ignite(true)
      wake()
    }
    const flameUp = (e) => {
      if (e.pointerId !== flamePointer) return
      flamePointer = -1
      lighter.ignite(false)
    }
    listen(flameBtn, 'pointerdown', flameDown)
    listen(flameBtn, 'pointerup', flameUp)
    listen(flameBtn, 'pointercancel', flameUp)
    listen(flameBtn, 'lostpointercapture', flameUp)
    listen(flameBtn, 'contextmenu', (e) => e.preventDefault())
    // (a keyboard press on the focused button, or Space anywhere while the lighter is held)
    let spaceDown = false
    listen(window, 'keydown', (e) => {
      if (e.code !== 'Space' || grab.held !== lighterItem) return
      e.preventDefault()
      if (e.repeat || spaceDown) return
      spaceDown = true
      active()
      lighter.ignite(true)
      wake()
    })
    listen(window, 'keyup', (e) => {
      if (e.code !== 'Space' || !spaceDown) return
      spaceDown = false
      lighter.ignite(false)
    })
    listen(window, 'blur', () => {
      spaceDown = false
      flamePointer = -1
      lighter.ignite(false)
    })
    function stepFlameUi() {
      const show = grab.held === lighterItem
      if (show !== flameBtnShown) {
        flameBtnShown = show
        root.classList.toggle('cg-lighter', show)
        flameBtn.setAttribute('aria-hidden', String(!show))
        flameBtn.tabIndex = show ? 0 : -1
        if (!show) {
          spaceDown = false
          flamePointer = -1
        }
      }
      const pressed = show && lighter.st.want
      if (pressed !== (flameBtn.getAttribute('aria-pressed') === 'true')) flameBtn.setAttribute('aria-pressed', String(pressed))
    }
    // ---- the player's keys: a tap presses one (previous, play/pause, and the red one: next track)
    const keyRay = new THREE.Raycaster()
    keyRay.layers.enableAll()
    const keyHits = []
    const keyMeshes = []
    for (const k of player.keys) k.mesh.traverse((o) => o.isMesh && keyMeshes.push(o))
    let keyAnim = 0
    let tapDown = null
    listen(canvas, 'pointerdown', (e) => {
      tapDown = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId }
    }, { passive: true })
    listen(canvas, 'pointerup', (e) => {
      const d = tapDown
      tapDown = null
      if (!d || d.id !== e.pointerId || grab.held || e.timeStamp - d.t > 350 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return
      const r = canvas.getBoundingClientRect()
      focusNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      keyRay.setFromCamera(focusNdc, camera)
      keyHits.length = 0
      keyRay.intersectObjects(keyMeshes, false, keyHits)
      if (!keyHits.length) return
      let o = keyHits[0].object
      const key = player.keys.find((k) => { let hit = false; k.mesh.traverse((q) => (hit = hit || q === o)); return hit })
      if (!key) return
      pressKey(key)
    }, { passive: true })
    function pressKey(key) {
      key.press(true)
      setTimeout(() => key.press(false), 140)
      keyAnim = 0.5
      if (key.name === 'play') audio.setPlaying(!audio.playing)
      else if (key.name === 'prev') audio.prev()
      else audio.next()
      screenT = 0
      active()
      wake()
    }
    // the screen: what the music is doing (a few times a second)
    let screenT = 0
    // (the track list, from the music's own chunk, so the screen names the first track even before
    // the sound is on; the engine itself is made at the first unmute)
    let trackList = null
    import('./core/music.js').then((m) => {
      trackList = m.tracks
      screenT = 0
    })
    const screenBars = new Float32Array(16)
    const screenState = { title: '', artist: '', playing: false, time: 0, duration: 0, bars: screenBars }
    function stepScreen(dt) {
      screenT -= dt
      if (screenT > 0) return
      screenT = 1 / 15
      const m = audio.music
      const t = m ? m.track : trackList ? trackList[0] : null
      screenState.title = t ? t.title : ''
      screenState.artist = !audio.plugged ? 'earbuds unplugged' : !audio.on ? 'sound off' : t ? t.artist : ''
      screenState.playing = audio.audible
      screenState.time = m ? m.time : 0
      screenState.duration = t ? t.duration : 0
      audio.bars(screenBars)
      player.screen.setState(screenState)
    }
    const emberPrev = new THREE.Vector3()
    // ---- the physics scheduler (core/physics.js): one fixed step for everything that simulates
    const physics = createPhysics()
    physics.add(pickup.physics)
    physics.add(lighter.physics)
    physics.add({ awake: () => flakesAwake > 0, step: (h) => stepFlakes(h) })
    physics.add(earbudsLive.physics)
    grab.add(earbudsLive.item)

    // ---- sound: one AudioContext (core/audio.js), made on the first unmute: the paper's crackle,
    // the lighter's click, the player's music through the earbuds
    const audio = createAudio()
    cleanups.push(() => audio.close())

    // ---- UI
    const hint = root.querySelector('.cg-hint')
    let hintShown = true
    function hideHint() {
      if (!hintShown) return
      hintShown = false
      setTimeout(() => hint.classList.add('gone'), 2500)
    }
    function resetView() {
      if (grab.held) grab.drop('home')
      if (pickup.st.mode === 'lying' || pickup.st.mode === 'fall') pickup.glideTo(cigs[cur].notch)
      lighter.home()
      if (!earbudsLive.plugged) earbudsLive.plug()
      focus.back()
    }
    for (const b of root.querySelectorAll('[data-colorway]'))
      listen(b, 'click', () => {
        active()
        earbuds.setColorway(b.dataset.colorway)
        for (const q of root.querySelectorAll('[data-colorway]')) q.setAttribute('aria-pressed', String(q === b))
        frameCache.valid = false
        wake()
      })
    for (const b of root.querySelectorAll('[data-act]'))
      listen(b, 'click', () => {
        active()
        if (b.dataset.act === 'reset') resetView()
        else if (b.dataset.act === 'back') focus.back()
        else if (b.dataset.act === 'sound') {
          const on = b.getAttribute('aria-pressed') !== 'true'
          b.setAttribute('aria-pressed', String(on))
          audio.enable(on)
        }
        wake()
      })

    // ---- the loop (the smoke always moves: it runs while the scene is in view)
    let running = true
    let visible = true
    let raf = 0
    let last = performance.now()
    let shadowDirty = true
    let shadowClock = 0
    let simTime = 0
    let loopReady = false
    // what changed this frame: the camera (controls, tween), falling ash, a cigarette fading
    // (by its matrices, not the controls' change events: at a zoom or tilt limit OrbitControls
    // reports a change every frame from round-off alone)
    let camMoved = true
    let dofK = 0
    let bakeClock = 0
    let stillFrames = 0
    const bakedCam = new THREE.Matrix4()
    const bakedProj = new THREE.Matrix4()
    // (OrbitControls rewrites the camera on every update, with round-off even when it stands still)
    const nearly = (a, b) => {
      // (a few thousandths of a millimetre, a hundred-thousandth of a radian: well under a pixel)
      for (let i = 0; i < 16; i++) if (Math.abs(a.elements[i] - b.elements[i]) > 1e-5 * Math.max(1, Math.abs(a.elements[i]))) return false
      return true
    }
    const dbgFlags = { emberLight: 1, flameLight: 1, cache: 1, truth: 0, freeze: 0 }
    api.pressKey = (name) => pressKey(player.keys.find((k) => k.name === name))
    let dbg = null
    if (opts.debug)
      import('./core/overlay.js').then((m) => {
        if (destroyed) return
        dbg = m.createOverlay(
          root,
          renderer,
          () => ({
            backing: `${canvas.width}x${canvas.height}`,
            css: `${canvas.clientWidth}x${canvas.clientHeight}`,
            dpr: renderer.getPixelRatio(),
            // (full sharpness: the backing store is the CSS size times the pixel ratio, to the pixel)
            sharp: Math.abs(canvas.width - Math.round(canvas.clientWidth * renderer.getPixelRatio())) <= 1 && Math.abs(canvas.height - Math.round(canvas.clientHeight * renderer.getPixelRatio())) <= 1,
            refresh: refreshHz,
            targets: frameCache.targets.length + 11 + 2,
          }),
          initSteps,
        )
        if (api.firstFrameAt) {
          dbg.stats.firstFrameAt = api.firstFrameAt
          dbg.report()
        }
      })
    // (the display's refresh rate: the shortest rAF intervals, measured once the loop runs)
    let refreshHz = 0
    {
      const gaps = []
      let prevT = 0
      const probe = (t) => {
        if (prevT) gaps.push(t - prevT)
        prevT = t
        if (gaps.length < 60 && !destroyed) requestAnimationFrame(probe)
        else if (gaps.length) {
          gaps.sort((a, b) => a - b)
          refreshHz = 1000 / gaps[Math.floor(gaps.length * 0.25)]
        }
      }
      requestAnimationFrame(probe)
    }
    function wake() {
      if (!raf && running && loopReady && !destroyed) raf = requestAnimationFrame(frame)
    }
    const emberFlicker = (t) => 0.82 + 0.1 * Math.sin(t * 1.3) + 0.07 * noise3(t * 2.7, 0.5, 0.5) + 0.05 * noise3(t * 9, 3.1, 0.2)
    // the flame's light (core/emberlight.js): full = FLAME_CD candela, at the bright middle of the flame
    const FLAME_CD = 9000
    const flamePos = new THREE.Vector3()
    const shimF = { x: 0, y: 0, k: 0, r: 0.1 }
    const focusPt = new THREE.Vector3()
    const sbox = new THREE.Vector4()
    playerScreen.geometry.computeBoundingBox()
    const screenBounds = playerScreen.geometry.boundingBox
    let emberHeat = 0 // (a burning ember near the flame brightens)
    /** The flame has lit it: the ring is whole, the first puff rises, it settles into the burn. */
    function lightUp(c) {
      c.state = 'burning'
      c.b = CIG.length + 0.4
      c.lit = 0.5
      c.coal = 0
      c.lightProg = 1
      c.ashLen = 0
      c.fallAt = 12 + Math.random() * 5
      puff = 1
      flare = 0.8
      audio.burst(0.9)
      api.lastLit = performance.now()
      shadowDirty = true
    }
    function shadowsNow() {
      renderer.shadowMap.needsUpdate = true
      key.shadow.needsUpdate = true
    }
    const cigSwapping = (q) => q.state === 'arriving' || q.state === 'leaving'
    function frame(now) {
      raf = 0
      if (!running || destroyed) return
      const t0 = performance.now()
      let dt = Math.min(0.05, (now - last) / 1000) // (clamped: nothing jumps after a pause)
      last = now
      if (dbgFlags.freeze) dt = 0 // (tests: time stands still, the frame is still drawn)
      simTime += dt * (reduceMotion ? 0.35 : 1)
      U.uTime.value = simTime
      focus.update(now)
      controls.update()
      grab.hover()
      // every simulation, at its fixed step (the cable, the dropped lighter and cigarette, the ash)
      physics.update(dt)
      // the cigarette as the lighter sees it (its capsule, its ends: only while it lies still, for
      // lighting), then the lighter
      const cc = cigs[cur]
      capOn = cc.group.visible && cc.state !== 'leaving' && cc.state !== 'waiting'
      if (capOn) {
        capA.set(0, 0, 0).applyMatrix4(cc.group.matrix)
        capB.set(Math.min(CIG.length, cc.b + 0.7 + cc.ashLen), 0, 0).applyMatrix4(cc.group.matrix)
      }
      lightTarget.on = capOn && cc.state !== 'arriving' && (pickup.st.mode === 'rest' || pickup.st.mode === 'lying')
      if (lightTarget.on) {
        lightTarget.filterOn = cc.state === 'unlit' || cc.state === 'lighting'
        lightTarget.filter.copy(capA)
        lightTarget.axis.subVectors(capB, capA).normalize()
        // (its foot; a burning one's tip, where the ash ends)
        lightTarget.foot.set(cc.b > CIG.length ? CIG.length : cc.b + 0.7 + cc.ashLen, 0, 0).applyMatrix4(cc.group.matrix)
      }
      const lighterBusy = lighter.update(dt, simTime)
      if (lighterBusy) lighterBox.set(lighter.group.matrix)
      const cableBusy = earbudsLive.update()
      stepScreen(dt)
      player.update(dt)
      keyAnim = Math.max(0, keyAnim - dt)
      lighterFrame()
      stepFlameUi()
      const carried = pickup.update(dt, cigs[cur].state === 'burning')
      stepBurn(dt)
      stepPointer(dt)
      audio.step(dt, cigs[cur].state === 'burning')
      flare = Math.max(0, flare - dt / 1.1)
      puff = Math.max(0, puff - dt / 2.2)
      const c = cigs[cur]
      // the flame on the cigarette: on its foot it lights it (held there ~1.5 s: the scorch, specks
      // joining into a ring, the first puff); pulled away early, the progress decays (the scorch
      // stays); on the filter it scorches it, never lights it; near a burning ember it brightens it
      let onFoot = false
      let heat = 0
      if (lighter.st.lit > 0 && lightTarget.on) {
        const touch = CIG.radius + 3.2
        if ((c.state === 'unlit' || c.state === 'lighting') && lighter.flameDist(lightTarget.foot) < touch) {
          onFoot = true
          c.state = 'lighting'
          c.scorch = Math.min(1, c.scorch + dt / 0.8)
          c.lightProg = Math.min(1, c.lightProg + dt / 1.5)
          if (c.lightProg >= 1) lightUp(c)
        }
        if (lighter.flameDist(lightTarget.filter) < touch) c.filterScorch = Math.min(1, c.filterScorch + dt / 2.5)
        if (c.state === 'burning') heat = 1 - THREE.MathUtils.smoothstep(lighter.flameDist(emberWorld), 5, 24)
      }
      if (c.state === 'lighting' && !onFoot) {
        c.lightProg = Math.max(0, c.lightProg - dt / 2)
        if (c.lightProg <= 0) c.state = 'unlit'
      }
      emberHeat += (heat - emberHeat) * Math.min(1, dt * 5)
      // (being lit, the specks glow, a little: the ember's light and smoke come up with them)
      const glowAmt = c.state === 'lighting' ? 0.45 * c.lightProg : c.lit
      // (fanned while carried: brighter with speed)
      U.uEmber.value = emberFlicker(simTime) + 0.9 * flare + 0.7 * pickup.st.fan + 0.9 * emberHeat
      emberPrev.copy(emberWorld)
      emberPos(c, emberWorld)
      if (pickup.st.mode === 'held' && dt > 0) {
        // the moving ember stirs its own smoke: it takes the pointer's place in the smoke's history
        // (the hand that holds it is the pointer), position and velocity
        ptr.world.copy(emberWorld)
        ptr.vel.subVectors(emberWorld, emberPrev).divideScalar(dt)
        if (ptr.vel.length() > 1500) ptr.vel.setLength(1500)
        ptr.strength = Math.max(ptr.strength * Math.exp(-dt / 1.2), Math.min(1, ptr.vel.length() / 350))
      }
      emberNow = EMBER_CD * U.uEmber.value * glowAmt * c.fade * dbgFlags.emberLight
      camera.updateMatrixWorld()
      setEmberLight(emberWorld, camera, emberNow / EMBER_CD, EMBER_CD)
      // the flame's light (and its shadow, drawn every frame while it burns)
      const lt = lighter.st
      if (lt.lit > 0) {
        lighter.flamePoints()
        flamePos.copy(lighter.flameBase).addScaledVector(lt.flameDir, Math.min(7, lt.flameLen * 0.35))
        setFlameLight(flamePos, camera, lt.glow * dbgFlags.flameLight, FLAME_CD, flameSpot)
        flameSpot.shadow.needsUpdate = true
        renderer.shadowMap.needsUpdate = true
      } else setFlameLight(flamePos, camera, 0, FLAME_CD, flameSpot)
      // the smoke's history: where the ember is, whether it burns; the pointer
      srcArr[0] = emberWorld.x
      srcArr[1] = emberWorld.y
      srcArr[2] = emberWorld.z
      ptrArr[0] = ptr.world.x
      ptrArr[1] = ptr.world.y
      ptrArr[2] = ptr.world.z
      velArr[0] = ptr.vel.x
      velArr[1] = ptr.vel.y
      velArr[2] = ptr.vel.z
      const alive = c.state === 'leaving' || c.state === 'waiting' ? 0 : glowAmt * c.fade
      SU.uHistHead.value = history.advance(dt, srcArr, alive, ptrArr, ptr.strength, velArr, puff)
      SU.uEmberPos.value.copy(emberWorld)
      SU.uEmberI.value = U.uEmber.value * alive
      camera.getWorldDirection(SU.uViewDir.value)
      SU.uCam.value.copy(camera.position)
      // still or moving: still, the cache is drawn over; moving (or ash falling, or a cigarette
      // fading in or out), the whole scene is
      // (the camera: changed since the cache was baked, by the controls or by anything else)
      camera.updateMatrixWorld()
      const camChanged = camMoved || !nearly(bakedCam, camera.matrixWorld) || !nearly(bakedProj, camera.projectionMatrix)
      camMoved = false
      // (the cigarette or the lighter carried, gliding or falling, or the flame burning: drawn whole,
      // the shadows drawn again every frame)
      if (carried || lighterBusy || cableBusy) shadowDirty = true
      const changing = carried || lighterBusy || cableBusy || keyAnim > 0 || camChanged || focus.moving || flakesAwake > 0 || cigs.some(cigSwapping) || !dbgFlags.cache
      // (the cache is baked once the scene has been still for a few frames: a slow drag with pauses
      // does not bake at every pause)
      stillFrames = changing ? 0 : stillFrames + 1
      const moving = changing || stillFrames < 4
      // shadows: drawn again only when the shadow casters changed (the burn moves slowly: every 2 s)
      shadowClock += dt
      bakeClock += dt
      const burnStep = shadowClock > 2
      if (burnStep) shadowClock = 0
      // (the depth of field: on what the view is about; deep over the whole desk, the still life's
      // own aperture in a close-up)
      if (focus.focused) focusTargets[focus.focused].center(focusPt)
      else focusPt.copy(controls.target)
      F.focus.s = camera.position.distanceTo(focusPt)
      F.focus.home = F.focus.s * (focus.focused ? 1 : 2.2)
      dbg?.begin()
      if (moving) {
        dofK = 0
        frameCache.valid = false
        // (the camera as it is now: if it stays, the next frame bakes for it)
        bakedCam.copy(camera.matrixWorld)
        bakedProj.copy(camera.projectionMatrix)
        if (shadowDirty || burnStep) {
          shadowsNow()
          shadowDirty = false
        }
      } else {
        if (!frameCache.valid || shadowDirty || burnStep) {
          key.shadow.needsUpdate = true
          frameCache.bake(scene, F.focus, shadowDirty || burnStep || !frameCache.valid)
          bakedCam.copy(camera.matrixWorld)
          bakedProj.copy(camera.projectionMatrix)
          shadowDirty = false
          bakeClock = 0
          if (dbg) dbg.bakes++
        }
        dofK = Math.min(1, dofK + dt / 0.4)
      }
      F.still = !moving
      F.truth = !!dbgFlags.truth
      F.emberI = emberNow / EMBER_CD
      F.dofK = dofK
      if (!dbgFlags.freeze) F.seed = (F.seed + 0.6180339) % 7
      cigBox(c, c.b - 4.6, c.b + 0.7 + c.ashLen + 0.8, 4.7, F.regionBox)
      // (the player's screen is drawn over the cache too: the box takes it in)
      boxStart()
      for (let i = 0; i < 8; i++) boxAdd(bv.set(i & 1 ? screenBounds.max.x : screenBounds.min.x, i & 2 ? screenBounds.max.y : screenBounds.min.y, i & 4 ? screenBounds.max.z : screenBounds.min.z).applyMatrix4(playerScreen.matrixWorld))
      boxEnd(sbox)
      F.regionBox.set(Math.min(F.regionBox.x, sbox.x), Math.min(F.regionBox.y, sbox.y), Math.max(F.regionBox.z, sbox.z), Math.max(F.regionBox.w, sbox.w))
      cigBox(c, c.b - 1.2, c.b + 3.8, 4.7, F.emberBox)
      smokeBoxOf(emberWorld, F.smokeBox)
      // the flame on the screen: heat shimmer above it
      F.shim = null
      F.time = simTime
      if (lt.lit > 0) {
        const mmUv = 1 / (2 * camera.position.distanceTo(flamePos) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
        bv.copy(lighter.flameTip).project(camera)
        shimF.x = bv.x * 0.5 + 0.5
        shimF.y = bv.y * 0.5 + 0.5
        shimF.k = lt.lit
        shimF.r = 24 * mmUv
        F.shim = shimF
      }
      frameCache.render(F)
      dbg?.end(performance.now() - t0, moving ? 'full' : 'cached')
      wake()
    }

    // pause when out of view or the tab is hidden (rendering, simulation and sound)
    function setRunning(on) {
      if (on === running) return
      running = on
      if (on) {
        last = performance.now()
        audio.setRunning(true)
        wake()
      } else {
        if (raf) cancelAnimationFrame(raf)
        raf = 0
        audio.setRunning(false)
      }
    }
    const io = new IntersectionObserver((es) => {
      visible = es[es.length - 1].isIntersecting
      setRunning(visible && !document.hidden)
    })
    io.observe(container)
    cleanups.push(() => io.disconnect())
    listen(document, 'visibilitychange', () => setRunning(visible && !document.hidden))
    listen(canvas, 'webglcontextlost', (e) => {
      e.preventDefault()
      setRunning(false)
      root.classList.add('cg-lost')
    })
    listen(canvas, 'webglcontextrestored', () => {
      envTex.dispose()
      envTex = studioEnv()
      scene.environment = envTex
      shadowDirty = true
      history.tex.needsUpdate = true
      curlTex.needsUpdate = true
      frameCache.valid = false
      root.classList.remove('cg-lost')
      setRunning(visible && !document.hidden)
    })

    // ---- first frame: every program compiled first, a frame drawn out of sight, then the fade in
    for (const c of cigs) applyCig(c)
    const tc = performance.now()
    cigs[1].group.visible = true
    step('post, controls, sound, loop')
    await yieldNow()
    // (every program, including the region layer's and the smoke's, before the first frame)
    camera.layers.enableAll()
    lighter.group.traverse((o) => o.material?.isShaderMaterial && (o.visible = true))
    // (for the target the scene is really drawn into: a program is keyed by its output, so one
    // compiled for the screen would be compiled again the first time it is drawn into the frame;
    // the flame and its spark, drawn first at the first ignition, would stall it)
    renderer.setRenderTarget(frameCache.live)
    await renderer.compileAsync(scene, camera)
    camera.layers.set(0)
    stage('light', 'done')
    // the smoke: its programs, then the first whole frame (the shadows made, the flame's too, so its
    // map is made now, not at the first ignition)
    stage('smoke', 'start')
    await renderer.compileAsync(smokeScene, camera)
    stage('smoke', 0.5)
    renderer.setRenderTarget(null)
    cigs[1].group.visible = false
    if (destroyed) return
    step('shaders compiled')
    shadowsNow()
    flameSpot.shadow.needsUpdate = true
    frame(performance.now())
    await yieldNow()
    stage('smoke', 'done')
    // the music: its engine built now (the context waits, suspended, for the visitor's click)
    stage('music', 'start')
    if (opts.hold) await audio.prepare()
    stage('music', 'done')
    // the mood: frames drawn out of sight until the cache is baked and SMAA compiled, still from
    // the cache, so every program and target is made before anyone sees a frame
    stage('mood', 'start')
    for (let k = 0; k < 40 && !(frameCache.valid && frameCache.smaaReady && dofK > 0); k++) {
      frame(performance.now())
      stage('mood', Math.min(0.9, (k + 1) / 6)) // (about six frames, as a rule)
      await yieldNow()
    }
    api.compileMs = performance.now() - tc
    step('first frames, cache, SMAA')
    stage('mood', 'done')
    api.firstFrameAt = performance.now()
    root.classList.add(opts.hold ? 'cg-loaded' : 'cg-ready')
    // (behind a loader the loop waits for enter(): until then nothing would be seen)
    loopReady = !opts.hold
    last = performance.now()
    wake()

    /** The reveal (after a loader): the scene fades up from black, the camera pushes in a little. */
    handle.enter = ({ sound = true } = {}) => {
      if (sound) {
        audio.enable(true, 1.6)
        root.querySelector('[data-act="sound"]').setAttribute('aria-pressed', 'true')
      }
      if (!reduceMotion) {
        // (from a little further back, easing in)
        camera.position.sub(HOME.target).multiplyScalar(1.14).add(HOME.target)
        focus.glide(HOME.pos, HOME.target, 2600)
      }
      root.classList.add('cg-ready', 'cg-reveal')
      loopReady = true
      last = performance.now()
      active()
      wake()
    }
    /** Where the cigarette's ember is on the screen (CSS px), for the loader's ember to travel to. */
    handle.emberScreen = () => {
      bv.copy(emberWorld).project(camera)
      const r = canvas.getBoundingClientRect()
      return [r.left + ((bv.x + 1) / 2) * r.width, r.top + ((1 - bv.y) / 2) * r.height]
    }
    if (opts.debug)
      window.__still = {
        THREE, scene, camera, renderer, controls, cigs, api, handle, flick: () => flick(cigs[cur]), emberWorld, ptr, SU, frameCache, Q, key, rim, fill, tableMat, trayMat, flags: dbgFlags, homePos: HOME.pos, homeTarget: HOME.target, pickup, grab, seatPts, traySdfGrad, lighter, lighterItem, cigItems, lightTarget, flameSpot, FLAME_CD, player, earbuds, earbudsLive, audio, focus, physics, jack,
        get cur() {
          return cigs[cur]
        },
        setTime: (s) => (simTime = s),
        burnTo: (b) => {
          cigs[cur].b = b
          frameCache.valid = false
          shadowDirty = true
        },
        get overlay() {
          return dbg
        },
      }

    api.dispose = () => {
      setRunning(false)
      controls.dispose()
      const seen = new Set()
      for (const s of [scene, smokeScene])
        s.traverse((o) => {
          if (o.geometry && !seen.has(o.geometry)) seen.add(o.geometry) && o.geometry.dispose()
          const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
          for (const m of ms) if (!seen.has(m)) seen.add(m) && m.dispose()
        })
      for (const t of disposables) t.dispose()
      history.dispose()
      envTex.dispose()
      key.shadow.dispose()
      frameCache.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      dbg?.dispose()
    }
  }

  function destroy() {
    if (destroyed) return
    destroyed = true
    try {
      api.dispose?.()
    } finally {
      for (const f of cleanups.splice(0)) f()
      root?.remove()
      if (window.__still?.handle === handle) delete window.__still
    }
  }
}
