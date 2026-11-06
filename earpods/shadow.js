// Contact shadows: the scene seen from below the floor, every surface written as darkness that
// fades with its height above the floor, then blurred and laid on the floor. Whatever touches the
// floor gets a dark, tight shadow; whatever hangs above it a soft, faint one.
import * as THREE from 'three'

const BLUR = {
  uniforms: { map: { value: null }, texel: { value: new THREE.Vector2() } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D map;
    uniform vec2 texel;
    varying vec2 vUv;
    void main() {
      // 9 taps, gaussian weights
      vec4 s = texture2D(map, vUv) * 0.2270270270;
      s += texture2D(map, vUv + texel * 1.3846153846) * 0.3162162162;
      s += texture2D(map, vUv - texel * 1.3846153846) * 0.3162162162;
      s += texture2D(map, vUv + texel * 3.2307692308) * 0.0702702703;
      s += texture2D(map, vUv - texel * 3.2307692308) * 0.0702702703;
      gl_FragColor = s;
    }
  `,
}

export class ContactShadow {
  /**
   * @param size      floor area covered (cm, square, centred on `centre`)
   * @param height    how far above the floor anything still casts a contact shadow
   * @param res       render target size
   */
  constructor(renderer, { size = 32, height = 4.5, res = 512, centre = [0, 0], blur = 1.6, darkness = 1.25, opacity = 0.62 } = {}) {
    this.renderer = renderer
    this.blurAmount = blur
    const opts = { type: THREE.HalfFloatType }
    this.rt = new THREE.WebGLRenderTarget(res, res, opts)
    this.rtBlur = new THREE.WebGLRenderTarget(res, res, opts)
    this.rt.texture.generateMipmaps = this.rtBlur.texture.generateMipmaps = false

    // the floor plane that shows the result
    this.material = new THREE.MeshBasicMaterial({
      map: this.rt.texture,
      transparent: true,
      opacity,
      depthWrite: false,
      color: 0x000000,
    })
    // the texture's alpha is the shadow; its colour is black
    this.material.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D( map, vMapUv );
          diffuseColor = vec4( diffuseColor.rgb, diffuseColor.a * sampledDiffuseColor.a );
        #endif`,
      )
    }
    // laid so that its texture's up runs towards +z, as the camera below sees it; the negative
    // scale turns it to face upwards
    const geo = new THREE.PlaneGeometry(size, size).rotateX(Math.PI / 2)
    this.plane = new THREE.Mesh(geo, this.material)
    this.plane.scale.y = -1
    this.plane.position.set(centre[0], 0.002, centre[1])
    this.plane.renderOrder = -1
    // seen from below the floor there is nothing to see
    this.material.side = THREE.FrontSide

    // a camera on the floor looking straight up: what it sees is what shades the floor
    this.camera = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 0, height)
    this.camera.position.set(centre[0], 0, centre[1])
    this.camera.rotation.x = Math.PI / 2
    this.camera.updateMatrixWorld()

    // everything drawn as black, its opacity falling off with height
    // depth-tested, so each spot of floor takes the surface nearest to it
    this.depth = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide })
    this.depth.userData.darkness = { value: darkness }
    this.depth.onBeforeCompile = (sh) => {
      sh.uniforms.darkness = this.depth.userData.darkness
      sh.fragmentShader = /* glsl */ `uniform float darkness;\n${sh.fragmentShader.replace(
        'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
        // fade quadratically, so only what is close to the floor is really dark
        'float k = 1.0 - fragCoordZ; gl_FragColor = vec4( vec3( 0.0 ), k * k * darkness );',
      )}`
    }

    this.blurMat = new THREE.ShaderMaterial({ ...BLUR, uniforms: THREE.UniformsUtils.clone(BLUR.uniforms), depthTest: false, depthWrite: false })
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blurMat)
    this.quad.frustumCulled = false
    this.quadScene = new THREE.Scene()
    this.quadScene.add(this.quad)
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.res = res
  }

  set opacity(v) {
    this.material.opacity = v
  }

  blur(amount) {
    const r = this.renderer
    const m = this.blurMat
    m.uniforms.map.value = this.rt.texture
    m.uniforms.texel.value.set(amount / this.res, 0)
    r.setRenderTarget(this.rtBlur)
    r.render(this.quadScene, this.quadCam)
    m.uniforms.map.value = this.rtBlur.texture
    m.uniforms.texel.value.set(0, amount / this.res)
    r.setRenderTarget(this.rt)
    r.render(this.quadScene, this.quadCam)
  }

  /** Redraw the shadow from the scene as it is now (call before rendering the frame). */
  update(scene, hide = []) {
    const r = this.renderer
    const bg = scene.background
    scene.background = null
    this.plane.visible = false
    for (const o of hide) o.visible = false
    const clear = r.getClearAlpha()
    const cc = r.getClearColor(new THREE.Color())
    r.setClearColor(0x000000, 0)
    scene.overrideMaterial = this.depth
    r.setRenderTarget(this.rt)
    r.clear()
    r.render(scene, this.camera)
    scene.overrideMaterial = null
    // two blurs, the second wider: a tight core and a soft penumbra
    this.blur(this.blurAmount)
    this.blur(this.blurAmount * 0.5)
    r.setRenderTarget(null)
    r.setClearColor(cc, clear)
    this.plane.visible = true
    for (const o of hide) o.visible = true
    scene.background = bg
  }

  dispose() {
    this.rt.dispose()
    this.rtBlur.dispose()
    this.plane.geometry.dispose()
    this.material.dispose()
    this.depth.dispose()
    this.blurMat.dispose()
    this.quad.geometry.dispose()
  }
}
