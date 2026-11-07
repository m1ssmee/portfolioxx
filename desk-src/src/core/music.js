// The player's music: a small generative engine on the Web Audio API alone (no samples, no network).
// Four tracks by one (made-up) artist, each from its own seed, tempo, key, mode and band: an electric
// piano (two-operator FM with a little tine), a round bass, brushes or a soft lo-fi kit made of
// filtered noise, a vibraphone or a breathy lead, a pad, and a crackle (or rain) bed. All of it goes
// through a little "tape" (a slow pitch wobble), a dark plate reverb, a gentle compressor and a soft
// ceiling, so the peaks stay well under 0 dBFS. Notes are planned a bar at a time from the track's
// seed (a given position always plays the same music) and only become audio nodes ~0.18 s ahead of
// the audio clock; every node is disconnected when it ends.

const LOOKAHEAD = 0.18 // s of audio scheduled ahead of ctx.currentTime
const TICK = 25 // ms between scheduler ticks
const FADE = 0.08 // s: the pause fade
const FADE_IN = 0.14 // s: the play fade
const GAP = 1.6 // s of silence between two tracks
const ARTIST = 'Mira Tallow'

// ---- arrangement flags (per bar) and event kinds ----
const EP = 1
const BS = 2
const D1 = 4 // light drums
const D2 = 8 // full drums
const ML = 16 // melody
const PD = 32 // pad
const END = 64 // the final chord
// prettier-ignore
const K = { EP: 1, CH: 2, HOLD: 3, BASS: 4, KICK: 5, SNARE: 6, BRUSH: 7, SWEEP: 8, HAT: 9, RIDE: 10, RIM: 11, SHAKE: 12, VIB: 13, LEAD: 14, PAD: 15 }

// ---- small helpers ----
function mulberry(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function mix32(a, b) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35)
  h ^= h >>> 13
  h = Math.imul(h, 0x27d4eb2f)
  return (h ^ (h >>> 16)) >>> 0
}
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12)
const pc = (m) => ((m % 12) + 12) % 12
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x)

// ---- harmony ----
const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
}
// chord colours: the voicing tones above the root (the bass plays the root), most important first
const Q = {
  maj9: [4, 11, 14, 7],
  six9: [4, 9, 14, 7],
  maj7s11: [4, 11, 7, 18],
  m9: [3, 10, 14, 7],
  m711: [3, 10, 7, 17],
  m6: [3, 9, 14, 7],
  dom13: [4, 10, 14, 21],
  dom9: [4, 10, 14, 7],
  sus: [5, 10, 14, 7],
}
function makeChord(tr, deg, q) {
  const root = tr.key + deg
  const tones = Q[q].map((i) => root + i)
  const ct = new Uint8Array(12) // chord tones
  ct[pc(root)] = 1
  for (const m of tones) ct[pc(m)] = 1
  // the melody's scale over it: the key's mode plus the chord's tones, minus any note a semitone above one
  const cs = new Uint8Array(12)
  for (const s of MODES[tr.mode]) cs[pc(tr.key + s)] = 1
  for (let k = 0; k < 12; k++) {
    if (!ct[k]) continue
    cs[k] = 1
    if (!ct[(k + 1) % 12]) cs[(k + 1) % 12] = 0
  }
  return { root, tones, ct, cs, v: voicing(tones, tr.center) }
}
/** Close voicing around `center`, with no minor seconds inside it. */
function voicing(tones, center) {
  const lo = center - 6
  const out = tones.map((m) => lo + pc(m - lo)).sort((a, b) => a - b)
  for (let pass = 0; pass < 3; pass++) {
    let moved = false
    for (let i = 0; i + 1 < out.length; i++) {
      if (out[i + 1] - out[i] === 1) {
        out[i] += 12
        moved = true
      }
    }
    if (!moved) break
    out.sort((a, b) => a - b)
  }
  return out
}
const bassOf = (tr, m) => tr.bassLo + pc(m - tr.bassLo)
function nearestTone(ch, m) {
  for (let d = 0; d < 7; d++) {
    if (ch.ct[pc(m + d)]) return m + d
    if (ch.ct[pc(m - d)]) return m - d
  }
  return m
}
function stepNote(cs, m, steps) {
  const s = Math.sign(steps)
  for (let n = Math.abs(steps); n > 0; n--) {
    m += s
    while (!cs[pc(m)]) m += s
  }
  return m
}

const rubs = (ch, m) => ch.v.some((x) => Math.abs(m - x) === 1 || Math.abs(m - x) === 13)
/** A melody note a semitone (or a minor ninth) from a voicing note moves to the nearest one that isn't. */
function unrub(ch, m) {
  for (let d = 0; d < 6; d++) {
    if (ch.cs[pc(m - d)] && !rubs(ch, m - d)) return m - d
    if (ch.cs[pc(m + d)] && !rubs(ch, m + d)) return m + d
  }
  return m
}

// melody cells: [beat, scale steps from the bar's anchor, length in beats]
// prettier-ignore
const MOTIF4 = [
  [[0, 0, 1], [1, 1, 0.5], [1.5, 2, 1.5], [3, 1, 1]],
  [[0.5, 0, 0.5], [1, -1, 0.5], [1.5, -2, 1], [2.5, 0, 1.5]],
  [[0, 2, 1.5], [1.5, 1, 0.5], [2, 0, 2]],
  [[0, 0, 0.5], [0.5, 1, 0.5], [1, 2, 0.5], [1.5, 4, 1.5], [3, 2, 1]],
  [[1, 0, 1], [2, -1, 0.5], [2.5, -2, 0.5], [3, -3, 1]],
  [[0, 4, 2], [2, 2, 1], [3, 1, 1]],
  [[2, 2, 0.5], [2.5, 1, 0.5], [3, 0, 1]],
]
// prettier-ignore
const MOTIF3 = [
  [[0, 0, 1], [1, 1, 1], [2, 2, 1]],
  [[0, 2, 2], [2, 1, 1]],
  [[0, 0, 1.5], [1.5, -1, 0.5], [2, -2, 1]],
  [[1, 0, 1], [2, 1, 1]],
  [[0, 4, 1], [1, 2, 1], [2, 0, 1]],
]
// prettier-ignore
const MOTIF_SLOW = [
  [[0, 0, 2], [2, 2, 2]],
  [[0, 4, 3], [3, 2, 1]],
  [[1, 0, 1.5], [2.5, -1, 1.5]],
  [[0, 2, 1], [1, 1, 1], [2, 0, 2]],
]

// ---- the four tracks ----
// progs: four chords each ([degree above the key, colour]); order: which progression each phrase plays;
// form: [bars, flags] sections; tone/drumTone: low-pass cut-offs; wow: tape wobble depth (s of delay);
// trem: piano auto-pan depth; motor: vibraphone tremolo depth; rev: plate level; vinyl/rain: bed levels.
// prettier-ignore
const TRACKS = [
  {
    title: 'Two A.M. Ember', seed: 0x2a3e91, style: 'jazz',
    bpm: 72, meter: 4, swing8: 0.11, swing16: 0, key: 49, mode: 'major',
    cb: 1, intro: 2, center: 60, bassLo: 34,
    mel: K.EP, melC: 75, melLo: 67, melHi: 84, motifs: MOTIF4,
    progs: [
      [[2, 'm9'], [7, 'dom13'], [0, 'maj9'], [0, 'six9']],
      [[5, 'maj9'], [4, 'm711'], [2, 'm9'], [7, 'sus']],
      [[0, 'maj9'], [9, 'm9'], [2, 'm9'], [7, 'dom13']],
      [[5, 'maj9'], [5, 'm6'], [4, 'm711'], [9, 'm9']],
    ],
    order: 'AABACADB', fin: [0, 'maj9'],
    form: [[2, EP], [8, EP | BS | D1], [8, EP | BS | D2], [8, EP | BS | D2 | ML], [4, EP | BS],
      [8, EP | BS | D2 | ML], [8, EP | BS | D2], [8, EP | BS | D1 | ML], [1, EP | BS | END]],
    tail: 4, tone: 8500, drumTone: 7500, wow: 0.0012, trem: 0.2, motor: 0, rev: 0.55,
    vinyl: 0.07, rain: 0, knock: false, duck: false,
  },
  {
    title: 'Ash Waltz', seed: 0x7a1c05, style: 'waltz',
    bpm: 92, meter: 3, swing8: 0.07, swing16: 0, key: 57, mode: 'dorian',
    cb: 2, intro: 4, center: 62, bassLo: 33,
    mel: K.VIB, melC: 77, melLo: 69, melHi: 86, motifs: MOTIF3,
    progs: [
      [[0, 'm9'], [5, 'dom9'], [8, 'maj9'], [7, 'sus']],
      [[5, 'm9'], [10, 'dom13'], [3, 'maj9'], [8, 'maj9']],
      [[0, 'm9'], [7, 'm711'], [8, 'maj9'], [10, 'sus']],
    ],
    order: 'AABACAB', fin: [0, 'm9'],
    form: [[4, EP | PD], [16, EP | BS | D1], [16, EP | BS | D2 | ML], [8, EP | PD | ML],
      [16, EP | BS | D2 | ML], [16, EP | BS | D2], [8, EP | BS | D1 | PD], [8, EP | BS | D1 | ML],
      [2, EP | BS | PD | END]],
    tail: 5, tone: 8000, drumTone: 7000, wow: 0.001, trem: 0.15, motor: 0.16, rev: 0.6,
    vinyl: 0.05, rain: 0, knock: false, duck: false,
  },
  {
    title: 'Fire Escape Rain', seed: 0x3e5ca9, style: 'ambient',
    bpm: 64, meter: 4, swing8: 0, swing16: 0, key: 53, mode: 'lydian',
    cb: 2, intro: 2, center: 62, bassLo: 33,
    mel: K.VIB, melC: 74, melLo: 67, melHi: 86, motifs: MOTIF_SLOW,
    progs: [
      [[0, 'maj7s11'], [2, 'six9'], [11, 'm711'], [4, 'm9']],
      [[9, 'm9'], [7, 'maj9'], [0, 'maj7s11'], [2, 'six9']],
    ],
    order: 'AABAB', fin: [0, 'maj7s11'],
    form: [[2, PD | EP], [8, PD | EP | BS], [8, PD | EP | BS | ML], [8, PD | EP | BS | D1 | ML],
      [8, PD | EP | D1], [8, PD | EP | BS | D1 | ML], [8, PD | EP | BS | ML], [4, PD | EP],
      [1, PD | EP | END]],
    tail: 7, tone: 7000, drumTone: 6500, wow: 0.0008, trem: 0.18, motor: 0.12, rev: 0.75,
    vinyl: 0.04, rain: 0.02, knock: false, duck: false,
  },
  {
    title: 'Lamplight, Unhurried', seed: 0x4c4d70, style: 'lofi',
    bpm: 76, meter: 4, swing8: 0, swing16: 0.09, key: 51, mode: 'major',
    cb: 1, intro: 4, center: 61, bassLo: 34,
    mel: K.LEAD, melC: 72, melLo: 65, melHi: 81, motifs: MOTIF4,
    progs: [
      [[5, 'maj9'], [4, 'm711'], [2, 'm9'], [7, 'dom13']],
      [[9, 'm9'], [5, 'maj9'], [0, 'maj9'], [7, 'sus']],
      [[5, 'maj9'], [5, 'm6'], [4, 'm711'], [9, 'm9']],
    ],
    order: 'AABAACAB', fin: [0, 'maj9'],
    form: [[2, EP], [2, EP | BS | D1], [8, EP | BS | D2], [8, EP | BS | D2 | ML], [4, EP | BS | D1],
      [8, EP | BS | D2 | ML], [8, EP | BS | D2], [8, EP | BS | D2 | ML], [8, EP | BS | D2], [4, EP | D1],
      [1, EP | BS | END]],
    tail: 5, tone: 6200, drumTone: 5200, wow: 0.0018, trem: 0.12, motor: 0, rev: 0.45,
    vinyl: 0.09, rain: 0, knock: true, duck: true,
  },
]
for (let i = 0; i < TRACKS.length; i++) {
  const tr = TRACKS[i]
  tr.beat = 60 / tr.bpm
  tr.bar = tr.beat * tr.meter
  tr.sec = []
  for (const [n, f] of tr.form) for (let k = 0; k < n; k++) tr.sec.push(f)
  tr.bars = tr.sec.length
  tr.duration = Math.ceil(tr.bars * tr.bar + tr.tail)
  tr.P = tr.progs.map((p) => p.map(([d, q]) => makeChord(tr, d, q)))
  tr.F = makeChord(tr, tr.fin[0], tr.fin[1])
  tr.info = Object.freeze({ index: i, title: tr.title, artist: ARTIST, duration: tr.duration })
}

function chordAt(tr, b) {
  if (b >= tr.bars || tr.sec[b] & END) return tr.F
  const per = 4 * tr.cb
  const k = b - tr.intro
  const n = tr.order.length
  const ph = Math.floor(k / per)
  const prog = tr.P[tr.order.charCodeAt(((ph % n) + n) % n) - 65]
  return prog[Math.floor((((k % per) + per) % per) / tr.cb)]
}

/** Seconds from a bar's start to `beat` (fractional, may be negative), with the track's swing. */
function sw(tr, beat) {
  const ib = Math.floor(beat)
  let g = beat - ib
  const s8 = tr.swing8
  const s16 = tr.swing16
  if (s8) g = g < 0.5 ? g * (1 + 2 * s8) : 0.5 + s8 + (g - 0.5) * (1 - 2 * s8)
  if (s16) {
    const h = g * 2
    const ih = Math.floor(h)
    const fh = h - ih
    g = (ih + (fh < 0.5 ? fh * (1 + 2 * s16) : 0.5 + s16 + (fh - 0.5) * (1 - 2 * s16))) / 2
  }
  return (ib + g) * tr.beat
}

/** A bar of melody: a call, an answer, the call again and a breath, per four-bar group. */
function melodyBar(e, tr, b, ch, r, at) {
  const k = b - tr.intro
  const j = ((k % 4) + 4) % 4
  const rg = mulberry(mix32(tr.seed ^ 0x51ab1e, Math.floor(k / 4)))
  const M = tr.motifs
  const call = M[(rg() * M.length) | 0]
  const answer = M[(rg() * M.length) | 0]
  const lift = Math.round(rg() * 4) - 1
  let shape = j === 1 ? answer : call
  if (j === 3) {
    if (rg() < 0.5) return
    shape = [[0, 0, tr.meter - 0.5]]
  }
  const anchor = nearestTone(ch, tr.melC + lift + [0, 2, 1, -2][j])
  for (let i = 0; i < shape.length; i++) {
    const [x, s, d] = shape[i]
    if (i > 0 && r() < 0.1) continue
    let m = stepNote(ch.cs, anchor, s)
    while (m > tr.melHi) m -= 12
    while (m < tr.melLo) m += 12
    m = unrub(ch, m)
    e(at(x), tr.mel, m, (i === 0 ? 0.68 : 0.56) + r() * 0.18, d * tr.beat)
  }
}

// ---- one bar of each style: e(position s, kind, midi, velocity 0..1, length s, extra) ----
const STYLES = {
  // a late-night trio: comping piano, a two-feel bass that walks now and then, brushes and a ride
  jazz(e, tr, b, f, ch, nx, r, at) {
    const B = tr.beat
    const end = f & END
    if (f & EP) {
      const pats = [[0], [0, 2.5], [-0.5, 2], [0, 1.5], [0.5, 2.5], [0, 3.5]]
      const pat = end ? [0] : pats[(r() * pats.length) | 0]
      for (let i = 0; i < pat.length; i++) {
        const x = pat[i]
        const push = x === 3.5 // anticipates the next chord
        const len = end
          ? tr.bar
          : push
            ? 1.6 * B
            : ((i + 1 < pat.length ? pat[i + 1] : 4) - x) * B * 0.92
        e(at(x), K.CH, 0, 0.5 + r() * 0.2 + (x === 0 ? 0.08 : 0), len, push ? nx.v : ch.v)
      }
    }
    if (f & BS) {
      const root = bassOf(tr, ch.root)
      const next = bassOf(tr, nx.root)
      if (end) e(at(0), K.BASS, root, 0.85, tr.bar)
      else if (f & D2 && r() < 0.3) {
        // a bar of walking quarters into the next chord
        const third = root + (ch.ct[pc(ch.root + 4)] ? 4 : ch.ct[pc(ch.root + 3)] ? 3 : 5)
        const walk = [root, third, root + 7, next === root ? root + 9 : next + (r() < 0.5 ? 1 : -1)]
        for (let k = 0; k < 4; k++) e(at(k), K.BASS, walk[k], k ? 0.68 + r() * 0.1 : 0.82, B * 0.92)
      } else {
        const pick = r() < 0.35
        e(at(0), K.BASS, root, 0.82, B * 1.9)
        e(at(2), K.BASS, r() < 0.6 ? root + 7 : root, 0.68, B * (pick ? 1.35 : 1.9))
        if (pick) e(at(3.5), K.BASS, next + (r() < 0.5 ? 1 : -1), 0.56, B * 0.45)
      }
    }
    if (f & (D1 | D2)) {
      const full = f & D2
      e(at(0), K.SWEEP, 0, full ? 0.9 : 0.7, B * 1.9)
      e(at(2), K.SWEEP, 0, full ? 0.8 : 0.6, B * 1.9)
      e(at(1), K.BRUSH, 0, 0.62 + r() * 0.2, 0)
      e(at(3), K.BRUSH, 0, 0.68 + r() * 0.2, 0)
      e(at(0), K.KICK, 0, full ? 0.5 : 0.36, 0)
      if (full) {
        const xs = [0, 1, 1.5, 2, 3, 3.5]
        const vs = [0.7, 0.9, 0.45, 0.7, 0.9, 0.45]
        for (let k = 0; k < 6; k++)
          if (r() > 0.06) e(at(xs[k]), K.RIDE, 0, vs[k] * (0.85 + r() * 0.2), 0)
        e(at(1), K.HAT, 0, 0.4, 0)
        e(at(3), K.HAT, 0, 0.4, 0)
        if (r() < 0.3) e(at(2.5), K.KICK, 0, 0.3, 0)
        // into each new phrase: two more brush taps
        if ((b - tr.intro) % 8 === 7)
          for (const x of [2.5, 3.5]) e(at(x), K.BRUSH, 0, 0.45 + r() * 0.25, 0)
      }
    }
    if (f & ML) melodyBar(e, tr, b, ch, r, at)
  },

  // a slow jazz waltz: broken chords, bass on one, a brush circle per bar, vibraphone
  waltz(e, tr, b, f, ch, nx, r, at) {
    const B = tr.beat
    const end = f & END
    const first = (b - tr.intro) % tr.cb === 0
    const v = ch.v
    if (f & EP) {
      if (end) {
        if (first) e(at(0), K.CH, 0, 0.6, tr.bar * 2, v)
      } else if (f & D2) {
        const ord = first ? [0, 1, 2, 3, 2, 1] : [1, 2, 3, 2, 3, 1]
        for (let i = 0; i < 6; i++) {
          if (i && r() < 0.12) continue
          e(at(i * 0.5), K.EP, v[ord[i]], (i ? 0.4 : 0.56) + r() * 0.12, B * (1.6 - i * 0.15))
        }
      } else if (first) e(at(0), K.CH, 0, 0.5 + r() * 0.1, tr.bar * 1.9, v)
      else {
        e(at(1), K.EP, v[1 + ((r() * 3) | 0)], 0.42, B * 1.5)
        e(at(2), K.EP, v[(r() * 4) | 0] + 12, 0.34, B * 1.2)
      }
    }
    if (f & BS) {
      const root = bassOf(tr, ch.root)
      if (first) e(at(0), K.BASS, root, 0.8, end ? tr.bar * 2 : B * 2.7)
      else if (!end) {
        const pick = r() < 0.35
        e(at(0), K.BASS, r() < 0.6 ? root + 7 : root, 0.66, B * (pick ? 1.8 : 2.7))
        if (pick) e(at(2), K.BASS, bassOf(tr, nx.root) + (r() < 0.5 ? 1 : -1), 0.52, B * 0.9)
      }
    }
    if (f & (D1 | D2)) {
      const full = f & D2
      e(at(0), K.SWEEP, 0, full ? 0.85 : 0.65, B * 2.8)
      e(at(1), K.BRUSH, 0, 0.5 + r() * 0.15, 0)
      e(at(2), K.BRUSH, 0, 0.56 + r() * 0.15, 0)
      e(at(0), K.KICK, 0, full ? 0.45 : 0.32, 0)
      if (full) {
        e(at(1), K.HAT, 0, 0.3, 0)
        e(at(2), K.HAT, 0, 0.3, 0)
      }
    }
    if (f & PD && first)
      for (const m of v) e(at(0), K.PAD, m, 0.6, tr.bar * (end ? 2 : tr.cb) + 0.2)
    if (f & ML) melodyBar(e, tr, b, ch, r, at)
  },

  // rain on the window: a pad, a few piano notes with their echoes, long bass notes, a rim and a shaker
  ambient(e, tr, b, f, ch, nx, r, at) {
    const B = tr.beat
    const end = f & END
    const first = (b - tr.intro) % tr.cb === 0
    if (f & PD && (first || end)) {
      const len = end ? tr.bar * 1.5 : tr.bar * tr.cb + 0.3
      for (let i = 0; i < ch.v.length; i++) e(at(0) + i * 0.05, K.PAD, ch.v[i], 0.6, len)
      const lo = tr.center - 18
      e(at(0), K.PAD, lo + pc(ch.root - lo), 0.5, len)
    }
    if (f & EP) {
      if (first || end) e(at(0), K.CH, 0, 0.42, end ? tr.bar * 1.5 : tr.bar * 1.2, ch.v)
      else {
        let x = 0.5 + ((r() * 3) | 0) * 0.5
        for (let i = 0; i < 3 && x < 3.5; i++) {
          const m = ch.v[(1 + i + ((r() * 2) | 0)) % ch.v.length] + 12
          e(at(x), K.EP, m, 0.36, B * 1.4)
          e(at(x + 0.75), K.EP, m, 0.16, B * 1.2) // its echo, a dotted eighth later
          x += 1 + ((r() * 2) | 0) * 0.5
        }
      }
    }
    if (f & BS) {
      const root = bassOf(tr, ch.root)
      if (first || end) e(at(0), K.BASS, root, 0.66, end ? tr.bar : tr.bar * 0.95)
      else e(at(0), K.BASS, r() < 0.5 ? root + 7 : root, 0.56, tr.bar * 0.9)
    }
    if (f & D1) {
      e(at(0), K.KICK, 0, 0.34, 0)
      if (r() < 0.8) e(at(2), K.RIM, 0, 0.5 + r() * 0.15, 0)
      if (r() < 0.3) e(at(3.5), K.RIM, 0, 0.3, 0)
      for (let k = 0; k < 8; k++) e(at(k * 0.5), K.SHAKE, 0, k % 2 ? 0.4 : 0.62, 0)
    }
    if (f & ML) melodyBar(e, tr, b, ch, r, at)
  },

  // lo-fi hip-hop: a lazy swung kit, the piano pumping under the kick, a breathy lead
  lofi(e, tr, b, f, ch, nx, r, at) {
    const B = tr.beat
    const end = f & END
    if (f & EP) {
      if (end) e(at(0), K.CH, 0, 0.6, tr.bar * 1.2, ch.v)
      else {
        const stab = r() < 0.4
        e(at(0) + 0.025, K.CH, 0, 0.55 + r() * 0.1, B * (stab ? 2.3 : 3.6), ch.v) // (laid back)
        if (stab) e(at(2.5) + 0.02, K.CH, 0, 0.42, B * 1.2, ch.v)
      }
    }
    if (f & BS) {
      const root = bassOf(tr, ch.root)
      const next = bassOf(tr, nx.root)
      if (end) e(at(0), K.BASS, root, 0.8, tr.bar)
      else {
        e(at(0), K.BASS, root, 0.82, B * 1.2)
        e(at(1.75), K.BASS, root, 0.58, B * 0.45)
        e(at(2.5), K.BASS, r() < 0.5 ? root + 7 : root + 12, 0.66, B * 0.8)
        if (r() < 0.5) e(at(3.5), K.BASS, next + (r() < 0.5 ? 1 : -1), 0.52, B * 0.45)
      }
    }
    if (f & (D1 | D2)) {
      const full = f & D2
      if (full) {
        e(at(0), K.KICK, 0, 0.9, 0)
        if (r() < 0.55) e(at(1.75), K.KICK, 0, 0.5, 0)
        e(at(2.5), K.KICK, 0, 0.72, 0)
        e(at(1), K.SNARE, 0, 0.8, 0)
        e(at(3), K.SNARE, 0, 0.85, 0)
        if (r() < 0.25) e(at(3.75), K.SNARE, 0, 0.28, 0)
      }
      for (let k = 0; k < 8; k++) {
        const open = full && k === 7 && r() < 0.3
        e(at(k * 0.5), K.HAT, open ? 1 : 0, (k % 2 ? 0.5 : 0.78) * (full ? 1 : 0.75), 0)
        if (full && k % 2 && r() < 0.18) e(at(k * 0.5 + 0.25), K.HAT, 0, 0.3, 0)
      }
    }
    if (f & ML) melodyBar(e, tr, b, ch, r, at)
  },
}

// ---- buffers and curves, made once per engine ----
/** Two seconds of stereo white noise (a fast inline xorshift: this runs at the first unmute). */
function makeNoise(ctx) {
  const sr = ctx.sampleRate
  const buf = ctx.createBuffer(2, Math.floor(sr * 2), sr)
  let x = 0x5eed1234
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < d.length; i++) {
      x ^= x << 13
      x ^= x >>> 17
      x ^= x << 5
      d[i] = x / 2147483648
    }
  }
  return buf
}
/** A record's surface: a faint hiss (the shared noise, quietly), ticks and now and then a pop (5 s, looped). */
function makeCrackle(ctx, noise) {
  const sr = ctx.sampleRate
  const n = Math.floor(sr * 5)
  const buf = ctx.createBuffer(2, n, sr)
  const R = mulberry(0xc7ac1e)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    const z = noise.getChannelData(c)
    for (let i = 0, j = 0; i < n; i++, j = j + 1 < z.length ? j + 1 : 0) d[i] = z[j] * 0.02
    for (
      let i = Math.floor(R() * sr * 0.1);
      i < n - 400;
      i += 1 + Math.floor((-Math.log(1 - R()) * sr) / 7)
    ) {
      const pop = R() < 0.05
      const a = (pop ? 0.25 + 0.25 * R() : 0.05 + 0.3 * R() * R()) * (R() < 0.5 ? -1 : 1)
      const len = pop ? 60 + Math.floor(R() * 200) : 2 + Math.floor(R() * 7)
      for (let k = 0; k < len; k++)
        d[i + k] += a * Math.exp(-k / (len * 0.3)) * (pop ? Math.sin(k * 0.12) : 0.6 + 0.4 * R())
    }
  }
  return buf
}
/** A dark plate: noise dulling as it dies away (mono and 1.5 s, to keep the convolution cheap). */
function makeIR(ctx) {
  const sr = ctx.sampleRate
  const n = Math.floor(sr * 1.5)
  const pre = Math.floor(sr * 0.012)
  const rise = Math.floor(sr * 0.02)
  const tail = Math.floor(sr * 0.25)
  const buf = ctx.createBuffer(1, n, sr)
  const d = buf.getChannelData(0)
  const decay = Math.exp(-1 / (sr * 0.28)) // the level, per sample
  const dull = Math.exp(-1 / (sr * 0.45)) // the brightness, per sample
  let env = 1
  let bright = 0.5
  let lp = 0
  let x = 0x9e1a7e55
  for (let i = pre; i < n; i++) {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    lp += (x / 2147483648 - lp) * (0.07 + bright)
    let a = lp * env
    if (i - pre < rise) a *= (i - pre) / rise
    if (i > n - tail) a *= 0.5 + 0.5 * Math.cos((Math.PI * (i - n + tail)) / tail)
    d[i] = a
    env *= decay
    bright *= dull
  }
  return buf
}
/** The soft ceiling: straight up to 0.7 (-3.1 dBFS), then bending towards 0.853 (-1.4 dBFS), never past it. */
function ceilingCurve() {
  const n = 4097
  const c = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    const a = Math.abs(x)
    c[i] = a <= 0.7 ? x : Math.sign(x) * (0.7 + 0.16 * Math.tanh((a - 0.7) / 0.16))
  }
  return c
}
/** 0 → pk (linear, att) → towards pk·sus (tau1) → after the knee towards 0 (tau2) → from `off` to 0 (rel). */
function env(p, t, att, pk, sus, tau1, tau2, off, rel) {
  p.setValueAtTime(0, t)
  p.linearRampToValueAtTime(pk, t + att)
  p.setTargetAtTime(pk * sus, t + att, tau1)
  const knee = t + att + 3 * tau1
  if (tau2 > 0 && off > knee + 0.01) p.setTargetAtTime(0, knee, tau2)
  p.setTargetAtTime(0, Math.max(off, t + att), rel)
}

/**
 * The player's music. `ctx` is the caller's AudioContext (an OfflineAudioContext works too: then
 * nothing runs on a timer and the caller drives the scheduler with advance(t), see below).
 */
export function createMusic(ctx, destination) {
  const sr = ctx.sampleRate
  const offline = typeof ctx.startRendering === 'function'
  const rnd = mulberry(0x1234567)
  const fixed = [] // the engine's permanent nodes (disconnected by dispose)
  const keep = (n) => (fixed.push(n), n)
  const G = (v = 1) => {
    const g = ctx.createGain()
    g.gain.value = v
    return g
  }
  const F = (type, f, q = 0.7) => {
    const n = ctx.createBiquadFilter()
    n.type = type
    n.frequency.value = f
    n.Q.value = q
    return n
  }
  const Pan = (p) => {
    const n = ctx.createStereoPanner()
    n.pan.value = p
    return n
  }
  const Osc = (type, f) => {
    const o = ctx.createOscillator()
    if (typeof type === 'string') o.type = type
    else o.setPeriodicWave(type)
    o.frequency.value = f
    return o
  }
  const wave = (h) => ctx.createPeriodicWave(new Float32Array(h.length), new Float32Array(h))
  const noise = makeNoise(ctx)
  const crackle = makeCrackle(ctx, noise)
  const bassWave = wave([0, 1, 0.55, 0.3, 0.14, 0.06])
  const kickWave = wave([0, 1, 0.16, 0.05])
  const padWave = wave([0, 1, 0.45, 0.25, 0.14, 0.08, 0.045, 0.025])
  const leadWave = wave([0, 1, 0.2, 0.08, 0.035, 0.015])

  // ---- master: mix → tape → high-pass → tone → compressor → trim → ceiling → fade → analyser → out
  const mix = keep(G())
  const tape = keep(ctx.createDelay(0.05))
  tape.delayTime.value = 0.012
  const hp = keep(F('highpass', 40, 0.7))
  const tone = keep(F('lowpass', 8500, 0.5))
  const comp = keep(ctx.createDynamicsCompressor())
  comp.threshold.value = -24
  comp.knee.value = 12
  comp.ratio.value = 3
  comp.attack.value = 0.005
  comp.release.value = 0.2
  const trim = keep(G(1.6))
  const ceiling = keep(ctx.createWaveShaper())
  ceiling.curve = ceilingCurve()
  const fade = keep(G(0))
  const analyser = keep(ctx.createAnalyser())
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0.78
  analyser.minDecibels = -110
  analyser.maxDecibels = -22
  mix
    .connect(tape)
    .connect(hp)
    .connect(tone)
    .connect(comp)
    .connect(trim)
    .connect(ceiling)
    .connect(fade)
    .connect(analyser)
  analyser.connect(destination)
  // the tape: a slow wow and a whisper of flutter on the delay time
  const wow = keep(Osc('sine', 0.27))
  const wowG = keep(G(0.0007))
  const flutter = keep(Osc('sine', 5.3))
  const flutterG = keep(G(0.00003))
  wow.connect(wowG).connect(tape.delayTime)
  flutter.connect(flutterG).connect(tape.delayTime)
  // a dark plate, fed by sends from the buses below
  const plate = keep(ctx.createConvolver())
  plate.channelCount = 1
  plate.channelCountMode = 'explicit'
  // (the impulse response takes the convolver ~10 ms to take in: in a live context that happens in a
  // task of its own, so the first unmute doesn't stall a frame for all of it at once)
  if (offline) plate.buffer = makeIR(ctx)
  else setTimeout(() => disposed || (plate.buffer = makeIR(ctx)), 0)
  const plateOut = keep(G(0.55))
  // one convolution, opened out into stereo by a short delay on the right
  const plateLR = keep(ctx.createChannelMerger(2))
  const plateD = keep(ctx.createDelay(0.05))
  plateD.delayTime.value = 0.017
  plate.connect(plateLR, 0, 0)
  plate.connect(plateD).connect(plateLR, 0, 1)
  plateLR.connect(plateOut).connect(mix)
  const send = (from, level) => from.connect(keep(G(level))).connect(plate)
  // electric piano → (pump) → band-limit → slow auto-pan → mix
  const epIn = keep(G())
  const duckG = keep(G())
  const epHP = keep(F('highpass', 90, 0.6))
  const epLP = keep(F('lowpass', 4200, 0.5))
  const epPan = keep(Pan(0))
  epIn.connect(duckG).connect(epHP).connect(epLP).connect(epPan).connect(mix)
  send(epLP, 0.3)
  const trem = keep(Osc('sine', 0.6))
  const tremG = keep(G(0.2))
  trem.connect(tremG).connect(epPan.pan)
  // pad: each note's detuned pair spread left and right → low-pass → mix
  const padL = keep(Pan(-0.55))
  const padR = keep(Pan(0.55))
  const padLP = keep(F('lowpass', 1300, 0.5))
  padL.connect(padLP)
  padR.connect(padLP)
  padLP.connect(mix)
  send(padLP, 0.45)
  // bass → low-pass → mix, dry
  const bassIn = keep(G())
  const duckB = keep(G())
  bassIn
    .connect(duckB)
    .connect(keep(F('lowpass', 1400, 0.5)))
    .connect(mix)
  // drums → low-pass → mix; snare, hats and ride sit a little apart
  const drumIn = keep(G())
  const drumLP = keep(F('lowpass', 7500, 0.5))
  drumIn.connect(drumLP).connect(mix)
  send(drumLP, 0.12)
  const snPan = keep(Pan(-0.12))
  const hatPan = keep(Pan(0.3))
  const ridePan = keep(Pan(-0.3))
  snPan.connect(drumIn)
  hatPan.connect(drumIn)
  ridePan.connect(drumIn)
  // melody → motor tremolo → low-pass → a little left → mix
  const melIn = keep(G())
  const melTrem = keep(G())
  const melLP = keep(F('lowpass', 5000, 0.5))
  melIn
    .connect(melTrem)
    .connect(melLP)
    .connect(keep(Pan(-0.15)))
    .connect(mix)
  send(melLP, 0.4)
  const motor = keep(Osc('sine', 4.8))
  const motorG = keep(G(0))
  motor.connect(motorG).connect(melTrem.gain)
  // the beds join after the tape
  const vinylIn = keep(G(0))
  vinylIn
    .connect(keep(F('highpass', 900, 0.5)))
    .connect(keep(F('lowpass', 7000, 0.5)))
    .connect(tone)
  const rainIn = keep(G(0))
  rainIn
    .connect(keep(F('lowpass', 1700, 0.4)))
    .connect(keep(F('highpass', 320, 0.5)))
    .connect(tone)
  const lfos = [wow, flutter, trem, motor]
  for (const o of lfos) o.start()

  // ---- voices: every source is started and stopped when made, and its nodes let go when it ends
  const live = new Set()
  function own(t, srcs, nodes) {
    const rec = { t, s: srcs, n: nodes }
    live.add(rec)
    srcs[0].onended = () => {
      live.delete(rec)
      for (let i = 0; i < srcs.length; i++) srcs[i].disconnect()
      for (let i = 0; i < nodes.length; i++) nodes[i].disconnect()
    }
  }
  function noiseAt(t, dur) {
    const s = ctx.createBufferSource()
    s.buffer = noise
    s.loop = true
    s.start(t, rnd() * 1.9)
    s.stop(t + dur)
    return s
  }
  /** Electric piano: a sine carrier frequency-modulated 1:1 (bright at the strike, mellow after), plus a short tine. */
  function ep(t, m, v, d, att, tine) {
    const f = hz(m)
    const c = Osc('sine', f)
    const mo = Osc('sine', f)
    const mg = G(0)
    const g = G(0)
    mo.detune.value = 4 // the modulator drifts slowly against the carrier: the tone breathes
    const soft = Math.min(1, Math.sqrt(330 / f))
    mg.gain.setValueAtTime((0.8 + 1.5 * v) * soft * f, t)
    mg.gain.setTargetAtTime(0.22 * soft * f, t, 0.2)
    mo.connect(mg).connect(c.frequency)
    const pk = 0.12 * v
    const off = t + Math.max(d, att + 0.02)
    env(g.gain, t, att, pk, 0.5, 0.11, 1 + 1.6 * clamp((76 - m) / 30, 0, 1), off, 0.1)
    c.connect(g).connect(epIn)
    const end = off + 0.6
    c.start(t)
    mo.start(t)
    c.stop(end)
    mo.stop(end)
    const srcs = [c, mo]
    const nodes = [mg, g]
    if (tine && att < 0.05 && v > 0.3 && m < 86) {
      const ti = Osc('sine', f * (m < 66 ? 7 : 4))
      const tg = G(0)
      tg.gain.setValueAtTime(0, t)
      tg.gain.linearRampToValueAtTime(pk * 0.2 * v, t + 0.0015)
      tg.gain.setTargetAtTime(0, t + 0.0015, 0.03)
      ti.connect(tg).connect(epIn)
      ti.start(t)
      ti.stop(t + 0.25)
      srcs.push(ti)
      nodes.push(tg)
    }
    own(t, srcs, nodes)
  }
  function chordHit(t, v, d, notes, att) {
    for (let i = 0; i < notes.length; i++) {
      const top = i === notes.length - 1 // (the top voice leads: a touch louder, and the only one with a tine)
      ep(t + i * 0.009, notes[i], v * (top ? 1 : 0.84), d - i * 0.009, att, top)
    }
  }
  /** Round bass: a few harmonics through a closing low-pass (heard on earbuds by its overtones). */
  function bass(t, m, v, d) {
    const f = hz(m)
    const o = Osc(bassWave, f)
    const lp = F('lowpass', f * 6, 0.6)
    const g = G(0)
    lp.frequency.setValueAtTime(f * 7 + 150, t)
    lp.frequency.setTargetAtTime(f * 3.2 + 80, t, 0.12)
    const off = t + Math.max(0.08, d)
    env(g.gain, t, 0.007, 0.13 * v, 0.65, 0.18, 2.4, off, 0.06)
    o.connect(lp).connect(g).connect(bassIn)
    o.start(t)
    o.stop(off + 0.4)
    own(t, [o], [lp, g])
  }
  function kick(t, v, knock) {
    const o = Osc(kickWave, 110)
    const g = G(0)
    o.frequency.setValueAtTime(110, t)
    o.frequency.exponentialRampToValueAtTime(50, t + 0.1)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.3 * v, t + 0.006)
    g.gain.setTargetAtTime(0, t + 0.006, 0.12)
    o.connect(g).connect(drumIn)
    o.start(t)
    o.stop(t + 0.75)
    const srcs = [o]
    const nodes = [g]
    if (knock) {
      const n = noiseAt(t, 0.06)
      const lp = F('lowpass', 1400, 0.7)
      const ng = G(0)
      ng.gain.setValueAtTime(0.15 * v, t)
      ng.gain.setTargetAtTime(0, t, 0.008)
      n.connect(lp).connect(ng).connect(drumIn)
      srcs.push(n)
      nodes.push(lp, ng)
    }
    own(t, srcs, nodes)
  }
  function snare(t, v) {
    const n = noiseAt(t, 0.4)
    const bp = F('bandpass', 1900, 0.75)
    const g = G(0)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.22 * v, t + 0.002)
    g.gain.setTargetAtTime(0, t + 0.002, 0.08)
    const o = Osc('triangle', 205)
    const og = G(0)
    o.frequency.setValueAtTime(205, t)
    o.frequency.exponentialRampToValueAtTime(155, t + 0.09)
    og.gain.setValueAtTime(0, t)
    og.gain.linearRampToValueAtTime(0.12 * v, t + 0.002)
    og.gain.setTargetAtTime(0, t + 0.002, 0.05)
    n.connect(bp).connect(g).connect(snPan)
    o.connect(og).connect(snPan)
    o.start(t)
    o.stop(t + 0.4)
    own(t, [n, o], [bp, g, og])
  }
  /** A noise hit: noise → filter → decaying gain → bus. */
  function hit(t, dur, to, type, f, q, pk, att, tau) {
    const n = noiseAt(t, dur)
    const fl = F(type, f, q)
    const g = G(0)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(pk, t + att)
    g.gain.setTargetAtTime(0, t + att, tau)
    n.connect(fl).connect(g).connect(to)
    own(t, [n], [fl, g])
  }
  const brush = (t, v) =>
    hit(t, 0.45, snPan, 'bandpass', 2400 + rnd() * 900, 0.55, 0.2 * v, 0.006, 0.075)
  const hat = (t, v, open) =>
    hit(t, open ? 0.7 : 0.2, hatPan, 'highpass', 7000, 0.6, 0.12 * v, 0.001, open ? 0.13 : 0.025)
  const shaker = (t, v) => hit(t, 0.15, hatPan, 'highpass', 5500, 0.7, 0.06 * v, 0.012, 0.03)
  function ride(t, v) {
    const n = noiseAt(t, 1.1)
    const bp = F('bandpass', 5200, 2.2)
    const g = G(0)
    env(g.gain, t, 0.001, 0.12 * v, 0.4, 0.012, 0.32, t + 1, 0.08) // the stick, then the wash
    n.connect(bp).connect(g).connect(ridePan)
    own(t, [n], [bp, g])
  }
  function sweep(t, v, d) {
    const n = noiseAt(t, d + 0.05)
    const bp = F('bandpass', 1500, 0.8)
    const g = G(0)
    bp.frequency.setValueAtTime(1500, t)
    bp.frequency.linearRampToValueAtTime(3300, t + d)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.08 * v, t + d * 0.55)
    g.gain.linearRampToValueAtTime(0, t + d)
    n.connect(bp).connect(g).connect(snPan)
    own(t, [n], [bp, g])
  }
  function rim(t, v) {
    const n = noiseAt(t, 0.15)
    const bp = F('bandpass', 1750, 6)
    const g = G(0)
    g.gain.setValueAtTime(0.4 * v, t)
    g.gain.setTargetAtTime(0, t, 0.018)
    const o = Osc('sine', 820)
    const og = G(0)
    og.gain.setValueAtTime(0.06 * v, t)
    og.gain.setTargetAtTime(0, t, 0.012)
    n.connect(bp).connect(g).connect(snPan)
    o.connect(og).connect(snPan)
    o.start(t)
    o.stop(t + 0.15)
    own(t, [n, o], [bp, g, og])
  }
  /** Vibraphone: a sine and its fourth partial (struck bright, ringing pure), under the bus's motor tremolo. */
  function vib(t, m, v, d) {
    const f = hz(m)
    const a = Osc('sine', f)
    const b = Osc('sine', f * 4)
    const ga = G(0)
    const gb = G(0)
    const pk = 0.09 * v
    const off = t + Math.max(d, 0.1)
    ga.gain.setValueAtTime(0, t)
    ga.gain.linearRampToValueAtTime(pk, t + 0.003)
    ga.gain.setTargetAtTime(0, t + 0.003, 1.4)
    ga.gain.setTargetAtTime(0, off, 0.25)
    gb.gain.setValueAtTime(0, t)
    gb.gain.linearRampToValueAtTime(pk * 0.3, t + 0.002)
    gb.gain.setTargetAtTime(0, t + 0.002, 0.07)
    a.connect(ga).connect(melIn)
    b.connect(gb).connect(melIn)
    a.start(t)
    b.start(t)
    a.stop(off + 1.5)
    b.stop(t + 0.5)
    own(t, [a, b], [ga, gb])
  }
  /** A breathy lead: soft harmonics, a slow attack and a little scoop up into the note. */
  function lead(t, m, v, d) {
    const o = Osc(leadWave, hz(m))
    const g = G(0)
    o.detune.setValueAtTime(-30, t)
    o.detune.setTargetAtTime(0, t, 0.05)
    const off = t + Math.max(d, 0.12)
    env(g.gain, t, 0.05, 0.14 * v, 0.8, 0.25, 3, off, 0.12)
    o.connect(g).connect(melIn)
    o.start(t)
    o.stop(off + 0.8)
    own(t, [o], [g])
  }
  function pad(t, m, v, d) {
    const f = hz(m)
    const o1 = Osc(padWave, f)
    const o2 = Osc(padWave, f)
    const g1 = G(0)
    const g2 = G(0)
    o1.detune.value = -6
    o2.detune.value = 6
    const pk = 0.045 * v
    const off = t + Math.max(d, 1.6)
    for (const g of [g1, g2]) {
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(pk, t + 1.4)
      g.gain.setTargetAtTime(0, off, 1)
    }
    o1.connect(g1).connect(padL)
    o2.connect(g2).connect(padR)
    const end = off + 5.5
    o1.start(t)
    o2.start(t)
    o1.stop(end)
    o2.stop(end)
    own(t, [o1, o2], [g1, g2])
  }
  /** The lo-fi pump: the piano dips a little under each kick, and the bass gets out of its way. */
  function duck(t, v) {
    duckG.gain.setTargetAtTime(1 - 0.3 * v, t, 0.012)
    duckG.gain.setTargetAtTime(1, t + 0.08, 0.16)
    duckB.gain.setTargetAtTime(1 - 0.45 * v, t, 0.006)
    duckB.gain.setTargetAtTime(1, t + 0.06, 0.12)
  }
  function fire(tr, ev, t) {
    switch (ev.k) {
      case K.EP:
        return ep(t, ev.m, ev.v, ev.d, 0.004, true)
      case K.CH:
        return chordHit(t, ev.v, ev.d, ev.x, 0.004)
      case K.HOLD:
        return chordHit(t, ev.v, ev.d, ev.x, 0.18)
      case K.BASS:
        return bass(t, ev.m, ev.v, ev.d)
      case K.KICK:
        kick(t, ev.v, tr.knock)
        if (tr.duck) duck(t, ev.v)
        return
      case K.SNARE:
        return snare(t, ev.v)
      case K.BRUSH:
        return brush(t, ev.v)
      case K.SWEEP:
        return sweep(t, ev.v, ev.d)
      case K.HAT:
        return hat(t, ev.v, ev.m)
      case K.RIDE:
        return ride(t, ev.v)
      case K.RIM:
        return rim(t, ev.v)
      case K.SHAKE:
        return shaker(t, ev.v)
      case K.VIB:
        return vib(t, ev.m, ev.v, ev.d)
      case K.LEAD:
        return lead(t, ev.m, ev.v, ev.d)
      case K.PAD:
        return pad(t, ev.m, ev.v, ev.d)
    }
  }

  // ---- the beds: the record's crackle while playing; the rain only on the track that has it
  let crack = null
  let rain = null
  function loopSrc(buf, to, t, rate) {
    const s = ctx.createBufferSource()
    s.buffer = buf
    s.loop = true
    s.playbackRate.value = rate
    s.connect(to)
    s.start(t, rnd() * (buf.duration - 0.1))
    return s
  }
  function drop(s, t) {
    s.onended = () => s.disconnect()
    try {
      s.stop(t)
    } catch (e) {
      s.disconnect()
    }
  }
  function bedsOff(t) {
    if (crack) drop(crack, t)
    if (rain) {
      drop(rain[0], t)
      drop(rain[1], t)
    }
    crack = rain = null
  }
  /** Everything that belongs to a track, from ctx time t. */
  function setTrack(tr, t) {
    tone.frequency.setTargetAtTime(tr.tone, t, 0.3)
    drumLP.frequency.setTargetAtTime(tr.drumTone, t, 0.3)
    wowG.gain.setTargetAtTime(tr.wow, t, 0.5)
    trem.frequency.setValueAtTime(tr.bpm / 120, t)
    tremG.gain.setTargetAtTime(tr.trem, t, 0.3)
    melTrem.gain.setTargetAtTime(1 - tr.motor, t, 0.2)
    motorG.gain.setTargetAtTime(tr.motor, t, 0.2)
    plateOut.gain.setTargetAtTime(tr.rev, t, 0.3)
    for (const d of [duckG, duckB]) {
      d.gain.cancelScheduledValues(t)
      d.gain.setValueAtTime(1, t)
    }
    if (!crack) crack = loopSrc(crackle, vinylIn, t, 1)
    vinylIn.gain.setTargetAtTime(tr.vinyl, t, 0.4)
    if (tr.rain && !rain) rain = [loopSrc(noise, rainIn, t, 1), loopSrc(noise, rainIn, t, 0.83)]
    else if (!tr.rain && rain) {
      drop(rain[0], t + 4)
      drop(rain[1], t + 4)
      rain = null
    }
    rainIn.gain.setTargetAtTime(tr.rain, t, 0.9)
  }

  // ---- the scheduler
  let playing = false
  let disposed = false
  let timer = 0
  let lastTick = 0
  let S = { i: 0, t0: 0, p0: 0, at: 0 } // scheduling: track i, whose position p0 sounds at ctx time t0
  let V = S // shown: lags S across an automatic change of track, until ctx time S.at
  let paused = 0 // the position in track S.i while paused
  let hushed = 0 // ctx time by which the last pause's fade-out (and the voices it cut) is over
  let nextBar = 0
  let done = false
  let minPos = 0
  const q = [] // planned events not yet turned into sound, by position
  let qi = 0
  const byPos = (a, b) => a.p - b.p
  const emit = (p, k, m, v, d, x) => {
    if (p >= minPos - 1e-6) q.push({ p, k, m, v, d, x })
  }
  const ctxAt = (p) => S.t0 + p - S.p0
  /** Position in a segment's track at ctx time `now` (held at its start until it sounds). */
  const posIn = (seg, now) => Math.min(seg.p0 + Math.max(0, now - seg.t0), TRACKS[seg.i].duration)
  function view() {
    if (V !== S && ctx.currentTime >= S.at) V = S
    return V
  }
  function planBar(tr, b) {
    const r = mulberry(mix32(tr.seed, b))
    const base = b * tr.bar
    const at = (x) => base + sw(tr, x) + (r() - 0.5) * 0.012
    STYLES[tr.style](emit, tr, b, tr.sec[b], chordAt(tr, b), chordAt(tr, b + 1), r, at)
    if (qi) {
      q.splice(0, qi)
      qi = 0
    }
    q.sort(byPos)
  }
  /** Start scheduling track i from position p, to sound at ctx time t (shown from ctx time `at`). */
  function begin(i, p, t, at) {
    const tr = TRACKS[i]
    S = { i, t0: t, p0: p, at }
    q.length = 0
    qi = 0
    minPos = p
    nextBar = Math.min(tr.bars, Math.floor(p / tr.bar))
    done = false
    setTrack(tr, t)
    // resuming inside a bar: what would be ringing there comes back in softly
    const b = Math.floor(p / tr.bar)
    if (b < tr.bars && p - b * tr.bar > 0.25) {
      const f = tr.sec[b]
      const ch = chordAt(tr, b)
      const left = (b + 1) * tr.bar - p
      if (f & EP) emit(p, K.HOLD, 0, 0.42, Math.max(left, 0.6), ch.v)
      if (f & PD) for (const m of ch.v) emit(p, K.PAD, m, 0.5, left + 1)
      if (f & BS) emit(p, K.BASS, bassOf(tr, ch.root), 0.5, Math.max(left, 0.3))
    }
  }
  /** Turn into sound everything that starts before ctx time `until` (the timer calls this; offline, call it yourself). */
  function advance(until) {
    if (!playing || disposed) return
    const now = ctx.currentTime
    for (let guard = 0; guard < 4; guard++) {
      const tr = TRACKS[S.i]
      while (!done && ctxAt(nextBar * tr.bar) < until + tr.beat) {
        if (nextBar >= tr.bars) done = true
        else planBar(tr, nextBar++)
      }
      if (nextBar >= tr.bars) done = true
      while (qi < q.length) {
        const ev = q[qi]
        const t = ctxAt(ev.p)
        if (t >= until) break
        qi++
        if (t > now - 0.05) fire(tr, ev, t > now ? t : now) // (anything later than that is let go)
      }
      if (qi >= q.length) {
        q.length = 0
        qi = 0
      }
      if (!done || q.length) return
      const end = ctxAt(tr.duration)
      if (end >= until) return
      begin((S.i + 1) % TRACKS.length, 0, end + GAP, end) // the next track, after a breath
    }
  }
  function tick() {
    if (!playing || disposed) return
    if (ctx.state === 'closed') return dispose()
    // a throttled timer (a busy or hidden page) gets a longer reach, so the music doesn't drop out
    const wall = performance.now()
    const gap = lastTick ? (wall - lastTick) / 1000 : 0
    lastTick = wall
    advance(ctx.currentTime + (gap > 0.1 ? Math.min(1.5, gap * 1.3 + 0.1) : LOOKAHEAD))
  }
  function startAt(t) {
    playing = true
    lastTick = 0
    begin(V.i, paused, t, ctx.currentTime)
    V = S
    advance(ctx.currentTime + LOOKAHEAD)
    if (!offline) timer = setInterval(tick, TICK)
  }
  function play() {
    if (playing || disposed) return
    const now = ctx.currentTime
    const g = fade.gain
    if (hushed > now) {
      // a pause is still fading out (or the context was suspended mid-fade): let it finish and
      // come back in from silence, so the voices it cut are never heard cut
      const t = hushed + 0.01
      g.cancelScheduledValues(t)
      g.setValueAtTime(0, t)
      g.linearRampToValueAtTime(1, t + FADE_IN)
      startAt(t)
    } else {
      g.cancelScheduledValues(now)
      g.setValueAtTime(g.value, now)
      g.linearRampToValueAtTime(1, now + FADE_IN)
      startAt(now + 0.02)
    }
  }
  function pause() {
    if (!playing || disposed) return
    const now = ctx.currentTime
    // (if the next track was already scheduled but not yet shown, it waits at its top)
    paused = V !== S && now < S.at ? 0 : posIn(S, now)
    V = S
    playing = false
    clearInterval(timer)
    timer = 0
    const g = fade.gain
    g.cancelScheduledValues(now)
    g.setValueAtTime(g.value, now)
    g.linearRampToValueAtTime(0, now + FADE)
    const at = (hushed = now + FADE + 0.01)
    for (const rec of live) {
      const w = rec.t > now ? rec.t : at // what hasn't started yet never will
      for (const s of rec.s) {
        try {
          s.stop(w)
        } catch (e) {
          // (already gone)
        }
      }
    }
    bedsOff(at)
    q.length = 0
    qi = 0
  }
  /** Go to track i at position p (playing on, after a quick fade, if it was playing). */
  function go(i, p) {
    if (disposed) return
    const was = playing
    if (was) pause()
    S = V = { i, t0: 0, p0: p, at: 0 }
    paused = p
    if (was) play() // (in from silence, once the pause's fade is over)
  }

  // ---- levels for a visualizer: 16 log-spaced bands, 40 Hz .. 9 kHz (where this music lives)
  const bins = new Uint8Array(analyser.frequencyBinCount)
  const edges = new Uint16Array(17)
  const tilt = new Float32Array(16)
  for (let i = 0, prev = 0; i <= 16; i++) {
    let k = Math.round((40 * Math.pow(9000 / 40, i / 16)) / (sr / analyser.fftSize))
    if (k <= prev) k = prev + 1
    edges[i] = prev = Math.min(k, bins.length)
    if (i < 16) tilt[i] = 0.85 + (1.05 * i) / 15 // (the highs carry less energy: lift them)
  }
  function bars(out) {
    analyser.getByteFrequencyData(bins)
    for (let i = 0; i < 16; i++) {
      const a = edges[i]
      const z = edges[i + 1]
      let s = 0
      for (let k = a; k < z; k++) s += bins[k]
      const v = z > a ? (s / ((z - a) * 255)) * tilt[i] : 0
      out[i] = v > 1 ? 1 : v
    }
    return out
  }

  function dispose() {
    if (disposed) return
    playing = false
    disposed = true
    clearInterval(timer)
    const t = ctx.state === 'closed' ? 0 : ctx.currentTime
    const stop = (s) => {
      try {
        s.stop(t)
      } catch (e) {
        // (already stopped, or the context is closed)
      }
      s.disconnect()
    }
    for (const rec of live) {
      for (const s of rec.s) stop(s)
      for (const n of rec.n) n.disconnect()
    }
    live.clear()
    if (crack) stop(crack)
    if (rain) rain.forEach(stop)
    crack = rain = null
    lfos.forEach(stop)
    for (const n of fixed) n.disconnect()
    q.length = 0
  }

  const api = {
    play,
    pause,
    /** Play or pause; returns whether it is playing now. */
    toggle() {
      if (playing) pause()
      else play()
      return playing
    },
    next() {
      go((view().i + 1) % TRACKS.length, 0)
    },
    /** Back to the top of the track, or (in its first 3 s) to the previous one. */
    prev() {
      const i = view().i
      go(api.time > 3 ? i : (i + TRACKS.length - 1) % TRACKS.length, 0)
    },
    /** Jump to `seconds` into the current track. */
    seek(seconds) {
      const i = view().i
      go(i, clamp(+seconds || 0, 0, TRACKS[i].duration))
    },
    /** Offline rendering: schedule everything up to ctx time `until` (realtime contexts do this on a timer). */
    advance,
    get playing() {
      return playing
    },
    /** { index, title, artist, duration (s) } */
    get track() {
      return TRACKS[view().i].info
    },
    /** Seconds into the current track. */
    get time() {
      if (!playing) return paused
      const v = view()
      return posIn(v, ctx.currentTime)
    },
    /** Sounding (or scheduled) voices: a gauge for tests. */
    get voices() {
      return live.size
    },
    analyser,
    bars,
    dispose,
  }
  return api
}

/** The album, for a track list: [{ index, title, artist, duration }]. */
export const tracks = TRACKS.map((t) => t.info)
