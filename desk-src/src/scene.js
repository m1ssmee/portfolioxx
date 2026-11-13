// A cigarette burning in an ashtray, smoke curling up through a beam of light: a procedural,
// interactive still life.   const s = createScene(container, options)  ...  s.destroy()
// 1 unit = 1 mm. Everything is generated here: the ashtray is meshed from a signed distance field
// and the textures are baked in a worker; the smoke is computed on the GPU.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createFrame, LAYER } from './core/frame.js'
import { withEmber, setEmberLight, setFlameLight, installEmberLight, FLAME_COLOR, EMBER_LIGHT } from './core/emberlight.js'
import { createGrab } from './core/grab.js'
import { createAudio } from './core/audio.js'
import { createFocus } from './core/focus.js'
import { smoothToward } from './core/follow.js'
import { createPhysics } from './core/physics.js'
import * as LAYOUT from './layout.js'
import { createPlayerAsync } from './objects/player.js'
import { createEarbudsAsync } from './objects/earbuds.js'
import { createEarbudsLive } from './objects/earbudsLive.js'
import { createDeskGround } from './objects/deskGround.js'
import { createPickup } from './objects/pickup.js'
import { createLighter } from './objects/lighter.js'
import { createBadge } from './objects/badge.js'
import { createNotebook } from './objects/notebook.js'
import { createDeskMat, MAT, MAT_COLORS } from './objects/deskMat.js'
import { createRoom, ROOM } from './objects/room.js'
import { createLaptop, LAPTOP } from './objects/laptop.js'
import { keyLayout, WELL, PAD } from './objects/laptopGeo.js'
import { createCan, CAN } from './objects/can.js'
import { createLamp, LAMP } from './objects/lamp.js'
import caveatUrl from './assets/caveat.woff2?url'
import { createVisitorsBook } from './visitors/book.js'
import badgeFaceUrl from './assets/badge-face.webp?url'
import badgeBackUrl from './assets/badge-back.webp?url'
import { TRAY, notchSeat, ashtraySDF } from './objects/ashtray.js'
import { CIG, cigaretteMaterials, bodyGeometry, emberGeometry, ashGeometry, strandGeometry, buttGeometry, flakeGeometry, matchStick } from './objects/cigarette.js'
import { createSmoke, SmokeHistory } from './objects/smoke.js'
import { noise3 } from './core/noise.js'
import { TEX_W, TEX_H, GLASS } from './os/size.js'
import { portfolio } from './content/portfolio.ts'

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
// the desk mat's colour (objects/deskMat.js: slate, sage, rust or oat)
const MAT_COLOR = 'sage'
const Q = { strands: 10, segments: 160, haze: 1800, smokeSteps: 10, smokeScale: 0.4, bloomScale: 0.5, shadow: 2048, msaa: 4, trayH: 0.6, segs: 64, lighterH: 0.5 }
/** The canvas at full sharpness: CSS size x devicePixelRatio, capped at 2 only on 3x screens. */
// (the canvas at the screen's own pixels, up to 2 a CSS pixel: stretched, thin seams break into
// dashes. What the GPU pays while the view MOVES is handled inside the frame pipeline instead:
// moving frames are drawn at a reduced size into fixed buffers and scaled up on screen)
const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2)

const CSS = `
.cg-root{--ink:#f1efe9;--label:#c9c4ba;--rule:rgba(241,239,233,.36);--mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;position:absolute;inset:0;overflow:hidden;color:var(--ink);font:500 10.5px/1.4 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.cg-poster{position:absolute;left:50%;top:0;height:100%;width:auto;min-width:100%;max-width:none;object-fit:cover;transform:translateX(-50%);pointer-events:none}
.cg-stage{position:absolute;inset:0;opacity:0;transition:opacity .8s ease}
.cg-ready .cg-stage{opacity:1}
.cg-reveal .cg-stage{transition:opacity 1.2s cubic-bezier(.3,0,.2,1)}
.cg-reveal .cg-ui{transition:opacity 1s ease .9s}
.cg-lost .cg-stage,.cg-fallback .cg-stage{opacity:0}
.cg-canvas{display:block;width:100%;height:100%;touch-action:none}
.cg-ui{transition:opacity .5s}
.cg-root:not(.cg-ready) .cg-ui,.cg-fallback .cg-ui{opacity:0;pointer-events:none}
.cg-cap{text-transform:uppercase;letter-spacing:.2em}
.cg-coarse{display:none}
@media (hover:none) and (pointer:coarse){.cg-fine{display:none}.cg-coarse{display:revert}}
.cg-root button{font:inherit;cursor:pointer;color:inherit}
.cg-id{position:absolute;left:max(24px,env(safe-area-inset-left));top:max(22px,env(safe-area-inset-top));margin:0;display:flex;flex-direction:column;gap:6px;pointer-events:none}
.cg-id-name{font-weight:600}
.cg-id-role{color:var(--label)}
.cg-os{position:absolute;left:max(24px,env(safe-area-inset-left));top:max(64px,env(safe-area-inset-top));z-index:2;padding:7px 11px;border-radius:3px;background:#22211f;border:1px solid var(--rule);transform:translateY(-6px);opacity:0;pointer-events:none;transition:transform .2s,opacity .2s}
.cg-os:focus-visible{transform:none;opacity:1;pointer-events:auto;outline:1.5px solid var(--ink);outline-offset:3px}
.cg-tools{position:absolute;right:max(16px,env(safe-area-inset-right));top:max(14px,env(safe-area-inset-top));display:flex;gap:2px}
.cg-txt{display:inline-flex;align-items:center;gap:7px;padding:8px;background:none;border:0;border-radius:2px;color:var(--label)!important;transition:color .2s}
.cg-txt>span{border-bottom:1px solid transparent;padding-bottom:2px;transition:border-color .2s}
.cg-txt:hover{color:var(--ink)!important}
.cg-txt:hover>span{border-color:var(--rule)}
.cg-txt:focus-visible{outline:1.5px solid var(--ink);outline-offset:0}
.cg-txt[hidden]{display:none}
.cg-txt[aria-pressed='false'] .on,.cg-txt[aria-pressed='true'] .off{display:none}
.cg-keys{position:absolute;right:max(24px,env(safe-area-inset-right));bottom:max(94px,calc(env(safe-area-inset-bottom) + 76px));margin:0;padding:0;list-style:none;display:flex;flex-direction:column;align-items:flex-end;gap:10px;color:var(--label);pointer-events:none}
.cg-keys{transition:opacity .4s}
.cg-close .cg-keys{opacity:0}
.cg-veil{position:absolute;inset:0;visibility:hidden;cursor:pointer;transition:visibility 0s .6s}
.cg-projecting .cg-veil{visibility:visible;transition:none}
.cg-projecting .cg-keys,.cg-projecting .cg-copy{opacity:0;pointer-events:none}
.cg-keys,.cg-copy{transition:opacity .4s}
.cg-proj{position:absolute;z-index:3;right:max(5vw,28px);top:50%;box-sizing:border-box;width:min(500px,42vw);max-height:min(80vh,720px);overflow:auto;padding:4px 6px 4px 0;color:var(--ink);font:400 14.5px/1.6 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:0;opacity:0;visibility:hidden;transform:translate(18px,-50%);transition:opacity .3s ease,transform .3s ease,visibility 0s .3s;scrollbar-width:thin}
.cg-projecting .cg-proj{opacity:1;visibility:visible;transform:translate(0,-50%);transition:opacity .45s ease .2s,transform .55s cubic-bezier(.2,.7,.2,1) .2s}
.cg-proj .cg-cap{font-size:10.5px}
.cg-proj-close{margin:0 0 18px -8px}
.cg-proj-k{margin:0;color:var(--label);font-weight:500}
.cg-proj-name{margin:10px 0 10px;font:600 34px/1.1 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:-.015em}
.cg-proj-line{margin:0 0 22px;font-size:17px;line-height:1.45}
.cg-proj-acts{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 6px}
.cg-proj-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:999px;font:500 13px/1 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:.01em;text-decoration:none;transition:background .2s,border-color .2s,color .2s}
.cg-proj-btn.dark{background:var(--ink);color:#1b1a18}
.cg-proj-btn.dark:hover{background:#ffffff}
.cg-proj-btn.line{border:1px solid var(--rule);color:var(--ink)}
.cg-proj-btn.line:hover{border-color:var(--ink)}
.cg-proj-btn:focus-visible{outline:1.5px solid var(--ink);outline-offset:3px}
.cg-proj-btn[hidden]{display:none}
.cg-proj h3{margin:24px 0 6px;color:var(--label);font-weight:500}
.cg-proj p{margin:0;color:#dcd8d0}
.cg-proj ul{margin:0;padding-left:18px;color:#dcd8d0}
.cg-proj li{margin:0 0 6px}
.cg-proj-tags{display:flex;flex-wrap:wrap;gap:6px}
.cg-proj-tags span{padding:5px 10px 4px;border:1px solid var(--rule);border-radius:999px;font:500 11px/1 var(--mono);color:var(--ink)}
@container cg (max-width: 760px){.cg-projecting .cg-now{opacity:0}.cg-now{transition:opacity .4s}.cg-proj{left:0;right:0;top:auto;bottom:0;width:auto;max-height:82%;padding:20px 22px 28px;border-radius:18px 18px 0 0;background:rgba(24,23,22,.93);transform:translateY(28px)}.cg-projecting .cg-proj{transform:none}.cg-proj-name{font-size:28px}}
@media (max-height:700px){.cg-keys li.cg-fine:nth-child(-n+2){display:none}}
@media (max-height:500px){.cg-keys{display:none}}
.cg-keys li{display:flex;align-items:center;gap:9px}
.cg-keys li.cg-coarse{display:none}
@media (hover:none) and (pointer:coarse){.cg-keys li.cg-coarse{display:flex}.cg-keys li.cg-fine{display:none}}
.cg-keys kbd{box-sizing:border-box;min-width:19px;padding:4px 5px 3px;border:1px solid var(--rule);border-radius:3px;font:500 10px/1 var(--mono);letter-spacing:.02em;text-align:center;color:var(--ink);text-transform:none}
.cg-id,.cg-tools,.cg-keys,.cg-now,.cg-copy{transition:color .4s;text-shadow:0 1px 3px rgba(10,9,8,.55)}
.cg-id *,.cg-tools *,.cg-keys *,.cg-now *,.cg-copy *{transition:color .4s,border-color .4s}
.cg-now{position:absolute;left:max(24px,env(safe-area-inset-left));bottom:max(22px,env(safe-area-inset-bottom));margin:0;display:flex;flex-direction:column;gap:6px;pointer-events:none}
.cg-now-k{color:var(--label)}
.cg-now-t{font:500 11px/1 var(--mono);letter-spacing:.01em}
.cg-now-t:empty{display:none}
.cg-copy{position:absolute;left:50%;bottom:max(22px,env(safe-area-inset-bottom));margin:0;transform:translateX(-50%);white-space:nowrap;color:var(--label);pointer-events:none}
.cg-flame{position:absolute;left:50%;bottom:max(52px,calc(env(safe-area-inset-bottom) + 40px));width:56px;height:56px;padding:0;border-radius:50%;display:grid;place-items:center;background:#2a2826;border:1px solid var(--rule);opacity:0;visibility:hidden;transform:translate(-50%,6px);transition:opacity .2s,transform .2s,visibility 0s .2s,background .12s,border-color .12s;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
.cg-lighter .cg-flame{opacity:1;visibility:visible;transform:translate(-50%,0);transition:opacity .2s,transform .2s,visibility 0s,background .12s,border-color .12s}
.cg-flame svg{width:22px;height:22px;fill:var(--label);transition:fill .12s}
.cg-flame[aria-pressed='true']{background:#f1d6bb;border-color:#a8622e}
.cg-flame[aria-pressed='true'] svg{fill:#9a4a14}
.cg-flame:focus-visible{outline:1.5px solid var(--ink);outline-offset:3px}
@container cg (max-width: 600px){.cg-keys{display:none}.cg-id{max-width:52%}.cg-tools{flex-direction:column;align-items:flex-end;gap:0}.cg-txt{padding:5px 8px}.cg-copy{bottom:max(72px,calc(env(safe-area-inset-bottom) + 60px))}.cg-flame{bottom:max(100px,calc(env(safe-area-inset-bottom) + 88px))}}
.cg-root{container:cg/inline-size}
`
const UI = `<div class="cg-ui">
  <div class="cg-veil" data-act="proj-close" aria-hidden="true"></div>
  <aside class="cg-proj" aria-labelledby="cg-proj-name" hidden>
    <button class="cg-txt cg-cap cg-proj-close" data-act="proj-close"><span>&larr; back to the projects</span></button>
    <p class="cg-proj-k cg-cap" data-p="k"></p>
    <h2 class="cg-proj-name" id="cg-proj-name" data-p="name"></h2>
    <p class="cg-proj-line" data-p="line"></p>
    <div class="cg-proj-acts"><a class="cg-proj-btn dark" data-p="live" target="_blank" rel="noopener">Visit the live site <span aria-hidden="true">&nearr;</span></a><a class="cg-proj-btn line" data-p="github" target="_blank" rel="noopener">GitHub <span aria-hidden="true">&nearr;</span></a></div>
    <h3 class="cg-cap">What it is</h3><p data-p="what"></p>
    <h3 class="cg-cap">What I built</h3><p data-p="built"></p>
    <h3 class="cg-cap">Challenges</h3><ul data-p="challenges"></ul>
    <h3 class="cg-cap">Stack</h3><div class="cg-proj-tags" data-p="stack"></div>
  </aside>
  <p class="cg-id cg-cap"><span class="cg-id-name" data-id="name"></span><span class="cg-id-role" data-id="role"></span></p>
  <button class="cg-os cg-cap" data-act="os">use the player's screen</button>
  <div class="cg-tools">
    <button class="cg-txt cg-cap" data-act="back" hidden><span>&larr; back</span></button>
    <button class="cg-txt cg-cap" data-act="all"><span>step back</span></button>
    <button class="cg-txt cg-cap" data-act="sound" aria-pressed="false"><span class="off">sound off</span><span class="on">sound on</span></button>
    <button class="cg-txt cg-cap" data-act="reset"><span>reset</span></button>
  </div>
  <ul class="cg-keys cg-cap" aria-label="Controls">
    <li class="cg-fine"><kbd>drag</kbd>look around</li>
    <li class="cg-fine"><kbd>double-click</kbd>closer</li>
    <li class="cg-fine"><kbd>P</kbd>power</li>
    <li class="cg-fine"><kbd>Esc</kbd>back</li>
    <li class="cg-fine"><kbd>Space</kbd>light</li>
    <li class="cg-fine"><kbd>L</kbd>lamp</li>
    <li class="cg-coarse"><kbd>drag</kbd>look around</li>
    <li class="cg-coarse"><kbd>double-tap</kbd>closer</li>
    <li class="cg-coarse"><kbd>hold</kbd>pick up</li>
  </ul>
  <p class="cg-now"><span class="cg-now-k cg-cap">sound off</span><span class="cg-now-t"></span></p>
  <p class="cg-copy cg-cap" data-id="copy"></p>
  <button class="cg-flame" data-flame aria-label="Hold to light the lighter" aria-pressed="false" aria-hidden="true" tabindex="-1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 2.2c.9 3.6 5.6 6.2 5.6 11.6a5.8 5.8 0 0 1-11.6 0c0-3.2 1.8-4.9 3-6.7.3 2 1.2 3.3 2.4 3.8-.6-3.4.3-6.3.6-8.7z"/></svg></button>
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
  const initSteps = []
  // (between heavy steps of the set-up, the page gets the main thread back)
  const yieldNow = () => (globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise((r) => setTimeout(r, 0)))
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
    // (who this is: from the portfolio's content)
    root.querySelector('[data-id="name"]').textContent = portfolio.name
    root.querySelector('[data-id="role"]').textContent = portfolio.role
    root.querySelector('[data-id="copy"]').textContent = `\u00a9 ${new Date().getFullYear()} ${portfolio.name}`
    container.appendChild(root)


    let renderer
    try {
      // (the canvas only ever receives finished frames, copied whole: opaque, so the browser does
      // not blend it with the page behind it, and without a depth buffer of its own, which nothing
      // would use. The context is made here: three.js always asks for one with alpha)
      const cv = document.createElement('canvas')
      const gl = cv.getContext('webgl2', { alpha: false, depth: false, stencil: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' })
      if (!gl) throw new Error('no WebGL 2')
      renderer = new THREE.WebGLRenderer({ canvas: cv, context: gl, depth: false, stencil: false })
    } catch {
      handle.failed = true
      root.classList.add('cg-fallback')
      return
    }
    renderer.setPixelRatio(pixelRatio())
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.NeutralToneMapping // (a product shot's: colours as they are, light parts unclipped)
    renderer.toneMappingExposure = 1.0
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.VSMShadowMap // (soft, blurred: the key's shadows are short and diffuse)
    renderer.shadowMap.autoUpdate = false
    // (the earbud tips' translucency samples the scene behind them, blurred: as the standalone
    // earbuds had it, half resolution, indistinguishable from full)
    const canvas = renderer.domElement
    canvas.className = 'cg-canvas'
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', 'A desk at dusk against a plain warm white wall, lit by a cream and brass desk lamp: a white music player with wired earbuds plugged in on a sage felt mat, a stoneware ashtray with a lit cigarette and a lighter, a graphite laptop open on a browser with a tab for each project, a can of "late.", a notebook, and on the wall a white pegboard with sticky notes, a calendar, a postcard and an ID badge.')
    stageEl.appendChild(canvas)

    // ---- the workers: every mesh and texture built off this thread, side by side (up to three:
    // one worker took them one after another, and the loader waited for the sum; a spare core
    // is left to this thread)
    const workers = []
    for (let k = Math.max(2, Math.min(3, (navigator.hardwareConcurrency || 4) - 1)); k > 0; k--) {
      try {
        workers.push({ w: new Worker(new URL('./core/worker.js', import.meta.url), { type: 'module' }), load: 0 })
      } catch {
        break
      }
    }
    const endWorkers = () => {
      for (const x of workers.splice(0)) x.w.terminate()
    }
    cleanups.push(endWorkers)
    let jid = 0
    const pending = new Map()
    for (const x of workers)
      x.w.onmessage = (e) => {
        pending.get(e.data.id)?.(e.data)
        pending.delete(e.data.id)
        // (nothing is asked of them after the build: they go, with their memory)
        if (!pending.size) endWorkers()
      }
    /** A job for the least loaded worker (`cost`: about how long it takes, relative to the others). */
    const job = (msg, cost) => {
      if (!workers.length) return Promise.reject(new Error('no worker'))
      const x = workers.reduce((a, b) => (b.load < a.load ? b : a))
      x.load += cost
      return new Promise((res) => {
        const id = ++jid
        pending.set(id, res)
        x.w.postMessage({ ...msg, id })
      })
    }
    // (in the order the build below needs them: each worker takes its own one after another)
    const bakeJob = job({ type: 'bake' }, 2)
    // (the room's textures: wanted first, as soon as the environment is made)
    const roomJob = job({ type: 'room', L: ROOM }, 1.5)
    const budJob = job({ type: 'earbud', name: 'bud' }, 12)
    const remoteJob = job({ type: 'earbud', name: 'remote' }, 8)
    const earTexJob = job({ type: 'earbudsTex' }, 0.5)
    const collisionJob = job({ type: 'collision' }, 7)
    const trayJob = job({ type: 'tray', h: Q.trayH }, 17)
    const lighterJob = job({ type: 'lighter', h: Q.lighterH }, 3)
    const curlJob = job({ type: 'curl' }, 1)
    // (the laptop's bead-blast and its deck's wear, from its keys' layout)
    const laptopJob = job({ type: 'laptop', keys: keyLayout(), well: WELL, pad: PAD, deck: [LAPTOP.w, LAPTOP.d] }, 0.4)

    const scene = new THREE.Scene()
    // (no scene.background: a colour background makes three.js clear before every render, even
    // the frame cache's region pass drawn over the restored cache; the clears are explicit, black)
    const camera = new THREE.PerspectiveCamera(15, 1, 6, 9000)

    // ---- the studio: bright, soft and neutral, a large soft panel overhead and one long highlight
    // strip (what the glossy parts and the metal catch)
    // ---- the room as the glossy things see it (their reflections): dim and warm at dusk, the lamp a
    // small bright warm spot above the desk's back left, the window's cool light to the right, the
    // wall behind the desk and the white desk under it
    function studioEnv() {
      const env = new THREE.Scene()
      env.background = new THREE.Color(0.075, 0.068, 0.062)
      const geo = new THREE.PlaneGeometry(1, 1)
      const panel = (w, h, pos, k, tint) => {
        const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(...tint).multiplyScalar(k), side: THREE.DoubleSide })
        const mesh = new THREE.Mesh(geo, m)
        mesh.scale.set(w, h, 1)
        mesh.position.set(...pos)
        mesh.lookAt(0, 0, 0)
        env.add(mesh)
        return m
      }
      const at = (u, v, y) => [LAYOUT.RIGHT[0] * u - LAYOUT.FWD[0] * v, y, LAYOUT.RIGHT[2] * u - LAYOUT.FWD[2] * v]
      const mats = [
        panel(300, 300, at(-700, -380, 1500), 16, [1, 0.84, 0.64]), // (the lamp)
        panel(1600, 1150, at(2000, 300, 650), 0.62, [0.74, 0.83, 1]), // (the window)
        panel(3200, 2000, at(0, -2000, 400), 0.08, [0.95, 0.9, 0.84]), // (the wall behind the desk: warm white)
        panel(3200, 2000, at(0, 2000, 400), 0.08, [0.9, 0.9, 0.95]), // (the room behind)
        panel(3200, 3200, [0, -1700, 0], 0.3, [1, 0.95, 0.88]), // (the desk under it all)
        panel(3600, 3600, [0, 2200, 0], 0.2, [0.95, 0.92, 0.88]), // (the ceiling, faintly lit)
      ]
      const pm = new THREE.PMREMGenerator(renderer)
      const t = pm.fromScene(env, 0.02, 10, 6000).texture
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
    scene.environmentIntensity = 1.0

    // ---- where things lie (mm; the ashtray at the origin), in the view's own axes: u to the right
    // of the picture, v down it; the view looks along FWD (layout.js: shared with the cable's
    // settling tool)
    const FWD = new THREE.Vector3(...LAYOUT.FWD)
    const RIGHT = new THREE.Vector3(...LAYOUT.RIGHT)
    const DESK = {
      player: new THREE.Vector3(LAYOUT.PLAYER.x, 0, LAYOUT.PLAYER.z), // the hero, in the middle
      lighter: new THREE.Vector3(...LAYOUT.DESK.lighter), // by the ashtray, to the right
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
    // (4: the still life is seen from nearly above, where more buys nothing and costs bandwidth)
    const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy())
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

    // (the frame's tone mapping, core/frame.js's composite (PBR Neutral), undone: what must show its
    // own colours on the screen, the player's page, gives this light)
    const NEUTRAL_INV = /* glsl */ `
      float neutralInv(float w) {
        if (w < 0.04) return sqrt(max(w, 0.0) / 6.25);
        if (w < 0.76) return w + 0.04;
        return 0.0576 / (1.0 - min(w, 0.995)) - 0.24 + 0.76 + 0.04;
      }
      vec3 neutralInv(vec3 c) { return vec3(neutralInv(c.r), neutralInv(c.g), neutralInv(c.b)); }`

    // ---- the room (objects/room.js): a matte white desk against a plain warm white wall, a cork
    // board in an oak frame on it with the owner's notes, this month's calendar, a postcard, a ticket,
    // a clipped sketch and a pin for the ID badge. Its textures come from the worker; its paper's
    // print needs its fonts: Inter (the player's) and a handwriting face for the notes
    const FONT = '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif'
    const HAND = '"Caveat", "Segoe Print", "Bradley Hand", cursive'
    await Promise.race([
      Promise.all([
        typeof FontFace !== 'undefined' ? new FontFace('Caveat', `url(${caveatUrl})`, { weight: '600' }).load().then((f) => document.fonts.add(f)) : null,
        typeof FontFace !== 'undefined' && opts.fontUrl ? new FontFace('Inter', `url(${opts.fontUrl})`, { weight: '100 900' }).load().then((f) => document.fonts.add(f)) : null,
      ]).catch(() => {}),
      new Promise((r) => setTimeout(r, 4000)),
    ])
    const roomBaked = await roomJob.catch(() => null) // (no worker: the room bakes them itself)
    if (destroyed) return
    const room = createRoom({
      baked: roomBaked?.tex,
      fwd: LAYOUT.FWD,
      right: LAYOUT.RIGHT,
      font: FONT,
      handFont: HAND,
      anisotropy: Math.min(4, renderer.capabilities.getMaxAnisotropy()),
      notes: [
        { color: '#f4e38c', lines: ["hi, I'm Krish", 'I build AI', 'people can', 'actually use'] },
        { color: '#c6e6d3', lines: ['rule no. 1:', 'cite sources,', 'never guess', 'the numbers'] },
        { color: '#f6cbb1', lines: ['psst —', 'click things', 'on the desk'] },
      ],
    })
    scene.add(room.group)
    // (the desk: what used to be the ground; the shadows fall on it, the wall and the board. The
    // wall's parts and the paper mark themselves)
    const ground = room.desk
    for (const m of [room.desk, room.wall, ...room.boardMeshes]) m.userData.takesShadow = true
    for (const m of room.litMaterials) withEmber(m)
    step('room')
    await yieldNow()

    // ---- lights: dusk, and a desk lamp. The lamp (objects/lamp.js: a cream and brass spring lamp
    // at the back left, switched by a tap, aimed by a drag on its head) is the key: a warm spotlight
    // from its bulb along its shade, its soft shadow the only one cast (onto the desk, the mat, the
    // wall and the board), as bright as the lamp's own glow (lamp.level). Round it the room is dim:
    // a cool dusk sky from all round, a window's last light from the right, and the ember and the
    // flame themselves
    const lamp = createLamp({
      base: new THREE.Vector3(...LAYOUT.DESK.lampBase).setY(ROOM.deskY),
      head: new THREE.Vector3(...LAYOUT.DESK.lampHead),
      aim: new THREE.Vector3(...LAYOUT.DESK.lampAim),
      anisotropy: aniso,
    })
    scene.add(lamp.group)
    // (candela: its light falls off with the square of the distance; the middle of its pool, half a
    // metre away, as bright as the old overhead key)
    const LAMP_CD = 7.2e5
    const key = new THREE.SpotLight(0xffe2c4, LAMP_CD, 0, 1.08, 0.85, 2)
    key.position.copy(lamp.bulb)
    key.target.position.copy(lamp.bulb).addScaledVector(lamp.axis, 400)
    key.target.updateMatrixWorld()
    key.castShadow = true
    key.shadow.mapSize.set(Q.shadow, Q.shadow)
    key.shadow.camera.near = 40
    key.shadow.camera.far = 1400
    // (soft: a lamp's head is small, but its light spreads off the inside of the shade)
    key.shadow.bias = -0.0005
    key.shadow.normalBias = 0.6
    key.shadow.radius = 7
    key.shadow.blurSamples = 15
    scene.add(key, key.target)
    // the window's last light, from the right, cool
    const rim = new THREE.DirectionalLight(0x9fb6e8, 0.32)
    scene.add(rim, rim.target)
    // the dusk sky in the room, and the warm bounce off the desk under it
    const fill = new THREE.HemisphereLight(0xb4c0dc, 0x9a8470, 1.0)
    scene.add(fill)
    // (the room behind the viewer, lit by the lamp too, gives back a little warm light: the wall and
    // the board face it. A far, soft light from behind and above the chair, without a shadow; the
    // green wall's main light, enough for its grooves and the board's edges to read. It dims with
    // the lamp, to what the dusk alone gives back)
    const bounce = new THREE.DirectionalLight(0xffe9d4, 0.75)
    bounce.position.set(...LAYOUT.deskAt(-200, 1600, 900))
    bounce.target.position.set(...LAYOUT.deskAt(-40, -300, 300))
    scene.add(bounce, bounce.target)
    bounce.target.updateMatrixWorld()
    // (three.js lights only what the camera's layers include: these light every layer, the frame
    // cache's region layer too)
    for (const l of [key, rim, fill, bounce]) l.layers.enableAll()
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

    // ---- shaders, as soon as there is something to compile them for: three.js compiles a
    // material's program for the lights, the environment and the kind of target it will be drawn
    // with, all of which are known from here on; the driver compiles in the background (where it
    // can) while the workers are still meshing, and the loader no longer waits for the one after
    // the other. (A small target of the frame's own kind: a program is keyed by its output.)
    const warmTarget = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: Q.msaa })
    let warmOn = true
    const warm = () => {
      if (!warmOn || destroyed) return
      renderer.setRenderTarget(warmTarget)
      renderer.compile(scene, camera)
      renderer.setRenderTarget(null)
    }
    warm()
    stage('desk', 'done')
    // ---- the earbuds (objects/earbuds.js): their meshes, textures and collision shapes from the worker
    stage('earbuds', 'start')
    const [budMesh, remoteMesh, earTex, collision] = await Promise.all([budJob, remoteJob, earTexJob, collisionJob])
    step('earbuds meshed (worker)')
    if (destroyed) return
    // (bone by default: on the dark desk the lightest of the three reads best; all three stay)
    const earbuds = await createEarbudsAsync({ renderer, meshes: { bud: budMesh.mesh, remote: remoteMesh.mesh }, textures: earTex.tex, colorway: 'black' }, yieldNow)
    scene.add(earbuds.group)
    for (const m of earbuds.materials) if (m.isMeshStandardMaterial) withEmber(m)
    step('earbuds built')
    warm()
    stage('earbuds', 'done')
    await yieldNow()

    // ---- the music player (objects/player.js): centre left, face up, its jack towards the viewer;
    // the earbuds plugged into it, their cable settled across the desk (earbudsLive.js, tools/settle.mjs)
    // ---- Pod OS (os/): the texture the player's glass shows, painted by the OS once it has booted
    // (stage 'os'); up close, the OS's own page laid exactly over the glass instead (stepOS)
    let os = null
    let osUp = false // (the page is the screen now)
    let projOpen = null // (a project open beside the player: its id)
    let podSlide = false // (the camera sliding between two views of the player: its page stays up, following it)
    let osAlpha = 0 // (the page's opacity: it fades in over the texture, and out)
    let glare = 1 // (the glass's reflections: 1 across the desk, 0 up close on a lit screen)
    let screenBusy = false // (the glass's pixels change this frame: the page painted, its light easing)
    const osCanvas = document.createElement('canvas')
    osCanvas.width = TEX_W
    osCanvas.height = TEX_H
    const osTex = new THREE.CanvasTexture(osCanvas)
    // (its bytes as they are: filtered, and mipmapped, in sRGB as the page's own text is drawn; the
    // glass's shader decodes them)
    osTex.colorSpace = THREE.NoColorSpace
    osTex.flipY = false
    osTex.anisotropy = aniso
    stage('player', 'start')
    const player = await createPlayerAsync(THREE, { anisotropy: aniso, fontUrl: opts.fontUrl, screenTexture: osTex, screenEmissive: 1 }, yieldNow)
    disposables.push(osTex)
    // (the OS's colours through the frame's tone mapping, core/frame.js's composite: the glass
    // undoes it for the light it gives, so the lit screen shows the page's own colours)
    const glassMat = player.meshes.find((m) => m.name === 'player.screen').material
    const GLARE = { clearcoat: glassMat.clearcoat, specularIntensity: glassMat.specularIntensity, envMapIntensity: glassMat.envMapIntensity }
    glassMat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\n${NEUTRAL_INV}`)
        .replace(
          '#include <emissivemap_fragment>',
          /* glsl */ `#ifdef USE_EMISSIVEMAP
          totalEmissiveRadiance *= neutralInv(sRGBTransferEOTF(texture2D(emissiveMap, vEmissiveMapUv)).rgb);
          #endif`,
        )
    }
    glassMat.customProgramCacheKey = () => 'player.screen.pos'
    step('player built')
    await yieldNow()
    player.group.position.copy(DESK.player)
    player.group.rotation.y = LAYOUT.PLAYER.yaw
    player.syncFrame()
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
    // (the glass's own frame: its corners, in the player's)
    const GX0 = (GLASS.x0 - 331.5) * 0.1
    const GZ0 = (GLASS.y0 - 594.5) * 0.1
    const GX1 = GX0 + GLASS.w * 0.1
    const GZ1 = GZ0 + GLASS.h * 0.1
    const GY = 10.12 // (the glass's height, objects/player.js: HG)
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
      onPlug: (on) => audio.setPlugged(on),
      onTap: (part) => {
        // (the remote's button: play and pause, as on any wired earbuds)
        if (part === 'remote') audio.setPlaying(!audio.playing)
      },
    })
    step('earbuds plugged in, settled')
    await yieldNow()
    warm()
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
    for (const m of [trayMat, buttMats.body, crumb.material, woodMat, head.material, flakeMat, ...cigs.flatMap((q) => [q.mats.body, q.mats.ash, q.mats.tobacco])]) withEmber(m)
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
    warm()
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
    const rest = { x: DESK.lighter.x, z: DESK.lighter.z, theta: Math.atan2(FWD.z, FWD.x) + LAYOUT.DESK.lighterTurn }
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

    // ---- the badge (objects/badge.js): the owner's ID card, above the player
    const texLoader = new THREE.TextureLoader()
    const [badgeFace, badgeBack] = await Promise.all([texLoader.loadAsync(badgeFaceUrl), texLoader.loadAsync(badgeBackUrl)])
    const badgeTop = new THREE.Vector3().copy(RIGHT).multiplyScalar(Math.cos(LAYOUT.DESK.badgeTurn)).addScaledVector(FWD, Math.sin(LAYOUT.DESK.badgeTurn))
    const badge = createBadge({
      faceTex: badgeFace,
      backTex: badgeBack,
      rest: { x: LAYOUT.DESK.badge[0], z: LAYOUT.DESK.badge[2], theta: Math.atan2(badgeTop.z, badgeTop.x) },
      sdf: deskSdf,
      sdfGrad: deskSdfGrad,
      anisotropy: aniso,
    })
    scene.add(badge.root)
    disposables.push({ dispose: () => badge.dispose() })
    // (hung on the board: its ring over a pin, a few millimetres off the cork, a little crooked)
    {
      const n = room.boardOut
      const down = new THREE.Vector3(0, -1, 0)
      const tilt = 0.06
      const across = new THREE.Vector3().crossVectors(n, down).applyAxisAngle(n, tilt)
      down.applyAxisAngle(n, tilt)
      const ring = room.badgePin.clone().addScaledVector(n, 5)
      // (the ring's centre in the card's frame: (0, 1.3, -45.7), the card's top towards -z: the
      // card's middle hangs 45.7 mm below the ring)
      const o = ring.clone().addScaledVector(n, -1.3).addScaledVector(down, 45.7)
      badge.group.matrix.makeBasis(across, n, down).setPosition(o)
      badge.group.matrixWorldNeedsUpdate = true
    }
    step('badge')

    // ---- the visitors' book (objects/notebook.js, visitors/book.js): an A5 notebook to the right of
    // the ashtray; a tap closes in on it and opens it
    const notebook = createNotebook({ at: LAYOUT.DESK.notebook, y: -MAT.t, turn: LAYOUT.PLAYER.yaw + LAYOUT.DESK.notebookTurn, anisotropy: aniso })
    scene.add(notebook.group)

    // ---- the desk mat (objects/deskMat.js): wool felt under the still life, the notebook beside it
    const deskMat = createDeskMat({ fwd: LAYOUT.FWD, right: LAYOUT.RIGHT, colors: MAT_COLORS[MAT_COLOR], anisotropy: aniso })
    scene.add(deskMat.group)
    for (const m of deskMat.materials) withEmber(m)
    for (const m of deskMat.meshes) m.userData.takesShadow = true
    disposables.push({ dispose: () => deskMat.dispose() })
    disposables.push({ dispose: () => notebook.dispose() })
    const notebookBox = boxOf(null, [74, 3.5, 105], 1.5, 3.5, 135)
    notebookBox.set(notebook.group.matrixWorld)
    deskBoxes.push(notebookBox)

    // ---- the laptop (objects/laptop.js): at the back, graphite, its display a browser with a tab for
    // each project (a tap on a tab switches to it; up close, a drag or the wheel scrolls the page),
    // its keys pressed by a tap, its keyboard lit when the lamp is off
    const laptopBaked = await laptopJob.catch(() => null)
    if (destroyed) return
    const laptop = createLaptop({ at: [LAYOUT.DESK.laptop[0], ROOM.deskY, LAYOUT.DESK.laptop[2]], yaw: LAYOUT.PLAYER.yaw + LAYOUT.DESK.laptopTurn, projects: portfolio.projects, font: FONT, anisotropy: aniso, baked: laptopBaked?.tex })
    scene.add(laptop.group)
    disposables.push(laptop)
    // (behind the loader the lid is shut: it opens as the visitor comes in, handle.enter)
    let lidShut = false
    if (opts.hold && !reduceMotion) {
      laptop.setOpen(0)
      laptop.update(10)
      lidShut = true
    }
    const laptopBox = boxOf(null, LAPTOP.box.half, LAPTOP.box.r, LAPTOP.box.y, 200)
    laptopBox.set(laptop.group.matrixWorld)
    deskBoxes.push(laptopBox)

    // ---- what the energy drink (and anything else falling there) meets: boxes in their own
    // frames, the wall, the mat's edge (a 3 mm step), the lamp's foot, the ashtray
    const obstacles = []
    const obsP = new THREE.Vector3()
    /** A box (half extents, its middle) in the frame of the matrix `m` (world from local). */
    function addObstacle(m, half, mid, r = 1) {
      obstacles.push({ inv: new THREE.Matrix4().copy(m).invert(), half, mid, r })
    }
    const rbox = (x, y, z, h, r) => {
      const qx = Math.abs(x) - h[0] + r
      const qy = Math.abs(y) - h[1] + r
      const qz = Math.abs(z) - h[2] + r
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r
    }
    // (the laptop: its base, and the space its open lid fills, as one box)
    addObstacle(laptop.group.matrixWorld, [154, 104, (215 + laptop.footprint.back + 4) / 2], [0, 104, (107.5 + 2 - 107.5 - laptop.footprint.back - 2) / 2])
    addObstacle(notebook.group.matrixWorld, [76, 4, 107], [0, 3.5, 0])
    addObstacle(deskMat.group.matrix, [(MAT.u1 - MAT.u0) / 2, 1.5, (MAT.v1 - MAT.v0) / 2], [(MAT.u0 + MAT.u1) / 2, -1.5, (MAT.v0 + MAT.v1) / 2], 0.8)
    const lampFoot = new THREE.Vector3(...LAYOUT.DESK.lampBase)
    const FWDv = new THREE.Vector3(...LAYOUT.FWD)
    function obstacleSdf(x, y, z) {
      // the wall
      let d = -(x * FWDv.x + z * FWDv.z) - ROOM.wallV
      // the lamp's foot
      d = Math.min(d, Math.max(Math.hypot(x - lampFoot.x, z - lampFoot.z) - LAMP.footR, y - (ROOM.deskY + LAMP.footH)))
      d = Math.min(d, ashtraySDF(x, y, z))
      for (const o of obstacles) {
        obsP.set(x, y, z).applyMatrix4(o.inv)
        d = Math.min(d, rbox(obsP.x - o.mid[0], obsP.y - o.mid[1], obsP.z - o.mid[2], o.half, o.r))
      }
      return d
    }
    function obstacleSdfGrad(x, y, z, g) {
      const d = obstacleSdf(x, y, z)
      const e = 0.3
      g[0] = obstacleSdf(x + e, y, z) - d
      g[1] = obstacleSdf(x, y + e, z) - d
      g[2] = obstacleSdf(x, y, z + e) - d
      const l = Math.hypot(g[0], g[1], g[2]) || 1
      g[0] /= l
      g[1] /= l
      g[2] /= l
      return d
    }
    // ---- the drink (objects/can.js): a can of "late.", sealed, by the laptop's right corner. Up close
    // the first tap opens it; then a tap high on it (or a flick) knocks it over, and open, it spills; a
    // tap low on it rocks it. (Its brand faces the room, turned a little)
    const canHome = new THREE.Vector3(LAYOUT.DESK.can[0], ROOM.deskY, LAYOUT.DESK.can[2])
    const can = createCan({
      home: canHome,
      yaw: Math.atan2(LAYOUT.FWD[2], -LAYOUT.FWD[0]) + 0.35,
      sdf: (x, y, z, g) => obstacleSdfGrad(x, y, z, g),
      floorY: ROOM.deskY,
      // (where it may lie: clear of all that, and of the mat, and of the player and the lighter)
      clear: (x, z) => {
        let d = obstacleSdf(x, ROOM.deskY + 26, z)
        const u = x * LAYOUT.RIGHT[0] + z * LAYOUT.RIGHT[2]
        const v = -(x * LAYOUT.FWD[0] + z * LAYOUT.FWD[2])
        if (deskMat.contains(u, v)) d = Math.min(d, -1)
        else d = Math.min(d, Math.hypot(Math.max(MAT.u0 - u, 0, u - MAT.u1), Math.max(MAT.v0 - v, 0, v - MAT.v1)))
        return d
      },
      font: FONT,
      anisotropy: aniso,
      // (a fall's landing, full; its base slapping the desk as it rocks, softer by the blow)
      onLand: (k = 1) => audio.click(k >= 1 ? 0.8 : 0.4 * k),
      // (the seal broken: the crack and the hiss)
      onOpen: () => audio.canOpen(),
    })
    scene.add(can.group, can.puddle, can.drops, ...can.extras)
    disposables.push(can)
    let bookPending = false
    const book = createVisitorsBook({ host: root, onClose: () => wake() })
    cleanups.push(() => book.dispose())
    function openBook() {
      bookPending = false
      if (projOpen) leaveProject()
      book.open()
      wake()
    }

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

    // ---- the camera: through a long lens (about 90 mm on a full frame: the picture's shorter side
    // sees 15.2 degrees), so the room reads calm and graphic. Its views:
    //   home    seated at the desk: the whole desk at a slant, the lamp, the laptop and the board on
    //           the wall behind it
    //   player  close on the player from nearly straight above, its screen at the top: Pod OS is
    //           live there (a tap on the player or its screen)
    //   board   in front of the board, square to it, as if leaning in from the chair
    //   laptop  square to its display
    //   (every other close-up looks straight down onto its object, the wall at the top: focusTargets)
    const LENS = THREE.MathUtils.degToRad(15.2)
    const SEAT_EL = THREE.MathUtils.degToRad(36)
    const PLAYER_EL = THREE.MathUtils.degToRad(84)
    const BOARD_EL = THREE.MathUtils.degToRad(7)
    const DOWN_EL = THREE.MathUtils.degToRad(80)
    const HOME = { target: new THREE.Vector3(), pos: new THREE.Vector3(), dist: 1000, az: 0, el: SEAT_EL }
    const PLAYERV = { target: new THREE.Vector3(), pos: new THREE.Vector3(), dist: 1000, az: 0, el: PLAYER_EL }
    const BOARDV = { target: new THREE.Vector3(), pos: new THREE.Vector3(), dist: 1000, az: 0, el: BOARD_EL }
    const LAPTOPV = { target: new THREE.Vector3(), pos: new THREE.Vector3(), dist: 1000, az: 0, el: 0.35 }
    root.querySelector('[data-act="all"]').hidden = true
    // (a project open: the player moved to the left third, the project told on the right; on a narrow
    // screen it stays where it is, under the sheet)
    const PROJ = { target: new THREE.Vector3(), pos: new THREE.Vector3() }
    const narrowUI = () => canvas.clientWidth <= 760
    const viewFrom = (V, up, el) => {
      V.pos.copy(up).multiplyScalar(-Math.cos(el) * V.dist).add(V.target)
      V.pos.y += Math.sin(el) * V.dist
      V.az = Math.atan2(V.pos.x - V.target.x, V.pos.z - V.target.z)
    }
    // (seated: what must be in the picture, in the view's own axes [u, v, height]: the front of
    // the desk's things (the earbuds, the notebook's corner), the lamp's foot and its elbow, the
    // board's top corners (from ROOM.board: the picture follows the board); a tall screen keeps to
    // the middle of it. A wide screen is filled by height, from the board's top to the desk's front:
    // the still life stands in its middle, the desk and the wall either side)
    const uvOf = (p) => [p.x * RIGHT.x + p.z * RIGHT.z, -(p.x * FWD.x + p.z * FWD.z), p.y]
    const BD = ROOM.board
    const footUv = uvOf(lampFoot)
    const SEAT_WIDE = [
      [-375, 135, 0],
      [290, 165, 0],
      [footUv[0] - LAMP.footR, footUv[1], 0],
      uvOf(lamp.elbow),
      [BD.u - BD.w / 2 - 10, ROOM.wallV, BD.y0 + BD.h],
      [BD.u + BD.w / 2 + 10, ROOM.wallV, BD.y0 + BD.h],
    ]
    const SEAT_TALL = [
      [-210, 130, 0],
      [230, 150, 0],
      [-140, ROOM.wallV, BD.y0 + BD.h],
      [280, ROOM.wallV, BD.y0 + BD.h],
    ]
    // (fitted through the camera itself: the desk's front is much nearer than the wall, and a
    // perspective picture makes the near things larger; a few rounds of aim, look, adjust)
    const fitCam = new THREE.PerspectiveCamera()
    const fitP = new THREE.Vector3()
    const fitR = new THREE.Vector3()
    const fitU = new THREE.Vector3()
    function fitSeated(V, pts, tanV, tanH) {
      const world = pts.map(([u, v, y]) => new THREE.Vector3(...LAYOUT.deskAt(u, v, y)))
      // (aim first at the middle of it all)
      V.target.set(0, 0, 0)
      for (const p of world) V.target.add(p)
      V.target.divideScalar(world.length)
      V.dist = 3000
      fitCam.fov = camera.fov
      fitCam.aspect = camera.aspect
      fitCam.near = camera.near
      fitCam.far = camera.far
      fitCam.updateProjectionMatrix()
      for (let k = 0; k < 8; k++) {
        viewFrom(V, FWD, SEAT_EL)
        fitCam.position.copy(V.pos)
        fitCam.lookAt(V.target)
        fitCam.updateMatrixWorld()
        let x0 = Infinity
        let x1 = -Infinity
        let y0 = Infinity
        let y1 = -Infinity
        for (const p of world) {
          fitP.copy(p).project(fitCam)
          x0 = Math.min(x0, fitP.x)
          x1 = Math.max(x1, fitP.x)
          y0 = Math.min(y0, fitP.y)
          y1 = Math.max(y1, fitP.y)
        }
        // (the picture's middle onto the middle of what must be seen; then the distance so it
        // fills 92% of the tighter way)
        const half = V.dist * tanV
        fitR.setFromMatrixColumn(fitCam.matrixWorld, 0)
        fitU.setFromMatrixColumn(fitCam.matrixWorld, 1)
        V.target.addScaledVector(fitR, ((x0 + x1) / 2) * half * camera.aspect).addScaledVector(fitU, ((y0 + y1) / 2) * half)
        const fill = Math.max((x1 - x0) / 2, (y1 - y0) / 2)
        V.dist *= fill / 0.92
      }
      viewFrom(V, FWD, SEAT_EL)
    }
    const lapC = new THREE.Vector3()
    const lapN = new THREE.Vector3()
    const UP = new THREE.Vector3(0, 1, 0)
    /**
     * The laptop: along its display's own normal, turned 10 degrees to its right (the lamp's shade
     * stands in front of its left end: square on, it came into the picture's left edge). Again each
     * time the view goes to it: the lid may have moved since.
     */
    function fitLaptop(tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), tanH = tanV * camera.aspect) {
      laptop.screenCenter(lapC)
      laptop.screenNormal(lapN).applyAxisAngle(UP, 0.18)
      LAPTOPV.target.copy(lapC)
      LAPTOPV.dist = Math.max((212 + 60) / 2 / tanV, (304 + 70) / 2 / tanH)
      LAPTOPV.pos.copy(lapC).addScaledVector(lapN, LAPTOPV.dist)
      LAPTOPV.az = Math.atan2(LAPTOPV.pos.x - lapC.x, LAPTOPV.pos.z - lapC.z)
      LAPTOPV.el = Math.asin(THREE.MathUtils.clamp(lapN.y, -1, 1))
      return LAPTOPV
    }
    /** Every view for the screen's shape (the field of view: resize()). */
    function fitHome() {
      const tanV = camera.aspect >= 1 ? Math.tan(LENS / 2) : Math.tan(LENS / 2) / camera.aspect
      const tanH = tanV * camera.aspect
      fitSeated(HOME, camera.aspect < 0.9 ? SEAT_TALL : SEAT_WIDE, tanV, tanH)
      // the player: 76% of the picture's height at most, 80% of its width
      const PH = LAYOUT.PLAYER.half
      PLAYERV.target.set(LAYOUT.PLAYER.x, 5, LAYOUT.PLAYER.z)
      PLAYERV.dist = Math.max(((2 * PH[2]) / 0.76 / 2) * Math.sin(PLAYER_EL) / tanV, (2 * PH[0]) / 0.8 / 2 / tanH)
      viewFrom(PLAYERV, FWD, PLAYER_EL)
      // the board, with a margin round it
      BOARDV.target.copy(room.boardCenter)
      // (a tall screen crops the frame a little either side: what is pinned stays in)
      BOARDV.dist = Math.max((room.boardSize[1] + 70) / 2 / tanV, (camera.aspect < 0.9 ? 575 : room.boardSize[0] + 70) / 2 / tanH)
      viewFrom(BOARDV, FWD, BOARD_EL)
      fitLaptop(tanV, tanH)
      // the project view: the player's, slid so its middle is at 27% of the picture's width
      const shift = narrowUI() ? 0 : (0.5 - 0.27) * 2 * PLAYERV.dist * tanH
      PROJ.target.copy(PLAYERV.target).addScaledVector(RIGHT, shift)
      PROJ.pos.copy(PLAYERV.pos).addScaledVector(RIGHT, shift)
    }
    fitHome()
    {
      // the window's light: from the room's right, a little in front of the desk, low
      const c = new THREE.Vector3(...LAYOUT.deskAt(-40, -120))
      rim.position.copy(c).addScaledVector(RIGHT, 1400).addScaledVector(FWD, -300).add(new THREE.Vector3(0, 620, 0))
      rim.target.position.copy(c)
      rim.target.updateMatrixWorld()
    }
    // (the smoke's light: the lamp's direction, from far off)
    SU.uKeyPos.value.subVectors(key.position, key.target.position).setLength(4000).add(key.target.position)

    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enablePan = false
    controls.rotateSpeed = 0.35
    controls.zoomSpeed = 0.6
    const deg = THREE.MathUtils.degToRad
    /**
     * The orbit's range for a view (the focus's name; none: home). Each of the named views keeps to
     * a gentle range round itself, so its composition holds; a close-up opens up. Never round
     * behind the wall, nor under the desk.
     */
    function limitOrbit(name) {
      const V = !name || name === 'all' ? HOME : name === 'player' || name === 'project' ? PLAYERV : name === 'board' ? BOARDV : name === 'laptop' ? LAPTOPV : null
      if (V) {
        const polar = Math.PI / 2 - V.el
        const home = V === HOME
        controls.minPolarAngle = Math.max(0.02, polar - deg(home ? 12 : 6))
        controls.maxPolarAngle = Math.min(deg(86), polar + deg(home ? 10 : 12))
        controls.minAzimuthAngle = V.az - (home ? 0.4 : 0.3)
        controls.maxAzimuthAngle = V.az + (home ? 0.4 : 0.3)
        controls.minDistance = V.dist * (home ? 0.3 : 0.7)
        controls.maxDistance = HOME.dist * 1.15
      } else {
        controls.minPolarAngle = deg(2)
        controls.maxPolarAngle = deg(62)
        controls.minAzimuthAngle = HOME.az - 1.25
        controls.maxAzimuthAngle = HOME.az + 1.25
        controls.minDistance = 60
        controls.maxDistance = HOME.dist * 1.15
      }
    }
    limitOrbit(null)
    // (the view turned or zoomed by hand: the resize keeps it where it is, rather than taking it home)
    let orbited = false
    let dragFrom = null
    controls.addEventListener('start', () => {
      dragFrom = camera.position.clone()
    })
    controls.addEventListener('end', () => {
      if (dragFrom && camera.position.distanceTo(dragFrom) > 2) orbited = true
      dragFrom = null
    })
    // ---- the wheel (and a trackpad's pinch): the camera eased in and out, a notch a short glide,
    // never a jump (a touch pinch stays with the controls, it is smooth already)
    // (the distance followed in its logarithm, by a critically damped spring: each notch of a wheel
    // starts and ends softly, a run of them is one glide, and a zoom feels the same near and far)
    const zoom = { on: false, to: 0, l: new Float64Array(1), v: new Float64Array(1), t: new Float64Array(1) }
    // (a wheel's notches come a few hundred ms apart: between them the view may sit still, but the
    // gesture is not over. Until this time nothing is baked and the page stays off the glass)
    let gestureUntil = 0
    const zoomV = new THREE.Vector3()
    listen(
      canvas,
      'wheel',
      (e) => {
        if (grab.held || projOpen || focus.moving) return
        e.preventDefault()
        e.stopImmediatePropagation()
        // (up close on the laptop, over its display, the wheel or two fingers on a trackpad scroll its
        // page, in pixels, lines or pages as the event gives them; a pinch, ctrl and the wheel, still zooms)
        if (!e.ctrlKey && focus.focused === 'laptop' && overDisplay(e.clientX, e.clientY)) {
          laptop.scroll(e.deltaY, e.deltaMode)
          wake()
          return
        }
        const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY
        if (!zoom.on) {
          zoom.to = camera.position.distanceTo(controls.target)
          zoom.l[0] = Math.log(zoom.to)
          zoom.v[0] = 0
        }
        zoom.to = THREE.MathUtils.clamp(zoom.to * Math.exp(THREE.MathUtils.clamp(d, -120, 120) * 0.0016), controls.minDistance, controls.maxDistance)
        zoom.t[0] = Math.log(zoom.to)
        zoom.on = true
        gestureUntil = performance.now() + 350
        orbited = true
        wake()
      },
      { passive: false, capture: true },
    )
    /** Each frame: the camera's distance drawn towards the wheel's (about 0.15 s to get there). */
    function stepZoom(dt) {
      if (!zoom.on) return
      if (focus.moving || grab.held) return void (zoom.on = false)
      smoothToward(zoom.l, zoom.v, zoom.t, Math.min(dt, 1 / 20), 0.15, Infinity, 1)
      // (there, within a tenth of a percent and nearly still: the last of a spring's tail is a
      // creep nobody sees, and it would keep the view from settling)
      if (Math.abs(zoom.l[0] - zoom.t[0]) < 1e-3 && Math.abs(zoom.v[0]) < 0.03) {
        zoom.l[0] = zoom.t[0]
        zoom.on = false
      }
      zoomV.subVectors(camera.position, controls.target).normalize()
      camera.position.copy(controls.target).addScaledVector(zoomV, Math.exp(zoom.l[0]))
    }
    camera.position.copy(HOME.pos)
    controls.target.copy(HOME.target)
    controls.update()

    // ---- focus (core/focus.js): a tap (from home) or a double-click on an object closes in on it;
    // Escape or the back button returns home. On the desk, a close-up looks straight down, the wall
    // at the top of the picture; the board and the laptop are seen square on
    const down = (center, radius) => ({
      center,
      radius,
      el: DOWN_EL,
      // (the picture's top towards the wall, as at home)
      get az() {
        return HOME.az
      },
      azPull: 1,
    })
    const playerDof = (o) => o.set(0, GY, (GZ0 + GZ1) / 2).applyMatrix4(player.group.matrixWorld)
    const focusTargets = {
      ashtray: down((o) => o.set(4, 22, 2), 72),
      lighter: down((o) => o.setFromMatrixPosition(lighter.group.matrix), 48),
      // (the player from above, steep enough to read its screen: Pod OS is live there; its depth
      // of field on the glass, deep enough for the whole glass to be sharp)
      player: { view: () => PLAYERV, dof: playerDof, deep: 2.4 },
      // (home: the whole desk, seated)
      all: { view: () => HOME, deep: 3.4 },
      // (a project open: the player to the left, still in focus)
      project: { view: () => PROJ, dof: playerDof, deep: 2.4 },
      earbuds: down((o) => earbudsLive.focusCenter(o), 64),
      notebook: down((o) => notebook.center(o), 120),
      // (the can: room round it for its fall and the puddle)
      can: down((o) => o.copy(canHome).setY(ROOM.deskY + 20).addScaledVector(RIGHT, 30), 175),
      board: { view: () => BOARDV, dof: (o) => o.copy(room.boardCenter), deep: 1.5 },
      laptop: { view: () => fitLaptop(), dof: (o) => laptop.screenCenter(o), deep: 1.6 },
      // (the lamp: from the chair's side, a little above, its foot to its head in the picture)
      lamp: {
        center: (o) => o.copy(lampFoot).setY(ROOM.deskY).add(lamp.elbow).add(lamp.head).divideScalar(3),
        radius: 240,
        el: THREE.MathUtils.degToRad(22),
        azPull: 0.7,
        get az() {
          return HOME.az - 0.3
        },
      },
    }
    const focusMeshes = { ashtray: [trayMesh, ...cigs.flatMap((c) => [c.body, c.ash, c.ember])], lighter: lighter.meshes, player: [] }
    player.group.traverse((o) => o.isMesh && focusMeshes.player.push(o))
    focusMeshes.earbuds = earbudsLive.item.meshes
    focusMeshes.notebook = notebook.meshes
    focusMeshes.can = can.meshes
    focusMeshes.laptop = laptop.meshes
    focusMeshes.lamp = [...lamp.meshes, ...lamp.switchMeshes]
    // (the badge hangs on the board: a tap on it is a tap on the board)
    focusMeshes.board = [...room.boardMeshes, ...badge.meshes]
    const focus = createFocus({
      camera,
      controls,
      home: HOME,
      targets: focusTargets,
      reduceMotion,
      onChange: (name) => {
        backBtn.hidden = !name || name === 'all' || name === 'project'
        // (home is the whole desk: nothing further to step back to)
        allBtn.hidden = true
        // (a project open: the composition holds, the camera does not orbit)
        controls.enabled = name !== 'project'
        // (up close on something else, the view is the object's: the key hints step aside)
        root.classList.toggle('cg-close', !!name && name !== 'player' && name !== 'all')
        frameCache.valid = false
        limitOrbit(name)
        if (!name) orbited = false
        // (closer on the player: its screen wakes, even if it was switched off)
        if (name === 'player' && os) {
          osOff = false
          os.wake()
        }
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
    /** Is the laptop's display under a point of the screen (nothing in front of it). */
    function overDisplay(cx, cy) {
      const r = canvas.getBoundingClientRect()
      focusNdc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
      focusRay.setFromCamera(focusNdc, camera)
      focusHits.length = 0
      focusRay.intersectObjects(laptop.meshes, false, focusHits)
      return focusHits.length > 0 && focusHits[0].object === laptop.display
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
    // (Escape: an object held goes home first, core/grab.js; with nothing held, the open book or
    // project closes, then Pod OS goes back a level; from its home, any close-up goes back to the
    // seated view)
    listen(window, 'keydown', (e) => {
      // (up close, the arrows reach Pod OS wherever the page's focus is)
      if (osUp && (e.key || '').startsWith('Arrow') && !os.el.contains(e.target) && os.onKeyDown(e)) {
        e.preventDefault()
        return
      }
      if (e.key !== 'Escape' || grab.held) return
      if (book.isOpen) {
        e.preventDefault()
        book.close()
        return
      }
      if (projOpen) {
        e.preventDefault()
        leaveProject()
        return
      }
      if (osUp && os.back()) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      if (focus.focused) focus.back()
    }, { capture: true })
    const backBtn = root.querySelector('[data-act="back"]')
    const allBtn = root.querySelector('[data-act="all"]')
    /** Is the view on the player (close on it, or a project open): Pod OS is live there. */
    const podView = () => focus.focused === 'player' || focus.focused === 'project'

    // ---- the frame, cached (core/frame.js): what does not move is drawn once and re-used; each
    // frame draws the smoke, the ember's few millimetres and one composite pass
    const EMBER_CD = 180 // (the ember's light at full glow, candela)
    const LIGHTS = { key: key.intensity, rim: rim.intensity, fill: fill.intensity, bounce: bounce.intensity, env: scene.environmentIntensity }
    let emberNow = 0 // (the ember's light this frame)
    /**
     * The lights as the lamp's glow has them (`only`: the ember's frame, all dark): the key as bright
     * as the glow; with it off, the room gives back less, and what the glossy things reflect of the
     * lamp goes, so the dusk sky carries the scene. (Every frame while the glow eases: a moving frame
     * is drawn with the lights as they are, without a setMode)
     */
    function lampLights(only = false) {
      const lk = lamp.level
      key.intensity = only ? 0 : LIGHTS.key * lk
      bounce.intensity = only ? 0 : LIGHTS.bounce * (0.45 + 0.55 * lk)
      scene.environmentIntensity = only ? 0 : LIGHTS.env * (0.55 + 0.45 * lk)
    }
    function setMode(mode) {
      // the burning cigarette's paper: all of it, all but its last 4 mm (cache), or only those
      const part = mode === 'static' || mode === 'ember' ? 1 : mode === 'region' ? 2 : 0
      for (const q of cigs) q.mats.u.uPart.value = q === cigs[cur] ? part : 0
      const only = mode === 'ember'
      // (the ember's frame holds its light alone: what glows of itself, the lamp's bulb and the
      // laptop's display, is dark in it, or it would be counted twice)
      lamp.glow(!only)
      laptop.glow(!only)
      rim.intensity = only ? 0 : LIGHTS.rim
      fill.intensity = only ? 0 : LIGHTS.fill
      lampLights(only)
      setEmberLight(emberWorld, camera, mode === 'static' ? 0 : only ? 1 : emberNow / EMBER_CD, EMBER_CD)
    }
    const frameCache = createFrame({ renderer, camera, Q, smokeScene, SU, setMode, onMark: (l) => dbg?.mark(l) })
    // where things are on the screen (UV boxes): the ember region, the ember, the smoke
    const F = { still: false, scene, emberI: 0, dofK: 0, regionBox: new THREE.Vector4(), emberBox: new THREE.Vector4(), smokeBox: new THREE.Vector4(), focus: { s: 300, home: 300 }, truth: false, shim: null, time: 0, dirty: null, dirtyLive: null, liveA: null, liveB: null, veil: null }
    const bv = new THREE.Vector3()
    const dirtyV4 = new THREE.Vector4()
    const cigDirty = new THREE.Vector4()
    const lv4 = new THREE.Vector4()
    const liveV4 = new THREE.Vector4()
    const cigLive = new THREE.Vector4()
    const gv4 = new THREE.Vector4()
    /** b unioned into a (uv boxes: x0, y0, x1, y1). */
    const uniV4 = (a, b) => a.set(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.z, b.z), Math.max(a.w, b.w))
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
    /** A sphere's box on the screen (the ember's light's reach). */
    function reachBoxOf(e, r, out) {
      boxStart()
      for (let i = 0; i < 8; i++) boxAdd(bv.set(e.x + (i & 1 ? r : -r), e.y + (i & 2 ? r : -r), e.z + (i & 4 ? r : -r)))
      return boxEnd(out)
    }
    const emberLitV4 = new THREE.Vector4()
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
      // (the long lens: the picture's shorter side always sees the same 15.2 degrees)
      const tanV = camera.aspect >= 1 ? Math.tan(LENS / 2) : Math.tan(LENS / 2) / camera.aspect
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanV))
      camera.updateProjectionMatrix()
      // (the home view follows the screen's shape; the camera with it, if it is there)
      const f = focus.focused
      const framed = !f || f === 'all' || f === 'player' || f === 'project' || f === 'board' || f === 'laptop'
      fitHome()
      if (framed && !orbited && !focus.moving) {
        const V = f === 'player' ? PLAYERV : f === 'project' ? PROJ : f === 'board' ? BOARDV : f === 'laptop' ? LAPTOPV : HOME
        controls.target.copy(V.target)
        camera.position.copy(V.pos)
        controls.update()
      }
      limitOrbit(f)
      renderer.setPixelRatio(dpr)
      renderer.setSize(w, h, false)
      renderer.getDrawingBufferSize(dbs)
      // (moving frames at 85% of a 2x canvas's size, 90% of a 1.5x one, and less if the governor
      // had to step down: motion hides it, and a 2x canvas is four times the pixels)
      frameCache.setSize(dbs.x, dbs.y, (dpr >= 2 ? 0.85 : dpr > 1.25 ? 0.9 : 1) * moveScaleK)
      // (moving frames on a dense canvas: no multisampling, SMAA smoothing them after (a WebGL
      // multisample resolve is a whole extra pass over the frame); on a 1x screen, where the
      // pixels are few, the usual)
      frameCache.setSamples(moveSamplesOff || dpr > 1.25 ? 0 : Q.msaa)
    }
    let moveScaleK = 1
    let moveSamplesOff = false
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
    listen(canvas, 'pointerdown', () => {
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
    // (a tap on an object from afar, or from another object's close-up, brings the camera to it, and
    // only to it; once there, taps are the object's own: a flick, the remote's button)
    const grab = createGrab({
      canvas,
      camera,
      controls,
      listen,
      onActive: () => wake(),
      tapFirst: (hit) => {
        // (the notebook: closed in on, then opened)
        if (hit.item === notebookItem) {
          if (focus.focused === 'notebook' && !focus.moving) return false
          if (projOpen) leaveProject()
          focus.focusOn('notebook')
          bookPending = true
          return true
        }
        // (the lamp's head and switch are its own at once: a tap switches it, from anywhere)
        const name = hit.item === earbudsLive.item ? 'earbuds' : hit.item === lighterItem ? 'lighter' : hit.item === boardItem ? 'board' : hit.item === laptopItem ? 'laptop' : hit.item === canItem ? 'can' : hit.item === lampItem ? 'lamp' : cigItems.includes(hit.item) ? 'ashtray' : null
        if (!name || focus.focused === name || focus.moving) return false
        if (projOpen) leaveProject()
        focus.focusOn(name)
        return true
      },
    })
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
    // the board (and the badge hung on it): tapped from afar, the camera comes to it; tapped there,
    // what is pinned up moves (room.items: a note peels up, the calendar turns to next month, the
    // clip and the ticket swing; the badge swings on its pin); a drag turns the camera
    const badgeM0 = badge.group.matrix.clone()
    const swingM = new THREE.Matrix4()
    const swingT = new THREE.Matrix4()
    const badgeSwing = room.hang(room.badgePin, (q) => {
      // (turned by q about the board's outward axis, through the pin)
      const p = room.badgePin
      swingM.makeTranslation(p.x, p.y, p.z).multiply(swingT.makeRotationAxis(room.boardOut, q)).multiply(swingT.makeTranslation(-p.x, -p.y, -p.z))
      badge.group.matrix.multiplyMatrices(swingM, badgeM0)
      badge.group.matrixWorldNeedsUpdate = true
      room.badgeShade.rotation.z = 0.06 + q
    })
    const boardItem = {
      meshes: [...new Set([...room.boardMeshes, ...room.items.flatMap((it) => it.meshes), ...badge.meshes])],
      fixed: true,
      canGrab: () => true,
      onTap: (hit) => {
        if (badge.meshes.includes(hit.object)) {
          badgeSwing.tap(hit)
          audio.rustle(0.3)
        } else {
          const it = room.items.find((x) => x.meshes.includes(hit.object))
          if (!it) return
          it.tap(hit)
          audio.rustle(it.name === 'calendar' ? 1 : it.name === 'clip' ? 0.35 : 0.7)
        }
        wake()
      },
    }
    grab.add(boardItem)
    // the laptop: tapped from afar, the camera comes to it. There (laptop.tapAt): a tab switches to
    // its project, the page goes to the next one, a key dips; a drag on the display, or the wheel
    // over it, scrolls the page (a flick goes on a little); a drag elsewhere turns the camera
    const lapUp = () => focus.focused === 'laptop' && !focus.moving
    const lapRay = new THREE.Raycaster()
    const lapHits = []
    const lapDrag = { v: NaN, at: 0, vel: 0 }
    /** Where a ray meets the display: its uv's height (1 at the top), or NaN. */
    function displayV(ray) {
      lapRay.ray.copy(ray)
      lapHits.length = 0
      laptop.display.raycast(lapRay, lapHits)
      return lapHits.length && lapHits[0].uv ? lapHits[0].uv.y : NaN
    }
    function lapAnswer(r) {
      if (!r) return
      if (r === 'key') audio.keyTick()
      else audio.tick()
      frameCache.valid = false
      wake()
    }
    const laptopItem = {
      meshes: laptop.meshes,
      fixed: (hit) => !(lapUp() && hit.object === laptop.display),
      canGrab: () => true,
      pick: (hit) => {
        lapDrag.v = hit.uv ? hit.uv.y : NaN
        lapDrag.at = performance.now()
        lapDrag.vel = 0
      },
      aim: (ray) => {
        const v = displayV(ray)
        if (Number.isNaN(v)) return
        if (!Number.isNaN(lapDrag.v)) {
          // (the page goes with the hand: up the screen, the page scrolls down)
          const dy = (v - lapDrag.v) * LAPTOP.screen.h
          const now = performance.now()
          const dt = Math.max(1, now - lapDrag.at) / 1000
          lapDrag.vel += (dy / dt - lapDrag.vel) * 0.5
          lapDrag.at = now
          laptop.scroll(dy)
          wake()
        }
        lapDrag.v = v
      },
      twist: () => {},
      // (let go moving: the page goes on a little, slowing)
      release: () => {
        if (performance.now() - lapDrag.at < 90) laptop.fling(lapDrag.vel)
        wake()
      },
      home: () => {},
      cancel: () => {},
      onTap: (hit) => lapAnswer(laptop.tapAt(hit)),
    }
    grab.add(laptopItem)
    // the drink: tapped up close, a sealed can opens (the tab, the hiss); open, a tap high on it knocks
    // it over the way the tap pushed it, a tap low on it rocks it on its base; flicked (a drag from
    // it), it goes over the way it was pushed (sealed, it rolls and does not pour); tapped where it
    // lies, it is stood up again, full
    const canPress = new THREE.Vector3()
    const canPlane = new THREE.Plane()
    const canHit = new THREE.Vector3()
    let canArmed = false
    const canItem = {
      meshes: can.meshes,
      canGrab: () => can.st.mode === 'standing' || can.st.mode === 'lying',
      pick: (hit) => {
        canPress.copy(hit.point)
        canPlane.set(new THREE.Vector3(0, 1, 0), -hit.point.y)
        canArmed = can.standing
      },
      aim: (ray) => {
        if (!canArmed || !ray.intersectPlane(canPlane, canHit)) return
        const dx = canHit.x - canPress.x
        const dz = canHit.z - canPress.z
        if (Math.hypot(dx, dz) < 5) return
        canArmed = false
        if (can.knock(dx, dz, Math.hypot(dx, dz) / 40)) shadowDirty = true
        wake()
      },
      twist: () => {},
      release: () => (canArmed = false),
      home: () => can.reset(),
      cancel: () => (canArmed = false),
      onTap: (hit) => {
        if (can.standing) {
          // (pushed away from where it was touched: from straight above, away from the viewer)
          can.center(canHit)
          let dx = canHit.x - hit.point.x
          let dz = canHit.z - hit.point.z
          if (Math.hypot(dx, dz) < 8) {
            dx = FWD.x
            dz = FWD.z
          }
          // (the first tap opens it; one while it opens, or low on it, only rocks it)
          if (!can.opened) {
            if (!can.open()) can.nudge(dx, dz, 0.5)
          } else if (hit.point.y < ROOM.deskY + 0.45 * CAN.h) can.nudge(dx, dz, 0.6)
          else can.knock(dx, dz, 0.6)
        } else can.standUp()
        shadowDirty = true
        wake()
      },
    }
    grab.add(canItem)
    // the lamp: a tap on its head or its switch turns it on or off, from anywhere (the room's light
    // with it); a drag on its head aims it at what is under the pointer (the desk, or the wall behind
    // it); a tap on its arm or its foot brings the camera to it, a drag there turns the camera
    const LAMP_AIM0 = new THREE.Vector3(...LAYOUT.DESK.lampAim)
    const deskPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const wallPlane = new THREE.Plane(FWD.clone().negate(), -ROOM.wallV) // (v = wallV: its normal is -FWD)
    const lampTo = new THREE.Vector3()
    const lampTo2 = new THREE.Vector3()
    let lampTapAt = -1e9
    function setLamp(on) {
      if (on === lamp.on) return
      lamp.setOn(on)
      audio.lampSwitch(on)
      // (in the dark, the laptop's keyboard lights up)
      laptop.backlight(on ? 0 : 1)
      wake()
    }
    /** What a ray from the eye points the lamp at: the desk in front of the wall, else the wall. */
    function lampTarget(ray, out) {
      const d = ray.intersectPlane(deskPlane, out)
      if (d && -(out.x * FWD.x + out.z * FWD.z) > ROOM.wallV) return out
      return ray.intersectPlane(wallPlane, lampTo2) && lampTo2.y > 0 ? out.copy(lampTo2) : null
    }
    const lampHeadItem = {
      meshes: [...lamp.headMeshes, ...lamp.switchMeshes],
      canGrab: () => true,
      cursor: (hit) => (lamp.switchMeshes.includes(hit.object) ? 'pointer' : 'grab'),
      pick: () => {},
      aim: (ray) => {
        if (!lampTarget(ray, lampTo)) return
        lamp.aimAt(lampTo)
        wake()
      },
      twist: () => {},
      release: () => {},
      home: () => {
        lamp.aimAt(LAMP_AIM0)
        wake()
      },
      cancel: () => {},
      onTap: () => {
        // (the second tap of a double-click switches nothing: the first did)
        const now = performance.now()
        if (now - lampTapAt < 400) return
        lampTapAt = now
        setLamp(!lamp.on)
      },
    }
    grab.add(lampHeadItem)
    const lampItem = { meshes: lamp.meshes.filter((m) => !lampHeadItem.meshes.includes(m)), fixed: true, canGrab: () => true, onTap: () => {} }
    grab.add(lampItem)
    // the notebook: only tapped (it opens); a drag on it turns the camera
    const notebookItem = { meshes: notebook.meshes, fixed: true, canGrab: () => !book.isOpen, onTap: () => openBook() }
    grab.add(notebookItem)
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
    // ---- the player's keys: a tap presses one. Across the desk (or with the screen asleep) they are
    // the music's: previous, play/pause, and the red one, next track; up close on Pod OS they are its
    // own: back, select (held half a second: play/pause), next item
    const keyRay = new THREE.Raycaster()
    keyRay.layers.enableAll()
    const keyHits = []
    const keyMeshes = []
    for (const k of player.keys) k.mesh.traverse((o) => o.isMesh && keyMeshes.push(o))
    let keyAnim = 0
    let tapDown = null
    let holdTimer = 0
    const rayAt = (cx, cy) => {
      const r = canvas.getBoundingClientRect()
      focusNdc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
      keyRay.setFromCamera(focusNdc, camera)
    }
    function keyAt(cx, cy) {
      rayAt(cx, cy)
      keyHits.length = 0
      keyRay.intersectObjects(keyMeshes, false, keyHits)
      if (!keyHits.length) return null
      const o = keyHits[0].object
      return player.keys.find((k) => { let hit = false; k.mesh.traverse((q) => (hit = hit || q === o)); return hit }) || null
    }
    const endHold = () => {
      if (holdTimer) clearTimeout(holdTimer)
      holdTimer = 0
    }
    listen(canvas, 'pointerdown', (e) => {
      tapDown = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId }
      if (!osUp) return
      const k = keyAt(e.clientX, e.clientY)
      // (the red key, held: play or pause, even on Pod OS)
      if (k && k.name === 'rec') {
        endHold()
        holdTimer = setTimeout(() => {
          holdTimer = 0
          tapDown = null
          pressKey(k, true)
        }, 500)
      }
    }, { passive: true })
    listen(canvas, 'pointermove', (e) => {
      if (holdTimer && tapDown && Math.hypot(e.clientX - tapDown.x, e.clientY - tapDown.y) > 6) endHold()
    }, { passive: true })
    listen(canvas, 'pointerup', (e) => {
      endHold()
      const d = tapDown
      tapDown = null
      if (!d || d.id !== e.pointerId || grab.held || e.timeStamp - d.t > 350 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return
      const key = keyAt(e.clientX, e.clientY)
      if (key) return pressKey(key)
      // (a tap on the player from afar: close on it, Pod OS live)
      if (!podView() && !focus.moving && focusableAt(e.clientX, e.clientY) === 'player') focus.focusOn('player')
    }, { passive: true })
    listen(canvas, 'pointercancel', endHold, { passive: true })
    function pressKey(key, held = false) {
      if (!key) return
      key.press(true)
      setTimeout(() => key.press(false), 140)
      keyAnim = 0.5
      // the keys: ◀ back (or the previous track), ▶ next (the next item, or the next track), the red
      // one select on Pod OS (held: play or pause) and play or pause for the music
      if (osUp && !held) {
        if (key.name === 'prev') {
          if (!os.back()) focus.back()
        } else os.key(key.name === 'rec' ? 'select' : 'next')
      } else {
        if (key.name === 'rec') audio.setPlaying(!audio.playing)
        else if (key.name === 'prev') audio.prev()
        else audio.next()
        // (the screen wakes to show what plays)
        if (os && os.power === 'asleep') {
          osOff = false
          os.wake()
        }
      }
      wake()
    }
    // ---- Pod OS, each frame: asleep, waking, awake; the texture painted when it changed (and nothing
    // is mid-transition); up close, its page laid over the glass, fading in over the texture, and out
    // (P switches the screen off, and on: off, it stays dark until P again, a tap on it, or a close
    // look at it; on, it shows the projects across the desk)
    let osOff = false
    function togglePower() {
      if (!os) return
      osOff = os.power !== 'asleep'
      if (osOff) os.sleep()
      else os.wake()
      wake()
    }
    listen(window, 'keydown', (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || (e.key !== 'p' && e.key !== 'P')) return
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return
      togglePower()
    })
    // (L: the lamp on and off. Up close on the laptop: the arrows up and down scroll its page, left
    // and right go through its tabs; Page Up and Page Down a screen at a time, Home and End its ends)
    const LAP_KEYS = { ArrowDown: [80, 0], ArrowUp: [-80, 0], PageDown: [1, 2], PageUp: [-1, 2], End: [1e5, 0], Home: [-1e5, 0] }
    listen(window, 'keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return
      if (e.key === 'l' || e.key === 'L') {
        if (!e.repeat) setLamp(!lamp.on)
        return
      }
      if (focus.focused !== 'laptop' || focus.moving || osUp || grab.held) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        laptop.setTab(laptop.tab + (e.key === 'ArrowRight' ? 1 : -1))
        lapAnswer('tab')
        return
      }
      const k = LAP_KEYS[e.key]
      if (!k) return
      e.preventDefault()
      laptop.scroll(k[0], k[1])
      wake()
    })
    const osPts = new Float64Array(8)
    const osV = new THREE.Vector3()
    const osCam = new THREE.Vector3()
    const glassCorners = [new THREE.Vector3(GX0, GY, GZ0), new THREE.Vector3(GX1, GY, GZ0), new THREE.Vector3(GX1, GY, GZ1), new THREE.Vector3(GX0, GY, GZ1)]
    // (does a point stand between the camera and the glass? In the player's frame: the camera, osCam)
    const osP = new THREE.Vector3()
    function overGlass(x, y, z, pad) {
      osP.set(x, y, z).applyMatrix4(playerInv)
      if (osP.y <= GY + 0.05 || osP.y >= osCam.y) return false
      const t = (osCam.y - GY) / (osCam.y - osP.y)
      const ix = osCam.x + (osP.x - osCam.x) * t
      const iz = osCam.z + (osP.z - osCam.z) * t
      const m = pad * t
      return ix > GX0 - m && ix < GX1 + m && iz > GZ0 - m && iz < GZ1 + m
    }
    const glassBox = new THREE.Box3()
    const boxPts = Array.from({ length: 8 }, () => new THREE.Vector3())
    function boxOver(box, matrix) {
      for (let i = 0; i < 8; i++) {
        const q = boxPts[i].set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(matrix)
        if (overGlass(q.x, q.y, q.z, 1)) return true
      }
      return false
    }
    // (the lighter's and a cigarette's own boxes, in their frames)
    const lighterBounds = new THREE.Box3()
    {
      const inv = new THREE.Matrix4().copy(lighter.group.matrixWorld).invert()
      const m = new THREE.Matrix4()
      lighter.group.updateMatrixWorld(true)
      lighter.group.traverse((o) => {
        if (!o.isMesh || !o.geometry) return
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
        lighterBounds.union(glassBox.copy(o.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld)))
      })
    }
    const cigBounds = new THREE.Box3(new THREE.Vector3(-1, -CIG.radius - 1, -CIG.radius - 1), new THREE.Vector3(CIG.length + 1, CIG.radius + 1, CIG.radius + 1))
    /** Something between the camera and the glass (the cable, a bud, the lighter, a cigarette): the texture shows it, the page would hide it. */
    function glassCovered() {
      const x = earbudsLive.rig.x
      for (let i = 0; i < x.length; i += 3) if (overGlass(x[i], x[i + 1], x[i + 2], 4)) return true
      if (boxOver(lighterBounds, lighter.group.matrixWorld)) return true
      for (const q of cigs) if (q.group.visible && boxOver(cigBounds, q.group.matrixWorld)) return true
      return false
    }
    // ---- a project open (Pod OS on a project's page): the player slides to the left, the rest of
    // the still life blurs behind a veil with a hole the player's shape, and the project is told on
    // the right, with the way to its live site (on a narrow screen: a sheet over the blurred scene)
    const projEl = root.querySelector('.cg-proj')
    const veilEl = root.querySelector('.cg-veil')
    const pf = (k) => projEl.querySelector(`[data-p="${k}"]`)
    let projHideT = 0
    const two = (n) => String(n).padStart(2, '0')
    function openProject(id) {
      const i = portfolio.projects.findIndex((q) => q.id === id)
      const p = portfolio.projects[i]
      if (!p) return
      projOpen = id
      clearTimeout(projHideT)
      pf('k').textContent = `Project ${two(i + 1)} / ${two(portfolio.projects.length)} · ${p.year}`
      pf('name').textContent = p.name
      pf('line').textContent = p.oneLiner
      const live = pf('live')
      const gh = pf('github')
      live.hidden = !p.live
      if (p.live) live.href = p.live
      gh.hidden = !p.github
      if (p.github) gh.href = p.github
      // (no live site: the code is the way in)
      gh.className = `cg-proj-btn ${p.live ? 'line' : 'dark'}`
      gh.firstChild.textContent = p.live ? 'GitHub ' : 'View the code on GitHub '
      pf('what').textContent = p.whatItIs
      pf('built').textContent = p.whatIBuilt
      pf('challenges').replaceChildren(...p.challenges.map((c) => Object.assign(document.createElement('li'), { textContent: c })))
      pf('stack').replaceChildren(...p.stack.map((t) => Object.assign(document.createElement('span'), { textContent: t })))
      projEl.scrollTop = 0
      projEl.hidden = false
      root.classList.add('cg-projecting')
      if (focus.focused !== 'project') {
        podSlide = podView()
        focus.focusOn('project')
      }
      wake()
    }
    api.openProject = (id) => openProject(id) // (debug: tests)
    function closeProject() {
      if (!projOpen) return
      projOpen = null
      root.classList.remove('cg-projecting')
      projHideT = setTimeout(() => {
        if (!projOpen) projEl.hidden = true
      }, 450)
      if (focus.focused === 'project') {
        podSlide = true
        focus.focusOn('player')
      }
      wake()
    }
    /** The panel's own back, the veil, Escape: Pod OS back to its list, and the panel closes. */
    function leaveProject() {
      if (os && os.view.startsWith('project:')) os.back()
      closeProject()
    }
    const veilP = new THREE.Vector3()
    let veilClip = null
    // the frost over the scene (drawn by the frame's present pass: core/frame.js): its strength
    // eased over 0.6 s, the hole round the player (none on a narrow screen: the sheet covers it;
    // none for the book), its tint (denser to the right for a project's text; even for the book)
    let veilT = 0
    const VEIL = { k: 0, holeOn: 0, hole: new THREE.Vector4(), r: 0, feather: 30, tintA: new THREE.Vector3() }
    const TINT_PROJECT = new THREE.Vector3(0.22, 0.5, 0.78)
    const TINT_BOOK = new THREE.Vector3(0.55, 0.55, 0.55)
    function stepVeil(dt) {
      const want = projOpen || book.isOpen ? 1 : 0
      const was = veilT
      veilT = want ? Math.min(1, veilT + dt / 0.6) : Math.max(0, veilT - dt / 0.6)
      VEIL.k = veilT * veilT * (3 - 2 * veilT)
      if (want) VEIL.tintA.copy(book.isOpen ? TINT_BOOK : TINT_PROJECT)
      VEIL.holeOn = projOpen && !book.isOpen && !narrowUI() ? 1 : 0
      VEIL.feather = FEATHER * renderer.getPixelRatio()
      return veilT !== was
    }
    // (the veil's hole: a soft-edged rounded rectangle round the player, as a mask image (its
    // feather all outside the player), and the player's own outline as a clip, so the player's
    // keys and page still take clicks through it)
    const FEATHER = 30 // (px, CSS: the hole's soft edge)
    function stepProject() {
      const v = os.view
      const id = v.startsWith('project:') ? v.slice(8) : null
      // (the view gone elsewhere, the whole still life or a close-up: the project closes with it)
      if (projOpen && !podView()) return leaveProject()
      if (id && id !== projOpen && podView()) openProject(id)
      else if (!id && projOpen) closeProject()
      if (!projOpen) return
      // the veil's hole: round the player as the camera sees it now (none on a narrow screen: the
      // sheet covers it)
      let clip = ''
      if (!narrowUI()) {
        const w = canvas.clientWidth
        const h = canvas.clientHeight
        const PH = LAYOUT.PLAYER.half
        let x0 = Infinity
        let y0 = Infinity
        let x1 = -Infinity
        let y1 = -Infinity
        camera.updateMatrixWorld()
        // (its face's four corners: from nearly straight above, its outline)
        for (let i = 0; i < 4; i++) {
          veilP.set(i & 1 ? PH[0] : -PH[0], 2 * PH[1], i & 2 ? PH[2] : -PH[2]).applyMatrix4(player.group.matrixWorld).project(camera)
          const sx = ((veilP.x + 1) / 2) * w
          const sy = ((1 - veilP.y) / 2) * h
          x0 = Math.min(x0, sx)
          x1 = Math.max(x1, sx)
          y0 = Math.min(y0, sy)
          y1 = Math.max(y1, sy)
        }
        const r = (x1 - x0) * 0.13
        VEIL.hole.set(x0 / w, 1 - y1 / h, x1 / w, 1 - y0 / h)
        VEIL.r = r * renderer.getPixelRatio()
        const f = (n) => n.toFixed(1)
        clip = `path(evenodd, "M0 0H${w}V${h}H0Z M${f(x0 + r)} ${f(y0)}H${f(x1 - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x1)} ${f(y0 + r)}V${f(y1 - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x1 - r)} ${f(y1)}H${f(x0 + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x0)} ${f(y1 - r)}V${f(y0 + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x0 + r)} ${f(y0)}Z")`
      }
      if (clip !== veilClip) veilEl.style.clipPath = veilClip = clip
    }
    function stepOS(dt) {
      if (!os) return
      screenBusy = false
      if (podSlide && !focus.moving) podSlide = false
      stepProject()
      if (os.power === 'asleep') {
        if (!osOff) os.wake()
      }
      if (os.update(dt)) screenBusy = true
      player.screen.setLevel(os.level)
      // (up close on a lit screen, the glass's reflections fade as the glide closes in, as a screen's
      // coating takes them: the page laid over it then shows exactly what it shows; across the desk
      // the glass reflects the room)
      const gw = podView() && (!focus.moving || podSlide) && os.power !== 'asleep' ? 0 : 1
      if (glare !== gw) {
        const g2 = glare + (gw - glare) * (1 - Math.exp(-dt * (reduceMotion ? 30 : 8)))
        glare = Math.abs(gw - g2) < 0.01 ? gw : g2
        glassMat.clearcoat = Math.max(1e-4, GLARE.clearcoat * glare) // (never 0: that would be another program)
        glassMat.specularIntensity = GLARE.specularIntensity * glare
        glassMat.envMapIntensity = GLARE.envMapIntensity * glare
        screenBusy = true
      }
      // up close: the page, once the glide is over and the screen fully lit (the texture shows what
      // the page shows), while the camera looks onto the glass and nothing covers it or is carried
      // (and not while a zoom runs: the page, scaled every frame, would be rasterized again by the
      // browser at each new scale; the glass shows its texture meanwhile)
      let want = podView() && (!focus.moving || podSlide) && os.level >= 1 && glare === 0 && !grab.held && visible && !!dbgFlags.osDom && !zoom.on && performance.now() >= gestureUntil
      if (want) {
        camera.updateMatrixWorld()
        osCam.copy(camera.position).applyMatrix4(playerInv)
        want = osCam.y - GY > 0.35 * Math.hypot(osCam.x, osCam.y - GY, osCam.z - (GZ0 + GZ1) / 2) && !glassCovered()
      }
      if (want !== osUp) {
        osUp = want
        os.setMode(want ? 'dom' : 'texture')
        if (!want) {
          osTex.needsUpdate = true
          screenBusy = true
        }
      }
      const a = want ? Math.min(1, osAlpha + dt / 0.12) : Math.max(0, osAlpha - dt / 0.12)
      if (a !== osAlpha) os.fade((osAlpha = a))
      if (osAlpha > 0) placeOS()
      if (!osUp && os.dirty) {
        os.paint()
        osTex.needsUpdate = true
        screenBusy = true
      }
    }
    /** The page over the glass: its four corners, projected (CSS px), and the homography onto them. */
    function placeOS() {
      camera.updateMatrixWorld()
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      for (let i = 0; i < 4; i++) {
        osV.copy(glassCorners[i]).applyMatrix4(player.group.matrixWorld).project(camera)
        osPts[2 * i] = ((osV.x + 1) / 2) * w
        osPts[2 * i + 1] = ((1 - osV.y) / 2) * h
      }
      os.placeOver(osPts)
    }
    const emberPrev = new THREE.Vector3()
    // ---- the physics scheduler (core/physics.js): one fixed step for everything that simulates
    const physics = createPhysics()
    physics.add(pickup.physics)
    physics.add(lighter.physics)
    physics.add({ awake: () => flakesAwake > 0, step: (h) => stepFlakes(h) })
    physics.add(earbudsLive.physics)
    physics.add(can.physics)
    grab.add(earbudsLive.item)

    // ---- sound: one AudioContext (core/audio.js), made on the first unmute: the paper's crackle,
    // the lighter's click, the player's music through the earbuds
    const audio = createAudio()
    cleanups.push(() => audio.close())

    // ---- UI
    // now playing (bottom left): what the player plays, or why it is quiet
    const nowK = root.querySelector('.cg-now-k')
    const nowT = root.querySelector('.cg-now-t')
    let nowSec = -1
    const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
    function updateNow(force = false) {
      const m = audio.music
      const sec = m && audio.audible ? Math.floor(m.time) : -1
      if (!force && sec === nowSec) return
      nowSec = sec
      const k = !audio.on ? 'sound off' : !audio.plugged ? 'unplugged' : !audio.playing ? 'paused' : 'now playing'
      const t = m ? `${m.track.title}${sec >= 0 ? `  ${mmss(sec)}` : ''}` : ''
      if (nowK.textContent !== k) nowK.textContent = k
      if (nowT.textContent !== t) nowT.textContent = t
    }
    cleanups.push(audio.onChange(() => updateNow(true)))
    function resetView() {
      if (grab.held) grab.drop('home')
      if (pickup.st.mode === 'lying' || pickup.st.mode === 'fall') pickup.glideTo(cigs[cur].notch)
      lighter.home()
      // (the can stood up, full and sealed again; the lamp on and aimed as it was; the laptop open
      // on its first tab, at the top of the page, its keyboard dark)
      can.reset()
      setLamp(true)
      lamp.aimAt(LAMP_AIM0)
      laptop.setTab(0)
      laptop.scroll(-1e5)
      laptop.setOpen(1)
      shadowDirty = true
      frameCache.valid = false
      if (!earbudsLive.plugged) earbudsLive.plug()
      // (home: from a close-up, or from wherever the view was turned to)
      if (focus.focused) focus.back()
      else focus.glide(HOME.pos, HOME.target, 900)
      orbited = false
    }
    for (const b of root.querySelectorAll('[data-act]'))
      listen(b, 'click', () => {
        if (b.dataset.act === 'reset') resetView()
        else if (b.dataset.act === 'back') focus.back()
        else if (b.dataset.act === 'os') {
          // (into Pod OS: close on the player if the view is elsewhere; there, the first project takes the focus)
          if (!podView()) focus.focusOn('player')
          else if (osUp) os.focusFirst()
        } else if (b.dataset.act === 'all') focus.focusOn('all')
        else if (b.dataset.act === 'proj-close') leaveProject()
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
    // (the lamp's bulb and shade as the key light last followed them)
    const lampBulb0 = lamp.bulb.clone()
    const lampAxis0 = lamp.axis.clone()
    let lampMoved = false
    let simTime = 0
    let loopReady = false
    // what changed this frame: the camera (controls, tween), falling ash, a cigarette fading
    // (by its matrices, not the controls' change events: at a zoom or tilt limit OrbitControls
    // reports a change every frame from round-off alone)
    let camMoved = true
    let dofK = 0
    let stillTime = 0
    let shadowsDrawn = false
    let baking = false // (a bake under way, a step a frame)
    let bakeShadows = false
    let stillPending = false // (this frame: the cache not yet complete, a moving frame shown instead)
    const bakedCam = new THREE.Matrix4()
    const bakedProj = new THREE.Matrix4()
    // (OrbitControls rewrites the camera on every update, with round-off even when it stands still)
    const nearly = (a, b) => {
      // (a few thousandths of a millimetre, a hundred-thousandth of a radian: well under a pixel)
      for (let i = 0; i < 16; i++) if (Math.abs(a.elements[i] - b.elements[i]) > 1e-5 * Math.max(1, Math.abs(a.elements[i]))) return false
      return true
    }
    const dbgFlags = { emberLight: 1, flameLight: 1, cache: 1, truth: 0, freeze: 0, osDom: 1, fixedDt: 0, draw: 1 }
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
    // ---- steady frames: while someone turns, zooms or carries something, the frames' own pace is
    // watched; on a GPU that cannot keep it (slower than about 51 a second, for 0.6 s), the MOVING
    // frames are made cheaper a step at a time, at most twice: a fifth fewer pixels each step (and
    // no multisampling). Still frames are untouched: the picture at rest stays the full one.
    // Glides, and the moments a project or the book is open, are transitions with the page's own
    // work in them, and are not counted. (Not under automation: a test's software renderer is slow
    // by nature, and its pictures must stay comparable.)
    const gov = { on: !navigator.webdriver, level: 0, n: 0, ema: 16.7, after: 0, bias: 0 }
    function govern(interval, moving) {
      if (!gov.on || !moving) return void (gov.n = 0)
      // (the first frames of a motion pay for its start, not its pace)
      if (++gov.n < 4) return
      gov.ema += (Math.min(interval + gov.bias, 100) - gov.ema) * 0.08
      if (gov.ema < 19.5 || gov.n < 36 || performance.now() < gov.after || gov.level >= 2) return
      gov.level++
      moveSamplesOff = true
      moveScaleK *= 0.8
      resize()
      gov.n = 0
      gov.ema = 16.7
      gov.after = performance.now() + 1200
    }
    api.quality = () => ({ level: gov.level, dpr: renderer.getPixelRatio(), moveScale: frameCache.moveScale, moveSamples: frameCache.moveSamples })
    api.stillWhy = () => ({ screenBusy, keyAnim, glare, osUp, level: os?.level, dirty: os?.dirty, power: os?.power })
    api.gov = gov // (tests: switched on by hand, a slow frame faked by its bias, ms)
    // (tests and review pictures: the moving frames as the governor leaves them at a step, 0..2;
    // with flags.cache = 0 every frame is a moving one, so a picture shows it)
    api.forceQuality = (level) => {
      gov.level = Math.max(0, Math.min(2, level))
      moveSamplesOff = gov.level > 0
      moveScaleK = 0.8 ** gov.level
      resize()
      wake()
      return api.quality()
    }
    let shadowTurn = 0
    // ---- the frames' pace
    //   live:     ABOVE a second more than the screen's own refresh (70 on 60 Hz, 130 on 120 Hz),
    //             drawn by a timer (the browser's frame callback comes only once a refresh), while
    //             the frames keep up; where they start coming late, by the refresh instead (every
    //             refresh; on a fast screen every other one), trying the faster rate again three
    //             seconds later
    //   at rest:  only the smoke and the ember moving and nobody has touched anything for eight
    //             seconds: 30 (they are reading; slow smoke looks the same, and the GPU cools)
    //   behind a project or the visitors' book: 20 (the browser works the blur out again each time
    //             the scene under it changes)
    let lastDrawn = 0
    let wasStill = false
    let veilMoving = false
    // (the screen's refresh, measured from the callbacks themselves; whether moving frames are drawn
    // at every refresh, and the misses that decide it)
    const pace = { tick: 0, refresh: 16.7, full: true, misses: 0, n: 0, retryAt: 0 }
    api.pace = pace
    const ABOVE = 10 // (frames a second over the refresh)
    let timer = 0
    let overAt = 0
    let lastKind = 0
    cleanups.push(() => clearTimeout(timer))
    const overGap = () => 1000 / (1000 / pace.refresh + ABOVE)
    /** The least time between frames now: 0 while live (the pace's own), 30 or 48 when calm. */
    function calmGap(now) {
      const calm = !focus.moving && !podSlide && !grab.held
      if ((projOpen || book.isOpen) && calm && !veilMoving) return 48
      if (wasStill && calm && now - inputAt > 8000) return 30
      return 0
    }
    /** The timer's frame: drawn, the next one due a period after this one was. */
    function overTick() {
      timer = 0
      if (!running || destroyed) return
      const now = performance.now()
      if (!pace.full || calmGap(now) || dbgFlags.fixedDt) return wake()
      draw(now, true)
      overAt += overGap()
      const t = performance.now()
      if (overAt < t) overAt = t
      timer = setTimeout(overTick, overAt - t)
    }
    let inputAt = 0
    const touched = () => (inputAt = performance.now())
    for (const t of ['pointerdown', 'wheel', 'keydown', 'touchstart']) listen(window, t, touched, { passive: true })
    listen(window, 'pointermove', (e) => e.buttons && touched(), { passive: true })
    function frame(now) {
      raf = 0
      if (!running || destroyed) return
      const tickGap = now - pace.tick
      pace.tick = now
      if (tickGap > 2 && tickGap < 40) pace.refresh += (tickGap - pace.refresh) * 0.05
      if (!pace.full && now > pace.retryAt) {
        pace.full = true
        pace.misses = pace.n = 0
      }
      const calmG = calmGap(now)
      // (live at the faster pace: the timer draws, this callback only keeps the refresh measured)
      if (!calmG && pace.full && ABOVE > 0 && !dbgFlags.fixedDt) {
        if (!timer) {
          overAt = Math.max(now, lastDrawn + overGap())
          timer = setTimeout(overTick, overAt - performance.now())
        }
        raf = requestAnimationFrame(frame)
        return
      }
      if (timer) {
        clearTimeout(timer)
        timer = 0
      }
      const fastScreen = pace.refresh < 12
      const gap = calmG || (pace.full || !fastScreen ? pace.refresh * 0.5 : pace.refresh * 1.5)
      // (tests stepping a fixed time a frame: every frame is one)
      if (now - lastDrawn < gap && !dbgFlags.fixedDt) {
        raf = requestAnimationFrame(frame)
        return
      }
      draw(now, false)
    }
    function draw(now, over) {
      // (a live frame that came late, half a period or more after the last of its kind: a miss; four
      // in thirty, and the frames go by the refresh for a while)
      const due = over ? overGap() : pace.refresh < 12 && pace.full ? pace.refresh : 0
      const kind = over ? 1 : 2
      const counts = due && !wasStill && lastKind === kind
      lastKind = kind
      // (each spell of motion judged on its own)
      if (wasStill) pace.misses = pace.n = 0
      if (counts) {
        if (now - lastDrawn > due * 1.5) pace.misses++
        if (pace.misses >= 4) {
          pace.full = false
          pace.retryAt = now + 3000
          pace.misses = pace.n = 0
        } else if (++pace.n >= 30) pace.misses = pace.n = 0
      }
      lastDrawn = now
      api.paced = (api.paced || 0) + 1 // (debug: frames run, after the pacing)
      const t0 = performance.now()
      const interval = now - last
      let dt = Math.min(0.05, (now - last) / 1000) // (clamped: nothing jumps after a pause)
      last = now
      if (dbgFlags.freeze) dt = 0 // (tests: time stands still, the frame is still drawn)
      if (dbgFlags.fixedDt) dt = dbgFlags.fixedDt // (tests: each frame this long, whatever the clock says)
      simTime += dt * (reduceMotion ? 0.35 : 1)
      U.uTime.value = simTime
      focus.update(now)
      stepZoom(dt)
      controls.update()
      grab.hover()
      // the held object aimed at the pointer, eased (core/grab.js), then every simulation at its
      // fixed step (the cable, the dropped lighter and cigarette, the ash)
      grab.update(dt)
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
      // (the notebook opens once the camera has come to it)
      if (bookPending && !focus.moving) {
        if (focus.focused === 'notebook') openBook()
        else bookPending = false
      }
      const veilBusy = stepVeil(dt)
      const badgeBusy = badge.update(dt)
      const canBusy = can.update(dt)
      if (canBusy) shadowDirty = true
      // the lamp: its head re-aimed, its glow easing (the key light on its bulb, along its shade, and
      // as bright: setMode); its shadow drawn again only when the head moved
      const lampBusy = lamp.update(dt)
      if (lampBusy) {
        lampMoved = !lampBulb0.equals(lamp.bulb) || !lampAxis0.equals(lamp.axis)
        if (lampMoved) {
          lampBulb0.copy(lamp.bulb)
          lampAxis0.copy(lamp.axis)
          key.position.copy(lamp.bulb)
          key.target.position.copy(lamp.bulb).addScaledVector(lamp.axis, 400)
          key.target.updateMatrixWorld()
          SU.uKeyPos.value.subVectors(key.position, key.target.position).setLength(4000).add(key.target.position)
          shadowDirty = true
        }
        SU.uBright.value = 0.6 + 0.4 * lamp.level
        lampLights()
      } else lampMoved = false
      // the laptop: its keys, its page's scroll, its backlight, its lid (whose shadow moves with it)
      const lidWas = laptop.open
      const lapBusy = laptop.update(dt)
      const lidBusy = laptop.open !== lidWas
      if (lidBusy) shadowDirty = true
      // the board: a note peeling, the calendar's page, what swings on its pin
      const roomBusy = room.update(dt)
      if (roomBusy) shadowDirty = true
      // (the cable drawn between its last two steps: physics.alpha)
      const cableBusy = earbudsLive.update(physics.alpha)
      stepOS(dt)
      updateNow()
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
      const dragging = carried || lighterBusy || cableBusy || badgeBusy || canBusy || lampMoved || lidBusy || roomBusy
      if (dragging) shadowDirty = true
      // (the lamp switched changes the whole picture: drawn whole while its light eases, then the
      // cache baked again; so does the laptop while anything of it moves)
      const changing = carried || lighterBusy || cableBusy || badgeBusy || canBusy || lampBusy || lapBusy || roomBusy || keyAnim > 0 || camChanged || focus.moving || flakesAwake > 0 || cigs.some(cigSwapping) || !dbgFlags.cache
      // (the cache is baked once the scene has been still for a few frames: a slow drag with pauses
      // does not bake at every pause)
      // (the cache is baked once the view has been still for an eighth of a second: a slow zoom or
      // pinch with small pauses goes on drawing whole frames, it does not bake at every pause)
      stillTime = changing ? 0 : stillTime + Math.max(dt, 1 / 240)
      const moving = changing || stillTime < 0.12 || performance.now() < gestureUntil
      govern(interval, moving && !focus.moving && !podSlide && !projOpen && !book.isOpen)
      wasStill = !moving
      // shadows: drawn again only when the shadow casters changed (the burn moves slowly: every 6 s)
      shadowClock += dt
      const burnStep = shadowClock > 6
      if (burnStep) shadowClock = 0
      // (the depth of field: on what the view is about; deep over the whole desk, the still life's
      // own aperture in a close-up)
      const ft = focus.focused && focusTargets[focus.focused]
      if (ft && (ft.dof || ft.center)) (ft.dof || ft.center)(focusPt)
      else focusPt.copy(controls.target)
      F.focus.s = camera.position.distanceTo(focusPt)
      F.focus.home = F.focus.s * (ft ? ft.deep || 1 : 3.4)
      // (the frame's own work before drawing: input, simulations, poses; for the debug tools)
      api.simMs = performance.now() - t0
      api.moving = moving
      // (tests: the simulation only, nothing drawn: a software renderer takes seconds a frame; the
      // camera taken as drawn, as either path would)
      if (!dbgFlags.draw) {
        shadowDirty = shadowDirty || moving
        bakedCam.copy(camera.matrixWorld)
        bakedProj.copy(camera.projectionMatrix)
        wake()
        return
      }
      dbg?.begin()
      stillPending = false
      if (moving) {
        if (baking) {
          baking = false
          frameCache.bakeReset()
        }
        frameCache.valid = false
        // (the camera as it is now: if it stays, the next frame bakes for it)
        bakedCam.copy(camera.matrixWorld)
        bakedProj.copy(camera.projectionMatrix)
        // (while something is carried the soft shadow is drawn again every other frame: blurred
        // over 13 mm, its half rate does not show, and it is one of the dearest passes)
        if ((shadowDirty || burnStep) && !(dragging && shadowTurn++ & 1)) {
          shadowsNow()
          shadowDirty = false
        }
      } else {
        if (!frameCache.valid || shadowDirty || burnStep) {
          // (the shadows drawn again only if what casts them changed: the camera does not change them)
          if (!baking) {
            bakeShadows = shadowDirty || burnStep || !shadowsDrawn
            if (bakeShadows) key.shadow.needsUpdate = true
            shadowsDrawn = true
            shadowDirty = false
            bakedCam.copy(camera.matrixWorld)
            bakedProj.copy(camera.projectionMatrix)
            baking = true
          }
          // (a step a frame; the moving frames go on showing until the cache is complete, so the
          // end of a gesture never pays for the whole bake in one frame)
          if (frameCache.bakeStep(scene, F.focus, bakeShadows, reachBoxOf(emberWorld, EMBER_LIGHT.uEmberCut.value, emberLitV4))) {
            baking = false
            if (dbg) dbg.bakes++
          } else stillPending = true
          dbg?.mark('scene')
        }
      }
      // (the depth of field: eased in once, at the start, then kept, moving or still: a zoom or a
      // glide never switches it off and on, so the soft edges of the picture do not pop)
      dofK = Math.min(1, dofK + dt / 0.7)
      veilMoving = veilBusy
      F.veil = VEIL.k > 0 ? VEIL : null
      F.still = !moving && !stillPending
      F.truth = !!dbgFlags.truth
      F.emberI = emberNow / EMBER_CD
      // (the depth of field eased in, not switched on)
      F.dofK = dofK * dofK * (3 - 2 * dofK)
      cigBox(c, c.b - 4.6, c.b + 0.7 + c.ashLen + 0.8, 4.7, F.regionBox)
      cigDirty.copy(F.regionBox)
      // (the player's screen is drawn over the cache too: the box takes it in)
      boxStart()
      for (let i = 0; i < 8; i++) boxAdd(bv.set(i & 1 ? screenBounds.max.x : screenBounds.min.x, i & 2 ? screenBounds.max.y : screenBounds.min.y, i & 4 ? screenBounds.max.z : screenBounds.min.z).applyMatrix4(playerScreen.matrixWorld))
      boxEnd(sbox)
      F.regionBox.set(Math.min(F.regionBox.x, sbox.x), Math.min(F.regionBox.y, sbox.y), Math.max(F.regionBox.z, sbox.z), Math.max(F.regionBox.w, sbox.w))
      cigBox(c, c.b - 1.2, c.b + 3.8, 4.7, F.emberBox)
      smokeBoxOf(emberWorld, F.smokeBox)
      // what a still frame changes (the kept frame holds the rest).
      // In the scene itself (restored from the cache and redrawn): the burning cigarette, and the
      // glass when its page or its light changed. In the picture (composited again): that, the
      // near glow the ember's flicker falls on (the composite mixes it from the cache's two
      // frames; its light fades with the square of the distance: past ~70 mm the flicker is
      // nothing), the lighter while the flicker reaches it, and the smoke.
      liveV4.copy(F.emberBox)
      uniV4(liveV4, cigDirty)
      cigLive.copy(liveV4)
      if (screenBusy || keyAnim > 0) uniV4(liveV4, sbox)
      dirtyV4.copy(liveV4)
      if (emberNow > 0) {
        boxStart()
        const e = emberWorld
        for (let i = 0; i < 8; i++) boxAdd(bv.set(e.x + (i & 1 ? 70 : -70), e.y + (i & 2 ? 70 : -4), e.z + (i & 4 ? 70 : -70)))
        uniV4(dirtyV4, boxEnd(gv4))
        boxStart()
        for (let i = 0; i < 8; i++) boxAdd(bv.set(i & 1 ? lighterBounds.max.x : lighterBounds.min.x, i & 2 ? lighterBounds.max.y : lighterBounds.min.y, i & 4 ? lighterBounds.max.z : lighterBounds.min.z).applyMatrix4(lighter.group.matrixWorld))
        uniV4(dirtyV4, boxEnd(lv4))
      }
      uniV4(dirtyV4, F.smokeBox)
      F.dirty = dirtyV4
      F.dirtyLive = liveV4
      // (where the live frame is the scene's own: the cigarette's region, and the glass)
      F.liveA = cigLive
      F.liveB = sbox
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
        clearTimeout(timer)
        timer = 0
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

    // (only the room's surfaces take the lamp's shadow, the desk, the mat, the wall and the board,
    // and the spilt drink: soft shadows on the objects themselves would bleed)
    can.puddle.userData.takesShadow = true
    scene.traverse((o) => {
      if (o.isMesh) o.receiveShadow = !!o.userData.takesShadow
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
    // (the can's hidden parts too, the fog of its opening and the spill: their first use would stall)
    const canHidden = [can.puddle, ...can.extras, ...can.group.children].filter((o) => !o.visible)
    for (const o of canHidden) o.visible = true
    // (for the target the scene is really drawn into: a program is keyed by its output, so one
    // compiled for the screen would be compiled again the first time it is drawn into the frame;
    // the flame and its spark, drawn first at the first ignition, would stall it)
    warmOn = false
    warmTarget.dispose()
    renderer.setRenderTarget(frameCache.live)
    await renderer.compileAsync(scene, camera)
    for (const o of canHidden) o.visible = false
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
    draw(performance.now(), false)
    await yieldNow()
    stage('smoke', 'done')
    // the music: its engine built now (the context waits, suspended, for the visitor's click)
    stage('music', 'start')
    if (opts.hold) await audio.prepare()
    stage('music', 'done')
    // Pod OS: its code and content, its images; booted, laid out, painted once (the desk goes on
    // without it if it cannot)
    stage('os', 'start')
    try {
      const { createPodOS } = await import('./os/os.js')
      stage('os', 0.4)
      // (its face: Inter, which the player has loaded)
      await player.ready
      if (destroyed) return
      os = createPodOS({
        content: portfolio,
        audio,
        canvas: osCanvas,
      })
      stageEl.after(os.el)
      cleanups.push(() => os.destroy())
      stage('os', 0.7)
      await os.prepare()
      osTex.needsUpdate = true
    } catch (e) {
      console.error('pod os:', e)
      os = null
    }
    stage('os', 'done')
    // the mood: frames drawn out of sight until the cache is baked and SMAA compiled, still from
    // the cache, so every program and target is made before anyone sees a frame
    stage('mood', 'start')
    // (each frame waited for, a pixel read back: the GPU's work never queues up behind the loader)
    const syncPx = new Uint8Array(4)
    const gl = renderer.getContext()
    for (let k = 0; k < 40 && !(frameCache.valid && frameCache.smaaReady && dofK > 0); k++) {
      draw(performance.now(), false)
      renderer.setRenderTarget(null)
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, syncPx)
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

    /** The reveal (after a loader): the scene fades up from black, the camera pushes in a little, and
     * the laptop's lid opens as the visitor arrives. */
    handle.enter = ({ sound = true } = {}) => {
      if (!reduceMotion && lidShut) setTimeout(() => !destroyed && (laptop.setOpen(1), wake()), 450)
      else laptop.setOpen(1)
      lidShut = false
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
      // (the loader's slow frames say nothing about the live pace)
      Object.assign(pace, { full: true, misses: 0, n: 0, retryAt: 0 })
      lastKind = 0
      last = performance.now()
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
        THREE, scene, camera, renderer, controls, smokeScene, deskMat, MAT_COLORS, cigs, api, handle, flick: () => flick(cigs[cur]), emberWorld, ptr, SU, frameCache, Q, key, rim, fill, trayMat, flags: dbgFlags, homePos: HOME.pos, homeTarget: HOME.target, room, lamp, lampItem, lampHeadItem, setLamp, bounce, badgeSwing, laptop, laptopItem, can, canItem, boardItem, views: { HOME, PLAYERV, BOARDV, LAPTOPV }, pickup, grab, seatPts, traySdfGrad, lighter, lighterItem, badge, notebook, notebookItem, book, cigItems, lightTarget, flameSpot, FLAME_CD, player, earbuds, earbudsLive, audio, focus, physics, jack,
        get cur() {
          return cigs[cur]
        },
        get os() {
          return os
        },
        get osUp() {
          return osUp
        },
        osTex,
        placeOS,
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
