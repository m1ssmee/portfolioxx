import type { Body } from '../usePod'

/** A finish: the metal frame, the clear glass shell, and the colour of the board inside. */
export type Finish = {
  frame: string
  frameRough: number
  glass: string // base tint of the glass
  attenuation: string // colour light picks up travelling through it
  attenuationDistance: number
  glassRough: number // 0 = crystal clear, higher = frosted
  pcb: 'black' | 'white'
  ink: string // printing on the clear wheel
  button: string // the satin centre button
  swatch: [string, string, string] // light, mid, dark (Settings preview)
}

export const FINISHES: Record<Body, Finish> = {
  clear: {
    frame: '#c9ccd1',
    frameRough: 0.32,
    glass: '#ffffff',
    attenuation: '#eef5f6',
    attenuationDistance: 0.9,
    glassRough: 0.03,
    pcb: 'black',
    ink: '#ffffff',
    button: '#f2f2ef',
    swatch: ['#f2f4f6', '#c9ccd1', '#8d9198'],
  },
  smoke: {
    frame: '#3f4247',
    frameRough: 0.34,
    glass: '#9aa0a8',
    attenuation: '#50545b',
    attenuationDistance: 0.09,
    glassRough: 0.04,
    pcb: 'black',
    ink: '#e8eaed',
    button: '#2b2d31',
    swatch: ['#7d8189', '#4a4d53', '#232528'],
  },
  frost: {
    frame: '#e6e7ea',
    frameRough: 0.3,
    glass: '#ffffff',
    attenuation: '#f4f6f8',
    attenuationDistance: 1.2,
    glassRough: 0.3,
    pcb: 'white',
    ink: '#2a2d33',
    button: '#dfe1e5',
    swatch: ['#ffffff', '#e6e7ea', '#b9bcc2'],
  },
  ice: {
    frame: '#aab3bf',
    frameRough: 0.3,
    glass: '#eef8fc',
    attenuation: '#b7dff0',
    attenuationDistance: 0.22,
    glassRough: 0.035,
    pcb: 'black',
    ink: '#ffffff',
    button: '#f4f7f9',
    swatch: ['#dff1f9', '#aab3bf', '#6f7a88'],
  },
}
