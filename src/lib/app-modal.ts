/**
 * Patrón unificado de modales (panel + overlay “cristal”):
 * - Misma anchura/altura que “Nuevo usuario” (gestión de roles).
 * - Overlay + panel translúcidos con blur fuerte para ver la vista detrás (claro y oscuro).
 *
 * Nota: las Cards dentro del modal NO deben usar `casa-artesanal-card-surface`: en modo claro
 * globals.css fuerza `background: #fff !important` y anula el efecto cristal.
 */
export const appModalOverlayClass =
  'fixed inset-0 z-[100] flex items-center justify-center p-3 backdrop-blur-xl sm:p-6 sm:py-10 xl:left-60 bg-zinc-950/[0.08] dark:bg-black/55'

/**
 * Contenedor del diálogo (no el backdrop).
 * `lg:max-w-4xl` = dos columnas cómodas en escritorio.
 */
export const appModalPanelClass =
  'isolate flex max-h-[min(92dvh,920px)] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/40 bg-white/45 shadow-2xl ring-1 ring-white/25 backdrop-blur-2xl dark:border-zinc-600/40 dark:bg-zinc-950/50 dark:ring-white/10 sm:max-h-[min(94vh,920px)] sm:max-w-2xl lg:max-w-4xl'

/**
 * Tarjetas internas del modal: vidrio fino, sin `casa-artesanal-card-surface`.
 */
export const modalCardShellClass =
  'max-w-full min-w-0 rounded-xl border border-white/50 bg-white/35 shadow-sm backdrop-blur-md outline outline-1 -outline-offset-1 outline-zinc-300/40 dark:border-zinc-600/50 dark:bg-zinc-900/30 dark:outline-zinc-600/40'
