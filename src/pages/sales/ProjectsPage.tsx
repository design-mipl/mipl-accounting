import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Eye, Pencil, Trash2, FileText, ChevronLeft, ChevronRight, SlidersHorizontal, Calendar } from 'lucide-react'
import clsx from 'clsx'
import type { Project, ProjectType, ProformaInvoice } from '../../types/sales'
import { PROJECT_TYPES, calcMilestone } from '../../types/sales'
import { useCustomers } from '../../contexts/CustomerContext'
import { useSales } from '../../contexts/SalesContext'
import { fmtINR } from '../../utils/currency'
import { StatusBadge, projectStatusTone } from './components/StatusBadge'
import { ProjectFormDrawer } from './components/ProjectFormDrawer'
import { ProjectDetailDrawer } from './components/ProjectDetailDrawer'
import { PIFormDrawer } from './components/PIFormDrawer'
import DeleteConfirmationModal from '../../components/common/DeleteConfirmationModal'
import { useToast } from '../../contexts/ToastContext'

type Tab = 'upcoming' | 'overview'

type UpcomingRow = {
  key: string
  customerId: string
  customerName: string
  projectId: string
  projectType: ProjectType
  stage: string            // "Milestone 2 of 4 – UI Completion" or "AMC – Monthly"
  amount: number
  dueDate: string
  status: 'Upcoming' | 'PI Generated'
  // PI prefill payload
  milestoneId?: string
  baseAmount: number
  gstPercent: number
  tdsPercent: number
}

function generatePiNumber(existingPis: ProformaInvoice[]): string {
  const today = new Date()
  const month = today.getMonth() + 1
  const year = today.getFullYear()
  // Indian fiscal year: April to March
  const fy = month >= 4 ? `${year % 100}-${(year + 1) % 100}` : `${(year - 1) % 100}-${year % 100}`
  const count = existingPis.filter(pi => pi.piNumber.includes(fy)).length + 1
  return `PI/${fy}/${String(count).padStart(3, '0')}`
}

type PIFormPrefill = {
  clientId: string
  projectId: string
  milestoneId?: string
  baseAmount: string
  gstPercent: string
  tdsPercent: string
  projectType: ProjectType
  piNumber: string
}

type DateFilterPreset = 'all' | 'today' | '7days' | '30days' | 'custom'

const btnPrimary =
  'inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-indigo-100'
const btnSecondary =
  'inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors shadow-2xs'

export default function ProjectsPage() {
  const { projects, milestones, pis, deleteProject, fetchProjectedSalesPaginated } = useSales()
  const { customers } = useCustomers()
  const { showSuccess, showError } = useToast()
  const [tab, setTab] = useState<Tab>('upcoming')

  const SALES_CUSTOMERS = useMemo(() => {
    return customers.map(c => ({
      id: c.id,
      name: c.companyName,
    }))
  }, [customers])

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [fCustomer, setFCustomer] = useState('')
  const [fType, setFType] = useState('')
  const [fStatus, setFStatus] = useState('')
  
  // Date preset filters
  const [showFilters, setShowFilters] = useState(false)
  const [preset, setPreset] = useState<DateFilterPreset>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [activeStartDate, setActiveStartDate] = useState('')
  const [activeEndDate, setActiveEndDate] = useState('')

  // Projects local pagination state
  const [paginatedProjects, setPaginatedProjects] = useState<Project[]>([])
  const [meta, setMeta] = useState({ totalCount: 0, page: 1, limit: 10, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [loadingLocal, setLoadingLocal] = useState(false)

  // Upcoming local pagination state
  const [upcomingPage, setUpcomingPage] = useState(1)
  const [upcomingLimit, setUpcomingLimit] = useState(10)

  const [formOpen, setFormOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [viewProject, setViewProject] = useState<Project | null>(null)
  const [piPrefill, setPiPrefill] = useState<PIFormPrefill | null>(null)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [deletingProjectName, setDeletingProjectName] = useState<string>('')

  // Debounced search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Sync / load paginated projects
  useEffect(() => {
    let active = true
    async function load() {
      setLoadingLocal(true)
      try {
        const res = await fetchProjectedSalesPaginated({
          page,
          limit,
          search: debouncedSearch,
          customerId: fCustomer,
          projectType: fType,
          status: fStatus,
          startDate: activeStartDate,
          endDate: activeEndDate,
        })
        if (active) {
          setPaginatedProjects(res.projects)
          setMeta(res.meta)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setLoadingLocal(false)
      }
    }
    if (tab === 'overview') {
      load()
    }
    return () => {
      active = false
    }
  }, [page, limit, debouncedSearch, fCustomer, fType, fStatus, activeStartDate, activeEndDate, tab, projects])

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, fCustomer, fType, fStatus, activeStartDate, activeEndDate])

  // Handle Preset Date Filter Changes
  const handlePresetChange = (selectedPreset: DateFilterPreset) => {
    setPreset(selectedPreset)
    const todayStr = new Date().toISOString().split('T')[0]
    if (selectedPreset === 'all') {
      setActiveStartDate('')
      setActiveEndDate('')
    } else if (selectedPreset === 'today') {
      setActiveStartDate(todayStr)
      setActiveEndDate(todayStr)
    } else if (selectedPreset === '7days') {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)
      const pastStr = pastDate.toISOString().split('T')[0]
      setActiveStartDate(pastStr)
      setActiveEndDate(todayStr)
    } else if (selectedPreset === '30days') {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 30)
      const pastStr = pastDate.toISOString().split('T')[0]
      setActiveStartDate(pastStr)
      setActiveEndDate(todayStr)
    }
  }

  const applyCustomDates = () => {
    if (customStart || customEnd) {
      setActiveStartDate(customStart)
      setActiveEndDate(customEnd)
    }
  }

  const handleClearAllFilters = () => {
    setSearchInput('')
    setFCustomer('')
    setFType('')
    setFStatus('')
    setPreset('all')
    setCustomStart('')
    setCustomEnd('')
    setActiveStartDate('')
    setActiveEndDate('')
  }

  // Build flat list of upcoming payment rows across all projects (from COMPLETE projects/milestones in context)
  const upcomingRows: UpcomingRow[] = useMemo(() => {
    const rows: UpcomingRow[] = []
    for (const p of projects) {
      const customer = customers.find(c => c.id === p.customerId)
      const customerName = customer ? customer.companyName : p.customerName

      const hasPI = (mId?: string) =>
        mId
          ? pis.some(pi => pi.milestoneId === mId)
          : pis.some(pi => pi.projectId === p.id && !pi.milestoneId)

      if (p.billingType === 'Milestone Based') {
        const ms = milestones.filter(m => m.projectId === p.id).sort((a, b) => a.number - b.number)
        for (const m of ms) {
          if (hasPI(m.id) || m.piStatus !== 'Not Raised') continue
          const c = calcMilestone(p.totalValue, m.percentage, p.gstPercent, p.tdsPercent)
          rows.push({
            key: `m-${m.id}`,
            customerId: p.customerId,
            customerName,
            projectId: p.id,
            projectType: p.projectType,
            stage: `Milestone ${m.number} of ${m.total} – ${m.name}`,
            amount: c.baseAmount,
            dueDate: m.expectedDate ?? '',
            status: 'Upcoming',
            milestoneId: m.id,
            baseAmount: c.baseAmount,
            gstPercent: p.gstPercent,
            tdsPercent: p.tdsPercent,
          })
        }
      } else if (p.billingType === 'AMC') {
        if (hasPI()) continue
        rows.push({
          key: `amc-${p.id}`,
          customerId: p.customerId,
          customerName,
          projectId: p.id,
          projectType: p.projectType,
          stage: `AMC – ${p.amcFrequency ?? 'Monthly'}`,
          amount: p.totalValue,
          dueDate: p.expectedBillingDate || p.startDate || '',
          status: 'Upcoming',
          baseAmount: p.totalValue,
          gstPercent: p.gstPercent,
          tdsPercent: p.tdsPercent,
        })
      } else {
        if (hasPI()) continue
        rows.push({
          key: `one-${p.id}`,
          customerId: p.customerId,
          customerName,
          projectId: p.id,
          projectType: p.projectType,
          stage: p.billingType,
          amount: p.totalValue,
          dueDate: p.startDate || '',
          status: 'Upcoming',
          baseAmount: p.totalValue,
          gstPercent: p.gstPercent,
          tdsPercent: p.tdsPercent,
        })
      }
    }
    return rows
  }, [projects, milestones, pis, customers])

  const filteredUpcoming = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim()
    return upcomingRows.filter(r => {
      if (q && !r.customerName.toLowerCase().includes(q)
            && !r.stage.toLowerCase().includes(q)
            && !r.projectType.toLowerCase().includes(q)) return false
      if (fCustomer && r.customerId !== fCustomer) return false
      if (fType && r.projectType !== fType) return false
      return true
    })
  }, [upcomingRows, debouncedSearch, fCustomer, fType])

  // Reset upcoming page when search/filters change
  useEffect(() => {
    setUpcomingPage(1)
  }, [debouncedSearch, fCustomer, fType])

  // Calculate upcoming pages and slice for client-side pagination
  const totalUpcomingCount = filteredUpcoming.length
  const totalUpcomingPages = Math.ceil(totalUpcomingCount / upcomingLimit) || 1
  const paginatedUpcoming = useMemo(() => {
    const start = (upcomingPage - 1) * upcomingLimit
    return filteredUpcoming.slice(start, start + upcomingLimit)
  }, [filteredUpcoming, upcomingPage, upcomingLimit])

  const totalUpcomingValue = filteredUpcoming
    .filter(r => r.status === 'Upcoming')
    .reduce((s, r) => s + r.amount, 0)

  function openProjectFor(projectId: string) {
    const proj = projects.find(p => p.id === projectId)
    if (proj) setViewProject(proj)
  }

  // Generate page numbers for footer
  const pageNumbers = []
  const maxPagesToShow = tab === 'upcoming' ? totalUpcomingPages : meta.totalPages
  const activePageNum = tab === 'upcoming' ? upcomingPage : page
  for (let i = 1; i <= maxPagesToShow; i++) {
    pageNumbers.push(i)
  }

  const handleDeleteClick = (project: Project) => {
    setDeletingProjectId(project.id)
    setDeletingProjectName(project.name)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async (isHardDelete: boolean) => {
    if (!deletingProjectId) return
    try {
      await deleteProject(deletingProjectId, isHardDelete)
      showSuccess(isHardDelete ? 'Project permanently deleted.' : 'Project soft deleted successfully.', 'Project Deleted')
    } catch (err: any) {
      showError(err.message || 'Failed to delete project', 'Delete Failed')
    } finally {
      setDeleteModalOpen(false)
      setDeletingProjectId(null)
    }
  }

  const isFilteringActive = searchInput || fCustomer || fType || fStatus || preset !== 'all' || customStart || customEnd

  return (
    <div className="max-w-[1400px] mx-auto pb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Projected Sale</h1>
          <p className="text-xs text-gray-400 mt-0.5">Upcoming billable amounts and milestone payments.</p>
        </div>
        <button
          onClick={() => { setEditProject(null); setFormOpen(true) }}
          className={btnPrimary}
        >
          <Plus size={14} />
          New Project
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {([['upcoming', 'Upcoming Payments'], ['overview', 'Project Overview']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={clsx(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer',
              tab === k ? 'text-indigo-600 border-indigo-600 font-semibold' : 'text-gray-500 border-transparent hover:text-gray-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col relative">
        {/* Loader Overlay */}
        {loadingLocal && tab === 'overview' && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-100 shadow-md">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-gray-600">Loading projects...</span>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex-wrap">
          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={tab === 'upcoming' ? 'Search customer, stage...' : 'Search projects...'}
              className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-gray-400 transition-shadow shadow-2xs"
            />
          </div>

          <FilterSelect value={fCustomer} onChange={setFCustomer} placeholder="All Customers" options={SALES_CUSTOMERS.map(c => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={fType} onChange={setFType} placeholder="All Types" options={PROJECT_TYPES.map(t => ({ value: t, label: t }))} />
          {tab === 'overview' && (
            <FilterSelect value={fStatus} onChange={setFStatus} placeholder="All Statuses" options={[
              { value: 'LEAD', label: 'Upcoming' },
              { value: 'WON', label: 'Active' },
              { value: 'NEGOTIATION', label: 'On Hold' },
              { value: 'CANCELLED', label: 'Cancelled' }
            ]} />
          )}

          {tab === 'overview' && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                btnSecondary,
                (preset !== 'all') && 'border-indigo-200 bg-indigo-50/20 text-indigo-700 hover:bg-indigo-50/40'
              )}
            >
              <SlidersHorizontal size={14} />
              Filters
              {(preset !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              )}
            </button>
          )}

          {isFilteringActive && (
            <button onClick={handleClearAllFilters} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors py-1.5 px-2 cursor-pointer">Clear Filters</button>
          )}
          {tab === 'upcoming'
            ? <span className="ml-auto text-xs text-gray-400">Upcoming total: <span className="font-semibold text-indigo-600">{fmtINR(totalUpcomingValue)}</span></span>
            : <span className="ml-auto text-xs text-gray-400">Showing {paginatedProjects.length} of {meta.totalCount} projects</span>}
        </div>

        {/* Date Filter Panel */}
        {showFilters && tab === 'overview' && (
          <div className="px-4 py-3.5 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-4 animate-fade-in">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 mr-1.5">Created Date:</span>
              {(['all', 'today', '7days', '30days', 'custom'] as DateFilterPreset[]).map(p => (
                <button
                  key={p}
                  onClick={() => handlePresetChange(p)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer',
                    preset === p
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  )}
                >
                  {p === 'all' && 'All Time'}
                  {p === 'today' && 'Today'}
                  {p === '7days' && 'Past 7 Days'}
                  {p === '30days' && 'Past 30 Days'}
                  {p === 'custom' && 'Custom Range'}
                </button>
              ))}
            </div>

            {preset === 'custom' && (
              <div className="flex items-center gap-2 border-t md:border-t-0 border-gray-100 pt-3.5 md:pt-0 md:pl-4 md:border-l">
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-gray-400" />
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-gray-200 rounded-md bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-gray-200 rounded-md bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
                <button
                  onClick={applyCustomDates}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 1: UPCOMING PAYMENTS ── */}
        {tab === 'upcoming' && (
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3">Project Type</th>
                  <th className="py-2.5 px-3">Milestone / Billing Stage</th>
                  <th className="py-2.5 px-3 text-right">Milestone Basis Value</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUpcoming.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-xs text-gray-400">No upcoming payments. Create a project to generate billing rows.</td></tr>
                )}
                {paginatedUpcoming.map(r => (
                  <tr key={r.key} className="group border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="py-2.5 px-3 text-xs font-medium text-gray-900">{r.customerName}</td>
                    <td className="py-2.5 px-3 text-xs"><StatusBadge label={r.projectType} tone="gray" size="xs" /></td>
                    <td className="py-2.5 px-3 text-xs text-gray-600">{r.stage}</td>
                    <td className="py-2.5 px-3 text-xs text-right font-semibold text-indigo-700">{fmtINR(r.amount)}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-500">{r.dueDate || '—'}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge label={r.status} tone="blue" size="xs" />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openProjectFor(r.projectId)} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] border border-gray-200 rounded-md hover:bg-indigo-50 hover:text-indigo-700 text-gray-500 cursor-pointer">
                          <Eye size={11} /> View Project
                        </button>
                        <button onClick={() => setPiPrefill({
                          clientId: r.customerId,
                          projectId: r.projectId,
                          milestoneId: r.milestoneId,
                          baseAmount: String(r.baseAmount),
                          gstPercent: String(r.gstPercent),
                          tdsPercent: String(r.tdsPercent),
                          projectType: r.projectType,
                          piNumber: generatePiNumber(pis),
                        })} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer">
                          <FileText size={11} /> Generate PI
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 2: PROJECT OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="py-2.5 px-3">Project Name</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Billing Type</th>
                  <th className="py-2.5 px-3 text-right">Total Value</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProjects.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-xs text-gray-400">No projects.</td></tr>
                )}
                {paginatedProjects.map(p => {
                  const customer = customers.find(c => c.id === p.customerId)
                  const customerName = customer ? customer.companyName : p.customerName
                  return (
                    <tr key={p.id} className="group border-b border-gray-50 hover:bg-gray-50/60 text-xs">
                      <td className="py-2.5 px-3 font-medium text-gray-900">{p.name}</td>
                      <td className="py-2.5 px-3 text-gray-600">{customerName}</td>
                      <td className="py-2.5 px-3"><StatusBadge label={p.projectType} tone="gray" size="xs" /></td>
                      <td className="py-2.5 px-3 text-gray-500">{p.billingType}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{fmtINR(p.totalValue)}</td>
                      <td className="py-2.5 px-3"><StatusBadge label={p.projectStatus} tone={projectStatusTone(p.projectStatus)} size="xs" /></td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => setViewProject(p)} title="View / Manage" className="p-1.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 cursor-pointer"><Eye size={13} /></button>
                          <button onClick={() => { setEditProject(p); setFormOpen(true) }} title="Edit" className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 cursor-pointer"><Pencil size={13} /></button>
                          <button onClick={() => handleDeleteClick(p)} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
          {/* Total Info & Limit Selector */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              {tab === 'upcoming' ? (
                totalUpcomingCount > 0 ? (
                  <>Showing <b className="font-semibold text-gray-800">{((upcomingPage - 1) * upcomingLimit) + 1}</b> to <b className="font-semibold text-gray-800">{Math.min(upcomingPage * upcomingLimit, totalUpcomingCount)}</b> of <b className="font-semibold text-gray-800">{totalUpcomingCount}</b> entries</>
                ) : (
                  'No entries to show'
                )
              ) : (
                meta.totalCount > 0 ? (
                  <>Showing <b className="font-semibold text-gray-800">{((page - 1) * limit) + 1}</b> to <b className="font-semibold text-gray-800">{Math.min(page * limit, meta.totalCount)}</b> of <b className="font-semibold text-gray-800">{meta.totalCount}</b> entries</>
                ) : (
                  'No entries to show'
                )
              )}
            </span>
            <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
              <span>Show</span>
              <select
                value={tab === 'upcoming' ? upcomingLimit : limit}
                onChange={e => {
                  const val = Number(e.target.value)
                  if (tab === 'upcoming') {
                    setUpcomingLimit(val)
                    setUpcomingPage(1)
                  } else {
                    setLimit(val)
                    setPage(1)
                  }
                }}
                className="px-1.5 py-1 text-xs border border-gray-200 rounded-md bg-white text-gray-700 outline-none focus:border-indigo-400 font-semibold cursor-pointer"
              >
                {[5, 10, 25, 50].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Page numbers */}
          {maxPagesToShow > 1 && (
            <div className="flex items-center gap-1.5">
              {/* Prev Button */}
              <button
                onClick={() => tab === 'upcoming' ? setUpcomingPage(upcomingPage - 1) : setPage(page - 1)}
                disabled={activePageNum === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>

              {/* Page Number Selectors */}
              <div className="flex items-center gap-1.5">
                {pageNumbers.map(num => (
                  <button
                    key={num}
                    onClick={() => tab === 'upcoming' ? setUpcomingPage(num) : setPage(num)}
                    className={clsx(
                      'w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs',
                      activePageNum === num
                        ? 'bg-indigo-600 border-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-100'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={() => tab === 'upcoming' ? setUpcomingPage(upcomingPage + 1) : setPage(page + 1)}
                disabled={activePageNum === maxPagesToShow}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      <ProjectFormDrawer open={formOpen} onClose={() => { setFormOpen(false); setEditProject(null) }} initial={editProject} />
      <ProjectDetailDrawer project={viewProject} onClose={() => setViewProject(null)} />
      <PIFormDrawer
        open={!!piPrefill}
        onClose={() => setPiPrefill(null)}
        prefill={piPrefill || undefined}
      />
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        title="Delete Project"
        message="Choose how you want to delete this project. Soft delete preserves associated historical data. Hard delete is permanent."
        itemName={deletingProjectName}
        onClose={() => { setDeleteModalOpen(false); setDeletingProjectId(null); }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

function FilterSelect({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[]
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={clsx('px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white cursor-pointer shadow-2xs',
        value ? 'border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600')}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
