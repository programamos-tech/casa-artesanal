'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ClientDetailPageView, type ClientDetailEditDraft } from '@/components/clients/client-detail-page-view'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useClients } from '@/contexts/clients-context'
import { ClientsService } from '@/lib/clients-service'
import { isStoreClient } from '@/lib/client-helpers'
import { Client, Credit, Sale } from '@/types'
import { CreditsService } from '@/lib/credits-service'
import { SalesService } from '@/lib/sales-service'
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
  const [sales, setSales] = useState<Array<Pick<Sale, 'id' | 'invoiceNumber' | 'total' | 'status' | 'paymentMethod' | 'createdAt'>>>([])
  const [salesLoading, setSalesLoading] = useState(true)
  const [abonos, setAbonos] = useState<Array<{ id: string; amount: number; paymentDate: string }>>([])
  const [abonosLoading, setAbonosLoading] = useState(true)
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

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    setSalesLoading(true)
    SalesService.getSalesByClientId(clientId)
      .then((list) => {
        if (!cancelled) setSales(list)
      })
      .catch(() => {
        if (!cancelled) setSales([])
      })
      .finally(() => {
        if (!cancelled) setSalesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clientId])

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    setAbonosLoading(true)
    CreditsService.getPaymentRecordsByClientId(clientId)
      .then((list) => {
        if (!cancelled) setAbonos(list)
      })
      .catch(() => {
        if (!cancelled) setAbonos([])
      })
      .finally(() => {
        if (!cancelled) setAbonosLoading(false)
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
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
        <p className="text-[13px] text-zinc-500 dark:text-white/50">Cargando cliente…</p>
      </div>
    )
  }

  if (notFound || !client) {
    return (
      <div className="py-16 text-center">
        <p className="text-base font-semibold text-zinc-900 dark:text-white">Cliente no encontrado</p>
        <p className="mt-1 text-[13px] text-zinc-500 dark:text-white/50">No existe o no tienes acceso.</p>
        <Link
          href="/clients"
          className={cn(
            'mt-5 inline-flex h-8 items-center justify-center rounded-md bg-zinc-900 px-3.5 text-[13px] font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
          )}
        >
          Volver a clientes
        </Link>
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
        sales={sales}
        salesLoading={salesLoading}
        abonos={abonos}
        abonosLoading={abonosLoading}
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
