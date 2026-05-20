import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import type {
  Project, Milestone, AMC, AMCBillingCycle,
  ProformaInvoice, TaxInvoice,
} from '../types/sales'
import {
  DUMMY_PROJECTS, DUMMY_MILESTONES, DUMMY_AMCS, DUMMY_AMC_CYCLES,
  DUMMY_PIS, DUMMY_TIS,
} from '../data/sales'
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

type SalesState = {
  projects: Project[]
  milestones: Milestone[]
  amcs: AMC[]
  amcCycles: AMCBillingCycle[]
  pis: ProformaInvoice[]
  tis: TaxInvoice[]
  loading: boolean

  upsertProject: (p: Project) => void
  deleteProject: (id: string) => void

  upsertMilestone: (m: Milestone) => void
  deleteMilestone: (id: string) => void
  setMilestonesForProject: (projectId: string, milestones: Milestone[]) => void

  upsertAMC: (a: AMC) => void
  deleteAMC: (id: string) => void

  upsertAMCCycle: (c: AMCBillingCycle) => void
  deleteAMCCycle: (id: string) => void

  upsertPI: (pi: ProformaInvoice) => void
  deletePI: (id: string) => void

  upsertTI: (ti: TaxInvoice) => void
  deleteTI: (id: string) => void
  
  refreshSales: () => Promise<void>
}

function mapProjectToDBInput(p: Project, projectMilestones: Milestone[]): any {
  // Map projectType to uppercase
  const projectTypeMap: Record<string, string> = {
    'Website': 'WEBSITE',
    'Web App': 'WEB_APP',
    'Mobile App': 'MOBILE_APP',
    'Software Development': 'SOFTWARE_DEVELOPMENT',
    'Digital Marketing': 'DIGITAL_MARKETING',
    'Branding': 'BRANDING',
    'AMC': 'AMC',
    'Retainer': 'RETAINER',
    'One-time': 'ONE_TIME',
    'Other': 'OTHER'
  }
  const projectType = projectTypeMap[p.projectType] || 'OTHER'

  // Map billingType to uppercase
  const billingTypeMap: Record<string, string> = {
    'Milestone Based': 'MILESTONE_BASED',
    'AMC': 'AMC',
    'One-time': 'ONE_TIME',
    'Monthly Retainer': 'MONTHLY_RETAINER'
  }
  const billingType = billingTypeMap[p.billingType] || 'ONE_TIME'

  // Map status to uppercase
  const statusMap: Record<string, string> = {
    'Upcoming': 'LEAD',
    'Active': 'WON',
    'On Hold': 'NEGOTIATION',
    'Completed': 'WON',
    'Cancelled': 'CANCELLED'
  }
  const status = statusMap[p.projectStatus] || 'LEAD'

  const dbInput: any = {
    customerId: p.customerId,
    projectName: p.name,
    projectType,
    billingType,
    totalValue: p.totalValue,
    startDate: p.startDate ? new Date(p.startDate).toISOString() : new Date().toISOString(),
    endDate: p.endDate ? new Date(p.endDate).toISOString() : new Date().toISOString(),
    gstPercentage: p.gstPercent || 0,
    tdsPercentage: p.tdsPercent || 0,
    status,
    notes: p.notes || null,
  }

  // AMC specific
  if (billingType === 'AMC') {
    dbInput.amcDurationMonths = 12
    dbInput.amcBillingCycle = p.amcFrequency === 'Monthly' ? 'MONTHLY' : 'YEARLY'
  }

  // Retainer specific
  if (billingType === 'MONTHLY_RETAINER') {
    dbInput.monthlyRetainerAmount = p.totalValue
    dbInput.retainerDurationMonths = 12
  }

  // Milestones
  if (billingType === 'MILESTONE_BASED' && projectMilestones && projectMilestones.length > 0) {
    dbInput.milestones = projectMilestones.map(m => ({
      milestoneName: m.name,
      percentage: Number(m.percentage),
      dueDate: m.expectedDate ? new Date(m.expectedDate).toISOString() : new Date().toISOString(),
      status: m.piStatus === 'Uploaded' ? 'INVOICED' : m.paymentStatus === 'Matched' ? 'PAID' : 'PENDING'
    }))
  }

  return dbInput
}

function mapDBProjectedSaleToProject(dbSale: any): Project {
  const projectTypeMap: Record<string, string> = {
    'WEBSITE': 'Website',
    'WEB_APP': 'Web App',
    'MOBILE_APP': 'Mobile App',
    'SOFTWARE_DEVELOPMENT': 'Software Development',
    'DIGITAL_MARKETING': 'Digital Marketing',
    'BRANDING': 'Branding',
    'AMC': 'AMC',
    'RETAINER': 'Retainer',
    'ONE_TIME': 'One-time',
    'OTHER': 'Other'
  }
  const projectType = projectTypeMap[dbSale.projectType] || 'Other'

  const billingTypeMap: Record<string, string> = {
    'MILESTONE_BASED': 'Milestone Based',
    'AMC': 'AMC',
    'ONE_TIME': 'One-time',
    'MONTHLY_RETAINER': 'Monthly Retainer'
  }
  const billingType = billingTypeMap[dbSale.billingType] || 'One-time'

  const statusMap: Record<string, string> = {
    'LEAD': 'Upcoming',
    'PROPOSAL_SENT': 'Upcoming',
    'NEGOTIATION': 'On Hold',
    'WON': 'Active',
    'LOST': 'Cancelled',
    'CANCELLED': 'Cancelled'
  }
  const projectStatus: any = statusMap[dbSale.status] || 'Upcoming'

  return {
    id: dbSale.id,
    customerId: dbSale.customerId,
    customerName: dbSale.customer?.companyName || dbSale.customer?.contactPerson || 'Unknown',
    name: dbSale.projectName,
    projectType: projectType as any,
    startDate: dbSale.startDate ? dbSale.startDate.substring(0, 10) : '',
    endDate: dbSale.endDate ? dbSale.endDate.substring(0, 10) : '',
    totalValue: Number(dbSale.totalValue),
    gstPercent: Number(dbSale.gstPercentage),
    tdsPercent: Number(dbSale.tdsPercentage),
    billingType: billingType as any,
    projectStatus,
    amcFrequency: dbSale.amcBillingCycle === 'MONTHLY' ? 'Monthly' : dbSale.amcBillingCycle === 'YEARLY' ? 'Yearly' : undefined,
    notes: dbSale.notes || '',
    createdAt: dbSale.createdAt,
    updatedAt: dbSale.updatedAt,
  }
}

function mapDBMilestoneToMilestone(dbMs: any, index: number, totalCount: number): Milestone {
  let piStatus: any = 'Not Raised'
  let tiStatus: any = 'Not Created'
  let paymentStatus: any = 'Pending'
  let milestoneStatus: any = 'Not Started'

  if (dbMs.status === 'INVOICED') {
    piStatus = 'Uploaded'
    tiStatus = 'Uploaded'
    paymentStatus = 'Pending'
    milestoneStatus = 'Payment Pending'
  } else if (dbMs.status === 'PAID') {
    piStatus = 'Uploaded'
    tiStatus = 'Uploaded'
    paymentStatus = 'Matched'
    milestoneStatus = 'Closed'
  } else if (dbMs.status === 'CANCELLED') {
    piStatus = 'Cancelled'
    tiStatus = 'Cancelled'
    paymentStatus = 'Pending'
    milestoneStatus = 'Not Started'
  }

  return {
    id: dbMs.id,
    projectId: dbMs.projectedSaleId,
    number: index + 1,
    total: totalCount,
    name: dbMs.milestoneName,
    percentage: Number(dbMs.percentage),
    expectedDate: dbMs.dueDate ? dbMs.dueDate.substring(0, 10) : '',
    piStatus,
    tiStatus,
    paymentStatus,
    milestoneStatus,
    piFileName: dbMs.piFileName || undefined,
    tiFileName: dbMs.tiFileName || undefined,
  }
}

const SalesContext = createContext<SalesState | null>(null)

export function SalesProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [amcs, setAMCs] = useState<AMC[]>(DUMMY_AMCS)
  const [amcCycles, setAMCCycles] = useState<AMCBillingCycle[]>(DUMMY_AMC_CYCLES)
  const [pis, setPIs] = useState<ProformaInvoice[]>([])
  const [tis, setTIs] = useState<TaxInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()

  const pendingUpdates = useRef<Record<string, { project?: Project; milestones?: Milestone[] }>>({})
  const timeouts = useRef<Record<string, any>>({})

  const fetchProjectedSales = async () => {
    if (!token) {
      setProjects([])
      setMilestones([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await apiCall('/projected-sales?limit=10000')
      const dbSales = data.data?.projectedSales || []
      
      const mappedProjects = dbSales.map(mapDBProjectedSaleToProject)
      const mappedMilestones: Milestone[] = []
      
      dbSales.forEach((dbSale: any) => {
        const msList = dbSale.milestones || []
        const sortedMs = [...msList].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        sortedMs.forEach((dbMs: any, index: number) => {
          mappedMilestones.push(mapDBMilestoneToMilestone(dbMs, index, sortedMs.length))
        })
      })

      setProjects(mappedProjects)
      setMilestones(mappedMilestones)
    } catch (err: any) {
      console.error('Failed to fetch projected sales:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoices = async () => {
    if (!token) {
      setPIs([])
      setTIs([])
      return
    }
    try {
      const [piRes, tiRes] = await Promise.all([
        apiCall('/invoices/proforma?limit=10000'),
        apiCall('/invoices/tax?limit=10000')
      ])
      
      const mappedPIs: ProformaInvoice[] = (piRes.data?.invoices || []).map((dbPi: any) => ({
        id: dbPi.id,
        piNumber: dbPi.piNumber,
        piDate: new Date(dbPi.piDate).toISOString().slice(0, 10),
        clientId: dbPi.clientId,
        clientName: dbPi.customer?.companyName || 'Unknown Client',
        projectType: dbPi.projectedSale?.projectType || '',
        projectId: dbPi.projectId,
        projectName: dbPi.projectedSale?.projectName,
        milestoneId: dbPi.milestoneId,
        milestoneLabel: dbPi.milestone ? dbPi.milestone.milestoneName : undefined,
        baseAmount: dbPi.baseAmount,
        gstPercent: dbPi.gstPercentage,
        gstAmount: dbPi.gstAmount,
        tdsPercent: dbPi.tdsPercentage,
        tdsAmount: dbPi.tdsAmount,
        grossAmount: dbPi.grossAmount,
        amountReceived: dbPi.amountReceived,
        outstandingBeyondTds: dbPi.outstandingAmount,
        status: dbPi.status,
        piSent: dbPi.status === 'SENT',
        fileName: dbPi.piFile || undefined,
        notes: dbPi.notes || '',
        createdAt: dbPi.createdAt
      }))
      
      const mappedTIs: TaxInvoice[] = (tiRes.data?.invoices || []).map((dbTi: any) => ({
        id: dbTi.id,
        tiNumber: dbTi.tiNumber,
        tiDate: new Date(dbTi.tiDate).toISOString().slice(0, 10),
        linkedPiId: dbTi.piId || undefined,
        clientId: dbTi.clientId,
        clientName: dbTi.customer?.companyName || 'Unknown Client',
        projectType: dbTi.projectedSale?.projectType || '',
        projectId: dbTi.projectId,
        projectName: dbTi.projectedSale?.projectName,
        milestoneId: dbTi.milestoneId,
        milestoneLabel: dbTi.milestone ? dbTi.milestone.milestoneName : undefined,
        baseAmount: dbTi.baseAmount,
        gstPercent: dbTi.gstPercentage,
        gstAmount: dbTi.gstAmount,
        tdsPercent: dbTi.tdsPercentage,
        tdsAmount: dbTi.tdsAmount,
        grossAmount: dbTi.grossAmount,
        amountReceived: dbTi.amountReceived,
        outstandingBeyondTds: dbTi.outstandingAmount,
        status: dbTi.status,
        invoiceSent: dbTi.status === 'SENT',
        fileName: dbTi.tiFile || undefined,
        notes: dbTi.notes || '',
        createdAt: dbTi.createdAt
      }))
      
      setPIs(mappedPIs)
      setTIs(mappedTIs)
    } catch (err: any) {
      console.error('Failed to fetch invoices:', err.message)
    }
  }

  useEffect(() => {
    fetchProjectedSales()
    fetchInvoices()
  }, [token])

  const flushProject = async (projectId: string) => {
    const data = pendingUpdates.current[projectId]
    if (!data) return
    delete pendingUpdates.current[projectId]
    if (timeouts.current[projectId]) {
      clearTimeout(timeouts.current[projectId])
      delete timeouts.current[projectId]
    }

    const p = data.project || projects.find(x => x.id === projectId)
    if (!p) return

    let projectMilestones = data.milestones
    if (!projectMilestones && p.billingType === 'Milestone Based') {
      projectMilestones = milestones.filter(m => m.projectId === projectId)
    }

    const isNew = p.id.length <= 10 || !projects.some(x => x.id === p.id)

    try {
      const dbInput = mapProjectToDBInput(p, projectMilestones || [])
      if (isNew) {
        await apiCall('/projected-sales', {
          method: 'POST',
          body: JSON.stringify(dbInput),
        })
      } else {
        await apiCall(`/projected-sales/${p.id}`, {
          method: 'PUT',
          body: JSON.stringify(dbInput),
        })
      }
      await fetchProjectedSales()
    } catch (err: any) {
      console.error('Failed to save project:', err.message)
      alert('Failed to save project: ' + err.message)
      await fetchProjectedSales()
    }
  }

  const queueProjectUpdate = (projectId: string, patch: { project?: Project; milestones?: Milestone[] }) => {
    if (!pendingUpdates.current[projectId]) {
      pendingUpdates.current[projectId] = {}
    }
    pendingUpdates.current[projectId] = {
      ...pendingUpdates.current[projectId],
      ...patch,
    }

    if (timeouts.current[projectId]) {
      clearTimeout(timeouts.current[projectId])
    }

    timeouts.current[projectId] = setTimeout(() => {
      flushProject(projectId)
    }, 50)
  }

  const upsert = <T extends { id: string }>(arr: T[], item: T) => {
    const idx = arr.findIndex(x => x.id === item.id)
    if (idx === -1) return [...arr, item]
    const next = arr.slice()
    next[idx] = item
    return next
  }

  const value: SalesState = {
    projects, milestones, amcs, amcCycles, pis, tis, loading,

    upsertProject: p => {
      setProjects(prev => upsert(prev, p))
      queueProjectUpdate(p.id, { project: p })
    },
    deleteProject: async (id) => {
      try {
        await apiCall(`/projected-sales/${id}`, {
          method: 'DELETE',
        })
        await fetchProjectedSales()
      } catch (err: any) {
        console.error('Failed to delete project:', err.message)
        alert('Failed to delete project: ' + err.message)
      }
    },

    upsertMilestone: m => {
      setMilestones(prev => upsert(prev, m))
      queueProjectUpdate(m.projectId, { milestones: milestones.map(x => x.id === m.id ? m : x) })
    },
    deleteMilestone: id => {
      const ms = milestones.find(m => m.id === id)
      if (ms) {
        setMilestones(prev => prev.filter(m => m.id !== id))
        queueProjectUpdate(ms.projectId, { milestones: milestones.filter(m => m.id !== id) })
      }
    },
    setMilestonesForProject: (projectId, newMs) => {
      setMilestones(prev => [...prev.filter(m => m.projectId !== projectId), ...newMs])
      queueProjectUpdate(projectId, { milestones: newMs })
    },

    upsertAMC: a => setAMCs(prev => upsert(prev, a)),
    deleteAMC: id => {
      setAMCs(prev => prev.filter(a => a.id !== id))
      setAMCCycles(prev => prev.filter(c => c.amcId !== id))
    },

    upsertAMCCycle: c => setAMCCycles(prev => upsert(prev, c)),
    deleteAMCCycle: id => setAMCCycles(prev => prev.filter(c => c.id !== id)),

    upsertPI: async (pi) => {
      // Optimistic update
      setPIs(prev => upsert(prev, pi))
      try {
        const isNew = pi.id.length <= 10 || !pis.some(x => x.id === pi.id)
        
        // Map frontend status to backend enum value
        let mappedStatus = 'DRAFT'
        if (pi.status) {
          const upper = pi.status.toUpperCase().replace(/\s+/g, '_')
          const validStatuses = ['DRAFT', 'SENT', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'SHORTFALL', 'CANCELLED']
          if (validStatuses.includes(upper)) {
            mappedStatus = upper
          } else if (upper === 'PARTIAL') {
            mappedStatus = 'PARTIALLY_PAID'
          }
        }

        const payload = {
          piDate: pi.piDate,
          clientId: pi.clientId,
          projectId: pi.projectId || undefined,
          milestoneId: pi.milestoneId || undefined,
          baseAmount: Number(pi.baseAmount) || 0,
          gstPercentage: Number(pi.gstPercent) || 0,
          tdsPercentage: Number(pi.tdsPercent) || 0,
          notes: pi.notes,
          amountReceived: pi.amountReceived !== undefined ? Number(pi.amountReceived) : 0,
          status: mappedStatus,
        }
        
        if (isNew) {
          await apiCall('/invoices/proforma', { method: 'POST', body: JSON.stringify(payload) })
        } else {
          await apiCall(`/invoices/proforma/${pi.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        }
        await fetchInvoices()
      } catch (err: any) {
        console.error('Failed to save PI:', err.message)
        alert('Failed to save PI: ' + err.message)
        await fetchInvoices() // Revert on failure
      }
    },
    deletePI: async (id) => {
      try {
        await apiCall(`/invoices/proforma/${id}`, { method: 'DELETE' })
        await fetchInvoices()
      } catch (err: any) {
        console.error('Failed to delete PI:', err.message)
        alert('Failed to delete PI: ' + err.message)
      }
    },

    upsertTI: async (ti) => {
      // Optimistic update
      setTIs(prev => upsert(prev, ti))
      try {
        const isNew = ti.id.length <= 10 || !tis.some(x => x.id === ti.id)
        
        // Map frontend status to backend enum value
        let mappedStatus = 'GENERATED'
        if (ti.status) {
          const upper = ti.status.toUpperCase()
          if (upper === 'DRAFT') mappedStatus = 'DRAFT'
          else if (upper === 'SENT') mappedStatus = 'SENT'
          else if (upper === 'CANCELLED') mappedStatus = 'CANCELLED'
        }

        const payload = {
          tiDate: ti.tiDate,
          piId: ti.linkedPiId || undefined,
          clientId: ti.clientId,
          projectId: ti.projectId || undefined,
          milestoneId: ti.milestoneId || undefined,
          baseAmount: Number(ti.baseAmount) || 0,
          gstPercentage: Number(ti.gstPercent) || 0,
          tdsPercentage: Number(ti.tdsPercent) || 0,
          notes: ti.notes,
          amountReceived: ti.amountReceived !== undefined ? Number(ti.amountReceived) : 0,
          status: mappedStatus,
        }
        
        if (isNew) {
          if (ti.linkedPiId) {
            await apiCall(`/invoices/tax/generate/${ti.linkedPiId}`, {
              method: 'POST',
              body: JSON.stringify({
                tiDate: ti.tiDate,
                notes: ti.notes,
              }),
            })
          } else {
            await apiCall('/invoices/tax', { method: 'POST', body: JSON.stringify(payload) })
          }
        } else {
          await apiCall(`/invoices/tax/${ti.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        }
        await fetchInvoices()
      } catch (err: any) {
        console.error('Failed to save TI:', err.message)
        alert('Failed to save TI: ' + err.message)
        await fetchInvoices() // Revert on failure
      }
    },
    deleteTI: async (id) => {
      try {
        await apiCall(`/invoices/tax/${id}`, { method: 'DELETE' })
        await fetchInvoices()
      } catch (err: any) {
        console.error('Failed to delete TI:', err.message)
        alert('Failed to delete TI: ' + err.message)
      }
    },
    
    refreshSales: async () => {
      await fetchProjectedSales()
      await fetchInvoices()
    }
  }

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>
}

export function useSales() {
  const ctx = useContext(SalesContext)
  if (!ctx) throw new Error('useSales must be used inside <SalesProvider>')
  return ctx
}

export function newId() {
  return Math.random().toString(36).slice(2, 10)
}
