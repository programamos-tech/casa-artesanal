/**
 * Interruptores de módulos. El código permanece; solo se oculta/bloquea la UI.
 * Reactivar: poner el flag en `true`.
 */
export const FEATURE_FLAGS = {
  /** Traslados entre tiendas + Recepciones (+ alertas/modales asociados). */
  transfersAndReceptions: false,
} as const

export function isTransfersAndReceptionsEnabled(): boolean {
  return FEATURE_FLAGS.transfersAndReceptions
}

export function isTransfersModule(module: string): boolean {
  return module === 'transfers' || module === 'receptions'
}
