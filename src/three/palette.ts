import type { Body } from '../usePod'

/** Materials for each body finish: anodised aluminium shell, glass front, matching earphones. */
export type Finish = {
  metal: string // anodised aluminium (shell, wheel, plug housing)
  metalRough: number
  glass: string // front glass
  glassDark: boolean
  button: string
  ink: string // etched wheel labels
  buds: string // earphone plastic and cable
  tips: string // silicone ear tips
  swatch: [string, string, string] // light, mid, dark (Settings preview)
}

export const FINISHES: Record<Body, Finish> = {
  sand: {
    metal: '#cbbba7',
    metalRough: 0.36,
    glass: '#f2efe9',
    glassDark: false,
    button: '#f5f3ee',
    ink: '#85796a',
    buds: '#f1f0ec',
    tips: '#d9d8d3',
    swatch: ['#e7dccd', '#cbbba7', '#9e8f7c'],
  },
  graphite: {
    metal: '#4a4c52',
    metalRough: 0.34,
    glass: '#0c0d0f',
    glassDark: true,
    button: '#131416',
    ink: '#a5a7ad',
    buds: '#1f2023',
    tips: '#3a3b3f',
    swatch: ['#73757c', '#4a4c52', '#25262a'],
  },
  sage: {
    metal: '#9daf98',
    metalRough: 0.38,
    glass: '#eef1ec',
    glassDark: false,
    button: '#f3f5f1',
    ink: '#5f6f5b',
    buds: '#f1f2ee',
    tips: '#d5dbd2',
    swatch: ['#c6d3c1', '#9daf98', '#6f8269'],
  },
  ember: {
    metal: '#cf6538',
    metalRough: 0.34,
    glass: '#0e0e10',
    glassDark: true,
    button: '#151517',
    ink: '#f4c3a8',
    buds: '#1d1d20',
    tips: '#38383c',
    swatch: ['#ec9a74', '#cf6538', '#93401c'],
  },
}
