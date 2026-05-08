'use client'

import { useState, useEffect } from 'react'
import { LogsTable } from '@/components/logs/logs-table'
import { LogDetailModal } from '@/components/logs/log-detail-modal'
import { LogsService, LogEntry } from '@/lib/logs-service'

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Cargar logs iniciales al montar el componente y cuando cambie el filtro
  useEffect(() => {
    loadLogs(1)
  }, [moduleFilter])

  const loadLogs = async (page: number = 1) => {
    setLoading(true)
    try {
      let logsData: LogEntry[] = []
      let total = 0
      let hasMoreData = false

      if (moduleFilter === 'all') {
        // Cargar todos los logs con paginación
        const result = await LogsService.getLogsByPage(page, 20)
        logsData = result.logs
        total = result.total
        hasMoreData = result.hasMore
      } else if (moduleFilter === 'credits') {
        // Para créditos, cargar todos los logs y filtrar en el cliente
        // porque necesitamos incluir logs de módulo 'sales' con acciones de crédito
        const allLogs = await LogsService.getAllLogs()
        const filtered = allLogs.filter(log => 
          log.module === 'credits' || 
          (log.module === 'sales' && (log.action === 'credit_sale_create' || 
            (log.action === 'sale_cancel' && (log.details as any)?.isCreditSale === true)))
        )
        total = filtered.length
        const offset = (page - 1) * 20
        logsData = filtered.slice(offset, offset + 20)
        hasMoreData = offset + 20 < total
      } else {
        // Para otros módulos, cargar por módulo
        const allLogs = await LogsService.getLogsByModule(moduleFilter)
        total = allLogs.length
        const offset = (page - 1) * 20
        logsData = allLogs.slice(offset, offset + 20)
        hasMoreData = offset + 20 < total
      }

      setLogs(logsData)
      setTotalLogs(total)
      setHasMore(hasMoreData)
      setCurrentPage(page)
    } catch (error) {
      // Error silencioso en producción
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    loadLogs(page)
  }

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false)
    setSelectedLog(null)
  }

  const handleLogClick = (log: LogEntry) => {
    setSelectedLog(log)
    setIsDetailModalOpen(true)
  }

  // Filtrar logs por búsqueda (el filtro de módulo ya se aplica al cargar)
  const filteredLogs = logs.filter(log => {
    if (searchTerm === '') return true
    
    return log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 py-4 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 max-xl:pb-1 md:py-6">
        <div className="flex h-64 items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-400"
            aria-hidden
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 py-4 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 max-xl:pb-1 md:py-6">
      <LogsTable
        logs={filteredLogs as any}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        moduleFilter={moduleFilter}
        onModuleFilterChange={setModuleFilter}
        onRefresh={() => loadLogs(currentPage)}
        loading={loading}
        currentPage={currentPage}
        totalLogs={totalLogs}
        hasMore={hasMore}
        onPageChange={handlePageChange}
        onLogClick={handleLogClick}
      />

      {/* Mensaje cuando no hay más logs */}
      {!hasMore && logs.length > 0 && (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No hay más actividades para mostrar</p>
        </div>
      )}

      <LogDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetail}
        log={selectedLog as any}
      />
    </div>
  )
}
