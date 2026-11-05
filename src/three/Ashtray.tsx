import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rig } from '../rig'
import { FLOOR } from './layout'
import { room } from './room'

const NOTCHES = [-0.55, -0.55 + (Math.PI * 2) / 3, -0.55 + (Math.PI * 4) / 3]

/** A heavy round glass ashtray, turned on a lathe, with three notches cut into the rim. */
function ashtrayGeometry() {
  const prof: [number, number][] = [
    [0, 0.0],
    [0.2, 0.0],
    [0.215, 0.006],
    [0.232, 0.05],
    [0.238, 0.07],
    [0.232, 0.077],
    [0.19, 0.078],
    [0.178, 0.068],
    [0.168, 0.05],
    [0.15, 0.036],
    [0.08, 0.03],
    [0, 0.029],
  ]
  const g = new THREE.LatheGeometry(
    prof.map(([r, y]) => new THREE.Vector2(r, y)),
    160,
  )
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const r = Math.hypot(x, z)
    if (y < 0.045 || r < 0.165) continue
    const a = Math.atan2(z, x)
    for (const n of NOTCHES) {
      let d = Math.abs(a - n)
      d = Math.min(d, Math.PI * 2 - d)
      if (d < 0.16) {
        const k = Math.cos((d / 0.16) * (Math.PI / 2)) ** 2
        p.setY(i, y - 0.028 * k * Math.min(1, (y - 0.045) / 0.025))
      }
    }
  }
  g.computeVertexNormals()
  return g
}

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Speckled tipping paper for the filter. */
function filterTexture() {
  return canvasTex(256, 128, (c) => {
    c.fillStyle = '#c98a4b'
    c.fillRect(0, 0, 256, 128)
    for (let i = 0; i < 1400; i++) {
      c.fillStyle = Math.random() < 0.5 ? 'rgba(120,70,30,0.5)' : 'rgba(240,200,150,0.5)'
      c.fillRect(Math.random() * 256, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2)
    }
  })
}

/** Soft, slightly broken-up puff for the smoke. */
function puffTexture() {
  return canvasTex(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.45, 'rgba(255,255,255,0.35)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g
    c.fillRect(0, 0, 128, 128)
    c.globalCompositeOperation = 'destination-out'
    for (let i = 0; i < 60; i++) {
      c.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`
      c.beginPath()
      c.arc(Math.random() * 128, Math.random() * 128, 4 + Math.random() * 14, 0, Math.PI * 2)
      c.fill()
    }
  })
}

const COUNT = 220

export function Ashtray({ position }: { position: [number, number, number] }) {
  const { camera, gl, size } = useThree()
  const geo = useMemo(() => ashtrayGeometry(), [])
  const mats = useMemo(
    () => ({
      glass: new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        transmission: 1,
        roughness: 0.04,
        thickness: 0.05,
        ior: 1.52,
        attenuationColor: '#cfe6e0',
        attenuationDistance: 0.32,
        specularIntensity: 1,
        envMapIntensity: 1.3,
      }),
      paper: new THREE.MeshStandardMaterial({ color: '#f3f1ec', roughness: 0.85 }),
      filter: new THREE.MeshStandardMaterial({ map: filterTexture(), roughness: 0.8 }),
      char: new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 1 }),
      ash: new THREE.MeshStandardMaterial({ color: '#8f8b85', roughness: 1 }),
      ashDark: new THREE.MeshStandardMaterial({ color: '#5f5b56', roughness: 1 }),
      ember: new THREE.MeshBasicMaterial({ color: '#ff6a1a', toneMapped: false }),
      hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      shadow: new THREE.MeshBasicMaterial({
        map: canvasTex(128, 128, (c) => {
          const g = c.createRadialGradient(64, 64, 10, 64, 64, 64)
          g.addColorStop(0, 'rgba(0,0,0,0.38)')
          g.addColorStop(1, 'rgba(0,0,0,0)')
          c.fillStyle = g
          c.fillRect(0, 0, 128, 128)
        }),
        transparent: true,
        depthWrite: false,
      }),
    }),
    [],
  )

  // the cigarette rests in the first notch, lit end over the bowl
  const notch = NOTCHES[0]
  const cig = useMemo(() => {
    const out = new THREE.Vector3(Math.cos(notch), 0, Math.sin(notch))
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), out.clone().negate())
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.07))
    return { q, pos: out.clone().multiplyScalar(0.36).setY(0.064) }
  }, [notch])

  // ---------------------------------------------------------------- smoke
  const smoke = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(COUNT * 3)
    const sz = new Float32Array(COUNT)
    const al = new Float32Array(COUNT)
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('size', new THREE.BufferAttribute(sz, 1).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('alpha', new THREE.BufferAttribute(al, 1).setUsage(THREE.DynamicDrawUsage))
    const m = new THREE.ShaderMaterial({
      uniforms: { map: { value: puffTexture() }, uScale: { value: 600 }, uColor: { value: new THREE.Color('#c9d0d8') } },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        uniform float uScale;
        void main() {
          vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float a = texture2D(map, gl_PointCoord).a * vAlpha;
          gl_FragColor = vec4(uColor, a);
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
    })
    const parts = Array.from({ length: COUNT }, () => ({ x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, age: 99, life: 1, seed: Math.random() * 100 }))
    return { g, m, pos, sz, al, parts, next: 0, acc: 0 }
  }, [])

  const tip = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const puffAt = useRef(-1e9)
  const ray = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const emberW = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20)
    const t = state.clock.elapsedTime
    const S = smoke
    // smoke reads as a shade of the room: a cool grey on light walls, pale on dark ones
    const lum = room.base.r * 0.3 + room.base.g * 0.59 + room.base.b * 0.11
    const pale = Math.min(1, Math.max(0, (0.3 - lum) / 0.2))
    S.m.uniforms.uColor.value.setRGB(0.3 + 0.5 * pale, 0.33 + 0.51 * pale, 0.38 + 0.52 * pale)
    S.m.uniforms.uScale.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360))
    const puff = Math.max(0, 1 - (performance.now() - puffAt.current) / 1400)
    // the ember breathes, and glows harder when someone takes a puff
    const flicker = 0.75 + 0.15 * Math.sin(t * 13) + 0.1 * Math.sin(t * 31 + 1.3) + puff * 1.2
    mats.ember.color.setRGB(1.6 * flicker, 0.45 * flicker, 0.1 * flicker)
    if (light.current) light.current.intensity = 0.05 * flicker
    if (tip.current) tip.current.getWorldPosition(emberW)

    // spawn: a thin steady stream, a cloud on a puff
    S.acc += dt * (34 + puff * 160)
    while (S.acc >= 1) {
      S.acc -= 1
      const p = S.parts[S.next]
      S.next = (S.next + 1) % COUNT
      p.x = emberW.x + (Math.random() - 0.5) * 0.004
      p.y = emberW.y + 0.008
      p.z = emberW.z + (Math.random() - 0.5) * 0.004
      p.vx = (Math.random() - 0.5) * 0.01
      p.vy = 0.05 + Math.random() * 0.02
      p.vz = (Math.random() - 0.5) * 0.01
      p.age = 0
      p.life = 3.2 + Math.random() * 1.6
      p.seed = Math.random() * 100
    }

    // the cursor pushes the smoke around
    const hasPointer = rig.pointer.cx >= 0
    if (hasPointer) {
      const r = gl.domElement.getBoundingClientRect()
      ndc.set(((rig.pointer.cx - r.left) / r.width) * 2 - 1, -((rig.pointer.cy - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
    }
    const o = ray.ray.origin
    const d = ray.ray.direction
    S.parts.forEach((p, i) => {
      p.age += dt
      if (p.age >= p.life) {
        // gone (and k stays below 1 below: a negative base under ** would be NaN, and one NaN
        // pixel spreads through the bloom and blanks the whole frame)
        S.al[i] = 0
        S.pos[i * 3 + 1] = -10
        return
      }
      const k = p.age / p.life
      // buoyancy, then curl as it slows down
      p.vy += dt * 0.05 * (1 - k)
      const sw = 0.06 + k * 0.25
      p.vx += Math.sin(t * 1.3 + p.seed + p.y * 9) * sw * dt
      p.vz += Math.cos(t * 1.1 + p.seed * 1.7 + p.y * 7) * sw * dt
      p.vx *= 0.985
      p.vy *= 0.992
      p.vz *= 0.985
      if (hasPointer) {
        const ox = p.x - o.x
        const oy = p.y - o.y
        const oz = p.z - o.z
        const along = ox * d.x + oy * d.y + oz * d.z
        const cx = ox - d.x * along
        const cy = oy - d.y * along
        const cz = oz - d.z * along
        const dist = Math.hypot(cx, cy, cz)
        if (dist < 0.16 && dist > 1e-4) {
          const f = ((0.16 - dist) / 0.16) * 1.6 * dt
          p.vx += (cx / dist) * f + d.z * f * 0.6
          p.vy += (cy / dist) * f * 0.5
          p.vz += (cz / dist) * f - d.x * f * 0.6
        }
      }
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      S.pos[i * 3] = p.x
      S.pos[i * 3 + 1] = p.y
      S.pos[i * 3 + 2] = p.z
      // a thin thread near the ember that widens and thins out as it climbs
      S.sz[i] = 0.008 + k * 0.17
      S.al[i] = Math.min(1, k * 10) * Math.pow(1 - k, 1.6) * 0.42
    })
    S.g.attributes.position.needsUpdate = true
    S.g.attributes.size.needsUpdate = true
    S.g.attributes.alpha.needsUpdate = true
  })

  const L = 0.6 // cigarette length
  const R = 0.0165

  return (
    <group>
      <group position={position}>
        <mesh geometry={geo} material={mats.glass} />
        <mesh material={mats.shadow} rotation-x={-Math.PI / 2} position-y={0.001} scale={[0.62, 0.62, 1]}>
          <planeGeometry />
        </mesh>
        {/* ash and an old butt in the bowl */}
        {[
          [0.03, 0.06, 0.05, 0.6],
          [-0.05, 0.02, 0.04, 0.5],
          [0.01, -0.06, 0.035, 0.45],
          [-0.02, -0.01, 0.03, 0.4],
        ].map(([x, z, s, h], i) => (
          <mesh key={i} position={[x, 0.034, z]} scale={[s, s * h * 0.5, s * 0.9]} material={i % 2 ? mats.ashDark : mats.ash}>
            <sphereGeometry args={[1, 12, 8]} />
          </mesh>
        ))}
        <group position={[-0.07, 0.045, -0.03]} rotation={[0.1, 0.9, Math.PI / 2 - 0.05]}>
          <mesh material={mats.filter} castShadow>
            <cylinderGeometry args={[R, R, 0.15, 20]} />
          </mesh>
          <mesh position-y={0.1} material={mats.paper} scale={[1, 1, 0.75]}>
            <cylinderGeometry args={[R * 0.95, R, 0.05, 16]} />
          </mesh>
          <mesh position-y={0.128} material={mats.char} scale={[1, 1, 0.7]}>
            <cylinderGeometry args={[R * 0.8, R * 0.95, 0.008, 16]} />
          </mesh>
        </group>

        {/* the lit cigarette, resting in a notch */}
        <group position={cig.pos} quaternion={cig.q}>
          <group rotation-z={-Math.PI / 2}>
            {/* along +y after this: filter at the bottom, lit end at the top */}
            <mesh position-y={-L / 2 + 0.085} material={mats.filter} castShadow>
              <cylinderGeometry args={[R, R, 0.17, 24]} />
            </mesh>
            <mesh position-y={-L / 2 + 0.17 + 0.16} material={mats.paper} castShadow>
              <cylinderGeometry args={[R, R, 0.32, 24]} />
            </mesh>
            <mesh position-y={-L / 2 + 0.49 + 0.006} material={mats.char}>
              <cylinderGeometry args={[R * 0.97, R, 0.012, 24]} />
            </mesh>
            <mesh position-y={-L / 2 + 0.504} material={mats.ember}>
              <cylinderGeometry args={[R * 0.93, R * 0.97, 0.006, 24]} />
            </mesh>
            <mesh position-y={-L / 2 + 0.545} material={mats.ash} castShadow>
              <cylinderGeometry args={[R * 0.82, R * 0.92, 0.075, 14]} />
            </mesh>
            <group ref={tip} position-y={-L / 2 + 0.585} />
            <pointLight ref={light} position-y={-L / 2 + 0.51} color="#ff7a2a" intensity={0.05} distance={0.8} decay={2} />
            <mesh
              position-y={-L / 2 + 0.3}
              material={mats.hit}
              onClick={(e) => {
                e.stopPropagation()
                puffAt.current = performance.now()
              }}
              onPointerOver={() => (document.body.style.cursor = 'pointer')}
              onPointerOut={() => (document.body.style.cursor = '')}
            >
              <cylinderGeometry args={[0.04, 0.04, L, 8]} />
            </mesh>
          </group>
        </group>
      </group>
      <points geometry={smoke.g} material={smoke.m} frustumCulled={false} renderOrder={5} />
    </group>
  )
}

export const ASHTRAY_Y = FLOOR + 0.002
