import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Payment } from '../types/payment'
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
    let errMsg = errorData.message || 'API request failed'
    if (Array.isArray(errorData.errors)) {
      const details = errorData.errors.map((e: any) => {
        if (typeof e === 'string') return e;
        if (e && typeof e === 'object') {
          const pathStr = Array.isArray(e.path) ? e.path.join('.') : '';
          return pathStr ? `${pathStr}: ${e.message}` : e.message;
        }
        return JSON.stringify(e);
      }).filter(Boolean);
      if (details.length > 0) {
        errMsg = `${errMsg}\n• ${details.join('\n• ')}`;
      }
    }
    throw new Error(errMsg)
  }
  return res.json()
}

type PaymentState = {
  payments: Payment[]
  loading: boolean
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'month' | 'balanceAmount' | 'gstAmount' | 'deductionAmount' | 'netPayable'>) => Promise<void>
  bulkAddPayments: (paymentsList: Partial<Payment>[]) => Promise<void>
  updatePayment: (id: string, updates: Partial<Payment>) => Promise<void>
  deletePayment: (id: string) => Promise<void>
  refreshPayments: () => Promise<void>
}

const PaymentContext = createContext<PaymentState | null>(null)

function mapDBPaymentToPayment(dbPayment: any): Payment {
  const expenseDate = dbPayment.expenseDate ? dbPayment.expenseDate.substring(0, 10) : ''
  const month = expenseDate.substring(0, 7)
  
  let partyName = ''
  if (dbPayment.partyType === 'VENDOR') {
    partyName = dbPayment.vendor?.companyName || dbPayment.vendor?.vendorName || ''
  } else if (dbPayment.partyType === 'EMPLOYEE') {
    partyName = dbPayment.employee?.name || ''
  } else {
    partyName = dbPayment.partyNameCustom || ''
  }

  let deductionType: any = 'None'
  if (dbPayment.deductionType === 'TDS') deductionType = 'TDS'
  else if (dbPayment.deductionType === 'PT') deductionType = 'PT'
  else if (dbPayment.deductionType === 'OTHER') deductionType = 'Other'

  let deductionPercent = 0
  if (dbPayment.deductionType === 'TDS') {
    deductionPercent = dbPayment.deductionPercentageTDS ? Number(dbPayment.deductionPercentageTDS) : 0
  } else if (dbPayment.deductionType === 'OTHER') {
    deductionPercent = dbPayment.deductionPercentageOther ? Number(dbPayment.deductionPercentageOther) : 0
  } else if (dbPayment.deductionType === 'PT') {
    deductionPercent = dbPayment.ptAmountFixed ? Number(dbPayment.ptAmountFixed) : 0
  }

  let paymentStatus: any = 'Pending'
  if (dbPayment.paymentStatus === 'PAID') paymentStatus = 'Paid'
  else if (dbPayment.paymentStatus === 'PART_PAID') paymentStatus = 'Part Paid'

  return {
    id: dbPayment.id,
    expenseDate,
    month,
    expenseType: dbPayment.expenseType,
    partyType: dbPayment.partyType === 'VENDOR' ? 'Vendor' : dbPayment.partyType === 'EMPLOYEE' ? 'Employee' : dbPayment.partyType === 'HOUSEHOLD' ? 'Household' : 'Other',
    partyName,
    notes: dbPayment.notes || '',
    recurring: dbPayment.paymentFrequency === 'RECURRING',
    baseAmount: Number(dbPayment.baseAmount),
    gstApplicable: dbPayment.gstApplicable,
    gstPercent: dbPayment.gstPercentage ? Number(dbPayment.gstPercentage) : 0,
    gstAmount: Number(dbPayment.gstAmount),
    deductionType,
    deductionPercent,
    deductionAmount: Number(dbPayment.deductionAmount),
    netPayable: Number(dbPayment.netPayable),
    paidAmount: Number(dbPayment.paidAmount),
    paymentStatus,
    balanceAmount: Number(dbPayment.balance),
    vendorId: dbPayment.vendorId || undefined,
    employeeId: dbPayment.employeeId || undefined,
    createdAt: dbPayment.createdAt,
    updatedAt: dbPayment.updatedAt,
  }
}

function mapPaymentToDBInput(payment: Partial<Payment>): any {
  const dbInput: any = {}
  
  if (payment.recurring !== undefined) {
    dbInput.paymentFrequency = payment.recurring ? 'RECURRING' : 'ONE_TIME'
  }
  if (payment.expenseDate !== undefined) {
    dbInput.expenseDate = payment.expenseDate
  }
  if (payment.expenseType !== undefined) {
    dbInput.expenseType = payment.expenseType
  }
  if (payment.partyType !== undefined) {
    dbInput.partyType = payment.partyType === 'Vendor' ? 'VENDOR' : payment.partyType === 'Employee' ? 'EMPLOYEE' : payment.partyType === 'Household' ? 'HOUSEHOLD' : 'OTHER'
  }
  if (payment.vendorId !== undefined) {
    dbInput.vendorId = payment.vendorId || null
  }
  if (payment.employeeId !== undefined) {
    dbInput.employeeId = payment.employeeId || null
  }
  if (payment.partyType !== undefined) {
    if (payment.partyType === 'Household' || payment.partyType === 'Other') {
      dbInput.partyNameCustom = payment.partyName || null
    } else {
      dbInput.partyNameCustom = null
    }
  }
  if (payment.notes !== undefined) {
    dbInput.notes = payment.notes || null
  }
  if (payment.baseAmount !== undefined) {
    dbInput.baseAmount = Number(payment.baseAmount)
  }
  if (payment.gstApplicable !== undefined) {
    dbInput.gstApplicable = payment.gstApplicable
  }
  if (payment.gstPercent !== undefined) {
    dbInput.gstPercentage = payment.gstApplicable ? Number(payment.gstPercent) : null
  }
  if (payment.deductionType !== undefined) {
    dbInput.deductionType = payment.deductionType === 'TDS' ? 'TDS' : payment.deductionType === 'PT' ? 'PT' : payment.deductionType === 'Other' ? 'OTHER' : 'NONE'
  }
  
  // Handle specific deduction percentages/amounts
  if (payment.deductionType !== undefined || payment.deductionPercent !== undefined) {
    const type = payment.deductionType
    const percentOrAmt = Number(payment.deductionPercent || 0)
    if (type === 'TDS') {
      dbInput.deductionPercentageTDS = percentOrAmt
      dbInput.ptAmountFixed = null
      dbInput.deductionPercentageOther = null
    } else if (type === 'PT') {
      dbInput.ptAmountFixed = percentOrAmt
      dbInput.deductionPercentageTDS = null
      dbInput.deductionPercentageOther = null
    } else if (type === 'Other') {
      dbInput.deductionPercentageOther = percentOrAmt
      dbInput.deductionPercentageTDS = null
      dbInput.ptAmountFixed = null
    } else {
      dbInput.deductionPercentageTDS = null
      dbInput.ptAmountFixed = null
      dbInput.deductionPercentageOther = null
    }
  }

  if (payment.paidAmount !== undefined) {
    dbInput.paidAmount = Number(payment.paidAmount)
  }
  if (payment.paymentStatus !== undefined) {
    dbInput.paymentStatus = payment.paymentStatus === 'Paid' ? 'PAID' : payment.paymentStatus === 'Part Paid' ? 'PART_PAID' : 'PENDING'
  }

  return dbInput
}

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()

  const fetchPayments = async () => {
    if (!token) {
      setPayments([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await apiCall('/payments?limit=10000')
      const mapped = (data.data?.payments || []).map(mapDBPaymentToPayment)
      setPayments(mapped)
    } catch (err: any) {
      console.error('Failed to fetch payments:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [token])

  const value: PaymentState = {
    payments,
    loading,
    addPayment: async (payment) => {
      const dbInput = mapPaymentToDBInput(payment)
      await apiCall('/payments', {
        method: 'POST',
        body: JSON.stringify(dbInput)
      })
      await fetchPayments()
    },
    bulkAddPayments: async (paymentsList) => {
      const dbInputs = paymentsList.map(mapPaymentToDBInput)
      await apiCall('/payments/bulk', {
        method: 'POST',
        body: JSON.stringify({ payments: dbInputs })
      })
      await fetchPayments()
    },
    updatePayment: async (id, updates) => {
      const dbInput = mapPaymentToDBInput(updates)
      await apiCall(`/payments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dbInput)
      })
      await fetchPayments()
    },
    deletePayment: async (id) => {
      await apiCall(`/payments/${id}`, {
        method: 'DELETE'
      })
      await fetchPayments()
    },
    refreshPayments: fetchPayments
  }

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>
}

export function usePayments() {
  const ctx = useContext(PaymentContext)
  if (!ctx) throw new Error('usePayments must be used inside <PaymentProvider>')
  return ctx
}
