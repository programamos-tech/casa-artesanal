'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  DollarSign,
  TrendingUp,
  Users,
  Package,
  Shield,
  CreditCard,
  ShoppingCart,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  XCircle,
  X,
  RefreshCw,
  Home,
  Eye,
  EyeOff,
  ChevronDown
} from 'lucide-react'
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'
import { useSales } from '@/contexts/sales-context'
import { useProducts } from '@/contexts/products-context'
import { useClients } from '@/contexts/clients-context'
import { useAuth } from '@/contexts/auth-context'
import { getCurrentUserStoreId, isMainStoreUser } from '@/lib/store-helper'
import { StoresService } from '@/lib/stores-service'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { StoreBadge } from '@/components/ui/store-badge'
import { Sale } from '@/types'
import { CancelledInvoicesModal } from '@/components/dashboard/cancelled-invoices-modal'
import { cn } from '@/lib/utils'
import { cardShell } from '@/lib/card-shell'

type DateFilter = 'today' | 'specific' | 'all' | 'range'

const dashCardBase =
  'casa-artesanal-card-surface max-w-full min-w-0 rounded-xl border border-solid border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 md:p-6'

/** Celda dentro del panel único de métricas (sin card por KPI) */
const dashMetricTile =
  'flex w-full min-h-0 flex-col rounded-lg border border-transparent px-3 py-3 text-left transition-colors md:px-3.5 md:py-3.5'
const dashMetricTileInteractive =
  'cursor-pointer hover:border-zinc-200 hover:bg-zinc-50/90 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/35 dark:focus-visible:ring-zinc-500/25'

const dashMetricIconEm =
  'h-4 w-4 shrink-0 text-emerald-600/90 dark:text-emerald-300'
const dashMetricRow = 'flex min-w-0 items-center gap-2'
const dashMetricLabelClass =
  'min-w-0 text-left text-[11px] font-medium uppercase leading-snug tracking-wide text-zinc-600 dark:text-zinc-400'

/** Toolbar de filtros: mismo criterio que `Button` outline / selects de inventario */
const dashFilterSelectClass =
  'block h-10 w-full appearance-none border-0 bg-transparent px-3 pr-9 text-sm font-medium leading-none text-zinc-800 focus:outline-none focus:ring-0 dark:text-zinc-100 md:pr-8'

const dashToolbarButtonClass =
  'h-9 min-h-9 border-zinc-300/90 bg-white px-2.5 shadow-sm dark:border-emerald-700/70 dark:bg-zinc-900/65 dark:text-emerald-200 dark:hover:border-emerald-600/80 dark:hover:bg-zinc-800'

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
  const [allWarranties, setAllWarranties] = useState<any[]>([])
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
      const { WarrantyService } = await import('@/lib/warranty-service')
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

      const [salesResult, warrantiesResult, creditsResult, paymentRecordsResult, inventoryResult, creditsSummaryResult] = await Promise.allSettled([
        withTimeout(SalesService.getDashboardSales(chartStartDate, finalEndDate), currentFilter === 'all' ? 30000 : 20000),
        withTimeout(WarrantyService.getWarrantiesByDateRange(startDate || chartStartDate, finalEndDate), 15000),
        withTimeout(CreditsService.getAllCredits(), 15000),
        withTimeout(CreditsService.getPaymentRecordsByDateRange(chartStartDate, finalEndDate), 15000),
        withTimeout(ProductsService.getInventoryMetrics(), 30000),
        withTimeout(CreditsService.getCreditsSummary(), 15000)
      ])

      const sales = salesResult.status === 'fulfilled' ? salesResult.value : []
      const warranties = warrantiesResult.status === 'fulfilled' ? warrantiesResult.value : []
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
      setAllWarranties(warranties)
      setAllCredits(credits)
      setAllProducts([])
      setAllPaymentRecords(payments)
      setLastUpdated(new Date())

      const errors = [salesResult, warrantiesResult, creditsResult, paymentRecordsResult, inventoryResult, creditsSummaryResult]
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
      setAllWarranties([])
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
        warranties: allWarranties,
        credits: allCredits,
        paymentRecords: allPaymentRecords
      }
    }
    if (effectiveDateFilter === 'range') {
      if (dateRangeStart && dateRangeEnd) {
        return {
          sales: allSales,
          warranties: allWarranties,
          credits: allCredits,
          paymentRecords: allPaymentRecords
        }
      }
      return { sales: [], warranties: [], credits: [], paymentRecords: [] }
    }

    // Para filtros específicos (today, specific), los datos YA vienen filtrados del backend
    // PERO cargamos INCOME_TREND_CHART_DAYS para la gráfica de tendencia; las métricas usan solo el día seleccionado
    if (effectiveDateFilter === 'specific' && !specificDate) {
      // Si es 'specific' pero no hay fecha seleccionada, devolver vacío
      return {
        sales: [],
        warranties: [],
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
        warranties: allWarranties,
        credits: allCredits,
        paymentRecords: filteredPayments
      }
    }

    // Fallback: devolver todos los datos (p. ej. range sin fechas aún)
    return {
      sales: allSales,
      warranties: allWarranties,
      credits: allCredits,
      paymentRecords: allPaymentRecords
    }
  }, [allSales, allWarranties, allCredits, allPaymentRecords, effectiveDateFilter, specificDate, dateRangeStart, dateRangeEnd])

  // Cargar productos específicos bajo demanda cuando cambien las ventas o garantías
  useEffect(() => {
    // Cargar productos de garantías completadas
    const warrantyProductIds = allWarranties
      .filter(w => w.status === 'completed')
      .slice(0, 5)
      .map(w => w.productDeliveredId)
      .filter(Boolean) as string[]
    
    // Cargar productos de ventas activas para cálculo de ganancias
    const saleProductIds = allSales
      .filter(sale => sale.status !== 'cancelled' && sale.status !== 'draft')
      .flatMap(sale => sale.items?.map(item => item.productId) || [])
      .filter(Boolean) as string[]
    
    // Combinar y cargar productos únicos
    const allProductIds = Array.from(new Set([...warrantyProductIds, ...saleProductIds]))
    
    if (allProductIds.length > 0) {
      loadSpecificProducts(allProductIds)
    }
  }, [allSales, allWarranties, loadSpecificProducts])

  // Calcular métricas del dashboard
  const metrics = useMemo(() => {
    const { sales, warranties, credits, paymentRecords } = filteredData

    // Ingresos por ventas (nuevas ventas) - excluir canceladas y borradores
    const activeSalesForRevenue = sales.filter(sale => sale.status !== 'cancelled' && sale.status !== 'draft')
    const salesRevenue = activeSalesForRevenue.reduce((sum, sale) => sum + sale.total, 0)

    // Filtrar abonos cancelados (los abonos de facturas canceladas se marcan como 'cancelled' en payment_records)
    const validPaymentRecords = paymentRecords.filter(payment => {
      // Excluir abonos que estén marcados como cancelados
      return payment.status !== 'cancelled'
    })

    // Ingresos por abonos de créditos (solo de facturas/créditos activos)
    const creditPaymentsRevenue = validPaymentRecords.reduce((sum, payment) => sum + payment.amount, 0)

    // Ingresos por método de pago (ventas + abonos válidos)
    // Excluir ventas canceladas y borradores del cálculo de ingresos
    const activeSales = sales.filter(sale => sale.status !== 'cancelled' && sale.status !== 'draft')

    let cashRevenue = 0
    let nequiRevenue = 0
    let bancolombiaRevenue = 0
    let otherTransferRevenue = 0
    let cardRevenue = 0

    // Procesar solo ventas activas (no canceladas)
    activeSales.forEach(sale => {
      // Priorizar usar sale.payments si están disponibles (más preciso)
      if (sale.payments && sale.payments.length > 0) {
        // Usar los registros de pagos (más preciso, especialmente para transferencias)
        sale.payments.forEach(payment => {
          if (payment.paymentType === 'cash') {
            cashRevenue += payment.amount || 0
          } else if (payment.paymentType === 'nequi') {
            nequiRevenue += payment.amount || 0
          } else if (payment.paymentType === 'bancolombia') {
            bancolombiaRevenue += payment.amount || 0
          } else if (payment.paymentType === 'transfer') {
            otherTransferRevenue += payment.amount || 0
          } else if (payment.paymentType === 'card') {
            cardRevenue += payment.amount || 0
          }
        })
      } else {
        // Fallback: usar paymentMethod si no hay registros de payments
        if (sale.paymentMethod === 'cash') {
          cashRevenue += sale.total
        } else if (sale.paymentMethod === 'nequi') {
          nequiRevenue += sale.total
        } else if (sale.paymentMethod === 'bancolombia') {
          bancolombiaRevenue += sale.total
        } else if (sale.paymentMethod === 'transfer') {
          otherTransferRevenue += sale.total
        } else if (sale.paymentMethod === 'card') {
          cardRevenue += sale.total
        } else if (sale.paymentMethod === 'mixed') {
          // Si es mixed pero no tiene payments, loguear para debugging
          console.warn('[DASHBOARD] Sale with mixed payment method but no payments:', {
            saleId: sale.id,
            invoiceNumber: sale.invoiceNumber,
            total: sale.total,
            payments: sale.payments
          })
        }
      }
    })

    // Agregar abonos de créditos (efectivo y transferencia) al total de ingresos
    const isCash = (p: { paymentMethod?: string }) => p.paymentMethod === 'cash' || p.paymentMethod === 'efectivo'
    const isNequi = (p: { paymentMethod?: string }) => p.paymentMethod === 'nequi'
    const isBancolombia = (p: { paymentMethod?: string }) => p.paymentMethod === 'bancolombia'
    const isOtherTransfer = (p: { paymentMethod?: string }) => p.paymentMethod === 'transfer'
    const isCard = (p: { paymentMethod?: string }) => p.paymentMethod === 'card'
    cashRevenue += validPaymentRecords.filter(isCash).reduce((sum, payment) => sum + payment.amount, 0)
    nequiRevenue += validPaymentRecords.filter(isNequi).reduce((sum, payment) => sum + payment.amount, 0)
    bancolombiaRevenue += validPaymentRecords.filter(isBancolombia).reduce((sum, payment) => sum + payment.amount, 0)
    otherTransferRevenue += validPaymentRecords.filter(isOtherTransfer).reduce((sum, payment) => sum + payment.amount, 0)
    cardRevenue += validPaymentRecords.filter(isCard).reduce((sum, payment) => sum + payment.amount, 0)

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
          productSales[item.productId].revenue += item.price * item.quantity
        })
      }
    })

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    // Garantías
    const completedWarranties = warranties.filter(w => w.status === 'completed').length
    const pendingWarranties = warranties.filter(w => w.status === 'pending').length

    // Métricas adicionales para garantías - Excluir ventas canceladas
    const warrantyRate = activeSales.length > 0 ? ((completedWarranties / activeSales.length) * 100).toFixed(1) : '0.0'

    // Calcular valor total de productos reemplazados en garantías
    const completedWarrantyDetails = warranties
      .filter(w => w.status === 'completed')
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime()
        const dateB = new Date(b.updatedAt || b.createdAt).getTime()
        return dateB - dateA
      })

    const totalWarrantyValue = completedWarrantyDetails.reduce((sum, warranty) => {
      const replacementProduct = specificProductsCache.get(warranty.productDeliveredId) || allProducts.find(p => p.id === warranty.productDeliveredId)
      return sum + (replacementProduct?.price || 0)
    }, 0)

    const recentWarrantyReplacements = completedWarrantyDetails
      .slice(0, 5)
      .map(warranty => {
        const replacementProduct = specificProductsCache.get(warranty.productDeliveredId) || allProducts.find(p => p.id === warranty.productDeliveredId)
        const deliveredName = warranty.productDeliveredName || replacementProduct?.name || 'Producto entregado'
        const reference = replacementProduct?.reference
        const value = replacementProduct?.price || 0
        const quantityDelivered = warranty.quantityDelivered || 1
        const warrantyDate = new Date(warranty.updatedAt || warranty.createdAt)
        const dateLabel = warrantyDate.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short'
        }).replace('.', '')
        const timeLabel = warrantyDate.toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit'
        })

        return {
          id: warranty.id,
          deliveredName,
          reference,
          value,
          quantityDelivered,
          dateLabel,
          timeLabel
        }
      })

    // Calcular días desde la última garantía completada (usar todas las garantías, no solo las filtradas)
    const lastWarranty = allWarranties
      .filter(w => w.status === 'completed')
      .sort((a, b) => {
        // Usar updatedAt si está disponible (fecha de completado), sino createdAt
        const dateA = new Date(a.updatedAt || a.createdAt).getTime()
        const dateB = new Date(b.updatedAt || b.createdAt).getTime()
        return dateB - dateA
      })[0]

    const daysSinceLastWarranty = lastWarranty
      ? Math.floor((new Date().getTime() - new Date(lastWarranty.updatedAt || lastWarranty.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : null

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

    // Calcular ganancia bruta (ventas - costo de productos vendidos)
    // Excluir ventas canceladas del cálculo de ganancia bruta
    // Para ventas a crédito: solo contar la ganancia cuando el crédito esté completado
    const grossProfit = activeSales.reduce((totalProfit, sale) => {
      // Si es una venta a crédito, verificar si el crédito está completado
      if (sale.paymentMethod === 'credit') {
        // Buscar el crédito asociado a esta venta
        const associatedCredit = allCredits.find(c => c.saleId === sale.id)

        // Solo contar la ganancia si el crédito está completado
        // Si no hay crédito asociado o no está completado, no contar la ganancia
        if (!associatedCredit || associatedCredit.status !== 'completed') {
          return totalProfit
        }
      }

      if (!sale.items) return totalProfit

      const saleProfit = sale.items.reduce((itemProfit, item) => {
        // Buscar el producto para obtener su costo (primero en cache, luego en allProducts)
        const product = specificProductsCache.get(item.productId) || allProducts.find(p => p.id === item.productId)
        const cost = product?.cost || 0

        // Calcular el precio real de venta después de descuentos
        const baseTotal = item.quantity * item.unitPrice
        const discountAmount = item.discountType === 'percentage'
          ? (baseTotal * (item.discount || 0)) / 100
          : (item.discount || 0)
        const salePriceAfterDiscount = Math.max(0, baseTotal - discountAmount)

        // El precio unitario real después de descuentos
        const realUnitPrice = item.quantity > 0 ? salePriceAfterDiscount / item.quantity : 0

        // Ganancia bruta = (precio de venta real - costo) * cantidad
        const itemGrossProfit = (realUnitPrice - cost) * item.quantity

        return itemProfit + itemGrossProfit
      }, 0)

      return totalProfit + saleProfit
    }, 0)

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
      completedWarranties,
      pendingWarranties,
      warrantyRate,
      totalWarrantyValue,
      recentWarrantyReplacements,
      recentPendingCredits,
      daysSinceLastWarranty,
      totalDebt: optimizedMetrics.creditsSummary?.totalDebt ?? totalDebt,
      pendingCreditsCount: optimizedMetrics.creditsSummary?.pendingCreditsCount ?? pendingCredits.length,
      dailyCreditsDebt,
      dailyCreditsCount,
      overdueCreditsCount,
      overdueCreditsDebt,
      uniqueClients,
      grossProfit,
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
  }, [filteredData, allSales, allProducts, allClients, allWarranties, allCredits, optimizedMetrics, specificProductsCache])

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

  // Obtener etiqueta del filtro de fecha
  const getDateFilterLabel = (filter: DateFilter) => {
    const labels: { [key: string]: string } = {
      today: 'Hoy',
      all: 'Seleccionar Año',
      specific: specificDate ? specificDate.toLocaleDateString('es-CO') : 'Fecha Específica',
      range: dateRangeStart && dateRangeEnd
        ? `${dateRangeStart.toLocaleDateString('es-CO')} - ${dateRangeEnd.toLocaleDateString('es-CO')}`
        : 'Rango de fechas'
    }
    return labels[filter] || filter
  }

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
        <div className="min-h-screen bg-white py-4 dark:bg-neutral-950 md:py-6">
          {/* Header Skeleton */}
          <div className="mb-4 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-neutral-800 rounded-lg animate-pulse"></div>
                  <div className="h-7 w-32 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse"></div>
                </div>
                <div className="h-4 w-64 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Panel de métricas (misma forma que la vista cargada) */}
          <div className={cn(cardShell, 'mb-4 overflow-hidden rounded-xl md:mb-8')}>
            <div className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800 md:px-6 md:py-3.5">
              <div className="h-3 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-2 h-4 w-44 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 sm:gap-2.5 sm:p-3 lg:grid-cols-4 lg:gap-3 lg:p-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-lg px-3 py-3 md:px-3.5 md:py-3.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-3 min-w-0 flex-1 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                  <div className="mt-2.5 h-7 w-[70%] animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>

          {/* Loading indicator */}
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              {/* Spinner minimalista */}
              <div className="w-16 h-16 mx-auto mb-6">
                <div className="h-full w-full animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-600 dark:border-zinc-700 dark:border-t-emerald-500" />
              </div>
              <p className="mb-1 text-lg font-medium text-zinc-700 dark:text-zinc-300">
                Cargando reportes...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Esto puede tomar unos segundos
              </p>
            </div>
          </div>
        </div>
      </RoleProtectedRoute>
    )
  }

  return (
    <RoleProtectedRoute module="dashboard" requiredAction="view">
      <div className="relative min-h-screen bg-white py-4 dark:bg-neutral-950 md:py-6">
        {/* Overlay de carga para actualizaciones */}
        {(isRefreshing || isFiltering) && (
          <div className="absolute inset-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center -mt-[200px]">
              {/* Spinner minimalista */}
              <div className="w-12 h-12 mb-4">
                <div className="h-full w-full animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-600 dark:border-zinc-700 dark:border-t-emerald-500" />
              </div>
              <p className="text-base font-medium text-zinc-700 dark:text-zinc-300">
                {isFiltering ? 'Cargando datos del día...' : 'Actualizando reportes...'}
              </p>
            </div>
          </div>
        )}

        {/* Header — mismos patrones que Ventas / Productos (cardShell + CardTitle + StoreBadge) */}
        <Card className={cn(cardShell, 'mb-3 md:mb-6')}>
          <CardHeader className="space-y-0 p-4 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-1.5">
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                  <BarChart3
                    className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span>Reportes</span>
                  <StoreBadge />
                  {(isRefreshing || isFiltering) && (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-zinc-200 bg-zinc-50 text-xs text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300"
                    >
                      Actualizando…
                    </Badge>
                  )}
                </CardTitle>
                <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {currentStoreName && !isMainStoreUser(user)
                    ? 'Estás viendo los reportes de esta micro tienda. Los datos mostrados corresponden únicamente a esta ubicación.'
                    : isMainStoreUser(user)
                      ? 'Resumen ejecutivo y métricas de rendimiento de la tienda principal'
                      : 'Resumen ejecutivo y métricas de rendimiento'}
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                  {isSuperAdmin ? (
                    <>
                      {/* Selector de período simplificado */}
                      <div className="relative w-full overflow-hidden rounded-lg border border-zinc-300/90 bg-white shadow-sm transition-colors hover:border-zinc-400/80 focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-400/30 dark:border-zinc-600 dark:bg-zinc-950/50 dark:hover:border-zinc-500 dark:focus-within:border-zinc-500 dark:focus-within:ring-zinc-500/25 sm:w-auto sm:min-w-[200px]">
                        <select
                          value={dateFilter}
                          onChange={(e) => handleFilterChange(e.target.value as DateFilter)}
                          className={dashFilterSelectClass}
                          aria-label="Período de reportes"
                        >
                          {(['today', 'specific', 'range', 'all'] as DateFilter[]).map((filter) => (
                            <option key={filter} value={filter}>
                              {getDateFilterLabel(filter)}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 md:pr-2">
                          <ChevronDown className="h-4 w-4 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} aria-hidden />
                        </div>
                      </div>

                      {/* Selector de año cuando "Todo el Tiempo" está seleccionado */}
                      {dateFilter === 'all' && isSuperAdmin && (
                        <div className="relative w-full overflow-hidden rounded-lg border border-zinc-300/90 bg-white shadow-sm transition-colors hover:border-zinc-400/80 focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-400/30 dark:border-zinc-600 dark:bg-zinc-950/50 dark:hover:border-zinc-500 dark:focus-within:border-zinc-500 dark:focus-within:ring-zinc-500/25 sm:ml-2 sm:w-auto sm:min-w-[100px]">
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
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 md:pr-2">
                            <ChevronDown className="h-4 w-4 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} aria-hidden />
                          </div>
                        </div>
                      )}

                      {/* Calendario para fecha específica */}
                      {dateFilter === 'specific' && (
                        <DatePicker
                          selectedDate={specificDate}
                          onDateSelect={handleDateSelect}
                          placeholder="Seleccionar fecha"
                          className="w-full sm:w-40 text-xs md:text-sm"
                        />
                      )}

                      {/* Rango de fechas: desde - hasta (solo super admin) */}
                      {dateFilter === 'range' && (
                        <div className="flex flex-wrap items-center gap-2 md:gap-3">
                          <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                              Desde
                            </span>
                            <DatePicker
                              selectedDate={dateRangeStart}
                              onDateSelect={handleRangeStartSelect}
                              placeholder="Inicio"
                              className="w-full min-w-[11rem] sm:w-40"
                            />
                          </div>
                          <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                              Hasta
                            </span>
                            <DatePicker
                              selectedDate={dateRangeEnd}
                              onDateSelect={handleRangeEndSelect}
                              placeholder="Fin"
                              className="w-full min-w-[11rem] sm:w-40"
                              minDate={dateRangeStart ?? undefined}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800/40 md:px-3 md:py-1.5">
                      <Calendar className="h-3 w-3 text-zinc-500 dark:text-zinc-400 md:h-4 md:w-4" strokeWidth={1.5} />
                      <span className="hidden text-xs font-medium text-zinc-600 dark:text-zinc-300 sm:inline md:text-sm">
                        Vista del día actual
                      </span>
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 sm:hidden">Hoy</span>
                    </div>
                  )}
                  {/* Botones de acción agrupados */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setHideNumbers(!hideNumbers)}
                      variant="outline"
                      size="sm"
                      className={cn(dashToolbarButtonClass, 'w-9 justify-center px-0 md:w-auto md:px-3')}
                      title={hideNumbers ? 'Mostrar números' : 'Ocultar números'}
                    >
                      {hideNumbers ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                    </Button>
                    <Button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      variant="outline"
                      size="sm"
                      className={cn(dashToolbarButtonClass, 'gap-2 px-3 text-xs disabled:opacity-50 md:px-4 md:text-sm')}
                    >
                      <RefreshCw className={`h-4 w-4 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
                      <span className="hidden md:inline">Actualizar</span>
                    </Button>
                  </div>
                </div>
              </div>
          </CardHeader>
        </Card>

        {/* Panel único de métricas: un borde, período arriba; celdas planas sin 8 cards sueltas */}
        <div className={cn(cardShell, 'mb-6 overflow-hidden rounded-xl md:mb-8')}>
          <div className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800 md:px-6 md:py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Resumen del período
            </p>
            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">{periodLabelShort}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 sm:gap-2.5 sm:p-3 lg:grid-cols-4 lg:gap-3 lg:p-4">
            <button
              type="button"
              onClick={() => router.push('/sales')}
              className={cn(dashMetricTile, dashMetricTileInteractive)}
            >
              <div className={dashMetricRow}>
                <BarChart3 className={dashMetricIconEm} strokeWidth={1.5} aria-hidden />
                <span className={dashMetricLabelClass}>Total ingresos</span>
              </div>
              <p className="mt-2.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 md:text-xl">
                {formatCurrency(metrics.totalRevenue)}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{metrics.totalSales} ventas</p>
            </button>

            <button
              type="button"
              onClick={() => router.push('/sales')}
              className={cn(dashMetricTile, dashMetricTileInteractive)}
            >
              <div className={dashMetricRow}>
                <DollarSign className={dashMetricIconEm} strokeWidth={1.5} aria-hidden />
                <span className={dashMetricLabelClass}>Efectivo</span>
              </div>
              <p className="mt-2.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 md:text-xl">
                {formatCurrency(metrics.cashRevenue)}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {(metrics.cashRevenue + metrics.transferRevenue + metrics.cardRevenue) > 0
                  ? `${((metrics.cashRevenue / (metrics.cashRevenue + metrics.transferRevenue + metrics.cardRevenue)) * 100).toFixed(1)}% del total`
                  : '0% del total'}
              </p>
            </button>

            <button
              ref={transferTileRef}
              type="button"
              onClick={() => setShowTransferBreakdown((prev) => !prev)}
              className={cn(dashMetricTile, dashMetricTileInteractive)}
              aria-haspopup="dialog"
              aria-expanded={showTransferBreakdown}
            >
              <div className={dashMetricRow}>
                <TrendingUp className={dashMetricIconEm} strokeWidth={1.5} aria-hidden />
                <span className={dashMetricLabelClass}>Transferencia</span>
              </div>
              <p className="mt-2.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 md:text-xl">
                {formatCurrency(metrics.transferRevenue)}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {(metrics.cashRevenue + metrics.transferRevenue + metrics.cardRevenue) > 0
                  ? `${((metrics.transferRevenue / (metrics.cashRevenue + metrics.transferRevenue + metrics.cardRevenue)) * 100).toFixed(1)}% del total`
                  : '0% del total'}
              </p>
              <p className="mt-1.5 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">Clic para ver desglose</p>
            </button>

            {user && user.role !== 'vendedor' && user.role !== 'Vendedor' ? (
              isSuperAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowCancelledModal(true)}
                  className={cn(dashMetricTile, dashMetricTileInteractive)}
                >
                  <div className={dashMetricRow}>
                    <XCircle className={dashMetricIconEm} strokeWidth={1.5} aria-hidden />
                    <span className={dashMetricLabelClass}>Facturas anuladas</span>
                  </div>
                  <p className="mt-2.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 md:text-xl">
                    {metrics.cancelledSales}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {metrics.cancelledSales === 1 ? 'Factura anulada' : 'Facturas anuladas'}
                  </p>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/payments')}
                  className={cn(dashMetricTile, dashMetricTileInteractive)}
                >
                  <div className={dashMetricRow}>
                    <CreditCard className={dashMetricIconEm} strokeWidth={1.5} aria-hidden />
                    <span className={dashMetricLabelClass}>Crédito</span>
                  </div>
                  <p className="mt-2.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 md:text-xl">
                    {formatCurrency(metrics.creditRevenue)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {
                      filteredData.credits.filter(
                        (c: any) =>
                          (c.status === 'pending' || c.status === 'partial') && (c.pendingAmount || 0) > 0
                      ).length
                    }{' '}
                    créditos pendientes
                  </p>
                </button>
              )
            ) : null}

            {canViewCredits && !isSuperAdmin && (
              <button type="button" onClick={goToCredits} className={cn(dashMetricTile, dashMetricTileInteractive)}>
                <div className={dashMetricRow}>
                  <CreditCard className={dashMetricIconEm} strokeWidth={1.5} aria-hidden />
                  <span className={dashMetricLabelClass}>Dinero afuera</span>
                </div>
                <p className="mt-2.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 md:text-xl">
                  {formatCurrency(metrics.dailyCreditsDebt || 0)}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {metrics.dailyCreditsCount || 0} créditos del día
                </p>
              </button>
            )}

            <button
              type="button"
              onClick={() => router.push('/warranties')}
              className={cn(dashMetricTile, dashMetricTileInteractive)}
            >
              <div className={dashMetricRow}>
                <Shield className={dashMetricIconEm} strokeWidth={1.5} aria-hidden />
                <span className={dashMetricLabelClass}>Garantías</span>
              </div>
              <p className="mt-2.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 md:text-xl">
                {metrics.completedWarranties}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Completadas</p>
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => router.push('/sales')}
                className={cn(dashMetricTile, dashMetricTileInteractive)}
              >
                <div className={dashMetricRow}>
                  <Activity className={dashMetricIconEm} strokeWidth={1.5} aria-hidden />
                  <span className={dashMetricLabelClass}>Ganancia bruta</span>
                </div>
                <p className="mt-2.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 md:text-xl">
                  {formatCurrency(metrics.grossProfit)}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Por ventas del período</p>
              </button>
            )}

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => router.push('/inventory/products')}
                className={cn(dashMetricTile, dashMetricTileInteractive)}
              >
                <div className={dashMetricRow}>
                  <Package className={dashMetricIconEm} strokeWidth={1.5} aria-hidden />
                  <span className={dashMetricLabelClass}>Stock (inversión)</span>
                </div>
                <p className="mt-2.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 md:text-xl">
                  {formatCurrency(metrics.totalStockInvestment > 0 ? metrics.totalStockInvestment : metrics.potentialInvestment)}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {metrics.totalStockInvestment > 0 ? 'Inversión en stock' : 'Inversión potencial'}
                </p>
              </button>
            )}

            {isSuperAdmin ? (
              <button type="button" onClick={goToCredits} className={cn(dashMetricTile, dashMetricTileInteractive)}>
                <div className={dashMetricRow}>
                  <CreditCard className={dashMetricIconEm} strokeWidth={1.5} aria-hidden />
                  <span className={dashMetricLabelClass}>Créditos</span>
                </div>
                <p className="mt-2.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 md:text-xl">
                  {formatCurrency(metrics.totalDebt || 0)}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Total adeudado</p>
              </button>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowCancelledModal(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setShowCancelledModal(true)
                  }
                }}
                className={cn(dashMetricTile, dashMetricTileInteractive, 'sm:col-span-2 lg:col-span-2')}
              >
                <div className={dashMetricRow}>
                  <XCircle className={dashMetricIconEm} strokeWidth={1.5} aria-hidden />
                  <span className={dashMetricLabelClass}>Facturas anuladas</span>
                </div>
                <p className="mt-2.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 md:text-xl">
                  {metrics.cancelledSales}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {metrics.cancelledSales === 1 ? 'Factura anulada' : 'Facturas anuladas'}
                </p>
                <div className="mt-3 space-y-1.5 border-t border-zinc-200/90 pt-3 dark:border-zinc-700/90">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400">Valor anulado</span>
                    <span className="font-medium tabular-nums text-red-600/90 dark:text-red-400">
                      {formatCurrency(metrics.lostValue)}
                    </span>
                  </div>
                  <p className="pt-1 text-center text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <BarChart3 className="h-3 w-3 shrink-0" aria-hidden />
                      Clic para ver el detalle
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gráficos y estadísticas mejoradas */}
        <div className="space-y-4 md:space-y-6 mb-6 md:mb-8">
          {/* Tendencia de Ingresos — ancho completo (super admin) */}
          {isSuperAdmin && (
            <div className="w-full min-w-0">
            <div className={cn(dashCardBase, 'w-full')}>
              <div className="mb-4 flex min-w-0 items-start gap-2">
                <TrendingUp className={dashMetricIconEm} strokeWidth={1.5} aria-hidden />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 md:text-base">Tendencia de Ingresos</h3>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {effectiveDateFilter === 'all'
                      ? `Por mes · ${selectedYear}`
                      : effectiveDateFilter === 'range' && dateRangeStart && dateRangeEnd
                        ? `Por día · ${dateRangeStart.toLocaleDateString('es-CO')} — ${dateRangeEnd.toLocaleDateString('es-CO')}`
                        : effectiveDateFilter === 'range'
                          ? 'Elige inicio y fin en el rango'
                          : 'Últimos 15 días'}
                  </p>
                </div>
              </div>
              <div className="h-[260px] w-full min-w-0 md:h-[320px] lg:h-[360px]">
                {(() => {
                  // Si es anual, mostrar por mes
                  if (effectiveDateFilter === 'all') {
                    // Agrupar datos por mes
                    const monthlyData: { [key: string]: number } = {}

                    filteredData.sales.forEach((sale: Sale) => {
                      if (sale.status !== 'cancelled') {
                        const saleDate = new Date(sale.createdAt)
                        const monthKey = saleDate.toLocaleDateString('es-CO', {
                          month: 'short',
                          year: 'numeric'
                        })

                        if (!monthlyData[monthKey]) {
                          monthlyData[monthKey] = 0
                        }

                        // Sumar efectivo y transferencia
                        if (
                          sale.paymentMethod === 'cash' ||
                          sale.paymentMethod === 'transfer' ||
                          sale.paymentMethod === 'nequi' ||
                          sale.paymentMethod === 'bancolombia' ||
                          sale.paymentMethod === 'card'
                        ) {
                          monthlyData[monthKey] += sale.total || 0
                        } else if (sale.paymentMethod === 'mixed' && sale.payments) {
                          sale.payments.forEach(payment => {
                            if (
                              payment.paymentType === 'cash' ||
                              payment.paymentType === 'transfer' ||
                              payment.paymentType === 'nequi' ||
                              payment.paymentType === 'bancolombia' ||
                              payment.paymentType === 'card'
                            ) {
                              monthlyData[monthKey] += payment.amount || 0
                            }
                          })
                        }
                      }
                    })

                    // Agregar abonos de créditos
                    filteredData.paymentRecords.forEach((payment: any) => {
                      if (
                        payment.status !== 'cancelled' &&
                        (payment.paymentMethod === 'cash' ||
                          payment.paymentMethod === 'efectivo' ||
                          payment.paymentMethod === 'transfer' ||
                          payment.paymentMethod === 'nequi' ||
                          payment.paymentMethod === 'bancolombia' ||
                          payment.paymentMethod === 'card')
                      ) {
                        const paymentDate = new Date(payment.paymentDate)
                        const monthKey = paymentDate.toLocaleDateString('es-CO', {
                          month: 'short',
                          year: 'numeric'
                        })

                        if (!monthlyData[monthKey]) {
                          monthlyData[monthKey] = 0
                        }
                        monthlyData[monthKey] += payment.amount || 0
                      }
                    })

                    // Siempre 12 meses del año seleccionado (meses sin ventas = 0), orden cronológico
                    const monthKeyFor = (y: number, monthIndex: number) =>
                      new Date(y, monthIndex, 1).toLocaleDateString('es-CO', {
                        month: 'short',
                        year: 'numeric',
                      })
                    const monthlyArray = Array.from({ length: 12 }, (_, m) => {
                      const key = monthKeyFor(selectedYear, m)
                      return {
                        date: key,
                        amount: monthlyData[key] ?? 0,
                        count: 0,
                        average: 0,
                      }
                    })

                    // Colores adaptativos para modo oscuro
                    const axisColor = isDarkMode ? '#9ca3af' : '#666'
                    const lineColor = isDarkMode ? '#d2ab87' : '#8b5a3c' // Acento artesanal (sin verde)
                    const dotStrokeColor = isDarkMode ? '#18181b' : '#fff'
                    const tooltipBg = isDarkMode ? '#1f2937' : 'white'
                    const tooltipBorder = isDarkMode ? '#374151' : '#e5e7eb'
                    const tooltipText = isDarkMode ? '#f3f4f6' : '#111827'

                    return monthlyArray.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                        <LineChart data={monthlyArray}>
                          <XAxis
                            dataKey="date"
                            stroke={axisColor}
                            fontSize={12}
                            tick={{ fontSize: 12, fill: axisColor }}
                          />
                          <YAxis
                            stroke={axisColor}
                            fontSize={12}
                            tick={{ fontSize: 12, fill: axisColor }}
                            tickFormatter={(value) => {
                              if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                              if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                              return `$${value}`
                            }}
                          />
                          <Tooltip
                            formatter={(value: number) => [
                              new Intl.NumberFormat('es-CO', {
                                style: 'currency',
                                currency: 'COP',
                                minimumFractionDigits: 0
                              }).format(value),
                              'Ingresos'
                            ]}
                            contentStyle={{
                              backgroundColor: tooltipBg,
                              border: `1px solid ${tooltipBorder}`,
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              color: tooltipText
                            }}
                            labelStyle={{ color: tooltipText }}
                          />
                          <Line
                            type="monotone"
                            dataKey="amount"
                            stroke={lineColor}
                            strokeWidth={3}
                            dot={{ fill: lineColor, r: 5, strokeWidth: 2, stroke: dotStrokeColor }}
                            activeDot={{ r: 7, fill: lineColor }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-gray-500 dark:text-gray-400">No hay datos disponibles</p>
                      </div>
                    )
                  }

                  if (effectiveDateFilter === 'range' && (!dateRangeStart || !dateRangeEnd)) {
                    return (
                      <div className="flex h-full items-center justify-center px-4">
                        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                          Selecciona fechas de inicio y fin para ver los ingresos día a día en ese período.
                        </p>
                      </div>
                    )
                  }

                  // Rango completo, hoy o fecha específica: serie diaria
                  const getDateKey = (dateInput: Date | string): string => {
                    const date = new Date(dateInput)
                    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                    return normalizedDate.toLocaleDateString('es-CO', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit'
                    })
                  }

                  // Determinar fechas para el gráfico
                  let chartDays: Date[] = []
                  if (effectiveDateFilter === 'range' && dateRangeStart && dateRangeEnd) {
                    const a = new Date(
                      dateRangeStart.getFullYear(),
                      dateRangeStart.getMonth(),
                      dateRangeStart.getDate(),
                      0,
                      0,
                      0,
                      0
                    )
                    const b = new Date(
                      dateRangeEnd.getFullYear(),
                      dateRangeEnd.getMonth(),
                      dateRangeEnd.getDate(),
                      0,
                      0,
                      0,
                      0
                    )
                    const start = a.getTime() <= b.getTime() ? a : b
                    const end = a.getTime() <= b.getTime() ? b : a
                    for (let cursor = new Date(start); cursor.getTime() <= end.getTime(); cursor.setDate(cursor.getDate() + 1)) {
                      chartDays.push(
                        new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 0, 0, 0, 0)
                      )
                    }
                  } else {
                    let referenceDate: Date
                    if (effectiveDateFilter === 'specific' && specificDate) {
                      referenceDate = new Date(specificDate)
                    } else {
                      referenceDate = new Date()
                    }
                    referenceDate.setHours(0, 0, 0, 0)
                    for (let i = 0; i < INCOME_TREND_CHART_DAYS; i++) {
                      const date = new Date(referenceDate)
                      date.setDate(date.getDate() - i)
                      chartDays.push(date)
                    }
                    chartDays.reverse()
                  }

                  const chartWindowDays = chartDays

                  // Calcular ingresos por día desde TODOS los datos (no filteredData)
                  // porque filteredData solo tiene el día seleccionado, pero necesitamos la ventana del gráfico
                  const dailyData: { [key: string]: number } = {}

                  // Inicializar todos los días con 0
                  chartWindowDays.forEach(date => {
                    const dateKey = getDateKey(date)
                    dailyData[dateKey] = 0
                  })

                  // Crear un Set de timestamps para verificación rápida
                  const dayTimestamps = new Set<number>()
                  chartWindowDays.forEach(day => {
                    const dayStart = new Date(day)
                    dayStart.setHours(0, 0, 0, 0)
                    dayTimestamps.add(dayStart.getTime())
                  })

                  // Obtener el storeId actual para filtrar ventas
                  const currentStoreId = getCurrentUserStoreId()
                  const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

                  // Sumar ventas desde allSales (todos los datos)
                  // IMPORTANTE: Filtrar por store_id para micro tiendas
                  allSales.forEach((sale: Sale) => {
                    // Filtrar por store_id si es una micro tienda
                    if (currentStoreId && currentStoreId !== MAIN_STORE_ID) {
                      if (sale.storeId !== currentStoreId) {
                        return // Saltar ventas de otras tiendas
                      }
                    }

                    if (sale.status !== 'cancelled') {
                      const saleDate = new Date(sale.createdAt)
                      saleDate.setHours(0, 0, 0, 0)

                      // Verificar si la venta está en la ventana del gráfico (15 días)
                      if (dayTimestamps.has(saleDate.getTime())) {
                        const dateKey = getDateKey(saleDate)

                        // Sumar efectivo y transferencia
                        if (
                          sale.paymentMethod === 'cash' ||
                          sale.paymentMethod === 'transfer' ||
                          sale.paymentMethod === 'nequi' ||
                          sale.paymentMethod === 'bancolombia' ||
                          sale.paymentMethod === 'card'
                        ) {
                          dailyData[dateKey] = (dailyData[dateKey] || 0) + (sale.total || 0)
                        } else if (sale.paymentMethod === 'mixed' && sale.payments) {
                          sale.payments.forEach(payment => {
                            if (
                              payment.paymentType === 'cash' ||
                              payment.paymentType === 'transfer' ||
                              payment.paymentType === 'nequi' ||
                              payment.paymentType === 'bancolombia' ||
                              payment.paymentType === 'card'
                            ) {
                              dailyData[dateKey] = (dailyData[dateKey] || 0) + (payment.amount || 0)
                            }
                          })
                        }
                      }
                    }
                  })

                  // Obtener el storeId actual para filtrar pagos
                  // (ya está definido arriba, pero lo reutilizamos)

                  // Sumar abonos de créditos desde allPaymentRecords
                  // IMPORTANTE: Filtrar por store_id para micro tiendas
                  allPaymentRecords.forEach((payment: any) => {
                    // Filtrar por store_id si es una micro tienda
                    if (currentStoreId && currentStoreId !== MAIN_STORE_ID) {
                      // Los pagos pueden tener storeId en el crédito asociado
                      // Por ahora, si el pago no tiene storeId, asumimos que es de la tienda principal
                      // y lo excluimos para micro tiendas
                      if (payment.storeId && payment.storeId !== currentStoreId) {
                        return // Saltar pagos de otras tiendas
                      }
                      // Si no tiene storeId, probablemente es de la tienda principal, saltarlo
                      if (!payment.storeId) {
                        return
                      }
                    }

                    if (
                      payment.status !== 'cancelled' &&
                      (payment.paymentMethod === 'cash' ||
                        payment.paymentMethod === 'efectivo' ||
                        payment.paymentMethod === 'transfer' ||
                        payment.paymentMethod === 'nequi' ||
                        payment.paymentMethod === 'bancolombia' ||
                        payment.paymentMethod === 'card')
                    ) {
                      const paymentDate = new Date(payment.paymentDate)
                      paymentDate.setHours(0, 0, 0, 0)

                      // Verificar si el pago está en el rango
                      if (dayTimestamps.has(paymentDate.getTime())) {
                        const dateKey = getDateKey(paymentDate)
                        dailyData[dateKey] = (dailyData[dateKey] || 0) + (payment.amount || 0)
                      }
                    }
                  })

                  // Convertir a array ordenado
                  const chartData = chartWindowDays.map(date => {
                    const dateKey = getDateKey(date)
                    return {
                      date: dateKey,
                      amount: dailyData[dateKey] || 0,
                      count: 0,
                      average: 0
                    }
                  })

                  // Colores adaptativos para modo oscuro
                  const axisColor = isDarkMode ? '#9ca3af' : '#666'
                  const lineColor = isDarkMode ? '#d2ab87' : '#8b5a3c' // Acento artesanal (sin verde)
                  const dotStrokeColor = isDarkMode ? '#18181b' : '#fff'
                  const tooltipBg = isDarkMode ? '#1f2937' : 'white'
                  const tooltipBorder = isDarkMode ? '#374151' : '#e5e7eb'
                  const tooltipText = isDarkMode ? '#f3f4f6' : '#111827'

                  return chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                      <LineChart data={chartData}>
                        <XAxis
                          dataKey="date"
                          stroke={axisColor}
                          fontSize={10}
                          tick={{ fontSize: 10, fill: axisColor }}
                        />
                        <YAxis
                          stroke={axisColor}
                          fontSize={10}
                          tick={{ fontSize: 10, fill: axisColor }}
                          tickFormatter={(value) => {
                            if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                            if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                            return `$${value}`
                          }}
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            new Intl.NumberFormat('es-CO', {
                              style: 'currency',
                              currency: 'COP',
                              minimumFractionDigits: 0
                            }).format(value),
                            'Ingresos'
                          ]}
                          contentStyle={{
                            backgroundColor: tooltipBg,
                            border: `1px solid ${tooltipBorder}`,
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            color: tooltipText
                          }}
                          labelStyle={{ color: tooltipText }}
                        />
                        <Line
                          type="monotone"
                          dataKey="amount"
                          stroke={lineColor}
                          strokeWidth={3}
                          dot={{ fill: lineColor, r: 5, strokeWidth: 2, stroke: dotStrokeColor }}
                          activeDot={{ r: 7, fill: lineColor }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No hay datos disponibles</p>
                    </div>
                  )
                })()}
              </div>
            </div>
            </div>
          )}
        </div>

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
