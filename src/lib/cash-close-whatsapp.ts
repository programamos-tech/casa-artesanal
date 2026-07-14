/** Destinatario por defecto del informe de cierre de caja. */
export const CAJA_WHATSAPP_PHONE = '573205689053'

const paymentLabels: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  nequi: 'Nequi',
  bancolombia: 'Bancolombia',
  card: 'Tarjeta',
  credit: 'Crédito',
  mixed: 'Mixto',
  warranty: 'Garantía',
  other: 'Otro',
}

export function moneyCop(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0)
}

export function paymentLabel(method: string): string {
  return paymentLabels[method] || method || '—'
}

export function formatDateTimeCo(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export interface CashCloseSaleLine {
  invoiceNumber: string
  clientName: string
  paymentMethod: string
  total: number
  createdAt: string
  sellerName?: string | null
  items: Array<{
    productName: string
    quantity: number
    total: number
  }>
}

export interface CashCloseEgresoLine {
  concept: string
  description?: string | null
  paymentMethod: string
  amount: number
  expenseDate?: string | null
  createdAt: string
}

export interface CashCloseReportInput {
  storeName: string
  openedAt: string
  closedAt: string
  openedByName: string
  closedByName: string
  openingCash: number
  countedCash: number
  expectedCash: number
  difference: number
  totalIngresos: number
  totalEgresos: number
  salesCash: number
  salesNequi: number
  salesBancolombia: number
  salesTransfer: number
  salesCard: number
  salesCredit: number
  salesOther: number
  creditAbonosCash: number
  creditAbonosOther: number
  egresosCash: number
  egresosOther: number
  salesCount: number
  egresosCount: number
  notes?: string | null
  sales: CashCloseSaleLine[]
  egresos: CashCloseEgresoLine[]
}

const MAX_WHATSAPP_CHARS = 3500

export function buildCashCloseWhatsAppMessage(input: CashCloseReportInput): string {
  const lines: string[] = []
  lines.push('*CIERRE DE CAJA — La Casa Artesanal*')
  lines.push(`Tienda: ${input.storeName}`)
  lines.push(`Apertura: ${formatDateTimeCo(input.openedAt)}`)
  lines.push(`Cierre: ${formatDateTimeCo(input.closedAt)}`)
  lines.push(`Abrió: ${input.openedByName || '—'}`)
  lines.push(`Cerró: ${input.closedByName || '—'}`)
  lines.push('')
  lines.push('*RESUMEN*')
  lines.push(`Fondo inicial: ${moneyCop(input.openingCash)}`)
  lines.push(`Ingresos: ${moneyCop(input.totalIngresos)}`)
  lines.push(`Egresos: ${moneyCop(input.totalEgresos)}`)
  lines.push(`Efectivo esperado: ${moneyCop(input.expectedCash)}`)
  lines.push(`Efectivo contado: ${moneyCop(input.countedCash)}`)
  const diffLabel =
    input.difference === 0 ? 'Cuadra' : input.difference > 0 ? 'Sobra' : 'Falta'
  lines.push(`Diferencia: ${moneyCop(input.difference)} (${diffLabel})`)
  lines.push('')
  lines.push('*INGRESOS POR MEDIO*')
  lines.push(`Efectivo: ${moneyCop(input.salesCash)}`)
  lines.push(`Nequi: ${moneyCop(input.salesNequi)}`)
  lines.push(`Bancolombia: ${moneyCop(input.salesBancolombia)}`)
  lines.push(`Transferencia: ${moneyCop(input.salesTransfer)}`)
  lines.push(`Tarjeta: ${moneyCop(input.salesCard)}`)
  lines.push(`Crédito facturado: ${moneyCop(input.salesCredit)}`)
  lines.push(`Otros: ${moneyCop(input.salesOther)}`)
  lines.push(`Abonos crédito (efectivo): ${moneyCop(input.creditAbonosCash)}`)
  lines.push(`Abonos crédito (otros): ${moneyCop(input.creditAbonosOther)}`)
  lines.push('')
  lines.push('*EGRESOS POR MEDIO*')
  lines.push(`Efectivo: ${moneyCop(input.egresosCash)}`)
  lines.push(`Otros: ${moneyCop(input.egresosOther)}`)

  if (input.notes?.trim()) {
    lines.push('')
    lines.push(`*Nota:* ${input.notes.trim()}`)
  }

  lines.push('')
  lines.push(`*VENTAS DEL TURNO* (${input.salesCount})`)
  if (input.sales.length === 0) {
    lines.push('Sin ventas en el turno.')
  } else {
    for (let i = 0; i < input.sales.length; i++) {
      const sale = input.sales[i]
      const header = `${i + 1}. ${sale.invoiceNumber || 'S/N'} | ${sale.clientName || 'Cliente'} | ${paymentLabel(sale.paymentMethod)} | ${moneyCop(sale.total)}`
      lines.push(header)
      if (sale.sellerName) lines.push(`   Vendedor: ${sale.sellerName}`)
      for (const item of sale.items.slice(0, 8)) {
        lines.push(
          `   • ${item.productName} x${item.quantity} = ${moneyCop(item.total)}`
        )
      }
      if (sale.items.length > 8) {
        lines.push(`   • … +${sale.items.length - 8} productos más`)
      }
    }
  }

  lines.push('')
  lines.push(`*EGRESOS DEL TURNO* (${input.egresosCount})`)
  if (input.egresos.length === 0) {
    lines.push('Sin egresos en el turno.')
  } else {
    for (let i = 0; i < input.egresos.length; i++) {
      const e = input.egresos[i]
      const desc = e.description?.trim() ? ` — ${e.description.trim()}` : ''
      lines.push(
        `${i + 1}. ${e.concept}${desc} | ${paymentLabel(e.paymentMethod)} | ${moneyCop(e.amount)}`
      )
    }
  }

  lines.push('')
  lines.push('_Informe generado automáticamente al cerrar caja._')

  let message = lines.join('\n')
  if (message.length > MAX_WHATSAPP_CHARS) {
    const cut = message.slice(0, MAX_WHATSAPP_CHARS - 80)
    message = `${cut}\n\n… Informe truncado. Detalle completo en el sistema.`
  }
  return message
}

export function buildWhatsAppDeepLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function getCajaWhatsAppPhone(): string {
  return (
    process.env.CAJA_WHATSAPP_TO?.replace(/\D/g, '') ||
    process.env.NEXT_PUBLIC_CAJA_WHATSAPP_TO?.replace(/\D/g, '') ||
    CAJA_WHATSAPP_PHONE
  )
}

/** Envío automático vía CallMeBot si hay API key (opcional). */
export async function sendWhatsAppViaCallMeBot(
  phone: string,
  message: string
): Promise<{ sent: boolean; error?: string }> {
  const apikey = process.env.CALLMEBOT_APIKEY || process.env.CAJA_CALLMEBOT_APIKEY
  if (!apikey) {
    return { sent: false, error: 'Sin API key CallMeBot' }
  }

  const url = new URL('https://api.callmebot.com/whatsapp.php')
  url.searchParams.set('phone', phone.replace(/\D/g, ''))
  url.searchParams.set('text', message)
  url.searchParams.set('apikey', apikey)

  try {
    const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' })
    const body = await res.text()
    if (!res.ok || /error|invalid|blocked/i.test(body)) {
      return { sent: false, error: body.slice(0, 200) || `HTTP ${res.status}` }
    }
    return { sent: true }
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Error CallMeBot',
    }
  }
}
