import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rig } from '../rig'
import { room } from './room'
import { DISPLAY } from './fonts'
import { FLOOR, halfWidth, SWEEP_R, WALL } from './layout'

/** A photo-studio "sweep": the floor curves up into the wall with no visible seam. */
function sweepGeometry() {
  const W = 40
  const prof: [number, number][] = [
    [FLOOR, 8],
    [FLOOR, WALL + SWEEP_R],
  ]
  const segs = 32
  for (let i = 1; i <= segs; i++) {
    const th = (i / segs) * (Math.PI / 2)
    prof.push([FLOOR + SWEEP_R - SWEEP_R * Math.cos(th), WALL + SWEEP_R - SWEEP_R * Math.sin(th)])
  }
  prof.push([12, WALL])
  const pos: number[] = []
  const idx: number[] = []
  for (const [y, z] of prof) pos.push(-W / 2, y, z, W / 2, y, z)
  for (let i = 0; i < prof.length - 1; i++) {
    const a = i * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

const ZC = (WALL + SWEEP_R).toFixed(4)

function sweepMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: room.base },
      uA: { value: room.a },
      uB: { value: room.b },
      uTime: { value: 0 },
      uFocus: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase;
      uniform vec3 uA;
      uniform vec3 uB;
      uniform float uTime;
      uniform float uFocus;
      varying vec3 vW;
      float blob(vec2 p, vec2 c, vec2 r) {
        vec2 d = (p - c) / r;
        return exp(-dot(d, d));
      }
      void main() {
        // unroll the sweep: up the wall, then forwards across the floor
        vec2 q = vec2(vW.x, vW.y - max(vW.z - ${ZC}, 0.0));
        float t = uTime;
        vec3 col = uBase;
        float a = blob(q, vec2(-1.6 + 0.45 * sin(t * 0.071), 0.6 + 0.22 * sin(t * 0.053 + 1.3)), vec2(1.25, 0.95));
        float b = blob(q, vec2(1.7 + 0.4 * cos(t * 0.061), 0.15 + 0.28 * cos(t * 0.083)), vec2(1.35, 1.05));
        float c = blob(q, vec2(0.35 * sin(t * 0.043), 1.45 + 0.12 * sin(t * 0.09)), vec2(1.7, 0.65));
        col = mix(col, uA, a * 0.62);
        col = mix(col, uB, b * 0.58);
        col = mix(col, mix(uA, uB, 0.5), c * 0.32);
        // a soft pool of light behind the pod
        float s = blob(q, vec2(uFocus, 0.2), vec2(1.5, 1.25));
        col *= 0.82 + 0.28 * s;
        // the floor darkens towards the viewer, the wall towards the top
        col *= 1.0 - 0.2 * smoothstep(-0.3, 2.0, vW.z);
        col *= 1.0 - 0.14 * smoothstep(1.0, 3.2, vW.y);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  })
}

/** One line of giant type, tiled so it can scroll forever. */
function wordTexture(word: string) {
  const H = 512
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')!
  const font = `800 ${H * 0.82}px ${DISPLAY}`
  ctx.font = font
  const text = `${word}  ·  `
  const w = Math.ceil(ctx.measureText(text).width)
  c.width = w
  c.height = H
  ctx.font = font
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 0, H * 0.52)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.anisotropy = 8
  return { tex: t, aspect: w / H }
}

type Props = { d: number; aspect: number; focusX: number; word: string }

export function Backdrop({ d, aspect, focusX, word }: Props) {
  const geo = useMemo(() => sweepGeometry(), [])
  const mat = useMemo(() => sweepMaterial(), [])
  const shadow = useMemo(
    () =>
      new THREE.ShadowMaterial({
        color: '#2a2017',
        opacity: 0.34,
        transparent: true,
        depthWrite: false,
      }),
    [],
  )

  // two text layers so a new word can fade in over the old one
  const layers = useRef<{ mesh: THREE.Mesh | null; mat: THREE.MeshBasicMaterial; word: string; aspect: number }[]>([])
  if (!layers.current.length) {
    for (let i = 0; i < 2; i++)
      layers.current.push({
        mesh: null,
        mat: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 }),
        word: '',
        aspect: 1,
      })
  }
  const front = useRef(0)

  useEffect(() => {
    const L = layers.current
    const cur = L[front.current]
    if (cur.word === word) return
    const next = cur.word === '' ? cur : L[1 - front.current]
    const { tex, aspect: a } = wordTexture(word)
    next.mat.map?.dispose()
    next.mat.map = tex
    next.mat.needsUpdate = true
    next.word = word
    next.aspect = a
    front.current = L.indexOf(next)
  }, [word])

  const bandH = 0.78
  // wide enough to cover the view when the camera pans for the projects
  const bandW = halfWidth(d, aspect, WALL) * 2 * 1.15 + 3
  const tint = useMemo(() => new THREE.Color(), [])

  useFrame((state, dt) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uFocus.value += (focusX - mat.uniforms.uFocus.value) * 0.05
    shadow.color.copy(room.base).multiplyScalar(0.18)
    // the type is a shade of the wall: a little darker on light rooms, lighter on dark ones
    tint.copy(room.base).lerp(room.ink, 0.085)
    const speed = rig.reducedMotion ? 0 : 0.012
    layers.current.forEach((l, i) => {
      const target = i === front.current ? 1 : 0
      l.mat.opacity += (target - l.mat.opacity) * Math.min(1, dt * 2.5)
      l.mat.color.copy(tint)
      if (l.mat.map) {
        l.mat.map.repeat.x = bandW / bandH / l.aspect
        l.mat.map.offset.x += speed * dt * (i === 0 ? 1 : 1)
      }
      if (l.mesh) l.mesh.visible = l.mat.opacity > 0.003
    })
  })

  return (
    <group>
      <mesh geometry={geo} material={mat} />
      {layers.current.map((l, i) => (
        <mesh
          key={i}
          ref={(m) => {
            l.mesh = m
          }}
          material={l.mat}
          position={[0, 0.4, WALL + 0.004]}
          renderOrder={1}
        >
          <planeGeometry args={[bandW, bandH]} />
        </mesh>
      ))}
      {/* shadows land on this copy of the sweep, just in front of the type */}
      <mesh geometry={geo} material={shadow} position={[0, 0.008, 0.008]} receiveShadow renderOrder={2} />
    </group>
  )
}
