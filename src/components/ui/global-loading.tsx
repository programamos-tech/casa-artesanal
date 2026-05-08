'use client'

import { Logo } from './logo'
import { useRouterEvents } from '@/hooks/use-router-events'

export function GlobalLoading() {
  const isLoading = useRouterEvents()

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-neutral-950">
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
