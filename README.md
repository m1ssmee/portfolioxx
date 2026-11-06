# krish. — portfolio

A portfolio you play like a music player. A see-through 3D pod stands in a colour-washed photo studio, with white wired earbuds plugged into its USB-C port and an ashtray smouldering next to it. Scroll to spin its wheel. Projects are albums: browse them on an arc of covers, then "play" one to open its live site.

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
| Power | side button | P | tap the side button |

- Drag the earbuds or the cable around. They have weight, tumble, rest on the floor and don't pass through each other.
- Pull the plug out of the bottom of the pod. The OS notices. Carry it back to the port and it clicks back in.
- Camera: a squeezed, low-res selfie cam with Squish, Mono and Night filters. Scroll to change filter, press the centre button to take a photo. Nothing leaves the browser.
- Click the cigarette for a drag. Move the cursor through the smoke to push it around.
- Click an album cover to play it.
- Settings: click sound on/off, and four finishes for the clear shell (Clear, Smoke, Frost, Ice).
- `#plain` is a normal scrolling page with the same content, for recruiters and search engines.

## How it's built

- Vite + React + TypeScript, with three.js through React Three Fiber, drei and postprocessing.
- `src/three/Pod.tsx`: the pod (metal frame, clear glass shell, clear wheel, satin centre button, side power button, USB-C port) and its wheel input.
- `src/three/Internals.tsx` and `src/three/internals.ts`: everything visible through the glass: battery, logic board with chips, shield cans and passives, flex cables, wheel sensor ring with LEDs, screws. All the textures are drawn in code.
- `src/three/os.ts`: the pod's OS, a colourful music-player UI (screens washed in the colours of the cover in focus, app tiles, a gliding highlight) drawn into a canvas that becomes the screen texture.
- `src/camera.ts`: the camera app's feed, squeeze and filters.
- `src/three/cable.ts`: earphone physics. Position-based dynamics: the cable is a chain of particles with stretch and bending constraints, and the earbuds and plug are rigid bodies kept in shape by shape matching. Floor friction, self-collision, collision with the pod, and pull-out/plug-in of the plug.
- `src/three/Earphones.tsx`: the earbuds, inline remote, USB-C plug and cable meshes.
- `src/three/Ashtray.tsx`: the glass ashtray, the cigarette and its smoke.
- `src/three/Backdrop.tsx`: the studio sweep with drifting colour glows and the giant scrolling type.
- `src/three/Albums.tsx`: the projects as album covers on an arc.
- `src/usePod.ts`: menus, navigation and what each button does.
- `src/gpu.ts`: picks a graphics budget. Dedicated graphics cards get refracting glass, contact-hardening shadows and multisampling; built-in laptop graphics, phones and software renderers get a light version of the same scene. A device that struggles (slow frames, a lost graphics context) drops to the light version by itself. `?gpu=low` or `?gpu=high` in the address forces one. If 3D can't run at all, the plain page is shown with the reason.

## Deploy

Any static host works. On Vercel, import the repo; it detects Vite. The build command is `npm run build` and the output folder is `dist`.
