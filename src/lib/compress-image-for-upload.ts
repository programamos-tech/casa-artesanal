import { SUPPLIER_INVOICE_MAX_IMAGE_BYTES } from '@/lib/supplier-invoice-image-limits'

export { SUPPLIER_INVOICE_MAX_IMAGE_BYTES } from '@/lib/supplier-invoice-image-limits'

const MAX_EDGE_PX = 2560

function scaleToMaxEdge(width: number, height: number, maxEdge: number) {
  if (width <= maxEdge && height <= maxEdge) {
    return { width, height }
  }
  const s = maxEdge / Math.max(width, height)
  return {
    width: Math.max(1, Math.round(width * s)),
    height: Math.max(1, Math.round(height * s))
  }
}

/**
 * Reduce peso y tamaño en píxeles (comprobantes / fotos) antes de subir.
 * Salida JPEG con calidad ajustada para quedar bajo `maxBytes` sin pasar por borroso innecesario.
 */
export async function compressImageForUpload(
  file: File,
  maxBytes: number = SUPPLIER_INVOICE_MAX_IMAGE_BYTES
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen')
  }

  if (file.type === 'image/gif') {
    if (file.size <= maxBytes) return file
    throw new Error(
      'Los GIF grandes no se optimizan aquí. Usa una foto fija (JPEG o PNG) del comprobante.'
    )
  }

  if (file.size <= maxBytes) {
    return file
  }

  const bitmap = await createImageBitmap(file)
  try {
    const baseName =
      (file.name.replace(/\.[^.]+$/, '') || 'comprobante').replace(/[^\w\-]+/g, '_') || 'comprobante'

    let maxEdge = MAX_EDGE_PX
    let quality = 0.9

    while (maxEdge >= 640) {
      const { width: w, height: h } = scaleToMaxEdge(bitmap.width, bitmap.height, maxEdge)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No se pudo procesar la imagen en este dispositivo')

      ctx.drawImage(bitmap, 0, 0, w, h)

      while (quality >= 0.42) {
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', quality)
        })
        if (blob && blob.size <= maxBytes) {
          return new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
        }
        quality -= 0.06
      }

      maxEdge = Math.round(maxEdge * 0.85)
      quality = 0.9
    }

    throw new Error(
      'No se pudo dejar la imagen bajo 2 MB. Prueba otra foto o recorta el comprobante.'
    )
  } finally {
    bitmap.close()
  }
}
