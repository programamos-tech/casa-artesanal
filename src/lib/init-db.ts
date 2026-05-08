import { supabaseAdmin } from './supabase'

export async function initializeDatabase() {
  try {

    // 1. Crear tabla de usuarios
    const { error: usersError } = await supabaseAdmin.rpc('create_users_table')
    if (usersError) {

    } else {

    }

    // 2. Crear tabla de roles
    const { error: rolesError } = await supabaseAdmin.rpc('create_roles_table')
    if (rolesError) {

    } else {

    }

    // 3. Crear tabla de logs
    const { error: logsError } = await supabaseAdmin.rpc('create_logs_table')
    if (logsError) {

    } else {

    }

    // 4. Insertar roles por defecto
    const { error: rolesInsertError } = await supabaseAdmin
      .from('roles')
      .upsert([
        {
          id: '1',
          name: 'Super Administrador',
          description: 'Acceso completo a todos los módulos del sistema',
          permissions: [
            { module: 'dashboard', actions: ['view'] },
            { module: 'products', actions: ['view', 'create', 'edit', 'delete'] },
            { module: 'clients', actions: ['view', 'create', 'edit', 'delete'] },
            { module: 'sales', actions: ['view', 'create', 'edit', 'delete', 'cancel'] },
            { module: 'payments', actions: ['view', 'create', 'edit', 'delete'] },
            { module: 'roles', actions: ['view', 'create', 'edit', 'delete'] },
            { module: 'logs', actions: ['view'] }
          ],
          is_system: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Administrador',
          description: 'Gestión de productos, clientes y ventas',
          permissions: [
            { module: 'dashboard', actions: ['view'] },
            { module: 'products', actions: ['view', 'create', 'edit', 'delete'] },
            { module: 'clients', actions: ['view', 'create', 'edit', 'delete'] },
            { module: 'sales', actions: ['view', 'create', 'edit', 'delete', 'cancel'] },
            { module: 'payments', actions: ['view', 'create', 'edit', 'delete'] },
            { module: 'logs', actions: ['view'] }
          ],
          is_system: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Vendedor',
          description: 'Creación de ventas y gestión de abonos',
          permissions: [
            { module: 'dashboard', actions: ['view'] },
            { module: 'products', actions: ['view'] },
            { module: 'clients', actions: ['view', 'create', 'edit'] },
            { module: 'sales', actions: ['view', 'create', 'edit'] },
            { module: 'payments', actions: ['view', 'create', 'edit'] }
          ],
          is_system: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          name: 'Vendedor Junior',
          description: 'Solo creación de ventas',
          permissions: [
            { module: 'dashboard', actions: ['view'] },
            { module: 'products', actions: ['view'] },
            { module: 'clients', actions: ['view'] },
            { module: 'sales', actions: ['view', 'create'] }
          ],
          is_system: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'id' })

    if (rolesInsertError) {

    } else {

    }

    // 5. Insertar usuario Diego
    const { error: diegoError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: '1',
        name: 'Diego Admin',
        email: 'tech@programamos.com',
        password: 'admin123', // En producción, hashear la contraseña
        role: 'superadmin',
        permissions: [
          { module: 'dashboard', actions: ['view'] },
          { module: 'products', actions: ['view', 'create', 'edit', 'delete'] },
          { module: 'clients', actions: ['view', 'create', 'edit', 'delete'] },
          { module: 'sales', actions: ['view', 'create', 'edit', 'delete', 'cancel'] },
          { module: 'payments', actions: ['view', 'create', 'edit', 'delete'] },
          { module: 'roles', actions: ['view', 'create', 'edit', 'delete'] },
          { module: 'logs', actions: ['view'] }
        ],
        is_active: true,
        last_login: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (diegoError) {

    } else {

    }

    return true

  } catch (error) {
      // Error silencioso en producción
    return false
  }
}

// Función para crear las tablas usando SQL directo
export async function createTables() {
  try {
    // Crear tabla de usuarios
    const { error: usersError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(100) NOT NULL,
          permissions JSONB DEFAULT '[]',
          is_active BOOLEAN DEFAULT true,
          last_login TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    // Crear tabla de roles
    const { error: rolesError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          permissions JSONB DEFAULT '[]',
          is_system BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    // Crear tabla de logs
    const { error: logsError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id),
          action VARCHAR(100) NOT NULL,
          module VARCHAR(100) NOT NULL,
          details JSONB DEFAULT '{}',
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    return true

  } catch (error) {
      // Error silencioso en producción
    return false
  }
}
