import type { Metadata } from 'next'
import { TiendaProviders } from '@/components/tienda/tienda-providers'

const siteUrl = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_CATALOG_SITE_URL || 'https://casa-artesanal.com')
  } catch {
    return new URL('https://casa-artesanal.com')
  }
})()

export const metadata: Metadata = {
  title: 'Catálogo de productos | La Casa Artesanal',
  description:
    'Explora el catálogo público de productos de La Casa Artesanal.',
  metadataBase: siteUrl,
  openGraph: {
    title: 'Catálogo La Casa Artesanal',
    description: 'Productos de La Casa Artesanal en un solo lugar.',
    locale: 'es_CO',
    type: 'website',
    siteName: 'La Casa Artesanal'
  }
}

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="tienda-storefront min-h-dvh bg-white text-zinc-900 [color-scheme:light]"
      data-theme="light"
    >
      <TiendaProviders>{children}</TiendaProviders>
    </div>
  )
}
