import { useState, useEffect, useMemo } from 'react'
import { X, FileText } from 'lucide-react'
import clsx from 'clsx'
import type { ProformaInvoice, PIDocStatus, ProjectType } from '../../../types/sales'
import { PI_DOC_STATUSES, calcMilestone, round2 } from '../../../types/sales'
import { SALES_CUSTOMERS } from '../../../data/sales'
import { useSales, newId } from '../../../contexts/SalesContext'
import { FileUpload } from './FileUpload'

type Form = {
  piNumber: string
  piDate: string
  clientId: string
  projectId: string
  milestoneId: string
  baseAmount: string
  gstPercent: string
  amountReceived: string
  tdsPercent: string
  status: PIDocStatus
  fileName?: string
  notes: string
}

function blankForm(): Form {
  return {
    piNumber: '', piDate: new Date().toISOString().slice(0, 10),
    clientId: '', projectId: '', milestoneId: '',
    baseAmount: '', gstPercent: '18', amountReceived: '', tdsPercent: '10',
    status: 'Draft', notes: '',
  }
}

export function PIFormDrawer({ open, onClose, initial, prefill }: {
  open: boolean
  onClose: () => void
  initial?: ProformaInvoice | null
  prefill?: Partial<Form> & { projectType?: ProjectType }
}) {
  const { projects, milestones, upsertPI } = useSales()
  const [form, setForm] = useState<Form>(blankForm())

  useEffect(() => {
    if (initial) {
      setForm({
        piNumber: initial.piNumber, piDate: initial.piDate,
        clientId: initial.clientId, projectId: initial.projectId ?? '',
        milestoneId: initial.milestoneId ?? '',
        baseAmount: String(initial.baseAmount),
        gstPercent: String(initial.gstPercent),
        amountReceived: String(initial.amountReceived),
        tdsPercent: String(initial.tdsPercent),
        status: initial.status,
        fileName: initial.fileName, notes: initial.notes ?? '',
      })
    } else {
      setForm({ ...blankForm(), ...prefill })
    }
  }, [initial, open]) // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  const projectMilestones = useMemo(
    () => milestones.filter(m => m.projectId === form.projectId).sort((a, b) => a.number - b.number),
    [milestones, form.projectId],
  )

  // Auto-fill base/GST/TDS when milestone picked
  function pickMilestone(mId: string) {
    const m = milestones.find(x => x.id === mId)
    const proj = projects.find(p => p.id === form.projectId)
    if (m && proj) {
      const c = calcMilestone(proj.totalValue, m.percentage, proj.gstPercent, proj.tdsPercent)
      setForm(prev => ({
        ...prev,
        milestoneId: mId,
        baseAmount: String(c.baseAmount),
        gstPercent: String(proj.gstPercent),
        tdsPercent: String(proj.tdsPercent),
      }))
    } else {
      set('milestoneId', mId)
    }
  }

  function pickProject(pId: string) {
    const proj = projects.find(p => p.id === pId)
    setForm(prev => ({
      ...prev,
      projectId: pId,
      milestoneId: '',
      clientId: proj ? proj.customerId : prev.clientId,
      gstPercent: proj ? String(proj.gstPercent) : prev.gstPercent,
      tdsPercent: proj ? String(proj.tdsPercent) : prev.tdsPercent,
    }))
  }

  const base = parseFloat(form.baseAmount) || 0
  const gstP = parseFloat(form.gstPercent) || 0
  const tdsP = parseFloat(form.tdsPercent) || 0
  const received = parseFloat(form.amountReceived) || 0
  const gstAmount = round2(base * gstP / 100)
  const grossAmount = round2(base + gstAmount)
  const tdsAmount = round2(base * tdsP / 100)
  const expectedReceipt = round2(grossAmount - tdsAmount)
  const outstanding = round2(expectedReceipt - received)
  const isNew = !initial

  function save() {
    const cust = SALES_CUSTOMERS.find(c => c.id === form.clientId)
    const proj = projects.find(p => p.id === form.projectId)
    const ms = milestones.find(m => m.id === form.milestoneId)
    if (!cust || !form.piNumber.trim()) return

    // When generating a new PI, payment-side fields are not captured here —
    // they get filled later via Receipts. Editing an existing PI keeps its values.
    const amtReceived = isNew ? 0 : received

    const pi: ProformaInvoice = {
      id: initial?.id ?? newId(),
      piNumber: form.piNumber.trim(),
      piDate: form.piDate,
      clientId: form.clientId,
      clientName: cust.name,
      projectType: (proj?.projectType ?? prefill?.projectType ?? '') as ProjectType | '',
      projectId: form.projectId || undefined,
      projectName: proj?.name,
      milestoneId: form.milestoneId || undefined,
      milestoneLabel: ms ? `Milestone ${ms.number} of ${ms.total} – ${ms.name}` : undefined,
      baseAmount: base,
      gstPercent: gstP,
      gstAmount,
      grossAmount,
      amountReceived: amtReceived,
      tdsPercent: tdsP,
      tdsAmount,
      outstandingBeyondTds: round2(expectedReceipt - amtReceived),
      status: form.status,
      piSent: false,
      fileName: isNew ? undefined : form.fileName,
      notes: form.notes,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    }
    upsertPI(pi)
    onClose()
  }

  if (!open) return null
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white'
  const roCls = 'w-full px-3 py-2 text-sm bg-gray-50 border border-gray-100 rounded-lg text-gray-600'
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1.5'

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <FileText size={15} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{initial ? 'Edit Proforma Invoice' : 'New Proforma Invoice'}</h2>
              <p className="text-xs text-gray-400">CA generates the actual PI — track details here.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>PI Number *</label>
              <input value={form.piNumber} onChange={e => set('piNumber', e.target.value)} className={inputCls} placeholder="PI/26-27/001" />
            </div>
            <div>
              <label className={labelCls}>PI Date</label>
              <input type="date" value={form.piDate} onChange={e => set('piDate', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Client *</label>
            <select value={form.clientId} onChange={e => set('clientId', e.target.value)} className={inputCls}>
              <option value="">Select client</option>
              {SALES_CUSTOMERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Project</label>
              <select value={form.projectId} onChange={e => pickProject(e.target.value)} className={inputCls}>
                <option value="">No project (direct)</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Milestone</label>
              <select value={form.milestoneId} onChange={e => pickMilestone(e.target.value)} className={inputCls} disabled={!form.projectId}>
                <option value="">{form.projectId ? 'Select milestone' : 'Pick project first'}</option>
                {projectMilestones.map(m => <option key={m.id} value={m.id}>Milestone {m.number} of {m.total} – {m.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Base Amount (₹)</label>
              <input type="number" min="0" value={form.baseAmount} onChange={e => set('baseAmount', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>GST %</label>
              <input type="number" min="0" value={form.gstPercent} onChange={e => set('gstPercent', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>GST Amount</label>
              <div className={roCls}>₹{gstAmount.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <label className={labelCls}>Gross Amount</label>
              <div className={roCls}>₹{grossAmount.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Auto TDS %</label>
              <input type="number" min="0" value={form.tdsPercent} onChange={e => set('tdsPercent', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Auto TDS Amount</label>
              <div className={roCls}>₹{tdsAmount.toLocaleString('en-IN')}</div>
            </div>
          </div>

          {!isNew && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Amount Received (₹)</label>
                <input type="number" min="0" value={form.amountReceived} onChange={e => set('amountReceived', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Outstanding Beyond TDS</label>
                <div className={clsx(roCls, outstanding > 0 ? 'text-red-600 font-medium' : 'text-emerald-600')}>
                  ₹{outstanding.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          )}

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <p className="text-xs text-indigo-500 font-semibold">Expected Receipt</p>
            <p className="text-xl font-bold text-indigo-800 mt-0.5">₹{expectedReceipt.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-indigo-400 mt-1">Gross ₹{grossAmount.toLocaleString('en-IN')} − TDS ₹{tdsAmount.toLocaleString('en-IN')}</p>
          </div>

          {!isNew && (
            <>
              <div>
                <label className={labelCls}>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value as PIDocStatus)} className={inputCls}>
                  {PI_DOC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>PI File</label>
                <FileUpload fileName={form.fileName} onChange={n => set('fileName', n)} label="Attach PI document" />
              </div>
            </>
          )}

          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button onClick={onClose} className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200">Cancel</button>
          <button onClick={save} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
            {initial ? 'Update PI' : 'Save PI'}
          </button>
        </div>
      </div>
    </>
  )
}
