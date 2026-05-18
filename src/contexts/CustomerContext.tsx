import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Customer } from '../types/customer'
import { DUMMY_CUSTOMERS } from '../data/customers'

type CustomerState = {
  customers: Customer[]

  addCustomer: (customer: Customer) => void
  updateCustomer: (id: string, updates: Partial<Customer>) => void
  deleteCustomer: (id: string) => void
  restoreCustomer: (id: string) => void
  getCustomer: (id: string) => Customer | undefined
}

const CustomerContext = createContext<CustomerState | null>(null)

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(DUMMY_CUSTOMERS)

  const value: CustomerState = {
    customers,

    addCustomer: (customer: Customer) => {
      setCustomers(prev => [...prev, customer])
    },

    updateCustomer: (id: string, updates: Partial<Customer>) => {
      setCustomers(prev =>
        prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)
      )
    },

    deleteCustomer: (id: string) => {
      setCustomers(prev =>
        prev.map(c => c.id === id ? { ...c, deletedAt: new Date().toISOString() } : c)
      )
    },

    restoreCustomer: (id: string) => {
      setCustomers(prev =>
        prev.map(c => c.id === id ? { ...c, deletedAt: undefined } : c)
      )
    },

    getCustomer: (id: string) => {
      return customers.find(c => c.id === id)
    },
  }

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
}

export function useCustomers() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomers must be used inside <CustomerProvider>')
  return ctx
}
