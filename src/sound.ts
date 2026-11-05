// Tiny Web Audio clicks for the wheel. No audio files.

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    return makeAudio()
  } catch {
    return null
  }
}

function makeAudio(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    const len = Math.floor(ctx.sampleRate * 0.03)
    noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** kind 'tick' = wheel detent, 'press' = button. volume 0..1 */
export function click(kind: 'tick' | 'press', volume: number) {
  const a = audio()
  if (!a || !noise || volume <= 0) return
  const src = a.createBufferSource()
  src.buffer = noise
  const filter = a.createBiquadFilter()
  filter.type = kind === 'tick' ? 'highpass' : 'bandpass'
  filter.frequency.value = kind === 'tick' ? 3800 : 1400
  const gain = a.createGain()
  gain.gain.value = (kind === 'tick' ? 0.55 : 0.8) * volume
  src.connect(filter).connect(gain).connect(a.destination)
  src.start()
}

/** A short mechanical click for plugging in, a softer pop for pulling out. */
export function plugSound(kind: 'in' | 'out', volume = 0.7) {
  const a = audio()
  if (!a || !noise || volume <= 0) return
  const t = a.currentTime
  // body of the sound: a quick low thump
  const osc = a.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(kind === 'in' ? 190 : 140, t)
  osc.frequency.exponentialRampToValueAtTime(kind === 'in' ? 90 : 60, t + 0.06)
  const og = a.createGain()
  og.gain.setValueAtTime(0.28 * volume, t)
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
  osc.connect(og).connect(a.destination)
  osc.start(t)
  osc.stop(t + 0.1)
  // the click on top
  const src = a.createBufferSource()
  src.buffer = noise
  const f = a.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = kind === 'in' ? 2600 : 1200
  const g = a.createGain()
  g.gain.value = (kind === 'in' ? 0.9 : 0.5) * volume
  src.connect(f).connect(g).connect(a.destination)
  src.start(t + (kind === 'in' ? 0.012 : 0))
}

export function buzz(ms: number) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms)
    } catch {
      /* not allowed */
    }
  }
}
