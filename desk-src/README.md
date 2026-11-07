# Late night: the desk (source)

One three.js scene of a late-night desk: a white music player, wired earbuds plugged into it, a
cigarette burning in a stoneware ashtray, and a lighter. The player's screen runs Pod OS, a small
portfolio OS. A minimal loader fetches and builds everything before entry. The production build is
`../desk`.

```
npm ci
npm run dev      # http://localhost:5173 (add ?debug for the overlay)
npm run build    # writes ../desk (and ../desk/plain.html)
```

- `index.html`: the loader (inline markup and styles); `src/main.js`: what drives it
- `src/scene.js`: `createScene(containerEl)` → `{ destroy() }`
- `src/core`: the shared parts (renderer frame cache, grab, physics scheduler, rope, rigid body,
  audio, focus, worker, debug overlay, SDF mesher, noise, bakes)
- `src/objects`: the player, the earbuds, the ashtray and cigarette, the lighter, the smoke
- `src/shaders`: GLSL
- `tools/settle.mjs`: regenerates `src/objects/earbudsPose.js`, the earbuds' settled opening pose
  (`node tools/settle.mjs`)

## Pod OS (the player's screen)

**Your content lives in one file: `src/content/portfolio.ts`.** Replace every `TODO: your text here`,
put your projects in `projects`, and set your email and links. Screenshots and a photo: put the files
in `public/media/` and list them as `'./media/shot.png'` (they are loaded before entry); until then
the OS draws quiet placeholders. Keep the file plain data, without imports: the build reads it too.
The same file also becomes the page's hidden semantic HTML (for search engines and screen readers)
and the plain view, `plain.html` (both made by `vite.config.js` from `src/content/pages.js`).

- Three screens: the projects list (home), a project's page, About & contact. Dark or light as the
  visitor's system is, and calmer with reduced motion
- `src/os/os.js`: the OS (one DOM, 360 × 383 logical px, the glass's own shape); `os.css` its look;
  `theme.js` the two themes and the wallpaper; `icons.js` its few glyphs (one 24-unit grid, 1.5 px
  strokes); `paint.js` paints the DOM into the screen's texture
- From across the desk the screen is a canvas texture painted from the OS's own DOM (only when
  something changed), lit by the scene; double-click or tap the player (or tap its screen) and the
  OS's real DOM is laid exactly over the glass, crisp and selectable, then swapped back as the view
  leaves
- The player's keys, up close: the left one back, the middle one select (hold it to play or pause),
  the red one next item; across the desk they are the music's. The keyboard: Tab to "use the
  player's screen", then arrows, Enter, Escape or Backspace
- Font: Inter, under the SIL Open Font License (`public/fonts/`)
