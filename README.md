# Casa Artesanal - Sistema de Gestión de Ventas

Sistema completo de gestión de ventas, inventario y créditos desarrollado con Next.js y Supabase.

## 🚀 Características

- **Dashboard** con métricas en tiempo real
- **Gestión de Ventas** (efectivo, transferencia, crédito)
- **Control de Inventario** (stock local y bodega)
- **Sistema de Créditos** con seguimiento de pagos
- **Gestión de Clientes** y categorías
- **Sistema de Garantías**
- **Registro de Actividades** completo
- **Control de Usuarios** con roles y permisos

## 🛠️ Tecnologías

- **Frontend**: Next.js 15, React, TypeScript
- **Backend**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Autenticación**: Supabase Auth
- **Deployment**: Vercel

## 📋 Requisitos

- Node.js 18+
- npm o yarn
- Cuenta de Supabase

## 🚀 Instalación

1. Clonar el repositorio
```bash
git clone https://github.com/programamos-tech/casa-artesanal.git
cd casa-artesanal
```

2. Instalar dependencias
```bash
npm install
```

3. Configurar variables de entorno
```bash
cp .env.example .env.local
```

Editar `.env.local` con tus credenciales de Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-de-supabase
```

4. Inicializar la base de datos
```bash
node database/migrations/init-supabase.js
```

5. Ejecutar en desarrollo
```bash
npm run dev
```

## 🔧 Variables de Entorno

### Variables Requeridas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Variables Opcionales

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `NEXT_PUBLIC_APP_NAME` | Nombre de la aplicación | `Casa Artesanal` |
| `NEXT_PUBLIC_APP_VERSION` | Versión de la aplicación | `1.0.0` |

### 🔐 Seguridad

- **NUNCA** commits las variables de entorno al repositorio
- Usa `.env.local` para desarrollo local
- Usa las variables de entorno de tu plataforma de deployment para producción
- Las claves de Supabase deben mantenerse seguras

## 📁 Estructura del Proyecto

```
src/
├── app/                 # Páginas de Next.js
├── components/          # Componentes React
├── lib/                 # Servicios y utilidades
├── hooks/               # Custom hooks
└── types/               # Definiciones TypeScript

database/
└── migrations/          # Scripts de migración de BD
```

## 🔧 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run start` - Servidor de producción
- `npm run lint` - Linter

## 👥 Roles de Usuario

- **Super Admin**: Acceso completo al sistema
- **Administrador**: Gestión completa excepto usuarios
- **Vendedor**: Ventas y clientes
- **Inventario**: Gestión de productos y stock

## 📊 Dashboard

El dashboard muestra métricas clave:
- Total de ingresos (efectivo + transferencia)
- Dinero pendiente (créditos)
- Productos en stock
- Facturas anuladas
- Distribución de métodos de pago

## 🔐 Seguridad

- Autenticación con Supabase
- Row Level Security (RLS) en base de datos
- Validación de permisos por rol
- Logs de todas las actividades

## 📱 Responsive

Diseño completamente responsive para:
- Desktop
- Tablet
- Mobile

## 🚀 Deployment

El proyecto está configurado para deployment automático en Vercel desde la rama `main`.

## 📝 Notas

- Los scripts de migración están en `database/migrations/`
- No ejecutar scripts de migración en producción sin revisión
- Siempre hacer backup antes de cambios en BD

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto es privado y pertenece a Programamos Tech.