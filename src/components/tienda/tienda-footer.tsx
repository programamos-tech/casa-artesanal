import Link from 'next/link'

export function TiendaFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white px-4 py-8 text-center sm:px-6 lg:px-8 xl:px-10 2xl:px-14">
      <p className="text-sm font-semibold text-zinc-900">ZONA T · Zonat</p>
      <p className="mx-auto mt-2 max-w-md px-4 text-xs leading-relaxed text-zinc-500">
        Precios y disponibilidad referenciales. Compra y logística se confirman en tienda o con tu asesor.
      </p>
      <Link
        href="/login"
        className="mt-4 inline-block text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
      >
        Acceso empresas
      </Link>
    </footer>
  )
}
