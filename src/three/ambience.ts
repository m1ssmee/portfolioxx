import { profile, projects } from '../content'

/**
 * The room's colour scheme. The backdrop, the giant wall type, the page text and
 * the pod's on-screen accents all follow the current ambience, and blend when it changes.
 */
export type Ambience = {
  base: string // backdrop
  a: string // first glow
  b: string // second glow
  ink: string // text on top of the backdrop
  accent: string // highlights on the pod's screen
  dark: boolean
  word: string // giant type on the wall
}

export const HOME: Ambience = {
  base: '#dccdbd',
  a: '#f4b48a',
  b: '#b9c6dc',
  ink: '#1f1b17',
  accent: '#ff7a45',
  dark: false,
  word: profile.name.toUpperCase(),
}

const BY_SLUG: Record<string, Omit<Ambience, 'word'>> = {
  bodymap: { base: '#cbc4ef', a: '#f3a6d8', b: '#8d84ee', ink: '#1c1834', accent: '#b49cff', dark: false },
  'codebase-tavern': { base: '#efcb8e', a: '#f7944a', b: '#fbe58a', ink: '#2b1706', accent: '#ffb547', dark: false },
  'lunar-rover': { base: '#20264a', a: '#f59e0b', b: '#3d4c93', ink: '#eef0ff', accent: '#ffb02e', dark: true },
  cropscan: { base: '#bfdcab', a: '#e9f59c', b: '#5c9c6c', ink: '#11250f', accent: '#9ae66e', dark: false },
}

export function ambienceFor(index: number | null): Ambience {
  if (index === null) return HOME
  const p = projects[index]
  const a = BY_SLUG[p.slug]
  return a ? { ...a, word: p.title.toUpperCase() } : HOME
}
