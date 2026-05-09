'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, XCircle, DollarSign, User, FileText, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { cardShell } from '@/lib/card-shell'
import { Sale } from '@/types'
import { supabaseAdmin } from '@/lib/supabase'

interface CancelledInvoiceInfo extends Sale {
  cancellationReason?: string
  cancelledBy?: string
  cancelledByName?: string
  cancelledAt?: string
}

interface CancelledInvoicesModalProps {
  isOpen: boolean
  onClose: () => void
  sales: Sale[]
  allSales?: Sale[]
}

const labelUpper = 'text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400'

const sectionHeaderClass = 'space-y-0 border-b border-zinc-200 p-4 dark:border-zinc-800'
const sectionTitleClass = 'flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50'

export function CancelledInvoicesModal({ isOpen, onClose, sales, allSales }: CancelledInvoicesModalProps) {
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [cancelledInvoices, setCancelledInvoices] = useState<CancelledInvoiceInfo[]>([])

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadCancellationInfo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sales, allSales])

  const loadCancellationInfo = async () => {
    setIsLoading(true)
    try {
      const salesSource = allSales?.length ? allSales : sales
      const cancelledSales = salesSource.filter(sale => sale.status === 'cancelled')

      let cancellationLogs: any[] = []

      try {
        const { data: logs, error } = await supabaseAdmin
          .from('logs')
          .select(
            `
            id,
            user_id,
            action,
            module,
            details,
            created_at,
            users (
              id,
              name
            )
          `
          )
          .eq('action', 'sale_cancel')
          .eq('module', 'sales')
          .order('created_at', { ascending: false })

        if (error) {
          const { data: logsWithoutJoin, error: errorWithoutJoin } = await supabaseAdmin
            .from('logs')
            .select('id, user_id, action, module, details, created_at')
            .eq('action', 'sale_cancel')
            .eq('module', 'sales')
            .order('created_at', { ascending: false })

          if (!errorWithoutJoin && logsWithoutJoin) {
            const userIds = [...new Set(logsWithoutJoin.map((log: any) => log.user_id).filter(Boolean))]
            const userNames: { [key: string]: string } = {}

            if (userIds.length > 0) {
              const { data: users } = await supabaseAdmin.from('users').select('id, name').in('id', userIds)

              if (users) {
                users.forEach((user: any) => {
                  userNames[user.id] = user.name
                })
              }
            }

            cancellationLogs = logsWithoutJoin.map((log: any) => {
              let parsedDetails = log.details || {}
              if (typeof log.details === 'string') {
                try {
                  parsedDetails = JSON.parse(log.details)
                } catch {
                  parsedDetails = {}
                }
              }

              return {
                id: log.id,
                user_id: log.user_id,
                action: log.action,
                module: log.module,
                details: parsedDetails,
                created_at: log.created_at,
                user_name: log.user_id ? userNames[log.user_id] || 'Usuario Desconocido' : 'Usuario Desconocido',
              }
            })
          }
        } else if (logs) {
          cancellationLogs = logs.map((log: any) => {
            let parsedDetails = log.details || {}
            if (typeof log.details === 'string') {
              try {
                parsedDetails = JSON.parse(log.details)
              } catch {
                parsedDetails = {}
              }
            }

            return {
              id: log.id,
              user_id: log.user_id,
              action: log.action,
              module: log.module,
              details: parsedDetails,
              created_at: log.created_at,
              user_name:
                log.users && typeof log.users === 'object' && log.users.name
                  ? String(log.users.name)
                  : 'Usuario Desconocido',
            }
          })
        }
      } catch (err) {
        console.warn('[CancelledInvoicesModal] Error fetching cancellation logs:', err)
      }

      const invoicesWithInfo: CancelledInvoiceInfo[] = cancelledSales.map(sale => {
        const cancellationLog = cancellationLogs.find(log => {
          const details = log.details || {}
          if (details.saleId === sale.id) return true
          if (sale.invoiceNumber && details.invoiceNumber === sale.invoiceNumber) return true
          if (details.description && typeof details.description === 'string') {
            if (details.description.includes(sale.id)) return true
            if (sale.invoiceNumber && details.description.includes(sale.invoiceNumber)) return true
          }
          return false
        })

        let reason = 'No especificado'
        if (cancellationLog?.details) {
          const details = cancellationLog.details
          if (details.reason) {
            reason = String(details.reason)
          } else if (details.description) {
            const desc = String(details.description)
            const motivoMatch = desc.match(/Motivo:\s*(.+?)(?:\s*-|$)/i)
            if (motivoMatch && motivoMatch[1]) {
              reason = motivoMatch[1].trim()
            } else if (desc.includes('Motivo:')) {
              reason = desc.split('Motivo:')[1]?.split('-')[0]?.trim() || desc
            }
          }
        }

        return {
          ...sale,
          cancellationReason: reason,
          cancelledBy: cancellationLog?.user_id || sale.sellerId,
          cancelledByName: cancellationLog?.user_name || sale.sellerName || 'Usuario desconocido',
          cancelledAt: cancellationLog?.created_at || sale.updatedAt || sale.createdAt,
        }
      })

      invoicesWithInfo.sort((a, b) => {
        const dateA = new Date(a.cancelledAt || a.createdAt).getTime()
        const dateB = new Date(b.cancelledAt || b.createdAt).getTime()
        return dateB - dateA
      })

      setCancelledInvoices(invoicesWithInfo)
    } catch {
      const salesSource = allSales?.length ? allSales : sales
      const cancelledSales = salesSource
        .filter(sale => sale.status === 'cancelled')
        .map(sale => ({
          ...sale,
          cancellationReason: 'No disponible',
          cancelledByName: sale.sellerName || 'Usuario desconocido',
          cancelledAt: sale.updatedAt || sale.createdAt,
        }))
        .sort((a, b) => {
          const dateA = new Date(a.cancelledAt || a.createdAt).getTime()
          const dateB = new Date(b.cancelledAt || b.createdAt).getTime()
          return dateB - dateA
        })
      setCancelledInvoices(cancelledSales)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const totalLostValue = cancelledInvoices.reduce((sum, invoice) => sum + invoice.total, 0)

  if (!isOpen || !mounted || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/[0.18] p-3 backdrop-blur-[3px] dark:bg-black/45 sm:p-6 sm:py-10 xl:left-60"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
      }}
      role="presentation"
    >
      <div
        className="flex max-h-[min(92dvh,920px)] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl ring-1 ring-brand-500/[0.07] dark:border-zinc-800 dark:bg-zinc-950 dark:ring-brand-400/10 sm:max-h-[min(94vh,920px)] sm:max-w-[min(56rem,calc(100vw-2rem))] lg:max-w-4xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancelled-invoices-title"
      >
        {/* Header — mismo patrón que categorías (icono con color, sin cuadrito) */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <XCircle
              className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400"
              strokeWidth={1.5}
              aria-hidden
            />
            <div className="min-w-0">
              <h2
                id="cancelled-invoices-title"
                className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-lg"
              >
                Facturas anuladas
              </h2>
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                Detalle de ventas canceladas en el periodo.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg p-0 text-zinc-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40 dark:hover:text-brand-400"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-brand-50/45 via-white to-white dark:from-brand-950/20 dark:via-zinc-950 dark:to-zinc-950 md:flex md:flex-row md:overflow-hidden">
            {/* Resumen — tarjetas tipo sección categorías */}
            <aside className="shrink-0 border-b border-zinc-200/90 px-4 py-4 dark:border-zinc-800 md:w-72 md:border-b-0 md:border-r md:border-zinc-200 lg:w-80">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                <Card className={cardShell}>
                  <CardHeader className={cn(sectionHeaderClass, 'pb-3')}>
                    <CardTitle className={sectionTitleClass}>
                      <XCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" strokeWidth={1.5} aria-hidden />
                      <span className={cn(labelUpper, 'font-semibold normal-case tracking-normal text-zinc-700 dark:text-zinc-300')}>
                        Total anuladas
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 px-4 pb-4 pt-0">
                    <p className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
                      {cancelledInvoices.length}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Facturas con estado cancelado</p>
                  </CardContent>
                </Card>

                <Card className={cardShell}>
                  <CardHeader className={cn(sectionHeaderClass, 'pb-3')}>
                    <CardTitle className={sectionTitleClass}>
                      <DollarSign className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={1.5} aria-hidden />
                      <span className={cn(labelUpper, 'font-semibold normal-case tracking-normal text-zinc-700 dark:text-zinc-300')}>
                        Valor perdido
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 px-4 pb-4 pt-0">
                    <p className="text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
                      {formatCurrency(totalLostValue)}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Total en facturas anuladas</p>
                  </CardContent>
                </Card>
              </div>
            </aside>

            {/* Lista */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
              <Card className={cardShell}>
                <CardHeader className={sectionHeaderClass}>
                  <CardTitle className={sectionTitleClass}>
                    <FileText
                      className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    Listado
                  </CardTitle>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Facturas canceladas en el periodo seleccionado.
                  </p>
                </CardHeader>
                <CardContent className="p-4 pt-2 sm:p-5 sm:pt-3">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div
                        className="mb-3 h-9 w-9 animate-spin rounded-full border-2 border-zinc-200 border-t-brand-600 dark:border-zinc-700 dark:border-t-brand-500"
                        aria-hidden
                      />
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando información…</p>
                    </div>
                  ) : cancelledInvoices.length > 0 ? (
                    <ul className="space-y-3">
                      {cancelledInvoices.map(invoice => (
                        <li
                          key={invoice.id}
                          className={cn(
                            cardShell,
                            'overflow-hidden transition-shadow duration-150 hover:shadow-md dark:hover:border-zinc-700'
                          )}
                        >
                          <div className="border-b border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/30 sm:flex sm:items-start sm:justify-between sm:gap-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                {invoice.invoiceNumber || 'Sin número'}
                              </span>
                              <span className="rounded-md border border-rose-200/90 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200">
                                Anulada
                              </span>
                            </div>
                            <div className="mt-2 text-left sm:mt-0 sm:text-right">
                              <p className="text-base font-semibold tabular-nums text-rose-700 dark:text-rose-400 sm:text-lg">
                                {formatCurrency(invoice.total)}
                              </p>
                              <p className={cn(labelUpper, 'mt-0.5 normal-case tracking-normal text-zinc-500')}>
                                Valor perdido
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2.5 px-4 py-3 sm:py-4">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                <User className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
                                <span className="shrink-0 text-zinc-500 dark:text-zinc-400">Cliente</span>
                                <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-zinc-100">
                                  {invoice.clientName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                <User className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
                                <span className="shrink-0 text-zinc-500 dark:text-zinc-400">Anulada por</span>
                                <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-zinc-100">
                                  {invoice.cancelledByName || 'Usuario desconocido'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 sm:col-span-2">
                                <Calendar className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
                                <span className="shrink-0 text-zinc-500 dark:text-zinc-400">Anulada el</span>
                                <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                                  {new Date(invoice.cancelledAt || invoice.updatedAt || invoice.createdAt).toLocaleString(
                                    'es-CO'
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                              <div className="flex gap-2">
                                <FileText
                                  className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500"
                                  strokeWidth={1.5}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className={cn(labelUpper, 'mb-1.5 normal-case tracking-normal')}>Motivo</p>
                                  <p className="rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-3 py-2.5 text-sm leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-200">
                                    {invoice.cancellationReason || 'No especificado'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-lg border border-dashed border-rose-200/70 bg-rose-50/35 py-12 text-center dark:border-rose-900/40 dark:bg-rose-950/15">
                      <XCircle
                        className="mx-auto mb-3 h-10 w-10 text-rose-400 dark:text-rose-500"
                        strokeWidth={1.25}
                        aria-hidden
                      />
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No hay facturas anuladas</p>
                      <p className="mx-auto mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                        En este periodo todas las ventas siguen activas.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 justify-end gap-2 border-t border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5 sm:py-4"
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
          }}
        >
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-10 min-w-[7rem]">
            Cerrar
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
