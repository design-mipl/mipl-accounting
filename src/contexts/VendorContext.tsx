import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Vendor } from '../types/vendor'
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

type VendorState = {
  vendors: Vendor[]
  loading: boolean
  addVendor: (vendor: any, logoFile?: File, newDocs?: any[]) => Promise<void>
  updateVendor: (id: string, updates: Partial<Vendor>, logoFile?: File, newDocs?: any[], deletedDocIds?: string[]) => Promise<void>
  deleteVendor: (id: string) => Promise<void>
  restoreVendor: (id: string) => Promise<void>
  getVendor: (id: string) => Vendor | undefined
  refreshVendors: () => Promise<void>
}

const VendorContext = createContext<VendorState | null>(null)

function mapDBVendorToVendor(dbVendor: any): Vendor {
  return {
    id: dbVendor.id,
    vendorType: dbVendor.vendorType === 'COMPANY' ? 'company' : 'individual',
    companyName: dbVendor.companyName || '',
    name: dbVendor.vendorName || '',
    phone: dbVendor.phoneNumber || '',
    email: dbVendor.email || '',
    ccEmails: dbVendor.ccEmails || [],
    gstApplicable: dbVendor.gstApplicable || false,
    gstin: dbVendor.gstinNumber || '',
    pan: dbVendor.panNumber || '',
    panName: dbVendor.panName || '',
    tdsApplicable: dbVendor.tdsApplicable || false,
    tdsSection: dbVendor.tdsSection || '',
    tdsPercentage: dbVendor.tdsPercentage ? String(dbVendor.tdsPercentage) : '',
    address1: dbVendor.addressLine1 || '',
    address2: dbVendor.addressLine2 || '',
    city: dbVendor.city || '',
    state: dbVendor.state || '',
    country: dbVendor.country || 'India',
    pincode: dbVendor.pincode || '',
    accountHolderName: dbVendor.bankAccountHolderName || '',
    bankName: dbVendor.bankName || '',
    accountNumber: dbVendor.bankAccountNumber || '',
    ifscCode: dbVendor.bankIfscCode || '',
    swiftCode: dbVendor.bankSwiftCode || '',
    branchName: dbVendor.bankBranchName || '',
    status: dbVendor.status || 'ACTIVE',
    createdAt: dbVendor.createdAt,
    updatedAt: dbVendor.updatedAt,
    deletedAt: dbVendor.deletedAt,
    clientLogo: dbVendor.clientLogo || undefined,
  }
}

function mapVendorToDBInput(vendor: Partial<Vendor>): any {
  const dbInput: any = {}
  if (vendor.vendorType !== undefined) {
    dbInput.vendorType = vendor.vendorType === 'company' ? 'COMPANY' : 'INDIVIDUAL'
  }
  if (vendor.companyName !== undefined) {
    dbInput.companyName = vendor.companyName
  }
  if (vendor.name !== undefined) {
    dbInput.vendorName = vendor.name
  }
  if (vendor.phone !== undefined) {
    dbInput.phoneNumber = vendor.phone
  }
  if (vendor.email !== undefined) {
    dbInput.email = vendor.email
  }
  if (vendor.ccEmails !== undefined) {
    dbInput.ccEmails = vendor.ccEmails
  }
  if (vendor.gstApplicable !== undefined) {
    dbInput.gstApplicable = vendor.gstApplicable
  }
  if (vendor.gstin !== undefined) {
    dbInput.gstinNumber = vendor.gstin
  }
  if (vendor.pan !== undefined) {
    dbInput.panNumber = vendor.pan
  }
  if (vendor.panName !== undefined) {
    dbInput.panName = vendor.panName
  }
  if (vendor.tdsApplicable !== undefined) {
    dbInput.tdsApplicable = vendor.tdsApplicable
  }
  if (vendor.tdsSection !== undefined) {
    dbInput.tdsSection = vendor.tdsSection
  }
  if (vendor.tdsPercentage !== undefined) {
    dbInput.tdsPercentage = vendor.tdsPercentage ? parseFloat(vendor.tdsPercentage) : null
  }
  if (vendor.address1 !== undefined) {
    dbInput.addressLine1 = vendor.address1
  }
  if (vendor.address2 !== undefined) {
    dbInput.addressLine2 = vendor.address2
  }
  if (vendor.city !== undefined) {
    dbInput.city = vendor.city
  }
  if (vendor.state !== undefined) {
    dbInput.state = vendor.state
  }
  if (vendor.country !== undefined) {
    dbInput.country = vendor.country
  }
  if (vendor.pincode !== undefined) {
    dbInput.pincode = vendor.pincode
  }
  if (vendor.accountHolderName !== undefined) {
    dbInput.bankAccountHolderName = vendor.accountHolderName
  }
  if (vendor.bankName !== undefined) {
    dbInput.bankName = vendor.bankName
  }
  if (vendor.accountNumber !== undefined) {
    dbInput.bankAccountNumber = vendor.accountNumber
  }
  if (vendor.ifscCode !== undefined) {
    dbInput.bankIfscCode = vendor.ifscCode
  }
  if (vendor.swiftCode !== undefined) {
    dbInput.bankSwiftCode = vendor.swiftCode
  }
  if (vendor.branchName !== undefined) {
    dbInput.bankBranchName = vendor.branchName
  }
  if (vendor.status !== undefined) {
    dbInput.status = vendor.status
  }
  return dbInput
}

export function VendorProvider({ children }: { children: ReactNode }) {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()

  const fetchVendors = async () => {
    if (!token) {
      setVendors([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      // fetch all vendors
      const data = await apiCall('/vendors?active=all')
      const mapped = (data.data?.vendors || []).map(mapDBVendorToVendor)
      setVendors(mapped)
    } catch (err: any) {
      console.error('Failed to fetch vendors:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVendors()
  }, [token])

  const value: VendorState = {
    vendors,
    loading,

    addVendor: async (vendor, logoFile, newDocs) => {
      const dbInput = mapVendorToDBInput(vendor)
      const res = await apiCall('/vendors', {
        method: 'POST',
        body: JSON.stringify(dbInput)
      })
      const newVendor = res.data

      if (logoFile) {
        const logoFormData = new FormData()
        logoFormData.append('logo', logoFile)
        await apiCall(`/vendors/${newVendor.id}/logo`, {
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
        await apiCall(`/vendors/${newVendor.id}/documents`, {
          method: 'POST',
          body: docsFormData
        })
      }

      await fetchVendors()
    },

    updateVendor: async (id, updates, logoFile, newDocs, deletedDocIds) => {
      let res;
      if (updates.status && Object.keys(updates).length === 1) {
        res = await apiCall(`/vendors/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: updates.status })
        })
      } else {
        const dbInput = mapVendorToDBInput(updates)
        res = await apiCall(`/vendors/${id}`, {
          method: 'PUT',
          body: JSON.stringify(dbInput)
        })
      }

      if (logoFile) {
        const logoFormData = new FormData()
        logoFormData.append('logo', logoFile)
        await apiCall(`/vendors/${id}/logo`, {
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
        await apiCall(`/vendors/${id}/documents`, {
          method: 'POST',
          body: docsFormData
        })
      }

      if (deletedDocIds && deletedDocIds.length > 0) {
        for (const docId of deletedDocIds) {
          await apiCall(`/vendor-documents/${docId}`, {
            method: 'DELETE'
          })
        }
      }

      await fetchVendors()
    },

    deleteVendor: async (id) => {
      await apiCall(`/vendors/${id}`, { method: 'DELETE' })
      await fetchVendors()
    },

    restoreVendor: async (id) => {
      await apiCall(`/vendors/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACTIVE' })
      })
      await fetchVendors()
    },

    getVendor: (id) => {
      return vendors.find(v => v.id === id)
    },
    
    refreshVendors: fetchVendors
  }

  return <VendorContext.Provider value={value}>{children}</VendorContext.Provider>
}

export function useVendors() {
  const ctx = useContext(VendorContext)
  if (!ctx) throw new Error('useVendors must be used inside <VendorProvider>')
  return ctx
}
