'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

const AVATAR_SIZE = 88

type AppLoadingScreenProps = {
  className?: string
  /** Pantalla completa fija (navegación / loading.tsx) */
  overlay?: boolean
}

export function AppLoadingScreen({ className, overlay = false }: AppLoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando"
      className={cn(
        'flex flex-col items-center justify-center bg-white dark:bg-neutral-950',
        overlay ? 'fixed inset-0 z-50' : 'min-h-screen w-full',
        className
      )}
    >
      <div className="flex flex-col items-center gap-5">
        <div
          className="relative shrink-0 overflow-hidden rounded-full bg-[#0d0d0e] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.35)] ring-2 ring-zinc-200/90 dark:ring-zinc-700/70"
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
        >
          <Image
            src="/logo.ya.png"
            alt="La Casa Artesanal"
            fill
            sizes={`${AVATAR_SIZE}px`}
            className="object-cover object-center scale-[1.06]"
            priority
            unoptimized
          />
        </div>

        <div
          className="h-1 w-28 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800/90"
          aria-hidden
        >
          <div className="app-loading-bar h-full rounded-full bg-zinc-800 dark:bg-zinc-200" />
        </div>
      </div>
    </div>
  )
}
