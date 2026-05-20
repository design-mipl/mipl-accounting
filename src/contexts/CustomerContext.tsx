import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Customer } from '../types/customer'
import { useAuth } from './AuthContext'

// API Helper
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = sessionStorage.getItem('token')
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  
  const res = await fetch(`/api${endpoint}`, { ...options, headers })
  if (res.status === 401) {
    sessionStorage.removeItem('token')
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.message || 'API request failed')
  }
  return res.json()
}

type CustomerState = {
  customers: Customer[]
  loading: boolean
  page: number
  limit: number
  totalPages: number
  totalCount: number
  search: string
  startDate: string
  endDate: string
  active: string
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSearch: (search: string) => void
  setDateRange: (start: string, end: string) => void
  setActive: (active: string) => void
  addCustomer: (customer: any, logoFile?: File, newDocs?: any[]) => Promise<void>
  updateCustomer: (id: string, updates: Partial<Customer>, logoFile?: File, newDocs?: any[], deletedDocIds?: string[]) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
  restoreCustomer: (id: string) => Promise<void>
  getCustomer: (id: string) => Customer | undefined
  refreshCustomers: () => Promise<void>
}

const CustomerContext = createContext<CustomerState | null>(null)

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPageState] = useState(1)
  const [limit, setLimitState] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearchState] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [active, setActiveState] = useState('true')
  const { token } = useAuth()

  const fetchCustomers = async (
    currentPage = page,
    currentLimit = limit,
    currentSearch = search,
    currentActive = active,
    currentStart = startDate,
    currentEnd = endDate
  ) => {
    if (!token) {
      setCustomers([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', String(currentPage))
      params.append('limit', String(currentLimit))
      if (currentActive) params.append('active', currentActive)
      if (currentSearch.trim()) params.append('search', currentSearch.trim())
      if (currentStart) params.append('startDate', currentStart)
      if (currentEnd) params.append('endDate', currentEnd)

      const data = await apiCall(`/customers?${params.toString()}`)
      setCustomers(data.data?.customers || [])
      setTotalPages(data.data?.pagination?.totalPages || 1)
      setTotalCount(data.data?.pagination?.total || 0)
    } catch (err: any) {
      console.error('Failed to fetch customers:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers(page, limit, search, active, startDate, endDate)
  }, [token, page, limit, search, active, startDate, endDate])

  const setPage = (p: number) => {
    setPageState(p)
  }

  const setLimit = (l: number) => {
    setLimitState(l)
    setPageState(1)
  }

  const setSearch = (s: string) => {
    setSearchState(s)
    setPageState(1)
  }

  const setDateRange = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
    setPageState(1)
  }

  const setActive = (act: string) => {
    setActiveState(act)
    setPageState(1)
  }

  const value: CustomerState = {
    customers,
    loading,
    page,
    limit,
    totalPages,
    totalCount,
    search,
    startDate,
    endDate,
    active,
    setPage,
    setLimit,
    setSearch,
    setDateRange,
    setActive,

    addCustomer: async (customer, logoFile, newDocs) => {
      const res = await apiCall('/customers', {
        method: 'POST',
        body: JSON.stringify(customer)
      })
      const newCustomer = res.data

      if (logoFile) {
        const logoFormData = new FormData()
        logoFormData.append('logo', logoFile)
        await apiCall(`/customers/${newCustomer.id}/logo`, {
          method: 'POST',
          body: logoFormData
        })
      }

      if (newDocs && newDocs.length > 0) {
        const docsFormData = new FormData()
        newDocs.forEach(doc => {
          if (doc.file) {
            docsFormData.append('files', doc.file)
            docsFormData.append('documentType', doc.type)
          }
        })
        await apiCall(`/customers/${newCustomer.id}/documents`, {
          method: 'POST',
          body: docsFormData
        })
      }

      await fetchCustomers(page, limit, search, active, startDate, endDate)
    },

    updateCustomer: async (id, updates, logoFile, newDocs, deletedDocIds) => {
      let res;
      if (updates.status && Object.keys(updates).length === 1) {
        res = await apiCall(`/customers/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: updates.status })
        })
      } else {
        res = await apiCall(`/customers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        })
      }

      if (logoFile) {
        const logoFormData = new FormData()
        logoFormData.append('logo', logoFile)
        await apiCall(`/customers/${id}/logo`, {
          method: 'POST',
          body: logoFormData
        })
      }

      if (newDocs && newDocs.length > 0) {
        const docsFormData = new FormData()
        newDocs.forEach(doc => {
          if (doc.file) {
            docsFormData.append('files', doc.file)
            docsFormData.append('documentType', doc.type)
          }
        })
        await apiCall(`/customers/${id}/documents`, {
          method: 'POST',
          body: docsFormData
        })
      }

      if (deletedDocIds && deletedDocIds.length > 0) {
        for (const docId of deletedDocIds) {
          await apiCall(`/customers/documents/${docId}`, {
            method: 'DELETE'
          })
        }
      }

      await fetchCustomers(page, limit, search, active, startDate, endDate)
    },

    deleteCustomer: async (id) => {
      await apiCall(`/customers/${id}`, { method: 'DELETE' })
      const newCount = totalCount - 1
      const newTotalPages = Math.ceil(newCount / limit) || 1
      const targetPage = page > newTotalPages ? newTotalPages : page
      setPage(targetPage)
      await fetchCustomers(targetPage, limit, search, active, startDate, endDate)
    },

    restoreCustomer: async (id) => {
      const res = await apiCall(`/customers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACTIVE' })
      })
      await fetchCustomers(page, limit, search, active, startDate, endDate)
    },

    getCustomer: (id) => {
      return customers.find(c => c.id === id)
    },
    
    refreshCustomers: () => fetchCustomers(page, limit, search, active, startDate, endDate)
  }

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
}

export function useCustomers() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomers must be used inside <CustomerProvider>')
  return ctx
}
