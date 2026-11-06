import type { Tier } from '../gpu'

/**
 * The graphics budget the 3D view was mounted with. Scene sets it before its children mount, and
 * the scene remounts when it changes, so components can read it once when they build materials.
 */
export const quality: { tier: Tier } = { tier: 'high' }
