// Pod OS: the player's own operating system, a small portfolio. A DOM app (360 x 383 logical px, the
// glass's shape) that is both what the visitor uses up close (the DOM itself, laid exactly over the 3D
// screen in focus mode) and, from across the desk, the screen's texture (paint.js paints that same
// DOM). One state, one layout: the two can never disagree. Three screens: the projects list (home), a
// project's page, About & contact.
//   createPodOS({ content, audio, canvas }) -> { el, canvas, ... } (see the API at the end)
// The texture holds the colours exactly as the page shows them; the scene's shader undoes its tone
// mapping for them (scene.js), so the lit glass and the DOM agree.
import css from './os.css?inline'
import { iconSprite, icon } from './icons.js'
import { THEMES, wallpaperTile } from './theme.js'
import { paintDom, paintGlass } from './paint.js'
import { OS_W, OS_H, TEX_W, TEX_H, GLASS_R, BEZEL } from './size.js'

export { OS_W, OS_H, TEX_W, TEX_H }
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function createPodOS({ content: C, audio, canvas: into = null }) {
  // ---- the root, its style, the icon sprite
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
  const holder = document.createElement('div')
  holder.innerHTML = iconSprite()
  const sprite = holder.firstChild
  document.body.appendChild(sprite)
  const el = document.createElement('div')
  el.className = 'pos'
  el.setAttribute('role', 'region')
  el.setAttribute('aria-label', 'Pod OS, on the music player')
  el.setAttribute('aria-roledescription', 'player screen')
  el.dataset.power = 'asleep'
  el.hidden = true
  el.inert = true
  el.setAttribute('aria-hidden', 'true')

  // ---- the look: the scene's light theme; the visitor's own motion setting, as it changes
  const motionQ = matchMedia('(prefers-reduced-motion: reduce)')
  const st = {
    power: 'asleep', // asleep | awake
    view: 'home', // home | about | project:<id>
    theme: 'light',
    reduced: motionQ.matches,
    mode: 'texture', // texture | dom
  }
  const wall = wallpaperTile()
  function applyLook() {
    el.dataset.theme = st.theme
    for (const [k, v] of Object.entries(THEMES[st.theme])) el.style.setProperty(`--${k}`, v)
    el.style.setProperty('--wall', `url(${wall.url})`)
    el.dataset.wallTile = 'grain'
    el.classList.toggle('pos-quiet', st.reduced)
  }
  const onMotion = () => {
    st.reduced = motionQ.matches
    applyLook()
  }
  motionQ.addEventListener('change', onMotion)

  // ---- the markup: the status bar, the projects list, each project's page, About & contact
  const P = C.projects
  const tag = (t) => `<span class="pos-tag">${esc(t)}</span>`
  const backBtn = `<button class="pos-back" data-act="back" aria-label="Back">${icon('back', 20, 'ic')}</button>`
  const page = (id, title, body) => `<section class="pos-view" data-view="${esc(id)}" hidden aria-label="${esc(title)}"><div class="pos-head">${backBtn}<h1 class="pos-title">${esc(title)}</h1></div><div class="pos-body">${body}</div></section>`
  const card = (p) =>
    `<button class="pos-card" data-act="project" data-id="${esc(p.id)}"><span class="pos-row"><span class="pos-strong">${esc(p.name)}</span><span class="sm mute num">${esc(p.year)}</span></span><span class="sm mute" style="display:block;margin-top:2px">${esc(p.oneLiner)}</span><span class="pos-tags">${p.stack.map(tag).join('')}</span></button>`
  const link = (url, text) => `<a class="pos-btn" href="${esc(url)}" target="_blank" rel="noopener">${icon('out', 16, 'ic')}<span>${esc(text)}</span></a>`
  const project = (p) => {
    // (its pictures, if it has any: none, no gallery)
    const shots = p.screenshots.map((s, i) => `<span class="pos-shot" data-shot="${i}"><img src="${esc(s)}" alt="${esc(p.name)}, screenshot ${i + 1}" decoding="async"></span>`).join('')
    const links = [p.github && link(p.github, 'GitHub'), p.live && link(p.live, 'Live demo')].filter(Boolean).join('')
    return page(
      `project:${p.id}`,
      p.name,
      `${shots ? `<div class="pos-shots" role="list">${shots}</div>` : ''}
      <div class="pos-sec" style="margin-top:${shots ? 14 : 4}px"><h2 class="pos-h">What it is</h2><p>${esc(p.whatItIs)}</p></div>
      <div class="pos-sec"><h2 class="pos-h">What I built</h2><p>${esc(p.whatIBuilt)}</p></div>
      <div class="pos-sec"><h2 class="pos-h">Stack</h2><div class="pos-tags">${p.stack.map(tag).join('')}</div></div>
      <div class="pos-sec"><h2 class="pos-h">Challenges</h2><ul>${p.challenges.map((c) => `<li class="pos-li"><i class="pos-li-b"></i>${esc(c)}</li>`).join('')}</ul></div>
      ${links ? `<div class="pos-sec"><div class="pos-btns">${links}</div></div>` : ''}`,
    )
  }
  const avatar = C.photo ? `<img src="${esc(C.photo)}" alt="${esc(C.name)}">` : `<span>${esc(C.initials)}</span>`
  el.innerHTML = `
    <div class="pos-status" aria-hidden="true"><span class="pos-st-np" hidden>${icon('bars', 14, 'ic')}</span><span class="pos-st-buds" hidden>${icon('buds', 14, 'ic')}</span><span class="pos-st-time num"></span></div>
    <section class="pos-view" data-view="home" hidden aria-label="Projects">
      <div class="pos-head pos-head-home"><h1 class="pos-title">Projects</h1><button class="pos-btn" data-act="about">About</button></div>
      <div class="pos-body">${P.map(card).join('')}</div>
    </section>
    ${P.map(project).join('')}
    ${page(
      'about',
      'About & contact',
      `<div class="pos-me"><div class="pos-avatar">${avatar}</div><div><p class="pos-strong">${esc(C.name)}</p><p class="sm mute">${esc(C.role)}</p>${C.basedIn ? `<p class="sm mute">${esc(C.basedIn)}</p>` : ''}</div></div>
      <div class="pos-sec" style="margin-top:14px"><p>${esc(C.bio)}</p></div>
      <div class="pos-sec"><h2 class="pos-h">Contact</h2>${C.email ? `<div class="pos-mail-row"><span class="pos-mail">${esc(C.email)}</span><button class="pos-btn" data-act="copy" aria-label="Copy email address">${icon('copy', 16, 'ic')}<span class="pos-copy-l">Copy</span></button></div><p class="sm pos-accent pos-copied" aria-live="polite"></p>` : ''}
      <div class="pos-btns"${C.email ? ' style="margin-top:10px"' : ''}>${[C.links.github && link(C.links.github, 'GitHub'), C.links.linkedin && link(C.links.linkedin, 'LinkedIn'), C.links.x && link(C.links.x, 'X')].filter(Boolean).join('')}</div></div>`,
    )}
    <i class="pos-cam" aria-hidden="true"><i></i></i>
    <div class="pos-sleep" data-paint="skip"></div>
    <div class="pos-glass" data-paint="skip" aria-hidden="true"></div>`

  const $ = (s) => el.querySelector(s)
  const $$ = (s) => el.querySelectorAll(s)
  const views = new Map([...$$('.pos-view')].map((v) => [v.dataset.view, v]))

  // ---- state to the screen
  let isDirty = true
  let paintAt = 0
  let paintMs = 0
  const dirty = () => {
    isDirty = true
  }
  // (which view shows, and the transition under way: a new one finishes it at once)
  let shown = null
  let timers = []
  let animUntil = 0
  const settle = (v) => {
    v.classList.remove('pos-anim')
    v.style.opacity = ''
    v.style.transform = ''
    v.style.transformOrigin = ''
  }
  function showView(name, from) {
    const next = views.get(name)
    if (shown === next) return
    for (const t of timers) clearTimeout(t)
    timers = []
    for (const v of views.values()) {
      if (v !== next && v !== shown) v.hidden = true
      settle(v)
    }
    const prev = shown
    shown = next
    next.hidden = false
    // (up close: a page opens from what was touched, scaling up as it fades in, and back the
    // reverse; with reduced motion, the fade alone)
    const anim = st.mode === 'dom' && from !== undefined
    const scale = (k) => (st.reduced ? 'none' : `scale(${k})`)
    if (prev) {
      if (anim) {
        prev.classList.add('pos-anim')
        prev.style.opacity = '0'
        prev.style.transform = scale(from === 'back' ? 1.04 : 0.98)
        timers.push(
          setTimeout(() => {
            prev.hidden = true
            settle(prev)
            dirty()
          }, 220),
        )
      } else prev.hidden = true
    }
    if (anim) {
      next.style.transformOrigin = from && from.x !== undefined ? `${from.x}px ${from.y}px` : '50% 50%'
      next.style.opacity = '0'
      next.style.transform = scale(from === 'back' ? 0.98 : 0.86)
      void next.offsetWidth
      next.classList.add('pos-anim')
      next.style.opacity = '1'
      next.style.transform = scale(1)
      timers.push(
        setTimeout(() => {
          settle(next)
          dirty()
        }, 230),
      )
      animUntil = performance.now() + 240
    }
    dirty()
  }
  function render(from) {
    el.dataset.power = st.power
    showView(st.view, from)
    syncStatus()
    dirty()
  }

  // ---- the status bar
  let minuteWas = -1
  function syncClock(now = new Date()) {
    const m = now.getHours() * 60 + now.getMinutes()
    if (m === minuteWas) return
    minuteWas = m
    $('.pos-st-time').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    dirty()
  }
  function syncStatus() {
    const np = $('.pos-st-np')
    const bd = $('.pos-st-buds')
    const playing = !!audio?.audible
    if (np.hidden === playing) {
      np.hidden = !playing
      dirty()
    }
    if (bd.hidden === !!audio?.plugged) {
      bd.hidden = !audio?.plugged
      dirty()
    }
  }
  audio?.onChange?.(syncStatus)

  // ---- navigation: home, a project's page or About & contact, and back
  const tick = () => {
    if (audio?.on) audio.tick?.()
  }
  // (moving by keys, the player's or the keyboard's: the focus ring shows, and a view opens with its
  // first item focused; a touch or click hides the ring and focuses nothing)
  let keyboard = false
  const byKeys = (on) => {
    keyboard = on
    el.classList.toggle('pos-kbd', on)
  }
  const onKeyAny = (e) => {
    // (some keydowns carry no key: autofill's)
    const k = e.key || ''
    if (k === 'Tab' || k.startsWith('Arrow') || k === 'Enter') keyboard = true
  }
  const onPointerAny = () => {
    keyboard = false
  }
  window.addEventListener('keydown', onKeyAny, true)
  window.addEventListener('pointerdown', onPointerAny, true)
  let cameFrom = null // (the card or button a page was opened from: back returns the focus there)
  function go(view, fromEl) {
    if (st.power !== 'awake' || !views.has(view) || st.view === view) return false
    let from = {}
    if (fromEl) {
      const r = fromEl.getBoundingClientRect()
      const o = el.getBoundingClientRect()
      const k = o.width / OS_W
      from = { x: (r.left + r.width / 2 - o.left) / k, y: (r.top + r.height / 2 - o.top) / k }
    }
    cameFrom = fromEl ? (fromEl.dataset.act === 'project' ? `[data-act="project"][data-id="${fromEl.dataset.id}"]` : `[data-act="${fromEl.dataset.act}"]`) : null
    st.view = view
    render(from)
    tick()
    focusFirst()
    return true
  }
  const openProject = (id, fromEl) => P.some((p) => p.id === id) && go(`project:${id}`, fromEl || el.querySelector(`[data-act="project"][data-id="${CSS.escape(id)}"]`))
  const openAbout = (fromEl) => go('about', fromEl || $('[data-act="about"]'))
  /** Back to the projects list; false there (the scene then leaves the player). */
  function back() {
    if (st.power !== 'awake' || st.view === 'home') return false
    st.view = 'home'
    render('back')
    tick()
    if (keyboard && st.mode === 'dom') (cameFrom && el.querySelector(cameFrom))?.focus({ preventScroll: true })
    return true
  }
  function focusFirst() {
    if (st.mode !== 'dom' || !keyboard) return
    // (the list: its first project; a page: its first link or button)
    const v = views.get(st.view)
    ;(v?.querySelector('.pos-card') || v?.querySelector('button:not(.pos-back), a'))?.focus({ preventScroll: true })
  }
  el.addEventListener('pointerdown', () => byKeys(false), { passive: true })
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]')
    if (!b) return
    const act = b.dataset.act
    if (act === 'project') openProject(b.dataset.id, b)
    else if (act === 'about') openAbout(b)
    else if (act === 'back') back()
    else if (act === 'copy') {
      tick()
      copyEmail(b)
    }
    dirty()
  })
  // (pressed: a little darker and smaller, from CSS :active; a key press shows it too)
  async function copyEmail(b) {
    let ok = false
    try {
      await navigator.clipboard.writeText(C.email)
      ok = true
    } catch {
      // (no clipboard here: select the address so it can be copied by hand)
      const r = document.createRange()
      r.selectNodeContents($('.pos-mail'))
      getSelection().removeAllRanges()
      getSelection().addRange(r)
    }
    const msg = $('.pos-copied')
    msg.textContent = ok ? 'copied' : 'selected: press ⌘C or Ctrl+C'
    b.querySelector('.pos-copy-l').textContent = ok ? 'Copied' : 'Copy'
    dirty()
    setTimeout(() => {
      msg.textContent = ''
      b.querySelector('.pos-copy-l').textContent = 'Copy'
      dirty()
    }, 1800)
  }

  // ---- the keyboard (up close): the arrows through the items, Enter, Escape or Backspace
  function focusables() {
    const v = views.get(st.view)
    return v ? [...v.querySelectorAll('button, a[href]')].filter((x) => x.offsetParent !== null) : []
  }
  function move(step) {
    const list = focusables()
    if (!list.length) return
    const i = list.indexOf(document.activeElement)
    const j = i < 0 ? 0 : Math.min(list.length - 1, Math.max(0, i + step))
    list[j].focus()
    list[j].scrollIntoView?.({ block: 'nearest' })
  }
  function onKeyDown(e) {
    if (st.mode !== 'dom' || st.power === 'asleep') return false
    const k = e.key || ''
    if (k === 'Escape' || k === 'Backspace') return back()
    if (!k.startsWith('Arrow')) return false
    byKeys(true)
    move(k === 'ArrowDown' || k === 'ArrowRight' ? 1 : -1)
    dirty()
    return true
  }
  el.addEventListener('keydown', (e) => {
    if (onKeyDown(e)) {
      e.preventDefault()
      e.stopPropagation()
    }
  })
  el.addEventListener('focusin', dirty)

  // ---- the player's keys: back, select, next item (while the OS is up close and awake)
  function key(name) {
    if (st.power === 'asleep') return false
    byKeys(true)
    if (name === 'back') return back()
    const list = focusables()
    if (!list.length) return true
    const i = list.indexOf(document.activeElement)
    if (name === 'next') {
      const j = i < 0 ? 0 : (i + 1) % list.length
      list[j].focus()
      list[j].scrollIntoView?.({ block: 'nearest' })
    } else if (name === 'select') {
      const t = i < 0 ? list[0] : list[i]
      t.classList.add('pos-press')
      setTimeout(() => t.classList.remove('pos-press'), 120)
      t.click()
    }
    dirty()
    return true
  }

  // ---- power: asleep (black), awake
  let level = 0 // (the screen's brightness, 0..1, eased)
  function wake() {
    if (st.power !== 'asleep') return
    st.power = 'awake'
    syncClock()
    render()
  }
  function sleep() {
    st.power = 'asleep'
    st.view = 'home'
    render()
  }

  // ---- the texture
  const canvas = into || document.createElement('canvas')
  canvas.width = TEX_W
  canvas.height = TEX_H
  let pattern = null
  function paint() {
    if (!pattern) pattern = canvas.getContext('2d').createPattern(wall.canvas, 'repeat')
    // (laid out untransformed and opaque while it is read; the layer is put back at once)
    const tf = el.style.transform
    const op = el.style.opacity
    const vis = el.hidden
    el.style.transform = 'none'
    el.style.opacity = '1'
    el.hidden = false
    const t = performance.now()
    paintDom(el, canvas, TEX_W / OS_W, { grain: pattern })
    paintGlass(canvas.getContext('2d'), TEX_W / OS_W, OS_W, OS_H, GLASS_R, BEZEL)
    el.style.transform = tf
    el.style.opacity = op
    el.hidden = vis
    isDirty = false
    paintAt = performance.now()
    paintMs = paintAt - t
  }

  // ---- up close: the DOM laid exactly over the 3D screen
  const m3 = new Float64Array(16)
  let placed = ''
  /** The CSS transform that maps the 360 x 383 box onto the projected screen quad p (TL, TR, BR, BL; CSS px). */
  function placeOver(p) {
    // the homography from the unit square, then scaled to the box (Heckbert's square-to-quad)
    const [x0, y0, x1, y1, x2, y2, x3, y3] = p
    const dx1 = x1 - x2
    const dx2 = x3 - x2
    const sx = x0 - x1 + x2 - x3
    const dy1 = y1 - y2
    const dy2 = y3 - y2
    const sy = y0 - y1 + y2 - y3
    const den = dx1 * dy2 - dx2 * dy1
    const g = (sx * dy2 - dx2 * sy) / den
    const h = (dx1 * sy - sx * dy1) / den
    const a = x1 - x0 + g * x1
    const b = x3 - x0 + h * x3
    const c = x0
    const d = y1 - y0 + g * y1
    const e = y3 - y0 + h * y3
    const f = y0
    // column-major matrix3d, the box's px scaled into the unit square first
    m3.set([a / OS_W, d / OS_W, 0, g / OS_W, b / OS_H, e / OS_H, 0, h / OS_H, 0, 0, 1, 0, c, f, 0, 1])
    // (written only when it changed: a still camera costs the page nothing)
    const t = `matrix3d(${Array.prototype.join.call(m3, ',')})`
    if (t !== placed) el.style.transform = placed = t
  }
  /** 'dom': the layer is the screen (shown, focusable); 'texture': the texture is, painted from this very state first (the layer can still fade out over it: fade()). */
  function setMode(mode) {
    if (st.mode === mode) return
    st.mode = mode
    if (mode === 'dom') {
      el.hidden = false
      el.inert = false
      el.removeAttribute('aria-hidden')
      focusFirst()
    } else {
      if (el.contains(document.activeElement)) document.activeElement.blur()
      paint()
      el.inert = true
      el.setAttribute('aria-hidden', 'true')
    }
  }
  /** The layer's opacity (0 hides it). */
  function fade(a) {
    el.style.opacity = a >= 1 ? '' : String(a)
    el.hidden = a <= 0
  }

  /** Before it is first seen: every image decoded (nothing loads after entry), the texture painted. */
  async function prepare() {
    const urls = [...new Set([wall.url, ...[...el.querySelectorAll('img')].map((i) => i.src)])]
    await Promise.all(
      urls.map((u) => {
        const im = new Image()
        im.src = u
        return im.decode().catch(() => {})
      }),
    )
    paint()
  }

  applyLook()
  syncClock()
  render()

  return {
    el,
    canvas,
    /** The texture needs painting (it changed since it was last painted, and nothing is mid-transition). */
    get dirty() {
      return isDirty && performance.now() > animUntil
    },
    paint,
    /** Each frame: the clock, the status glyphs; returns true while the screen's brightness eases. */
    update(dt) {
      syncClock()
      syncStatus()
      const want = st.power === 'asleep' ? 0 : 1
      if (level !== want) {
        const l2 = level + (want - level) * (1 - Math.exp(-(st.reduced ? 30 : 7) * dt))
        level = Math.abs(want - l2) < 0.003 ? want : l2
        return true
      }
      return false
    },
    get level() {
      return level
    },
    get power() {
      return st.power
    },
    get mode() {
      return st.mode
    },
    get theme() {
      return st.theme
    },
    get view() {
      return st.view
    },
    get lastPaint() {
      return paintAt
    },
    /** How long the last paint took (ms). */
    get paintMs() {
      return paintMs
    },
    prepare,
    wake,
    sleep,
    openProject: (id) => openProject(id),
    openAbout: () => openAbout(),
    back,
    key,
    onKeyDown,
    setMode,
    /** The keyboard's way in: the first project (or a page's first link). */
    focusFirst,
    fade,
    placeOver,
    destroy() {
      window.removeEventListener('keydown', onKeyAny, true)
      window.removeEventListener('pointerdown', onPointerAny, true)
      motionQ.removeEventListener('change', onMotion)
      el.remove()
      style.remove()
      sprite.remove()
    },
  }
}
