import { NextRequest, NextResponse } from 'next/server'
import { CashSessionsService } from '@/lib/cash-sessions-service'
import {
  buildWhatsAppDeepLink,
  getCajaWhatsAppPhone,
  sendWhatsAppViaCallMeBot,
} from '@/lib/cash-close-whatsapp'

/**
 * POST /api/caja/notify-close
 * Genera el informe de cierre y lo envía por WhatsApp (CallMeBot si hay key)
 * o devuelve el enlace wa.me para abrir el chat con el texto listo.
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
    const phone = getCajaWhatsAppPhone()
    const whatsappUrl = buildWhatsAppDeepLink(phone, message)

    const auto = await sendWhatsAppViaCallMeBot(phone, message)

    return NextResponse.json({
      success: true,
      phone,
      message,
      whatsappUrl,
      sent: auto.sent,
      sendError: auto.error || null,
    })
  } catch (error) {
    console.error('notify-close:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al notificar' },
      { status: 500 }
    )
  }
}
