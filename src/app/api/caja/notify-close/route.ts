import { NextRequest, NextResponse } from 'next/server'
import { CashSessionsService } from '@/lib/cash-sessions-service'
import {
  buildCashCloseWhatsAppMessage,
  buildWhatsAppDeepLink,
  formatPhonesForDisplay,
  getCajaWhatsAppPhones,
  sendWhatsAppViaCallMeBotToAll,
} from '@/lib/cash-close-whatsapp'

function resolveAppOrigin(request: NextRequest): string {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  try {
    return new URL(request.url).origin
  } catch {
    return ''
  }
}

/**
 * POST /api/caja/notify-close
 * Genera el informe de cierre y lo envía por WhatsApp a todos los destinatarios
 * (CallMeBot si hay key) o devuelve enlaces wa.me con el texto listo.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = String(body?.sessionId || '')
    if (!sessionId) {
      return NextResponse.json({ error: 'Falta sessionId' }, { status: 400 })
    }

    const session = await CashSessionsService.getSessionById(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    const { report } = await CashSessionsService.buildCloseReportMessage(session)
    const origin = resolveAppOrigin(request)
    const detailUrl = origin ? `${origin}/caja/${sessionId}` : null
    const message = buildCashCloseWhatsAppMessage({
      ...report,
      detailUrl,
    })
    const phones = getCajaWhatsAppPhones()
    const whatsappUrls = phones.map((phone) => buildWhatsAppDeepLink(phone, message))

    const auto = await sendWhatsAppViaCallMeBotToAll(phones, message)

    return NextResponse.json({
      success: true,
      phones,
      phonesLabel: formatPhonesForDisplay(phones),
      message,
      detailUrl,
      whatsappUrl: whatsappUrls[0] || null,
      whatsappUrls,
      sent: auto.sentAll,
      sentCount: auto.sentCount,
      sendError: auto.errors.length ? auto.errors.join('; ') : null,
    })
  } catch (error) {
    console.error('notify-close:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al notificar' },
      { status: 500 }
    )
  }
}
