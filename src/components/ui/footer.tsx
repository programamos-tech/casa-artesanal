'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { getCurrentUserStoreId, isMainStoreUser } from '@/lib/store-helper'
import { StoresService } from '@/lib/stores-service'

export function Footer() {
  const { user } = useAuth()
  const [storeLabel, setStoreLabel] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (isMainStoreUser(user)) {
        setStoreLabel('Tienda Principal')
        return
      }
      const storeId = getCurrentUserStoreId()
      if (!storeId) return
      try {
        const store = await StoresService.getStoreById(storeId)
        if (store) setStoreLabel(store.city ? `${store.name} - ${store.city}` : store.name)
      } catch {
        setStoreLabel(null)
      }
    }
    load()
  }, [user])

  return (
    <footer className="hidden lg:block fixed bottom-20 right-6 z-30">
      <a
        href="https://programamos.st"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md rounded-lg px-4 py-2 shadow-lg border border-gray-200/50 dark:border-neutral-700/50 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <img
            src="/logo_programamos.st.png"
            alt="programamos.st"
            width={20}
            height={20}
            className="opacity-60 dark:opacity-40"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-light">
              Desarrollado por
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300 font-bold">
              programamos.st
            </span>
            {storeLabel && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[140px]" title={storeLabel}>
                {storeLabel}
              </span>
            )}
          </div>
        </div>
      </a>
    </footer>
  )
}
