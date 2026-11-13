// A thin graphite laptop in the style of a 13-inch aluminium notebook (no maker's mark), open on a
// browser with the owner's projects, a tab each. Its shapes are laptopGeo.js's, its textures
// laptopTex.js's, its screen laptopScreen.js's; here, its materials, its parts and what it does.
// Frame: x across (its width), z towards the person at it (the hinge at -z), y up; on y = 0.
//   finish   warm graphite anodising, bead-blasted (a fine normal map), a little uneven; polished
//            chamfers round the deck's edge, the thumb scoop and the lid's face; the keyboard's well
//            black; a glass trackpad with a hairline round it; speaker grilles; palm-rest smudges,
//            prints on the trackpad, a little dust; the ports, the case's seam, the vent behind
//            the hinge; the clutch dark, its seams and polished ends; rubber feet; two stickers on
//            the lid's back. One material (aluminium, its zones per vertex), one for the keys (one
//            instanced mesh: dished tops, printed legends from one atlas, the most used keys
//            polished), one for the glass (the display, its bezel, the camera, the gasket)
//   screen   the browser's chrome and the page are two textures drawn only when the tab changes;
//            the glass's shader shows the page through a window that moves as it scrolls (a uniform:
//            nothing is drawn or uploaded while scrolling). Its light is undone from the frame's
//            tone mapping (as the player's screen is), so the pages keep their own colours. Its
//            anti-glare coating spreads the lamp's highlight to a faint sheen; the bezel round it is
//            glossy black glass, rougher where it is smudged
//   light    the display's light falls on the keys and the deck nearest it (an emissive tint); the
//            keyboard's backlight lights the legends and leaks from under the keys
//   moves    keys dip and spring back, the page scrolls with a little inertia, the lid opens and
//            closes, the backlight fades: update(dt) is true only while something moves
import * as THREE from 'three'
import { LAPTOP, LID, DISP, SCREEN, CAM, WELL, PAD, GRILLE, PORTS, FEET, KEY, keyLayout, baseGeometry, lidGeometry, glassGeometry, keyGeometry, lidReach } from './laptopGeo.js'
import { beadPixels, wearPixels, drawLegends, drawStickers, drawContact, ATLAS, STICKERS } from './laptopTex.js'
import { drawChrome, drawPage, drawDisplay, CHROME, PAGE, VIEW_H } from './laptopScreen.js'

export { LAPTOP, drawDisplay }

/** A number as a GLSL float literal. */
const f = (x) => {
  const s = String(+(+x).toFixed(5))
  return /[.e]/.test(s) ? s : `${s}.0`
}
const canvas = (w, h) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}
/** A BufferGeometry from laptopGeo.js's arrays. */
function toGeometry(o) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(o.position, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(o.normal, 3))
  if (o.uv) g.setAttribute('uv', new THREE.BufferAttribute(o.uv, 2))
  if (o.zone) g.setAttribute('aZone', new THREE.BufferAttribute(o.zone, 1))
  g.setIndex(new THREE.BufferAttribute(o.index, 1))
  g.computeBoundingBox()
  g.computeBoundingSphere()
  return g
}

// (the frame's tone mapping, core/frame.js's composite (PBR Neutral), undone: the screen gives the
// light that comes out as the page's own colour; scene.js's NEUTRAL_INV, keep the two together)
const NEUTRAL_INV = /* glsl */ `
  float lapNeutralInv(float w) {
    if (w < 0.04) return sqrt(max(w, 0.0) / 6.25);
    if (w < 0.76) return w + 0.04;
    return 0.0576 / (1.0 - min(w, 0.995)) - 0.24 + 0.76 + 0.04;
  }
  vec3 lapNeutralInv(vec3 c) { return vec3(lapNeutralInv(c.r), lapNeutralInv(c.g), lapNeutralInv(c.b)); }`
const BOX = /* glsl */ `
  float lapBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  float lapLine(float d, float w) { float fw = fwidth(d); return 1.0 - smoothstep(w, w + fw + 1e-4, abs(d)); }`

/**
 * The laptop at `at` (world, on the desk at its height), turned `yaw`. projects: portfolio.ts's;
 * font: a loaded CSS family for the screen and the keys.
 */
export function createLaptop({ at, yaw, projects, font, anisotropy = 4, baked }) {
  const L = LAPTOP
  const TOP = L.base
  const group = new THREE.Group()
  group.name = 'laptop'
  group.position.set(at[0], at[1], at[2])
  group.rotation.y = yaw
  const geometries = []
  const materials = []
  const textures = []
  const keys = keyLayout()

  // ---- textures
  const dataTex = (px, w, h, repeat) => {
    const t = new THREE.DataTexture(px, w, h)
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.magFilter = THREE.LinearFilter
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.generateMipmaps = true
    t.anisotropy = anisotropy
    t.needsUpdate = true
    textures.push(t)
    return t
  }
  const canvasTex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c)
    t.flipY = false
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.anisotropy = anisotropy
    textures.push(t)
    return t
  }
  // (the bakes: pure functions, laptopTex.js; `baked`, if given, has them from the scene's worker)
  const bead = baked?.bead || beadPixels(128)
  const beadTex = dataTex(bead.px, bead.size, bead.size, true)
  const wear = baked?.wear || wearPixels(keys, WELL, PAD, [L.w, L.d])
  const wearTex = dataTex(wear.px, wear.w, wear.h, false)
  const atlasC = canvas(ATLAS.w, ATLAS.h)
  const cells = drawLegends(atlasC.getContext('2d'), keys, font)
  const atlasTex = canvasTex(atlasC, false)
  const stickC = canvas(STICKERS.w, STICKERS.h)
  drawStickers(stickC.getContext('2d'), font)
  const stickTex = canvasTex(stickC, true)
  // the screen: the browser's chrome (a strip) and the page (taller than the screen)
  const chromeC = canvas(CHROME.texW, CHROME.texH)
  const pageC = canvas(PAGE.texW, PAGE.texH)
  const chromeTex = canvasTex(chromeC, true)
  const pageTex = canvasTex(pageC, true)

  // ---- uniforms shared by the materials
  const U = {
    uGlowA: { value: 1 }, // (self-lit parts on, off: the ember's frame draws them dark)
    uScreen: { value: new THREE.Color(0, 0, 0) }, // (the display's light where it falls: colour x strength)
    uBacklightA: { value: 0 },
  }
  const D = {
    tChrome: { value: chromeTex },
    tPage: { value: pageTex },
    uScroll: { value: 0 },
    uPageH: { value: PAGE.h },
    uThumb: { value: new THREE.Vector4(0, 0, 0, 0) },
    uFlash: { value: new THREE.Vector4(0, 0, 0, 0) },
    uFlashK: { value: 0 },
    uBright: { value: 0.86 },
  }

  // ---- the aluminium: one material for the base, the lid, the clutch and the feet, its zones per
  // vertex (laptopGeo.js's ZONE)
  const H = L.hinge
  const SCR_Z = H.z + 3 // (where the display's light starts on the deck)
  const alu = new THREE.MeshStandardMaterial({ name: 'laptop.alu', color: 0xffffff, roughness: 0.44, metalness: 0.5, normalMap: beadTex, normalScale: new THREE.Vector2(0.12, 0.12) })
  alu.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, { tWear: { value: wearTex }, tSticker: { value: stickTex } })
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aZone;\nvarying float vZone;\nvarying vec3 vLP;\nvarying vec3 vLN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZone = aZone;\nvLP = position;\nvLN = normal;')
    const G = GRILLE
    const usb = PORTS.filter((p) => p[2] === 'usbc').map((p) => p[1])
    const jack = PORTS.find((p) => p[2] === 'jack')[1]
    const sa = { x: -70, s: 66 } // (the stickers on the lid's back, its frame)
    const sb = { x: 58, s: 150, r: 0.12 }
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying float vZone;
        varying vec3 vLP;
        varying vec3 vLN;
        uniform sampler2D tWear;
        uniform sampler2D tSticker;
        uniform vec3 uScreen;
        uniform float uGlowA;
        uniform float uBacklightA;
        ${BOX}`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        // ---- which part (constant over a triangle)
        float zn = vZone;
        float isLid = step(1.5, zn) * step(zn, 2.5) + step(5.5, zn);
        float isWell = step(0.5, zn) * step(zn, 1.5);
        float isClutch = step(2.5, zn) * step(zn, 3.5);
        float isFoot = step(3.5, zn) * step(zn, 4.5);
        float isCham = step(4.5, zn);
        vec3 lp = vLP;
        vec3 ln = normalize(vLN);
        // (the wear map: the deck's plan; on the lid, its own, its tone only)
        vec2 wuv = isLid > 0.5 ? vec2((lp.x + 152.0) / 304.0, (lp.z - 3.0) / 208.0) : vec2((lp.x + 152.0) / 304.0, (lp.z + 107.5) / 215.0);
        vec4 wear = texture2D(tWear, wuv);
        // graphite anodising, a little uneven
        vec3 lapCol = vec3(0.135, 0.134, 0.136) * (0.93 + 0.14 * wear.a);
        float lapRough = 0.44;
        float lapMetal = 0.5;
        float lapBead = 1.0;
        float lapAo = 1.0;
        vec3 lapEmit = vec3(0.0);
        vec3 lapLit = vec3(0.0);
        if (zn < 0.5) {
          if (ln.y > 0.9 && lp.y > ${f(TOP - 0.01)}) {
            // ---- the deck: the trackpad, glass, a hairline round it
            float dPad = lapBox(lp.xz - vec2(0.0, ${f(PAD.z)}), vec2(${f(PAD.w / 2)}, ${f(PAD.d / 2)}), ${f(PAD.r)});
            float inPad = 1.0 - smoothstep(-0.02, 0.02, dPad);
            lapCol = mix(lapCol, lapCol * 0.94, inPad);
            lapRough = mix(lapRough - 0.13 * wear.r, 0.3 - 0.14 * wear.r + 0.12 * wear.g, inPad);
            lapCol *= 1.0 - 0.05 * wear.r * (1.0 - inPad);
            lapMetal = mix(lapMetal, 0.42, inPad);
            lapBead = mix(1.0, 0.25, inPad);
            float seam = lapLine(dPad + 0.06, 0.07);
            lapCol *= 1.0 - 0.85 * seam;
            lapRough = mix(lapRough, 0.75, seam);
            // the speaker grilles: holes on a hexagonal pitch; their average where finer than a pixel
            vec2 gq = vec2(abs(lp.x) - ${f(G.x0)}, lp.z - ${f(G.z0)});
            float rowH = ${f(G.pitch * 0.8660254)};
            float row = floor(gq.y / rowH + 0.5);
            float off = mod(row, 2.0) * ${f(G.pitch / 2)};
            vec2 hc = vec2(floor((gq.x - off) / ${f(G.pitch)} + 0.5) * ${f(G.pitch)} + off, row * rowH);
            float inG = step(${f(G.hole + 0.2)}, hc.x) * step(hc.x, ${f(G.x1 - G.x0 - G.hole - 0.2)}) * step(${f(G.hole + 0.2)}, hc.y) * step(hc.y, ${f(G.z1 - G.z0 - G.hole - 0.2)});
            float fwg = max(fwidth(gq.x), fwidth(gq.y));
            float far = smoothstep(${f(0.22 * G.pitch)}, ${f(0.55 * G.pitch)}, fwg);
            float hole = 1.0 - smoothstep(-0.7 * fwg, 0.7 * fwg, length(gq - hc) - ${f(G.hole)});
            float field = step(0.0, gq.x) * step(gq.x, ${f(G.x1 - G.x0)}) * step(0.0, gq.y) * step(gq.y, ${f(G.z1 - G.z0)});
            hole = mix(hole * inG, ${f((Math.PI * G.hole * G.hole) / (G.pitch * G.pitch * 0.8660254))} * field, far);
            lapCol = mix(lapCol, vec3(0.006), hole);
            lapRough = mix(lapRough, 0.95, hole);
            lapBead *= 1.0 - hole;
            // a little dust, where nothing wipes it
            float dust = wear.b * (1.0 - inPad);
            lapCol = mix(lapCol, vec3(0.42, 0.4, 0.37), 0.18 * dust);
            lapRough = mix(lapRough, 0.9, 0.6 * dust);
            // the shade round the hinge's barrel
            float acrossH = 1.0 - smoothstep(${f(H.half - 6)}, ${f(H.half + 2)}, abs(lp.x));
            float dz = max(lp.z - ${f(H.z + Math.sqrt(H.r * H.r - (H.y - TOP) ** 2))}, 0.0);
            lapAo *= 1.0 - acrossH * (0.55 * exp(-dz / 1.4) + 0.2 * exp(-dz / 12.0));
            // the display's light, strongest nearest it
            lapLit = uScreen * (0.04 + 0.2 * exp(-(lp.z - ${f(SCR_Z)}) / 46.0));
          } else if (abs(ln.y) < 0.5) {
            // ---- the walls: the seam where the top case meets the bottom one, darker low down
            lapCol *= 1.0 - 0.75 * lapLine(lp.y - ${f(L.foot + 2.7)}, 0.06);
            lapAo *= 0.7 + 0.3 * smoothstep(${f(L.foot)}, ${f(L.foot + 4.5)}, lp.y);
            if (abs(ln.x) > 0.7) {
              // a side's ports: two USB-C on the left, the headphone jack on the right
              vec2 q = vec2(lp.z, lp.y - ${f((L.foot + 2.4 + TOP - L.chamfer) / 2)});
              float left = step(lp.x, 0.0);
              float dp = mix(length(q - vec2(${f(jack)}, 0.0)) - 1.75, min(lapBox(q - vec2(${f(usb[0])}, 0.0), vec2(4.2, 1.3), 1.3), lapBox(q - vec2(${f(usb[1])}, 0.0), vec2(4.2, 1.3), 1.3)), left);
              float inP = 1.0 - smoothstep(-0.03, 0.03, dp);
              float rim = (1.0 - smoothstep(0.22, 0.3, dp)) * (1.0 - inP);
              float dt = min(lapBox(q - vec2(${f(usb[0])}, 0.0), vec2(3.0, 0.32), 0.25), lapBox(q - vec2(${f(usb[1])}, 0.0), vec2(3.0, 0.32), 0.25));
              float tongue = left * (1.0 - smoothstep(-0.03, 0.03, dt));
              lapCol = mix(lapCol, mix(vec3(0.01), vec3(0.05), tongue), inP);
              lapRough = mix(lapRough, 0.9, inP);
              lapBead *= 1.0 - inP;
              // (the machined edge round each opening: polished)
              lapCol = mix(lapCol, vec3(0.33, 0.32, 0.3), rim);
              lapMetal = mix(lapMetal, 1.0, rim);
              lapRough = mix(lapRough, 0.2, rim);
              lapBead *= 1.0 - rim;
            }
            if (ln.z < -0.7) {
              // the back: the vent's slot under the hinge, its fins
              float inV = step(abs(lp.x), 112.0) * step(${f(L.foot + 3.0)}, lp.y) * step(lp.y, ${f(L.foot + 4.4)});
              float fin = 1.0 - smoothstep(0.14, 0.22, abs(fract(lp.x / 1.6 + 0.5) - 0.5) * 1.6);
              lapCol = mix(lapCol, mix(vec3(0.01), lapCol * 0.55, fin), inV);
              lapRough = mix(lapRough, 0.8, inV);
              lapBead *= 1.0 - inV;
            }
          }
        }
        if (isWell > 0.5) {
          float dW = lapBox(lp.xz - vec2(0.0, ${f((WELL.z0 + WELL.z1) / 2)}), vec2(${f(WELL.hw)}, ${f((WELL.z1 - WELL.z0) / 2)}), ${f(WELL.r)});
          if (lp.y < ${f(TOP - WELL.depth + 0.02)}) {
            // the well's floor: black anodised, in the keys' shade and along its walls
            lapCol = vec3(0.021, 0.021, 0.022);
            lapMetal = 0.3;
            lapRough = 0.55;
            lapBead = 0.5;
            float shade = wear.b;
            lapAo *= (0.3 + 0.7 * shade) * (0.55 + 0.45 * smoothstep(0.0, 2.4, -dW));
            // (the backlight leaking out under the keys' edges)
            lapEmit += uBacklightA * vec3(1.0, 0.86, 0.68) * 0.05 * (1.0 - shade) * shade * 4.0;
          } else {
            // its wall: the deck's machined edge, darker deep down
            lapAo *= 0.5 + 0.5 * smoothstep(${f(TOP - WELL.depth)}, ${f(TOP - 0.2)}, lp.y);
          }
        }
        if (isLid > 0.5 && isCham < 0.5) {
          if (ln.y > 0.9) {
            // the lid's back: two stickers (read from behind the open lid), a thumb's smudge where
            // it is opened
            vec2 la = -(lp.xz - vec2(${f(sa.x)}, ${f(sa.s)}));
            vec2 lb = -(lp.xz - vec2(${f(sb.x)}, ${f(sb.s)}));
            lb = vec2(${f(Math.cos(sb.r))} * lb.x - ${f(Math.sin(sb.r))} * lb.y, ${f(Math.sin(sb.r))} * lb.x + ${f(Math.cos(sb.r))} * lb.y);
            bool useA = dot(la, la) < dot(lb, lb);
            vec2 sp = (useA ? la : lb) * ${f(STICKERS.pxmm)};
            vec4 stk = texture2D(tSticker, (vec2(useA ? 128.0 : 384.0, 128.0) + sp) / vec2(512.0, 256.0));
            float sAlpha = stk.a * step(abs(sp.x), 127.0) * step(abs(sp.y), 127.0);
            lapCol = mix(lapCol, stk.rgb, sAlpha);
            lapMetal = mix(lapMetal, 0.0, sAlpha);
            lapRough = mix(lapRough, 0.36, sAlpha);
            lapBead *= 1.0 - sAlpha;
            float thumbS = exp(-pow(lp.x / 18.0, 2.0) - pow((lp.z - ${f(LID.s1 - 6)}) / 7.0, 2.0));
            lapRough -= 0.12 * thumbS;
          }
          // (its hinge end, by the barrel: in shade)
          lapAo *= 1.0 - 0.35 * exp(-max(lp.z - ${f(LID.s0)}, 0.0) / 2.0) * step(ln.y, 0.5);
        }
        if (isClutch > 0.5) {
          // the clutch: dark, its seams where the hinges' parts meet, its ends polished
          lapCol = vec3(0.03, 0.03, 0.032);
          lapMetal = 0.6;
          lapRough = 0.34;
          lapBead = 0.2;
          lapCol *= 1.0 - 0.7 * lapLine(abs(lp.x) - ${f(H.half - 22)}, 0.07);
          float endR = smoothstep(${f(H.half - 0.9)}, ${f(H.half - 0.6)}, abs(lp.x));
          lapCol = mix(lapCol, vec3(0.3, 0.295, 0.285), endR);
          lapMetal = mix(lapMetal, 1.0, endR);
          lapRough = mix(lapRough, 0.18, endR);
          lapAo *= 0.45 + 0.55 * smoothstep(${f(TOP - 0.5)}, ${f(TOP + 2)}, lp.y);
        }
        if (isFoot > 0.5) {
          lapCol = vec3(0.016);
          lapMetal = 0.0;
          lapRough = 0.85;
          lapBead = 0.0;
        }
        if (isCham > 0.5) {
          // the chamfers: cut bright through the anodising and polished
          lapCol = vec3(0.3, 0.29, 0.275) * (0.96 + 0.08 * wear.a);
          lapMetal = 1.0;
          lapRough = 0.14;
          lapBead = 0.0;
        }
        diffuseColor.rgb = lapCol * lapAo;`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(lapRough, 0.06, 1.0);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = lapMetal;')
      .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * lapBead;'))
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += (lapEmit + lapLit * lapCol) * uGlowA;')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectSpecular *= lapAo;')
  }
  alu.customProgramCacheKey = () => 'laptop.alu'
  // (closed parts cast their shadows from their back faces: no acne on grazing edges)
  alu.shadowSide = THREE.BackSide

  // ---- the keys: one instanced mesh; each key's width, wear and print per instance
  const KD0 = KEY.d0
  const KW0 = KEY.w0
  const keyMat = new THREE.MeshStandardMaterial({ name: 'laptop.keys', color: 0xffffff, roughness: 0.5, metalness: 0 })
  keyMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, { tLegend: { value: atlasTex } })
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        attribute vec4 aKey;
        attribute vec4 aLeg;
        attribute float aDip;
        varying vec2 vKP;
        varying vec4 vKey;
        varying vec4 vLeg;
        varying float vKY;
        varying float vKZ;
        varying vec3 vAxX;
        varying vec3 vAxZ;`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `vec3 transformed = vec3(position);
        // (stretched to its width and depth: its corners stay round)
        transformed.x += sign(position.x) * (aKey.x - ${f(KW0)}) * 0.5;
        transformed.z += sign(position.z) * (aKey.y - ${f(KD0)}) * 0.5;
        transformed.y -= aDip * ${f(KEY.travel)};
        vKP = transformed.xz;
        vKey = aKey;
        vLeg = aLeg;
        vKY = position.y;
        vKZ = instanceMatrix[3].z;
        vAxX = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));
        vAxZ = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));`,
      )
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec2 vKP;
        varying vec4 vKey;
        varying vec4 vLeg;
        varying float vKY;
        varying float vKZ;
        varying vec3 vAxX;
        varying vec3 vAxZ;
        uniform sampler2D tLegend;
        uniform vec3 uScreen;
        uniform float uGlowA;
        uniform float uBacklightA;`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        float kTop = step(-0.03, vKY);
        float kTouch = step(0.5, vKey.w);
        vec2 kHalf = vKey.xy * 0.5;
        // the print: the key's cell in the atlas
        vec2 lq = (vKP - vLeg.xy) / vec2(${f(ATLAS.mm[0])}, ${f(ATLAS.mm[1])}) + 0.5;
        float inCell = step(0.0, lq.x) * step(lq.x, 1.0) * step(0.0, lq.y) * step(lq.y, 1.0) * step(-0.5, vLeg.z);
        float ink = texture2D(tLegend, vLeg.zw + lq * vec2(${f(ATLAS.cw / ATLAS.w)}, ${f(ATLAS.ch / ATLAS.h)})).r * inCell * kTop;
        // worn: polished where the fingers land
        float worn = vKey.z * kTop * (1.0 - smoothstep(0.15, 0.8, length(vKP / max(kHalf, vec2(1.0)))));
        vec3 kCol = mix(vec3(0.017, 0.017, 0.018), vec3(0.72, 0.72, 0.7), ink);
        float kRough = mix(0.5, 0.36, worn);
        float kMetal = 0.0;
        // (Touch ID: glass, its ring polished metal)
        float tid = kTouch * kTop;
        kCol = mix(kCol, mix(vec3(0.01), vec3(0.32, 0.31, 0.3), ink), tid);
        kRough = mix(kRough, mix(0.1, 0.2, ink), tid);
        kMetal = mix(kMetal, ink, tid);
        // (deep at its foot, in its neighbours' shade)
        diffuseColor.rgb = kCol * (0.55 + 0.45 * smoothstep(${f(-KEY.h)}, ${f(-KEY.h + 0.8)}, vKY));`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = kRough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = kMetal;')
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        // the top's slight dish: its normal leans towards the key's middle
        vec2 kd = vKP / max(kHalf * kHalf, vec2(1.0)) * ${f(2 * 0.12)} * kTop * (1.0 - kTouch);
        normal = normalize(normal - kd.x * vAxX - kd.y * vAxZ);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        // the backlight through the legends (and from under the key); the display's light on the tops
        float kFall = 0.04 + 0.2 * exp(-(vKZ - ${f(SCR_Z)}) / 46.0);
        vec3 kBack = vec3(1.0, 0.88, 0.72) * (1.5 * ink * (1.0 - kTouch) + 0.06 * (1.0 - smoothstep(${f(-KEY.h)}, ${f(-KEY.h + 0.5)}, vKY)));
        totalEmissiveRadiance += (uBacklightA * kBack + uScreen * kFall * kTop * (0.03 + 0.4 * ink)) * uGlowA;`,
      )
  }
  keyMat.customProgramCacheKey = () => 'laptop.keys'

  // ---- the glass: the display, the bezel, the camera, the gasket round it
  const cs = (LID.s0 + LID.s1) / 2
  const glass = new THREE.MeshStandardMaterial({ name: 'laptop.glass', color: 0xffffff, roughness: 0.07, metalness: 0, emissive: 0xffffff, envMapIntensity: 1.4 })
  glass.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, D, { tWear: { value: wearTex } })
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = position;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vLP;
        uniform sampler2D tChrome;
        uniform sampler2D tPage;
        uniform sampler2D tWear;
        uniform float uScroll;
        uniform float uPageH;
        uniform vec4 uThumb;
        uniform vec4 uFlash;
        uniform float uFlashK;
        uniform float uBright;
        uniform float uGlowA;
        ${BOX}
        ${NEUTRAL_INV}`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        // ---- where on the face: the display (0..1 across, 0..1 down), the bezel round it
        vec2 dc = vec2((vLP.x - ${f(-L.w / 2 + DISP.x)}) / ${f(DISP.w)}, (${f(LID.s1 - DISP.y)} - vLP.z) / ${f(DISP.h)});
        float inD = step(0.0, dc.x) * step(dc.x, 1.0) * step(0.0, dc.y) * step(dc.y, 1.0);
        float dEdge = -lapBox(vec2(vLP.x, vLP.z - ${f(cs)}), vec2(${f(L.w / 2 - LID.rim)}, ${f(L.lidD / 2 - LID.rim)}), ${f(L.r - LID.rim)});
        float gasket = 1.0 - smoothstep(0.8, 0.8 + max(fwidth(dEdge), 0.02), dEdge);
        float dCam = length(vec2(vLP.x - ${f(CAM.x)}, vLP.z - ${f(CAM.s)}));
        // smudges: prints and an oily film, rougher, a faint haze on the black
        vec4 gw = texture2D(tWear, vec2(0.08 + 0.84 * (vLP.x + 152.0) / 304.0, 0.12 + 0.76 * (vLP.z - ${f(LID.s0)}) / ${f(L.lidD)}));
        float smudge = clamp(0.8 * gw.g + 0.35 * gw.r, 0.0, 1.0);
        vec3 gCol = vec3(0.004) + 0.01 * smudge;
        // (the display's anti-glare coating: a lamp's highlight spread to a faint sheen, the room's
        // reflections soft; the bezel round it glossy black glass)
        float gRough = mix(0.06, 0.26, inD) + 0.14 * smudge;
        float gSpec = mix(0.8, 0.18, inD);
        // the camera: its lens, a ring of coating in it
        float lens = 1.0 - smoothstep(${f(CAM.r - 0.05)}, ${f(CAM.r + 0.05)}, dCam);
        gCol = mix(gCol, vec3(0.0015), lens);
        gCol = mix(gCol, vec3(0.02, 0.026, 0.06), (1.0 - smoothstep(0.05, 0.09, abs(dCam - 0.45))) * lens);
        gRough = mix(gRough, 0.05, lens);
        // the rubber gasket round its edge: matte
        gCol = mix(gCol, vec3(0.012), gasket);
        gRough = mix(gRough, 0.85, gasket);
        diffuseColor.rgb = gCol;`,
      )
      // (its reflections, fainter on the display's coating)
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.directSpecular *= gSpec;\nreflectedLight.indirectSpecular *= gSpec;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = gRough;')
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        // ---- the screen: the chrome's strip over the page's window (both fetched: smooth either side)
        vec2 sp = dc * vec2(${f(SCREEN.w)}, ${f(SCREEN.h)});
        vec4 cC = texture2D(tChrome, vec2(dc.x, sp.y / ${f((CHROME.texH * SCREEN.w) / CHROME.texW)}));
        vec4 cP = texture2D(tPage, vec2(dc.x, (sp.y - ${f(CHROME.h)} + uScroll) / ${f(PAGE.h)}));
        vec3 scr = sp.y < ${f(CHROME.h)} ? cC.rgb : cP.rgb;
        float vy = sp.y - ${f(CHROME.h)};
        // the scroll thumb, where the page is taller than its window
        float thumbH = max(48.0, ${f(VIEW_H * VIEW_H)} / max(uPageH, 1.0));
        float thumbY = uScroll / max(uPageH - ${f(VIEW_H)}, 1.0) * (${f(VIEW_H)} - thumbH);
        float tb = lapBox(vec2(sp.x - ${f(SCREEN.w - 7)}, vy - thumbY - thumbH * 0.5), vec2(3.0, thumbH * 0.5), 3.0);
        scr = mix(scr, uThumb.rgb, (1.0 - smoothstep(-0.7, 0.7, tb)) * step(0.0, vy) * step(${f(VIEW_H + 1)}, uPageH) * uThumb.a);
        // the main button, pressed
        vec2 pp = vec2(sp.x, vy + uScroll);
        float fb = lapBox(pp - uFlash.xy - uFlash.zw * 0.5, uFlash.zw * 0.5, uFlash.w * 0.5);
        scr = mix(scr, scr * 0.7 + 0.08, (1.0 - smoothstep(-0.7, 0.7, fb)) * step(0.0, vy) * uFlashK);
        // (the backlight: a touch dimmer towards the corners)
        vec2 cq = dc - 0.5;
        scr *= uBright * (1.0 - 0.18 * dot(cq, cq));
        totalEmissiveRadiance = lapNeutralInv(clamp(scr, 0.0, 0.99)) * inD * uGlowA;`,
      )
  }
  glass.customProgramCacheKey = () => 'laptop.glass'
  materials.push(alu, keyMat, glass)

  // ---- the parts
  const baseGeo = toGeometry(baseGeometry())
  const lidGeo = toGeometry(lidGeometry())
  const glassGeo = toGeometry(glassGeometry())
  const keyGeo = toGeometry(keyGeometry())
  geometries.push(baseGeo, lidGeo, glassGeo, keyGeo)
  const base = new THREE.Mesh(baseGeo, alu)
  base.name = 'laptop.base'
  base.castShadow = true
  // the keys: their sizes, prints and wear per instance; how far each is pressed
  const n = keys.length
  const aKey = new Float32Array(n * 4)
  const aLeg = new Float32Array(n * 4)
  const dip = new Float32Array(n)
  const m4 = new THREE.Matrix4()
  const keyMesh = new THREE.InstancedMesh(keyGeo, keyMat, n)
  keyMesh.name = 'laptop.keys'
  keys.forEach((k, i) => {
    aKey.set([k.w, k.d, k.wear, k.legend?.touchid ? 1 : 0], i * 4)
    const c = cells[i]
    aLeg.set(c ? [c.x, c.z, c.u, c.v] : [0, 0, -1, -1], i * 4)
    keyMesh.setMatrixAt(i, m4.makeTranslation(k.x, KEY.top, k.z))
  })
  keyGeo.setAttribute('aKey', new THREE.InstancedBufferAttribute(aKey, 4))
  keyGeo.setAttribute('aLeg', new THREE.InstancedBufferAttribute(aLeg, 4))
  const dipAttr = new THREE.InstancedBufferAttribute(dip, 1)
  dipAttr.setUsage(THREE.DynamicDrawUsage)
  keyGeo.setAttribute('aDip', dipAttr)
  keyMesh.instanceMatrix.needsUpdate = true
  // (stretched in its shader: the 1u key's bounds are not the keys')
  keyMesh.frustumCulled = false
  // the soft shadow under it, on the desk (unlit; not something to tap)
  const CM = 14
  const contactC = canvas(256, Math.round((256 * (L.d + 2 * CM)) / (L.w + 2 * CM)))
  drawContact(contactC.getContext('2d'), contactC.width, contactC.height, [L.w, L.d], CM, FEET)
  const contactTex = canvasTex(contactC, false)
  const contactGeo = new THREE.PlaneGeometry(L.w + 2 * CM, L.d + 2 * CM).rotateX(-Math.PI / 2)
  geometries.push(contactGeo)
  const contactMat = new THREE.MeshBasicMaterial({ name: 'laptop.contact', color: 0x000000, map: contactTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  const contact = new THREE.Mesh(contactGeo, contactMat)
  contact.name = 'laptop.contact'
  contact.position.y = 0.04
  contact.renderOrder = -1
  contact.raycast = () => {}
  // the lid: on the hinge's axis; its face the glass
  const lid = new THREE.Group()
  lid.name = 'laptop.lid'
  lid.position.set(0, H.y, H.z)
  const lidShell = new THREE.Mesh(lidGeo, alu)
  lidShell.name = 'laptop.lidShell'
  lidShell.castShadow = true
  const display = new THREE.Mesh(glassGeo, glass)
  display.name = 'laptop.display'
  lid.add(lidShell, display)
  group.add(base, keyMesh, contact, lid)

  // ---- the screen's content
  let tab = 0
  let tabs = []
  let page = { h: PAGE.h, button: null, glow: [0, 0, 0] }
  const thumbCol = new THREE.Color()
  function drawScreen() {
    const cg = chromeC.getContext('2d')
    cg.setTransform(CHROME.texW / SCREEN.w, 0, 0, CHROME.texW / SCREEN.w, 0, 0)
    tabs = drawChrome(cg, projects, tab, font)
    const pg = pageC.getContext('2d')
    pg.setTransform(PAGE.texW / PAGE.w, 0, 0, PAGE.texW / PAGE.w, 0, 0)
    page = drawPage(pg, projects[tab], font)
    chromeTex.needsUpdate = true
    pageTex.needsUpdate = true
    D.uPageH.value = page.h
    thumbCol.setRGB(page.thumb[0], page.thumb[1], page.thumb[2], THREE.SRGBColorSpace)
    D.uThumb.value.set(thumbCol.r, thumbCol.g, thumbCol.b, page.thumb[3])
    const b = page.button || [0, 0, 0, 0]
    D.uFlash.value.set(b[0], b[1], b[2], b[3])
    D.uFlashK.value = flashK = 0
    scrollY = scrollTo = fling = 0
    D.uScroll.value = 0
    lightUp()
  }
  /** The display's light on the keys and the deck: its page's light, its brightness, the lid's angle. */
  function lightUp() {
    const k = D.uBright.value * Math.max(0, Math.sin(Math.min(open, 1) * Math.PI * 0.5)) ** 2
    U.uScreen.value.setRGB(page.glow[0] * k, page.glow[1] * k, page.glow[2] * k)
  }

  // ---- what moves: the lid, the keys, the scroll, the button, the backlight
  let open = 1
  const lidAnim = { from: 1, to: 1, t: 1, dur: 0 }
  const placeLid = () => {
    lid.rotation.x = -open * L.open
    lid.updateMatrixWorld(true)
    // (the screen sleeps as the lid closes)
    D.uBright.value = 0.86 * THREE.MathUtils.smoothstep(open, 0.2, 0.7)
    lightUp()
  }
  const press = new Float32Array(n) // (how long a key is still held down, s)
  const vel = new Float32Array(n)
  const live = new Set()
  let scrollY = 0
  let scrollTo = 0
  let fling = 0
  let flashK = 0
  let back = 0
  let backTo = 0
  const maxScroll = () => Math.max(0, page.h - VIEW_H)
  const clampScroll = (y) => Math.min(maxScroll(), Math.max(0, y))
  function pressKey(i) {
    if (i < 0 || i >= n) return
    press[i] = 0.08
    live.add(i)
  }
  const tmpV = new THREE.Vector3()
  /** The key under a point of the deck (the base's frame), or -1. */
  function keyAt(x, z) {
    let best = -1
    let bd = 1.4 // (mm: a tap in a gap still finds its key)
    keys.forEach((k, i) => {
      const d = Math.max(Math.abs(x - k.x) - k.w / 2, Math.abs(z - k.z) - k.d / 2)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    return best
  }

  group.updateMatrixWorld(true)
  placeLid()
  drawScreen()

  const api = {
    group,
    meshes: [base, keyMesh, lidShell, display],
    /** The keys (one instanced mesh: a hit's instanceId is the key's index in keys). */
    keyMeshes: [keyMesh],
    keys,
    display,
    materials,
    get tab() {
      return tab
    },
    /** How far open the lid is (0 closed .. 1 at 110 degrees). */
    get open() {
      return open
    },
    /** The page's height and its scroll (px of the screen's 1440 x 936). */
    get page() {
      return { h: page.h, scroll: scrollY, max: maxScroll() }
    },
    /** The display's light on or off (and the backlight, and the light they cast). */
    glow(on) {
      U.uGlowA.value = on ? 1 : 0
    },
    /** The next project's tab (wrapping); returns its index. */
    nextTab() {
      tab = (tab + 1) % projects.length
      drawScreen()
      return tab
    },
    setTab(i) {
      i = ((i % projects.length) + projects.length) % projects.length
      if (i === tab) return
      tab = i
      drawScreen()
    },
    /**
     * A tap (a raycast hit on one of `meshes`): on a tab, that tab ('tab'); on the page's main
     * button, it is pressed ('button'); elsewhere on the page, the next tab ('page'); on a key (or
     * the deck under it), it dips ('key'). Anything else: null.
     */
    tapAt(hit) {
      if (!hit) return null
      if (hit.object === display) {
        if (!hit.uv) return null
        const u = hit.uv.x
        const v = 1 - hit.uv.y
        if (u < 0 || u > 1 || v < 0 || v > 1) return null
        const sx = u * SCREEN.w
        const sy = v * SCREEN.h
        if (sy < CHROME.h) {
          const i = tabs.findIndex((r) => sx >= r[0] && sx <= r[1] && sy >= r[2] && sy <= r[3])
          if (i < 0) return null
          api.setTab(i)
          return 'tab'
        }
        const b = page.button
        const py = sy - CHROME.h + scrollY
        if (b && sx >= b[0] && sx <= b[0] + b[2] && py >= b[1] && py <= b[1] + b[3]) {
          flashK = 1
          D.uFlashK.value = 1
          return 'button'
        }
        api.nextTab()
        return 'page'
      }
      if (hit.object === keyMesh && hit.instanceId != null) {
        pressKey(hit.instanceId)
        return 'key'
      }
      if (hit.object === base) {
        base.worldToLocal(tmpV.copy(hit.point))
        const i = keyAt(tmpV.x, tmpV.z)
        if (i < 0) return null
        pressKey(i)
        return 'key'
      }
      return null
    },
    /**
     * Scroll the page by dy (px of the screen's page, down positive; mode: a WheelEvent's deltaMode:
     * 0 pixels, 1 lines, 2 pages), eased there. For a drag over the display, dy is the hit's uv
     * moved times SCREEN.h (LAPTOP.screen.h), and fling(v) on release keeps it going.
     */
    scroll(dy, mode = 0) {
      const px = mode === 1 ? dy * 40 : mode === 2 ? dy * VIEW_H * 0.9 : dy
      fling = 0
      scrollTo = clampScroll(scrollTo + px)
    },
    /** Keep scrolling at v px/s, slowing (a flick's release). */
    fling(v) {
      fling = Math.max(-6000, Math.min(6000, v))
    },
    /** Open (1, 110 degrees) or close (0) the lid, eased. */
    setOpen(t) {
      t = Math.min(1, Math.max(0, t))
      lidAnim.from = open
      lidAnim.to = t
      lidAnim.t = 0
      lidAnim.dur = 0.25 + 0.9 * Math.abs(t - open)
    },
    /** The keyboard's backlight, 0 .. 1 (it fades there). */
    backlight(k) {
      backTo = Math.min(1, Math.max(0, k))
    },
    /** Advance what moves; true while anything still does. */
    update(dt) {
      let moving = false
      // the lid
      if (lidAnim.t < 1) {
        lidAnim.t = Math.min(1, lidAnim.t + dt / Math.max(lidAnim.dur, 1e-3))
        const e = lidAnim.t * lidAnim.t * lidAnim.t * (lidAnim.t * (lidAnim.t * 6 - 15) + 10)
        open = lidAnim.from + (lidAnim.to - lidAnim.from) * e
        placeLid()
        moving = true
      }
      // the keys: a spring each, pressed for a moment, a little bounce on the way back
      if (live.size) {
        const steps = Math.max(1, Math.ceil(dt / 0.004))
        const h = dt / steps
        for (const i of live) {
          for (let s = 0; s < steps; s++) {
            const target = press[i] > 0 ? 1 : 0
            press[i] -= h
            const a = 3200 * (target - dip[i]) - 62 * vel[i]
            vel[i] += a * h
            dip[i] += vel[i] * h
          }
          dip[i] = Math.min(1.05, Math.max(-0.08, dip[i]))
          if (press[i] <= 0 && Math.abs(dip[i]) < 0.002 && Math.abs(vel[i]) < 0.05) {
            dip[i] = vel[i] = 0
            live.delete(i)
          }
        }
        dipAttr.needsUpdate = true
        moving = true
      }
      // the scroll: eased to where it is going; a flick's speed fading
      if (fling) {
        scrollTo = clampScroll(scrollTo + fling * dt)
        fling *= Math.exp(-dt / 0.32)
        if (Math.abs(fling) < 8 || scrollTo === 0 || scrollTo === maxScroll()) fling = 0
      }
      if (scrollY !== scrollTo) {
        scrollY += (scrollTo - scrollY) * (1 - Math.exp(-dt / 0.085))
        if (Math.abs(scrollTo - scrollY) < 0.2) scrollY = scrollTo
        D.uScroll.value = scrollY
        moving = true
      }
      // the button, let go
      if (flashK > 0) {
        flashK = Math.max(0, flashK - dt / 0.32)
        D.uFlashK.value = flashK * flashK
        moving = true
      }
      // the backlight
      if (back !== backTo) {
        back += Math.sign(backTo - back) * Math.min(Math.abs(backTo - back), dt / 0.35)
        U.uBacklightA.value = back * back
        moving = true
      }
      return moving
    },
    /** The middle of the base (world). */
    center: (out) => out.set(0, TOP, 0).applyMatrix4(group.matrixWorld),
    /** The display's middle (world) and the way it faces (world): they follow the lid. */
    screenCenter: (out) => out.set(0, LID.face - 0.05, LID.s1 - DISP.y - DISP.h / 2).applyMatrix4(lid.matrixWorld),
    screenNormal: (out) => out.set(0, -1, 0).transformDirection(lid.matrixWorld),
    /** Its footprint on the desk, in its own frame: half width, half depth (mm), and the open lid's
     * reach behind the base. */
    footprint: { hw: L.w / 2, hd: L.d / 2, back: lidReach() + 1 },
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of [...materials, contactMat]) m.dispose()
      for (const t of textures) t.dispose()
      keyMesh.dispose()
    },
  }
  return api
}
