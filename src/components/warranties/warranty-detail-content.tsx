'use client'

import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  User,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Trash2,
  Calendar,
  Hash,
} from 'lucide-react'
import { Warranty } from '@/types'

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'pending':
      return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-200'
    case 'in_progress':
      return 'border-zinc-300 bg-zinc-100/90 text-zinc-800 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-100'
    case 'completed':
      return 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-950/40 dark:text-emerald-300/90'
    case 'rejected':
      return 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400'
    case 'discarded':
      return 'border-zinc-200/80 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-500'
    default:
      return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'in_progress':
      return 'En proceso'
    case 'completed':
      return 'Completado'
    case 'rejected':
      return 'Rechazado'
    case 'discarded':
      return 'Descartado'
    default:
      return status
  }
}

function getStatusIcon(status: string) {
  const cls = 'h-3.5 w-3.5 shrink-0'
  switch (status) {
    case 'pending':
      return <Clock className={cls} />
    case 'in_progress':
      return <AlertTriangle className={cls} />
    case 'completed':
      return <CheckCircle className={cls} />
    case 'rejected':
      return <XCircle className={cls} />
    case 'discarded':
      return <Trash2 className={cls} />
    default:
      return <Shield className={cls} />
  }
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const panel =
  'rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50'

interface WarrantyDetailContentProps {
  warranty: Warranty
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{children}</dd>
    </div>
  )
}

export function WarrantyDetailContent({ warranty }: WarrantyDetailContentProps) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      {/* Columna lateral — resumen tipo ERP */}
      <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-80">
        <div className={panel}>
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Estado del registro</p>
            <div className="mt-3">
              <Badge
                variant="outline"
                className={`inline-flex gap-1.5 border px-2.5 py-1 text-sm font-medium ${getStatusBadgeClass(warranty.status)}`}
              >
                {getStatusIcon(warranty.status)}
                {getStatusLabel(warranty.status)}
              </Badge>
            </div>
          </div>
          <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <div className="flex gap-3 px-4 py-3">
              <Hash className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.5} />
              <div className="min-w-0">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">ID interno</dt>
                <dd className="mt-1 break-all font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {warranty.id}
                </dd>
              </div>
            </div>
            <div className="flex gap-3 px-4 py-3">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Creado</dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{formatDateTime(warranty.createdAt)}</dd>
              </div>
            </div>
            {warranty.completedAt && (
              <div className="flex gap-3 px-4 py-3">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600/80 dark:text-emerald-400/90" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Completado</dt>
                  <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{formatDateTime(warranty.completedAt)}</dd>
                </div>
              </div>
            )}
            <div className="flex gap-3 px-4 py-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Última modificación</dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{formatDateTime(warranty.updatedAt)}</dd>
              </div>
            </div>
          </dl>
        </div>
      </aside>

      {/* Columna principal — ficha continua */}
      <div className="min-w-0 flex-1">
        <div className={panel}>
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Datos de la garantía</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Cliente, mercancía de entrada y salida del proceso.</p>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {/* Cliente */}
            <section className="px-4 py-5 md:px-6">
              <div className="mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Cliente</h3>
              </div>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-8">
                <Field label="Nombre">{warranty.clientName}</Field>
                {warranty.client?.email && <Field label="Correo electrónico">{warranty.client.email}</Field>}
                {warranty.client?.phone && <Field label="Teléfono">{warranty.client.phone}</Field>}
              </dl>
            </section>

            {/* Entrada — defectuoso */}
            <section className="px-4 py-5 md:px-6">
              <div className="mb-4 flex items-center gap-2 border-l-2 border-red-500/50 pl-3">
                <Package className="h-4 w-4 text-red-600 dark:text-red-400" strokeWidth={1.5} />
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
                    Mercancía recibida (defectuosa)
                  </h3>
                  <p className="text-[11px] text-zinc-500">Producto ingresado al proceso de garantía</p>
                </div>
              </div>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-8">
                <Field label="Descripción" className="sm:col-span-2">
                  {warranty.productReceivedName}
                </Field>
                {warranty.productReceived?.reference && (
                  <Field label="Referencia">{warranty.productReceived.reference}</Field>
                )}
                <Field label="Cantidad">
                  {warranty.quantityReceived ?? 1} unidad{(warranty.quantityReceived ?? 1) !== 1 ? 'es' : ''}
                </Field>
                {warranty.productReceivedSerial && (
                  <Field label="Número de serie">
                    <span className="font-mono">{warranty.productReceivedSerial}</span>
                  </Field>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Motivo / observación</dt>
                  <dd className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-sm leading-relaxed text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-100">
                    {warranty.reason || '—'}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Salida — nuevo o devolución */}
            <section className="px-4 py-5 md:px-6">
              <div className="mb-4 flex items-center gap-2 border-l-2 border-emerald-500/50 pl-3">
                <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
                    Resolución — mercancía entregada
                  </h3>
                  <p className="text-[11px] text-zinc-500">Reemplazo o cierre del caso</p>
                </div>
              </div>

              {warranty.productDeliveredName ? (
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-8">
                  <Field label="Descripción" className="sm:col-span-2">
                    {warranty.productDeliveredName}
                  </Field>
                  {warranty.productDelivered?.reference && (
                    <Field label="Referencia">{warranty.productDelivered.reference}</Field>
                  )}
                  <Field label="Cantidad entregada">
                    {warranty.quantityDelivered ?? 1} unidad{(warranty.quantityDelivered ?? 1) !== 1 ? 'es' : ''}
                  </Field>
                </dl>
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-950/30">
                  {warranty.notes?.includes('Devolución de dinero') ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Devolución de dinero</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {warranty.productReceived?.price
                          ? `Importe devuelto: $${Number(warranty.productReceived.price).toLocaleString('es-CO')}`
                          : 'Sin detalle de importe en el registro.'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {warranty.productDeliveredId ? 'Producto de reemplazo registrado sin nombre en ficha.' : 'Sin producto de reemplazo.'}
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
