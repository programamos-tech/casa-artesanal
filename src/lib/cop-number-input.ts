/** Formato colombiano: miles con punto, sin decimales. */
export function formatCopInputDigits(digits: string): string {
  const raw = digits.replace(/[^\d]/g, '')
  if (!raw) return ''
  return parseInt(raw, 10).toLocaleString('es-CO', { maximumFractionDigits: 0 })
}

export function parseCopInput(value: string): number {
  const raw = value.replace(/[^\d]/g, '')
  if (!raw) return 0
  return parseInt(raw, 10) || 0
}
