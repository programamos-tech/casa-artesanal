'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

const btn =
  'flex h-8 min-w-0 flex-1 items-center justify-center rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20'

const selected =
  'bg-white/[0.15] text-white shadow-[0_1px_6px_rgba(0,0,0,0.3)] ring-1 ring-inset ring-white/[0.12]'
const idle =
  'text-white/35 hover:bg-white/[0.06] hover:text-white/70'

/**
 * Claro / oscuro fijos o según `prefers-color-scheme` (localStorage `light` | `dark` | `system`).
 */
export function SidebarThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className={cn(
        'flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.04] p-1',
        className
      )}
      role="group"
      aria-label="Tema de la interfaz"
    >
      <button
        type="button"
        title="Según el dispositivo"
        aria-label="Según el dispositivo"
        aria-pressed={theme === 'system'}
        className={cn(btn, theme === 'system' ? selected : idle)}
        onClick={() => setTheme('system')}
      >
        <Monitor className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        title="Modo claro"
        aria-label="Modo claro"
        aria-pressed={theme === 'light'}
        className={cn(btn, theme === 'light' ? selected : idle)}
        onClick={() => setTheme('light')}
      >
        <Sun className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        title="Modo oscuro"
        aria-label="Modo oscuro"
        aria-pressed={theme === 'dark'}
        className={cn(btn, theme === 'dark' ? selected : idle)}
        onClick={() => setTheme('dark')}
      >
        <Moon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  )
}
