import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * API para andres.st / backstage: listar actividades (logs) por tienda.
 * GET /api/andres/actividades?store_id=uuid&limit=50
 * Protegida por header x-andres-api-key.
 */

const API_KEY_HEADER = 'x-andres-api-key'
const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get(API_KEY_HEADER)
    const expectedKey = process.env.ANDRES_API_KEY

    if (!expectedKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')?.trim() || null
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200)

    let logsQuery = supabaseAdmin
      .from('logs')
      .select('id, user_id, action, module, details, store_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (storeId) {
      if (storeId === MAIN_STORE_ID) {
        logsQuery = logsQuery.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        logsQuery = logsQuery.eq('store_id', storeId)
      }
    }

    const { data: logs, error: logsError } = await logsQuery

    if (logsError) {
      console.error('[andres/actividades]', logsError)
      return NextResponse.json({ error: 'Error fetching activities' }, { status: 500 })
    }

    const rows = logs ?? []
    const userIds = [...new Set(rows.map((l) => l.user_id).filter(Boolean))] as string[]
    let userNamesMap: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: usersData } = await supabaseAdmin
        .from('users')
        .select('id, name')
        .in('id', userIds)
      if (usersData) {
        userNamesMap = Object.fromEntries(usersData.map((u) => [u.id, u.name ?? '']))
      }
    }

    const activities = rows.map(
      (l: { id: string; user_id: string | null; action: string; module: string; details: unknown; store_id: string | null; created_at: string }) => ({
        id: l.id,
        user_id: l.user_id,
        user_name: (l.user_id && userNamesMap[l.user_id]) || null,
        action: l.action,
        module: l.module,
        details: (l.details as Record<string, unknown>) ?? {},
        store_id: l.store_id ?? null,
        created_at: l.created_at
      })
    )

    return NextResponse.json({ activities }, { status: 200 })
  } catch (error) {
    console.error('[andres/actividades]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
