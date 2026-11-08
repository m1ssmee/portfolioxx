// The frame, cached. While the camera is still only the smoke and the ember change, so the rest of
// the scene is drawn once into HDR targets (with its depth) and re-used:
//   static    the opaque scene without the ember's light and without the ember region
//   ember     the same scene lit only by the ember's light, at intensity 1 (light adds linearly in
//             HDR, so each frame is static + intensity(t) x ember: the flicker stays exact)
//   dof       both of those through the depth of field (it is linear in colour too)
// Each frame then restores static + I x ember (colour and depth) into the multisampled target,
// draws the ember region (coal, ash, tobacco, the last millimetres of paper) over it, refocuses
// only the region's box, draws the smoke at a reduced resolution, blooms only around the ember,
// and finishes in one composite pass (smoke, glow, tone mapping, grain).
// While the camera moves everything is drawn normally (no depth of field; SMAA after).
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

export function createFrame({ renderer, camera, Q, smokeScene, SU, setMode }) {
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
  // the cache (single-sampled: copied out of the live target after each bake)
  const cStat = withDepth(rt(16, 16, { ...HF }))
  const cEmb = rt(16, 16, { ...HF, depthBuffer: false })
  // (the depth of field's blurred frames: see shaders/dof.frag)
  const dStat = rt(16, 16, { ...HF, depthBuffer: false })
  const dEmb = rt(16, 16, { ...HF, depthBuffer: false })
  const dLive = rt(16, 16, { ...HF, depthBuffer: false })
  // (while the view moves, the whole frame's blur at half size: a quarter of the work, and its
  // softness at edges does not show in motion; still, the region's at full size)
  const dHalf = rt(8, 8, { ...HF, depthBuffer: false })
  // smoke, and its depth (for the soft fade and the depth-aware upsampling)
  const smoke = rt(16, 16, { ...HF, depthBuffer: false })
  const smokeZ = rt(16, 16, { ...HF, format: THREE.RedFormat, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter })
  // the composite before SMAA (only while moving)
  const ldr = rt(16, 16, { depthBuffer: false })

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
    smaa.setSize(W, H)
    smaaWarm = true
  })

  // ---- sizes
  let W = 16
  let H = 16
  let SW = 16
  let SH = 16
  function setSize(w, h) {
    W = w
    H = h
    SW = Math.max(1, Math.round(w * Q.smokeScale))
    SH = Math.max(1, Math.round(h * Q.smokeScale))
    for (const t of [live, cStat, cEmb, dStat, dEmb, dLive, ldr]) t.setSize(w, h)
    dHalf.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1))
    smoke.setSize(SW, SH)
    smokeZ.setSize(SW, SH)
    compMat.uniforms.uSmokeSize.value.set(SW, SH)
    compMat.uniforms.uAspect.value = w / h
    dofMat.uniforms.uTexel.value.set(1 / w, 1 / h)
    dofMat.uniforms.uMax.value = compMat.uniforms.uMaxC.value = 12 * (h / 1080)
    SU.uRes.value.set(SW, SH)
    SU.uPx.value = SH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
    bloom.setSize(Math.round(w * Q.bloomScale * 2), Math.round(h * Q.bloomScale * 2))
    smaa?.setSize(w, h)
    bloomBoxWas.fill(-1)
    smokeBoxWas.fill(-1)
    api.valid = false
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
  function renderBloom(box) {
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
    u.tDiffuse.value = live.texture
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
    renderer.setRenderTarget(out)
    renderer.clear(true, false, false)
    quad.render(renderer)
    for (const t of bloomTargets) t.scissorTest = false
  }

  // ---- smoke
  const smokeRect = new THREE.Vector4()
  const smokeBoxWas = new Float64Array(4).fill(-1)
  const smokeTargets = [smoke, smokeZ]
  function renderSmoke(box) {
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
    zMat.uniforms.tDepth.value = live.depthTexture
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
    /** The live frame's multisampling (the quality governor lowers it on a slow GPU). */
    setSamples(n) {
      if (live.samples === n) return
      live.dispose()
      live.samples = n
      api.valid = false
    },
    get smaaReady() {
      return !!smaa && !smaaWarm
    },
    targets,
    debugTargets: { live, cStat, cEmb, dStat, dEmb, dLive, smoke, smokeZ },
    live,
    setSize,
    /**
     * Bake the cache: `scene` drawn with only LAYER.STATIC, once with the ember's light off and
     * once with nothing but it (setMode: 'static' | 'ember' | 'region' | 'full' switches the
     * lighting and which part of the cigarette's paper is drawn); then both through the depth of
     * field.
     */
    bake(scene, focus, shadows) {
      const keep = camera.layers.mask
      renderer.setClearColor(0x000000, 1)
      if (shadows) {
        // (the shadow map is drawn inside a render, for the objects the camera sees: all of them)
        camera.layers.enable(LAYER.STATIC)
        camera.layers.enable(LAYER.REGION)
        setMode('full')
        renderer.shadowMap.needsUpdate = true
        renderer.setRenderTarget(live)
        renderer.clear()
        renderer.render(scene, camera)
      }
      camera.layers.set(LAYER.STATIC)
      setMode('static')
      renderer.setRenderTarget(live)
      renderer.clear()
      renderer.render(scene, camera)
      copyMat.uniforms.tColor.value = live.texture
      copyMat.uniforms.tDepth.value = live.depthTexture
      renderer.setRenderTarget(cStat)
      renderer.clear()
      draw(copyMat, cStat)
      setMode('ember')
      renderer.setRenderTarget(live)
      renderer.clear()
      renderer.render(scene, camera)
      quad.material = copyMat
      copyMat.uniforms.tColor.value = live.texture
      renderer.setRenderTarget(cEmb)
      quad.render(renderer)
      setMode('full')
      camera.layers.mask = keep
      {
        setDof(focus)
        dofMat.uniforms.tDepth.value = cStat.depthTexture
        dofMat.uniforms.tColor.value = cStat.texture
        draw(dofMat, dStat)
        dofMat.uniforms.tColor.value = cEmb.texture
        draw(dofMat, dEmb)
      }
      api.valid = true
    },
    /**
     * One frame. `still`: use the cache (region drawn over it); otherwise draw `scene` whole.
     * f: { still, scene, emberI, dofK, regionBox, emberBox, smokeBox, glow: {x, y, r, col}, focus }
     */
    render(f) {
      const scene = f.scene
      renderer.setClearColor(0x000000, 1)
      const keep = camera.layers.mask
      if (f.still && !f.truth) {
        restoreMat.uniforms.uI.value = f.emberI
        draw(restoreMat, live)
        const ac = renderer.autoClear
        renderer.autoClear = false
        camera.layers.set(LAYER.REGION)
        setMode('region')
        renderer.setRenderTarget(live)
        renderer.render(scene, camera)
        setMode('full')
        renderer.autoClear = ac
        camera.layers.mask = keep
      } else {
        camera.layers.enable(LAYER.STATIC)
        camera.layers.enable(LAYER.REGION)
        renderer.setRenderTarget(live)
        renderer.clear()
        renderer.render(scene, camera)
        camera.layers.mask = keep
      }
      // the depth of field: still, only in the region's box (the rest is in the cache); moving, over
      // the whole frame (the same blur either way: nothing pops as the view stops or starts)
      const dofK = f.dofK
      compMat.uniforms.uDofK.value = dofK
      if (dofK > 0) {
        setDof(f.focus)
        dofMat.uniforms.tColor.value = live.texture
        dofMat.uniforms.tDepth.value = live.depthTexture
        if (!f.still && !f.truth) {
          draw(dofMat, dHalf)
          compMat.uniforms.tDofLive.value = dHalf.texture
          compMat.uniforms.uBox.value.set(0, 0, 1, 1)
        } else {
          if (f.truth) px.set(0, 0, W, H)
          else rect(f.regionBox, W, H, dofMat.uniforms.uMax.value + 2, px)
          draw(dofMat, dLive, px)
          compMat.uniforms.tDofLive.value = dLive.texture
          compMat.uniforms.uBox.value.set(px.x / W, px.y / H, (px.x + px.z) / W, (px.y + px.w) / H)
        }
        compMat.uniforms.uI.value = f.emberI
      }
      // (the smoke and the ember's glow only where they can be, moving or still: over the whole
      // frame they were the dearest part of a moving one)
      renderSmoke(f.truth ? null : f.smokeBox)
      renderBloom(f.truth ? null : f.emberBox)
      // (f.shim: the heat shimmer, {x, y, k, r}; k 0 is none)
      if (f.shim) compMat.uniforms.uShim.value.set(f.shim.x, f.shim.y, f.shim.k, f.shim.r)
      else compMat.uniforms.uShim.value.z = 0
      compMat.uniforms.uT.value = f.time || 0
      compMat.uniforms.toneMappingExposure.value = renderer.toneMappingExposure
      if (!f.still && smaa && !smaaWarm) {
        draw(compMat, ldr)
        smaa.renderToScreen = true
        smaa.render(renderer, null, ldr)
      } else {
        if (smaaWarm && f.still) {
          // (every program the moving frames use, compiled now while nothing moves: the moving
          // path drawn once as it will be, the composite into SMAA's input and SMAA onto the
          // screen, then this still frame over it)
          draw(compMat, ldr)
          smaa.renderToScreen = true
          smaa.render(renderer, null, ldr)
          smaaWarm = false
        }
        draw(compMat, null)
      }
    },
    dispose() {
      for (const t of targets) t.dispose()
      for (const m of [copyMat, restoreMat, dofMat, zMat, compMat]) m.dispose()
      quad.dispose()
      bloom.dispose()
      smaa?.dispose()
      disposed = true
    },
  }
  return api
}
