import { useState, useEffect, useMemo } from 'react'
import { X, Briefcase, Plus, Trash2, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import type { Project, Milestone, ProjectType, BillingType, ProjectStatus, AMCFrequency } from '../../../types/sales'
import {
  PROJECT_TYPES, BILLING_TYPES, PROJECT_STATUSES, round2,
} from '../../../types/sales'
import { useCustomers } from '../../../contexts/CustomerContext'
import { useSales, newId } from '../../../contexts/SalesContext'
import { fmtINR } from '../../../utils/currency'

const AMC_FREQ_OPTIONS: AMCFrequency[] = ['Monthly', 'Quarterly', 'Yearly']

type MsRow = {
  id: string
  name: string
  percentage: string
  description: string
  expectedDate: string
  notes: string
}

type Form = {
  customerId: string
  name: string
  projectType: ProjectType
  billingType: BillingType
  totalValue: string
  gstPercent: string
  tdsPercent: string
  startDate: string
  endDate: string
  amcFrequency: AMCFrequency
  expectedBillingDate: string
  projectStatus: ProjectStatus
  notes: string
}

function blankForm(): Form {
  return {
    customerId: '', name: '', projectType: 'Website', billingType: 'Milestone Based',
    totalValue: '', gstPercent: '', tdsPercent: '',
    startDate: '', endDate: '', amcFrequency: 'Monthly', expectedBillingDate: '',
    projectStatus: 'Upcoming', notes: '',
  }
}

export function ProjectFormDrawer({ open, onClose, initial }: {
  open: boolean
  onClose: () => void
  initial?: Project | null
}) {
  const { milestones, upsertProject, setMilestonesForProject } = useSales()
  const { customers } = useCustomers()
  const [form, setForm] = useState<Form>(blankForm())
  const [msRows, setMsRows] = useState<MsRow[]>([])

  const SALES_CUSTOMERS = useMemo(() => {
    return customers
      .filter(c => c.status === 'ACTIVE' || c.id === form.customerId || c.id === initial?.customerId)
      .map(c => ({
      id: c.id,
      name: c.companyName,
      gstPercent: c.gstApplicable ? 18 : 0,
      tdsPercent: c.tdsPercentage ?? 10
    }))
  }, [customers, form.customerId, initial])

  useEffect(() => {
    if (initial) {
      setForm({
        customerId: initial.customerId,
        name: initial.name,
        projectType: initial.projectType,
        billingType: initial.billingType,
        totalValue: String(initial.totalValue),
        gstPercent: String(initial.gstPercent),
        tdsPercent: String(initial.tdsPercent),
        startDate: initial.startDate,
        endDate: initial.endDate,
        amcFrequency: initial.amcFrequency ?? 'Monthly',
        expectedBillingDate: initial.expectedBillingDate ?? '',
        projectStatus: initial.projectStatus,
        notes: initial.notes ?? '',
      })
      const existing = milestones.filter(m => m.projectId === initial.id).sort((a, b) => a.number - b.number)
      setMsRows(existing.map(m => ({
        id: m.id,
        name: m.name,
        percentage: String(m.percentage),
        description: m.description ?? '',
        expectedDate: m.expectedDate ?? '',
        notes: m.notes ?? '',
      })))
    } else {
      setForm(blankForm())
      setMsRows([])
    }
  }, [initial, open]) // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  // Auto-fill GST/TDS from Client Master defaults on customer select
  function pickCustomer(id: string) {
    const c = SALES_CUSTOMERS.find(x => x.id === id)
    setForm(prev => ({
      ...prev,
      customerId: id,
      gstPercent: c ? String(c.gstPercent) : prev.gstPercent,
      tdsPercent: c ? String(c.tdsPercent) : prev.tdsPercent,
    }))
  }

  const isMilestone = form.billingType === 'Milestone Based'
  const isAMC = form.billingType === 'AMC'

  const totalValueNum = parseFloat(form.totalValue) || 0
  const totalPct = useMemo(
    () => msRows.reduce((s, r) => s + (parseFloat(r.percentage) || 0), 0),
    [msRows],
  )
  const pctOff = isMilestone && msRows.length > 0 && Math.abs(totalPct - 100) > 0.01

  function addMs() {
    setMsRows(prev => [...prev, {
      id: newId(), name: '', percentage: '', description: '', expectedDate: '', notes: '',
    }])
  }
  function updateMs(idx: number, patch: Partial<MsRow>) {
    setMsRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }
  function removeMs(idx: number) {
    setMsRows(prev => prev.filter((_, i) => i !== idx))
  }

  function save() {
    const customer = SALES_CUSTOMERS.find(c => c.id === form.customerId)
    if (!customer) return

    const projectId = initial?.id ?? newId()
    const project: Project = {
      id: projectId,
      customerId: form.customerId,
      customerName: customer.name,
      name: form.name.trim() || `${form.projectType} – ${customer.name}`,
      projectType: form.projectType,
      startDate: form.startDate,
      endDate: isAMC ? form.endDate : '',
      totalValue: totalValueNum,
      gstPercent: parseFloat(form.gstPercent) || 0,
      tdsPercent: parseFloat(form.tdsPercent) || 0,
      billingType: form.billingType,
      projectStatus: form.projectStatus,
      amcFrequency: isAMC ? form.amcFrequency : undefined,
      expectedBillingDate: isAMC ? form.expectedBillingDate : undefined,
      notes: form.notes,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    upsertProject(project)

    if (isMilestone) {
      const total = msRows.length
      const built: Milestone[] = msRows.map((r, i) => ({
        id: r.id,
        projectId,
        number: i + 1,
        total,
        name: r.name.trim() || `Milestone ${i + 1}`,
        percentage: parseFloat(r.percentage) || 0,
        description: r.description,
        expectedDate: r.expectedDate,
        notes: r.notes,
        piStatus: 'Not Raised',
        tiStatus: 'Not Created',
        paymentStatus: 'Pending',
        milestoneStatus: 'Not Started',
      }))
      // Preserve existing statuses for milestones that already existed
      const prevById = new Map(milestones.filter(m => m.projectId === projectId).map(m => [m.id, m]))
      built.forEach(m => {
        const prev = prevById.get(m.id)
        if (prev) {
          m.piStatus = prev.piStatus
          m.tiStatus = prev.tiStatus
          m.paymentStatus = prev.paymentStatus
          m.milestoneStatus = prev.milestoneStatus
          m.piFileName = prev.piFileName
          m.tiFileName = prev.tiFileName
        }
      })
      setMilestonesForProject(projectId, built)
    } else {
      setMilestonesForProject(projectId, [])
    }
    onClose()
  }

  if (!open) return null

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white'
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1.5'

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[560px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Briefcase size={15} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{initial ? 'Edit Project' : 'New Project'}</h2>
              <p className="text-xs text-gray-400">Set up billing — drives Projected Sale rows.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className={labelCls}>Customer Name *</label>
            <select value={form.customerId} onChange={e => pickCustomer(e.target.value)} className={inputCls}>
              <option value="">Select customer</option>
              {SALES_CUSTOMERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Project Name <span className="text-gray-400 font-normal">(optional)</span></label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="e.g. Web App Project" />
            </div>
            <div>
              <label className={labelCls}>Project Type</label>
              <select value={form.projectType} onChange={e => set('projectType', e.target.value as ProjectType)} className={inputCls}>
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Billing Type</label>
              <select value={form.billingType} onChange={e => set('billingType', e.target.value as BillingType)} className={inputCls}>
                {BILLING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Total Project Value (₹)</label>
              <input type="number" min="0" value={form.totalValue} onChange={e => set('totalValue', e.target.value)} className={inputCls} placeholder="1000000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>GST % <span className="text-gray-400 font-normal">(auto from client)</span></label>
              <input type="number" min="0" max="100" value={form.gstPercent} onChange={e => set('gstPercent', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>TDS % <span className="text-gray-400 font-normal">(auto from client)</span></label>
              <input type="number" min="0" max="100" value={form.tdsPercent} onChange={e => set('tdsPercent', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Dates — conditional on billing type */}
          {isAMC ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>End Date</label>
                  <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Billing Frequency</label>
                  <select value={form.amcFrequency} onChange={e => set('amcFrequency', e.target.value as AMCFrequency)} className={inputCls}>
                    {AMC_FREQ_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Expected Billing Date</label>
                  <input type="date" value={form.expectedBillingDate} onChange={e => set('expectedBillingDate', e.target.value)} className={inputCls} />
                </div>
              </div>
              <p className="text-[11px] text-gray-400">AMC Amount = Total Project Value above (per cycle).</p>
            </>
          ) : (
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inputCls} />
            </div>
          )}

          <div>
            <label className={labelCls}>Project Status</label>
            <div className="grid grid-cols-5 gap-1.5">
              {PROJECT_STATUSES.map(s => (
                <button key={s} onClick={() => set('projectStatus', s)}
                  className={clsx('px-2 py-1.5 text-[11px] rounded-lg border font-medium transition-colors',
                    form.projectStatus === s ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Milestones — only when Milestone Based */}
          {isMilestone && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Milestones</h3>
                  {msRows.length > 0 && (
                    <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded',
                      pctOff ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>
                      {totalPct.toFixed(2)}%
                    </span>
                  )}
                </div>
                <button onClick={addMs} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Plus size={12} /> Add Milestone
                </button>
              </div>

              {pctOff && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle size={12} />
                  Total milestone percentage is {totalPct.toFixed(2)}% — should equal 100%.
                </div>
              )}

              {msRows.length === 0 && (
                <p className="text-xs text-gray-400 py-2">No milestones yet. Click "Add Milestone".</p>
              )}

              {msRows.map((r, idx) => {
                const amt = round2(totalValueNum * (parseFloat(r.percentage) || 0) / 100)
                return (
                  <div key={r.id} className="border border-gray-200 rounded-lg p-3 space-y-2.5 bg-gray-50/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-indigo-600">
                        Milestone {idx + 1} of {msRows.length}
                      </span>
                      <button onClick={() => removeMs(idx)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Milestone Name</label>
                        <input value={r.name} onChange={e => updateMs(idx, { name: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-300" placeholder="Upfront / Design / Final" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Percentage %</label>
                        <input type="number" min="0" max="100" step="0.01" value={r.percentage} onChange={e => updateMs(idx, { percentage: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-300" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Amount (auto)</label>
                        <div className="px-2 py-1.5 text-xs bg-white border border-gray-100 rounded-md text-indigo-700 font-semibold">{fmtINR(amt)}</div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Expected Date</label>
                        <input type="date" value={r.expectedDate} onChange={e => updateMs(idx, { expectedDate: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-300" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Description</label>
                      <input value={r.description} onChange={e => updateMs(idx, { description: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-300" placeholder="e.g. On design approval" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Notes</label>
                      <input value={r.notes} onChange={e => updateMs(idx, { notes: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-300" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button onClick={onClose} className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200">Cancel</button>
          <button onClick={save} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
            {initial ? 'Update Project' : 'Save Project'}
          </button>
        </div>
      </div>
    </>
  )
}
