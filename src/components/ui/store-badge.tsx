'use client'

import { useState, useEffect } from 'react'
import { Building2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { getCurrentUserStoreId, isMainStoreUser } from '@/lib/store-helper'
import { StoresService } from '@/lib/stores-service'
import { cn } from '@/lib/utils'
import { getMicroStoreBadgePalette } from '@/lib/micro-store-badge-theme'

interface StoreBadgeProps {
  className?: string
}

/** Tienda principal: mismo criterio que Facturas proveedor — verde muy sutil (fondo oscuro + texto verde suave). */
const mainStoreChipClass =
  'inline-flex max-w-full items-center gap-1.5 rounded-md border border-emerald-500/15 bg-emerald-500/[0.07] px-2 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/55 dark:text-emerald-400/85'

const microBaseLayout =
  'inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium'

export function StoreBadge({ className = '' }: StoreBadgeProps) {
  const { user } = useAuth()
  const [microStore, setMicroStore] = useState<{ id: string; label: string } | null>(null)

  useEffect(() => {
    const loadStoreInfo = async () => {
      const storeId = getCurrentUserStoreId()

      if (storeId && !isMainStoreUser(user)) {
        try {
          const store = await StoresService.getStoreById(storeId)
          if (store) {
            const displayName = store.city
              ? `${store.name} — ${store.city}`
              : store.name
            setMicroStore({ id: store.id, label: displayName })
          }
        } catch (error) {
          console.error('[STORE BADGE] Error loading store info:', error)
        }
      }
    }

    loadStoreInfo()
  }, [user])

  if (isMainStoreUser(user)) {
    return (
      <span className={cn(mainStoreChipClass, 'shrink-0', className)}>
        <Building2 className="h-3 w-3 shrink-0 text-emerald-700/90 dark:text-emerald-400/80" aria-hidden />
        Tienda principal
      </span>
    )
  }

  if (microStore) {
    const { shell, icon } = getMicroStoreBadgePalette(microStore.id)
    return (
      <span
        className={cn(microBaseLayout, shell, 'min-w-0 max-w-[min(100%,18rem)] truncate', className)}
        title={microStore.label}
      >
        <Building2 className={cn('h-3 w-3 shrink-0', icon)} aria-hidden />
        <span className="truncate font-semibold">{microStore.label}</span>
      </span>
    )
  }

  return null
}
