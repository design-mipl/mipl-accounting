import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Employee } from '../types/employee'
import { useAuth } from './AuthContext'

// API Helper
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = sessionStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
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

type EmployeeState = {
  employees: Employee[]
  loading: boolean
  page: number
  limit: number
  totalPages: number
  totalCount: number
  search: string
  startDate: string
  endDate: string
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSearch: (search: string) => void
  setDateRange: (start: string, end: string) => void
  addEmployee: (name: string) => Promise<void>
  updateEmployee: (id: string, name: string) => Promise<void>
  deleteEmployee: (id: string) => Promise<void>
  getEmployee: (id: string) => Employee | undefined
  refreshEmployees: () => Promise<void>
}

const EmployeeContext = createContext<EmployeeState | null>(null)

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPageState] = useState(1)
  const [limit, setLimitState] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearchState] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const { token } = useAuth()

  const fetchEmployees = async (currentPage = page, currentLimit = limit, currentSearch = search, currentStart = startDate, currentEnd = endDate) => {
    if (!token) {
      setEmployees([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      
      // Build query string
      const params = new URLSearchParams()
      params.append('page', String(currentPage))
      params.append('limit', String(currentLimit))
      if (currentSearch.trim()) params.append('search', currentSearch.trim())
      if (currentStart) params.append('startDate', currentStart)
      if (currentEnd) params.append('endDate', currentEnd)

      const data = await apiCall(`/employees?${params.toString()}`)
      
      setEmployees(data.data?.employees || [])
      setTotalPages(data.data?.meta?.totalPages || 1)
      setTotalCount(data.data?.meta?.totalCount || 0)
    } catch (err: any) {
      console.error('Failed to fetch employees:', err.message)
    } finally {
      setLoading(false)
    }
  }

  // Trigger fetch when parameters change
  useEffect(() => {
    fetchEmployees(page, limit, search, startDate, endDate)
  }, [token, page, limit, search, startDate, endDate])

  const setPage = (p: number) => {
    setPageState(p)
  }

  const setLimit = (l: number) => {
    setLimitState(l)
    setPageState(1) // Reset to page 1 on limit change
  }

  const setSearch = (s: string) => {
    setSearchState(s)
    setPageState(1) // Reset to page 1 on search change
  }

  const setDateRange = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
    setPageState(1) // Reset to page 1 on date filter change
  }

  const value: EmployeeState = {
    employees,
    loading,
    page,
    limit,
    totalPages,
    totalCount,
    search,
    startDate,
    endDate,
    setPage,
    setLimit,
    setSearch,
    setDateRange,

    addEmployee: async (name: string) => {
      await apiCall('/employees', {
        method: 'POST',
        body: JSON.stringify({ name })
      })
      await fetchEmployees(page, limit, search, startDate, endDate)
    },

    updateEmployee: async (id: string, name: string) => {
      await apiCall(`/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name })
      })
      await fetchEmployees(page, limit, search, startDate, endDate)
    },

    deleteEmployee: async (id: string) => {
      await apiCall(`/employees/${id}`, { method: 'DELETE' })
      // If we are deleting the last item on the page, roll back to the previous page
      const newCount = totalCount - 1
      const newTotalPages = Math.ceil(newCount / limit) || 1
      const targetPage = page > newTotalPages ? newTotalPages : page
      setPage(targetPage)
      await fetchEmployees(targetPage, limit, search, startDate, endDate)
    },

    getEmployee: (id) => {
      return employees.find(e => e.id === id)
    },
    
    refreshEmployees: () => fetchEmployees(page, limit, search, startDate, endDate)
  }

  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>
}

export function useEmployees() {
  const ctx = useContext(EmployeeContext)
  if (!ctx) throw new Error('useEmployees must be used inside <EmployeeProvider>')
  return ctx
}
