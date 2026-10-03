'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Calendar, X, RefreshCw, Eye, EyeOff, ChevronDown } from 'lucide-react'
import { ReportCallout, ReportSectionTitle, ReportStat, ReportTable } from '@/components/dashboard/report-ui'
import { REPORT_CHART_COLORS, ReportBarChart } from '@/components/dashboard/report-bar-chart'
import { useSales } from '@/contexts/sales-context'
import { useProducts } from '@/contexts/products-context'
import { useClients } from '@/contexts/clients-context'
import { useAuth } from '@/contexts/auth-context'
import { getCurrentUserStoreId, isMainStoreUser } from '@/lib/store-helper'
import { StoresService } from '@/lib/stores-service'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { Sale } from '@/types'
import { CancelledInvoicesModal } from '@/components/dashboard/cancelled-invoices-modal'
import { cn } from '@/lib/utils'
import { isWholesaleClientType } from '@/lib/product-pricing'

type DateFilter = 'today' | 'specific' | 'all' | 'range'

type PaymentChannel = 'cash' | 'nequi' | 'bancolombia' | 'transfer' | 'card'

type ChannelRevenue = {
  total: number
  products: number
  transport: number
}

function emptyChannelRevenue(): ChannelRevenue {
  return { total: 0, products: 0, transport: 0 }
}

function mapPaymentChannel(type: string | undefined): PaymentChannel | null {
  if (type === 'cash') return 'cash'
  if (type === 'nequi') return 'nequi'
  if (type === 'bancolombia') return 'bancolombia'
  if (type === 'transfer') return 'transfer'
  if (type === 'card') return 'card'
  return null
}

function splitSalePayment(
  sale: Sale,
  paymentAmount: number
): { products: number; transport: number } {
  const productAmount = Math.max(0, (sale.subtotal || 0) + (sale.tax || 0))
  const transportAmount = Math.max(0, sale.transportPrice || 0)
  const totalSale = Math.max(0, sale.total || 0)
  if (totalSale <= 0 || paymentAmount <= 0) return { products: 0, transport: 0 }
  const ratio = paymentAmount / totalSale
  return {
    products: productAmount * ratio,
    transport: transportAmount * ratio,
  }
}

function addChannelPayment(
  channels: Record<PaymentChannel, ChannelRevenue>,
  channel: PaymentChannel,
  amount: number,
  productsPart: number,
  transportPart: number
) {
  channels[channel].total += amount
  channels[channel].products += productsPart
  channels[channel].transport += transportPart
}

function revenueMixSubtitle(
  products: number,
  transport: number,
  formatCurrency: (amount: number) => string
): string {
  const p = Math.round(products)
  const t = Math.round(transport)
  if (p <= 0 && t <= 0) return 'Sin movimientos'
  if (t <= 0) return `${formatCurrency(p)} en ventas`
  if (p <= 0) return `${formatCurrency(t)} en domicilios`
  return `Ventas ${formatCurrency(p)} · Domicilios ${formatCurrency(t)}`
}

const dashFilterSelectClass =
  'block h-full w-full cursor-pointer appearance-none border-0 bg-transparent pl-2.5 pr-7 text-[13px] font-medium leading-none text-zinc-800 focus:outline-none focus:ring-0 dark:text-zinc-100'

const dashIconButtonClass =
  'flex h-8 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:text-white/45 dark:hover:text-white'

/** Debe coincidir con la ventana del gráfico “Últimos N días” (incluye el día de referencia). */
const INCOME_TREND_CHART_DAYS = 15
const INCOME_TREND_FETCH_OFFSET = INCOME_TREND_CHART_DAYS - 1

export default function DashboardPage() {
  const router = useRouter()
  const { sales } = useSales()
  const { clients: clientsFromContext } = useClients()
  const { totalProducts: totalProductsFromContext, products: productsFromContext, productsLastUpdated } = useProducts()
  const { user } = useAuth()
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [specificDate, setSpecificDate] = useState<Date | null>(null)
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null)
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null)
  const [isFiltering, setIsFiltering] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()])

  // Verificar si el usuario es Super Admin (Diego)
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'Super Admin' || user?.role === 'Super Administrador'

  // Verificar si el usuario puede ver información de créditos (superadmin, admin, vendedor)
  const canViewCredits = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'vendedor'

  // Para usuarios no-Super Admin, forzar el filtro a 'today' y mostrar dashboard completo
  const effectiveDateFilter = isSuperAdmin ? dateFilter : 'today'
  const [allSales, setAllSales] = useState<Sale[]>([])
  const [egresosSummary, setEgresosSummary] = useState<{ totalAmount: number; count: number }>({
    totalAmount: 0,
    count: 0,
  })
  const [allCredits, setAllCredits] = useState<any[]>([])
  const [allClients, setAllClients] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([]) // Solo para productos específicos cargados bajo demanda
  const [allPaymentRecords, setAllPaymentRecords] = useState<any[]>([])
  const [specificProductsCache, setSpecificProductsCache] = useState<Map<string, any>>(new Map())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showCancelledModal, setShowCancelledModal] = useState(false)
  const [showTransferBreakdown, setShowTransferBreakdown] = useState(false)
  const transferTileRef = useRef<HTMLButtonElement>(null)
  const transferPopoverRef = useRef<HTMLDivElement>(null)
  const [transferPopoverPos, setTransferPopoverPos] = useState<{
    top: number
    left: number
    placement: 'right' | 'left' | 'bottom'
    arrowOffset: number
    width: number
  } | null>(null)
  const [showRevenueBreakdown, setShowRevenueBreakdown] = useState(false)
  const revenueTileRef = useRef<HTMLButtonElement>(null)
  const revenuePopoverRef = useRef<HTMLDivElement>(null)
  const [revenuePopoverPos, setRevenuePopoverPos] = useState<{
    top: number
    left: number
    placement: 'right' | 'left' | 'bottom'
    arrowOffset: number
    width: number
  } | null>(null)
  const [showProfitBreakdown, setShowProfitBreakdown] = useState(false)
  const profitTileRef = useRef<HTMLButtonElement>(null)
  const profitPopoverRef = useRef<HTMLDivElement>(null)
  const [profitPopoverPos, setProfitPopoverPos] = useState<{
    top: number
    left: number
    placement: 'right' | 'left' | 'bottom'
    arrowOffset: number
    width: number
  } | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [hideNumbers, setHideNumbers] = useState(false)
  const [currentStoreName, setCurrentStoreName] = useState<string | null>(null)
  const [currentStoreCity, setCurrentStoreCity] = useState<string | null>(null)

  // Nuevos estados para métricas optimizadas
  const [optimizedMetrics, setOptimizedMetrics] = useState<{
    salesSummary?: any,
    inventorySummary?: any,
    creditsSummary?: any
  }>({})

  // Usar clientes del contexto (evita duplicar getAllClients con el dashboard)
  useEffect(() => {
    if (clientsFromContext?.length !== undefined) {
      setAllClients(clientsFromContext)
    }
  }, [clientsFromContext])

  // Cargar información de la tienda actual y recargar datos cuando cambie el storeId
  useEffect(() => {
    const loadStoreInfo = async () => {
      const storeId = getCurrentUserStoreId()

      if (storeId && !isMainStoreUser(user)) {
        try {
          const store = await StoresService.getStoreById(storeId)
          if (store) {
            setCurrentStoreName(store.name)
            setCurrentStoreCity(store.city || null)
          }
        } catch (error) {
          console.error('[DASHBOARD] Error loading store info:', error)
        }
      } else {
        setCurrentStoreName(null)
        setCurrentStoreCity(null)
      }

      loadDashboardData()
    }
    if (user) {
      loadStoreInfo()
    }
  }, [user, user?.storeId])

  // Detectar modo oscuro directamente desde el DOM
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }

    // Verificar inicialmente
    checkDarkMode()

    // Observar cambios en la clase del documento
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    // También escuchar cambios en el media query del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleMediaChange = () => {
      // Solo actualizar si no hay una clase explícita
      if (!document.documentElement.classList.contains('dark') &&
        !document.documentElement.classList.contains('light')) {
        checkDarkMode()
      }
    }
    mediaQuery.addEventListener('change', handleMediaChange)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [])

  useEffect(() => {
    if (!showTransferBreakdown) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowTransferBreakdown(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showTransferBreakdown])

  useEffect(() => {
    if (!showTransferBreakdown) {
      setTransferPopoverPos(null)
      return
    }

    const compute = () => {
      const el = transferTileRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const gap = 6
      const margin = 8
      const popoverMaxHeight = 360
      const width = Math.min(320, Math.max(260, vw - margin * 2))
      const isWide = vw >= 768

      let placement: 'right' | 'left' | 'bottom' = 'bottom'
      let left = rect.left + rect.width / 2 - width / 2
      let top = rect.bottom + gap

      if (isWide) {
        if (rect.right + gap + width <= vw - margin) {
          placement = 'right'
          left = rect.right + gap
          top = rect.top + rect.height / 2 - Math.min(popoverMaxHeight, 220) / 2
        } else if (rect.left - gap - width >= margin) {
          placement = 'left'
          left = rect.left - gap - width
          top = rect.top + rect.height / 2 - Math.min(popoverMaxHeight, 220) / 2
        }
      }

      left = Math.max(margin, Math.min(left, vw - width - margin))
      top = Math.max(margin, Math.min(top, vh - margin - 80))

      const tileCenterX = rect.left + rect.width / 2
      const tileCenterY = rect.top + rect.height / 2
      const arrowOffset =
        placement === 'bottom'
          ? Math.max(16, Math.min(width - 16, tileCenterX - left))
          : Math.max(16, Math.min(220, tileCenterY - top))

      setTransferPopoverPos({ top, left, placement, arrowOffset, width })
    }

    compute()
    const onScroll = () => compute()
    window.addEventListener('resize', compute)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [showTransferBreakdown])

  useEffect(() => {
    if (!showTransferBreakdown) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (transferTileRef.current?.contains(target)) return
      if (transferPopoverRef.current?.contains(target)) return
      setShowTransferBreakdown(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [showTransferBreakdown])

  useEffect(() => {
    if (!showRevenueBreakdown) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowRevenueBreakdown(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showRevenueBreakdown])

  useEffect(() => {
    if (!showRevenueBreakdown) {
      setRevenuePopoverPos(null)
      return
    }

    const compute = () => {
      const el = revenueTileRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const gap = 6
      const margin = 8
      const popoverMaxHeight = 360
      const width = Math.min(320, Math.max(260, vw - margin * 2))
      const isWide = vw >= 768

      let placement: 'right' | 'left' | 'bottom' = 'bottom'
      let left = rect.left + rect.width / 2 - width / 2
      let top = rect.bottom + gap

      if (isWide) {
        if (rect.right + gap + width <= vw - margin) {
          placement = 'right'
          left = rect.right + gap
          top = rect.top + rect.height / 2 - Math.min(popoverMaxHeight, 220) / 2
        } else if (rect.left - gap - width >= margin) {
          placement = 'left'
          left = rect.left - gap - width
          top = rect.top + rect.height / 2 - Math.min(popoverMaxHeight, 220) / 2
        }
      }

      left = Math.max(margin, Math.min(left, vw - width - margin))
      top = Math.max(margin, Math.min(top, vh - margin - 80))

      const tileCenterX = rect.left + rect.width / 2
      const tileCenterY = rect.top + rect.height / 2
      const arrowOffset =
        placement === 'bottom'
          ? Math.max(16, Math.min(width - 16, tileCenterX - left))
          : Math.max(16, Math.min(220, tileCenterY - top))

      setRevenuePopoverPos({ top, left, placement, arrowOffset, width })
    }

    compute()
    const onScroll = () => compute()
    window.addEventListener('resize', compute)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [showRevenueBreakdown])

  useEffect(() => {
    if (!showRevenueBreakdown) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (revenueTileRef.current?.contains(target)) return
      if (revenuePopoverRef.current?.contains(target)) return
      setShowRevenueBreakdown(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [showRevenueBreakdown])

  useEffect(() => {
    if (!showProfitBreakdown) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProfitBreakdown(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showProfitBreakdown])

  useEffect(() => {
    if (!showProfitBreakdown) {
      setProfitPopoverPos(null)
      return
    }

    const compute = () => {
      const el = profitTileRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const gap = 6
      const margin = 8
      const popoverMaxHeight = 360
      const width = Math.min(320, Math.max(260, vw - margin * 2))
      const isWide = vw >= 768

      let placement: 'right' | 'left' | 'bottom' = 'bottom'
      let left = rect.left + rect.width / 2 - width / 2
      let top = rect.bottom + gap

      if (isWide) {
        if (rect.right + gap + width <= vw - margin) {
          placement = 'right'
          left = rect.right + gap
          top = rect.top + rect.height / 2 - Math.min(popoverMaxHeight, 220) / 2
        } else if (rect.left - gap - width >= margin) {
          placement = 'left'
          left = rect.left - gap - width
          top = rect.top + rect.height / 2 - Math.min(popoverMaxHeight, 220) / 2
        }
      }

      left = Math.max(margin, Math.min(left, vw - width - margin))
      top = Math.max(margin, Math.min(top, vh - margin - 80))

      const tileCenterX = rect.left + rect.width / 2
      const tileCenterY = rect.top + rect.height / 2
      const arrowOffset =
        placement === 'bottom'
          ? Math.max(16, Math.min(width - 16, tileCenterX - left))
          : Math.max(16, Math.min(220, tileCenterY - top))

      setProfitPopoverPos({ top, left, placement, arrowOffset, width })
    }

    compute()
    const onScroll = () => compute()
    window.addEventListener('resize', compute)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [showProfitBreakdown])

  useEffect(() => {
    if (!showProfitBreakdown) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (profitTileRef.current?.contains(target)) return
      if (profitPopoverRef.current?.contains(target)) return
      setShowProfitBreakdown(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [showProfitBreakdown])

  const goToCredits = useCallback(() => {
    router.push('/payments')
  }, [router])

  // Función helper para agregar timeout a las promesas
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout después de ${timeoutMs}ms`)), timeoutMs)
      )
    ])
  }

  // Función para cargar datos del dashboard
  const loadDashboardData = async (
    showLoading = false,
    overrideFilter?: DateFilter,
    overrideSpecificDate?: Date | null,
    overrideYear?: number,
    overrideRangeStart?: Date | null,
    overrideRangeEnd?: Date | null
  ) => {
    try {
      // Prevenir ejecuciones duplicadas
      if (isRefreshing || isFiltering) {
        return
      }

      if (showLoading) {
        setIsRefreshing(true)
      }

      // Si es la carga inicial, mostrar loading
      if (isInitialLoading) {
        setIsInitialLoading(true)
      }

      // Importar servicios
      const { SalesService } = await import('@/lib/sales-service')
      const { EgresosService } = await import('@/lib/egresos-service')
      const { CreditsService } = await import('@/lib/credits-service')
      const { ProductsService } = await import('@/lib/products-service')

      // Determinar si necesitamos filtrar por fecha
      let currentFilter = overrideFilter !== undefined ? overrideFilter : (isSuperAdmin ? dateFilter : 'today')

      if (currentFilter === 'specific' && !overrideSpecificDate && !specificDate) {
        console.warn('⚠️ [DASHBOARD] Filtro "specific" pero no hay fecha, cambiando a "today"')
        currentFilter = 'today'
      }
      const dateToUse = overrideSpecificDate !== undefined ? overrideSpecificDate : specificDate
      const yearToUse = overrideYear !== undefined ? overrideYear : selectedYear
      const rangeStart = overrideRangeStart !== undefined ? overrideRangeStart : dateRangeStart
      const rangeEnd = overrideRangeEnd !== undefined ? overrideRangeEnd : dateRangeEnd

      if (currentFilter === 'range') {
        if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) {
          if (showLoading) setIsRefreshing(false)
          if (isInitialLoading) setIsInitialLoading(false)
          return
        }
      }

      // Corregir lógica: 'all' (año) TAMBIÉN requiere un rango de fechas
      const { startDate, endDate } = getDateRange(currentFilter, yearToUse, dateToUse, rangeStart, rangeEnd)

      // Una sola ronda de carga: ventas, garantías, créditos, pagos, métricas de inventario y resumen de créditos
      // (evitamos getDashboardSummary y getAllClients duplicados; el resumen de ventas se calcula desde las ventas)
      let chartStartDate = startDate || new Date()
      if (currentFilter === 'specific' && dateToUse) {
        const extendedStart = new Date(dateToUse)
        extendedStart.setDate(extendedStart.getDate() - INCOME_TREND_FETCH_OFFSET)
        extendedStart.setHours(0, 0, 0, 0)
        chartStartDate = extendedStart
      } else if (currentFilter === 'range' && rangeStart) {
        chartStartDate = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 0, 0, 0, 0)
      } else if (currentFilter === 'today' || !startDate) {
        const extendedStart = new Date()
        extendedStart.setDate(extendedStart.getDate() - INCOME_TREND_FETCH_OFFSET)
        extendedStart.setHours(0, 0, 0, 0)
        chartStartDate = extendedStart
      }

      // Si es "Todo el Tiempo", cargar solo el año seleccionado
      const finalEndDate = endDate || new Date()

      const [salesResult, egresosResult, creditsResult, paymentRecordsResult, inventoryResult, creditsSummaryResult] = await Promise.allSettled([
        withTimeout(SalesService.getDashboardSales(chartStartDate, finalEndDate), currentFilter === 'all' ? 30000 : 20000),
        withTimeout(
          EgresosService.getEgresosSummaryByDateRange(startDate || chartStartDate, finalEndDate),
          15000
        ),
        withTimeout(CreditsService.getAllCredits(), 15000),
        withTimeout(CreditsService.getPaymentRecordsByDateRange(chartStartDate, finalEndDate), 15000),
        withTimeout(ProductsService.getInventoryMetrics(), 30000),
        withTimeout(CreditsService.getCreditsSummary(), 15000)
      ])

      const sales = salesResult.status === 'fulfilled' ? salesResult.value : []
      const egresosData =
        egresosResult.status === 'fulfilled'
          ? egresosResult.value
          : { totalAmount: 0, count: 0, items: [] }
      const credits = creditsResult.status === 'fulfilled' ? creditsResult.value : []
      const payments = paymentRecordsResult.status === 'fulfilled' ? paymentRecordsResult.value : []
      const fastInventory = inventoryResult.status === 'fulfilled' ? inventoryResult.value : null
      const fastCredits = creditsSummaryResult.status === 'fulfilled' ? creditsSummaryResult.value : null

      // Resumen de ventas calculado desde la lista (evita getDashboardSummary y sus N requests)
      let cashRevenue = 0
      let transferRevenue = 0
      let cardRevenue = 0
      const activeSales = sales.filter((s: Sale) => s.status !== 'cancelled' && s.status !== 'draft')
      activeSales.forEach((sale: Sale) => {
        if (sale.payments?.length) {
          sale.payments.forEach((p: { paymentType: string; amount: number }) => {
            if (p.paymentType === 'cash') cashRevenue += p.amount || 0
            if (p.paymentType === 'transfer' || p.paymentType === 'nequi' || p.paymentType === 'bancolombia')
              transferRevenue += p.amount || 0
            if (p.paymentType === 'card') cardRevenue += p.amount || 0
          })
        } else {
          if (sale.paymentMethod === 'cash') cashRevenue += sale.total || 0
          if (sale.paymentMethod === 'transfer' || sale.paymentMethod === 'nequi' || sale.paymentMethod === 'bancolombia')
            transferRevenue += sale.total || 0
          if (sale.paymentMethod === 'card') cardRevenue += sale.total || 0
        }
      })
      const salesSummary = {
        totalRevenue: cashRevenue + transferRevenue + cardRevenue,
        cashRevenue,
        transferRevenue,
        cardRevenue,
        salesCount: activeSales.length
      }

      setOptimizedMetrics({
        salesSummary,
        inventorySummary: fastInventory ?? undefined,
        creditsSummary: fastCredits ?? undefined
      })

      setAllSales(sales)
      setEgresosSummary({
        totalAmount: egresosData.totalAmount || 0,
        count: egresosData.count || 0,
      })
      setAllCredits(credits)
      setAllProducts([])
      setAllPaymentRecords(payments)
      setLastUpdated(new Date())

      const errors = [salesResult, egresosResult, creditsResult, paymentRecordsResult, inventoryResult, creditsSummaryResult]
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length > 0) {
        console.error('⚠️ [DASHBOARD] Algunos datos no cargaron:', errors)
      }

    } catch (error) {
      console.error('❌ [DASHBOARD] Error crítico en loadDashboardData:', error)
    } finally {
      setIsInitialLoading(false)
      setIsRefreshing(false)
    }
  }

  // Función para cargar productos específicos por IDs en batch (1–2 requests en lugar de N)
  const loadSpecificProducts = useCallback((productIds: string[]) => {
    if (productIds.length === 0) return

    const uniqueIds = Array.from(new Set(productIds))

    setSpecificProductsCache(prevCache => {
      const idsToLoad = uniqueIds.filter(id => !prevCache.has(id))
      if (idsToLoad.length === 0) return prevCache

      import('@/lib/products-service').then(({ ProductsService }) =>
        ProductsService.getProductsByIds(idsToLoad)
      ).then(products => {
        setSpecificProductsCache(currentCache => {
          const updatedCache = new Map(currentCache)
          products.forEach(product => {
            updatedCache.set(product.id, product)
          })
          setAllProducts(Array.from(updatedCache.values()))
          return updatedCache
        })
      }).catch(error => {
        console.error('Error loading products batch:', error)
      })

      return prevCache
    })
  }, [])

  // Función para actualización manual del dashboard
  const handleRefresh = () => {
    setSpecificProductsCache(new Map())
    setAllProducts([])
    loadDashboardData(true, dateFilter, specificDate, selectedYear)
  }

  // Cargar años disponibles al montar
  useEffect(() => {
    const loadAvailableYears = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const currentYear = new Date().getFullYear()

        // Obtener la venta más antigua para saber desde qué año empezar
        const { data, error } = await supabase
          .from('sales')
          .select('created_at')
          .order('created_at', { ascending: true })
          .limit(1)

        if (error || !data || data.length === 0) {
          // Si no hay ventas, asegurar que al menos el año actual esté disponible
          setAvailableYears([currentYear])
          return
        }

        const firstYear = new Date(data[0].created_at).getFullYear()

        // Generar array de años desde la primera venta hasta el año actual
        const years: number[] = []
        for (let year = firstYear; year <= currentYear; year++) {
          years.push(year)
        }

        const uniqueYears = Array.from(new Set([...years, currentYear])).sort((a, b) => b - a)
        setAvailableYears(uniqueYears)
      } catch (error) {
        console.error('Error cargando años:', error)
        setAvailableYears([new Date().getFullYear()])
      }
    }

    loadAvailableYears()
  }, [])

  // Cargar datos solo una vez al montar el componente
  useEffect(() => {
    // Solo cargar si no hay datos aún (evitar doble carga)
    // El filtro inicial es 'today', así que cargará datos de hoy
    if (allSales.length === 0) {
      loadDashboardData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo ejecutar una vez al montar

  // Escuchar cambios en el storeId del usuario y recargar datos
  useEffect(() => {
    if (!user) return

    const currentStoreId = getCurrentUserStoreId()

    if (currentStoreId !== user.storeId) {
      setAllSales([])
      setAllCredits([])
      setAllClients([])
      setAllProducts([])
      setAllPaymentRecords([])
      setSpecificProductsCache(new Map())
      // Recargar datos
      loadDashboardData()
    }
  }, [user?.storeId])

  // Escuchar cambios en las ventas del contexto para actualizar el dashboard
  useEffect(() => {
    if (sales.length === 0) return

    const newSales = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const saleDay = new Date(saleDate)
      saleDay.setHours(0, 0, 0, 0)
      const isToday = saleDay.getTime() === today.getTime()
      const notInDashboard = !allSales.find(existingSale => existingSale.id === sale.id)
      return isToday && notInDashboard
    })

    if (newSales.length > 0) {
      const timeoutId = setTimeout(() => {
        loadDashboardData(false, effectiveDateFilter, specificDate, selectedYear)
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales.length, allSales.length, sales])

  // Función para obtener fechas de filtro
  const getDateRange = (
    filter: DateFilter,
    year?: number,
    overrideSpecificDate?: Date | null,
    overrideRangeStart?: Date | null,
    overrideRangeEnd?: Date | null
  ) => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const targetYear = year || selectedYear
    const dateToUse = overrideSpecificDate !== undefined ? overrideSpecificDate : specificDate
    const rangeStart = overrideRangeStart !== undefined ? overrideRangeStart : dateRangeStart
    const rangeEnd = overrideRangeEnd !== undefined ? overrideRangeEnd : dateRangeEnd

    let startDate: Date | null
    let endDate: Date | null

    switch (filter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        break
      case 'specific':
        if (!dateToUse) {
          console.warn('⚠️ [DASHBOARD] Filtro "specific" pero no hay fecha seleccionada')
          return { startDate: null, endDate: null }
        }
        startDate = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate(), 0, 0, 0, 0)
        endDate = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate(), 23, 59, 59, 999)
        break
      case 'range':
        if (!rangeStart || !rangeEnd) return { startDate: null, endDate: null }
        const start = rangeStart <= rangeEnd ? rangeStart : rangeEnd
        const end = rangeEnd >= rangeStart ? rangeEnd : rangeStart
        startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0)
        endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)
        break
      case 'all':
        startDate = new Date(targetYear, 0, 1, 0, 0, 0, 0)
        endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999)
        break
      default:
        return { startDate: null, endDate: null }
    }

    return { startDate, endDate }
  }

  // Filtrar datos por período
  // NOTA: Ahora los datos ya vienen filtrados del backend cuando hay un filtro de fecha
  // NO aplicar filtrado adicional para evitar problemas de zona horaria
  const filteredData = useMemo(() => {
    if (effectiveDateFilter === 'all') {
      return {
        sales: allSales,
        egresos: egresosSummary,
        credits: allCredits,
        paymentRecords: allPaymentRecords
      }
    }
    if (effectiveDateFilter === 'range') {
      if (dateRangeStart && dateRangeEnd) {
        return {
          sales: allSales,
          egresos: egresosSummary,
          credits: allCredits,
          paymentRecords: allPaymentRecords
        }
      }
      return { sales: [], egresos: { totalAmount: 0, count: 0 }, credits: [], paymentRecords: [] }
    }

    // Para filtros específicos (today, specific), los datos YA vienen filtrados del backend
    // PERO cargamos INCOME_TREND_CHART_DAYS para la gráfica de tendencia; las métricas usan solo el día seleccionado
    if (effectiveDateFilter === 'specific' && !specificDate) {
      // Si es 'specific' pero no hay fecha seleccionada, devolver vacío
      return {
        sales: [],
        egresos: { totalAmount: 0, count: 0 },
        credits: [],
        paymentRecords: []
      }
    }

    // Para 'today' o 'specific' con fecha, filtrar solo el día seleccionado para las métricas
    // (allSales incluye la ventana de tendencia completa para la gráfica)
    if (effectiveDateFilter === 'today' || (effectiveDateFilter === 'specific' && specificDate)) {
      const targetDate = effectiveDateFilter === 'today' ? new Date() : new Date(specificDate!)
      targetDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)

      // Filtrar ventas solo del día seleccionado
      // Usar comparación más flexible para evitar problemas de zona horaria
      const filteredSales = allSales.filter(sale => {
        const saleDate = new Date(sale.createdAt)
        // Normalizar ambas fechas a medianoche en hora local
        const saleDateNormalized = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate())
        const targetDateNormalized = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
        return saleDateNormalized.getTime() === targetDateNormalized.getTime()
      })

      // Filtrar abonos solo del día seleccionado (misma normalización que ventas para zona horaria)
      const targetDateNormalized = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
      const filteredPayments = allPaymentRecords.filter(payment => {
        const paymentDate = new Date(payment.paymentDate)
        const paymentDateNormalized = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate())
        return paymentDateNormalized.getTime() === targetDateNormalized.getTime()
      })

      // Warranties y credits ya vienen filtrados del backend (solo del día)
      return {
        sales: filteredSales,
        egresos: egresosSummary,
        credits: allCredits,
        paymentRecords: filteredPayments
      }
    }

    // Fallback: devolver todos los datos (p. ej. range sin fechas aún)
    return {
      sales: allSales,
      egresos: egresosSummary,
      credits: allCredits,
      paymentRecords: allPaymentRecords
    }
  }, [allSales, egresosSummary, allCredits, allPaymentRecords, effectiveDateFilter, specificDate, dateRangeStart, dateRangeEnd])

  // Cargar productos específicos bajo demanda cuando cambien las ventas o garantías
  useEffect(() => {
    // Cargar productos de ventas activas para cálculo de ganancias
    const saleProductIds = allSales
      .filter(sale => sale.status !== 'cancelled' && sale.status !== 'draft')
      .flatMap(sale => sale.items?.map(item => item.productId) || [])
      .filter(Boolean) as string[]
    
    const allProductIds = Array.from(new Set(saleProductIds))
    
    if (allProductIds.length > 0) {
      loadSpecificProducts(allProductIds)
    }
  }, [allSales, loadSpecificProducts])

  // Calcular métricas del dashboard
  const metrics = useMemo(() => {
    const { sales, egresos, credits, paymentRecords } = filteredData

    // Ingresos por ventas (nuevas ventas) - excluir canceladas y borradores
    const activeSalesForRevenue = sales.filter(sale => sale.status !== 'cancelled' && sale.status !== 'draft')
    const salesRevenue = activeSalesForRevenue.reduce((sum, sale) => sum + sale.total, 0)
    const productsSalesRevenue = activeSalesForRevenue.reduce(
      (sum, sale) => sum + (sale.subtotal || 0) + (sale.tax || 0),
      0
    )
    const transportRevenue = activeSalesForRevenue.reduce(
      (sum, sale) => sum + (sale.transportPrice || 0),
      0
    )

    // Filtrar abonos cancelados (los abonos de facturas canceladas se marcan como 'cancelled' en payment_records)
    const validPaymentRecords = paymentRecords.filter(payment => {
      // Excluir abonos que estén marcados como cancelados
      return payment.status !== 'cancelled'
    })

    // Ingresos por abonos de créditos (solo de facturas/créditos activos)
    const creditPaymentsRevenue = validPaymentRecords.reduce((sum, payment) => sum + payment.amount, 0)

    // Ingresos por método de pago (ventas + abonos); domicilio incluido en el total, desglosado en products/transport
    const activeSales = sales.filter(sale => sale.status !== 'cancelled' && sale.status !== 'draft')

    const channels: Record<PaymentChannel, ChannelRevenue> = {
      cash: emptyChannelRevenue(),
      nequi: emptyChannelRevenue(),
      bancolombia: emptyChannelRevenue(),
      transfer: emptyChannelRevenue(),
      card: emptyChannelRevenue(),
    }

    activeSales.forEach(sale => {
      if (sale.payments && sale.payments.length > 0) {
        sale.payments.forEach(payment => {
          const channel = mapPaymentChannel(payment.paymentType)
          if (!channel) return
          const amount = payment.amount || 0
          const split = splitSalePayment(sale, amount)
          addChannelPayment(channels, channel, amount, split.products, split.transport)
        })
      } else {
        const amount = sale.total || 0
        const channel = mapPaymentChannel(sale.paymentMethod)
        if (!channel || amount <= 0) return
        const split = splitSalePayment(sale, amount)
        addChannelPayment(channels, channel, amount, split.products, split.transport)
      }
    })

    const isCash = (p: { paymentMethod?: string }) => p.paymentMethod === 'cash' || p.paymentMethod === 'efectivo'
    const isNequi = (p: { paymentMethod?: string }) => p.paymentMethod === 'nequi'
    const isBancolombia = (p: { paymentMethod?: string }) => p.paymentMethod === 'bancolombia'
    const isOtherTransfer = (p: { paymentMethod?: string }) => p.paymentMethod === 'transfer'
    const isCard = (p: { paymentMethod?: string }) => p.paymentMethod === 'card'

    validPaymentRecords.filter(isCash).forEach(payment => {
      addChannelPayment(channels, 'cash', payment.amount, payment.amount, 0)
    })
    validPaymentRecords.filter(isNequi).forEach(payment => {
      addChannelPayment(channels, 'nequi', payment.amount, payment.amount, 0)
    })
    validPaymentRecords.filter(isBancolombia).forEach(payment => {
      addChannelPayment(channels, 'bancolombia', payment.amount, payment.amount, 0)
    })
    validPaymentRecords.filter(isOtherTransfer).forEach(payment => {
      addChannelPayment(channels, 'transfer', payment.amount, payment.amount, 0)
    })
    validPaymentRecords.filter(isCard).forEach(payment => {
      addChannelPayment(channels, 'card', payment.amount, payment.amount, 0)
    })

    const cashRevenue = channels.cash.total
    const nequiRevenue = channels.nequi.total
    const bancolombiaRevenue = channels.bancolombia.total
    const otherTransferRevenue = channels.transfer.total
    const cardRevenue = channels.card.total
    const cashProductsRevenue = channels.cash.products
    const cashTransportRevenue = channels.cash.transport
    const transferProductsRevenue =
      channels.nequi.products + channels.bancolombia.products + channels.transfer.products
    const transferTransportRevenue =
      channels.nequi.transport + channels.bancolombia.transport + channels.transfer.transport
    const cardProductsRevenue = channels.card.products
    const cardTransportRevenue = channels.card.transport
    const totalCollectedProductsRevenue =
      cashProductsRevenue + transferProductsRevenue + cardProductsRevenue
    const totalCollectedTransportRevenue =
      cashTransportRevenue + transferTransportRevenue + cardTransportRevenue

    const transferRevenue = nequiRevenue + bancolombiaRevenue + otherTransferRevenue

    // Ingresos totales (efectivo + transferencia + tarjeta - dinero que ha ingresado)
    const totalRevenue = cashRevenue + transferRevenue + cardRevenue

    // Calcular el saldo pendiente de créditos (no el total de ventas a crédito)
    // Solo contar créditos que están pendientes o parciales (no completados)
    const creditRevenue = credits
      .filter(c => c.status === 'pending' || c.status === 'partial')
      .reduce((sum, credit) => sum + (credit.pendingAmount || 0), 0)

    // Calcular el total real de métodos de pago conocidos
    const knownPaymentMethodsTotal = cashRevenue + transferRevenue + cardRevenue + creditRevenue

    // Productos más vendidos - Excluir ventas canceladas
    const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {}
    activeSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = {
              name: item.productName,
              quantity: 0,
              revenue: 0
            }
          }
          productSales[item.productId].quantity += item.quantity
          productSales[item.productId].revenue += item.total ?? item.unitPrice * item.quantity
        })
      }
    })

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    // Egresos del período
    const totalEgresos = egresos?.totalAmount ?? egresosSummary.totalAmount ?? 0
    const egresosCount = egresos?.count ?? egresosSummary.count ?? 0

    // Créditos pendientes y parciales (dinero afuera) - TODOS los créditos, no filtrados por fecha
    // Excluir créditos cancelados (que tienen totalAmount y pendingAmount en 0)
    const pendingCredits = allCredits.filter(c =>
      (c.status === 'pending' || c.status === 'partial') &&
      !(c.totalAmount === 0 && c.pendingAmount === 0)
    )
    const totalDebt = pendingCredits.reduce((sum, credit) => sum + (credit.pendingAmount || credit.totalAmount || 0), 0)
    const recentPendingCredits = pendingCredits
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || '').getTime()
        const dateB = new Date(b.updatedAt || b.createdAt || '').getTime()
        return dateB - dateA
      })
      .slice(0, 4)
      .map((credit) => {
        const creditDate = new Date(credit.updatedAt || credit.createdAt || '')
        const dateLabel = creditDate.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short'
        }).replace('.', '')
        const timeLabel = creditDate.toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit'
        })
        return {
          id: credit.id,
          clientName: credit.clientName || 'Cliente',
          reference: credit.invoiceNumber,
          status: credit.status,
          pendingAmount: credit.pendingAmount || credit.totalAmount || 0,
          dateLabel,
          timeLabel
        }
      })

    // Créditos del día actual (para usuarios no-superadmin)
    const dailyCredits = credits.filter(c =>
      (c.status === 'pending' || c.status === 'partial') &&
      !(c.totalAmount === 0 && c.pendingAmount === 0)
    )
    const dailyCreditsDebt = dailyCredits.reduce((sum, credit) => sum + (credit.pendingAmount || credit.totalAmount || 0), 0)
    const dailyCreditsCount = dailyCredits.length

    // Créditos vencidos (para información adicional de vendedores)
    const overdueCredits = allCredits.filter(c => {
      if (c.status !== 'pending' && c.status !== 'partial') return false
      if (c.totalAmount === 0 && c.pendingAmount === 0) return false
      if (!c.dueDate) return false

      const dueDate = new Date(c.dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      return dueDate < today
    })
    const overdueCreditsCount = overdueCredits.length
    const overdueCreditsDebt = overdueCredits.reduce((sum, credit) => sum + (credit.pendingAmount || credit.totalAmount || 0), 0)

    // Clientes únicos que han comprado en el período seleccionado - Excluir ventas canceladas
    const uniqueClients = new Set(activeSales.map(sale => sale.clientId)).size

    // Ganancia bruta por tipo de cliente (mayorista vs cliente final)
    const clientTypeById = new Map(allClients.map((c) => [c.id, c.type]))
    let grossProfitRetail = 0
    let grossProfitWholesale = 0

    const profitForSale = (sale: (typeof activeSales)[number]) => {
      if (sale.paymentMethod === 'credit') {
        const associatedCredit = allCredits.find((c) => c.saleId === sale.id)
        if (!associatedCredit || associatedCredit.status !== 'completed') {
          return 0
        }
      }
      if (!sale.items?.length) return 0

      return sale.items.reduce((itemProfit, item) => {
        const product =
          specificProductsCache.get(item.productId) || allProducts.find((p) => p.id === item.productId)
        const cost = product?.cost || 0
        const baseTotal = item.quantity * item.unitPrice
        const discountAmount =
          item.discountType === 'percentage'
            ? (baseTotal * (item.discount || 0)) / 100
            : item.discount || 0
        const salePriceAfterDiscount = Math.max(0, baseTotal - discountAmount)
        const realUnitPrice = item.quantity > 0 ? salePriceAfterDiscount / item.quantity : 0
        return itemProfit + (realUnitPrice - cost) * item.quantity
      }, 0)
    }

    activeSales.forEach((sale) => {
      const saleProfit = profitForSale(sale)
      if (saleProfit === 0) return
      const clientType = clientTypeById.get(sale.clientId)
      if (isWholesaleClientType(clientType)) {
        grossProfitWholesale += saleProfit
      } else {
        grossProfitRetail += saleProfit
      }
    })

    const grossProfit = grossProfitRetail + grossProfitWholesale

    // Facturas anuladas: usar allSales (misma ventana que getDashboardSales), no filteredData.sales.
    // filteredData para "hoy" solo incluye ventas creadas ese día; una factura anulada suele crearse antes.
    const cancelledSales = allSales.filter(sale => sale.status === 'cancelled').length
    const lostValue = allSales
      .filter(sale => sale.status === 'cancelled')
      .reduce((sum, sale) => sum + sale.total, 0)

    // OPTIMIZADO: Usar métricas optimizadas de inventario en lugar de calcular desde allProducts
    // Estas métricas ya vienen de getInventoryMetrics() que es mucho más rápido
    const totalStockUnits = optimizedMetrics.inventorySummary?.totalStockUnits ?? 0
    const lowStockProducts = optimizedMetrics.inventorySummary?.lowStockCount ?? 0
    const totalStockInvestment = optimizedMetrics.inventorySummary?.totalStockInvestment ?? 0
    
    // Para métricas que no están en getInventoryMetrics, usar valores por defecto o calcular desde productos cargados
    // Nota: potentialInvestment y estimatedSalesValue requieren todos los productos, 
    // pero como no los cargamos, usamos valores aproximados o 0
    const potentialInvestment = 0 // No calculamos esto sin todos los productos
    const estimatedSalesValue = 0 // No calculamos esto sin todos los productos
    const productsForCalculation = allProducts // Solo productos cargados bajo demanda

    // Datos para gráficos - Debe coincidir exactamente con totalRevenue (efectivo + transferencia + abonos)
    // Excluir ventas canceladas y borradores del gráfico
    // IMPORTANTE: Usar la misma lógica que totalRevenue para que los números coincidan

    // Función helper para normalizar fecha y obtener formato consistente
    const getDateKey = (dateInput: Date | string): string => {
      const date = new Date(dateInput)
      // Normalizar a medianoche en hora local para evitar problemas de zona horaria
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      return normalizedDate.toLocaleDateString('es-CO', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit'
      })
    }

    // IMPORTANTE: Calcular salesByDay usando EXACTAMENTE la misma lógica que cashRevenue + transferRevenue
    // Primero, calcular ventas por día (igual que arriba)
    const salesByDay = activeSales.reduce((acc: { [key: string]: { amount: number, count: number } }, sale) => {
      const date = getDateKey(sale.createdAt)
      if (!acc[date]) {
        acc[date] = { amount: 0, count: 0 }
      }

      // Usar EXACTAMENTE la misma lógica que cashRevenue y transferRevenue arriba (líneas 425-440)
      if (sale.paymentMethod === 'cash') {
        acc[date].amount += sale.total
        acc[date].count += 1
      } else if (
        sale.paymentMethod === 'transfer' ||
        sale.paymentMethod === 'nequi' ||
        sale.paymentMethod === 'bancolombia' ||
        sale.paymentMethod === 'card'
      ) {
        acc[date].amount += sale.total
        acc[date].count += 1
      } else if (sale.paymentMethod === 'mixed' && sale.payments) {
        // Para pagos mixtos, desglosar igual que arriba (líneas 430-438)
        sale.payments.forEach(payment => {
          if (payment.paymentType === 'cash') {
            acc[date].amount += payment.amount || 0
          } else if (
            payment.paymentType === 'transfer' ||
            payment.paymentType === 'nequi' ||
            payment.paymentType === 'bancolombia'
          ) {
            acc[date].amount += payment.amount || 0
          } else if (payment.paymentType === 'card') {
            acc[date].amount += payment.amount || 0
          }
        })
        // Solo incrementar count si hay al menos un pago en efectivo/transferencia
        const hasRealPayment = sale.payments.some(
          (p) =>
            p.paymentType === 'cash' ||
            p.paymentType === 'transfer' ||
            p.paymentType === 'nequi' ||
            p.paymentType === 'bancolombia' ||
            p.paymentType === 'card'
        )
        if (hasRealPayment) {
          acc[date].count += 1
        }
      }
      // No contar ventas a crédito (paymentMethod === 'credit') en el gráfico

      return acc
    }, {})

    // Agregar abonos de créditos al gráfico (EXACTAMENTE igual que se suma arriba en líneas 442-449)
    // IMPORTANTE: Usar los mismos validPaymentRecords que se usan para calcular totalRevenue
    // Esto asegura que el gráfico muestre exactamente lo mismo que totalRevenue
    validPaymentRecords.forEach(payment => {
      const date = getDateKey(payment.paymentDate)
      if (!salesByDay[date]) {
        salesByDay[date] = { amount: 0, count: 0 }
      }
      // Sumar abonos en efectivo y transferencia (EXACTAMENTE igual que líneas 443-449)
      if (payment.paymentMethod === 'cash' || payment.paymentMethod === 'efectivo') {
        salesByDay[date].amount += payment.amount
      } else if (
        payment.paymentMethod === 'transfer' ||
        payment.paymentMethod === 'nequi' ||
        payment.paymentMethod === 'bancolombia' ||
        payment.paymentMethod === 'card'
      ) {
        salesByDay[date].amount += payment.amount
      }
      // No incrementar count para abonos, solo para ventas nuevas
    })

    // Debug detallado para fecha específica
    // Verificar que los totales coincidan
    const totalFromChart = Object.values(salesByDay).reduce((sum, day) => sum + day.amount, 0)
    if (Math.abs(totalFromChart - totalRevenue) > 1) {
      console.error('❌ [DASHBOARD] Discrepancia entre gráfico y totalRevenue:', {
        totalFromChart,
        totalRevenue,
        difference: totalFromChart - totalRevenue,
        salesByDayKeys: Object.keys(salesByDay),
        validPaymentRecordsCount: validPaymentRecords.length,
        validPaymentRecordsTotal: validPaymentRecords.reduce((sum, p) => sum + p.amount, 0),
        cashRevenue,
        transferRevenue,
        cardRevenue,
        activeSalesCount: activeSales.length,
        salesByDayDetails: Object.entries(salesByDay).map(([date, data]) => ({
          date,
          amount: data.amount,
          count: data.count
        }))
      })
    }

    // Generar todos los días del período seleccionado
    // IMPORTANTE: Usar getDateKey() para asegurar que las fechas coincidan con salesByDay
    const generateAllDays = () => {
      const days = []
      const today = new Date()

      if (effectiveDateFilter === 'specific' && specificDate) {
        const dateStr = getDateKey(specificDate)
        days.push(dateStr)
      } else if (effectiveDateFilter === 'today') {
        const dateStr = getDateKey(today)
        days.push(dateStr)
      } else if (effectiveDateFilter === 'range' && dateRangeStart && dateRangeEnd) {
        const start = new Date(dateRangeStart.getFullYear(), dateRangeStart.getMonth(), dateRangeStart.getDate())
        const end = new Date(dateRangeEnd.getFullYear(), dateRangeEnd.getMonth(), dateRangeEnd.getDate())
        for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          days.push(getDateKey(new Date(d)))
        }
      } else {
        // Para "Todo el Tiempo", mostrar los últimos 30 días
        const startDate = new Date(today)
        startDate.setDate(today.getDate() - 29)

        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
          const dateStr = getDateKey(d)
          days.push(dateStr)
        }
      }

      return days
    }

    const allDays = generateAllDays()
    const salesChartData = allDays
      .map(date => {
        const data = salesByDay[date] || { amount: 0, count: 0 }
        return {
          date,
          amount: data.amount,
          count: data.count,
          average: data.count > 0 ? data.amount / data.count : 0
        }
      })
      .filter(day => day.amount > 0) // Solo mostrar días con ventas

    const paymentMethodData = [
      { name: 'Efectivo', value: cashRevenue, color: '#3dab1f' },
      { name: 'Transferencia', value: transferRevenue, color: '#52525b' },
      { name: 'Crédito', value: creditRevenue, color: '#71717a' },
    ].filter(item => item.value > 0)

    const topProductsChart = topProducts.slice(0, 5).map(product => ({
      name: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
      cantidad: product.quantity,
      ingresos: product.revenue
    }))

    return {
      // Total y por método deben incluir SIEMPRE ventas + abonos (no usar solo resumen de ventas)
      totalRevenue,
      salesRevenue: salesRevenue,
      productsSalesRevenue,
      transportRevenue,
      cashProductsRevenue,
      cashTransportRevenue,
      transferProductsRevenue,
      transferTransportRevenue,
      cardProductsRevenue,
      cardTransportRevenue,
      totalCollectedProductsRevenue,
      totalCollectedTransportRevenue,
      creditPaymentsRevenue,
      cashRevenue,
      transferRevenue,
      nequiRevenue,
      bancolombiaRevenue,
      otherTransferRevenue,
      cardRevenue,
      creditRevenue,
      knownPaymentMethodsTotal,
      // Mismo período que totalRevenue (filteredData), no salesSummary: ese contaba la ventana cruda de getDashboardSales (p. ej. 7 días con filtro "Hoy").
      totalSales: activeSales.length,
      topProducts,
      totalEgresos,
      egresosCount,
      recentPendingCredits,
      totalDebt: optimizedMetrics.creditsSummary?.totalDebt ?? totalDebt,
      pendingCreditsCount: optimizedMetrics.creditsSummary?.pendingCreditsCount ?? pendingCredits.length,
      dailyCreditsDebt,
      dailyCreditsCount,
      overdueCreditsCount,
      overdueCreditsDebt,
      uniqueClients,
      grossProfit,
      grossProfitRetail,
      grossProfitWholesale,
      cancelledSales,
      lostValue,
      lowStockProducts: optimizedMetrics.inventorySummary?.lowStockCount ?? lowStockProducts,
      totalProducts: optimizedMetrics.inventorySummary?.totalStockUnits ?? totalStockUnits,
      totalProductsCount: optimizedMetrics.inventorySummary?.totalProductsCount ?? 0, // Usar métrica optimizada si está disponible
      totalStockInvestment: optimizedMetrics.inventorySummary?.totalStockInvestment ?? totalStockInvestment,
      potentialInvestment, // No disponible sin cargar todos los productos
      estimatedSalesValue, // No disponible sin cargar todos los productos
      totalClients: allClients.length,
      salesChartData,
      paymentMethodData,
      topProductsChart
    }
  }, [filteredData, allSales, allProducts, allClients, egresosSummary, allCredits, optimizedMetrics, specificProductsCache])

  const incomeTrend = useMemo(() => {
    type Bucket = { label: string; cash: number; other: number }
    const isOtherChannel = (t?: string) => t === 'transfer' || t === 'nequi' || t === 'bancolombia' || t === 'card'
    const isCashChannel = (t?: string) => t === 'cash' || t === 'efectivo'

    const addSale = (bucket: Bucket, sale: Sale) => {
      if (sale.paymentMethod === 'cash') {
        bucket.cash += sale.total || 0
      } else if (isOtherChannel(sale.paymentMethod)) {
        bucket.other += sale.total || 0
      } else if (sale.paymentMethod === 'mixed' && sale.payments) {
        sale.payments.forEach(payment => {
          if (payment.paymentType === 'cash') bucket.cash += payment.amount || 0
          else if (isOtherChannel(payment.paymentType)) bucket.other += payment.amount || 0
        })
      }
    }

    const addPayment = (bucket: Bucket, payment: { status?: string; paymentMethod?: string; amount?: number }) => {
      if (payment.status === 'cancelled') return
      if (isCashChannel(payment.paymentMethod)) bucket.cash += payment.amount || 0
      else if (isOtherChannel(payment.paymentMethod)) bucket.other += payment.amount || 0
    }

    if (effectiveDateFilter === 'all') {
      const buckets: Bucket[] = Array.from({ length: 12 }, (_, m) => ({
        label: new Date(selectedYear, m, 1).toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
        cash: 0,
        other: 0,
      }))
      filteredData.sales.forEach((sale: Sale) => {
        if (sale.status === 'cancelled' || sale.status === 'draft') return
        const date = new Date(sale.createdAt)
        if (date.getFullYear() !== selectedYear) return
        addSale(buckets[date.getMonth()], sale)
      })
      filteredData.paymentRecords.forEach((payment: any) => {
        const date = new Date(payment.paymentDate)
        if (date.getFullYear() !== selectedYear) return
        addPayment(buckets[date.getMonth()], payment)
      })
      return { ready: true, data: buckets }
    }

    if (effectiveDateFilter === 'range' && (!dateRangeStart || !dateRangeEnd)) {
      return { ready: false, data: [] as Bucket[] }
    }

    const days: Date[] = []
    if (effectiveDateFilter === 'range' && dateRangeStart && dateRangeEnd) {
      const a = new Date(dateRangeStart.getFullYear(), dateRangeStart.getMonth(), dateRangeStart.getDate())
      const b = new Date(dateRangeEnd.getFullYear(), dateRangeEnd.getMonth(), dateRangeEnd.getDate())
      const [start, end] = a <= b ? [a, b] : [b, a]
      for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        days.push(new Date(cursor))
      }
    } else {
      const reference = effectiveDateFilter === 'specific' && specificDate ? new Date(specificDate) : new Date()
      reference.setHours(0, 0, 0, 0)
      for (let i = INCOME_TREND_CHART_DAYS - 1; i >= 0; i--) {
        const day = new Date(reference)
        day.setDate(day.getDate() - i)
        days.push(day)
      }
    }

    const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    const buckets = new Map<string, Bucket>(
      days.map(d => [
        keyOf(d),
        { label: d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }).replace('.', ''), cash: 0, other: 0 },
      ])
    )

    const currentStoreId = getCurrentUserStoreId()
    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
    const isMicroStore = Boolean(currentStoreId && currentStoreId !== MAIN_STORE_ID)

    allSales.forEach((sale: Sale) => {
      if (isMicroStore && sale.storeId !== currentStoreId) return
      if (sale.status === 'cancelled' || sale.status === 'draft') return
      const bucket = buckets.get(keyOf(new Date(sale.createdAt)))
      if (bucket) addSale(bucket, sale)
    })

    allPaymentRecords.forEach((payment: any) => {
      if (isMicroStore && payment.storeId !== currentStoreId) return
      const bucket = buckets.get(keyOf(new Date(payment.paymentDate)))
      if (bucket) addPayment(bucket, payment)
    })

    return { ready: true, data: days.map(d => buckets.get(keyOf(d))!) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDateFilter, selectedYear, filteredData, allSales, allPaymentRecords, specificDate, dateRangeStart, dateRangeEnd, user?.storeId])

  // Función helper para formatear moneda con opción de ocultar
  const formatCurrency = (amount: number): string => {
    if (hideNumbers) {
      return '$ ••••••'
    }
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Función helper para formatear números sin símbolo de moneda
  const formatNumber = (num: number): string => {
    if (hideNumbers) {
      return '••••'
    }
    return num.toLocaleString('es-CO')
  }

  const periodLabelShort = useMemo(() => {
    if (effectiveDateFilter === 'today') return 'Hoy'
    if (effectiveDateFilter === 'specific') {
      return specificDate
        ? specificDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Fecha específica'
    }
    if (effectiveDateFilter === 'range') {
      return dateRangeStart && dateRangeEnd
        ? `${dateRangeStart.toLocaleDateString('es-CO')} — ${dateRangeEnd.toLocaleDateString('es-CO')}`
        : 'Rango de fechas'
    }
    return 'Todos los períodos'
  }, [effectiveDateFilter, specificDate, dateRangeStart, dateRangeEnd])

  // Función para manejar cambio de filtro con indicador de carga
  const handleFilterChange = async (newFilter: DateFilter) => {
    if (newFilter === 'specific' && !specificDate) {
      setDateFilter(newFilter)
      return
    }
    if (newFilter === 'range') {
      setDateFilter(newFilter)
      if (dateRangeStart && dateRangeEnd && dateRangeStart <= dateRangeEnd) {
        setIsFiltering(true)
        loadDashboardData(true, 'range', null, undefined, dateRangeStart, dateRangeEnd).then(() => setIsFiltering(false))
      }
      return
    }

    setIsFiltering(true)
    setDateFilter(newFilter)

    let dateToUse = specificDate
    let yearToUse = selectedYear

    if (newFilter !== 'specific') {
      setSpecificDate(null)
      dateToUse = null
    }
    if (newFilter !== 'range') {
      setDateRangeStart(null)
      setDateRangeEnd(null)
    }

    if (newFilter === 'all') {
      const currentYear = new Date().getFullYear()
      setSelectedYear(currentYear)
      yearToUse = currentYear
    }

    loadDashboardData(true, newFilter, dateToUse, yearToUse).then(() => {
      setIsFiltering(false)
    })
  }

  // Función para manejar cambio de año
  const handleYearChange = (year: number) => {
    setSelectedYear(year)
    setIsFiltering(true)
    // Recargar datos con el nuevo año, pasando el año directamente para evitar problemas de timing
    loadDashboardData(true, dateFilter, specificDate, year).then(() => {
      setIsFiltering(false)
    })
  }

  // Función para manejar selección de fecha específica
  const handleDateSelect = (date: Date | null) => {
    setSpecificDate(date)
    if (date) {
      setIsFiltering(true)
      setDateFilter('specific')
      loadDashboardData(true, 'specific', date).then(() => {
        setIsFiltering(false)
      })
    } else {
      setIsFiltering(false)
    }
  }

  // Rango: al cambiar "desde" o "hasta" normalizamos orden y recargamos siempre que existan ambas fechas
  const handleRangeStartSelect = (date: Date | null) => {
    setDateRangeStart(date)
    if (date && dateRangeEnd) {
      const start = date <= dateRangeEnd ? date : dateRangeEnd
      const end = date >= dateRangeEnd ? date : dateRangeEnd
      setDateRangeStart(start)
      setDateRangeEnd(end)
      setIsFiltering(true)
      setDateFilter('range')
      loadDashboardData(true, 'range', null, undefined, start, end).then(() => setIsFiltering(false))
    }
  }
  const handleRangeEndSelect = (date: Date | null) => {
    setDateRangeEnd(date)
    if (date && dateRangeStart) {
      const start = dateRangeStart <= date ? dateRangeStart : date
      const end = date >= dateRangeStart ? date : dateRangeStart
      setDateRangeStart(start)
      setDateRangeEnd(end)
      setIsFiltering(true)
      setDateFilter('range')
      loadDashboardData(true, 'range', null, undefined, start, end).then(() => setIsFiltering(false))
    }
  }

  // Mostrar skeleton loader durante la carga inicial
  if (isInitialLoading && allSales.length === 0) {
    return (
      <RoleProtectedRoute module="dashboard" requiredAction="view">
        <div className="min-h-screen py-4 md:py-6">
          <div className="mb-6 border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <div className="h-6 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="px-3 py-3">
                <div className="h-7 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="h-[300px] animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900/60" />
            <div className="h-[300px] animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900/60" />
          </div>
          <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Cargando reportes...</p>
        </div>
      </RoleProtectedRoute>
    )
  }

  const isVendedorUser = user?.role === 'vendedor' || (user?.role as string) === 'Vendedor'

  const trendSubtitle =
    effectiveDateFilter === 'all'
      ? `Por mes · ${selectedYear}`
      : effectiveDateFilter === 'range' && dateRangeStart && dateRangeEnd
        ? `Por día · ${dateRangeStart.toLocaleDateString('es-CO')} — ${dateRangeEnd.toLocaleDateString('es-CO')}`
        : `Últimos ${INCOME_TREND_CHART_DAYS} días`

  const methodChartData = [
    { label: 'Efectivo', value: metrics.cashRevenue },
    { label: 'Nequi', value: metrics.nequiRevenue },
    { label: 'Bancolombia', value: metrics.bancolombiaRevenue },
    { label: 'Otra transf.', value: metrics.otherTransferRevenue },
    { label: 'Tarjeta', value: metrics.cardRevenue },
  ]
  const hasMethodIncome = methodChartData.some((m) => m.value > 0)

  const alerts: { tone: 'success' | 'warning' | 'danger' | 'info'; title: string; body: string; onClick?: () => void }[] = []
  if (canViewCredits && metrics.overdueCreditsCount > 0) {
    alerts.push({
      tone: 'danger',
      title:
        metrics.overdueCreditsCount === 1
          ? '1 crédito vencido'
          : `${metrics.overdueCreditsCount} créditos vencidos`,
      body: `${formatCurrency(metrics.overdueCreditsDebt)} por cobrar con la fecha de pago vencida.`,
      onClick: goToCredits,
    })
  }
  if (metrics.cancelledSales > 0) {
    alerts.push({
      tone: 'warning',
      title:
        metrics.cancelledSales === 1 ? '1 factura anulada' : `${metrics.cancelledSales} facturas anuladas`,
      body: `Valor anulado: ${formatCurrency(metrics.lostValue)}.`,
      onClick: () => setShowCancelledModal(true),
    })
  }
  if (isSuperAdmin && metrics.lowStockProducts > 0) {
    alerts.push({
      tone: 'warning',
      title: `${formatNumber(metrics.lowStockProducts)} productos con stock bajo`,
      body: 'Revisa el inventario para reponer a tiempo.',
      onClick: () => router.push('/inventory/products'),
    })
  }
  if ((metrics.totalEgresos || 0) > 0) {
    alerts.push({
      tone: 'info',
      title: 'Egresos del período',
      body: `${formatCurrency(metrics.totalEgresos)} en ${metrics.egresosCount} ${metrics.egresosCount === 1 ? 'egreso' : 'egresos'}.`,
      onClick: () => router.push('/egresos'),
    })
  }
  if (alerts.length === 0) {
    alerts.push({
      tone: 'success',
      title: 'Todo en orden',
      body: 'No hay créditos vencidos ni facturas anuladas en este período.',
    })
  }

  const chartCaption = (text: string) => (
    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{text}</p>
  )

  const trendBlock = (
    <div className="min-w-0">
      <ReportSectionTitle
        title={effectiveDateFilter === 'all' ? 'Ingresos por mes: efectivo vs. transferencias' : 'Ingresos por día: efectivo vs. transferencias'}
        subtitle={trendSubtitle}
      />
      {incomeTrend.ready ? (
        <>
          <ReportBarChart
            data={incomeTrend.data}
            categoryKey="label"
            series={[
              { key: 'cash', name: 'Efectivo', color: REPORT_CHART_COLORS.primary },
              { key: 'other', name: 'Transferencias y tarjeta', color: REPORT_CHART_COLORS.secondary },
            ]}
            isDarkMode={isDarkMode}
            hideValues={hideNumbers}
            height={280}
          />
          {chartCaption('Ventas cobradas y abonos de créditos · no incluye ventas a crédito sin abonar')}
        </>
      ) : (
        <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Selecciona fechas de inicio y fin para ver los ingresos día a día en ese período.
        </p>
      )}
    </div>
  )

  const alertsBlock = (
    <div className="min-w-0">
      <ReportSectionTitle title="Alertas" />
      <div className="space-y-1">
        {alerts.map((alert) => (
          <ReportCallout key={alert.title} tone={alert.tone} title={alert.title} onClick={alert.onClick}>
            {alert.body}
          </ReportCallout>
        ))}
      </div>
    </div>
  )

  const methodBlock = (
    <div className="min-w-0">
      <ReportSectionTitle title="Ingresos por método de pago" subtitle={periodLabelShort} />
      {hasMethodIncome ? (
        <>
          <ReportBarChart
            data={methodChartData}
            categoryKey="label"
            series={[{ key: 'value', name: 'Ingresos', color: REPORT_CHART_COLORS.primary }]}
            isDarkMode={isDarkMode}
            hideValues={hideNumbers}
            showValues
            height={240}
          />
          {chartCaption('Ventas y abonos cobrados en el período, por canal de pago')}
        </>
      ) : (
        <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">Sin ingresos en este período.</p>
      )}
    </div>
  )

  const topProductsBlock = (
    <div className="min-w-0">
      <ReportSectionTitle title="Productos más vendidos" subtitle={periodLabelShort} />
      {metrics.topProducts.length > 0 ? (
        <ReportTable
          headers={['Producto', 'Unidades', 'Ingresos']}
          align={['left', 'right', 'right']}
          rows={metrics.topProducts.map((product) => [
            <span key="n" className="font-medium">{product.name}</span>,
            formatNumber(product.quantity),
            formatCurrency(product.revenue),
          ])}
        />
      ) : (
        <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">Sin ventas en este período.</p>
      )}
    </div>
  )

  const creditsBlock =
    canViewCredits && metrics.recentPendingCredits.length > 0 ? (
      <div className="min-w-0">
        <ReportSectionTitle
          title="Créditos pendientes recientes"
          subtitle={`${formatCurrency(metrics.totalDebt || 0)} por cobrar en total`}
          action={
            <Button variant="ghost" size="sm" onClick={goToCredits}>
              Ver créditos
            </Button>
          }
        />
        <ReportTable
          headers={['Cliente', 'Factura', 'Pendiente', 'Estado', 'Última actualización']}
          align={['left', 'left', 'right', 'left', 'left']}
          rowTone={metrics.recentPendingCredits.map((c) => (c.status === 'partial' ? 'warning' : 'info'))}
          onRowClick={goToCredits}
          rows={metrics.recentPendingCredits.map((credit) => [
            <span key="c" className="font-medium">{credit.clientName}</span>,
            credit.reference || '—',
            formatCurrency(credit.pendingAmount),
            credit.status === 'partial' ? 'Parcial' : 'Pendiente',
            `${credit.dateLabel} · ${credit.timeLabel}`,
          ])}
        />
      </div>
    ) : null

  return (
    <RoleProtectedRoute module="dashboard" requiredAction="view">
      <div className="relative min-h-screen py-4 md:py-6">
        {(isRefreshing || isFiltering) && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-neutral-950/80">
            <div className="-mt-[200px] flex flex-col items-center justify-center">
              <div className="mb-4 h-12 w-12">
                <div className="h-full w-full animate-spin rounded-full border-2 border-zinc-200 border-t-brand-600 dark:border-zinc-700 dark:border-t-brand-500" />
              </div>
              <p className="text-base font-medium text-zinc-700 dark:text-zinc-300">
                {isFiltering ? 'Cargando datos del día...' : 'Actualizando reportes...'}
              </p>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">Reportes</h1>
              {(isRefreshing || isFiltering) && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Actualizando…</span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {periodLabelShort}
              {' · '}
              {currentStoreName && !isMainStoreUser(user)
                ? `Solo datos de ${currentStoreName}${currentStoreCity ? ` — ${currentStoreCity}` : ''}`
                : 'Resumen de la tienda principal'}
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end lg:flex-nowrap">
            {isSuperAdmin ? (
              <>
                <div
                  className="casa-artesanal-preserve-surface flex h-8 shrink-0 gap-0.5 rounded-lg bg-zinc-100 p-0.5 dark:bg-white/[0.06]"
                  role="group"
                  aria-label="Período de reportes"
                >
                  {(['today', 'specific', 'range', 'all'] as DateFilter[]).map((filter) => {
                    const short =
                      filter === 'today' ? 'Hoy' : filter === 'specific' ? 'Fecha' : filter === 'range' ? 'Rango' : 'Año'
                    const active = dateFilter === filter
                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => void handleFilterChange(filter)}
                        className={cn(
                          'flex items-center rounded-md border px-3 text-[13px] transition-colors',
                          active
                            ? 'border-zinc-200 bg-white font-semibold text-zinc-900 dark:border-white/[0.12] dark:bg-[#0a0a0b] dark:text-white'
                            : 'border-transparent font-medium text-zinc-500 hover:text-zinc-800 dark:text-white/50 dark:hover:text-white/90'
                        )}
                      >
                        {short}
                      </button>
                    )
                  })}
                </div>

                {dateFilter === 'all' && (
                  <div className="relative h-8 shrink-0 overflow-hidden rounded-md border border-zinc-200 dark:border-white/[0.12] sm:min-w-[92px]">
                    <select
                      value={selectedYear}
                      onChange={(e) => handleYearChange(Number(e.target.value))}
                      className={dashFilterSelectClass}
                      aria-label="Año"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronDown className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} aria-hidden />
                    </div>
                  </div>
                )}

                {dateFilter === 'specific' && (
                  <DatePicker
                    compact
                    selectedDate={specificDate}
                    onDateSelect={handleDateSelect}
                    placeholder="Elegir fecha"
                    className="w-full shrink-0 sm:w-36"
                  />
                )}

                {dateFilter === 'range' && (
                  <div className="flex w-full items-center gap-1.5 sm:w-auto">
                    <DatePicker
                      compact
                      selectedDate={dateRangeStart}
                      onDateSelect={handleRangeStartSelect}
                      placeholder="Desde"
                      className="min-w-0 flex-1 sm:w-[8.5rem] sm:flex-none"
                    />
                    <span className="text-xs text-zinc-400 dark:text-white/30">—</span>
                    <DatePicker
                      compact
                      selectedDate={dateRangeEnd}
                      onDateSelect={handleRangeEndSelect}
                      placeholder="Hasta"
                      className="min-w-0 flex-1 sm:w-[8.5rem] sm:flex-none"
                      minDate={dateRangeStart ?? undefined}
                    />
                  </div>
                )}
              </>
            ) : (
              <span className="casa-artesanal-preserve-surface inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-100 px-3 text-[13px] font-medium text-zinc-600 dark:bg-white/[0.06] dark:text-white/70">
                <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                Vista del día actual
              </span>
            )}
            <div className="flex shrink-0 items-center gap-0.5 pl-1">
              <button
                type="button"
                onClick={() => setHideNumbers(!hideNumbers)}
                className={dashIconButtonClass}
                title={hideNumbers ? 'Mostrar números' : 'Ocultar números'}
                aria-label={hideNumbers ? 'Mostrar números' : 'Ocultar números'}
              >
                {hideNumbers ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={dashIconButtonClass}
                title="Actualizar"
                aria-label="Actualizar"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
          <ReportStat
            buttonRef={revenueTileRef}
            label="Total ingresos"
            value={formatCurrency(metrics.totalRevenue)}
            hint={`${metrics.totalSales} ventas · clic para ver desglose`}
            ariaExpanded={showRevenueBreakdown}
            onClick={() => {
              setShowTransferBreakdown(false)
              setShowProfitBreakdown(false)
              setShowRevenueBreakdown((prev) => !prev)
            }}
          />
          <ReportStat
            label="Efectivo"
            value={formatCurrency(metrics.cashRevenue)}
            hint={revenueMixSubtitle(metrics.cashProductsRevenue, metrics.cashTransportRevenue, formatCurrency)}
            onClick={() => router.push('/sales')}
          />
          <ReportStat
            buttonRef={transferTileRef}
            label="Transferencia"
            value={formatCurrency(metrics.transferRevenue)}
            hint={revenueMixSubtitle(metrics.transferProductsRevenue, metrics.transferTransportRevenue, formatCurrency)}
            ariaExpanded={showTransferBreakdown}
            onClick={() => {
              setShowRevenueBreakdown(false)
              setShowProfitBreakdown(false)
              setShowTransferBreakdown((prev) => !prev)
            }}
          />
          {user && !isVendedorUser ? (
            isSuperAdmin ? (
              <ReportStat
                label="Facturas anuladas"
                value={metrics.cancelledSales}
                hint={metrics.cancelledSales > 0 ? formatCurrency(metrics.lostValue) : 'Sin anulaciones'}
                tone={metrics.cancelledSales > 0 ? 'danger' : 'neutral'}
                onClick={() => setShowCancelledModal(true)}
              />
            ) : (
              <ReportStat
                label="Crédito"
                value={formatCurrency(metrics.creditRevenue)}
                hint={`${
                  filteredData.credits.filter(
                    (c: any) => (c.status === 'pending' || c.status === 'partial') && (c.pendingAmount || 0) > 0
                  ).length
                } créditos pendientes`}
                onClick={() => router.push('/payments')}
              />
            )
          ) : null}
          {canViewCredits && !isSuperAdmin && (
            <ReportStat
              label="Dinero afuera"
              value={formatCurrency(metrics.dailyCreditsDebt || 0)}
              hint={`${metrics.dailyCreditsCount || 0} créditos del día`}
              onClick={goToCredits}
            />
          )}
          <ReportStat
            label="Egresos"
            value={formatCurrency(metrics.totalEgresos || 0)}
            hint={`${metrics.egresosCount || 0} del período`}
            tone={(metrics.totalEgresos || 0) > 0 ? 'warning' : 'neutral'}
            onClick={() => router.push('/egresos')}
          />
          {isSuperAdmin && (
            <ReportStat
              buttonRef={profitTileRef}
              label="Ganancia bruta"
              value={formatCurrency(metrics.grossProfit)}
              hint="Por ventas del período · clic para ver desglose"
              tone={metrics.grossProfit > 0 ? 'success' : 'neutral'}
              ariaExpanded={showProfitBreakdown}
              onClick={() => {
                setShowRevenueBreakdown(false)
                setShowTransferBreakdown(false)
                setShowProfitBreakdown((prev) => !prev)
              }}
            />
          )}
          {isSuperAdmin && (
            <ReportStat
              label="Stock (inversión)"
              value={formatCurrency(metrics.totalStockInvestment > 0 ? metrics.totalStockInvestment : metrics.potentialInvestment)}
              hint={metrics.totalStockInvestment > 0 ? 'Inversión en stock' : 'Inversión potencial'}
              onClick={() => router.push('/inventory/products')}
            />
          )}
          {isSuperAdmin ? (
            <ReportStat
              label="Créditos por cobrar"
              value={formatCurrency(metrics.totalDebt || 0)}
              hint={`${metrics.pendingCreditsCount || 0} créditos abiertos`}
              onClick={goToCredits}
            />
          ) : (
            <ReportStat
              label="Facturas anuladas"
              value={metrics.cancelledSales}
              hint={metrics.cancelledSales > 0 ? `Valor anulado ${formatCurrency(metrics.lostValue)}` : 'Sin anulaciones'}
              tone={metrics.cancelledSales > 0 ? 'danger' : 'neutral'}
              onClick={() => setShowCancelledModal(true)}
            />
          )}
        </div>

        {isSuperAdmin ? (
          <div className="mb-8 space-y-10">
            <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
              {trendBlock}
              <div className="min-w-0 space-y-6">
                <div className="flex flex-col items-center py-2 text-center">
                  <span className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(metrics.totalSales > 0 ? Math.round(metrics.salesRevenue / metrics.totalSales) : 0)}
                  </span>
                  <span className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                    Ticket promedio por venta · {metrics.totalSales} ventas
                  </span>
                </div>
                {alertsBlock}
              </div>
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              {methodBlock}
              {topProductsBlock}
            </div>
            {creditsBlock}
          </div>
        ) : (
          <div className="mb-8 space-y-10">
            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
              {methodBlock}
              {alertsBlock}
            </div>
            <div className={cn('grid gap-8', creditsBlock && 'lg:grid-cols-2')}>
              {topProductsBlock}
              {creditsBlock}
            </div>
          </div>
        )}

        {showRevenueBreakdown &&
          revenuePopoverPos &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={revenuePopoverRef}
              role="dialog"
              aria-labelledby="revenue-breakdown-title"
              style={{
                position: 'fixed',
                top: revenuePopoverPos.top,
                left: revenuePopoverPos.left,
                width: revenuePopoverPos.width,
                zIndex: 200,
              }}
              className={cn(
                'flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl ring-1 ring-zinc-950/5 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/10',
                'animate-in fade-in-0 zoom-in-95 duration-150'
              )}
            >
              <span
                aria-hidden
                style={
                  revenuePopoverPos.placement === 'right'
                    ? { top: revenuePopoverPos.arrowOffset - 5, left: -5 }
                    : revenuePopoverPos.placement === 'left'
                      ? { top: revenuePopoverPos.arrowOffset - 5, right: -5 }
                      : { top: -5, left: revenuePopoverPos.arrowOffset - 5 }
                }
                className={cn(
                  'absolute h-2.5 w-2.5 rotate-45 border bg-white dark:bg-zinc-900',
                  revenuePopoverPos.placement === 'right' &&
                    'border-b-0 border-r-0 border-zinc-200 dark:border-zinc-600',
                  revenuePopoverPos.placement === 'left' &&
                    'border-l-0 border-t-0 border-zinc-200 dark:border-zinc-600',
                  revenuePopoverPos.placement === 'bottom' &&
                    'border-b-0 border-r-0 border-zinc-200 dark:border-zinc-600'
                )}
              />
              <button
                type="button"
                className="absolute right-1.5 top-1.5 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                onClick={() => setShowRevenueBreakdown(false)}
                aria-label="Cerrar desglose"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <div className="border-b border-zinc-100 px-3.5 pb-2.5 pr-9 pt-3 dark:border-zinc-800">
                <h2
                  id="revenue-breakdown-title"
                  className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  Desglose — total ingresos
                </h2>
                <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                  Dinero ingresado en el período: ventas de productos y domicilios.
                </p>
              </div>
              <div className="max-h-[min(50vh,320px)] overflow-y-auto px-3 py-2.5">
                {(() => {
                  const total = metrics.totalRevenue
                  const pct = (n: number) =>
                    total > 0 ? `${((n / total) * 100).toFixed(1)}% del total` : '0% del total'
                  const rows: { label: string; amount: number; hint?: string }[] = [
                    {
                      label: 'Ventas de productos',
                      amount: metrics.totalCollectedProductsRevenue,
                      hint: 'Productos, IVA y abonos de crédito',
                    },
                    {
                      label: 'Domicilios',
                      amount: metrics.totalCollectedTransportRevenue,
                      hint: 'Transporte cobrado en ventas',
                    },
                  ]
                  return (
                    <ul className="space-y-1.5">
                      <li className="flex flex-col gap-0.5 rounded-lg border border-sky-200/80 bg-sky-50/50 px-2.5 py-2 dark:border-sky-900/50 dark:bg-sky-950/25">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                            Total ingresos
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </li>
                      {rows.map((row) => (
                        <li
                          key={row.label}
                          className="flex flex-col gap-0.5 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-2.5 py-2 dark:border-zinc-700/60 dark:bg-zinc-800/40"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                              {row.label}
                            </span>
                            <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                              {formatCurrency(row.amount)}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {pct(row.amount)}
                          </span>
                          {row.hint ? (
                            <span className="text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
                              {row.hint}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )
                })()}
              </div>
            </div>,
            document.body
          )}

        {showTransferBreakdown &&
          transferPopoverPos &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={transferPopoverRef}
              role="dialog"
              aria-labelledby="transfer-breakdown-title"
              style={{
                position: 'fixed',
                top: transferPopoverPos.top,
                left: transferPopoverPos.left,
                width: transferPopoverPos.width,
                zIndex: 200,
              }}
              className={cn(
                'flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl ring-1 ring-zinc-950/5 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/10',
                'animate-in fade-in-0 zoom-in-95 duration-150'
              )}
            >
              {/* Flechita apuntando al card de Transferencia */}
              <span
                aria-hidden
                style={
                  transferPopoverPos.placement === 'right'
                    ? { top: transferPopoverPos.arrowOffset - 5, left: -5 }
                    : transferPopoverPos.placement === 'left'
                    ? { top: transferPopoverPos.arrowOffset - 5, right: -5 }
                    : { top: -5, left: transferPopoverPos.arrowOffset - 5 }
                }
                className={cn(
                  'absolute h-2.5 w-2.5 rotate-45 border bg-white dark:bg-zinc-900',
                  transferPopoverPos.placement === 'right' &&
                    'border-b-0 border-r-0 border-zinc-200 dark:border-zinc-600',
                  transferPopoverPos.placement === 'left' &&
                    'border-l-0 border-t-0 border-zinc-200 dark:border-zinc-600',
                  transferPopoverPos.placement === 'bottom' &&
                    'border-b-0 border-r-0 border-zinc-200 dark:border-zinc-600'
                )}
              />
              <button
                type="button"
                className="absolute right-1.5 top-1.5 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                onClick={() => setShowTransferBreakdown(false)}
                aria-label="Cerrar desglose"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <div className="border-b border-zinc-100 px-3.5 pb-2.5 pr-9 pt-3 dark:border-zinc-800">
                <h2
                  id="transfer-breakdown-title"
                  className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  Desglose — transferencias
                </h2>
                <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                  ¿A dónde se fue el dinero? Por canal en este período.
                </p>
              </div>
              <div className="max-h-[min(50vh,320px)] overflow-y-auto px-3 py-2.5">
                {(() => {
                  const total =
                    metrics.cashRevenue + metrics.transferRevenue + metrics.cardRevenue
                  const pct = (n: number) =>
                    total > 0 ? `${((n / total) * 100).toFixed(1)}% del total` : '0% del total'
                  const rows: { label: string; amount: number; hint?: string }[] = [
                    { label: 'Nequi', amount: metrics.nequiRevenue },
                    { label: 'Bancolombia', amount: metrics.bancolombiaRevenue },
                    {
                      label: 'Otra cuenta / sin canal',
                      amount: metrics.otherTransferRevenue,
                      hint: 'No etiquetadas como Nequi o Bancolombia',
                    },
                  ]
                  return (
                    <ul className="space-y-1.5">
                      <li className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-2.5 py-2 dark:border-zinc-700/60 dark:bg-zinc-800/40">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                            Total transferencias
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                            {formatCurrency(metrics.transferRevenue)}
                          </span>
                        </div>
                        <span className="mt-1 block text-[10px] text-zinc-500 dark:text-zinc-400">
                          {revenueMixSubtitle(
                            metrics.transferProductsRevenue,
                            metrics.transferTransportRevenue,
                            formatCurrency
                          )}
                        </span>
                      </li>
                      {rows.map((row) => (
                        <li
                          key={row.label}
                          className="flex flex-col gap-0.5 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-2.5 py-2 dark:border-zinc-700/60 dark:bg-zinc-800/40"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                              {row.label}
                            </span>
                            <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                              {formatCurrency(row.amount)}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {pct(row.amount)}
                          </span>
                          {row.hint ? (
                            <span className="text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
                              {row.hint}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )
                })()}
              </div>
            </div>,
            document.body
          )}

        {showProfitBreakdown &&
          profitPopoverPos &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={profitPopoverRef}
              role="dialog"
              aria-labelledby="profit-breakdown-title"
              style={{
                position: 'fixed',
                top: profitPopoverPos.top,
                left: profitPopoverPos.left,
                width: profitPopoverPos.width,
                zIndex: 200,
              }}
              className={cn(
                'flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl ring-1 ring-zinc-950/5 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/10',
                'animate-in fade-in-0 zoom-in-95 duration-150'
              )}
            >
              <span
                aria-hidden
                style={
                  profitPopoverPos.placement === 'right'
                    ? { top: profitPopoverPos.arrowOffset - 5, left: -5 }
                    : profitPopoverPos.placement === 'left'
                      ? { top: profitPopoverPos.arrowOffset - 5, right: -5 }
                      : { top: -5, left: profitPopoverPos.arrowOffset - 5 }
                }
                className={cn(
                  'absolute h-2.5 w-2.5 rotate-45 border bg-white dark:bg-zinc-900',
                  profitPopoverPos.placement === 'right' &&
                    'border-b-0 border-r-0 border-zinc-200 dark:border-zinc-600',
                  profitPopoverPos.placement === 'left' &&
                    'border-l-0 border-t-0 border-zinc-200 dark:border-zinc-600',
                  profitPopoverPos.placement === 'bottom' &&
                    'border-b-0 border-r-0 border-zinc-200 dark:border-zinc-600'
                )}
              />
              <button
                type="button"
                className="absolute right-1.5 top-1.5 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                onClick={() => setShowProfitBreakdown(false)}
                aria-label="Cerrar desglose"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <div className="border-b border-zinc-100 px-3.5 pb-2.5 pr-9 pt-3 dark:border-zinc-800">
                <h2
                  id="profit-breakdown-title"
                  className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  Desglose — ganancia bruta
                </h2>
                <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                  Ganancia del período según tipo de cliente de la factura.
                </p>
              </div>
              <div className="max-h-[min(50vh,320px)] overflow-y-auto px-3 py-2.5">
                {(() => {
                  const total = metrics.grossProfit
                  const pct = (n: number) =>
                    total > 0 ? `${((n / total) * 100).toFixed(1)}% del total` : '0% del total'
                  const rows: { label: string; amount: number; hint?: string }[] = [
                    {
                      label: 'Cliente final',
                      amount: metrics.grossProfitRetail,
                      hint: 'Consumidor final y minorista',
                    },
                    { label: 'Cliente mayorista', amount: metrics.grossProfitWholesale },
                  ]
                  return (
                    <ul className="space-y-1.5">
                      <li className="flex flex-col gap-0.5 rounded-lg border border-teal-200/80 bg-teal-50/50 px-2.5 py-2 dark:border-teal-900/50 dark:bg-teal-950/25">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                            Total ganancia bruta
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </li>
                      {rows.map((row) => (
                        <li
                          key={row.label}
                          className="flex flex-col gap-0.5 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-2.5 py-2 dark:border-zinc-700/60 dark:bg-zinc-800/40"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                              {row.label}
                            </span>
                            <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                              {formatCurrency(row.amount)}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {pct(row.amount)}
                          </span>
                          {row.hint ? (
                            <span className="text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
                              {row.hint}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )
                })()}
              </div>
            </div>,
            document.body
          )}

        {/* Modal de Facturas Anuladas - Disponible para todos */}
        <CancelledInvoicesModal
          isOpen={showCancelledModal}
          onClose={() => setShowCancelledModal(false)}
          sales={filteredData.sales}
          allSales={allSales}
        />
      </div>
    </RoleProtectedRoute>
  )
}
