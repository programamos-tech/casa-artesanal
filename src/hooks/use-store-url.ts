'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { StoresService } from '@/lib/stores-service'

/**
 * Hook para manejar la URL con el identificador de la tienda
 * Agrega el storeId a la URL como query parameter para identificar la tienda actual
 */
export function useStoreUrl() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [storeSlug, setStoreSlug] = useState<string | null>(null)
  const isUpdatingRef = useRef(false)
  const lastStoreIdRef = useRef<string | null>(null)

  useEffect(() => {
    const updateUrlWithStore = async () => {
      // No hacer nada en rutas públicas o si ya se está actualizando
      if (
        pathname === '/login' ||
        pathname.startsWith('/tienda') ||
        pathname.startsWith('/_next') ||
        isUpdatingRef.current
      ) {
        return
      }

      if (!user) {
        return
      }

      try {
        isUpdatingRef.current = true

        // Obtener información de la tienda
        let store
        if (user.storeId) {
          store = await StoresService.getStoreById(user.storeId)
        } else {
          store = await StoresService.getMainStore()
        }

        if (!store) {
          isUpdatingRef.current = false
          return
        }

        // Crear un slug amigable del nombre de la tienda
        const slug = store.name
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-') // Reemplazar espacios con guion
          .replace(/[^a-z0-9-]/g, '') // Eliminar caracteres especiales
          .replace(/-+/g, '-') // Reemplazar múltiples guiones consecutivos con uno solo
          .replace(/^-|-$/g, '') // Eliminar guiones al inicio y final
          .substring(0, 30) // Limitar longitud

        setStoreSlug(slug)

        // Obtener los parámetros actuales de la URL
        const currentUrl = new URL(window.location.href)
        const currentStore = currentUrl.searchParams.get('store')

        // Si la URL no tiene el storeId o es diferente, actualizarla
        // También actualizar si el storeId cambió
        if (currentStore !== slug || lastStoreIdRef.current !== user.storeId) {
          currentUrl.searchParams.set('store', slug)
          router.replace(currentUrl.pathname + currentUrl.search, { scroll: false })
          lastStoreIdRef.current = user.storeId || null
        }
      } catch (error) {
        console.error('Error updating URL with store:', error)
      } finally {
        isUpdatingRef.current = false
      }
    }

    // Pequeño delay para evitar actualizaciones múltiples
    const timeoutId = setTimeout(() => {
      updateUrlWithStore()
    }, 100)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId, pathname, user?.id]) // Usar user?.id para evitar re-ejecuciones si el objeto user cambia pero el ID es el mismo

  return { storeSlug }
}
