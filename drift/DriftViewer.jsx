'use client'
// React / Next.js wrapper for the Drift Wired viewer: mounts it in an effect, destroys it on
// unmount (route changes leave nothing behind). Copy drift-viewer.js, drift-worker.js and the
// drift-*.js chunks next to this file's import path (or adjust the import below).
import { useEffect, useRef } from 'react'

export default function DriftViewer({ options, className, style, poster = '/drift/poster-wide.webp' }) {
  const ref = useRef(null)
  useEffect(() => {
    let viewer = null
    let cancelled = false
    const el = ref.current
    // load the viewer only when its box comes near the screen
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        io.disconnect()
        import(/* webpackIgnore: true */ '/drift/drift-viewer.js').then(({ createViewer }) => {
          if (!cancelled) viewer = createViewer(el, options)
        })
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => {
      cancelled = true
      io.disconnect()
      viewer?.destroy()
    }
  }, [])
  return (
    <div ref={ref} className={className} style={{ position: 'relative', overflow: 'hidden', ...style }}>
      <img src={poster} alt="Drift Wired in-ear headphones in graphite" style={{ position: 'absolute', left: '50%', top: 0, height: '100%', width: 'auto', maxWidth: 'none', transform: 'translateX(-50%)' }} />
    </div>
  )
}
