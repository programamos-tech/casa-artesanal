'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Bloquea una acción desde el primer clic hasta que termina.
 * El ref corta clics repetidos antes de que React re-renderice el botón deshabilitado.
 */
export function useSubmitLock() {
  const lockedRef = useRef(false)
  const [locked, setLocked] = useState(false)

  const run = useCallback(async <T,>(fn: () => Promise<T> | T): Promise<T | undefined> => {
    if (lockedRef.current) return undefined
    lockedRef.current = true
    setLocked(true)
    try {
      return await fn()
    } finally {
      lockedRef.current = false
      setLocked(false)
    }
  }, [])

  return { locked, run }
}
