export type FabricaScreen =
  | 'resumen'
  | 'ordenes'
  | 'detalle'
  | 'procesos'
  | 'operario'
  | 'materiales'
  | 'recetas'
  | 'mermas'
  | 'planeacion'

export const FABRICA_NAV: { label: string; items: { name: string; href: string }[] }[] = [
  { label: 'Fábrica', items: [{ name: 'Resumen', href: '/fabrica' }] },
  {
    label: 'Producción',
    items: [
      { name: 'Órdenes de producción', href: '/fabrica/ordenes' },
      { name: 'Procesos en vivo', href: '/fabrica/procesos' },
      { name: 'Vista operario', href: '/fabrica/operario' },
    ],
  },
  {
    label: 'Inventario fábrica',
    items: [
      { name: 'Materiales', href: '/fabrica/materiales' },
      { name: 'Recetas', href: '/fabrica/recetas' },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { name: 'Mermas', href: '/fabrica/mermas' },
      { name: 'Qué producir', href: '/fabrica/planeacion' },
    ],
  },
]

const SCREENS: FabricaScreen[] = ['ordenes', 'procesos', 'operario', 'materiales', 'recetas', 'mermas', 'planeacion']

export function resolveFabricaRoute(segments: string[] | undefined): { screen: FabricaScreen; orderCode?: string } {
  const [first, second] = segments ?? []
  if (!first) return { screen: 'resumen' }
  if (first === 'ordenes' && second) return { screen: 'detalle', orderCode: decodeURIComponent(second).toUpperCase() }
  return { screen: SCREENS.includes(first as FabricaScreen) ? (first as FabricaScreen) : 'resumen' }
}
