/** @type {import('next').NextConfig} */
/** Patrones para imágenes en Storage (catálogo /tienda). Incluye Supabase local http://127.0.0.1:54321 */
function supabaseStorageImagePatterns() {
  const patterns = []
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (raw) {
    try {
      const u = new URL(raw)
      const entry = {
        protocol: u.protocol === 'https:' ? 'https' : 'http',
        hostname: u.hostname,
        pathname: '/storage/v1/object/public/**',
      }
      if (u.port) {
        entry.port = u.port
      }
      patterns.push(entry)
    } catch {
      // ignore
    }
  }
  // CLI local (por defecto); no rompe producción si no se usa
  patterns.push({
    protocol: 'http',
    hostname: '127.0.0.1',
    port: '54321',
    pathname: '/storage/v1/object/public/**',
  })
  patterns.push({
    protocol: 'http',
    hostname: 'localhost',
    port: '54321',
    pathname: '/storage/v1/object/public/**',
  })
  return patterns
}

const catalogImagePatterns = supabaseStorageImagePatterns()

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 90, 100],
    remotePatterns: catalogImagePatterns,
  },
  // Desactivado temporalmente: a veces bloquea el arranque del dev server
  // experimental: {
  //   optimizePackageImports: ['lucide-react', 'recharts'],
  // },
  // turbopack: { rules: { '*.svg': { loaders: ['@svgr/webpack'], as: '*.js' } } },
}

module.exports = nextConfig
