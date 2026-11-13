// One AudioContext for everything the scene makes heard: the cigarette's paper crackle, the
// lighter's piezo click, the lamp's switch, the laptop's keys, the can's tab, paper moved (all made
// here from noise and sines) and the player's music. Nothing is created until the sound is first
// turned on; the music engine is loaded then too (its own chunk). The music plays only while the
// earbuds are plugged into the player, the player is playing and the sound is on; pulling the plug
// pauses it, as a real player does, and plugging it back in resumes it.
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
  /** A grain of the noise at t (s): through a filter, a quick rise to `peak`, then a fall. */
  function grain(t, type, freq, q, peak, rise, fall) {
    const src = ctx.createBufferSource()
    src.buffer = noise
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + rise)
    g.gain.exponentialRampToValueAtTime(0.0001, t + rise + fall)
    src.connect(f).connect(g).connect(master)
    const len = rise + fall + 0.01
    src.start(t, Math.random() * Math.max(0, 0.95 - len), len)
    return f
  }
  /** A dull knock at t (s): a sine falling from f0 to f1 Hz, gone in `fall` s. */
  function thump(t, f0, f1, peak, fall) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(f1, t + fall)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, t + fall)
    o.connect(g).connect(master)
    o.start(t)
    o.stop(t + fall + 0.01)
  }

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
    /** The sound switch. */
    get on() {
      return state.on
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
    /** The lighter's piezo: one sharp click (k: loudness 0..1; the can's base on the desk uses it too). */
    click(k = 1) {
      if (!ready() || k <= 0) return
      const src = ctx.createBufferSource()
      src.buffer = noise
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 3200
      const g = ctx.createGain()
      const t = ctx.currentTime
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.32 * Math.min(1, k), t + 0.0007)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012)
      src.connect(hp).connect(g).connect(master)
      src.start(t, Math.random() * 0.9, 0.02)
    },
    /** The lamp's toggle: its snap, its detent a moment after, the shade knocked faintly (on: a
     * touch brighter than off). */
    lampSwitch(on = true) {
      if (!ready()) return
      const t = ctx.currentTime
      grain(t, 'bandpass', on ? 3400 : 2700, 1.4, 0.26, 0.0008, 0.016)
      grain(t + 0.012 + Math.random() * 0.008, 'bandpass', on ? 2900 : 2300, 1.4, 0.08, 0.0008, 0.012)
      thump(t, on ? 520 : 440, on ? 470 : 400, 0.03, 0.09)
    },
    /** A key of the laptop's keyboard: a soft, muffled tick and the key landing under it, each key
     * a little different. */
    keyTick() {
      if (!ready()) return
      const t = ctx.currentTime
      grain(t, 'bandpass', 1900 + Math.random() * 900, 1.1, 0.07 + Math.random() * 0.03, 0.0015, 0.02)
      thump(t + 0.004, 170 + Math.random() * 40, 90, 0.05, 0.03)
    },
    /** The can's tab: the seal cracking (a hard snap and the tab's click on the lid), the gas's hiss
     * falling away over half a second, and the fizz of its bubbles after it. */
    canOpen() {
      if (!ready()) return
      const t = ctx.currentTime
      grain(t, 'highpass', 1800, 0.7, 0.34, 0.0006, 0.018)
      grain(t + 0.006, 'bandpass', 4200, 2, 0.12, 0.0005, 0.01)
      const hiss = grain(t + 0.004, 'bandpass', 6500, 0.9, 0.11, 0.012, 0.55)
      hiss.frequency.setValueAtTime(6500, t + 0.016)
      hiss.frequency.exponentialRampToValueAtTime(3200, t + 0.5)
      for (let i = 0; i < 18; i++) grain(t + 0.08 + Math.random() * 0.9, 'highpass', 5000 + Math.random() * 3000, 0.7, 0.006 + Math.random() * 0.012, 0.0008, 0.006 + Math.random() * 0.01)
    },
    /** Paper moved: a short rustle, a soft body of noise and a few crackles of it close together
     * (k: loudness 0..1). */
    rustle(k = 1) {
      if (!ready()) return
      const t = ctx.currentTime
      grain(t, 'bandpass', 2600, 0.6, 0.035 * k, 0.03, 0.22)
      for (let i = 0; i < 9; i++) grain(t + Math.random() * 0.24, 'bandpass', 2500 + Math.random() * 4500, 1.2, (0.015 + Math.random() * 0.035) * k, 0.003, 0.02 + Math.random() * 0.05)
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
