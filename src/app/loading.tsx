'use client'

export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-neutral-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent dark:border-cyan-400 dark:border-t-transparent" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
      </div>
    </div>
  )
}
