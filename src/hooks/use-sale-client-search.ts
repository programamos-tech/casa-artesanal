'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Client } from '@/types'
import { filterNonStoreClients } from '@/lib/sale-client-utils'

const CLIENT_SEARCH_DEBOUNCE_MS = 300
const RECENT_CLIENTS_LIMIT = 10
const SEARCH_RESULTS_LIMIT = 20

export function useSaleClientSearch(
  clients: Client[],
  searchClients: (query: string) => Promise<Client[]>
) {
  const [clientSearch, setClientSearch] = useState('')
  const [debouncedClientSearch, setDebouncedClientSearch] = useState('')
  const [searchedClients, setSearchedClients] = useState<Client[]>([])
  const [isSearchingClients, setIsSearchingClients] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedClientSearch(clientSearch.trim())
    }, CLIENT_SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [clientSearch])

  useEffect(() => {
    let cancelled = false
    const query = debouncedClientSearch

    if (query.length < 2) {
      setSearchedClients([])
      setIsSearchingClients(false)
      return
    }

    setIsSearchingClients(true)
    void searchClients(query).then(results => {
      if (cancelled) return
      setSearchedClients(filterNonStoreClients(results).slice(0, SEARCH_RESULTS_LIMIT))
      setIsSearchingClients(false)
    })

    return () => {
      cancelled = true
    }
  }, [debouncedClientSearch, searchClients])

  const displayClients = useMemo(() => {
    if (debouncedClientSearch.length >= 2) {
      return searchedClients
    }
    return filterNonStoreClients(clients).slice(0, RECENT_CLIENTS_LIMIT)
  }, [debouncedClientSearch, searchedClients, clients])

  return {
    clientSearch,
    setClientSearch,
    displayClients,
    isSearchingClients,
    debouncedClientSearch,
  }
}
