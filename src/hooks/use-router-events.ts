'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function useRouterEvents() {
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    // Detectar recarga de página
    const handleBeforeUnload = () => {
      setIsLoading(true)
    }

    const handleLoad = () => {
      setIsLoading(false)
      setIsInitialLoad(false)
    }

    // Detectar navegación
    const handleStart = () => {
      setIsLoading(true)
    }

    // Eventos de recarga
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('load', handleLoad)

    // Eventos de navegación
    window.addEventListener('popstate', handleStart)

    // Detectar cambios de ruta de Next.js
    if (!isInitialLoad) {
      setIsLoading(true)
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 600)
      return () => clearTimeout(timer)
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('load', handleLoad)
      window.removeEventListener('popstate', handleStart)
    }
  }, [pathname, isInitialLoad])

  return isLoading
}
