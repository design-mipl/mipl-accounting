import { useState, useMemo } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import clsx from 'clsx'
import type { Project, Milestone, ProjectType, BillingType, ProjectStatus, AMCFrequency } from '../../../types/sales'
import { PROJECT_TYPES, BILLING_TYPES, round2 } from '../../../types/sales'
import { SALES_CUSTOMERS } from '../../../data/sales'
import { useSales, newId } from '../../../contexts/SalesContext'
import { fmtINR } from '../../../utils/currency'

type Step = 1 | 2 | 3 | 4

type MilestoneRow = {
  id: string
  name: string
  percentage: string
}

type FormData = {
  // Step 1
  customerId: string
  projectType: ProjectType
  // Step 2
  billingType: BillingType
  totalValue: string
  startDate: string
  endDate: string
  gstPercent: string
  tdsPercent: string
  // Step 3
  milestones: MilestoneRow[]
  // Step 4
  notes: string
}

function blankForm(): FormData {
  return {
    customerId: '',
    projectType: 'Website',
    billingType: 'Milestone Based',
    totalValue: '',
    startDate: '',
    endDate: '',
    gstPercent: '18',
    tdsPercent: '10',
    milestones: [],
    notes: '',
  }
}

const STEPS: { num: Step; title: string; description: string }[] = [
  { num: 1, title: 'Customer', description: 'Select customer and project type' },
  { num: 2, title: 'Details', description: 'Set billing, value, dates, and tax details' },
  { num: 3, title: 'Milestones', description: 'Define milestones (Milestone Based only)' },
  { num: 4, title: 'Review', description: 'Review and confirm' },
]

export function ProjectFormModal({ open, onClose }: {
  open: boolean
  onClose: () => void
}) {
  const { upsertProject, setMilestonesForProject } = useSales()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormData>(blankForm())

  const selectedCustomer = useMemo(
    () => SALES_CUSTOMERS.find(c => c.id === form.customerId),
    [form.customerId]
  )

  const totalPercentage = useMemo(
    () => form.milestones.reduce((s, m) => s + (parseFloat(m.percentage) || 0), 0),
    [form.milestones]
  )

  const percentageWarning = form.billingType === 'Milestone Based' && Math.abs(totalPercentage - 100) > 0.01

  function updateForm<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function addMilestone() {
    const nextNum = form.milestones.length + 1
    updateForm('milestones', [
      ...form.milestones,
      { id: newId(), name: `Milestone ${nextNum}`, percentage: '' },
    ])
  }

  function removeMilestone(id: string) {
    updateForm('milestones', form.milestones.filter(m => m.id !== id))
  }

  function updateMilestone(id: string, updates: Partial<MilestoneRow>) {
    updateForm('milestones', form.milestones.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  function handleCreate() {
    if (!form.customerId || !form.billingType || !form.totalValue || !form.startDate || !form.endDate) {
      alert('Please fill in all required fields')
      return
    }

    if (form.billingType === 'Milestone Based' && percentageWarning) {
      alert('Milestone percentages must sum to 100%')
      return
    }

    const customer = selectedCustomer
    if (!customer) return

    const projectId = newId()
    const project: Project = {
      id: projectId,
      customerId: form.customerId,
      customerName: customer.name,
      projectType: form.projectType,
      billingType: form.billingType,
      totalValue: parseFloat(form.totalValue) || 0,
      startDate: form.startDate,
      endDate: form.endDate,
      gstPercent: parseFloat(form.gstPercent) || 18,
      tdsPercent: parseFloat(form.tdsPercent) || 10,
      projectStatus: 'Upcoming',
      amcFrequency: form.billingType === 'AMC' ? 'Monthly' : undefined,
      notes: form.notes,
      createdAt: new Date().toISOString(),
    }

    upsertProject(project)

    // Create milestones based on billing type
    const milestones: Milestone[] = []
    if (form.billingType === 'Milestone Based') {
      form.milestones.forEach((m, idx) => {
        milestones.push({
          id: newId(),
          projectId,
          number: idx + 1,
          total: form.milestones.length,
          name: m.name,
          percentage: parseFloat(m.percentage) || 0,
          piStatus: 'Not Raised',
          tiStatus: 'Not Created',
          paymentStatus: 'Pending',
          milestoneStatus: 'Not Started',
        })
      })
    } else if (form.billingType === 'One-time') {
      milestones.push({
        id: newId(),
        projectId,
        number: 1,
        total: 1,
        name: 'One-time Payment',
        percentage: 100,
        piStatus: 'Not Raised',
        tiStatus: 'Not Created',
        paymentStatus: 'Pending',
        milestoneStatus: 'Not Started',
      })
    }

    if (milestones.length > 0) {
      setMilestonesForProject(projectId, milestones)
    }

    handleClose()
  }

  function handleClose() {
    setStep(1)
    setForm(blankForm())
    onClose()
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">New Project</h2>
              <p className="text-xs text-gray-500 mt-0.5">Step {step} of 4 - {STEPS[step - 1].description}</p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex gap-2 px-6 py-3 border-b border-gray-100 shrink-0">
            {STEPS.map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1">
                <div
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                    step > s.num ? 'bg-indigo-600 text-white' : step === s.num ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-600' : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {s.num}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={clsx('flex-1 h-1 mx-2 rounded-full transition-colors', step > s.num ? 'bg-indigo-600' : 'bg-gray-200')} />
                )}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Customer <span className="text-red-500">*</span></label>
                  <select
                    value={form.customerId}
                    onChange={e => updateForm('customerId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                  >
                    <option value="">Select a customer</option>
                    {SALES_CUSTOMERS.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Project Type <span className="text-red-500">*</span></label>
                  <select
                    value={form.projectType}
                    onChange={e => updateForm('projectType', e.target.value as ProjectType)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                  >
                    {PROJECT_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Billing Type <span className="text-red-500">*</span></label>
                    <select
                      value={form.billingType}
                      onChange={e => updateForm('billingType', e.target.value as BillingType)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                    >
                      {BILLING_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Total Value (₹) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      value={form.totalValue}
                      onChange={e => updateForm('totalValue', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Start Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={e => updateForm('startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">End Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={e => updateForm('endDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">GST %</label>
                    <input
                      type="number"
                      value={form.gstPercent}
                      onChange={e => updateForm('gstPercent', e.target.value)}
                      placeholder="18"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">TDS %</label>
                    <input
                      type="number"
                      value={form.tdsPercent}
                      onChange={e => updateForm('tdsPercent', e.target.value)}
                      placeholder="10"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && form.billingType === 'Milestone Based' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Milestones</h3>
                  <button
                    onClick={addMilestone}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    Add Milestone
                  </button>
                </div>

                {percentageWarning && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    ⚠️ Milestone percentages must sum to 100% (currently {totalPercentage.toFixed(2)}%)
                  </div>
                )}

                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {form.milestones.map((m, idx) => (
                    <div key={m.id} className="p-3 border border-gray-200 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">M{idx + 1}</span>
                        <input
                          type="text"
                          value={m.name}
                          onChange={e => updateMilestone(m.id, { name: e.target.value })}
                          placeholder="Milestone name"
                          className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                        />
                        <button
                          onClick={() => removeMilestone(m.id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Percentage</label>
                        <input
                          type="number"
                          value={m.percentage}
                          onChange={e => updateMilestone(m.id, { percentage: e.target.value })}
                          placeholder="0"
                          step="0.01"
                          min="0"
                          max="100"
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && form.billingType !== 'Milestone Based' && (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-600">{form.billingType === 'One-time' ? 'One-time projects create a single 100% milestone automatically.' : 'Billing cycle configuration is handled separately.'}</p>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Customer</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedCustomer?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Project Type</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{form.projectType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Billing Type</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{form.billingType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Total Value</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{fmtINR(parseFloat(form.totalValue) || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Dates</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{form.startDate} to {form.endDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Tax %</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">GST {form.gstPercent}% / TDS {form.tdsPercent}%</p>
                  </div>
                </div>

                {form.billingType === 'Milestone Based' && form.milestones.length > 0 && (
                  <div className="py-4 border-b border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Milestones ({form.milestones.length})</p>
                    <div className="space-y-2">
                      {form.milestones.map((m, idx) => (
                        <div key={m.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">M{idx + 1} – {m.name}</span>
                          <span className="font-medium text-gray-900">{m.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {form.notes && (
                  <div className="py-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Notes</p>
                    <p className="text-sm text-gray-700">{form.notes}</p>
                  </div>
                )}

                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800">
                  ✓ Clicking Create will set the project status to "Upcoming" and auto-generate {form.billingType === 'Milestone Based' ? 'milestones' : 'a milestone'}.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
            <button
              onClick={() => setStep((s) => (s > 1 ? (s - 1) as Step : s))}
              disabled={step === 1}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
              Back
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              {step < 4 ? (
                <button
                  onClick={() => setStep((s) => (s < 4 ? (s + 1) as Step : s))}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Create Project
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
