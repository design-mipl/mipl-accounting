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
  const { token } = useAuth()

  const fetchCustomers = async () => {
    if (!token) {
      setCustomers([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await apiCall('/customers')
      setCustomers(data.data?.customers || [])
    } catch (err: any) {
      console.error('Failed to fetch customers:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [token])

  const value: CustomerState = {
    customers,
    loading,

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

      await fetchCustomers()
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

      await fetchCustomers()
    },

    deleteCustomer: async (id) => {
      await apiCall(`/customers/${id}`, { method: 'DELETE' })
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, status: 'INACTIVE', deletedAt: new Date().toISOString() } : c))
    },

    restoreCustomer: async (id) => {
      const res = await apiCall(`/customers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACTIVE' })
      })
      await fetchCustomers()
    },

    getCustomer: (id) => {
      return customers.find(c => c.id === id)
    },
    
    refreshCustomers: fetchCustomers
  }

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
}

export function useCustomers() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomers must be used inside <CustomerProvider>')
  return ctx
}
