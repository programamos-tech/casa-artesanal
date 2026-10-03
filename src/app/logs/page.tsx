'use client'

import { useState, useEffect } from 'react'
import { LogsTable } from '@/components/logs/logs-table'
import { LogDetailModal } from '@/components/logs/log-detail-modal'
import { LogsService, LogEntry } from '@/lib/logs-service'
import { useAuth } from '@/contexts/auth-context'

export default function LogsPage() {
  const { user } = useAuth()
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
  }, [moduleFilter, user?.storeId])

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

  if (loading && logs.length === 0) {
    return (
      <div className="py-4 max-xl:pb-1 md:py-6">
        <div className="flex h-64 items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300"
            aria-hidden
          />
        </div>
      </div>
    )
  }

  return (
    <div className="py-4 max-xl:pb-1 md:py-6">
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

      <LogDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetail}
        log={selectedLog as any}
      />
    </div>
  )
}
