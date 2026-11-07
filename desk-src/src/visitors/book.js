// The visitors' book, opened: a spread laid over the scene. The left page, everyone's prints (the
// newest first); the right, your own: pick an ink, add your name and where you are from if you like,
// then press and hold the pad (the longer, the darker the print). One print a visitor.
// Kept on the site's own endpoint (/api/visitors: api/visitors.js, a Vercel function over Upstash
// Redis); where there is none (a local copy, a host without it) the book still works, in this
// browser alone.
import './book.css'
import { INKS, printSvg } from './print.js'

const API = '/api/visitors'
const MINE = 'visitors.mine'
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const when = (t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export function createVisitorsBook({ host, onClose }) {
  const el = document.createElement('div')
  el.className = 'vb'
  el.hidden = true
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-labelledby', 'vb-title')
  el.innerHTML = `
    <div class="vb-veil" data-act="close"></div>
    <div class="vb-spread">
      <section class="vb-page vb-left">
        <header><h2 id="vb-title">Visitors</h2><p class="vb-count"></p></header>
        <ol class="vb-prints"></ol>
      </section>
      <div class="vb-spine" aria-hidden="true"></div>
      <section class="vb-page vb-right">
        <h3>Leave your print</h3>
        <p class="vb-sub">Pick an ink, then press and hold the pad.</p>
        <label class="vb-field"><span>Name</span><input name="name" maxlength="24" autocomplete="nickname" placeholder="optional"></label>
        <label class="vb-field"><span>From</span><input name="from" maxlength="28" placeholder="a city, a planet, optional"></label>
        <div class="vb-inks" role="radiogroup" aria-label="Ink">${INKS.map((k, i) => `<button type="button" role="radio" aria-checked="${i === 0}" aria-label="${k.name}" data-ink="${i}" style="--ink:${k.color}"></button>`).join('')}</div>
        <button type="button" class="vb-pad" aria-label="Press and hold to leave your print"><span class="vb-pad-print"></span><span class="vb-pad-hint">press &amp; hold</span></button>
        <p class="vb-note" aria-live="polite"></p>
      </section>
      <button type="button" class="vb-close" data-act="close" aria-label="Close the book">&times;</button>
    </div>`
  host.appendChild(el)
  const $ = (s) => el.querySelector(s)
  const list = $('.vb-prints')
  const pad = $('.vb-pad')
  const padPrint = $('.vb-pad-print')
  const note = $('.vb-note')
  let ink = 0
  let marks = []
  let shared = false
  let loaded = false
  let mine = null
  try {
    mine = JSON.parse(localStorage.getItem(MINE) || 'null')
  } catch {
    mine = null
  }

  function render() {
    const all = mine && !marks.some((m) => m.id === mine.id) ? [mine, ...marks] : marks
    $('.vb-count').textContent = !loaded ? 'opening…' : all.length ? `${all.length} ${all.length === 1 ? 'print' : 'prints'}${shared ? '' : ' · in this browser'}` : 'No prints yet. Be the first.'
    list.innerHTML = all
      .map((m, i) => {
        const tilt = (((m.seed >>> 3) % 13) - 6) * 0.9
        return `<li class="vb-mark${mine && m.id === mine.id && i === 0 && signedNow ? ' vb-new' : ''}" style="--tilt:${tilt}deg"><span class="vb-print">${printSvg(m.seed, m.ink, m.press)}</span><span class="vb-who">${esc(m.name || 'a visitor')}</span>${m.from ? `<span class="vb-from">${esc(m.from)}</span>` : ''}<span class="vb-when">${when(m.t)}</span></li>`
      })
      .join('')
    if (mine) {
      pad.disabled = true
      pad.classList.add('vb-done')
      padPrint.innerHTML = printSvg(mine.seed, mine.ink, mine.press)
      $('.vb-pad-hint').textContent = 'signed, thank you'
      for (const i of el.querySelectorAll('.vb-field input')) i.disabled = true
    }
  }
  let signedNow = false

  async function load() {
    try {
      const r = await fetch(API, { headers: { accept: 'application/json' } })
      if (!r.ok) throw new Error(String(r.status))
      const j = await r.json()
      marks = Array.isArray(j.marks) ? j.marks : []
      shared = true
    } catch {
      marks = []
      shared = false
    }
    loaded = true
    render()
  }

  async function sign(press) {
    const mark = {
      seed: (Math.random() * 4294967296) >>> 0,
      ink,
      press: Math.round(press * 100) / 100,
      name: $('input[name=name]').value.trim().slice(0, 24),
      from: $('input[name=from]').value.trim().slice(0, 28),
    }
    let saved = null
    if (shared) {
      try {
        const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(mark) })
        if (r.ok) saved = (await r.json()).mark
        else if (r.status === 429) note.textContent = 'One moment: too many prints at once. Try again in a little while.'
      } catch {
        saved = null
      }
    }
    if (!saved && note.textContent) return
    mine = saved || { ...mark, id: `local-${mark.seed}`, t: Date.now() }
    try {
      localStorage.setItem(MINE, JSON.stringify(mine))
    } catch {
      // (private mode: kept for this visit)
    }
    signedNow = true
    note.textContent = saved ? 'Thank you for visiting.' : 'Thank you for visiting. (Kept in this browser.)'
    render()
  }

  // ---- the pad: pressed and held, the print comes up; let go, it is left in the book
  let pressAt = 0
  let raf = 0
  let preview = null
  function pressStart() {
    if (mine || pressAt) return
    pressAt = performance.now()
    note.textContent = ''
    preview = (Math.random() * 4294967296) >>> 0
    pad.classList.add('vb-pressing')
    const grow = () => {
      const k = Math.min(1, (performance.now() - pressAt) / 900)
      padPrint.innerHTML = printSvg(preview, ink, 0.5 + 0.5 * k)
      padPrint.style.opacity = String(0.25 + 0.75 * k)
      if (k < 1) raf = requestAnimationFrame(grow)
    }
    grow()
  }
  function pressEnd(cancel = false) {
    if (!pressAt) return
    cancelAnimationFrame(raf)
    const held = performance.now() - pressAt
    pressAt = 0
    pad.classList.remove('vb-pressing')
    if (cancel || held < 250) {
      padPrint.innerHTML = ''
      if (!cancel) note.textContent = 'Hold a little longer.'
      return
    }
    sign(0.5 + 0.5 * Math.min(1, held / 900))
  }
  pad.addEventListener('pointerdown', (e) => {
    pad.setPointerCapture?.(e.pointerId)
    pressStart()
  })
  pad.addEventListener('pointerup', () => pressEnd())
  pad.addEventListener('pointercancel', () => pressEnd(true))
  pad.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault()
      pressStart()
    }
  })
  pad.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') pressEnd()
  })
  for (const b of el.querySelectorAll('.vb-inks button'))
    b.addEventListener('click', () => {
      ink = +b.dataset.ink
      for (const o of el.querySelectorAll('.vb-inks button')) o.setAttribute('aria-checked', String(o === b))
    })
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="close"]')) api.close()
  })
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      api.close()
    }
  })

  const api = {
    el,
    get isOpen() {
      return !el.hidden
    },
    open() {
      if (!el.hidden) return
      el.hidden = false
      requestAnimationFrame(() => el.classList.add('vb-open'))
      render()
      if (!loaded) load()
      ;(mine ? $('.vb-close') : $('input[name=name]')).focus({ preventScroll: true })
    },
    close() {
      if (el.hidden) return
      pressEnd(true)
      el.classList.remove('vb-open')
      setTimeout(() => {
        el.hidden = true
      }, 260)
      onClose?.()
    },
    dispose() {
      el.remove()
    },
  }
  return api
}
