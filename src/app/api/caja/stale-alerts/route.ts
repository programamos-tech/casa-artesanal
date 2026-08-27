import { NextRequest, NextResponse } from 'next/server'
import { CashSessionsService } from '@/lib/cash-sessions-service'
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

/**
 * GET /api/caja/stale-alerts
 * Estado del semáforo de cajas abiertas (verde / naranja / rojo).
 */
export async function GET(request: NextRequest) {
  try {
    const user = parseUserFromCookie(request)
    if (!user?.role) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const isOwner = isOwnerRole(user.role)
    const scopeStoreId = isOwner
      ? null
      : user.storeId || request.nextUrl.searchParams.get('storeId') || MAIN_STORE_ID

    const sessions = await CashSessionsService.listOpenSessionStatuses(scopeStoreId)
    return NextResponse.json({ sessions, isOwner })
  } catch (error) {
    console.error('[stale-alerts]', error)
    return NextResponse.json({ error: 'No se pudieron cargar las alertas' }, { status: 500 })
  }
}
