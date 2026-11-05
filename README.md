# santosh. — portfolio pod

A portfolio you play like a click-wheel music player. Wired earbuds are plugged into the top. They swing when you scroll and you can grab and fling them. Choosing a project "projects" the live site onto the page next to the pod.

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/
```

## Edit the content

Everything the site says is in `src/content.ts`: your name, about text, projects, toolkit and contact links.
A project with a `live` URL is shown live in the projector. A project without one gets a case-study card.

## Controls

| | Mouse / trackpad | Keyboard | Touch |
|---|---|---|---|
| Scroll | scroll wheel, or drag around the click wheel | ↑ ↓ | swipe, or drag the wheel |
| Select | centre button | Enter / Space | tap centre |
| Back | MENU | Esc / Backspace | tap MENU |
| Next / previous project | ⏭ ⏮ | → ← | tap ⏭ ⏮ |

On a project's Now Playing screen, scrolling changes the click volume. Settings has the clicker on/off switch and four body colours. `#plain` is a normal scrolling page with the same content, for recruiters and search engines.

## How it's built

- Vite + React + TypeScript, Motion for screen transitions.
- `src/earphones.ts`: the earphone cable is a Verlet rope drawn on a canvas. It is pinned at the plug, collides with the pod's rounded body, and gets a push on every scroll tick.
- `src/rig.ts`: shared state between React and the animation loop (pod sway, kicks, the projector beam).
- `src/usePod.ts`: the menu stack and what each button does.
- `src/components/`: the screen, the click wheel, the projector and the plain view.

## Deploy

Any static host works. On Vercel, import the repo; it detects Vite. The build command is `npm run build` and the output folder is `dist`.
