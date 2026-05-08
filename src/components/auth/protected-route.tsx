'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { canAccessAllStores } from '@/lib/store-helper'
import { Logo } from '@/components/ui/logo'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)

  // Marcar como montado para evitar errores de hidratación
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted && !isLoading) {
      // Si no hay usuario, redirigir a login
      if (!user) {
        router.push('/login')
        return
      }

      // Si es super admin y no está en /select-store, verificar si tiene tienda seleccionada
      if (canAccessAllStores(user) && pathname !== '/select-store') {
        // Verificar si tiene storeId en localStorage (puede ser undefined/null para tienda principal)
        const savedUser = typeof window !== 'undefined' ? localStorage.getItem('casa_artesanal_user') : null
        let hasSelectedStore = false
        
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser)
            // Si storeId existe en el objeto (incluso si es undefined/null), significa que ya seleccionó
            // undefined/null significa que seleccionó la tienda principal
            hasSelectedStore = 'storeId' in userData
          } catch (e) {
            // Si hay error parseando, asumir que no tiene
            hasSelectedStore = false
          }
        }
        
        // Si el usuario tiene storeId explícito (no undefined/null), también es válido
        if (user.storeId !== undefined && user.storeId !== null && user.storeId !== '') {
          hasSelectedStore = true
        }
        
        // Si el usuario tiene storeId como undefined/null explícitamente, verificar si viene de localStorage
        // (significa que ya seleccionó la tienda principal)
        if ((user.storeId === undefined || user.storeId === null) && savedUser) {
          try {
            const userData = JSON.parse(savedUser)
            if ('storeId' in userData) {
              hasSelectedStore = true
            }
          } catch (e) {
            // Ignorar error
          }
        }
        
        if (!hasSelectedStore) {
          router.push('/select-store')
          return
        }
      }
    }
  }, [user, isLoading, router, isMounted, pathname])

  // Durante el render inicial en el servidor, no mostrar nada
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="text-center">
          <div className="relative">
            <div className="animate-pulse">
              <div className="overflow-hidden rounded-full bg-[#0d0d0e] p-5 ring-1 ring-zinc-200 dark:ring-zinc-800">
                <Logo size="lg" showText={false} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="text-center">
          <div className="relative">
            <div className="animate-pulse">
              <div className="overflow-hidden rounded-full bg-[#0d0d0e] p-5 ring-1 ring-zinc-200 dark:ring-zinc-800">
                <Logo size="lg" showText={false} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
