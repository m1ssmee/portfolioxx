// The frame, cached. While the camera is still only the smoke and the ember change, so the rest of
// the scene is drawn once into HDR targets (with its depth) and re-used:
//   static    the opaque scene without the ember's light and without the ember region
//   ember     the same scene lit only by the ember's light, at intensity 1 (light adds linearly in
//             HDR, so each frame is static + intensity(t) x ember: the flicker stays exact)
//   dof       both of those through the depth of field (it is linear in colour too)
// Each still frame then restores static + I x ember (colour and depth) into the live target, only
// where the scene itself changes (the cigarette's burning end, the glass), draws the ember region
// (coal, ash, tobacco, the last millimetres of paper) over it, refocuses only the region's box,
// draws the smoke at a reduced resolution, blooms only around the ember, and finishes in one
// composite pass over the box that changed (the scene, mixed there from the cache's two frames
// wherever the live target was not redrawn; smoke, glow, tone mapping, a still dither).
// While the camera moves everything is drawn whole, at a reduced size, SMAA after.
import * as THREE from 'three'
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { glsl } from './glsl.js'
import VS from '../shaders/fullscreen.vert'
import LINZ from '../shaders/linearDepth.glsl'
import copyFrag from '../shaders/copy.frag'
import restoreFrag from '../shaders/restore.frag'
import dofFrag from '../shaders/dof.frag'
import linearizeFrag from '../shaders/linearize.frag'
import compositeFrag from '../shaders/composite.frag'

export const LAYER = { STATIC: 0, REGION: 2 }

export function createFrame({ renderer, camera, Q, smokeScene, SU, setMode, onTarget, onMark }) {
  /** (debug) The stage of the frame that begins now, for the overlay's GPU timings. */
  const mark = (l) => onMark?.(l)
  /** The scene is about to be drawn into `t`: whoever reads the target's size (the ground shader) is told. */
  const sceneInto = (t) => {
    onTarget?.(t.width, t.height)
    renderer.setRenderTarget(t)
  }
  const quad = new FullScreenQuad(null)
  const targets = []
  const rt = (w, h, o) => {
    const t = new THREE.WebGLRenderTarget(w, h, o)
    targets.push(t)
    return t
  }
  const withDepth = (t) => {
    t.depthTexture = new THREE.DepthTexture(t.width, t.height)
    t.depthTexture.type = THREE.UnsignedIntType
    return t
  }
  const HF = { type: THREE.HalfFloatType }
  // the live frame (multisampled; resolved into a texture and a depth texture)
  const live = withDepth(rt(16, 16, { ...HF, samples: Q.msaa }))
  // the still frames' own target, single-sampled: a still frame restores and redraws only a small
  // box, and doing that in the multisampled target made the GPU resolve and store all 6.7 M pixels
  // of it, colour and depth, every frame (on Apple's GPUs about as dear as a whole frame)
  const liveStill = withDepth(rt(16, 16, { ...HF }))
  // the cache (single-sampled: copied out of the live target after each bake)
  const cStat = withDepth(rt(16, 16, { ...HF }))
  const cEmb = rt(16, 16, { ...HF, depthBuffer: false })
  // (the depth of field's blurred frames: see shaders/dof.frag)
  const dStat = rt(16, 16, { ...HF, depthBuffer: false })
  const dEmb = rt(16, 16, { ...HF, depthBuffer: false })
  const dLive = rt(16, 16, { ...HF, depthBuffer: false })
  // While the view moves, everything is drawn at a reduced size (moveScale) into these fixed
  // buffers and scaled up on screen by SMAA's last pass: motion hides the softness, a 2x canvas is
  // four times the pixels, and nothing is reallocated mid-gesture. The moment the view rests, the
  // full-size still frame returns.
  const liveLo = withDepth(rt(8, 8, { ...HF, samples: Q.msaa }))
  const ldrLo = rt(8, 8, { depthBuffer: false })
  const ldrLo2 = rt(8, 8, { depthBuffer: false }) // (SMAA's output, at the same size; one copy presents it)
  const dHalf = rt(8, 8, { ...HF, depthBuffer: false })
  // smoke, and its depth (for the soft fade and the depth-aware upsampling)
  const smoke = rt(16, 16, { ...HF, depthBuffer: false })
  const smokeZ = rt(16, 16, { ...HF, format: THREE.RedFormat, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter })
  // the finished still frame, kept between frames: each still frame redraws only the box that
  // changed (the smoke, the ember's flicker, the screen when its page moved) and copies it out —
  // an idle frame costs that box, not the screen
  const ldr = rt(16, 16, { depthBuffer: false })
  // (a pixel: three.js draws its shadow maps inside a render of the scene, whatever that render
  // is drawn into; when only the shadows are wanted, it is drawn into this)
  const pixel = rt(1, 1, {})

  // ---- materials
  const copyMat = new THREE.ShaderMaterial({
    uniforms: { tColor: { value: null }, tDepth: { value: null } },
    vertexShader: VS,
    fragmentShader: copyFrag,
    depthTest: true,
    depthWrite: true,
    depthFunc: THREE.AlwaysDepth,
  })
  const restoreMat = new THREE.ShaderMaterial({
    uniforms: { tStat: { value: cStat.texture }, tEmb: { value: cEmb.texture }, tDepth: { value: cStat.depthTexture }, uI: { value: 1 } },
    vertexShader: VS,
    fragmentShader: restoreFrag,
    depthTest: true,
    depthWrite: true,
    depthFunc: THREE.AlwaysDepth,
  })
  // the veil (a project open, the visitors' book): the frame blurred at an eighth of its size,
  // two separable passes twice over, mixed in by the present pass with a tint, less colour and a
  // soft hole round the player. (A CSS backdrop-filter over the canvas made the browser blur all
  // 6.7 M pixels itself, on every frame the scene behind it changed.)
  const veilA = rt(4, 4, { depthBuffer: false })
  const veilB = rt(4, 4, { depthBuffer: false })
  const veilBlurMat = new THREE.ShaderMaterial({
    uniforms: { tColor: { value: null }, uStep: { value: new THREE.Vector2() } },
    vertexShader: VS,
    fragmentShader: /* glsl */ `uniform sampler2D tColor; uniform vec2 uStep; varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tColor, vUv).rgb * 0.2270270270;
        c += (texture2D(tColor, vUv + uStep * 1.3846153846).rgb + texture2D(tColor, vUv - uStep * 1.3846153846).rgb) * 0.3162162162;
        c += (texture2D(tColor, vUv + uStep * 3.2307692308).rgb + texture2D(tColor, vUv - uStep * 3.2307692308).rgb) * 0.0702702703;
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  })
  // the frame onto the screen (the canvas must be painted whole every present), the veil over it
  const presentMat = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: null },
      tBlur: { value: veilB.texture },
      uVeil: { value: 0 },
      uHoleOn: { value: 0 },
      uHole: { value: new THREE.Vector4() }, // (uv: x0, y0, x1, y1)
      uHoleR: { value: 0 }, // (px)
      uFeather: { value: 30 }, // (px)
      uRes: { value: new THREE.Vector2(1, 1) },
      uTintA: { value: new THREE.Vector3(0.22, 0.5, 0.78) }, // (the tint's alpha at the left, 46% across, the right)
    },
    vertexShader: VS,
    fragmentShader: /* glsl */ `uniform sampler2D tColor; uniform sampler2D tBlur; uniform float uVeil; uniform float uHoleOn; uniform vec4 uHole; uniform float uHoleR; uniform float uFeather; uniform vec2 uRes; uniform vec3 uTintA; varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tColor, vUv);
        if (uVeil > 0.0) {
          // the frosted scene, dark glass: blurred, much of its colour drained, darker and flatter
          vec3 b = texture2D(tBlur, vUv).rgb;
          float l = dot(b, vec3(0.2126, 0.7152, 0.0722));
          b = mix(vec3(l), b, 0.5) * 0.62;
          b = (b - 0.5) * 0.8 + 0.5 - 0.1;
          // the glass's own tint, a warm charcoal, denser towards the right where the text is
          float t = vUv.x;
          float a = t < 0.46 ? mix(uTintA.x, uTintA.y, t / 0.46) : mix(uTintA.y, uTintA.z, (t - 0.46) / 0.54);
          b = mix(b, mix(vec3(0.095, 0.09, 0.085), vec3(0.075, 0.072, 0.068), t), a);
          // the hole round the player: a rounded rectangle, grown a little, its edge feathered
          float m = 1.0;
          if (uHoleOn > 0.5) {
            vec2 p = vUv * uRes;
            vec2 c0 = (uHole.xy + uHole.zw) * 0.5 * uRes;
            vec2 hs = (uHole.zw - uHole.xy) * 0.5 * uRes;
            float g = uFeather * 0.55;
            float r = uHoleR + g;
            vec2 q = abs(p - c0) - (hs + g - r);
            float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
            m = smoothstep(-uFeather * 0.5, uFeather * 0.5, d);
          }
          c.rgb = mix(c.rgb, b, uVeil * m);
        }
        gl_FragColor = c;
      }`,
    depthTest: false,
    depthWrite: false,
  })
  /** The frame `src` onto the screen, the veil (f.veil: { k, holeOn, hole, r, feather, tintA }) over it. */
  function present(src, f) {
    const v = f && f.veil
    const u = presentMat.uniforms
    if (v && v.k > 0) {
      const sx = 2 / veilA.width
      const sy = 2 / veilA.height
      for (let pass = 0; pass < 2; pass++) {
        veilBlurMat.uniforms.tColor.value = pass ? veilB.texture : src.texture
        veilBlurMat.uniforms.uStep.value.set(sx, 0)
        draw(veilBlurMat, veilA)
        veilBlurMat.uniforms.tColor.value = veilA.texture
        veilBlurMat.uniforms.uStep.value.set(0, sy)
        draw(veilBlurMat, veilB)
      }
      u.uVeil.value = v.k
      u.uHoleOn.value = v.holeOn ? 1 : 0
      u.uHole.value.copy(v.hole)
      u.uHoleR.value = v.r
      u.uFeather.value = v.feather
      u.uTintA.value.copy(v.tintA)
    } else u.uVeil.value = 0
    u.tColor.value = src.texture
    draw(presentMat, null)
  }
  // depth of field: a 100 mm lens at f/2.8 framing the same picture (stopped down for close-ups)
  const dofMat = new THREE.ShaderMaterial({
    uniforms: { tColor: { value: null }, tDepth: { value: null }, uFocus: { value: 200 }, uEq: { value: 600 }, uK: { value: 1 }, uNear: { value: camera.near }, uFar: { value: camera.far }, uTexel: { value: new THREE.Vector2() }, uMax: { value: 8 } },
    vertexShader: VS,
    fragmentShader: glsl(dofFrag, { linearDepth: LINZ }),
    depthTest: false,
    depthWrite: false,
  })
  // the depth the smoke sees, at its own resolution (linear, mm)
  const zMat = new THREE.ShaderMaterial({
    uniforms: { tDepth: { value: null }, uNear: { value: camera.near }, uFar: { value: camera.far } },
    vertexShader: VS,
    fragmentShader: glsl(linearizeFrag, { linearDepth: LINZ }),
    depthTest: false,
    depthWrite: false,
  })
  // bloom: UnrealBloomPass's own maths and targets, its bright pass also seeing the smoke (as the
  // whole-frame bloom did), each step clipped to where the ember's glow can reach
  // (in a bright scene a glow reads as a blob: the ember and the flame keep only a little)
  const bloom = new UnrealBloomPass(new THREE.Vector2(16, 16), 0.2, 0.18, 3.2)
  {
    const hp = bloom.materialHighPassFilter
    hp.uniforms.tSmoke = { value: smoke.texture }
    hp.fragmentShader = hp.fragmentShader.replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\nuniform sampler2D tSmoke;').replace('vec4 texel = texture2D( tDiffuse, vUv );', 'vec4 texel = texture2D( tDiffuse, vUv );\n\t\t\tfloat bloomMask = clamp( texel.a - 1.0, 0.0, 1.0 );\n\t\t\t{ vec4 s = texture2D( tSmoke, vUv ); texel.rgb = texel.rgb * ( 1.0 - s.a ) + s.rgb; }')
    // (only what the ember region marked, in the frame's alpha, may bloom: never a highlight)
    hp.fragmentShader = hp.fragmentShader.replace('float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );', 'float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v ) * bloomMask;')
    hp.needsUpdate = true
  }
  const compMat = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: live.texture },
      tDepth: { value: live.depthTexture },
      tDofStat: { value: dStat.texture },
      tDofEmb: { value: dEmb.texture },
      tDofLive: { value: dLive.texture },
      uDofK: { value: 0 },
      uFocus: { value: 200 },
      uEq: { value: 600 },
      uK: { value: 1 },
      uMaxC: { value: 8 },
      uBox: { value: new THREE.Vector4(2, 2, -1, -1) },
      uI: { value: 1 },
      tSmoke: { value: smoke.texture },
      tSmokeZ: { value: smokeZ.texture },
      uSmokeSize: { value: new THREE.Vector2(1, 1) },
      tBloom: { value: bloom.renderTargetsHorizontal[0].texture },
      uBloomBox: { value: new THREE.Vector4(0, 0, 1, 1) }, // (uv: where the bloom's frame is not black)
      // (a still frame: outside these two boxes, the scene is the cache's two frames, mixed here)
      tStat: { value: cStat.texture },
      tEmb: { value: cEmb.texture },
      uLiveA: { value: new THREE.Vector4(0, 0, 1, 1) },
      uLiveB: { value: new THREE.Vector4(2, 2, -1, -1) },
      uShim: { value: new THREE.Vector4(0, 0, 0, 0.1) },
      uT: { value: 0 },
      uAspect: { value: 1 },
      uNear: { value: camera.near },
      uFar: { value: camera.far },
      toneMappingExposure: { value: 1 },
    },
    vertexShader: VS,
    fragmentShader: glsl(compositeFrag, { linearDepth: LINZ }),
    depthTest: false,
    depthWrite: false,
    toneMapped: false, // (it tone-maps itself, once)
  })
  // SMAA (only while the camera moves): its own chunk, loaded after the first frame, compiled on
  // a still frame (never in the middle of a drag)
  let smaa = null
  let smaaWarm = false
  let disposed = false
  import('three/addons/postprocessing/SMAAPass.js').then(({ SMAAPass }) => {
    if (disposed) return
    smaa = new SMAAPass()
    smaa.setSize(LW, LH)
    smaaWarm = true
  })

  // ---- sizes
  let W = 16
  let H = 16
  let LW = 16
  let LH = 16
  let SW = 16
  let SH = 16
  let moveScale = 1
  let ldrValid = false
  let bakeStage = 0
  function setSize(w, h, ms = moveScale) {
    W = w
    H = h
    moveScale = ms
    LW = Math.max(1, Math.round(w * ms))
    LH = Math.max(1, Math.round(h * ms))
    SW = Math.max(1, Math.round(w * Q.smokeScale))
    SH = Math.max(1, Math.round(h * Q.smokeScale))
    for (const t of [live, liveStill, cStat, cEmb, dStat, dEmb, dLive, ldr]) t.setSize(w, h)
    liveLo.setSize(LW, LH)
    ldrLo.setSize(LW, LH)
    ldrLo2.setSize(LW, LH)
    veilA.setSize(Math.max(1, w >> 3), Math.max(1, h >> 3))
    veilB.setSize(Math.max(1, w >> 3), Math.max(1, h >> 3))
    presentMat.uniforms.uRes.value.set(w, h)
    dHalf.setSize(Math.max(1, LW >> 1), Math.max(1, LH >> 1))
    smoke.setSize(SW, SH)
    smokeZ.setSize(SW, SH)
    compMat.uniforms.uSmokeSize.value.set(SW, SH)
    compMat.uniforms.uAspect.value = w / h
    dofMat.uniforms.uTexel.value.set(1 / w, 1 / h)
    dofMat.uniforms.uMax.value = compMat.uniforms.uMaxC.value = 12 * (h / 1080)
    SU.uRes.value.set(SW, SH)
    SU.uPx.value = SH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
    bloom.setSize(Math.round(w * Q.bloomScale * 2), Math.round(h * Q.bloomScale * 2))
    smaa?.setSize(LW, LH)
    bloomBoxWas.fill(-1)
    smokeBoxWas.fill(-1)
    api.valid = false
    ldrValid = false
  }

  // ---- helpers
  function draw(mat, target, scissor) {
    quad.material = mat
    if (target) {
      target.scissorTest = !!scissor
      if (scissor) target.scissor.copy(scissor)
    }
    renderer.setRenderTarget(target)
    quad.render(renderer)
    if (target) target.scissorTest = false
  }
  const px = new THREE.Vector4()
  const pxD = new THREE.Vector4()
  const pxL = new THREE.Vector4()
  const boxI = new THREE.Vector4()
  /** The intersection of two uv boxes (x0, y0, x1, y1); may come out empty (x1 < x0). */
  const inter = (a, b, out) => out.set(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.min(a.z, b.z), Math.min(a.w, b.w))
  /** A box in UV (x0, y0, x1, y1) to a scissor rectangle in a target's pixels, grown by `grow` px. */
  function rect(box, tw, th, grow, out) {
    const x0 = Math.max(0, Math.floor(box.x * tw - grow))
    const y0 = Math.max(0, Math.floor(box.y * th - grow))
    const x1 = Math.min(tw, Math.ceil(box.z * tw + grow))
    const y1 = Math.min(th, Math.ceil(box.w * th + grow))
    return out.set(x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0))
  }
  function setDof(focus) {
    const u = dofMat.uniforms
    const Hs = 2 * focus.s * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    u.uFocus.value = focus.s
    u.uEq.value = 100 + (Hs * 100) / 24
    const N = 2.8 * Math.max(1, (focus.home / focus.s) ** 2)
    u.uK.value = (0.5 * (100 / N) * H) / Hs
    // (the composite needs the same circles: where they are small, it keeps the frame's own pixels)
    const c = compMat.uniforms
    c.uFocus.value = u.uFocus.value
    c.uEq.value = u.uEq.value
    c.uK.value = u.uK.value
  }

  // ---- bloom, clipped
  const bloomRect = new THREE.Vector4()
  // (the clip a pass's targets were last cleared for: x, y, z, w; NaN for the whole frame; -1 none
  // yet. Compared by value: no key strings built every frame)
  const sameClip = (was, box) => (box ? Math.abs(was[0] - box.x) < 5e-4 && Math.abs(was[1] - box.y) < 5e-4 && Math.abs(was[2] - box.z) < 5e-4 && Math.abs(was[3] - box.w) < 5e-4 : Number.isNaN(was[0]))
  function keepClip(was, box) {
    if (box) {
      was[0] = box.x
      was[1] = box.y
      was[2] = box.z
      was[3] = box.w
    } else was[0] = NaN
  }
  const bloomBoxWas = new Float64Array(4).fill(-1)
  const bloomTargets = [bloom.renderTargetBright, ...bloom.renderTargetsHorizontal, ...bloom.renderTargetsVertical]
  let bloomBox = null
  const bloomUv = compMat.uniforms.uBloomBox.value
  function bloomClip(t, grow) {
    if (!bloomBox) {
      t.scissorTest = false
      return
    }
    rect(bloomBox, t.width, t.height, grow, bloomRect)
    t.scissor.copy(bloomRect)
    t.scissorTest = true
  }
  const KERNELS = [6, 10, 14, 18, 22]
  function renderBloom(box, src) {
    bloomBox = box
    renderer.setClearColor(0x000000, 0)
    if (!sameClip(bloomBoxWas, box)) {
      // (whatever is outside the new clip must be black)
      for (const t of bloomTargets) {
        t.scissorTest = false
        renderer.setRenderTarget(t)
        renderer.clear(true, false, false)
      }
      keepClip(bloomBoxWas, box)
    }
    const clip = bloomClip
    const u = bloom.highPassUniforms
    u.tDiffuse.value = src
    u.luminosityThreshold.value = bloom.threshold
    quad.material = bloom.materialHighPassFilter
    clip(bloom.renderTargetBright, 2)
    renderer.setRenderTarget(bloom.renderTargetBright)
    renderer.clear(true, false, false)
    quad.render(renderer)
    let input = bloom.renderTargetBright
    let reach = 2 // (full-resolution pixels the glow has spread so far)
    for (let i = 0; i < bloom.nMips; i++) {
      const m = bloom.separableBlurMaterials[i]
      const t = bloom.renderTargetsHorizontal[i]
      reach += KERNELS[i] * (W / t.width)
      const grow = reach * (t.width / W) + 2
      quad.material = m
      m.uniforms.colorTexture.value = input.texture
      m.uniforms.direction.value = UnrealBloomPass.BlurDirectionX
      clip(t, grow)
      renderer.setRenderTarget(t)
      renderer.clear(true, false, false)
      quad.render(renderer)
      m.uniforms.colorTexture.value = t.texture
      m.uniforms.direction.value = UnrealBloomPass.BlurDirectionY
      const v = bloom.renderTargetsVertical[i]
      clip(v, grow)
      renderer.setRenderTarget(v)
      renderer.clear(true, false, false)
      quad.render(renderer)
      input = v
    }
    const cm = bloom.compositeMaterial
    cm.uniforms.bloomStrength.value = bloom.strength
    cm.uniforms.bloomRadius.value = bloom.radius
    cm.uniforms.bloomTintColors.value = bloom.bloomTintColors
    quad.material = cm
    const out = bloom.renderTargetsHorizontal[0]
    clip(out, reach * (out.width / W) + 2)
    // (the composite reads the bloom only where there is any: the clip, in the frame's own uv)
    if (box) bloomUv.set((bloomRect.x - 1) / out.width, (bloomRect.y - 1) / out.height, (bloomRect.x + bloomRect.z + 1) / out.width, (bloomRect.y + bloomRect.w + 1) / out.height)
    else bloomUv.set(0, 0, 1, 1)
    renderer.setRenderTarget(out)
    renderer.clear(true, false, false)
    quad.render(renderer)
    for (const t of bloomTargets) t.scissorTest = false
  }

  // ---- smoke
  const smokeRect = new THREE.Vector4()
  const smokeBoxWas = new Float64Array(4).fill(-1)
  const smokeTargets = [smoke, smokeZ]
  function renderSmoke(box, depthTex) {
    renderer.setClearColor(0x000000, 0)
    if (!sameClip(smokeBoxWas, box)) {
      for (const t of smokeTargets) {
        t.scissorTest = false
        renderer.setRenderTarget(t)
        renderer.clear(true, false, false)
      }
      keepClip(smokeBoxWas, box)
    }
    const sc = box ? rect(box, SW, SH, 2, smokeRect) : null
    zMat.uniforms.tDepth.value = depthTex
    draw(zMat, smokeZ, sc)
    SU.uDepthZ.value = smokeZ.texture
    smoke.scissorTest = !!sc
    if (sc) smoke.scissor.copy(sc)
    renderer.setRenderTarget(smoke)
    renderer.clear(true, false, false)
    renderer.render(smokeScene, camera)
    smoke.scissorTest = false
    renderer.setClearColor(0x000000, 1)
  }

  // ---- the frame
  const api = {
    valid: false, // (the cache matches the camera and the scene)
    /** SMAA loaded and its programs compiled (the loader waits for it: nothing compiles after entry). */
    /** The moving frames' multisampling (the quality governor lowers it on a slow GPU; the
     * cache's bakes keep theirs). */
    setSamples(n) {
      if (liveLo.samples === n) return
      liveLo.dispose()
      liveLo.samples = n
    },
    /** The moving frames' size, as a share of the canvas's. */
    get moveScale() {
      return moveScale
    },
    get moveSamples() {
      return liveLo.samples
    },
    get smaaReady() {
      return !!smaa && !smaaWarm
    },
    targets,
    debugTargets: { live, liveStill, liveLo, cStat, cEmb, dStat, dEmb, dLive, ldr, ldrLo, smoke, smokeZ },
    live,
    setSize,
    /**
     * Bake the cache: `scene` drawn with only LAYER.STATIC, once with the ember's light off and
     * once with nothing but it (setMode: 'static' | 'ember' | 'region' | 'full' switches the
     * lighting and which part of the cigarette's paper is drawn); then both through the depth of
     * field. A step a frame (the moving frames go on showing meanwhile): one scene pass or one
     * blur each, so no frame at the end of a gesture pays for them all at once. `shadows`: the
     * shadow maps drawn again first; `emberLit`: how far the ember's light reaches on the screen
     * (a uv box). Returns true when the cache is complete. Stopped (the view moving again), it
     * starts over.
     */
    bakeStep(scene, focus, shadows, emberLit) {
      const keep = camera.layers.mask
      renderer.setClearColor(0x000000, 1)
      mark('bake')
      const st = bakeStage
      if (st === 0) {
        if (shadows) {
          camera.layers.enable(LAYER.STATIC)
          camera.layers.enable(LAYER.REGION)
          setMode('full')
          renderer.shadowMap.needsUpdate = true
          // (the shadow maps are drawn on the way; the scene itself into a single pixel)
          sceneInto(pixel)
          renderer.clear()
          renderer.render(scene, camera)
          camera.layers.mask = keep
        }
        bakeStage = 1
        return false
      }
      if (st === 1) {
        camera.layers.set(LAYER.STATIC)
        setMode('static')
        sceneInto(live)
        renderer.clear()
        renderer.render(scene, camera)
        copyMat.uniforms.tColor.value = live.texture
        copyMat.uniforms.tDepth.value = live.depthTexture
        renderer.setRenderTarget(cStat)
        renderer.clear()
        draw(copyMat, cStat)
        setMode('full')
        camera.layers.mask = keep
        bakeStage = 2
        return false
      }
      if (st === 2) {
        // (the ember's light reaches only so far: `emberLit`, that reach on the screen (a uv box,
        // or nothing for the whole frame), is all that is drawn; the rest of its frame is black)
        const sc = emberLit ? rect(emberLit, W, H, 2, pxL) : null
        camera.layers.set(LAYER.STATIC)
        setMode('ember')
        live.scissorTest = !!sc
        if (sc) live.scissor.copy(sc)
        sceneInto(live)
        renderer.clear()
        renderer.render(scene, camera)
        live.scissorTest = false
        copyMat.uniforms.tColor.value = live.texture
        if (sc) {
          renderer.setRenderTarget(cEmb)
          renderer.clear()
        }
        // (cEmb has no depth: the copy's depth write goes nowhere)
        draw(copyMat, cEmb, sc)
        setMode('full')
        camera.layers.mask = keep
        bakeStage = 3
        return false
      }
      if (st === 3) {
        setDof(focus)
        dofMat.uniforms.tDepth.value = cStat.depthTexture
        dofMat.uniforms.tColor.value = cStat.texture
        draw(dofMat, dStat)
        bakeStage = 4
        return false
      }
      setDof(focus)
      dofMat.uniforms.tDepth.value = cStat.depthTexture
      dofMat.uniforms.tColor.value = cEmb.texture
      {
        // (the blur spreads the ember's light by its largest circle at most)
        const sc = emberLit ? rect(emberLit, W, H, dofMat.uniforms.uMax.value + 4, pxL) : null
        if (sc) {
          renderer.setRenderTarget(dEmb)
          renderer.clear()
        }
        draw(dofMat, dEmb, sc)
      }
      bakeStage = 0
      api.valid = true
      ldrValid = false
      return true
    },
    /** Stop a bake under way (the view moved): it starts over next time. */
    bakeReset() {
      bakeStage = 0
    },
    /**
     * One frame. `still`: use the cache (region drawn over it); otherwise draw `scene` whole.
     * f: { still, scene, emberI, dofK, regionBox, emberBox, smokeBox, glow: {x, y, r, col}, focus }
     */
    render(f) {
      const scene = f.scene
      renderer.setClearColor(0x000000, 1)
      const keep = camera.layers.mask
      const u = compMat.uniforms
      u.uDofK.value = f.dofK
      if (f.shim) u.uShim.value.set(f.shim.x, f.shim.y, f.shim.k, f.shim.r)
      else u.uShim.value.z = 0
      u.uT.value = f.time || 0
      u.toneMappingExposure.value = renderer.toneMappingExposure
      // truth (tests): everything drawn whole at full size, straight to the screen
      if (f.truth) {
        camera.layers.enable(LAYER.STATIC)
        camera.layers.enable(LAYER.REGION)
        sceneInto(live)
        renderer.clear()
        renderer.render(scene, camera)
        camera.layers.mask = keep
        mark('dof')
        if (f.dofK > 0) {
          setDof(f.focus)
          dofMat.uniforms.tColor.value = live.texture
          dofMat.uniforms.tDepth.value = live.depthTexture
          px.set(0, 0, W, H)
          draw(dofMat, dLive, px)
          u.tDofLive.value = dLive.texture
          u.uBox.value.set(0, 0, 1, 1)
          u.uI.value = f.emberI
        }
        u.uLiveA.value.set(0, 0, 1, 1)
        mark('smoke')
        renderSmoke(null, live.depthTexture)
        mark('bloom')
        renderBloom(null, live.texture)
        u.tScene.value = live.texture
        u.tDepth.value = live.depthTexture
        mark('comp')
        draw(compMat, null)
        return
      }
      if (f.still) {
        // two boxes bound what a still frame redraws (the kept frame, ldr, holds the rest):
        //   f.dirtyLive  where the scene itself changed (the coal, the burning paper, the screen
        //                when its page moved): restored, re-drawn, re-focused
        //   f.dirty      where the picture changes at all (that, plus the smoke and the flicker's
        //                glow, which the composite re-mixes linearly from the cache): composited
        // with no kept frame yet (just baked, just moved, resized), everything
        const dirty = ldrValid ? f.dirty : null
        const dirtyLive = ldrValid ? f.dirtyLive || f.dirty : null
        const dr = dirty ? rect(dirty, W, H, 24, pxD) : null
        if (dr && (dr.z === 0 || dr.w === 0)) {
          // (nothing on the screen changes this frame: present the kept frame)
          present(ldr, f)
          return
        }
        // (restored a little wider than it is redrawn: the depth of field round the region reads
        // that far, and what it reads must be this frame's)
        const drL = dirtyLive ? rect(dirtyLive, W, H, 2 * Math.ceil(dofMat.uniforms.uMax.value) + 8, pxL) : null
        const liveWork = !drL || (drL.z > 0 && drL.w > 0)
        if (liveWork) {
          restoreMat.uniforms.uI.value = f.emberI
          draw(restoreMat, liveStill, drL)
          const ac = renderer.autoClear
          renderer.autoClear = false
          camera.layers.set(LAYER.REGION)
          setMode('region')
          liveStill.scissorTest = !!drL
          if (drL) liveStill.scissor.copy(drL)
          sceneInto(liveStill)
          renderer.render(scene, camera)
          liveStill.scissorTest = false
          setMode('full')
          renderer.autoClear = ac
          camera.layers.mask = keep
        }
        mark('dof')
        if (f.dofK > 0) {
          if (liveWork) {
            setDof(f.focus)
            dofMat.uniforms.tColor.value = liveStill.texture
            dofMat.uniforms.tDepth.value = liveStill.depthTexture
            rect(dirtyLive ? inter(f.regionBox, dirtyLive, boxI) : f.regionBox, W, H, dofMat.uniforms.uMax.value + 2, px)
            draw(dofMat, dLive, px)
            u.tDofLive.value = dLive.texture
            u.uBox.value.set(px.x / W, px.y / H, (px.x + px.z) / W, (px.y + px.w) / H)
          }
        }
        // (the live target holds this frame's scene only where it was restored and redrawn: the
        // cigarette's burning end, and the glass. Everywhere else the composite mixes the cache's
        // two frames by the ember's glow itself, as the restore would have: nothing is copied
        // into the live target, each frame, just to be read back once)
        u.uI.value = f.emberI
        if (f.liveA) {
          rect(f.liveA, W, H, 4, px)
          u.uLiveA.value.set(px.x / W, px.y / H, (px.x + px.z) / W, (px.y + px.w) / H)
          rect(f.liveB, W, H, 2, px)
          u.uLiveB.value.set(px.x / W, px.y / H, (px.x + px.z) / W, (px.y + px.w) / H)
        } else {
          u.uLiveA.value.set(0, 0, 1, 1)
          u.uLiveB.value.set(2, 2, -1, -1)
        }
        mark('smoke')
        renderSmoke(f.smokeBox, liveStill.depthTexture)
        mark('bloom')
        renderBloom(f.emberBox, liveStill.texture)
        mark('comp')
        u.tScene.value = liveStill.texture
        u.tDepth.value = liveStill.depthTexture
        if (smaaWarm && smaa) {
          // (every program the moving frames use, compiled now while nothing moves; the still
          // frame is drawn over it all)
          draw(compMat, ldrLo)
          smaa.renderToScreen = false
          smaa.render(renderer, ldrLo2, ldrLo)
          smaaWarm = false
        }
        draw(compMat, ldr, dr)
        ldrValid = true
        api.lastStill = { dr, drL } // (debug: what this frame redrew)
        mark('present')
        present(ldr, f)
      } else {
        ldrValid = false
        camera.layers.enable(LAYER.STATIC)
        camera.layers.enable(LAYER.REGION)
        sceneInto(liveLo)
        renderer.clear()
        renderer.render(scene, camera)
        camera.layers.mask = keep
        mark('dof')
        if (f.dofK > 0) {
          setDof(f.focus)
          dofMat.uniforms.tColor.value = liveLo.texture
          dofMat.uniforms.tDepth.value = liveLo.depthTexture
          draw(dofMat, dHalf)
          u.tDofLive.value = dHalf.texture
          u.uBox.value.set(0, 0, 1, 1)
          u.uI.value = f.emberI
        }
        u.uLiveA.value.set(0, 0, 1, 1)
        mark('smoke')
        renderSmoke(f.smokeBox, liveLo.depthTexture)
        mark('bloom')
        renderBloom(f.emberBox, liveLo.texture)
        mark('comp')
        u.tScene.value = liveLo.texture
        u.tDepth.value = liveLo.depthTexture
        const veiled = f.veil && f.veil.k > 0
        if (smaa && !smaaWarm) {
          // (SMAA at the reduced size, its last pass drawn straight onto the canvas: it reads the
          // frame and its blend weights wherever a canvas pixel falls, so it scales the frame up
          // as it smooths it, and the canvas's own pixels are written once. Only under the veil,
          // which the present pass mixes in, does it go by way of a buffer and a copy)
          draw(compMat, ldrLo)
          mark('present')
          smaa.renderToScreen = !veiled
          smaa.render(renderer, ldrLo2, ldrLo)
          if (veiled) present(ldrLo2, f)
        } else {
          mark('present')
          draw(compMat, ldrLo2)
          present(ldrLo2, f)
        }
      }
    },
    dispose() {
      for (const t of targets) t.dispose()
      for (const m of [copyMat, restoreMat, presentMat, veilBlurMat, dofMat, zMat, compMat]) m.dispose()
      quad.dispose()
      bloom.dispose()
      smaa?.dispose()
      disposed = true
    },
  }
  return api
}
