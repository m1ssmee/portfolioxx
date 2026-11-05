// Tiny Web Audio clicks for the wheel. No audio files.

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
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

export function buzz(ms: number) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms)
    } catch {
      /* not allowed */
    }
  }
}
