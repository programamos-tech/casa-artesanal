'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'

const STORAGE_KEY = 'casa_artesanal_tienda_cart'

export type TiendaCartLine = {
  lineId: string
  productId: string
  name: string
  reference: string
  price: number
  imageUrl: string | null
  quantity: number
}

type TiendaCartContextValue = {
  lines: TiendaCartLine[]
  itemCount: number
  subtotal: number
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
  addLine: (input: Omit<TiendaCartLine, 'lineId' | 'quantity'> & { quantity?: number }) => void
  setQty: (lineId: string, quantity: number) => void
  removeLine: (lineId: string) => void
  clearCart: () => void
}

const TiendaCartContext = createContext<TiendaCartContextValue | null>(null)

function newLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function readStorage(): TiendaCartLine[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TiendaCartLine[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function TiendaCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<TiendaCartLine[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    setLines(readStorage())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      /* ignore */
    }
  }, [lines, hydrated])

  const itemCount = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines])
  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.price * l.quantity, 0), [lines])

  const addLine = useCallback(
    (input: Omit<TiendaCartLine, 'lineId' | 'quantity'> & { quantity?: number }) => {
      const qty = Math.max(1, Math.min(99, input.quantity ?? 1))
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.productId === input.productId)
        if (idx >= 0) {
          const next = [...prev]
          const merged = Math.min(99, next[idx].quantity + qty)
          next[idx] = { ...next[idx], quantity: merged }
          return next
        }
        return [
          ...prev,
          {
            lineId: newLineId(),
            productId: input.productId,
            name: input.name,
            reference: input.reference,
            price: input.price,
            imageUrl: input.imageUrl,
            quantity: qty
          }
        ]
      })
      setDrawerOpen(true)
    },
    []
  )

  const setQty = useCallback((lineId: string, quantity: number) => {
    if (quantity < 1) {
      setLines((prev) => prev.filter((l) => l.lineId !== lineId))
      return
    }
    const q = Math.min(99, Math.floor(quantity))
    setLines((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, quantity: q } : l)))
  }, [])

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId))
  }, [])

  const clearCart = useCallback(() => setLines([]), [])

  const value = useMemo(
    () => ({
      lines,
      itemCount,
      subtotal,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      toggleDrawer: () => setDrawerOpen((o) => !o),
      addLine,
      setQty,
      removeLine,
      clearCart
    }),
    [lines, itemCount, subtotal, drawerOpen, addLine, setQty, removeLine, clearCart]
  )

  return <TiendaCartContext.Provider value={value}>{children}</TiendaCartContext.Provider>
}

export function useTiendaCart() {
  const ctx = useContext(TiendaCartContext)
  if (!ctx) throw new Error('useTiendaCart debe usarse dentro de TiendaCartProvider')
  return ctx
}
