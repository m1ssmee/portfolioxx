// The page: the loader (drawn by index.html before any script) fetches every asset with byte
// progress, the scene is built behind it while it tells the real stages as they happen, and the
// visitor enters, with sound or without. Nothing loads or compiles after that.
import fontUrl from './assets/inter.woff2?url'
import posterUrl from './assets/poster.webp?url'

const LINES = {
  fetch: 'fetching the furniture',
  desk: 'dusting off the desk',
  earbuds: 'untangling the earphones',
  player: 'plugging in',
  ashtray: 'rolling one up',
  lighter: 'finding the lighter',
  light: 'lighting up your cig',
  smoke: 'letting the smoke settle',
  music: 'cueing the music',
  os: 'booting pod os',
  mood: 'setting the mood',
  ready: 'ready.',
}
// each stage's share of the bar: its measured share of a load (the fetch's from one on Fast 3G with
// 4x CPU slowdown; within the fetch, by bytes)
const WEIGHTS = { fetch: 27, desk: 22, earbuds: 22, player: 1, ashtray: 9, lighter: 1, light: 2, smoke: 16, music: 1, os: 1, mood: 1 }
const TOTAL = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
const MIN_LINE = 600 // ms a line stays, to be read
const MIN_SHOW = 1800 // ms the loader stays, at least
const SLOW = 15000 // ms: past this, a second line and "enter anyway"

const ld = document.getElementById('ld')
const el = document.getElementById('desk')
const lines = ld.querySelectorAll('.ld-line')
const bar = ld.querySelector('.ld-bar')
const fill = ld.querySelector('.ld-fill')
const ember = ld.querySelector('.ld-ember')
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const t0 = performance.now()
let returning = false
try {
  returning = sessionStorage.getItem('desk.visited') === '1'
} catch {
  // (no storage: a first visit)
}

// ---- progress: a weight per stage, each 0..1 done; the bar never goes back
const done = {}
let shown = 0
function progress(key, frac) {
  done[key] = Math.max(done[key] || 0, Math.min(1, frac))
  let p = 0
  for (const k in WEIGHTS) p += WEIGHTS[k] * (done[k] || 0)
  p /= TOTAL
  if (p <= shown) return
  shown = p
  fill.style.transform = `scaleX(${p.toFixed(4)})`
  bar.setAttribute('aria-valuenow', String(Math.round(p * 100)))
  // (the ember brightens as it fills)
  ember.style.opacity = (0.35 + 0.65 * p).toFixed(3)
}

// ---- the sentence: the stage under way now; each stays at least MIN_LINE, then the latest shows
let line = ''
let lineAt = 0
let want = ''
let flip = 0
let lineTimer = 0
function setLine(key) {
  want = returning && key !== 'ready' ? 'mood' : key
  if (lineTimer) return
  const wait = MIN_LINE - (performance.now() - lineAt)
  if (line && wait > 0) lineTimer = setTimeout(() => ((lineTimer = 0), setLine(want)), wait)
  else showLine(want)
}
function showLine(key) {
  if (key === line) return
  line = key
  lineAt = performance.now()
  const a = lines[flip]
  const b = lines[1 - flip]
  b.textContent = LINES[key]
  b.classList.add('on')
  b.removeAttribute('aria-hidden')
  a.classList.remove('on')
  a.setAttribute('aria-hidden', 'true')
  flip = 1 - flip
}
const started = []
const times = {} // (each stage's start and end, ms from the first paint: window.__loader)
function stage(key, state) {
  if (typeof state === 'number') return progress(key, state) // (a long stage, part done)
  const t = times[key] || (times[key] = {})
  t[state] = Math.round(performance.now() - t0)
  if (state === 'start') {
    started.push(key)
    setLine(key)
  } else {
    progress(key, 1)
    const i = started.indexOf(key)
    if (i >= 0) started.splice(i, 1)
    if (started.length) setLine(started[started.length - 1])
  }
}

// ---- every asset, fetched with its bytes counted (into the HTTP cache: the imports find it there)
async function fetchAll(list) {
  stage('fetch', 'start')
  const debug = new URLSearchParams(location.search).has('debug')
  const files = list.filter((f) => debug || !f.d)
  const total = files.reduce((a, f) => a + f.b, 0) || 1
  let got = 0
  await Promise.all(
    files.map(async (f) => {
      const r = await fetch(f.u)
      if (!r.ok) throw new Error(`${f.u}: ${r.status}`)
      if (!r.body) {
        got += f.b
        progress('fetch', got / total)
        return
      }
      const reader = r.body.getReader()
      for (;;) {
        const { done: end, value } = await reader.read()
        if (end) break
        got += value.length
        progress('fetch', got / total)
      }
    }),
  )
  stage('fetch', 'done')
}

// ---- failing: one calm line, and the way on (the poster, still)
function fail(e) {
  console.error('desk:', e)
  ld.classList.remove('slow')
  showLine('ready')
  lines[1 - flip].textContent = ''
  lines[flip === 0 ? 1 : 0].textContent = ''
  const l = ld.querySelector('.ld-line.on') || lines[0]
  l.textContent = 'the desk could not be set here.'
  l.classList.add('on')
  const go = ld.querySelector('.ld-go')
  go.innerHTML = '<button type="button" data-go="still">enter</button>'
  ld.classList.add('ready')
  go.querySelector('button').addEventListener('click', () => {
    el.classList.add('ld-fallback')
    el.style.backgroundImage = `url(${posterUrl})`
    leave(null)
  })
}

// ---- entering
let scene = null
let entered = false
let readyAt = 0
function leave(target) {
  ld.classList.add('gone')
  if (target && !reduce) {
    // the ember travels to the cigarette's own and fades into it
    const r = ember.getBoundingClientRect()
    const fly = document.createElement('div')
    fly.className = 'ld-fly'
    fly.style.left = `${r.left + r.width / 2}px`
    fly.style.top = `${r.top + r.height / 2}px`
    document.body.appendChild(fly)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        fly.style.transform = `translate(${target[0] - (r.left + r.width / 2)}px, ${target[1] - (r.top + r.height / 2)}px) scale(.6)`
        fly.style.opacity = '0'
      }),
    )
    setTimeout(() => fly.remove(), 1800)
  }
  setTimeout(() => ld.remove(), 1400)
  try {
    sessionStorage.setItem('desk.visited', '1')
  } catch {
    // (no storage)
  }
}
function enter(sound) {
  if (entered) return
  entered = true
  if (scene && readyAt) {
    scene.enter({ sound })
    leave(scene.emberScreen())
  } else {
    // (entered before the scene was ready: it fades in by itself when it is)
    leave(null)
    whenReady = () => {
      scene.enter({ sound: false })
    }
  }
}
let whenReady = null
ld.addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]')
  if (!b) return
  if (b.dataset.go === 'sound') enter(true)
  else if (b.dataset.go === 'quiet' || b.dataset.go === 'anyway') enter(false)
})

// ---- the run
setLine('fetch')
const slowTimer = setTimeout(() => ld.classList.add('slow'), SLOW)
;(async () => {
  try {
    // (no WebGL 2 here: nothing to fetch, the still at once)
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) throw new Error('no WebGL 2')
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    await fetchAll(window.__assets || [])
    const { createScene } = await import('./scene.js')
    scene = createScene(el, { hold: true, fontUrl, onStage: stage })
    await scene.ready
    if (scene.failed) throw new Error('the scene could not be set up')
    readyAt = performance.now()
    clearTimeout(slowTimer)
    ld.classList.remove('slow')
    // the bar full; the line still waiting its turn shown and read; the loader shown long enough:
    // then "ready."
    for (const k in WEIGHTS) progress(k, 1)
    if (lineTimer) {
      clearTimeout(lineTimer)
      lineTimer = 0
      showLine(want)
    }
    await new Promise((r) => setTimeout(r, Math.max(0, MIN_SHOW - (performance.now() - t0), MIN_LINE - (performance.now() - lineAt))))
    showLine('ready')
    ld.classList.add('ready')
    if (whenReady) whenReady()
    else ld.querySelector('[data-go="sound"]').focus({ preventScroll: true })
    window.__loader = { readyAt, t0, times }
  } catch (e) {
    clearTimeout(slowTimer)
    fail(e)
  }
})()
