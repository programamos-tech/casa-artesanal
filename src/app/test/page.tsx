import Link from 'next/link'

export default function TestPage() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        🎉 ¡ZONA T está funcionando!
      </h1>
      <div className="bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
          ✅ Sistema Operativo
        </h2>
        <p className="text-green-700 dark:text-green-300">
          El servidor está funcionando correctamente en <code className="bg-green-200 dark:bg-green-800 px-2 py-1 rounded">localhost:3001</code>
        </p>
      </div>
      
      <div className="mt-6 space-y-4">
        <div className="bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200">🔗 Páginas Disponibles:</h3>
          <ul className="mt-2 space-y-1 text-blue-700 dark:text-blue-300">
            <li>• <Link href="/" className="underline hover:no-underline">Reportes</Link></li>
            <li>• <Link href="/login" className="underline hover:no-underline">Página de Login</Link></li>
            <li>• <Link href="/products" className="underline hover:no-underline">Gestión de Productos</Link></li>
            <li>• <Link href="/clients" className="underline hover:no-underline">Gestión de Clientes</Link></li>
            <li>• <Link href="/sales" className="underline hover:no-underline">Gestión de Ventas</Link></li>
          </ul>
        </div>
        
        <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">🔑 Credenciales de Prueba:</h3>
          <div className="mt-2 text-yellow-700 dark:text-yellow-300">
            <p><strong>Email:</strong> (solicitar al administrador)</p>
            <p><strong>Contraseña:</strong> (solicitar al administrador)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
