// One AudioContext for everything the scene makes heard: the cigarette's paper crackle, the
// lighter's piezo click and the player's music. Nothing is created until the sound is first turned
// on; the music engine is loaded then too (its own chunk). The music plays only while the earbuds
// are plugged into the player, the player is playing and the sound is on; pulling the plug pauses
// it, as a real player does, and plugging it back in resumes it.
export function createAudio() {
  let ctx = null
  let noise = null // (one second of white noise, shared by every crackle and click)
  let master = null
  let musicBus = null
  let music = null
  let musicLoading = null
  let crackleT = 0
  const state = { on: false, running: true, plugged: true, playing: true }
  const listeners = new Set()
  const changed = () => {
    for (const f of listeners) f()
  }

  function make() {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return false
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 1
    master.connect(ctx.destination)
    const n = ctx.sampleRate
    noise = ctx.createBuffer(1, n, n)
    const d = noise.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    // (the music reaches the ears only through the earbuds: this gain is the plug)
    musicBus = ctx.createGain()
    musicBus.gain.value = 0
    musicBus.connect(master)
    musicLoading = import('./music.js').then(({ createMusic }) => {
      if (!ctx) return
      music = createMusic(ctx, musicBus)
      apply()
      changed()
    })
    return true
  }
  /** The music follows the plug, the player's play key and the sound switch. */
  function apply(fade = 0.03) {
    if (!ctx) return
    const audible = state.on && state.running && state.plugged && state.playing
    const t = ctx.currentTime
    musicBus.gain.cancelScheduledValues(t)
    musicBus.gain.setTargetAtTime(audible ? 1 : 0, t, fade / 3)
    if (music) {
      if (audible && !music.playing) music.play()
      else if (!audible && music.playing) music.pause()
    }
  }
  const ready = () => ctx && state.on && ctx.state === 'running'

  const api = {
    get on() {
      return state.on
    },
    get ctx() {
      return ctx
    },
    get music() {
      return music
    },
    get plugged() {
      return state.plugged
    },
    get playing() {
      return state.playing
    },
    /** The music audible now (sound on, plugged in, playing). */
    get audible() {
      return !!music && state.on && state.running && state.plugged && state.playing
    },
    onChange(f) {
      listeners.add(f)
      return () => listeners.delete(f)
    },
    /** Before entry: the context made (suspended until a click), the music engine built. */
    prepare() {
      if (!ctx && !make()) return Promise.resolve()
      if (!state.on) ctx.suspend()
      return musicLoading
    },
    /** The sound switch (the first time: the context is made, from this user gesture). `fade`: seconds. */
    enable(on, fade = 0.03) {
      state.on = on
      if (on && !ctx && !make()) return
      if (ctx) {
        if (on && state.running) ctx.resume()
        else ctx.suspend()
      }
      apply(fade)
      changed()
    },
    /** Out of view or a hidden tab: everything stops; back in view, it goes on. */
    setRunning(on) {
      state.running = on
      if (ctx) {
        if (on && state.on) ctx.resume()
        else ctx.suspend()
      }
      apply()
    },
    setPlugged(on) {
      if (state.plugged === on) return
      state.plugged = on
      apply()
      changed()
    },
    setPlaying(on) {
      if (state.playing === on) return
      state.playing = on
      apply()
      changed()
    },
    next() {
      music?.next()
      changed()
    },
    prev() {
      music?.prev()
      changed()
    },
    /** Pod OS's soft tick: a short, quiet, rounded click (only with the sound on). */
    tick() {
      if (!ready()) return
      const o = ctx.createOscillator()
      o.type = 'sine'
      const t = ctx.currentTime
      o.frequency.setValueAtTime(1350, t)
      o.frequency.exponentialRampToValueAtTime(900, t + 0.03)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.045, t + 0.002)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035)
      o.connect(g).connect(master)
      o.start(t)
      o.stop(t + 0.04)
    },
    /** The cigarette's paper: one tiny crackle (k: loudness 0..1). */
    burst(k) {
      if (!ready()) return
      const src = ctx.createBufferSource()
      src.buffer = noise
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 2200 + Math.random() * 4500
      bp.Q.value = 0.8
      const g = ctx.createGain()
      const t = ctx.currentTime
      const a = (0.015 + Math.random() * 0.04) * k
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(a, t + 0.002)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02 + Math.random() * 0.05)
      src.connect(bp).connect(g).connect(master)
      src.start(t, Math.random() * 0.9, 0.09)
    },
    /** The lighter's piezo: one sharp click. */
    click() {
      if (!ready()) return
      const src = ctx.createBufferSource()
      src.buffer = noise
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 3200
      const g = ctx.createGain()
      const t = ctx.currentTime
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.32, t + 0.0007)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012)
      src.connect(hp).connect(g).connect(master)
      src.start(t, Math.random() * 0.9, 0.02)
    },
    /** Each frame: the burning paper's crackle, now and then. */
    step(dt, burning) {
      if (!ready()) return
      crackleT -= dt
      if (crackleT <= 0) {
        crackleT = 0.04 + Math.random() * 0.22
        if (burning) api.burst(0.5 + Math.random() * 0.5)
      }
    },
    /** The music's levels for the player's screen (zeros while silent). */
    bars(out) {
      if (music && api.audible) music.bars(out)
      else out.fill(0)
      return out
    },
    whenMusic() {
      return musicLoading || Promise.resolve()
    },
    close() {
      music?.dispose()
      music = null
      ctx?.close()
      ctx = null
      listeners.clear()
    },
  }
  return api
}
