/** Conceptos predefinidos de egresos para un comercio. */
export const EGRESO_CONCEPTS = [
  { value: 'arriendo', label: 'Arriendo / canon' },
  { value: 'servicios_publicos', label: 'Servicios públicos (agua, luz, gas)' },
  { value: 'internet_telefonia', label: 'Internet / telefonía' },
  { value: 'nomina', label: 'Nómina / sueldos' },
  { value: 'prestaciones', label: 'Prestaciones sociales' },
  { value: 'seguridad_social', label: 'Seguridad social / aportes' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'camara_comercio', label: 'Cámara de comercio' },
  { value: 'seguros', label: 'Seguros' },
  { value: 'vigilancia', label: 'Vigilancia / seguridad' },
  { value: 'aseo', label: 'Aseo / limpieza' },
  { value: 'mantenimiento', label: 'Mantenimiento del local' },
  { value: 'publicidad', label: 'Publicidad / marketing' },
  { value: 'papeleria', label: 'Papelería / útiles' },
  { value: 'empaques', label: 'Empaques / bolsas' },
  { value: 'transporte', label: 'Transporte / fletes' },
  { value: 'combustible', label: 'Combustible' },
  { value: 'alimentacion', label: 'Alimentación / refrigerios' },
  { value: 'comisiones_bancarias', label: 'Comisiones bancarias' },
  { value: 'intereses_credito', label: 'Intereses / cuotas de crédito' },
  { value: 'deudas', label: 'Deudas / abonos varios' },
  { value: 'pago_proveedor', label: 'Pago a proveedor' },
  { value: 'equipamiento', label: 'Equipamiento / herramientas' },
  { value: 'software', label: 'Software / suscripciones' },
  { value: 'capacitacion', label: 'Capacitación' },
  { value: 'regalos_clientes', label: 'Regalos / detalle a clientes' },
  { value: 'multas', label: 'Multas / sanciones' },
  { value: 'gastos_representacion', label: 'Gastos de representación' },
  { value: 'otro', label: 'Otro (especificar)' },
] as const

export type EgresoConcept = (typeof EGRESO_CONCEPTS)[number]['value']

/** Origen del dinero: caja del turno vs cuenta bancaria/billetera. */
export const EGRESO_KINDS = [
  {
    value: 'caja',
    label: 'Caja del turno',
    hint: 'Gasto operativo del día. Si es en efectivo, baja el efectivo esperado.',
  },
  {
    value: 'cuenta',
    label: 'Cuenta (mensual / alto)',
    hint: 'Arriendo, nómina… Sale de Nequi/Bancolombia/transferencia o del efectivo recaudado del mes. No toca el cierre diario de caja.',
  },
] as const

export type EgresoKind = (typeof EGRESO_KINDS)[number]['value']

/** Conceptos que suelen pagarse desde cuenta (no desde caja chica). */
export const EGRESO_CUENTA_DEFAULT_CONCEPTS = new Set<string>([
  'arriendo',
  'servicios_publicos',
  'internet_telefonia',
  'nomina',
  'prestaciones',
  'seguridad_social',
  'impuestos',
  'camara_comercio',
  'seguros',
  'comisiones_bancarias',
  'intereses_credito',
  'pago_proveedor',
])

export const EGRESO_PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'bancolombia', label: 'Bancolombia' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'other', label: 'Otro' },
] as const

export type EgresoPaymentMethod = (typeof EGRESO_PAYMENT_METHODS)[number]['value']

/** Medios válidos cuando el egreso sale de una cuenta (sin efectivo). */
export const EGRESO_ACCOUNT_PAYMENT_METHODS = EGRESO_PAYMENT_METHODS.filter(
  (m) => m.value !== 'cash'
)

export function getEgresoConceptLabel(concept: string, conceptOther?: string | null): string {
  if (concept === 'otro') {
    return conceptOther?.trim() || 'Otro'
  }
  return EGRESO_CONCEPTS.find((c) => c.value === concept)?.label || concept
}

export function getEgresoPaymentLabel(method: string): string {
  return EGRESO_PAYMENT_METHODS.find((m) => m.value === method)?.label || method
}

export function getEgresoKindLabel(kind: string): string {
  return EGRESO_KINDS.find((k) => k.value === kind)?.label || kind
}

export function suggestedEgresoKind(concept: string): EgresoKind {
  return EGRESO_CUENTA_DEFAULT_CONCEPTS.has(concept) ? 'cuenta' : 'caja'
}

/** Primer día del mes en YYYY-MM-DD (zona local). */
export function firstDayOfMonthISO(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export function formatPeriodMonth(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
}
