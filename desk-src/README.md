# A still life (source)

One three.js scene, light and quiet, like a product page: a white music player, wired earbuds
plugged into it, a cigarette burning in a stoneware ashtray, and a lighter, seen from nearly above
through a long lens on a soft grey-blue ground. The player's screen runs Pod OS, a small portfolio
OS. A minimal loader fetches and builds everything before entry. The production build is `../desk`.

Views: home is the player in focus, upright and large, Pod OS live on its screen (the rest of the
still life at the edges); "step back" (or zooming out) shows the whole still life; a double-click
closes in on anything; Escape or back returns to the player. The view holds still: no parallax, a
still dither instead of film grain, so a frame changes only where something moves.

```
npm ci
npm run dev      # http://localhost:5173 (add ?debug for the overlay)
npm run build    # writes ../desk (and ../desk/plain.html)
```

- `index.html`: the loader (inline markup and styles); `src/main.js`: what drives it
- `src/scene.js`: `createScene(containerEl)` → `{ destroy() }`; the 2D layer (name and role, the
  keys, now playing, the colours, sound and reset) is its `UI` and `CSS`
- `src/layout.js`: where everything lies and what the camera frames (wide and tall screens)
- `src/core`: the shared parts (renderer frame cache, grab, physics scheduler, rope, rigid body,
  the critically damped follower, audio, focus, worker, debug overlay, SDF mesher, noise, bakes)
- `src/objects`: the player, the earbuds, the ashtray and cigarette, the lighter, the smoke
- `src/shaders`: GLSL
- `tools/settle.mjs`: regenerates `src/objects/earbudsPose.js`, the earbuds' settled opening pose
  (`node tools/settle.mjs`; run it after changing the layout or the rope)
- `tools/grab-jitter.mjs`: how smoothly the earbuds move when picked up, carried and let go (the
  rig, its ground and a replayed pointer, under Node: `node tools/grab-jitter.mjs`, or `--legacy`
  for the pointer straight to the rig, as before)

Keys: `P` the player's screen off and on, `Esc` back (Pod OS a level up, then the view back to the
player; an object held goes home), `Space` the lighter's flame while it is held.

The cable's chains and their lengths are set in one place, `CHAINS` in `src/objects/earbudsGeom.js`:
the physics and the cable's mesh both read it.

## The earbuds: calm by design

A held part is tied to an anchor that follows the hand through a critically damped follower
(`src/core/follow.js`: no overshoot, its speed capped), advanced every 120 Hz step; the pointer is
eased once a frame (`src/core/grab.js`, 120 ms). The solver always runs 8 substeps × 2 sweeps;
contacts never bounce (desk, parts, cable against cable); cable threaded through the same part does
not push itself apart; slow contacts rest; after a release the rope is damped harder for a while and
its grip grows; and each frame is drawn between its last two physics steps. The cigarette and the
lighter are held through the same follower.

## Pod OS (the player's screen)

**Your content lives in one file: `src/content/portfolio.ts`.** Replace every `TODO: your text here`,
put your projects in `projects`, and set your email and links. Screenshots and a photo: put the files
in `public/media/` and list them as `'./media/shot.png'` (they are loaded before entry); until then
the OS draws quiet placeholders. Keep the file plain data, without imports: the build reads it too.
The same file also gives the name and role at the top left and the copyright line, and becomes the
page's hidden semantic HTML (for search engines and screen readers) and the plain view, `plain.html`
(both made by `vite.config.js` from `src/content/pages.js`).

- Three screens: the projects list (home), a project's page, About & contact. One light theme, the
  scene's own paper and slate, and calmer with reduced motion
- `src/os/os.js`: the OS (one DOM, 360 × 383 logical px, the glass's own shape); `os.css` its look;
  `theme.js` the theme and the wallpaper; `icons.js` its few glyphs (one 24-unit grid, 1.5 px
  strokes); `paint.js` paints the DOM into the screen's texture
- From across the desk the screen is a canvas texture painted from the OS's own DOM (only when
  something changed), lit by the scene; double-click or tap the player (or tap its screen) and the
  OS's real DOM is laid exactly over the glass, crisp and selectable, then swapped back as the view
  leaves. At home it is live from the start; `P` switches it off and on
- The player's keys, up close: the left one back, the middle one select (hold it to play or pause),
  the red one next item; across the desk they are the music's. The keyboard: Tab to "use the
  player's screen", then arrows, Enter, Escape or Backspace
- Font: Inter, under the SIL Open Font License (`public/fonts/`)
