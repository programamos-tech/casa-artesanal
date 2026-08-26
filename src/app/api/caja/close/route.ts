import { NextRequest, NextResponse } from 'next/server'
import { CashSessionsService } from '@/lib/cash-sessions-service'

/**
 * POST /api/caja/close
 * Cierra la sesión de caja en el servidor (service role) para evitar fallos del cliente.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = String(body?.sessionId || '')
    if (!sessionId) {
      return NextResponse.json({ error: 'Falta sessionId' }, { status: 400 })
    }

    const useExpectedCash = body?.useExpectedCash === true
    const countedRaw = body?.countedCash
    const countedProvided =
      countedRaw !== null &&
      countedRaw !== undefined &&
      String(countedRaw).trim() !== ''

    if (!useExpectedCash && !countedProvided) {
      return NextResponse.json(
        { error: 'Debes contar el efectivo físico e ingresar el monto antes de cerrar.' },
        { status: 400 }
      )
    }

    const countedCash = useExpectedCash ? 0 : Number(countedRaw)
    if (!useExpectedCash && (!Number.isFinite(countedCash) || countedCash < 0)) {
      return NextResponse.json({ error: 'Efectivo contado inválido' }, { status: 400 })
    }

    const result = await CashSessionsService.closeSession({
      sessionId,
      countedCash,
      countedProvided: true,
      useExpectedCash,
      notes: typeof body?.notes === 'string' ? body.notes : undefined,
      userId: typeof body?.userId === 'string' ? body.userId : undefined,
      userName: typeof body?.userName === 'string' ? body.userName : undefined,
    })

    if (!result.success || !result.session) {
      return NextResponse.json(
        {
          error: result.error || 'No se pudo cerrar la caja',
          blockers: result.blockers || [],
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, session: result.session })
  } catch (error) {
    console.error('caja/close:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al cerrar la caja' },
      { status: 500 }
    )
  }
}
