// Pod OS: the player's own operating system, a small portfolio. A DOM app (360 x 383 logical px, the
// glass's shape) that is both what the visitor uses up close (the DOM itself, laid exactly over the 3D
// screen in focus mode) and, from across the desk, the screen's texture (paint.js paints that same
// DOM). One state, one layout: the two can never disagree. One screen: the music. What plays now (its
// time, the keys: previous, play or pause, next), a hint when nothing can be heard, and the songs (a
// tap on one plays it). The projects are on the laptop.
//   createPodOS({ content, audio, canvas, wantSound }) -> { el, canvas, ... } (see the API at the end)
//   wantSound(): the sound switched on (a song asked for with the sound off)
// The texture holds the colours exactly as the page shows them; the scene's shader undoes its tone
// mapping for them (scene.js), so the lit glass and the DOM agree.
import css from './os.css?inline'
import { iconSprite, icon } from './icons.js'
import { THEMES, wallpaperTile } from './theme.js'
import { paintDom, paintGlass } from './paint.js'
import { OS_W, OS_H, TEX_W, TEX_H, GLASS_R, BEZEL } from './size.js'
import { ARTIST, TRACKS } from '../core/tracks.js'

export { OS_W, OS_H, TEX_W, TEX_H }
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function createPodOS({ audio, canvas: into = null, wantSound = () => {} }) {
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
    view: 'home', // (the one screen)
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

  // ---- the markup: the status bar, what plays now and its keys, the songs
  const mmss = (s) => (s >= 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '–:––')
  const song = (t, i) =>
    `<button class="pos-card pos-song" data-act="song" data-i="${i}" aria-label="Play ${esc(t)}"><span class="pos-row"><span class="pos-song-n num mute">${i + 1}</span><span class="pos-song-t">${esc(t)}</span><span class="pos-song-on" hidden>${icon('bars', 16, 'ic')}</span><span class="sm mute num pos-song-d"></span></span></button>`
  el.innerHTML = `
    <div class="pos-status" aria-hidden="true"><span class="pos-st-np" hidden>${icon('bars', 14, 'ic')}</span><span class="pos-st-buds" hidden>${icon('buds', 14, 'ic')}</span><span class="pos-st-time num"></span></div>
    <section class="pos-view" data-view="home" hidden aria-label="Music">
      <div class="pos-head pos-head-home"><h1 class="pos-title">Music</h1><span class="sm mute">${esc(ARTIST)}</span></div>
      <div class="pos-body">
        <div class="pos-np" aria-live="polite">
          <p class="sm mute pos-np-k">Now playing</p>
          <p class="pos-strong pos-np-t">${esc(TRACKS[0])}</p>
          <div class="pos-bar" aria-hidden="true"><i class="pos-bar-f"></i></div>
          <div class="pos-row sm mute num"><span class="pos-np-at">0:00</span><span class="pos-np-len">–:––</span></div>
          <div class="pos-keys">
            <button class="pos-key" data-act="prev" aria-label="Previous song">${icon('prev', 22, 'ic')}</button>
            <button class="pos-key pos-key-main" data-act="play" aria-label="Play"><span class="pos-k-play">${icon('play', 26, 'ic')}</span><span class="pos-k-pause" hidden>${icon('pause', 26, 'ic')}</span></button>
            <button class="pos-key" data-act="next" aria-label="Next song">${icon('next', 22, 'ic')}</button>
          </div>
          <p class="sm pos-accent pos-hint"></p>
        </div>
        <h2 class="pos-h pos-songs-h">Songs</h2>
        ${TRACKS.map(song).join('')}
      </div>
    </section>
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
  // what plays now: its title, time and length, the play key, the song marked in the list, the hint
  const np = { i: -1, at: -2, len: -2, on: null, hint: null, lens: false }
  const setText = (sel, t) => {
    const n = $(sel)
    if (n.textContent !== t) {
      n.textContent = t
      dirty()
    }
  }
  function syncMusic() {
    const m = audio?.music
    const tr = m ? m.track : { index: 0, title: TRACKS[0], duration: -1 }
    const playing = !!audio?.playing && !!audio?.on
    if (m && !np.lens) {
      np.lens = true
      m.tracks.forEach((t, i) => {
        const d = el.querySelectorAll('.pos-song-d')[i]
        if (d) d.textContent = mmss(t.duration)
      })
      dirty()
    }
    if (tr.index !== np.i) {
      np.i = tr.index
      setText('.pos-np-t', tr.title)
      el.querySelectorAll('.pos-song').forEach((b, i) => {
        b.classList.toggle('pos-song-cur', i === tr.index)
        b.querySelector('.pos-song-on').hidden = i !== tr.index
        b.querySelector('.pos-song-n').hidden = i === tr.index
      })
      dirty()
    }
    const at = m ? Math.floor(m.time) : 0
    const len = tr.duration
    if (at !== np.at || len !== np.len) {
      np.at = at
      np.len = len
      setText('.pos-np-at', mmss(at))
      setText('.pos-np-len', mmss(len))
      $('.pos-bar-f').style.width = `${len > 0 ? Math.min(100, (100 * at) / len).toFixed(2) : 0}%`
      dirty()
    }
    if (playing !== np.on) {
      np.on = playing
      $('.pos-k-play').hidden = playing
      $('.pos-k-pause').hidden = !playing
      $('[data-act="play"]').setAttribute('aria-label', playing ? 'Pause' : 'Play')
      setText('.pos-np-k', playing ? 'Now playing' : 'Paused')
      dirty()
    }
    const hint = !audio?.on ? 'The sound is off: pick a song to turn it on.' : !audio?.plugged ? 'Plug the earbuds in to hear it.' : ''
    if (hint !== np.hint) {
      np.hint = hint
      setText('.pos-hint', hint)
    }
  }

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
  /** One screen: nothing to go back to (false: the scene then leaves the player). */
  function back() {
    return false
  }
  function focusFirst() {
    if (st.mode !== 'dom' || !keyboard) return
    // (the song playing, or the first)
    ;(el.querySelector('.pos-song-cur') || el.querySelector('.pos-song'))?.focus({ preventScroll: true })
  }
  el.addEventListener('pointerdown', () => byKeys(false), { passive: true })
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]')
    if (!b) return
    const act = b.dataset.act
    tick()
    if (act === 'song' || (act === 'play' && !audio?.on)) {
      if (!audio?.on) wantSound()
      if (act === 'song') audio?.select(+b.dataset.i)
      else audio?.setPlaying(true)
    } else if (act === 'play') audio?.setPlaying(!audio.playing)
    else if (act === 'prev') audio?.prev()
    else if (act === 'next') audio?.next()
    syncMusic()
    dirty()
  })
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
  syncMusic()

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
      syncMusic()
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
    back,
    key,
    onKeyDown,
    setMode,
    /** The keyboard's way in: the song playing (or the first). */
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
