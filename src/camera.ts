// The pod's camera app: the visitor's webcam, crushed into a tiny buffer and squeezed
// horizontally, so everything looks tall and narrow like a cheap 2000s digicam.
// Frames never leave the browser.

export type CamState = 'off' | 'starting' | 'live' | 'blocked' | 'none'
export const FILTERS = ['Squish', 'Mono', 'Night'] as const

const LW = 84 // low-res buffer; the whole camera frame is squeezed into this narrow shape
const LH = 132

function mk(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, x: c.getContext('2d', { willReadFrequently: true })! }
}

export const cam = {
  state: 'off' as CamState,
  filter: 0,
  flashAt: -1e9,
  photos: [] as HTMLCanvasElement[],
  aspect: LW / LH,
  media: null as null | { video: HTMLVideoElement; stream: MediaStream },
  low: null as null | { c: HTMLCanvasElement; x: CanvasRenderingContext2D },
  seed: 1,

  async start() {
    if (this.state === 'live' || this.state === 'starting') return
    this.state = 'starting'
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('none')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      })
      if (this.state !== 'starting') {
        // left the camera before permission came back
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      const video = document.createElement('video')
      video.muted = true
      video.playsInline = true
      video.srcObject = stream
      video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none'
      document.body.appendChild(video)
      await video.play().catch(() => undefined)
      this.media = { video, stream }
      this.state = 'live'
    } catch (e) {
      const name = (e as { name?: string })?.name
      this.state = name === 'NotAllowedError' || name === 'SecurityError' ? 'blocked' : 'none'
    }
  },

  stop() {
    if (this.media) {
      this.media.stream.getTracks().forEach((t) => t.stop())
      this.media.video.remove()
      this.media = null
    }
    this.state = 'off'
  },

  next(d: number) {
    this.filter = (this.filter + d + FILTERS.length) % FILTERS.length
  },

  /** Take a photo of whatever is on screen right now. */
  shoot(now: number) {
    if (!this.low) return
    const p = mk(LW * 4, LH * 4)
    p.x.imageSmoothingEnabled = false
    p.x.drawImage(this.low.c, 0, 0, LW * 4, LH * 4)
    this.photos.unshift(p.c)
    this.photos.length = Math.min(this.photos.length, 8)
    this.flashAt = now
  },

  /** Fill the low-res buffer with the next frame and run the filter over it. */
  frame(now: number, roomA: string, roomB: string) {
    if (!this.low) this.low = mk(LW, LH)
    const l = this.low.x
    const v = this.media?.video
    if (this.state === 'live' && v && v.readyState >= 2 && v.videoWidth) {
      l.save()
      l.translate(LW, 0)
      l.scale(-1, 1) // mirror, like any selfie camera
      l.drawImage(v, 0, 0, v.videoWidth, v.videoHeight, 0, 0, LW, LH)
      l.restore()
    } else {
      // a test pattern so the effect still shows without a camera: a figure in a room
      const t = now / 1000
      const g = l.createLinearGradient(0, 0, LW, LH)
      g.addColorStop(0, roomA)
      g.addColorStop(1, roomB)
      l.fillStyle = g
      l.fillRect(0, 0, LW, LH)
      l.fillStyle = 'rgba(255,255,255,0.35)'
      l.fillRect(LW * 0.65, LH * 0.08, LW * 0.25, LH * 0.3)
      const bob = Math.sin(t * 1.3) * 2
      l.fillStyle = '#2a2420'
      l.beginPath()
      l.ellipse(LW / 2 + Math.sin(t * 0.7) * 6, LH * 0.42 + bob, LW * 0.2, LH * 0.15, 0, 0, Math.PI * 2)
      l.fill()
      l.beginPath()
      l.ellipse(LW / 2 + Math.sin(t * 0.7) * 4, LH * 0.95 + bob, LW * 0.42, LH * 0.3, 0, 0, Math.PI * 2)
      l.fill()
    }

    const img = l.getImageData(0, 0, LW, LH)
    const d = img.data
    const f = FILTERS[this.filter]
    let s = (this.seed = (this.seed * 16807) % 2147483647)
    for (let i = 0; i < d.length; i += 4) {
      s = (s * 16807) % 2147483647
      const n = ((s & 255) - 128) / 128 // grain
      let r = d[i]
      let g = d[i + 1]
      let b = d[i + 2]
      const lum = 0.3 * r + 0.59 * g + 0.11 * b
      if (f === 'Squish') {
        // punchy, warm, lifted blacks, noisy: the cheap-digicam look
        r = lum + (r - lum) * 1.35
        g = lum + (g - lum) * 1.35
        b = lum + (b - lum) * 1.35
        r = (r - 128) * 1.22 + 140 + n * 14
        g = (g - 128) * 1.22 + 132 + n * 14
        b = (b - 128) * 1.22 + 118 + n * 14
      } else if (f === 'Mono') {
        const v2 = (lum - 128) * 1.5 + 128 + n * 22
        r = g = b = v2
      } else {
        const v2 = (lum - 100) * 1.6 + 110 + n * 26
        r = v2 * 0.28
        g = v2 * 1.05
        b = v2 * 0.35
      }
      d[i] = r
      d[i + 1] = g
      d[i + 2] = b
    }
    l.putImageData(img, 0, 0)
  },
}
