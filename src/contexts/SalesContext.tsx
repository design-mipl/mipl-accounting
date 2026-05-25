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
import { useToast } from './ToastContext'

// API Helper
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = sessionStorage.getItem('token')
  const isFormData = options.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers as Record<string, string>,
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

  upsertAMC: (a: AMC) => Promise<void>
  deleteAMC: (id: string) => Promise<void>

  upsertAMCCycle: (c: AMCBillingCycle) => void
  deleteAMCCycle: (id: string) => void

  upsertPI: (pi: ProformaInvoice, file?: File) => Promise<void>
  deletePI: (id: string) => Promise<void>

  upsertTI: (ti: TaxInvoice, file?: File) => Promise<void>
  deleteTI: (id: string) => Promise<void>

  refreshSales: () => Promise<void>
  fetchProjectedSalesPaginated: (params?: {
    page?: number
    limit?: number
    search?: string
    customerId?: string
    projectType?: string
    billingType?: string
    status?: string
    startDate?: string
    endDate?: string
  }) => Promise<{ projects: Project[]; milestones: Milestone[]; meta: { totalCount: number; page: number; limit: number; totalPages: number } }>
  fetchAMCsPaginated: (params?: {
    page?: number
    limit?: number
    search?: string
    customerId?: string
    billingFrequency?: string
    status?: string
    startDate?: string
    endDate?: string
  }) => Promise<{ amcs: AMC[]; meta: { totalCount: number; page: number; limit: number; totalPages: number } }>
  fetchPIsPaginated: (params?: {
    page?: number
    limit?: number
    search?: string
    clientId?: string
    projectId?: string
    status?: string
    startDate?: string
    endDate?: string
  }) => Promise<{ pis: ProformaInvoice[]; meta: { totalCount: number; page: number; limit: number; totalPages: number } }>
  fetchTIsPaginated: (params?: {
    page?: number
    limit?: number
    search?: string
    clientId?: string
    projectId?: string
    status?: string
    startDate?: string
    endDate?: string
  }) => Promise<{ tis: TaxInvoice[]; meta: { totalCount: number; page: number; limit: number; totalPages: number } }>
  fetchAMCDetails: (amcId: string) => Promise<void>
  fetchAMCs: () => Promise<void>
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

  const startD = p.startDate ? new Date(p.startDate) : new Date()
  let endD = startD

  if (billingType === 'AMC' && p.endDate) {
    const d = new Date(p.endDate)
    if (!isNaN(d.getTime())) endD = d
  } else if (billingType === 'MONTHLY_RETAINER') {
    const d = new Date(startD)
    d.setMonth(d.getMonth() + 12)
    if (!isNaN(d.getTime())) endD = d
  } else if (billingType === 'MILESTONE_BASED' && projectMilestones && projectMilestones.length > 0) {
    let maxMsDate: Date | null = null
    for (const ms of projectMilestones) {
      if (ms.expectedDate) {
        const d = new Date(ms.expectedDate)
        if (!isNaN(d.getTime())) {
          if (!maxMsDate || d > maxMsDate) {
            maxMsDate = d
          }
        }
      }
    }
    if (maxMsDate && maxMsDate >= startD) {
      endD = maxMsDate
    } else {
      endD = startD
    }
  } else {
    endD = startD
  }

  const dbInput: any = {
    customerId: p.customerId,
    projectName: p.name,
    projectType,
    billingType,
    totalValue: p.totalValue,
    startDate: startD.toISOString(),
    endDate: endD.toISOString(),
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

function mapDBAMCToAMC(dbAmc: any): AMC {
  const frequencyMap: Record<string, any> = {
    'MONTHLY': 'Monthly',
    'QUARTERLY': 'Quarterly',
    'HALF_YEARLY': 'Half-Yearly',
    'YEARLY': 'Yearly',
  }
  const frequency = frequencyMap[dbAmc.billingFrequency] || 'Monthly'

  const statusMap: Record<string, any> = {
    'ACTIVE': 'Active',
    'EXPIRED': 'Expired',
    'ON_HOLD': 'On Hold',
    'CANCELLED': 'Cancelled',
  }
  const status = statusMap[dbAmc.status] || 'Active'

  return {
    id: dbAmc.id,
    customerId: dbAmc.customerId,
    customerName: dbAmc.customer?.companyName || dbAmc.customer?.contactPerson || 'Unknown',
    name: dbAmc.amcName,
    startDate: dbAmc.startDate ? dbAmc.startDate.substring(0, 10) : '',
    endDate: dbAmc.endDate ? dbAmc.endDate.substring(0, 10) : '',
    frequency,
    baseAmount: Number(dbAmc.baseAmountPerCycle),
    gstPercent: Number(dbAmc.gstPercentage),
    tdsPercent: Number(dbAmc.tdsPercentage),
    nextBillingDate: dbAmc.nextBillingDate ? dbAmc.nextBillingDate.substring(0, 10) : '',
    status,
    notes: dbAmc.notes || '',
    createdAt: dbAmc.createdAt,
  }
}

function mapDBAMCCycleToCycle(dbCycle: any): AMCBillingCycle {
  const piStatusMap: Record<string, any> = {
    'NOT_RAISED': 'Not Raised',
    'DRAFT': 'Draft',
    'SENT': 'Sent',
    'UPLOADED': 'Uploaded',
    'CANCELLED': 'Cancelled',
  }
  const piStatus = piStatusMap[dbCycle.piStatus] || 'Not Raised'

  const tiStatusMap: Record<string, any> = {
    'NOT_CREATED': 'Not Created',
    'DRAFT': 'Draft',
    'SENT': 'Sent',
    'UPLOADED': 'Uploaded',
    'CANCELLED': 'Cancelled',
  }
  const tiStatus = tiStatusMap[dbCycle.tiStatus] || 'Not Created'

  const paymentStatusMap: Record<string, any> = {
    'PENDING': 'Pending',
    'PARTIALLY_PAID': 'Partial',
    'PAID': 'Matched',
    'SHORTFALL': 'Shortfall',
    'CANCELLED': 'Pending',
  }
  const paymentStatus = paymentStatusMap[dbCycle.paymentStatus] || 'Pending'

  return {
    id: dbCycle.id,
    amcId: dbCycle.amcId,
    period: dbCycle.cycleName,
    dueDate: dbCycle.dueDate ? dbCycle.dueDate.substring(0, 10) : '',
    baseAmount: Number(dbCycle.baseAmount),
    gstAmount: Number(dbCycle.gstAmount),
    grossAmount: Number(dbCycle.grossAmount),
    tdsAmount: Number(dbCycle.tdsAmount),
    expectedReceipt: Number(dbCycle.expectedAmount),
    amountReceived: Number(dbCycle.receivedAmount),
    piStatus,
    tiStatus,
    paymentStatus,
    piFileName: dbCycle.piFile || undefined,
    tiFileName: dbCycle.tiFile || undefined,
  }
}

const SalesContext = createContext<SalesState | null>(null)

export function SalesProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [amcs, setAMCs] = useState<AMC[]>([])
  const [amcCycles, setAMCCycles] = useState<AMCBillingCycle[]>([])
  const [pis, setPIs] = useState<ProformaInvoice[]>([])
  const [tis, setTIs] = useState<TaxInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()
  const { showError } = useToast()

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
        baseAmount: Number(dbPi.baseAmount),
        gstPercent: Number(dbPi.gstPercentage),
        gstAmount: Number(dbPi.gstAmount),
        tdsPercent: Number(dbPi.tdsPercentage),
        tdsAmount: Number(dbPi.tdsAmount),
        grossAmount: Number(dbPi.grossAmount),
        amountReceived: Number(dbPi.amountReceived),
        outstandingBeyondTds: Number(dbPi.outstandingAmount),
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
        baseAmount: Number(dbTi.baseAmount),
        gstPercent: Number(dbTi.gstPercentage),
        gstAmount: Number(dbTi.gstAmount),
        tdsPercent: Number(dbTi.tdsPercentage),
        tdsAmount: Number(dbTi.tdsAmount),
        grossAmount: Number(dbTi.grossAmount),
        amountReceived: Number(dbTi.amountReceived),
        outstandingBeyondTds: Number(dbTi.outstandingAmount),
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

  const fetchProjectedSalesPaginated = async (params?: any) => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val))
        }
      })
    }
    const data = await apiCall(`/projected-sales?${query.toString()}`)
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

    return {
      projects: mappedProjects,
      milestones: mappedMilestones,
      meta: data.data?.meta || { totalCount: mappedProjects.length, page: 1, limit: 10, totalPages: 1 }
    }
  }

  const fetchAMCs = async () => {
    if (!token) {
      setAMCs([])
      setAMCCycles([])
      return
    }
    try {
      const data = await apiCall('/amcs?limit=10000')
      const dbAmcs = data.data?.amcs || []
      const mapped = dbAmcs.map(mapDBAMCToAMC)
      setAMCs(mapped)
    } catch (err: any) {
      console.error('Failed to fetch AMCs:', err.message)
    }
  }

  const fetchAMCsPaginated = async (params?: any) => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val))
        }
      })
    }
    const data = await apiCall(`/amcs?${query.toString()}`)
    const dbAmcs = data.data?.amcs || []
    const mapped = dbAmcs.map(mapDBAMCToAMC)
    return {
      amcs: mapped,
      meta: data.data?.meta || { totalCount: data.data?.meta?.totalCount || mapped.length, page: 1, limit: 10, totalPages: 1 }
    }
  }

  const fetchAMCDetails = async (amcId: string) => {
    try {
      const res = await apiCall(`/amcs/${amcId}`)
      if (res.success && res.data) {
        const dbCycles = res.data.billingCycles || []
        const mappedCycles = dbCycles.map(mapDBAMCCycleToCycle)
        setAMCCycles(prev => [
          ...prev.filter(c => c.amcId !== amcId),
          ...mappedCycles
        ])
      }
    } catch (err: any) {
      console.error('Failed to fetch AMC details:', err.message)
    }
  }

  const fetchPIsPaginated = async (params?: any) => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val))
        }
      })
    }
    const data = await apiCall(`/invoices/proforma?${query.toString()}`)
    const mappedPIs: ProformaInvoice[] = (data.data?.invoices || []).map((dbPi: any) => ({
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
      baseAmount: Number(dbPi.baseAmount),
      gstPercent: Number(dbPi.gstPercentage),
      gstAmount: Number(dbPi.gstAmount),
      tdsPercent: Number(dbPi.tdsPercentage),
      tdsAmount: Number(dbPi.tdsAmount),
      grossAmount: Number(dbPi.grossAmount),
      amountReceived: Number(dbPi.amountReceived),
      outstandingBeyondTds: Number(dbPi.outstandingAmount),
      status: dbPi.status,
      piSent: dbPi.status === 'SENT',
      fileName: dbPi.piFile || undefined,
      notes: dbPi.notes || '',
      createdAt: dbPi.createdAt
    }))
    return {
      pis: mappedPIs,
      meta: data.data?.meta || { totalCount: data.data?.meta?.totalCount || mappedPIs.length, page: 1, limit: 10, totalPages: 1 }
    }
  }

  const fetchTIsPaginated = async (params?: any) => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val))
        }
      })
    }
    const data = await apiCall(`/invoices/tax?${query.toString()}`)
    const mappedTIs: TaxInvoice[] = (data.data?.invoices || []).map((dbTi: any) => ({
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
      baseAmount: Number(dbTi.baseAmount),
      gstPercent: Number(dbTi.gstPercentage),
      gstAmount: Number(dbTi.gstAmount),
      tdsPercent: Number(dbTi.tdsPercentage),
      tdsAmount: Number(dbTi.tdsAmount),
      grossAmount: Number(dbTi.grossAmount),
      amountReceived: Number(dbTi.amountReceived),
      outstandingBeyondTds: Number(dbTi.outstandingAmount),
      status: dbTi.status,
      invoiceSent: dbTi.status === 'SENT',
      fileName: dbTi.tiFile || undefined,
      notes: dbTi.notes || '',
      createdAt: dbTi.createdAt
    }))
    return {
      tis: mappedTIs,
      meta: data.data?.meta || { totalCount: data.data?.meta?.totalCount || mappedTIs.length, page: 1, limit: 10, totalPages: 1 }
    }
  }

  useEffect(() => {
    fetchProjectedSales()
    fetchInvoices()
    fetchAMCs()
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
      showError(err.message, 'Failed to Save Project')
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
        showError(err.message, 'Failed to Delete Project')
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

    upsertAMC: async (a) => {
      setAMCs(prev => upsert(prev, a))
      try {
        const isNew = a.id.length <= 10 || !amcs.some(x => x.id === a.id)

        const frequencyMap: Record<string, string> = {
          'Monthly': 'MONTHLY',
          'Quarterly': 'QUARTERLY',
          'Half-Yearly': 'HALF_YEARLY',
          'Yearly': 'YEARLY',
        }
        const billingFrequency = frequencyMap[a.frequency] || 'MONTHLY'

        const statusMap: Record<string, string> = {
          'Active': 'ACTIVE',
          'Expired': 'EXPIRED',
          'On Hold': 'ON_HOLD',
          'Cancelled': 'CANCELLED',
        }
        const status = statusMap[a.status] || 'ACTIVE'

        const payload = {
          customerId: a.customerId,
          amcName: a.name,
          startDate: new Date(a.startDate).toISOString(),
          endDate: new Date(a.endDate).toISOString(),
          billingFrequency,
          status,
          baseAmountPerCycle: Number(a.baseAmount) || 0,
          gstPercentage: Number(a.gstPercent) || 0,
          tdsPercentage: Number(a.tdsPercent) || 0,
          notes: a.notes,
        }

        if (isNew) {
          await apiCall('/amcs', { method: 'POST', body: JSON.stringify(payload) })
        } else {
          await apiCall(`/amcs/${a.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        }
        await fetchAMCs()
      } catch (err: any) {
        console.error('Failed to save AMC:', err.message)
        showError(err.message, 'Failed to Save AMC')
        await fetchAMCs() // Revert on failure
      }
    },
    deleteAMC: async (id) => {
      try {
        await apiCall(`/amcs/${id}`, { method: 'DELETE' })
        await fetchAMCs()
      } catch (err: any) {
        console.error('Failed to delete AMC:', err.message)
        showError(err.message, 'Failed to Delete AMC')
      }
    },

    upsertAMCCycle: c => setAMCCycles(prev => upsert(prev, c)),
    deleteAMCCycle: id => setAMCCycles(prev => prev.filter(c => c.id !== id)),

    upsertPI: async (pi, file) => {
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

        let savedPiId = pi.id
        if (isNew) {
          const res = await apiCall('/invoices/proforma', { method: 'POST', body: JSON.stringify(payload) })
          if (res.success && res.data?.id) {
            savedPiId = res.data.id
          }
        } else {
          await apiCall(`/invoices/proforma/${pi.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        }

        // Handle file uploads or deletions
        if (file) {
          const formData = new FormData()
          formData.append('file', file)
          await apiCall(`/invoices/proforma/${savedPiId}/file`, {
            method: 'POST',
            body: formData
          })
        } else if (!pi.fileName && !isNew) {
          // If file was cleared, delete it
          const originalPi = pis.find(x => x.id === pi.id)
          if (originalPi?.fileName) {
            await apiCall(`/invoices/proforma/${pi.id}/file`, { method: 'DELETE' })
          }
        }

        await fetchInvoices()
      } catch (err: any) {
        console.error('Failed to save PI:', err.message)
        showError(err.message, 'Failed to Save Proforma Invoice')
        await fetchInvoices() // Revert on failure
        throw err
      }
    },
    deletePI: async (id) => {
      try {
        await apiCall(`/invoices/proforma/${id}`, { method: 'DELETE' })
        await fetchInvoices()
      } catch (err: any) {
        console.error('Failed to delete PI:', err.message)
        showError(err.message, 'Failed to Delete Proforma Invoice')
      }
    },

    upsertTI: async (ti, file) => {
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

        let savedTiId = ti.id
        if (isNew) {
          if (ti.linkedPiId) {
            const res = await apiCall(`/invoices/tax/generate/${ti.linkedPiId}`, {
              method: 'POST',
              body: JSON.stringify({
                tiDate: ti.tiDate,
                notes: ti.notes,
              }),
            })
            if (res.success && res.data?.id) {
              savedTiId = res.data.id
            }
          } else {
            const res = await apiCall('/invoices/tax', { method: 'POST', body: JSON.stringify(payload) })
            if (res.success && res.data?.id) {
              savedTiId = res.data.id
            }
          }
        } else {
          await apiCall(`/invoices/tax/${ti.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        }

        // Handle file uploads or deletions
        if (file) {
          const formData = new FormData()
          formData.append('file', file)
          await apiCall(`/invoices/tax/${savedTiId}/file`, {
            method: 'POST',
            body: formData
          })
        } else if (!ti.fileName && !isNew) {
          // If file was cleared, delete it
          const originalTi = tis.find(x => x.id === ti.id)
          if (originalTi?.fileName) {
            await apiCall(`/invoices/tax/${ti.id}/file`, { method: 'DELETE' })
          }
        }

        await fetchInvoices()
      } catch (err: any) {
        console.error('Failed to save TI:', err.message)
        showError(err.message, 'Failed to Save Tax Invoice')
        await fetchInvoices() // Revert on failure
        throw err
      }
    },
    deleteTI: async (id) => {
      try {
        await apiCall(`/invoices/tax/${id}`, { method: 'DELETE' })
        await fetchInvoices()
      } catch (err: any) {
        console.error('Failed to delete TI:', err.message)
        showError(err.message, 'Failed to Delete Tax Invoice')
      }
    },

    refreshSales: async () => {
      await fetchProjectedSales()
      await fetchInvoices()
    },
    fetchProjectedSalesPaginated,
    fetchAMCsPaginated,
    fetchPIsPaginated,
    fetchTIsPaginated,
    fetchAMCDetails,
    fetchAMCs
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
