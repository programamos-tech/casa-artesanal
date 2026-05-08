'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ClientDetailPageView, type ClientDetailEditDraft } from '@/components/clients/client-detail-page-view'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useClients } from '@/contexts/clients-context'
import { ClientsService } from '@/lib/clients-service'
import { isStoreClient } from '@/lib/client-helpers'
import { Client, Credit } from '@/types'
import { CreditsService } from '@/lib/credits-service'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function draftFromClient(c: Client): ClientDetailEditDraft {
  return {
    name: c.name || '',
    email: c.email || '',
    phone: c.phone || '',
    document: c.document || '',
    address: c.address || '',
    city: c.city || '',
    state: c.state || '',
    type: c.type,
    status: c.status,
  }
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = typeof params.clientId === 'string' ? params.clientId : ''

  const { updateClient, deleteClient, getAllClients } = useClients()

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [credits, setCredits] = useState<Credit[]>([])
  const [creditsLoading, setCreditsLoading] = useState(true)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ClientDetailEditDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    setNotFound(false)
    try {
      const data = await ClientsService.getClientById(clientId)
      if (!data) {
        setClient(null)
        setNotFound(true)
      } else {
        setClient(data)
      }
    } catch {
      setClient(null)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    setCreditsLoading(true)
    CreditsService.getCreditsByClientId(clientId)
      .then((list) => {
        if (!cancelled) setCredits(list)
      })
      .catch(() => {
        if (!cancelled) setCredits([])
      })
      .finally(() => {
        if (!cancelled) setCreditsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clientId])

  const beginEdit = () => {
    if (!client) return
    setDraft(draftFromClient(client))
    setEditErrors({})
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setDraft(null)
    setEditErrors({})
  }

  const validateDraft = (d: ClientDetailEditDraft) => {
    const err: Record<string, string> = {}
    if (!d.name.trim()) err.name = 'El nombre es requerido'
    if (!d.document.trim()) err.document = 'La cédula/NIT es obligatoria'
    const emailValue = d.email.trim()
    if (emailValue && emailValue.toLowerCase() !== 'n/a' && !/\S+@\S+\.\S+/.test(emailValue)) {
      err.email = 'El email no es válido'
    }
    return err
  }

  const saveEdit = async () => {
    if (!client || !draft) return
    const err = validateDraft(draft)
    setEditErrors(err)
    if (Object.keys(err).length > 0) return

    const emailValue = draft.email.trim()
    const processedEmail = emailValue && emailValue.toLowerCase() !== 'n/a' ? emailValue : ''

    setSaving(true)
    try {
      const success = await updateClient(client.id, {
        name: draft.name.trim(),
        email: processedEmail,
        phone: draft.phone.trim(),
        document: draft.document.trim(),
        address: draft.address.trim(),
        city: draft.city.trim(),
        state: draft.state.trim(),
        type: draft.type,
        status: draft.status,
      })
      if (success) {
        toast.success('Cliente actualizado')
        setEditing(false)
        setDraft(null)
        setEditErrors({})
        await getAllClients()
        await load()
      } else {
        toast.error('No se pudo actualizar el cliente')
      }
    } finally {
      setSaving(false)
    }
  }

  const onDraftChange = (patch: Partial<ClientDetailEditDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
    const keys = Object.keys(patch)
    if (keys.length) {
      setEditErrors((e) => {
        const next = { ...e }
        keys.forEach((k) => {
          delete next[k]
        })
        return next
      })
    }
  }

  const confirmDelete = async () => {
    if (!client) return
    const result = await deleteClient(client.id)
    if (result.success) {
      toast.success('Cliente eliminado exitosamente')
      setIsDeleteModalOpen(false)
      router.push('/clients')
    } else {
      toast.error(result.error || 'Error al eliminar')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 py-24 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando cliente…</p>
      </div>
    )
  }

  if (notFound || !client) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 px-4 py-16 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
        <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">Cliente no encontrado</p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No existe o no tienes acceso.</p>
          <Link
            href="/clients"
            className={cn(
              'mt-6 inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-semibold transition-colors',
              'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'
            )}
          >
            Volver a clientes
          </Link>
        </div>
      </div>
    )
  }

  const canMutate = !isStoreClient(client)

  return (
    <>
      <ClientDetailPageView
        client={client}
        onBack={() => router.push('/clients')}
        onEdit={beginEdit}
        onDelete={() => setIsDeleteModalOpen(true)}
        canMutate={canMutate}
        credits={credits}
        creditsLoading={creditsLoading}
        editing={editing}
        draft={draft}
        onDraftChange={onDraftChange}
        onCancelEdit={cancelEdit}
        onSaveEdit={() => void saveEdit()}
        saving={saving}
        editErrors={editErrors}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar cliente"
        message={`¿Eliminar a «${client.name}»? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </>
  )
}
