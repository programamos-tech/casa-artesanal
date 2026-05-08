import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_FILE = /\.(.*)$/

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host')?.split(':')[0] ?? ''
  const catalogHost = process.env.NEXT_PUBLIC_CATALOG_HOST

  if (catalogHost && host === catalogHost && pathname === '/') {
    return NextResponse.rewrite(new URL('/tienda', request.url))
  }

  // Permitir archivos estáticos (imágenes, fuentes, etc.) y rutas públicas específicas
  if (
    pathname === '/login' ||
    pathname === '/select-store' ||
    pathname.startsWith('/tienda') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Verificar si hay un usuario en la cookie
  const user = request.cookies.get('casa_artesanal_user')
  
  if (!user) {
    // Redirigir a login si no hay usuario
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
}
