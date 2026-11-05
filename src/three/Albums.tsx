import { RoundedBox } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { projects } from '../content'
import { rig } from '../rig'
import { cover } from './art'
import { roundedPlane } from './Pod'

const SIZE = 0.62

type Props = {
  show: boolean // projects are being browsed on a wide screen
  focus: number | null
  x: number
  onPick: (i: number) => void
}

/** The projects as album covers on an arc. The wheel spins them; the one in front is the one selected. */
export function Albums({ show, focus, x, onPick }: Props) {
  const textures = useMemo(
    () =>
      projects.map((_, i) => {
        const t = new THREE.CanvasTexture(cover(i))
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 8
        return t
      }),
    [],
  )
  const art = useMemo(() => roundedPlane(SIZE - 0.02, SIZE - 0.02, 0.018), [])
  const shell = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: '#f5f4f1', roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 }),
    [],
  )
  const faces = useMemo(
    () =>
      textures.map(
        (map) => new THREE.MeshPhysicalMaterial({ map, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.06 }),
      ),
    [textures],
  )
  const refs = useRef<(THREE.Group | null)[]>([])
  const hover = useRef(-1)
  const sel = useRef(focus ?? 0)
  const shown = useRef(0)
  const live = useRef({ show, focus, x })
  live.current = { show, focus, x }

  useFrame((state, dt) => {
    const L = live.current
    const t = state.clock.elapsedTime
    const ease = 1 - Math.pow(0.0008, dt) // ~ 0.11 per frame at 60 fps
    if (L.focus !== null) sel.current += (L.focus - sel.current) * ease
    shown.current += ((L.show ? 1 : 0) - shown.current) * (1 - Math.pow(0.004, dt))
    const vis = shown.current
    projects.forEach((_, i) => {
      const g = refs.current[i]
      if (!g) return
      const slot = i - sel.current
      const a = slot * 0.5
      const R = 0.95
      const front = Math.max(0, 1 - Math.abs(slot))
      const tx = L.x + Math.sin(a) * R * 0.9 + (1 - vis) * 1.6
      const ty = 0.2 + (rig.reducedMotion ? 0 : Math.sin(t * 0.8 + i) * 0.008) - (1 - vis) * 0.3 + front * 0.02
      const tz = (Math.cos(a) - 1) * R + (hover.current === i ? 0.05 : 0) - (1 - vis) * 0.6
      const s = Math.max(0.001, (1 - Math.min(Math.abs(slot), 2.6) * 0.15) * vis)
      g.position.x += (tx - g.position.x) * ease
      g.position.y += (ty - g.position.y) * ease
      g.position.z += (tz - g.position.z) * ease
      const ry = -a * 0.85 + (rig.pointer.x - 0.5) * 0.12 * front
      const rx = (rig.pointer.y - 0.5) * 0.08 * front
      g.rotation.y += (ry - g.rotation.y) * ease
      g.rotation.x += (rx - g.rotation.x) * ease
      g.scale.setScalar(g.scale.x + (s - g.scale.x) * ease)
      g.visible = g.scale.x > 0.01
    })
  }, -1)

  return (
    <group>
      {projects.map((p, k) => (
        <group
          key={p.slug}
          ref={(el) => {
            refs.current[k] = el
          }}
          scale={0.001}
          position={[x + 1.6, -0.2, -0.6]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation()
            onPick(k)
          }}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation()
            hover.current = k
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            if (hover.current === k) hover.current = -1
            document.body.style.cursor = ''
          }}
        >
          <RoundedBox args={[SIZE, SIZE, 0.022]} radius={0.012} smoothness={4} material={shell} castShadow receiveShadow />
          <mesh geometry={art} material={faces[k]} position-z={0.0115} />
        </group>
      ))}
    </group>
  )
}
