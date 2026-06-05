import { useState, useEffect } from 'react'

/**
 * Like useState, but value is persisted in sessionStorage across navigations.
 * Scoped to the browser session — cleared when the window closes.
 */
export function useSessionState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state))
    } catch {
      // sessionStorage unavailable — degrade silently
    }
  }, [key, state])

  return [state, setState] as const
}
