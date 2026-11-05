// Canvas text needs the web fonts loaded first. Resolves when they are, or after a timeout.
export const DISPLAY = '"Bricolage Grotesque Variable", "Inter Variable", system-ui, sans-serif'
export const UI = '"Inter Variable", system-ui, sans-serif'

export const fontsReady: Promise<void> =
  typeof document === 'undefined' || !document.fonts
    ? Promise.resolve()
    : Promise.race([
        Promise.all([
          document.fonts.load(`700 64px ${DISPLAY}`),
          document.fonts.load(`800 64px ${DISPLAY}`),
          document.fonts.load(`400 32px ${UI}`),
          document.fonts.load(`500 32px ${UI}`),
          document.fonts.load(`600 32px ${UI}`),
          document.fonts.load('800 64px "Doto Variable"'),
          document.fonts.load('900 64px "Doto Variable"'),
          document.fonts.load('600 24px "JetBrains Mono Variable"'),
        ]).then(() => undefined),
        new Promise<void>((r) => setTimeout(r, 2500)),
      ]).catch(() => undefined)
