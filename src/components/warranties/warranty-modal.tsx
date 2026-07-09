'use client'

import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Shield, X } from 'lucide-react'
import type { CreateWarrantyInput } from '@/lib/warranty-service'
import { WarrantyInvoiceForm } from '@/components/warranties/warranty-invoice-form'

interface WarrantyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (warrantyData: CreateWarrantyInput) => Promise<void>
}

export function WarrantyModal({ isOpen, onClose, onSave }: WarrantyModalProps) {
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen) return null

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm dark:bg-black/60 sm:p-6 sm:py-10 lg:px-12 xl:left-56"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex max-h-[min(92dvh,920px)] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-indigo-100/90 bg-gradient-to-b from-indigo-50/45 via-white to-zinc-50 shadow-xl dark:border-indigo-900/40 dark:from-indigo-950/30 dark:via-zinc-900 dark:to-zinc-950 sm:max-w-3xl lg:max-w-4xl">
        <div className="flex items-center justify-between gap-3 border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/95 via-white to-violet-50/65 px-4 py-3.5 dark:border-indigo-900/40 dark:from-indigo-950/50 dark:via-zinc-950 dark:to-violet-950/25 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-200/90 bg-indigo-50 dark:border-indigo-700/50 dark:bg-indigo-950/50">
              <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 sm:text-lg">
                Nueva garantía por factura
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Devuelve varias referencias y entrega reemplazos que sumen el total de la venta.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 rounded-lg p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <WarrantyInvoiceForm onSave={onSave} onCancel={onClose} />
        </div>
      </div>
    </div>
  )

  return mounted ? createPortal(modal, document.body) : null
}
