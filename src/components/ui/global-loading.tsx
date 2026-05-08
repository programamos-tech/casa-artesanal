'use client'

import { Logo } from './logo'
import { useRouterEvents } from '@/hooks/use-router-events'

export function GlobalLoading() {
  const isLoading = useRouterEvents()

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-neutral-950">
      <div className="text-center">
        {/* Logo con animación simple */}
        <div className="relative">
          <div className="animate-pulse scale-150">
            <Logo size="lg" showText={false} />
          </div>
        </div>
      </div>
    </div>
  )
}
