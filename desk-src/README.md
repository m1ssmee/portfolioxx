# Late night: the desk (source)

One three.js scene of a late-night desk: a white music player, wired earbuds plugged into it, a
cigarette burning in a stoneware ashtray, and a lighter. A minimal loader fetches and builds
everything before entry. The production build is `../desk`.

```
npm ci
npm run dev      # http://localhost:5173 (add ?debug for the overlay)
npm run build    # writes ../desk
```

- `index.html`: the loader (inline markup and styles); `src/main.js`: what drives it
- `src/scene.js`: `createScene(containerEl)` → `{ destroy() }`
- `src/core`: the shared parts (renderer frame cache, grab, physics scheduler, rope, rigid body,
  audio, focus, worker, debug overlay, SDF mesher, noise, bakes)
- `src/objects`: the player, the earbuds, the ashtray and cigarette, the lighter, the smoke
- `src/shaders`: GLSL
- `tools/settle.mjs`: regenerates `src/objects/earbudsPose.js`, the earbuds' settled opening pose
  (`node tools/settle.mjs`)
