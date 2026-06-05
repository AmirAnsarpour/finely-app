import { useState, useEffect, useRef } from 'react'

const REDUCED = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Animates from the previous value to `target` using an ease-out cubic curve.
 * Returns the current animated value (a raw number — format it yourself).
 */
export function useCountUp(target: number, duration = 550): number {
  const [value, setValue] = useState(target)
  const prev = useRef(target)
  const raf  = useRef(0)

  useEffect(() => {
    if (REDUCED) { setValue(target); prev.current = target; return }

    const from  = prev.current
    const delta = target - from
    if (delta === 0) return

    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)   // ease-out cubic
      setValue(from + delta * eased)
      if (t < 1) { raf.current = requestAnimationFrame(tick) }
      else        { prev.current = target }
    }

    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return value
}
