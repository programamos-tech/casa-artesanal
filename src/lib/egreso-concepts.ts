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
  { value: 'equipamiento', label: 'Equipamiento / herramientas' },
  { value: 'software', label: 'Software / suscripciones' },
  { value: 'capacitacion', label: 'Capacitación' },
  { value: 'regalos_clientes', label: 'Regalos / detalle a clientes' },
  { value: 'multas', label: 'Multas / sanciones' },
  { value: 'gastos_representacion', label: 'Gastos de representación' },
  { value: 'otro', label: 'Otro (especificar)' },
] as const

export type EgresoConcept = (typeof EGRESO_CONCEPTS)[number]['value']

export const EGRESO_PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'bancolombia', label: 'Bancolombia' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'other', label: 'Otro' },
] as const

export type EgresoPaymentMethod = (typeof EGRESO_PAYMENT_METHODS)[number]['value']

export function getEgresoConceptLabel(concept: string, conceptOther?: string | null): string {
  if (concept === 'otro') {
    return conceptOther?.trim() || 'Otro'
  }
  return EGRESO_CONCEPTS.find((c) => c.value === concept)?.label || concept
}

export function getEgresoPaymentLabel(method: string): string {
  return EGRESO_PAYMENT_METHODS.find((m) => m.value === method)?.label || method
}
