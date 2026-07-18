'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  MessageCircle,
  ArrowLeft,
  X,
  Send,
  Loader2,
  BarChart3,
  Calendar,
  Banknote,
  Receipt,
  Smartphone,
  CreditCard,
  TrendingUp,
  Clock,
  Package,
  Search,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import {
  OwnerAssistantService,
  formatAssistantMoney,
  type OwnerProductStockResult,
  type OwnerTodaySummary,
} from '@/lib/owner-assistant-service'
import Image from 'next/image'
import { cn } from '@/lib/utils'

type MessageRole = 'bot' | 'user'

type BotPayload =
  | { kind: 'text'; text: string }
  | { kind: 'report'; summary: OwnerTodaySummary }
  | { kind: 'metric'; title: string; value: string; hint?: string; icon: LucideIcon }
  | { kind: 'products'; items: OwnerProductStockResult[] }

type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'bot'; payload: BotPayload }

type QuickOption = {
  id: string
  label: string
  icon: LucideIcon
  userText: string
}

const QUICK_OPTIONS: QuickOption[] = [
  { id: 'today_summary', label: 'Resumen de hoy', icon: BarChart3, userText: 'Quiero ver el resumen de hoy' },
  { id: 'today_cash', label: 'Efectivo en caja', icon: Banknote, userText: '¿Cuánto hay en efectivo hoy?' },
  { id: 'today_transfer', label: 'Transferencias', icon: Smartphone, userText: '¿Cuánto en transferencias hoy?' },
  { id: 'today_gross', label: 'Ganancia bruta', icon: TrendingUp, userText: '¿Cuál es la ganancia bruta de hoy?' },
  { id: 'today_sales', label: 'Ventas del día', icon: Receipt, userText: '¿Cuántas ventas hubo hoy?' },
  { id: 'inventory', label: 'Stock general', icon: Package, userText: '¿Cómo está el inventario?' },
  { id: 'credits', label: 'Créditos pendientes', icon: Clock, userText: '¿Cuánto deben en créditos?' },
  { id: 'search_product', label: 'Buscar producto', icon: Search, userText: 'Quiero buscar un producto' },
]

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const WELCOME_MESSAGE: BotPayload = {
  kind: 'text',
  text: 'Hola, soy el asistente de Casa Artesanal.\n\n¿Qué deseas ver? Elige una opción o escribe el nombre de un producto.',
}

function ReportLines({ summary }: { summary: OwnerTodaySummary }) {
  const lines: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Calendar, label: 'Fecha', value: summary.dateLabel },
    { icon: Banknote, label: 'Vendido hoy', value: formatAssistantMoney(summary.totalRevenue) },
    { icon: Receipt, label: 'Facturas', value: String(summary.salesCount) },
    { icon: Banknote, label: 'Efectivo en caja (hoy)', value: formatAssistantMoney(summary.cashRevenue) },
    {
      icon: Smartphone,
      label: 'Transferencias (Nequi/Bancolombia)',
      value: formatAssistantMoney(summary.transferRevenue),
    },
    { icon: TrendingUp, label: 'Ganancia bruta', value: formatAssistantMoney(summary.grossProfit) },
  ]
  if (summary.cardRevenue > 0) {
    lines.push({
      icon: CreditCard,
      label: 'Tarjeta',
      value: formatAssistantMoney(summary.cardRevenue),
    })
  }
  if (summary.pendingCreditsAmount > 0) {
    lines.push({
      icon: Clock,
      label: 'Créditos por cobrar (total)',
      value: formatAssistantMoney(summary.pendingCreditsAmount),
    })
  }

  return (
    <ul className="space-y-2.5">
      {lines.map(line => (
        <li key={line.label} className="flex gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/60 dark:bg-zinc-900/60">
            <line.icon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">{line.label}</span>
            <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">{line.value}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function BotMessageContent({ payload }: { payload: BotPayload }) {
  if (payload.kind === 'report') {
    return <ReportLines summary={payload.summary} />
  }
  if (payload.kind === 'metric') {
    const Icon = payload.icon
    return (
      <div className="flex gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/60 dark:bg-zinc-900/60">
          <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-300" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">{payload.title}</span>
          <span className="block text-base font-semibold text-zinc-900 dark:text-zinc-50">{payload.value}</span>
          {payload.hint ? (
            <span className="mt-1 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {payload.hint}
            </span>
          ) : null}
        </span>
      </div>
    )
  }
  if (payload.kind === 'products') {
    if (payload.items.length === 0) {
      return <p className="text-sm text-zinc-700 dark:text-zinc-200">No encontré productos con ese nombre o código.</p>
    }
    return (
      <ul className="space-y-3">
        {payload.items.map((p, i) => (
          <li key={p.id} className="border-b border-zinc-200/80 pb-3 last:border-0 last:pb-0 dark:border-zinc-700">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {i + 1}. {p.name}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Ref. {p.reference} · Stock: {p.stock}
            </p>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300">
              Cliente final: {formatAssistantMoney(p.retailPrice)} · Mayorista:{' '}
              {formatAssistantMoney(p.wholesalePrice)}
            </p>
          </li>
        ))}
      </ul>
    )
  }
  return <p className="whitespace-pre-wrap text-sm leading-relaxed">{payload.text}</p>
}

export function OwnerAssistantBubble() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [productQuery, setProductQuery] = useState('')
  const [awaitingProductSearch, setAwaitingProductSearch] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const hideOnRoute =
    pathname.startsWith('/sales/new') ||
    pathname === '/login' ||
    pathname === '/select-store' ||
    pathname.startsWith('/tienda')
  const showAssistant = user?.role === 'superadmin' && !hideOnRoute

  const hasUserMessage = messages.some(m => m.role === 'user')
  const showQuickOptions = !hasUserMessage && !loading && !awaitingProductSearch

  const appendUser = useCallback((text: string) => {
    setMessages(prev => [...prev, { id: nextId(), role: 'user', text }])
  }, [])

  const appendBot = useCallback((payload: BotPayload) => {
    setMessages(prev => [...prev, { id: nextId(), role: 'bot', payload }])
  }, [])

  const resetToMenu = useCallback(() => {
    setAwaitingProductSearch(false)
    setProductQuery('')
    setLoading(false)
    setMessages([{ id: nextId(), role: 'bot', payload: WELCOME_MESSAGE }])
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }, [])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  useEffect(() => {
    if (!open) {
      setMessages([])
      setAwaitingProductSearch(false)
      setProductQuery('')
      return
    }
    if (messages.length === 0) {
      appendBot(WELCOME_MESSAGE)
    }
  }, [open, messages.length, appendBot])

  const respondForIntent = useCallback(
    async (optionId: string) => {
      setLoading(true)
      try {
        const summary = await OwnerAssistantService.getTodaySummary()

        switch (optionId) {
          case 'today_summary':
            appendBot({ kind: 'report', summary })
            break
          case 'today_cash':
            appendBot({
              kind: 'metric',
              icon: Banknote,
              title: 'Efectivo recibido hoy',
              value: formatAssistantMoney(summary.cashRevenue),
              hint: 'Incluye ventas en efectivo y abonos en efectivo del día.',
            })
            break
          case 'today_transfer':
            appendBot({
              kind: 'metric',
              icon: Smartphone,
              title: 'Transferencias hoy',
              value: formatAssistantMoney(summary.transferRevenue),
              hint: 'Nequi, Bancolombia y otras transferencias.',
            })
            break
          case 'today_gross':
            appendBot({
              kind: 'metric',
              icon: TrendingUp,
              title: 'Ganancia bruta de hoy',
              value: formatAssistantMoney(summary.grossProfit),
            })
            break
          case 'today_sales':
            appendBot({
              kind: 'metric',
              icon: Receipt,
              title: 'Ventas de hoy',
              value: `${summary.salesCount} factura${summary.salesCount === 1 ? '' : 's'}`,
              hint: `Total vendido: ${formatAssistantMoney(summary.totalRevenue)}`,
            })
            break
          case 'inventory':
            appendBot({
              kind: 'metric',
              icon: Package,
              title: 'Inventario',
              value: `${summary.totalStockUnits.toLocaleString('es-CO')} unidades`,
              hint: `Productos con poco stock (5 o menos): ${summary.lowStockCount}`,
            })
            break
          case 'credits':
            if (summary.pendingCreditsAmount > 0) {
              appendBot({
                kind: 'metric',
                icon: Clock,
                title: 'Créditos por cobrar',
                value: formatAssistantMoney(summary.pendingCreditsAmount),
              })
            } else {
              appendBot({
                kind: 'metric',
                icon: CheckCircle2,
                title: 'Créditos',
                value: 'Sin deuda pendiente',
              })
            }
            break
          case 'search_product':
            setAwaitingProductSearch(true)
            appendBot({
              kind: 'text',
              text: 'Escribe el nombre o código del producto (mínimo 2 letras) y pulsa Enviar.',
            })
            setTimeout(() => inputRef.current?.focus(), 100)
            break
          default:
            appendBot({ kind: 'text', text: 'No reconocí esa opción.' })
        }
      } catch {
        appendBot({ kind: 'text', text: 'No pude cargar los datos. Intenta de nuevo en un momento.' })
      } finally {
        setLoading(false)
      }
    },
    [appendBot]
  )

  const handleQuickOption = useCallback(
    async (option: QuickOption) => {
      appendUser(option.userText)
      await respondForIntent(option.id)
    },
    [appendUser, respondForIntent]
  )

  const handleSend = useCallback(async () => {
    const q = productQuery.trim()
    if (!q) return

    if (awaitingProductSearch) {
      appendUser(q)
      setProductQuery('')
      setAwaitingProductSearch(false)
      setLoading(true)
      try {
        const items = await OwnerAssistantService.searchProduct(q)
        appendBot({ kind: 'products', items })
        if (items.length === 1) {
          appendBot({
            kind: 'text',
            text: 'Ve a Productos en el menú para ver o ajustar el stock de ese artículo.',
          })
        }
      } catch {
        appendBot({ kind: 'text', text: 'Error al buscar el producto.' })
      } finally {
        setLoading(false)
      }
      return
    }

    appendUser(q)
    setProductQuery('')
    const lower = q.toLowerCase()
    if (lower.includes('efectivo') || lower.includes('caja')) {
      await respondForIntent('today_cash')
    } else if (lower.includes('transfer') || lower.includes('nequi')) {
      await respondForIntent('today_transfer')
    } else if (lower.includes('ganancia')) {
      await respondForIntent('today_gross')
    } else if (lower.includes('venta') || lower.includes('factura')) {
      await respondForIntent('today_sales')
    } else if (lower.includes('stock') || lower.includes('inventario')) {
      await respondForIntent('inventory')
    } else if (lower.includes('crédito') || lower.includes('credito')) {
      await respondForIntent('credits')
    } else if (lower.includes('resumen') || lower.includes('hoy')) {
      await respondForIntent('today_summary')
    } else if (q.length >= 2) {
      setLoading(true)
      try {
        const items = await OwnerAssistantService.searchProduct(q)
        appendBot({ kind: 'products', items })
      } catch {
        appendBot({ kind: 'text', text: 'No pude buscar. Escribe otra palabra o código.' })
      } finally {
        setLoading(false)
      }
    } else {
      appendBot({
        kind: 'text',
        text: 'Escribe al menos 2 caracteres para buscar un producto.',
      })
    }
  }, [productQuery, awaitingProductSearch, appendUser, appendBot, respondForIntent])

  if (!showAssistant) return null

  return (
    <>
      {open && (
        <div
          className={cn(
            'fixed z-[120] flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_12px_48px_rgba(0,0,0,0.18)] dark:border-zinc-700 dark:bg-zinc-900',
            'bottom-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] left-3 right-3',
            'h-[min(32rem,72vh)] max-w-md',
            'xl:bottom-6 xl:left-auto xl:right-6 xl:h-[min(34rem,75vh)] xl:w-[22rem]'
          )}
          role="dialog"
          aria-label="Asistente Casa Artesanal"
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-zinc-100 bg-zinc-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-sm ring-1 ring-zinc-200/80 dark:ring-zinc-700">
              <Image
                src="/logo.ya.png"
                alt="La Casa Artesanal"
                fill
                sizes="40px"
                className="object-cover object-center"
                priority
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Casa Artesanal
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {hasUserMessage ? 'Asistente' : '¿Qué deseas ver?'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {hasUserMessage && !loading && (
                <button
                  type="button"
                  onClick={resetToMenu}
                  className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200/80 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Volver al menú"
                  title="Volver al menú"
                >
                  <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-200/80 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label="Cerrar asistente"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-[92%] rounded-2xl rounded-br-md bg-zinc-900 px-3.5 py-2.5 text-[15px] leading-snug text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {msg.text}
                  </div>
                ) : (
                  <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-zinc-100 px-3.5 py-2.5 dark:bg-zinc-800">
                    <BotMessageContent payload={msg.payload} />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-zinc-100 px-3.5 py-2.5 dark:bg-zinc-800">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                  <span className="text-sm text-zinc-500">Consultando…</span>
                </div>
              </div>
            )}
          </div>

          {showQuickOptions && (
            <div className="shrink-0 border-t border-zinc-100 px-2 py-2 dark:border-zinc-800">
              <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                Opciones rápidas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => void handleQuickOption(opt)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      <Icon className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.75} aria-hidden />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="shrink-0 border-t border-zinc-100 p-2 dark:border-zinc-800">
            {hasUserMessage && !showQuickOptions && !loading && (
              <button
                type="button"
                onClick={resetToMenu}
                className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                Volver al menú de opciones
              </button>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={productQuery}
                onChange={e => setProductQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleSend()
                }}
                placeholder={
                  awaitingProductSearch ? 'Nombre o código del producto…' : 'Escribe aquí…'
                }
                className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={loading || !productQuery.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white transition-opacity disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
                aria-label="Enviar"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:hover:text-zinc-300"
            >
              <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.75} />
              Ver reportes completos
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'fixed z-[120] flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95',
          'h-16 w-16 bg-zinc-900 text-white ring-4 ring-white/90 dark:ring-zinc-950/90',
          'bottom-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] right-4',
          'xl:bottom-6 xl:right-6',
          open && 'pointer-events-none scale-0 opacity-0'
        )}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'}
        aria-expanded={open}
      >
        <MessageCircle className="h-8 w-8" strokeWidth={1.75} aria-hidden />
      </button>
    </>
  )
}
