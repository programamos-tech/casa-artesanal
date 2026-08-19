'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { compressImageForUpload } from '@/lib/compress-image-for-upload'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { appModalHintClass, appModalLabelClass } from '@/lib/app-modal'
import { cardShell } from '@/lib/card-shell'

function receiptStoredToPublicUrl(stored: string): string {
  const s = stored.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  const path = s.replace(/^\/+/, '').replace(/^credit-payments\//, '')
  if (!path) return ''
  return supabase.storage.from('credit-payments').getPublicUrl(path).data.publicUrl
}

interface PaymentReceiptFieldProps {
  imageUrl: string | null
  onImageUrlChange: (url: string | null) => void
  onUploadingChange?: (uploading: boolean) => void
  disabled?: boolean
}

export function PaymentReceiptField({
  imageUrl,
  onImageUrlChange,
  onUploadingChange,
  disabled = false,
}: PaymentReceiptFieldProps) {
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const receiptPublicUrl = imageUrl ? receiptStoredToPublicUrl(imageUrl) : ''

  const handleReceiptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const blobUrl = URL.createObjectURL(file)
    setUploadPreview(blobUrl)
    setUploading(true)
    onUploadingChange?.(true)
    try {
      const prepared = await compressImageForUpload(file)
      const fd = new FormData()
      fd.append('file', prepared)
      const res = await fetch('/api/storage/upload-credit-payment-receipt', {
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
            ? 'La imagen supera el máximo de 2 MB. Intenta con otra foto.'
            : 'No se pudo procesar la respuesta del servidor al subir la imagen.'
        )
      }
      if (!res.ok) throw new Error(json.error || 'Error al subir')
      const path = typeof json.path === 'string' ? json.path.trim() : ''
      const url = typeof json.url === 'string' ? json.url.trim() : ''
      const stored = path || url
      if (!stored) throw new Error('El servidor no devolvió la ruta ni la URL de la imagen')
      onImageUrlChange(stored)
      toast.success('Comprobante del abono subido')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir imagen')
      onImageUrlChange(null)
    } finally {
      URL.revokeObjectURL(blobUrl)
      setUploadPreview(null)
      setUploading(false)
      onUploadingChange?.(false)
      e.target.value = ''
    }
  }

  return (
    <div className={cn(cardShell, 'space-y-2 p-3')}>
      <span className={cn(appModalLabelClass, 'mb-0')}>Comprobante del abono (opcional)</span>
      <p className={appModalHintClass}>
        Foto del recibo o transferencia. Máx. 2 MB; se comprime en el navegador si hace falta.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={cn(
            'inline-flex cursor-pointer items-center gap-2 rounded-lg border-transparent bg-emerald-500 px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600',
            (uploading || disabled) && 'pointer-events-none opacity-50'
          )}
        >
          <Upload className="h-4 w-4" strokeWidth={1.75} />
          {uploading ? 'Subiendo…' : 'Subir imagen'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleReceiptFile}
            disabled={uploading || disabled}
          />
        </label>
        {receiptPublicUrl ? (
          <button
            type="button"
            className="text-sm font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            onClick={() => {
              onImageUrlChange(null)
              setUploadPreview(null)
            }}
            disabled={uploading || disabled}
          >
            Quitar
          </button>
        ) : null}
        {receiptPublicUrl ? (
          <a
            href={receiptPublicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Abrir
          </a>
        ) : null}
      </div>
      {uploadPreview || receiptPublicUrl ? (
        <div className="relative mt-1 max-h-[min(28dvh,180px)] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/80">
          {uploading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
              Subiendo…
            </div>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={uploadPreview || receiptPublicUrl || ''}
            alt="Vista previa del comprobante de abono"
            className="mx-auto block h-auto max-h-[min(28dvh,180px)] w-full object-contain"
          />
        </div>
      ) : null}
    </div>
  )
}

export function PaymentReceiptThumb({
  url,
  amountLabel,
}: {
  url: string
  amountLabel?: string
}) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 ring-offset-2 transition-opacity hover:opacity-90 dark:border-zinc-600 dark:bg-zinc-800"
        title="Ver comprobante"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={amountLabel ? `Comprobante ${amountLabel}` : 'Comprobante del abono'}
          className="h-14 w-14 object-cover"
        />
      </a>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        Ver más
      </a>
    </div>
  )
}
