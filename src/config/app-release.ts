/**
 * Novedades del modal (manual; no lee Git). Tras cada deploy: sube `CURRENT_RELEASE_ID`
 * y edita `items`. Para un aviso “solo de hoy”, alinea el texto con los commits del día.
 */
export const CURRENT_RELEASE_ID = '2026-05-05-1'

export const releaseNotes = {
  title: 'Novedades',
  intro: 'Versión 2.7. Cambios recientes en ZONA T.',
  items: [
    'Ventas a crédito: al imprimir la factura (ticket o desde el detalle de la venta) se incluye el resumen del crédito y el historial de abonos: fechas, método, montos, quien registró cada pago y notas.',
    'Modo claro y barra lateral: mejor contraste en tarjetas y textos; sidebar más ancho y aspecto uniforme entre tema claro y oscuro.',
    'Productos: modal de edición más legible en modo claro; badges de stock y catálogo más claros; al ajustar stock, “Nueva cantidad” usa placeholder en lugar de un 0 editable.',
    'Panel principal: el selector de fecha del día queda alineado y con mejor borde para que “Hoy” se vea correctamente.',
    'Microtienda: acceso a Transferencias desde la barra inferior para administradores con alcance global.',
    'Recepciones: contador de pendientes en el menú y detalle por producto (esperado, recibido, faltante y estado).',
  ],
} as const

export const RELEASE_STORAGE_KEY = 'casa-artesanal:last-seen-release'
