import { useState, useMemo } from 'react'
import { Plus, Search, Eye, Pencil, Trash2, FileText } from 'lucide-react'
import clsx from 'clsx'
import type { Project, ProjectType, ProformaInvoice } from '../../types/sales'
import { PROJECT_TYPES, calcMilestone } from '../../types/sales'
import { useSales } from '../../contexts/SalesContext'
import { SALES_CUSTOMERS } from '../../data/sales'
import { fmtINR } from '../../utils/currency'
import { StatusBadge, projectStatusTone } from './components/StatusBadge'
import { ProjectFormModal } from './components/ProjectFormModal'
import { ProjectDetailDrawer } from './components/ProjectDetailDrawer'
import { PIFormDrawer } from './components/PIFormDrawer'

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

export default function ProjectsPage() {
  const { projects, milestones, pis, deleteProject } = useSales()
  const [tab, setTab] = useState<Tab>('upcoming')

  const [search, setSearch] = useState('')
  const [fCustomer, setFCustomer] = useState('')
  const [fType, setFType] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [viewProject, setViewProject] = useState<Project | null>(null)
  const [piPrefill, setPiPrefill] = useState<PIFormPrefill | null>(null)

  // Build flat list of upcoming payment rows across all projects
  const upcomingRows: UpcomingRow[] = useMemo(() => {
    const rows: UpcomingRow[] = []
    for (const p of projects) {
      const hasPI = (mId?: string) =>
        mId
          ? pis.some(pi => pi.milestoneId === mId)
          : pis.some(pi => pi.projectId === p.id && !pi.milestoneId)

      if (p.billingType === 'Milestone Based') {
        const ms = milestones.filter(m => m.projectId === p.id).sort((a, b) => a.number - b.number)
        for (const m of ms) {
          // Once a PI is generated for a milestone it leaves Upcoming Payments
          if (hasPI(m.id) || m.piStatus !== 'Not Raised') continue
          const c = calcMilestone(p.totalValue, m.percentage, p.gstPercent, p.tdsPercent)
          rows.push({
            key: `m-${m.id}`,
            customerId: p.customerId,
            customerName: p.customerName,
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
          customerName: p.customerName,
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
          customerName: p.customerName,
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
  }, [projects, milestones, pis])

  const filteredUpcoming = useMemo(() => {
    const q = search.toLowerCase().trim()
    return upcomingRows.filter(r => {
      if (q && !r.customerName.toLowerCase().includes(q)
            && !r.stage.toLowerCase().includes(q)
            && !r.projectType.toLowerCase().includes(q)) return false
      if (fCustomer && r.customerId !== fCustomer) return false
      if (fType && r.projectType !== fType) return false
      return true
    })
  }, [upcomingRows, search, fCustomer, fType])

  const filteredProjects = useMemo(() => {
    const q = search.toLowerCase().trim()
    return projects.filter(p => {
      if (q && !p.customerName.toLowerCase().includes(q)
            && !p.projectType.toLowerCase().includes(q)) return false
      if (fCustomer && p.customerId !== fCustomer) return false
      if (fType && p.projectType !== fType) return false
      return true
    })
  }, [projects, search, fCustomer, fType])

  const totalUpcomingValue = filteredUpcoming
    .filter(r => r.status === 'Upcoming')
    .reduce((s, r) => s + r.amount, 0)

  function openProjectFor(projectId: string) {
    const proj = projects.find(p => p.id === projectId)
    if (proj) setViewProject(proj)
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Projected Sale</h1>
          <p className="text-xs text-gray-400 mt-0.5">Upcoming billable amounts and milestone payments.</p>
        </div>
        <button
          onClick={() => { setEditProject(null); setFormOpen(true) }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg"
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
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === k ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-wrap">
          <div className="relative" style={{ minWidth: '220px' }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'upcoming' ? 'Search customer, stage...' : 'Search projects...'}
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            />
          </div>
          <FilterSelect value={fCustomer} onChange={setFCustomer} placeholder="All Customers" options={SALES_CUSTOMERS.map(c => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={fType} onChange={setFType} placeholder="All Types" options={PROJECT_TYPES.map(t => ({ value: t, label: t }))} />
          {(search || fCustomer || fType) && (
            <button onClick={() => { setSearch(''); setFCustomer(''); setFType('') }} className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
          )}
          {tab === 'upcoming'
            ? <span className="ml-auto text-xs text-gray-400">Upcoming total: <span className="font-semibold text-indigo-600">{fmtINR(totalUpcomingValue)}</span></span>
            : <span className="ml-auto text-xs text-gray-400">{filteredProjects.length} of {projects.length} projects</span>}
        </div>

        {/* ── TAB 1: UPCOMING PAYMENTS ── */}
        {tab === 'upcoming' && (
          <div className="overflow-x-auto">
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
                {filteredUpcoming.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-xs text-gray-400">No upcoming payments. Create a project to generate billing rows.</td></tr>
                )}
                {filteredUpcoming.map(r => (
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
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openProjectFor(r.projectId)} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] border border-gray-200 rounded-md hover:bg-indigo-50 hover:text-indigo-700 text-gray-500">
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
                        })} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
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
          <div className="overflow-x-auto">
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
                {filteredProjects.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-xs text-gray-400">No projects.</td></tr>
                )}
                {filteredProjects.map(p => (
                  <tr key={p.id} className="group border-b border-gray-50 hover:bg-gray-50/60 text-xs">
                    <td className="py-2.5 px-3 font-medium text-gray-900">{p.name}</td>
                    <td className="py-2.5 px-3 text-gray-600">{p.customerName}</td>
                    <td className="py-2.5 px-3"><StatusBadge label={p.projectType} tone="gray" size="xs" /></td>
                    <td className="py-2.5 px-3 text-gray-500">{p.billingType}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{fmtINR(p.totalValue)}</td>
                    <td className="py-2.5 px-3"><StatusBadge label={p.projectStatus} tone={projectStatusTone(p.projectStatus)} size="xs" /></td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewProject(p)} title="View / Manage" className="p-1.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600"><Eye size={13} /></button>
                        <button onClick={() => { setEditProject(p); setFormOpen(true) }} title="Edit" className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600"><Pencil size={13} /></button>
                        <button onClick={() => { if (confirm(`Delete project "${p.name}"?`)) deleteProject(p.id) }} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {tab === 'upcoming'
              ? 'Each milestone / billing item is a separate upcoming payment row. Generate PI to start invoicing.'
              : 'Full project details. Open a project to manage milestones, PIs, tax invoices, receipts and documents.'}
          </p>
        </div>
      </div>

      <ProjectFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditProject(null) }} />
      <ProjectDetailDrawer project={viewProject} onClose={() => setViewProject(null)} />
      <PIFormDrawer
        open={!!piPrefill}
        onClose={() => setPiPrefill(null)}
        prefill={piPrefill}
      />
    </div>
  )
}

function FilterSelect({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[]
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={clsx('px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white',
        value ? 'border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600')}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
