import { NextRequest, NextResponse } from 'next/server'
import {
  CashSessionsService,
} from '@/lib/cash-sessions-service'
import { isOwnerRole } from '@/lib/roles'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

type SessionUser = {
  role?: string | null
  storeId?: string | null
}

function parseUserFromCookie(request: NextRequest): SessionUser | null {
  const raw = request.cookies.get('casa_artesanal_user')?.value
  if (!raw) return null

  try {
    return JSON.parse(decodeURIComponent(raw)) as SessionUser
  } catch {
    try {
      return JSON.parse(raw) as SessionUser
    } catch {
      return null
    }
  }
}

function resolveStoreId(request: NextRequest, user: SessionUser, bodyStoreId?: string): string | null {
  const isOwner = isOwnerRole(user.role)
  const requested = bodyStoreId || request.nextUrl.searchParams.get('storeId') || undefined

  if (isOwner) {
    return requested || user.storeId || MAIN_STORE_ID
  }

  const userStore = user.storeId || MAIN_STORE_ID
  if (requested && requested !== userStore) return null
  return userStore
}

/**
 * GET /api/caja/include-today-sales
 * Ventas de hoy facturadas antes de abrir caja (no incluidas en el turno).
 */
export async function GET(request: NextRequest) {
  try {
    const user = parseUserFromCookie(request)
    if (!user?.role) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const storeId = resolveStoreId(request, user)
    if (!storeId) {
      return NextResponse.json({ error: 'No autorizado para esta tienda' }, { status: 403 })
    }

    const session = await CashSessionsService.getOpenSession(storeId)
    if (!session) {
      return NextResponse.json({ pending: null, session: null })
    }

    const pending = await CashSessionsService.getTodaySalesBeforeSessionOpen(session)
    return NextResponse.json({ pending, sessionId: session.id })
  } catch (error) {
    console.error('[include-today-sales GET]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al consultar ventas del día' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/caja/include-today-sales
 * Ajusta opened_at al inicio del día para incluir ventas de hoy en el turno abierto.
 */
export async function POST(request: NextRequest) {
  try {
    const user = parseUserFromCookie(request)
    if (!user?.role) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const storeId = resolveStoreId(request, user, typeof body?.storeId === 'string' ? body.storeId : undefined)
    if (!storeId) {
      return NextResponse.json({ error: 'No autorizado para esta tienda' }, { status: 403 })
    }

    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : undefined
    const result = await CashSessionsService.includeTodaySalesInOpenSession({
      storeId,
      sessionId,
    })

    if (!result.success || !result.session) {
      return NextResponse.json(
        { error: result.error || 'No se pudieron incluir las ventas de hoy' },
        { status: 400 }
      )
    }

    const live = await CashSessionsService.computeLiveSummary(result.session)

    return NextResponse.json({
      success: true,
      session: result.session,
      live,
      previousOpenedAt: result.previousOpenedAt,
      newOpenedAt: result.newOpenedAt,
      salesIncluded: result.salesIncluded,
    })
  } catch (error) {
    console.error('[include-today-sales POST]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al incluir ventas del día' },
      { status: 500 }
    )
  }
}
