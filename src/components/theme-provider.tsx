'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const v = localStorage.getItem('theme') as Theme | null
  if (v === 'light' || v === 'dark' || v === 'system') return v
  return 'system'
}

function resolveAppliedMode(t: Theme): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  if (t === 'dark') return 'dark'
  if (t === 'light') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  const applyTheme = useCallback((t: Theme) => {
    const resolved = resolveAppliedMode(t)
    setResolvedTheme(resolved)
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolved)
    root.setAttribute('data-theme', resolved)
    localStorage.setItem('theme', t)
  }, [])

  /** Tras el script inline del layout: leer preferencia guardada y alinear estado + DOM (evita pisar “system” con light inicial). */
  useLayoutEffect(() => {
    const stored = readStoredTheme()
    setTheme(stored)
    applyTheme(stored)
  }, [applyTheme])

  const setThemeMode = useCallback(
    (t: Theme) => {
      setTheme(t)
      applyTheme(t)
    },
    [applyTheme]
  )

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      applyTheme('system')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme, applyTheme])

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme: setThemeMode }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
