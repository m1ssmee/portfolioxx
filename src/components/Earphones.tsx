import { useEffect, useRef } from 'react'
import { startEarphones } from '../earphones'

export function Earphones() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => startEarphones(ref.current!), [])
  return <canvas ref={ref} className="earphones" aria-hidden="true" />
}
