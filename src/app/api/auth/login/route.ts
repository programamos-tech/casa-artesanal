import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { SessionService } from '@/lib/session-service'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Usar supabaseAdmin en el servidor (bypass RLS)
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Verificar contraseña (en producción, usar hash)
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Actualizar último login
    await supabaseAdmin
      .from('users')
      .update({ 
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    // Obtener permisos del rol si no tiene
    let permissions = user.permissions || []
    if (!permissions || permissions.length === 0) {
      const { data: role } = await supabaseAdmin
        .from('roles')
        .select('permissions')
        .eq('name', user.role)
        .single()

      if (role?.permissions) {
        permissions = role.permissions
        await supabaseAdmin
          .from('users')
          .update({ permissions, updated_at: new Date().toISOString() })
          .eq('id', user.id)
      }
    }

    // Crear sesión para RLS
    const sessionToken = SessionService.generateSessionToken()
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await SessionService.createSession(user.id, sessionToken, ipAddress, userAgent)

    // Retornar datos del usuario (sin la contraseña)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: permissions,
      isActive: user.is_active,
      storeId: user.store_id || undefined,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      sessionToken: sessionToken
    }

    return NextResponse.json({ user: userData }, { status: 200 })
  } catch (error) {
    console.error('[API AUTH] Error en login:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
