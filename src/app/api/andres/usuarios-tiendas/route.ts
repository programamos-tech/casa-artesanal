import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * API para andres.st / backstage: listar todas las microtiendas (stores) y usuarios.
 * Protegida por header x-andres-api-key (ANDRES_API_KEY en Zonat).
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

    const [storesRes, usersRes, companyRes] = await Promise.all([
      supabaseAdmin
        .from('stores')
        .select('id, name, logo_url')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name'),
      supabaseAdmin
        .from('users')
        .select('id, name, email, role, store_id')
        .eq('is_active', true)
        .order('email'),
      supabaseAdmin
        .from('company_config')
        .select('id, name, value')
        .limit(1)
        .maybeSingle()
    ])

    if (storesRes.error) {
      console.error('[andres/usuarios-tiendas] stores:', storesRes.error)
      return NextResponse.json({ error: 'Error fetching stores' }, { status: 500 })
    }
    if (usersRes.error) {
      console.error('[andres/usuarios-tiendas] users:', usersRes.error)
      return NextResponse.json({ error: 'Error fetching users' }, { status: 500 })
    }

    const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const baseClean = base.replace(/\/$/, '')
    const companyRow = companyRes.data as { id?: string; name?: string; value?: string } | null
    let app_logo_url: string | null = null
    try {
      const val = companyRow?.value
      if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('/'))) {
        app_logo_url = val
      }
    } catch {
      // ignore
    }
    if (app_logo_url?.startsWith('/')) {
      app_logo_url = `${baseClean}${app_logo_url}`
    } else if (!app_logo_url || !app_logo_url.startsWith('http')) {
      app_logo_url = `${baseClean}/logo.ya.png`
    }

    const stores = (storesRes.data ?? []).map(
      (s: { id: string; name: string; logo_url?: string | null }) => {
        let logo = s.logo_url?.trim() || null
        if (logo && logo.startsWith('/')) {
          logo = `${baseClean}${logo}`
        } else if (!logo || !logo.startsWith('http')) {
          logo = app_logo_url
        }
        return { id: s.id, name: s.name, logo_url: logo }
      }
    )

    const users = (usersRes.data ?? []).map(
      (u: { id: string; name: string; email: string; role: string; store_id: string | null }) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        store_id: u.store_id ?? null,
        es_dueño:
          u.role === 'superadmin' ||
          u.role === 'Super Admin' ||
          u.role === 'Super Administrador' ||
          u.role?.toLowerCase() === 'admin'
      })
    )

    return NextResponse.json(
      { stores, users, app_logo_url, main_store_id: MAIN_STORE_ID },
      { status: 200 }
    )
  } catch (error) {
    console.error('[andres/usuarios-tiendas]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
