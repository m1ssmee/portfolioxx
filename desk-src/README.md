# A still life (source)

One three.js scene: a desk at dusk, seen from the chair. On a matte white desk, a sage felt mat
holds a white music player, wired earbuds plugged into it, a cigarette burning in a stoneware
ashtray and a lighter; beside them, a graphite laptop open on the projects' sites, a sealed can of
"late." and the visitors' book. A cream and brass spring lamp is the light. On a deep green panelled
wall, a cork board in an oak frame holds three sticky notes, this month's calendar, a postcard, a
ticket, a clipped sketch and the ID badge. The player's screen runs Pod OS,
a small portfolio OS. A minimal loader fetches and builds everything before entry. The production
build is `../desk`.

Views: home is seated, the whole desk and the board in view (fitted to any screen, wide or tall).
A tap on the player looks straight down onto Pod OS; on anything else on the desk (the ashtray,
the lighter, the earbuds, the book, the can), straight down onto it, the wall at the top of the
picture; on the board or the badge, square to the board, still seated; on the laptop, face-on to
its display (from a little to its right, clear of the lamp's shade); on the lamp's arm or foot, the
lamp from the chair's side. Once there, taps are the object's own (below: the room). The lamp's
head and switch are the exception: a tap on them switches the lamp, from anywhere, and a drag on its
head aims it. A double-click closes in on anything; Escape or back returns home; reset puts
everything back (the lamp on and aimed as it was, the can stood up and sealed, the laptop on its
first tab). The view holds still: no parallax, a
still dither instead of film grain, so a frame changes only where something moves. It moves softly:
the wheel's zoom is a critically damped spring on the distance (each notch eases in and out), glides
ease with a smootherstep, and a moving frame keeps the still frame's depth of field, so nothing pops
as the view starts or stops (the shadows are drawn again only when what casts them moves). The
depth of field is drawn on one fixed spiral (no per-pixel noise to crawl as the view moves), each
sample counted as a lens would (a sharp edge in front never smears over the blur behind it, nor the
blur behind over it), and blended in only where the lens blurs; the canvas is at the screen's own pixels (up to
2x: a stretched canvas breaks thin seams into dashes). The
soft shadow is an exact box blur, one sample a texel, its depth range fitted to the still life.
A still frame redraws only the box that changed into a kept frame, and copies that out: the
burning cigarette's end and the glass when its page moved are restored from the cache and drawn
again (in their own single-sampled target: a still frame drawn into the multisampled one made the
GPU resolve and store all of it every frame); the smoke and the glow of the ember's flicker the
composite mixes itself, from the cache's two frames (the scene without the ember's light, and lit
by it alone), reading the bloom only round the ember and the blurred frames only where the lens
blurs: an idle frame costs its box, not the screen.
While the view moves, everything is drawn at a reduced size into fixed buffers (85% on a 2x canvas,
90% on a 1.5x one, no multisampling there: SMAA at that size smooths it, and a WebGL multisample
resolve is a whole extra pass over the frame) and SMAA's own last pass scales it onto the canvas
(a separate copy only under the veil); the full-size still frame returns once the view rests, its
cache baked a step a frame (five frames) while the moving frames go on showing, so the end of a
gesture never pays for the whole bake at once (the shadow map alone is redrawn through a one-pixel
target, and the ember's own frame only as far as its light reaches). On a
GPU that cannot keep about 51 moving frames a second, the governor steps the moving frames down
within 0.6 s, at most twice (a fifth fewer pixels each; `api.quality()` under `?debug`); while
something is carried the soft shadow is drawn again every other frame. The frames' pace: ten a
second over the screen's refresh while live (a timer draws them; by the refresh instead for three
seconds whenever they start coming late), 30 once nobody has touched anything for eight seconds
and only the smoke moves, 20 while a project or the book is open. The canvas is opaque and has no
depth buffer of its own (it only receives finished frames); the desk and the key light's shadow
on it are one surface, drawn in one pass, after everything that hides it.

The moulded parts (the ashtray, the lighter, the earbud, its remote) are meshed from distance
fields in workers, up to three side by side, then made lighter (`src/core/decimate.js`): every
vertex goes whose removal moves the surface by less than three thousandths of a millimetre and
leaves the normal, the occlusion and the glaze the remaining triangles interpolate at its place
within a hair of its own, so a flat side keeps a handful of triangles and a seam all of them:
about a third of the mesher's triangles, drawn the same. The materials' shaders start compiling
as each part is built, while the workers are still meshing.

```
npm ci
npm run dev      # http://localhost:5173 (add ?debug for the overlay: fps, CPU and GPU ms by stage)
npm run build    # writes ../desk
```

## Deploying

- **Vercel, Root Directory `desk-src`** (the Vite preset, nothing else to set): Vercel installs and
  builds this project; on Vercel the build goes to `dist` (`vite.config.js`: `process.env.VERCEL`),
  the desk is the site's front page, and `api/visitors.js` here is its function. `vercel.json`
  here caches the hashed assets for good.
- **Vercel, Root Directory left at the repository** (no framework, no build): the committed
  `../desk` is served at `/desk/`, the repository's `api/visitors.js` hands over to the one here.
- **Anywhere else** (GitHub Pages, Netlify): the committed `../desk`, as it is. `npm run build`
  off Vercel writes it.

- `index.html`: the loader (inline markup and styles); `src/main.js`: what drives it
- `src/scene.js`: `createScene(containerEl)` → `{ destroy() }`; the 2D layer (name and role, the
  keys, now playing, the colours, sound and reset) is its `UI` and `CSS`
- `src/layout.js`: where everything lies and what the camera frames (wide and tall screens)
- `src/core`: the shared parts (renderer frame cache, grab, physics scheduler, rope, rigid body,
  the critically damped follower, audio, focus, worker, debug overlay, SDF mesher, noise, bakes)
- `src/objects`: the player, the earbuds, the ashtray and cigarette, the lighter, the smoke, and
  the room (`room.js`, `deskMat.js`, `laptop.js`, `can.js`, `lamp.js`)
- `src/shaders`: GLSL
- `tools/settle.mjs`: regenerates `src/objects/earbudsPose.js`, the earbuds' settled opening pose
  (`node tools/settle.mjs`; run it after changing the layout or the rope)
- `tools/grab-jitter.mjs`: how smoothly the earbuds move when picked up, carried and let go (the
  rig, its ground and a replayed pointer, under Node: `node tools/grab-jitter.mjs`, or `--legacy`
  for the pointer straight to the rig, as before)
- `tools/shots.mjs`: pictures for review, from the Chrome on the machine (headless, its own
  WebGL): each view reached as a visitor reaches it, states set with `--eval`, frame costs with
  `--perf` (`node tools/shots.mjs .review/x --size=1366x768,1440x900@2 --views=home,laptop,lamp`;
  its usage is at its top). Nothing to install.

Keys: `P` the player's screen off and on, `L` the lamp on and off, `Esc` back (Pod OS a level up,
then the view back to the seated home view; an object held goes home), `Space` the lighter's flame
while it is held. Up close on the laptop: the arrows up and down scroll its page and left and right
go through its tabs; Page Up and Page Down a screen, Home and End its ends.

The cable's chains and their lengths are set in one place, `CHAINS` in `src/objects/earbudsGeom.js`:
the physics and the cable's mesh both read it.

## The room

- `src/objects/room.js`: the matte white desk and, 6 mm behind its back edge (a dark shadow gap), a
  deep green accent wall of V-jointed boards in eggshell paint, a black double socket low on the
  right with a plug, an oak picture rail just above the view. On it the cork board in a mitred oak
  frame: the three sticky notes (written in `scene.js`, `notes`, in Caveat), the calendar for the
  visitor's own month with today ringed, a risograph postcard, a planetarium ticket, a bulldog clip
  holding a sketch of the rover and a receipt, and the badge's pin. Up close a tap moves what it
  lands on: a note or the postcard peels up and falls back, the calendar's page turns up to next
  month, the clip, the ticket and the badge swing on their pins (`room.items`, `room.hang`). Its
  textures are baked in the worker (`roomTex.js`); the paper is drawn on the page (`roomPaper.js`:
  it needs the fonts).
- `src/objects/deskMat.js`: the felt mat under the player (`MAT_COLOR` in `scene.js`: slate, sage,
  rust, oat or heather).
- `src/objects/laptop.js` (`laptopGeo.js`, `laptopTex.js`, `laptopScreen.js`): a graphite 13-inch
  notebook with no maker's mark: a full keyboard with printed legends, a glass trackpad, grilles,
  ports, two stickers on its lid. Its display is drawn from `portfolio.ts`: a browser with a tab for
  each project, each page in that project's own look, with its stack and what was hard ("under the
  hood"). A tap brings the view face-on; there a tap on a tab switches to it, a tap on the page goes
  to the next project, a tap on a key presses it; a drag on the display or the wheel over it
  (lines or pixels; a pinch still zooms) scrolls the page, and a flick goes on a little. The lid
  opens as the visitor comes in. With the lamp off, its keyboard lights up. Its bead-blast and wear
  are baked in the worker.
- `src/objects/can.js` (`canGeo.js`, `canTex.js`): a sealed persimmon can of a made-up drink,
  "late.". A tap closes in; there the first tap opens it (the tab, a puff, the hiss); then a tap
  high on it knocks it over, a tap low on it rocks it on its base, and a flick (a drag from it)
  knocks it over the way it was pushed. Knocked over it falls the nearest clear way to the push
  (`core/body.js`, a rigid body); sealed it only rolls, open it pours, and the puddle spreads (soft
  blobs merged in a shader, with a meniscus and a moment of fizz). A tap where it lies stands it up
  again and the puddle dries; reset stands it up sealed.
- `src/objects/lamp.js` (`lampParts.js`): a cream enamel and brass spring lamp of the classic kind,
  built from its foot, head and aim (the elbow found by two-bone IK). A tap on its head or its
  switch turns it on and off (`L` too); a drag on its head aims it at what is under the pointer, the
  desk or the wall. Its bulb is the scene's key light: a warm spotlight with a soft shadow along its
  shade, as bright as its glow, under a dusk sky (a cool hemisphere fill, a blue rim from the
  window, a faint bounce from behind the chair that dims with it). Off, the scene is the dusk's, the
  laptop's display and keyboard, and the ember's. The interface is dark to match: light text over
  the scene, and a dark frost behind an open project.
- Sounds (`core/audio.js`, made from noise and sines, only with the sound on): the lamp's switch,
  the laptop's keys and tabs, the can's crack and hiss and its base on the desk, paper moved on the
  board.
- What responds shows it: the pointer is a hand over what a tap moves and a grab over what a drag
  moves.

## The badge and the visitors' book

- `src/objects/badge.js`: the owner's ID card (its face from `src/assets/badge-face.webp`, drawn
  from the GitHub profile's `assets/id-card.svg`), pinned to the cork board by its clip. A tap on it
  brings the view square to the board, close enough to read it.
- `src/objects/notebook.js` and `src/visitors/`: an A5 spiral notebook, "visitors". A tap closes in
  and opens it: everyone's thumbprints on the left page, yours on the right (pick an ink, add a name
  and a place if you like, press and hold the pad). Each print is drawn from a random number, one of
  a kind (`print.js`), not anyone's real finger.
- Shared prints are kept by `api/visitors.js` (here; the repository's own `api/visitors.js` hands
  over to it), a Vercel function over Upstash Redis. To turn it on: in the Vercel project, Storage, add an Upstash Redis database
  (Marketplace) and connect it to the project; Vercel sets `UPSTASH_REDIS_REST_URL` and
  `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` and `KV_REST_API_TOKEN`), and redeploy. Until
  then, or anywhere without it (`npm run dev`), the book keeps a visitor's print in their browser.
  One print a minute per visitor; the newest 2,000 are kept; remove one from Upstash's console
  (the list `visitors:marks`).

## The earbuds: calm by design

A held part is tied to an anchor that follows the hand through a critically damped follower
(`src/core/follow.js`: no overshoot, its speed capped), advanced every 120 Hz step; the pointer is
eased once a frame (`src/core/grab.js`, 120 ms). The solver always runs 8 substeps × 2 sweeps;
contacts never bounce (desk, parts, cable against cable); cable threaded through the same part does
not push itself apart; slow contacts rest; after a release the rope is damped harder for a while and
its grip grows; and each frame is drawn between its last two physics steps. The cigarette and the
lighter are held through the same follower.

## Pod OS (the player's screen)

**Your content lives in one file: `src/content/portfolio.ts`:** your name and role, the bio, the four
projects (BodyMap, Codebase Tavern, the Lunar Habitat Safety Rover, CropScan) and your links.
Anything left empty is simply not shown: add your email, LinkedIn and X there when you want them on
the contact page, and a city in `basedIn`. Screenshots and a photo are optional: put the files in
`public/media/` and list them as `'./media/shot.png'` (they are loaded before entry). Keep the file
plain data, without imports: the build reads it too. The same file also gives the name and role at
the top left and the copyright line, and becomes the page's hidden semantic HTML, for search
engines and screen readers (made by `vite.config.js` from `src/content/pages.js`).

Opening a project (a card, or the keys) slides the player to the left, frosts the rest (the frame's
own present pass blurs an eighth-size copy of the scene and mixes it in with a tint and a soft hole
round the player: a CSS backdrop-filter over the canvas made the browser blur every pixel itself,
each frame, and stuttered) and tells
the project on the right, with a button to its live site (or its code); on a phone it comes up as a
sheet. Back, Escape, ◀ or a click on the blur closes it.

- Three screens: the projects list (home), a project's page, About & contact. One light theme, the
  scene's own paper and slate, and calmer with reduced motion
- `src/os/os.js`: the OS (one DOM, 360 × 383 logical px, the glass's own shape, `will-change:
  transform`: laid over the glass by a matrix that changes every frame of a zoom, it would
  otherwise be rasterized again at each new scale); `os.css` its look
  (its `.pos-glass`, the display's black border, the recess's shade and the room's reflection, is
  drawn again into the texture by `paint.js`'s `paintGlass`: keep the two together);
  `theme.js` the theme and the wallpaper; `icons.js` its few glyphs (one 24-unit grid, 1.5 px
  strokes); `paint.js` paints the DOM into the screen's texture
- From across the desk the screen is a canvas texture painted from the OS's own DOM (only when
  something changed), lit by the scene; double-click or tap the player (or tap its screen) and the
  OS's real DOM is laid exactly over the glass, crisp and selectable, then swapped back as the view
  leaves. At home it is live from the start; `P` switches it off and on
- The player's keys: ◀ back (on Pod OS) or the previous track, ▶ the next item or the next track,
  the red one select on Pod OS (hold it to play or pause) or play and pause for the music. The keyboard: Tab to "use the
  player's screen", then arrows, Enter, Escape or Backspace
- Fonts: Inter, and Caveat for the handwriting on the board, both under the SIL Open Font License
  (`public/fonts/`)
