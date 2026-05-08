'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClientTable } from '@/components/clients/client-table'
import { ClientModal } from '@/components/clients/client-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useClients } from '@/contexts/clients-context'
import { Client } from '@/types'
import { toast } from 'sonner'

export default function ClientsPage() {
  const router = useRouter()
  const { clients, loading, createClient, updateClient, deleteClient, getAllClients } = useClients()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)

  const handleEdit = (client: Client) => {
    setSelectedClient(client)
    setIsModalOpen(true)
  }

  const handleDelete = (client: Client) => {
    setClientToDelete(client)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (clientToDelete) {
      const result = await deleteClient(clientToDelete.id)
      if (result.success) {
        toast.success('Cliente eliminado exitosamente')
        setIsDeleteModalOpen(false)
        setClientToDelete(null)
      } else {
        toast.error(result.error || 'Error eliminando cliente')
      }
    }
  }

  const handleRefresh = async () => {
    await getAllClients()
    toast.success('Lista de clientes actualizada')
  }

  const handleCreate = () => {
    setSelectedClient(null)
    setIsModalOpen(true)
  }

  const handleSaveClient = async (clientData: Omit<Client, 'id'>) => {
    if (selectedClient) {
      // Edit existing client
      const success = await updateClient(selectedClient.id, clientData)
      if (success) {
        toast.success('Cliente actualizado exitosamente')
        setIsModalOpen(false)
        setSelectedClient(null)
      } else {
        toast.error('Error actualizando cliente')
      }
    } else {
      // Create new client
      const result = await createClient(clientData)
      if (result.client) {
        toast.success('Cliente creado exitosamente')
        setIsModalOpen(false)
      } else {
        toast.error(result.error || 'Error creando cliente')
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-gray-50 py-6 dark:bg-neutral-950">
      <ClientTable
        clients={clients}
        onView={(c) => router.push(`/clients/${c.id}`)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        onRefresh={handleRefresh}
      />

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedClient(null)
        }}
        onSave={handleSaveClient}
        client={selectedClient}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setClientToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="Eliminar Cliente"
        message={`¿Estás seguro de que quieres eliminar el cliente "${clientToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  )
}
