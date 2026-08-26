import { toast } from 'sonner'

/** Abre pestañas en el clic (gesto de usuario) para no bloquear WhatsApp después del fetch. */
export function openCashCloseWhatsAppPreviews(): Window[] {
  return [window.open('about:blank', '_blank'), window.open('about:blank', '_blank')].filter(
    (w): w is Window => Boolean(w)
  )
}

export function closeCashCloseWhatsAppPreviews(previewWindows: Window[]) {
  for (const w of previewWindows) {
    try {
      w.close()
    } catch {
      /* ignore */
    }
  }
}

export async function notifyCashCloseWhatsApp(
  sessionId: string,
  previewWindows: Window[]
): Promise<void> {
  try {
    const res = await fetch('/api/caja/notify-close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      closeCashCloseWhatsAppPreviews(previewWindows)
      toast.message('Caja cerrada', {
        description: 'No se pudo preparar el WhatsApp del informe.',
      })
      return
    }

    const phonesLabel =
      typeof data.phonesLabel === 'string' && data.phonesLabel
        ? data.phonesLabel
        : '+57 320 5689053, +57 315 2802343'

    if (data.sent) {
      closeCashCloseWhatsAppPreviews(previewWindows)
      toast.success(`Informe enviado por WhatsApp a ${phonesLabel}`)
      return
    }

    const urls: string[] = Array.isArray(data.whatsappUrls)
      ? data.whatsappUrls.filter((u: unknown): u is string => typeof u === 'string')
      : data.whatsappUrl
        ? [data.whatsappUrl]
        : []

    if (urls.length > 0) {
      urls.forEach((url, index) => {
        const win = previewWindows[index]
        if (win) {
          win.location.href = url
        } else {
          window.open(url, '_blank', 'noopener,noreferrer')
        }
      })
      for (let i = urls.length; i < previewWindows.length; i++) {
        try {
          previewWindows[i].close()
        } catch {
          /* ignore */
        }
      }
      toast.success('Caja cerrada', {
        description: `WhatsApp listo para ${phonesLabel}. Confirma Enviar en cada chat.`,
      })
      return
    }

    closeCashCloseWhatsAppPreviews(previewWindows)
    toast.success('Caja cerrada')
  } catch {
    closeCashCloseWhatsAppPreviews(previewWindows)
    toast.message('Caja cerrada', {
      description: 'Revisa el historial; el WhatsApp no se pudo abrir.',
    })
  }
}
