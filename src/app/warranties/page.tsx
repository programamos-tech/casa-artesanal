'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WarrantyTable } from '@/components/warranties/warranty-table'
import { WarrantyModal } from '@/components/warranties/warranty-modal'
import { useWarranties } from '@/contexts/warranty-context'
import { Warranty } from '@/types'

export default function WarrantiesPage() {
  const router = useRouter()
  const {
    warranties,
    loading,
    createWarranty,
    updateWarrantyStatus,
    searchWarranties,
    refreshWarranties
  } = useWarranties()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null)
  const [searchResults, setSearchResults] = useState<Warranty[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchActive, setSearchActive] = useState(false)

  const handleRefresh = async () => {
    await refreshWarranties()
  }

  const handleCreateWarranty = () => {
    setSelectedWarranty(null)
    setShowCreateModal(true)
  }

  const handleViewWarranty = (warranty: Warranty) => {
    router.push(`/warranties/${warranty.id}`)
  }

  const handleEditWarranty = (warranty: Warranty) => {
    // Modal de edición eliminado - las garantías se completan automáticamente

  }

  const handleSaveWarranty = async (warrantyData: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createWarranty(warrantyData)
      setShowCreateModal(false)
      setShowEditModal(false)
      await refreshWarranties()
    } catch (error) {
      // Error silencioso en producción
    }
  }

  const handleStatusChange = async (warrantyId: string, newStatus: string, notes?: string) => {
    try {
      await updateWarrantyStatus(warrantyId, newStatus, notes)
      await refreshWarranties()
    } catch (error) {
      // Error silencioso en producción
    }
  }

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      setSearchActive(false)
      setIsSearching(false)
      return
    }

    setSearchActive(true)
    setIsSearching(true)
    try {
      const results = await searchWarranties(searchTerm)
      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const warrantiesToShow = searchActive ? searchResults : warranties

  return (
    <div className="min-h-screen space-y-4 bg-white py-4 pb-24 dark:bg-neutral-950 md:space-y-6 md:py-6 xl:pb-8">
      <WarrantyTable
          warranties={warrantiesToShow}
          loading={loading || isSearching}
          onCreate={handleCreateWarranty}
          onView={handleViewWarranty}
          onEdit={handleEditWarranty}
          onStatusChange={handleStatusChange}
          onSearch={handleSearch}
          onRefresh={handleRefresh}
        />

        {/* Modales */}
        {showCreateModal && (
          <WarrantyModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSave={handleSaveWarranty}
          />
        )}

        {showEditModal && selectedWarranty && (
          <WarrantyModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSave={handleSaveWarranty}
            warranty={selectedWarranty}
          />
        )}

    </div>
  )
}
