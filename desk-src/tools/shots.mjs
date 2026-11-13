// Pictures of the scene, for review: the Chrome already on this machine, headless with real WebGL,
// opens the scene, waits for the loader and for the frame to settle, reaches each view as a visitor
// would and saves PNGs (at most 1600 px wide). No dependencies: it speaks Chrome's DevTools protocol
// over a pipe (Node 18 or later), so there is nothing to install, here or anywhere else.
//
//   node tools/shots.mjs <outDir> [--url=...] [--size=1366x768] [--dpr=1]
//     [--views=home,board,laptop,can,lamp,player,ashtray] [--eval=<js>] [--tag=<name>]
//     [--then=<js>] [--then-wait=400] [--wait=1500] [--perf] [--overlay] [--chrome=<path>]
//
//   node tools/shots.mjs .review/x --size=1366x768,1440x900@2,1920x1080,390x844
//   node tools/shots.mjs .review/x --views=home --eval="__still.setLamp(false)" --tag=lamp-off
//   node tools/shots.mjs .review/x --views=laptop --eval="__still.laptop.setTab(2)" --tag=tab2
//   node tools/shots.mjs .review/x --views=can --eval="__still.can.open()" --tag=open
//   node tools/shots.mjs .review/x --views=board --then="__still.room.items.find((i) => i.name === 'calendar').tap({ point: __still.room.boardCenter })" --then-wait=700 --tag=calendar
//   node tools/shots.mjs .review/x --views=home --eval="__still.api.forceQuality(2); __still.flags.cache = 0" --tag=lowest
//   node tools/shots.mjs .review/before --url=http://localhost:4173/ --perf   (npm run preview)
//
// - no --url: the dev server on 5173 if one answers there, else one started for this run (and
//   stopped after it); the page is opened with ?debug (for window.__still), its overlay hidden
//   unless --overlay
// - --size: one or more, comma-separated, each optionally @<dpr> (else --dpr); a page load each
// - a view: home, or an object by name (board, laptop, can, lamp, player, ashtray, lighter, earbuds,
//   notebook): a tap on its place in the picture, then a double-click if the tap did not close in;
//   Escape between views goes back home. A view the scene does not have yet is still shot, with a
//   warning (where the camera ended)
// - --eval: a line of JS run in the page once it is in, before the first shot (window.__still is
//   the scene's debug handle); repeatable, run in order; --wait: ms more to settle after each move
// - --then: a line of JS run once each view is reached, the shot taken --then-wait ms after it
//   without waiting for rest (a note mid-peel, the calendar's page up). The lowest quality step
//   (forceQuality with flags.cache = 0) never rests: each shot waits its 45 s out
// - files: <view>-<w>x<h>[@<dpr>x][-<tag>].png; --perf also perf-<w>x<h>[@<dpr>x].txt: the
//   loader's stages, then the ?debug overlay at rest, orbiting and zooming at home
// - Chrome: CHROME or --chrome=<path> (any Chromium 120 or later), else the usual places
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const flags = {}
const evals = []
let outDir = ''
for (const a of process.argv.slice(2)) {
  const m = /^--([\w-]+)(?:=([\s\S]*))?$/.exec(a)
  if (!m) outDir = a
  else if (m[1] === 'eval') evals.push(m[2] || '')
  else flags[m[1]] = m[2] ?? true
}
const usage = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\nimport')[0]
if (!outDir || flags.help) {
  console.log(usage.replace(/^\/\/ ?/gm, ''))
  process.exit(outDir ? 0 : 1)
}
const sizes = String(flags.size || '1366x768').split(',').map((s) => {
  const m = /^(\d+)x(\d+)(?:@([\d.]+)x?)?$/.exec(s.trim())
  if (!m) throw new Error(`shots: --size ${s}: want <w>x<h> or <w>x<h>@<dpr>`)
  return { w: +m[1], h: +m[2], dpr: +(m[3] || flags.dpr || 1) }
})
const views = String(flags.views || 'home').split(',').map((v) => v.trim()).filter(Boolean)
const WAIT = +(flags.wait ?? 1500)
const MAX_W = 1600
const here = fileURLToPath(new URL('..', import.meta.url))
outDir = resolve(outDir)
mkdirSync(outDir, { recursive: true })

const CHROMES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
]
const chromePath = flags.chrome || CHROMES.find((p) => p && existsSync(p))
if (!chromePath) {
  console.error('shots: no Chrome found. Install Google Chrome, or pass --chrome=<path> (or CHROME=<path>) to any Chromium 120 or later.')
  process.exit(1)
}

let server = null
let chrome = null
let prof = ''
const warnings = []
const warn = (s) => (warnings.push(s), console.warn('shots: ' + s))
function quit(msg, code = 1) {
  if (msg) console.error('shots: ' + msg)
  process.exit(code)
}
process.on('exit', () => {
  chrome?.kill('SIGKILL')
  server?.kill()
  if (prof) rmSync(prof, { recursive: true, force: true, maxRetries: 3 })
})
process.on('SIGINT', () => quit('stopped'))

// ---- the page's server: the one given, the dev server already running, or one of our own
const answers = async (u) => {
  try {
    return (await fetch(u, { signal: AbortSignal.timeout(2000) })).ok
  } catch {
    return false
  }
}
let base = flags.url
if (!base) {
  base = 'http://localhost:5173/'
  if (!(await answers(base))) {
    // (a port of its own: another run's server is left alone, and stopping ours stops no one else's)
    const port = 5200 + Math.floor(Math.random() * 700)
    base = `http://127.0.0.1:${port}/`
    console.log(`shots: starting the dev server on ${port}`)
    server = spawn(process.execPath, [join(here, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: here, stdio: 'ignore' })
    for (let i = 0; i < 120 && !(await answers(base)); i++) await sleep(250)
    if (!(await answers(base))) quit('the dev server did not start (is node_modules installed in desk-src?)')
  }
} else if (!(await answers(base))) quit(`nothing answers at ${base}`)
const pageUrl = new URL(base)
pageUrl.searchParams.set('debug', '')

// ---- Chrome, headless, on a throwaway profile; the protocol over a pipe (fd 3 in, fd 4 out: no port)
prof = mkdtempSync(join(tmpdir(), 'desk-shots-'))
let errlog = ''
chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--remote-debugging-pipe',
    `--user-data-dir=${prof}`,
    `--window-size=${sizes[0].w},${sizes[0].h}`,
    ...(process.platform === 'darwin' ? ['--use-angle=metal'] : []),
    '--enable-gpu',
    '--ignore-gpu-blocklist',
    '--enable-unsafe-swiftshader', // (no GPU at all: WebGL in software rather than none)
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-crash-reporter',
    '--disable-breakpad',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--hide-scrollbars',
    '--mute-audio',
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] },
)
chrome.stderr.on('data', (d) => (errlog = (errlog + d).slice(-20000)))
let seq = 0
let session = undefined
const waiting = new Map()
const pageLog = []
function onMessage(m) {
  if (m.id) {
    waiting.get(m.id)?.(m)
    waiting.delete(m.id)
  } else if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails
    pageLog.push('exception: ' + (d.exception?.description || d.text).split('\n').slice(0, 3).join(' | '))
  } else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
    pageLog.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 400))
  }
}
// (each message JSON, ended by a NUL)
let inbox = ''
chrome.stdio[4].setEncoding('utf8')
chrome.stdio[4].on('data', (d) => {
  inbox += d
  for (let i; (i = inbox.indexOf('\0')) >= 0; inbox = inbox.slice(i + 1)) onMessage(JSON.parse(inbox.slice(0, i)))
})
chrome.stdio[3].on('error', () => {}) // (Chrome gone: said below)
const send = (method, params = {}) =>
  new Promise((r, j) => {
    const id = ++seq
    waiting.set(id, (m) => (m.error ? j(new Error(`${method}: ${m.error.message}`)) : r(m.result)))
    chrome.stdio[3].write(JSON.stringify({ id, method, params, sessionId: session }) + '\0')
  })
async function js(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
  return r.result.value
}
const gone = new Promise((r) => chrome.on('exit', r))
const version = await Promise.race([send('Browser.getVersion'), gone.then(() => null), sleep(20000).then(() => null)])
if (!version) {
  const tail = errlog.split('\n').filter((l) => l.trim() && !/crashpad|breakpad/i.test(l)).slice(-6).join('\n')
  const hint = /SingletonSocket|ProcessSingleton/.test(errlog) ? '\n(Chrome needs a Unix socket for its profile lock: a sandbox that refuses them stops every Chrome at start-up. Run this outside it.)' : ''
  quit(`Chrome did not start (${chromePath}):\n${tail}${hint}`)
}
gone.then(() => quit(`Chrome stopped:\n${errlog.split('\n').slice(-6).join('\n')}`))
const { targetInfos } = await send('Target.getTargets')
const page = targetInfos.find((t) => t.type === 'page') || (await send('Target.createTarget', { url: 'about:blank' }))
session = (await send('Target.attachToTarget', { targetId: page.targetId, flatten: true })).sessionId
console.log(`shots: ${version.product}, ${base}`)
await send('Runtime.enable')
await send('Page.enable')

// ---- in the page (sent as source): a point of the screen on an object, as a visitor would tap it
function spotOf(name) {
  const s = window.__still
  const T = s.THREE
  const special = {
    player: () => s.player.group,
    // (a tap on the cigarette is a tap on the ashtray)
    ashtray: () => s.cigItems.flatMap((i) => i.meshes),
    earbuds: () => s.earbudsLive.item.meshes,
  }
  const meshesOf = (n) => {
    const o = special[n] ? special[n]() : s[n + 'Item']?.meshes || s[n]?.meshes || s[n]?.group
    const out = []
    for (const x of [o].flat()) x?.traverse?.((m) => m.isMesh && m.visible && out.push(m))
    return out
  }
  let want = meshesOf(name)
  // (the player's keys do their own thing when tapped)
  if (name === 'player') {
    const keys = new Set()
    for (const k of s.player.keys || []) k.mesh.traverse((m) => keys.add(m))
    want = want.filter((m) => !keys.has(m))
  }
  if (!want.length) return null
  // (what could stand in front of it: every object a tap can reach)
  const all = [...new Set(['player', 'ashtray', 'earbuds', 'board', 'laptop', 'can', 'lamp', 'lighter', 'notebook', name].flatMap(meshesOf))]
  const cam = s.camera
  const v = new T.Vector3()
  const pts = []
  for (const m of want) {
    const p = m.geometry.attributes.position
    if (!p) continue
    const step = Math.max(1, Math.floor(p.count / 80))
    for (let i = 0; i < p.count; i += step) {
      v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).project(cam)
      if (Math.abs(v.x) < 0.94 && Math.abs(v.y) < 0.94 && v.z < 1) pts.push([v.x, v.y])
    }
  }
  if (!pts.length) return null
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length
  // (the middle of it first, then its surface's points nearest the middle, each pulled a little in:
  // a point of the outline hits only at a grazing edge)
  pts.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))
  const ray = new T.Raycaster()
  ray.layers.enableAll()
  const ndc = new T.Vector2()
  const r = s.renderer.domElement.getBoundingClientRect()
  for (const [x, y] of [[cx, cy], ...pts.slice(0, 300)]) {
    ndc.set(x + (cx - x) * 0.2, y + (cy - y) * 0.2)
    ray.setFromCamera(ndc, cam)
    const hit = ray.intersectObjects(all, false)[0]
    if (hit && want.includes(hit.object)) return [r.left + ((ndc.x + 1) / 2) * r.width, r.top + ((1 - ndc.y) / 2) * r.height]
  }
  return null
}
// (in the page: a screenshot made smaller, the browser's own high-quality scaling)
async function shrink(src, w, h) {
  const img = new Image()
  img.src = 'data:image/png;base64,' + src
  await img.decode()
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  g.imageSmoothingQuality = 'high'
  g.drawImage(img, 0, 0, w, h)
  return c.toDataURL('image/png').split(',')[1]
}

// ---- moving about as a visitor does
const mouse = (type, x, y, clickCount = 1, extra = {}) =>
  send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !extra.buttons ? 'none' : 'left', clickCount, pointerType: 'mouse', ...extra })
async function tap(x, y, times = 1) {
  await mouse('mouseMoved', x, y, 0)
  for (let k = 1; k <= times; k++) {
    await mouse('mousePressed', x, y, k, { buttons: 1 })
    await mouse('mouseReleased', x, y, k)
  }
}
async function press(key, code, keyCode) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode })
}
/** Still: no glide, no moving frame, for a moment; then `extra` ms for the cache's bake and the like. */
async function settle(extra = WAIT) {
  for (let i = 0, calm = 0; i < 300 && calm < 4; i++) {
    await sleep(150)
    calm = (await js('!!window.__still && !__still.focus.moving && !__still.api.moving').catch(() => false)) ? calm + 1 : 0
  }
  await sleep(extra)
}
async function goHome() {
  for (let i = 0; i < 6; i++) {
    const f = await js('__still.focus.focused')
    if (!f || f === 'all') return
    await press('Escape', 'Escape', 27)
    await settle(200)
  }
}
async function goTo(name) {
  await goHome()
  if (name === 'home') return
  const at = await js(`(${spotOf})(${JSON.stringify(name)})`)
  if (!at) return warn(`${name}: no part of it to tap in the picture; shot from home`)
  await tap(...at)
  await sleep(300)
  // (a tap that did not close in: a double-click does)
  if ((await js('__still.focus.focused')) !== name) {
    await settle(0)
    await tap(...at, 2)
  }
  await settle()
  const f = await js('__still.focus.focused')
  if (f !== name) warn(`${name}: the scene has no ${name} view yet (tapped and double-clicked at ${at.map(Math.round)}); shot where the camera ended (${f || 'home'})`)
}

// ---- the overlay's numbers (?debug), for --perf
const OVERLAY = `document.querySelector('#desk pre')?.textContent || ''`
function parseOverlay(t) {
  const g = (re) => (re.exec(t) || [])[1]
  return { fps: +g(/fps\s+([\d.]+)/), cpu: +g(/cpu ms\s+([\d.]+)/), gpu: g(/gpu ms\s+(\S+)/), stages: g(/gpu ms\s+\S+\s+\((.*)\)/) || '', calls: +g(/calls\s+(\d+)/), tris: +String(g(/triangles\s+([\d,]+)/) || '').replace(/,/g, ''), path: g(/path\s+(.*)/) || '' }
}
async function perf(size) {
  const W = size.w
  const H = size.h
  const lines = []
  const info = await js(`(() => {
    const gl = document.createElement('canvas').getContext('webgl2')
    const x = gl && gl.getExtension('WEBGL_debug_renderer_info')
    return { renderer: x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : 'n/a', ua: navigator.userAgent, loader: window.__loader || null, quality: window.__still.api.quality?.() }
  })()`)
  lines.push(`url        ${pageUrl}`, `size       ${W}x${H} css px, devicePixelRatio ${size.dpr}, headless Chrome (${chromePath})`, `webgl      ${info.renderer}`, `quality    ${JSON.stringify(info.quality)}`, '')
  if (info.loader) {
    lines.push(`loader     ready at ${Math.round(info.loader.readyAt)} ms from navigation (the loader's own clock from ${Math.round(info.loader.t0)} ms)`)
    for (const [k, t] of Object.entries(info.loader.times)) lines.push(`  ${k.padEnd(9)} ${String(t.start ?? '').padStart(6)} → ${String(t.done ?? '').padStart(6)} ms`)
    lines.push('')
  }
  const take = async (label, n, act) => {
    const rows = []
    for (let i = 0; i < n; i++) {
      await (act ? act(i) : sleep(1000))
      rows.push(parseOverlay(await js(OVERLAY)))
    }
    const avg = (k) => rows.reduce((a, r) => a + (+r[k] || 0), 0) / rows.length
    lines.push(`${label.padEnd(10)} fps ${avg('fps').toFixed(0)}, cpu ${avg('cpu').toFixed(2)} ms, gpu ${rows.map((r) => r.gpu).join(' / ')} ms, calls ${rows.map((r) => r.calls).join('/')}, triangles ${rows.map((r) => r.tris.toLocaleString('en')).join('/')}`)
    for (const r of rows) lines.push(`             gpu by stage: ${r.stages || 'n/a'}  path: ${r.path}`)
  }
  // at rest: nothing touched for ten seconds (the pace drops to 30 a second; only the smoke moves)
  await sleep(10000)
  await take('idle', 5)
  // orbit: a slow drag across the wall, there and back (a drag on the wall or the board turns the camera)
  const ox = W * 0.5
  const oy = H * 0.1
  await mouse('mouseMoved', ox, oy, 0)
  await mouse('mousePressed', ox, oy, 1, { buttons: 1 })
  let k = 0
  const drag = async () => {
    for (let i = 0; i < 20; i++, k++) {
      await mouse('mouseMoved', ox + Math.sin(k / 12) * W * 0.12, oy, 0, { buttons: 1 })
      await sleep(50)
    }
  }
  await drag()
  await take('orbit', 4, drag)
  await mouse('mouseReleased', ox + Math.sin(k / 12) * W * 0.12, oy, 1)
  await settle(3000)
  // zoom: the wheel at the middle, in and out
  let z = 0
  const wheel = async () => {
    for (let i = 0; i < 8; i++, z++) {
      await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: W / 2, y: H / 2, deltaX: 0, deltaY: Math.floor(z / 8) % 2 ? 100 : -100 })
      await sleep(125)
    }
  }
  await wheel()
  await take('zoom', 4, wheel)
  await settle(1000)
  await goHome()
  await settle()
  lines.push('', 'Each row: the overlay read once a second (its fps and cpu are means over half a second, its gpu the latest frame', "complete). idle: after 10 s untouched; orbit: a drag to and fro across the top of the picture; zoom: wheel notches", 'of 100 every 125 ms, in for a second, out for the next.')
  if (/swiftshader|llvmpipe|software/i.test(info.renderer)) lines.push('', 'WebGL is in software here: the pictures are right, the timings are not a GPU\'s.')
  return lines.join('\n') + '\n'
}

// ---- the run
try {
  for (const size of sizes) {
    const suffix = `${size.w}x${size.h}${size.dpr !== 1 ? `@${size.dpr}x` : ''}`
    await send('Emulation.setDeviceMetricsOverride', { width: size.w, height: size.h, deviceScaleFactor: size.dpr, mobile: size.w < 600 })
    // (the page before is marked: until the new one is in, a poll may still reach it)
    await js('window.__shotsOld = 1').catch(() => {})
    await send('Page.navigate', { url: String(pageUrl) })
    // the loader: ready, then in without sound (a reload by the dev server on the way is waited out)
    const t0 = Date.now()
    for (;;) {
      await sleep(400)
      const st = await js(`(() => {
        if (window.__shotsOld) return 'wait'
        const ld = document.getElementById('ld')
        if (!ld) return window.__still ? 'in' : 'wait'
        if (ld.querySelector('[data-go="still"]')) return 'failed'
        if (!ld.classList.contains('ready')) return 'wait'
        ld.querySelector('[data-go="quiet"]').click()
        return 'in'
      })()`).catch(() => 'wait')
      if (st === 'in') break
      if (st === 'failed') quit(`the scene could not be set up:\n${pageLog.slice(-8).join('\n')}`)
      if (Date.now() - t0 > 240000) quit(`the loader had not finished after 4 minutes:\n${pageLog.slice(-8).join('\n')}`)
    }
    if (!flags.overlay) await js(`void document.head.appendChild(Object.assign(document.createElement('style'), { textContent: '#desk pre{display:none!important}' }))`)
    await settle(2000)
    for (const e of evals) {
      const v = await js(e).catch((err) => `error: ${err.message}`)
      console.log(`shots: eval ${e} → ${v === undefined ? 'done' : JSON.stringify(v)}`)
    }
    if (evals.length) await settle()
    if (flags.perf) {
      const txt = await perf(size)
      writeFileSync(join(outDir, `perf-${suffix}.txt`), txt)
      console.log(txt)
    }
    for (const v of views) {
      await goTo(v)
      if (flags.then) {
        const r = await js(flags.then).catch((err) => `error: ${err.message}`)
        if (r !== undefined) console.log(`shots: then → ${JSON.stringify(r)}`)
        await sleep(+(flags['then-wait'] ?? 400))
      }
      let { data } = await send('Page.captureScreenshot', { format: 'png' })
      const pw = Math.round(size.w * size.dpr)
      if (pw > MAX_W) data = await js(`(${shrink})(${JSON.stringify(data)}, ${MAX_W}, ${Math.round((size.h * size.dpr * MAX_W) / pw)})`)
      const file = join(outDir, `${v}-${suffix}${flags.tag ? '-' + flags.tag : ''}.png`)
      writeFileSync(file, Buffer.from(data, 'base64'))
      console.log('shots: wrote ' + file)
    }
  }
} catch (e) {
  quit(`${e.message}\n${pageLog.slice(-8).join('\n')}`)
}
if (pageLog.length) console.log('\nthe page said:\n' + [...new Set(pageLog)].slice(-20).join('\n'))
if (warnings.length) console.log('\nwarnings:\n' + warnings.join('\n'))
quit('', 0)
