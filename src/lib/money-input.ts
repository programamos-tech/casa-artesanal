/** Convierte valores de API/estado (number o string numérico) a número finito. */
export function toMoneyNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'string') return parseMoneyInput(value)
  return 0
}

/** Formato es-CO para campos de precio: miles con punto, decimales con coma. */
export function formatMoneyInput(value: number | string | null | undefined): string {
  const n = toMoneyNumber(value)
  if (n === 0) return ''
  if (Number.isInteger(n)) {
    return n.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }
  return n.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export function parseMoneyInput(value: string): number {
  const trimmed = value.trim().replace(/\$/g, '')
  if (!trimmed) return 0

  const normalized = trimmed.replace(/\s/g, '')

  if (normalized.includes(',')) {
    const [intPart, decPart = ''] = normalized.split(',')
    const intDigits = intPart.replace(/\./g, '').replace(/[^\d-]/g, '')
    const decDigits = decPart.replace(/[^\d]/g, '').slice(0, 2)
    if (!intDigits && !decDigits) return 0
    return parseFloat(decDigits ? `${intDigits}.${decDigits}` : intDigits) || 0
  }

  const digits = normalized.replace(/\./g, '').replace(/[^\d-]/g, '')
  return parseFloat(digits) || 0
}

function toIntegerNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'string') return parseIntegerInput(value)
  return 0
}

/** Enteros con separador de miles (sin decimales). */
export function formatIntegerInput(value: number | string | null | undefined): string {
  const n = toIntegerNumber(value)
  if (n === 0) return ''
  return n.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function parseIntegerInput(value: string): number {
  const digits = value.replace(/\./g, '').replace(/,/g, '').replace(/[^\d-]/g, '')
  return parseInt(digits, 10) || 0
}
