import { supabase, supabaseAdmin } from './supabase'

/**
 * Servicio para manejar sesiones activas en la base de datos
 * Esto permite que las políticas RLS identifiquen al usuario actual
 */
export class SessionService {
  // Duración de la sesión (24 horas)
  private static readonly SESSION_DURATION_HOURS = 24

  /**
   * Crear una nueva sesión para un usuario
   */
  static async createSession(userId: string, sessionToken: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    try {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + this.SESSION_DURATION_HOURS)

      const { error } = await supabaseAdmin
        .from('active_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          ip_address: ipAddress || null,
          user_agent: userAgent || null,
          expires_at: expiresAt.toISOString()
        })

      if (error) {
        console.error('[SESSION SERVICE] Error creating session:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[SESSION SERVICE] Error creating session:', error)
      return false
    }
  }

  /**
   * Actualizar la sesión existente (extender expiración)
   */
  static async refreshSession(sessionToken: string): Promise<boolean> {
    try {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + this.SESSION_DURATION_HOURS)

      const { error } = await supabaseAdmin
        .from('active_sessions')
        .update({
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString()) // Solo actualizar si no está expirada

      if (error) {
        console.error('[SESSION SERVICE] Error refreshing session:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[SESSION SERVICE] Error refreshing session:', error)
      return false
    }
  }

  /**
   * Eliminar una sesión específica
   */
  static async deleteSession(sessionToken: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('active_sessions')
        .delete()
        .eq('session_token', sessionToken)

      if (error) {
        console.error('[SESSION SERVICE] Error deleting session:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[SESSION SERVICE] Error deleting session:', error)
      return false
    }
  }

  /**
   * Eliminar todas las sesiones de un usuario
   */
  static async deleteUserSessions(userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('active_sessions')
        .delete()
        .eq('user_id', userId)

      if (error) {
        console.error('[SESSION SERVICE] Error deleting user sessions:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[SESSION SERVICE] Error deleting user sessions:', error)
      return false
    }
  }

  /**
   * Verificar si una sesión es válida
   */
  static async isValidSession(sessionToken: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('active_sessions')
        .select('id')
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .single()

      if (error || !data) {
        return false
      }

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Obtener el user_id desde una sesión
   */
  static async getUserIdFromSession(sessionToken: string): Promise<string | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('active_sessions')
        .select('user_id')
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .single()

      if (error || !data) {
        return null
      }

      return data.user_id
    } catch (error) {
      return null
    }
  }

  /**
   * Generar un token de sesión único
   */
  static generateSessionToken(): string {
    // Generar un token único usando timestamp + random
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Limpiar sesiones expiradas (llamar periódicamente)
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabaseAdmin.rpc('cleanup_expired_sessions')

      if (error) {
        console.error('[SESSION SERVICE] Error cleaning up sessions:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('[SESSION SERVICE] Error cleaning up sessions:', error)
      return 0
    }
  }
}
