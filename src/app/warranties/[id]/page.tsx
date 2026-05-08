'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WarrantyDetailContent } from '@/components/warranties/warranty-detail-content'
import { WarrantyService } from '@/lib/warranty-service'
import { Warranty } from '@/types'

export default function WarrantyDetailPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  const [warranty, setWarranty] = useState<Warranty | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setNotFound(true)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setNotFound(false)
      try {
        const w = await WarrantyService.getWarrantyById(id)
        if (cancelled) return
        if (w) {
          setWarranty(w)
        } else {
          setNotFound(true)
        }
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  const shortId = id ? id.slice(-6) : ''

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 pb-28 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 xl:pb-8">
      <div className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex w-full min-w-0 items-center justify-between gap-4 px-4 py-4 sm:py-5 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Shield className="h-6 w-6 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                Garantía #{shortId}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Detalle del registro</p>
            </div>
          </div>
          <Link
            href="/warranties"
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 text-sm font-medium text-zinc-800 transition-colors',
              'hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/70'
            )}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Volver
          </Link>
        </div>
      </div>

      <div className="w-full min-w-0 px-4 py-6 md:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando garantía…</p>
          </div>
        ) : notFound || !warranty ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">No se encontró la garantía</p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Puede que no exista o no tengas permiso para verla.
            </p>
            <Link
              href="/warranties"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-zinc-900 px-6 text-base font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Volver a garantías
            </Link>
          </div>
        ) : (
          <WarrantyDetailContent warranty={warranty} />
        )}
      </div>
    </div>
  )
}
