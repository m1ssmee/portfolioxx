# krish. — portfolio

A portfolio you play like a music player. A 3D pod floats in a colour-washed photo studio, with USB-C earphones plugged in. Scroll to spin its wheel. Projects are albums: browse them on an arc of covers, then "play" one to open its live site.

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/
```

## Edit the content

All the text lives in `src/content.ts`: name, about text, projects, toolkit and contact links.
A project with a `live` URL plays its live site; a project without one opens its notes.
Room colours per project are in `src/three/ambience.ts`, and the generated cover art is in `src/three/art.ts`.

## Things to try

| | Mouse / trackpad | Keyboard | Touch |
|---|---|---|---|
| Scroll | scroll wheel, or drag around the click wheel | ↑ ↓ | swipe, or drag the wheel |
| Select | centre button | Enter / Space | tap centre |
| Back | MENU | Esc / Backspace | tap MENU |
| Next / previous album | ⏭ ⏮ | → ← | tap ⏭ ⏮ |

- Drag the earbuds or the cable around. They have weight, rest on the floor and don't pass through each other.
- Pull the plug out of the top of the pod. The OS notices. Carry it back to the port and it clicks back in.
- Click an album cover to play it.
- Settings: click sound on/off, and four finishes (Sand, Graphite, Sage, Ember).
- `#plain` is a normal scrolling page with the same content, for recruiters and search engines.

## How it's built

- Vite + React + TypeScript, with three.js through React Three Fiber, drei and postprocessing.
- `src/three/Pod.tsx`: the pod (aluminium shell, glass front, turned-metal wheel, USB-C port) and its wheel input.
- `src/three/os.ts`: the pod's OS, drawn into a canvas that becomes the screen texture.
- `src/three/cable.ts`: earphone physics. Position-based dynamics with stretch and bending constraints, floor friction, self-collision, collision with the pod, and pull-out/plug-in of the plug.
- `src/three/Earphones.tsx`: the earbuds, inline remote, right-angle USB-C plug and cable meshes.
- `src/three/Backdrop.tsx`: the studio sweep with drifting colour glows and the giant scrolling type.
- `src/three/Albums.tsx`: the projects as album covers on an arc.
- `src/usePod.ts`: menus, navigation and what each button does.

## Deploy

Any static host works. On Vercel, import the repo; it detects Vite. The build command is `npm run build` and the output folder is `dist`.
