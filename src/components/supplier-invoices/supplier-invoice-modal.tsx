'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { X, FileText, Upload, Plus, Trash2 } from 'lucide-react'
import { Supplier, SupplierInvoice } from '@/types'
import { SupplierInvoicesService } from '@/lib/supplier-invoices-service'
import { supabase } from '@/lib/supabase'
import { compressImageForUpload } from '@/lib/compress-image-for-upload'
import {
  SUPPLIER_INVOICE_MAX_ATTACHMENTS,
  SUPPLIER_INVOICE_MAX_PDF_BYTES,
} from '@/lib/supplier-invoice-image-limits'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  appModalBodyClass,
  appModalFooterClass,
  appModalHeaderClass,
  appModalHintClass,
  appModalInputClass,
  appModalLabelClass,
  appModalOverlayClass,
  appModalPanelClass,
} from '@/lib/app-modal'
import { cardShell } from '@/lib/card-shell'

/** Valor guardado en BD: URL absoluta o ruta `invoices/...` dentro del bucket. */
function supplierInvoiceStoredToPublicUrl(stored: string): string {
  const s = stored.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  const path = s.replace(/^\/+/, '').replace(/^supplier-invoices\//, '')
  if (!path) return ''
  return supabase.storage.from('supplier-invoices').getPublicUrl(path).data.publicUrl
}

function isPdfStorageRef(ref: string): boolean {
  const path = ref.split('?')[0].toLowerCase()
  return path.endsWith('.pdf')
}

/** Folio único tipo FV-20260328-A1B2C3D4 (sin depender de la red). */
function generateSupplierInvoiceFolio(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const suffix =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase()
  return `FV-${y}${m}${day}-${suffix}`
}

interface SupplierInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  /** Tras guardar: recargar datos en el padre antes de cerrar (evita ver el detalle desactualizado). */
  onSaved: () => void | Promise<void>
  invoice?: SupplierInvoice | null
  /** Al crear factura nueva, preseleccionar proveedor (p. ej. vista por proveedor). */
  defaultSupplierId?: string
}

export function SupplierInvoiceModal({
  isOpen,
  onClose,
  onSaved,
  invoice,
  defaultSupplierId = '',
}: SupplierInvoiceModalProps) {
  const { user } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [totalStr, setTotalStr] = useState('')
  const [notes, setNotes] = useState('')
  /** Rutas `invoices/…` o URLs absolutas devueltas por la API (máx. 5). */
  const [attachmentRefs, setAttachmentRefs] = useState<string[]>([])
  const [issueDate, setIssueDate] = useState<Date | null>(null)
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [mounted, setMounted] = useState(false)
  /** Evita resetear el formulario (y borrar la foto subida) cuando el padre hace refetch y pasa otro objeto con el mismo id. */
  const formHydratedSessionKeyRef = useRef<string | null>(null)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  const formatNumber = (value: string): string => {
    const numeric = value.replace(/[^\d]/g, '')
    if (!numeric) return ''
    return parseInt(numeric, 10).toLocaleString('es-CO')
  }

  const parseTotal = (value: string) =>
    parseFloat(value.replace(/[^\d]/g, '')) || 0

  useEffect(() => {
    if (!isOpen) return
    const load = async () => {
      try {
        const list = await SupplierInvoicesService.getSuppliers(true)
        setSuppliers(list)
      } catch {
        setSuppliers([])
      }
    }
    load()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      formHydratedSessionKeyRef.current = null
      return
    }
    const sessionKey = invoice?.id ?? `__new__:${defaultSupplierId || '_'}`
    if (formHydratedSessionKeyRef.current === sessionKey) {
      return
    }
    formHydratedSessionKeyRef.current = sessionKey

    if (invoice) {
      setSupplierId(invoice.supplierId)
      setInvoiceNumber(invoice.invoiceNumber)
      setTotalStr(
        invoice.totalAmount > 0
          ? Math.round(invoice.totalAmount).toLocaleString('es-CO')
          : ''
      )
      setNotes(invoice.notes || '')
      setAttachmentRefs(invoice.attachmentRefs?.length ? [...invoice.attachmentRefs] : [])
      setIssueDate(invoice.issueDate ? new Date(invoice.issueDate + 'T12:00:00') : null)
      setDueDate(invoice.dueDate ? new Date(invoice.dueDate + 'T12:00:00') : null)
      setShowNewSupplier(false)
      setNewSupplierName('')
    } else {
      setSupplierId(defaultSupplierId?.trim() || '')
      setInvoiceNumber(generateSupplierInvoiceFolio())
      setTotalStr('')
      setNotes('')
      setAttachmentRefs([])
      setIssueDate(new Date())
      setDueDate(null)
      setShowNewSupplier(false)
      setNewSupplierName('')
    }
  }, [isOpen, invoice, defaultSupplierId])

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return

    const remaining = SUPPLIER_INVOICE_MAX_ATTACHMENTS - attachmentRefs.length
    if (remaining <= 0) {
      toast.error(`Máximo ${SUPPLIER_INVOICE_MAX_ATTACHMENTS} comprobantes por factura`)
      return
    }

    const batch = files.slice(0, remaining)
    if (files.length > remaining) {
      toast.message(`Solo se añaden ${remaining} archivo(s) (máx. ${SUPPLIER_INVOICE_MAX_ATTACHMENTS} en total)`)
    }

    for (const file of batch) {
      const isPdf =
        file.type === 'application/pdf' || /\.pdf$/i.test(file.name.split('\\').pop() || file.name)
      if (isPdf) {
        if (file.size > SUPPLIER_INVOICE_MAX_PDF_BYTES) {
          toast.error(`${file.name}: el PDF supera 5 MB`)
          continue
        }
      } else if (!file.type.startsWith('image/')) {
        toast.error(`${file.name}: solo imágenes o PDF`)
        continue
      }

      setUploading(true)
      try {
        const body = isPdf ? file : await compressImageForUpload(file)
        const fd = new FormData()
        fd.append('file', body)
        const res = await fetch('/api/storage/upload-supplier-invoice', {
          method: 'POST',
          body: fd,
        })
        const text = await res.text()
        let json: { error?: string; url?: string; path?: string } = {}
        try {
          json = text ? (JSON.parse(text) as typeof json) : {}
        } catch {
          throw new Error(
            res.status === 413
              ? 'El archivo supera el tamaño máximo permitido.'
              : 'No se pudo procesar la respuesta del servidor al subir el archivo.'
          )
        }
        if (!res.ok) throw new Error(json.error || 'Error al subir')
        const path = typeof json.path === 'string' ? json.path.trim() : ''
        const url = typeof json.url === 'string' ? json.url.trim() : ''
        const stored = path || url
        if (!stored) throw new Error('El servidor no devolvió la ruta del archivo')
        setAttachmentRefs((prev) => [...prev, stored])
        toast.success(isPdf ? 'PDF subido' : 'Imagen subida')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al subir archivo')
      } finally {
        setUploading(false)
      }
    }
  }

  const removeAttachment = (index: number) => {
    setAttachmentRefs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreateSupplier = async () => {
    const name = newSupplierName.trim()
    if (!name) {
      toast.error('Escribe el nombre del proveedor')
      return
    }
    try {
      const s = await SupplierInvoicesService.createSupplier({
        name,
        storeId: user?.storeId || '00000000-0000-0000-0000-000000000001',
        isActive: true
      })
      setSuppliers((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)))
      setSupplierId(s.id)
      setShowNewSupplier(false)
      setNewSupplierName('')
      toast.success('Proveedor creado')
    } catch {
      toast.error('No se pudo crear el proveedor')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId) {
      toast.error('Selecciona un proveedor')
      return
    }
    if (!invoiceNumber.trim()) {
      toast.error('Folio no disponible; cierra y vuelve a abrir el formulario')
      return
    }
    if (!issueDate) {
      toast.error('Indica la fecha de emisión')
      return
    }
    const total = parseTotal(totalStr)
    if (total <= 0) {
      toast.error('El total debe ser mayor a 0')
      return
    }
    const y = issueDate.getFullYear()
    const m = String(issueDate.getMonth() + 1).padStart(2, '0')
    const d = String(issueDate.getDate()).padStart(2, '0')
    const issueIso = `${y}-${m}-${d}`
    let dueIso: string | undefined
    if (dueDate) {
      const y2 = dueDate.getFullYear()
      const m2 = String(dueDate.getMonth() + 1).padStart(2, '0')
      const d2 = String(dueDate.getDate()).padStart(2, '0')
      dueIso = `${y2}-${m2}-${d2}`
    }
    setSaving(true)
    try {
      if (invoice) {
        await SupplierInvoicesService.updateInvoice(invoice.id, {
          invoiceNumber: invoiceNumber.trim(),
          issueDate: issueIso,
          dueDate: dueIso ?? null,
          totalAmount: total,
          documentUrls: attachmentRefs.map((s) => s.trim()).filter(Boolean),
          notes: notes.trim() || null,
        })
        toast.success('Factura actualizada')
      } else {
        await SupplierInvoicesService.createInvoice({
          supplierId,
          invoiceNumber: invoiceNumber.trim(),
          issueDate: issueIso,
          dueDate: dueIso,
          totalAmount: total,
          documentUrls: attachmentRefs.map((s) => s.trim()).filter(Boolean),
          notes: notes.trim() || undefined,
          createdBy: user?.id,
        })
        toast.success('Factura registrada')
      }
      await Promise.resolve(onSaved())
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const isEdit = Boolean(invoice)
  const blocked =
    invoice?.status === 'cancelled' || invoice?.status === 'paid'

  const selectClass = cn(appModalInputClass, 'h-11 cursor-pointer appearance-auto')

  const modal = (
    <div className={appModalOverlayClass} role="presentation" onClick={onClose}>
      <div
        className={cn(appModalPanelClass, 'max-h-[min(92dvh,880px)] max-w-2xl')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-invoice-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <div className={appModalHeaderClass}>
          <div className="flex min-w-0 items-center gap-2.5">
            <FileText className="h-5 w-5 shrink-0 text-zinc-600 dark:text-zinc-400" strokeWidth={1.75} aria-hidden />
            <div className="min-w-0">
              <h2
                id="supplier-invoice-modal-title"
                className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
              >
                {isEdit ? 'Editar factura' : 'Nueva factura de proveedor'}
              </h2>
              {isEdit && invoiceNumber.trim() ? (
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                  Folio:{' '}
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{invoiceNumber}</span>
                </p>
              ) : (
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">Datos de la factura</p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 rounded-md p-0"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className={cn(appModalBodyClass, 'space-y-4')}>
            {blocked && (
              <p className={cn(cardShell, 'p-3 text-sm text-zinc-700 dark:text-zinc-300')}>
                Esta factura no se puede editar (pagada o anulada).
              </p>
            )}

            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label htmlFor="supplier-invoice-supplier" className={cn(appModalLabelClass, 'mb-0')}>
                  Proveedor
                </label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                  onClick={() => setShowNewSupplier(v => !v)}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  Nuevo proveedor
                </button>
              </div>
              {showNewSupplier && (
                <div className="mb-2 flex gap-2">
                  <input
                    placeholder="Nombre del proveedor"
                    value={newSupplierName}
                    onChange={e => setNewSupplierName(e.target.value)}
                    className={cn(appModalInputClass, 'h-10')}
                  />
                  <Button type="button" onClick={handleCreateSupplier} className="shrink-0">
                    Crear
                  </Button>
                </div>
              )}
              <select
                id="supplier-invoice-supplier"
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                disabled={blocked || isEdit}
                className={selectClass}
              >
                <option value="">Seleccionar…</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <span className={appModalLabelClass}>Emisión</span>
                <DatePicker
                  selectedDate={issueDate}
                  onDateSelect={setIssueDate}
                  placeholder="Fecha"
                  className="w-full"
                />
              </div>
              <div>
                <span className={appModalLabelClass}>Vencimiento (opcional)</span>
                <DatePicker
                  selectedDate={dueDate}
                  onDateSelect={setDueDate}
                  placeholder="Opcional"
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label htmlFor="supplier-invoice-total" className={appModalLabelClass}>
                Total a pagar
              </label>
              <input
                id="supplier-invoice-total"
                value={totalStr}
                onChange={e => setTotalStr(formatNumber(e.target.value))}
                disabled={blocked}
                placeholder="0"
                inputMode="numeric"
                className={cn(appModalInputClass, 'h-10 text-base font-semibold tabular-nums')}
              />
            </div>

            <div>
              <label htmlFor="supplier-invoice-notes" className={appModalLabelClass}>
                Notas (opcional)
              </label>
              <textarea
                id="supplier-invoice-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={blocked}
                rows={2}
                className={cn(appModalInputClass, 'min-h-[4.5rem] resize-y py-2.5')}
                placeholder="Orden de compra, observaciones…"
              />
            </div>

            <div className={cn(cardShell, 'space-y-2 p-3')}>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <span className={cn(appModalLabelClass, 'mb-0')}>Comprobantes (imagen o PDF)</span>
                <span className={cn(appModalHintClass, 'tabular-nums')}>
                  {attachmentRefs.length}/{SUPPLIER_INVOICE_MAX_ATTACHMENTS}
                </span>
              </div>
              <p className={appModalHintClass}>
                Hasta {SUPPLIER_INVOICE_MAX_ATTACHMENTS} archivos. Imágenes máx. 2 MB (se comprimen en el
                navegador). PDF máx. 5 MB.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-2 rounded-lg border-transparent bg-emerald-500 px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600',
                    (blocked || uploading || attachmentRefs.length >= SUPPLIER_INVOICE_MAX_ATTACHMENTS) &&
                      'pointer-events-none opacity-50'
                  )}
                >
                  <Upload className="h-4 w-4" strokeWidth={1.75} />
                  {uploading ? 'Subiendo…' : 'Añadir archivos'}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={handleFiles}
                    disabled={
                      uploading || blocked || attachmentRefs.length >= SUPPLIER_INVOICE_MAX_ATTACHMENTS
                    }
                  />
                </label>
              </div>
              {attachmentRefs.length > 0 && (
                <ul className="mt-1 space-y-2">
                  {attachmentRefs.map((ref, index) => {
                    const publicUrl = supplierInvoiceStoredToPublicUrl(ref)
                    const pdf = isPdfStorageRef(ref)
                    const label = ref.split('/').pop() || `Archivo ${index + 1}`
                    return (
                      <li
                        key={`${ref}-${index}`}
                        className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900/60"
                      >
                        <div className="min-w-0 flex-1">
                          {pdf ? (
                            <a
                              href={publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm font-medium text-zinc-800 hover:underline dark:text-zinc-200"
                            >
                              <FileText className="h-8 w-8 shrink-0 text-rose-600/90 dark:text-rose-400/90" strokeWidth={1.75} />
                              <span className="truncate">{label}</span>
                            </a>
                          ) : (
                            <a
                              href={publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block overflow-hidden rounded-md"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={publicUrl}
                                alt=""
                                className="h-20 w-full max-w-[200px] object-cover object-left"
                              />
                            </a>
                          )}
                          <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
                        </div>
                        {!blocked && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 shrink-0 p-0 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400"
                            onClick={() => removeAttachment(index)}
                            aria-label="Quitar archivo"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className={appModalFooterClass}>
            <Button type="button" variant="destructive" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || blocked || uploading}>
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
