import { NextRequest, NextResponse } from 'next/server'
import { CashSessionsService } from '@/lib/cash-sessions-service'
import {
  buildWhatsAppDeepLink,
  formatPhonesForDisplay,
  getCajaWhatsAppPhones,
  sendWhatsAppViaCallMeBotToAll,
} from '@/lib/cash-close-whatsapp'

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

    const { message } = await CashSessionsService.buildCloseReportMessage(session)
    const phones = getCajaWhatsAppPhones()
    const whatsappUrls = phones.map((phone) => buildWhatsAppDeepLink(phone, message))

    const auto = await sendWhatsAppViaCallMeBotToAll(phones, message)

    return NextResponse.json({
      success: true,
      phones,
      phonesLabel: formatPhonesForDisplay(phones),
      message,
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
