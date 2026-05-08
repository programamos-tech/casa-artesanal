import { createClient } from '@supabase/supabase-js'

// Obtener variables de entorno - NO usar valores por defecto para evitar conexiones incorrectas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validar que las variables estén definidas
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variables de entorno de Supabase no configuradas. Crea .env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (copia .env.local.example).'
  )
}

// Cliente para operaciones del cliente (anon)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente para operaciones del servidor (service role)
// Solo crear si la key está disponible
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
  : supabase // Fallback al cliente anon si no hay service key (solo para desarrollo local)

// Tipos para la base de datos
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          password: string
          role: string
          permissions: any[]
          is_active: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          password: string
          role: string
          permissions?: any[]
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          password?: string
          role?: string
          permissions?: any[]
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          name: string
          description: string
          permissions: any[]
          is_system: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          permissions?: any[]
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          permissions?: any[]
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      logs: {
        Row: {
          id: string
          user_id: string
          action: string
          module: string
          details: any
          ip_address: string | null
          user_agent: string | null
          store_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          module: string
          details?: any
          ip_address?: string | null
          user_agent?: string | null
          store_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          module?: string
          details?: any
          ip_address?: string | null
          user_agent?: string | null
          store_id?: string | null
          created_at?: string
        }
      }
    }
  }
}
