'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

const btn =
  'flex h-9 w-9 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50'

export function LoginThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className={cn(
        'inline-flex rounded-xl border border-zinc-200/90 bg-white/90 p-1 shadow-sm backdrop-blur-sm dark:border-zinc-700/90 dark:bg-zinc-900/80',
        className
      )}
      role="group"
      aria-label="Tema de la interfaz"
    >
      <button
        type="button"
        title="Según el sistema"
        aria-pressed={theme === 'system'}
        className={cn(
          btn,
          theme === 'system'
            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
        )}
        onClick={() => setTheme('system')}
      >
        <Monitor className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        title="Modo claro"
        aria-pressed={theme === 'light'}
        className={cn(
          btn,
          theme === 'light'
            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
        )}
        onClick={() => setTheme('light')}
      >
        <Sun className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        title="Modo oscuro"
        aria-pressed={theme === 'dark'}
        className={cn(
          btn,
          theme === 'dark'
            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
        )}
        onClick={() => setTheme('dark')}
      >
        <Moon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  )
}
