import { CreditsService } from '@/lib/credits-service'
import { ProductsService } from '@/lib/products-service'
import { SalesService } from '@/lib/sales-service'
import type { Sale } from '@/types'

export interface OwnerTodaySummary {
  salesCount: number
  totalRevenue: number
  cashRevenue: number
  transferRevenue: number
  cardRevenue: number
  grossProfit: number
  pendingCreditsAmount: number
  lowStockCount: number
  totalStockUnits: number
  dateLabel: string
}

export interface OwnerProductStockResult {
  id: string
  name: string
  reference: string
  stock: number
  retailPrice: number
  wholesalePrice: number
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatAssistantMoney(amount: number): string {
  return formatMoney(amount)
}

function getTodayRange(): { start: Date; end: Date; label: string } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const label = start.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return { start, end, label }
}

function isActiveSale(sale: Sale): boolean {
  return sale.status !== 'cancelled' && sale.status !== 'draft'
}

function computeRevenue(sales: Sale[], paymentRecords: Awaited<ReturnType<typeof CreditsService.getPaymentRecordsByDateRange>>) {
  let cashRevenue = 0
  let nequiRevenue = 0
  let bancolombiaRevenue = 0
  let otherTransferRevenue = 0
  let cardRevenue = 0

  const activeSales = sales.filter(isActiveSale)

  activeSales.forEach(sale => {
    if (sale.payments?.length) {
      sale.payments.forEach(payment => {
        if (payment.paymentType === 'cash') cashRevenue += payment.amount || 0
        else if (payment.paymentType === 'nequi') nequiRevenue += payment.amount || 0
        else if (payment.paymentType === 'bancolombia') bancolombiaRevenue += payment.amount || 0
        else if (payment.paymentType === 'transfer') otherTransferRevenue += payment.amount || 0
        else if (payment.paymentType === 'card') cardRevenue += payment.amount || 0
      })
    } else {
      if (sale.paymentMethod === 'cash') cashRevenue += sale.total || 0
      else if (sale.paymentMethod === 'nequi') nequiRevenue += sale.total || 0
      else if (sale.paymentMethod === 'bancolombia') bancolombiaRevenue += sale.total || 0
      else if (sale.paymentMethod === 'transfer') otherTransferRevenue += sale.total || 0
      else if (sale.paymentMethod === 'card') cardRevenue += sale.total || 0
    }
  })

  const validPayments = paymentRecords.filter(p => p.status !== 'cancelled')
  const isCash = (p: { paymentMethod?: string }) =>
    p.paymentMethod === 'cash' || p.paymentMethod === 'efectivo'
  const isNequi = (p: { paymentMethod?: string }) => p.paymentMethod === 'nequi'
  const isBancolombia = (p: { paymentMethod?: string }) => p.paymentMethod === 'bancolombia'
  const isOtherTransfer = (p: { paymentMethod?: string }) => p.paymentMethod === 'transfer'
  const isCard = (p: { paymentMethod?: string }) => p.paymentMethod === 'card'

  cashRevenue += validPayments.filter(isCash).reduce((s, p) => s + p.amount, 0)
  nequiRevenue += validPayments.filter(isNequi).reduce((s, p) => s + p.amount, 0)
  bancolombiaRevenue += validPayments.filter(isBancolombia).reduce((s, p) => s + p.amount, 0)
  otherTransferRevenue += validPayments.filter(isOtherTransfer).reduce((s, p) => s + p.amount, 0)
  cardRevenue += validPayments.filter(isCard).reduce((s, p) => s + p.amount, 0)

  const transferRevenue = nequiRevenue + bancolombiaRevenue + otherTransferRevenue
  const totalRevenue = cashRevenue + transferRevenue + cardRevenue

  return {
    activeSales,
    salesCount: activeSales.length,
    cashRevenue,
    transferRevenue,
    cardRevenue,
    totalRevenue,
  }
}

async function computeGrossProfit(activeSales: Sale[]): Promise<number> {
  const productIds = Array.from(
    new Set(
      activeSales.flatMap(s => s.items?.map(i => i.productId).filter(Boolean) as string[] || [])
    )
  )
  if (productIds.length === 0) return 0

  const products = await ProductsService.getProductsByIds(productIds)
  const costById = new Map(products.map(p => [p.id, p.cost || 0]))

  let grossProfit = 0
  for (const sale of activeSales) {
    if (!sale.items?.length) continue
    for (const item of sale.items) {
      const cost = costById.get(item.productId) ?? 0
      const baseTotal = item.quantity * item.unitPrice
      const discountAmount =
        item.discountType === 'percentage'
          ? (baseTotal * (item.discount || 0)) / 100
          : item.discount || 0
      const salePriceAfterDiscount = Math.max(0, baseTotal - discountAmount)
      const realUnitPrice = item.quantity > 0 ? salePriceAfterDiscount / item.quantity : 0
      grossProfit += (realUnitPrice - cost) * item.quantity
    }
  }
  return grossProfit
}

let summaryCache: { key: string; at: number; data: OwnerTodaySummary } | null = null
const CACHE_MS = 90_000

export class OwnerAssistantService {
  static async getTodaySummary(): Promise<OwnerTodaySummary> {
    const { start, end, label } = getTodayRange()
    const cacheKey = start.toISOString().slice(0, 10)
    if (summaryCache && summaryCache.key === cacheKey && Date.now() - summaryCache.at < CACHE_MS) {
      return summaryCache.data
    }

    const [sales, paymentRecords, inventory, creditsSummary] = await Promise.all([
      SalesService.getDashboardSales(start, end),
      CreditsService.getPaymentRecordsByDateRange(start, end),
      ProductsService.getInventoryMetrics(),
      CreditsService.getCreditsSummary(),
    ])

    const revenue = computeRevenue(sales, paymentRecords)
    const grossProfit = await computeGrossProfit(revenue.activeSales)

    const data: OwnerTodaySummary = {
      salesCount: revenue.salesCount,
      totalRevenue: revenue.totalRevenue,
      cashRevenue: revenue.cashRevenue,
      transferRevenue: revenue.transferRevenue,
      cardRevenue: revenue.cardRevenue,
      grossProfit,
      pendingCreditsAmount: creditsSummary?.totalDebt ?? 0,
      lowStockCount: inventory.lowStockCount,
      totalStockUnits: inventory.totalStockUnits,
      dateLabel: label,
    }

    summaryCache = { key: cacheKey, at: Date.now(), data }
    return data
  }

  static async searchProduct(term: string): Promise<OwnerProductStockResult[]> {
    const q = term.trim()
    if (q.length < 2) return []
    const products = await ProductsService.searchProducts(q, undefined, undefined)
    return products.slice(0, 5).map(p => ({
      id: p.id,
      name: p.name,
      reference: p.reference || '—',
      stock: p.stock?.total ?? 0,
      retailPrice: p.retailPrice ?? p.price ?? 0,
      wholesalePrice: p.wholesalePrice ?? p.retailPrice ?? p.price ?? 0,
    }))
  }

}
