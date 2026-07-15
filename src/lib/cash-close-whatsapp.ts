/** Destinatarios por defecto del informe de cierre de caja (Efraín + copia de prueba). */
export const CAJA_WHATSAPP_PHONES = ['573205689053', '573152802343'] as const
/** @deprecated usar CAJA_WHATSAPP_PHONES */
export const CAJA_WHATSAPP_PHONE = CAJA_WHATSAPP_PHONES[0]

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

export function buildCashCloseWhatsAppMessage(input: CashCloseReportInput): string {
  const transfers =
    (input.salesNequi || 0) +
    (input.salesBancolombia || 0) +
    (input.salesTransfer || 0)
  const diffLabel =
    input.difference === 0 ? 'Cuadra' : input.difference > 0 ? 'Sobra' : 'Falta'

  const lines: string[] = [
    '*CIERRE DE CAJA*',
    input.storeName,
    `Apertura: ${formatDateTimeCo(input.openedAt)}`,
    `Cierre: ${formatDateTimeCo(input.closedAt)}`,
    '',
    `Vendido: ${moneyCop(input.totalIngresos)} (${input.salesCount} facturas)`,
    `Efectivo: ${moneyCop(input.salesCash)}`,
    `Transferencias: ${moneyCop(transfers)}`,
    `Egresos: ${moneyCop(input.totalEgresos)} (${input.egresosCount})`,
    `Caja contada: ${moneyCop(input.countedCash)}`,
    `Diferencia: ${moneyCop(input.difference)} (${diffLabel})`,
  ]

  if (input.notes?.trim()) {
    lines.push(`Nota: ${input.notes.trim()}`)
  }

  return lines.join('\n')
}

export function buildWhatsAppDeepLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

function normalizePhoneList(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[,;\s]+/)
    .map((p) => p.replace(/\D/g, ''))
    .filter((p) => p.length >= 10)
}

export function getCajaWhatsAppPhones(): string[] {
  const fromEnv = normalizePhoneList(
    process.env.CAJA_WHATSAPP_TO || process.env.NEXT_PUBLIC_CAJA_WHATSAPP_TO
  )
  const phones = fromEnv.length > 0 ? fromEnv : [...CAJA_WHATSAPP_PHONES]
  return Array.from(new Set(phones))
}

export function getCajaWhatsAppPhone(): string {
  return getCajaWhatsAppPhones()[0] || CAJA_WHATSAPP_PHONE
}

export function formatPhonesForDisplay(phones: string[]): string {
  return phones
    .map((p) => {
      const d = p.replace(/\D/g, '')
      if (d.startsWith('57') && d.length === 12) {
        return `+57 ${d.slice(2, 5)} ${d.slice(5)}`
      }
      return `+${d}`
    })
    .join(', ')
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

export async function sendWhatsAppViaCallMeBotToAll(
  phones: string[],
  message: string
): Promise<{ sentAll: boolean; sentCount: number; errors: string[] }> {
  const results = await Promise.all(
    phones.map(async (phone) => {
      const result = await sendWhatsAppViaCallMeBot(phone, message)
      return { phone, ...result }
    })
  )
  const sentCount = results.filter((r) => r.sent).length
  const errors = results
    .filter((r) => !r.sent && r.error)
    .map((r) => `${r.phone}: ${r.error}`)
  return {
    sentAll: sentCount > 0 && sentCount === phones.length,
    sentCount,
    errors,
  }
}
