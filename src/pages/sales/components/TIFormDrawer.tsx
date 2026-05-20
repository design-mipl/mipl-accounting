import { useState, useEffect, useMemo } from 'react'
import { X, ReceiptText, Link2 } from 'lucide-react'
import clsx from 'clsx'
import type { TaxInvoice, ProformaInvoice, TIDocStatus, ProjectType } from '../../../types/sales'
import { TI_DOC_STATUSES, round2 } from '../../../types/sales'
import { useCustomers } from '../../../contexts/CustomerContext'
import { useSales, newId } from '../../../contexts/SalesContext'
import { FileUpload } from './FileUpload'

type Form = {
  tiNumber: string
  tiDate: string
  linkedPiId: string
  clientId: string
  projectId: string
  milestoneId: string
  baseAmount: string
  gstPercent: string
  amountReceived: string
  tdsPercent: string
  status: TIDocStatus
  fileName?: string
  notes: string
}

function generateTiNumber(existingTis: { tiNumber: string }[]): string {
  const today = new Date()
  const month = today.getMonth() + 1
  const year = today.getFullYear()
  const fy = month >= 4 ? `${year % 100}-${(year + 1) % 100}` : `${(year - 1) % 100}-${year % 100}`
  const count = existingTis.filter(ti => ti.tiNumber.includes(fy)).length + 1
  return `TI/${fy}/${String(count).padStart(3, '0')}`
}

function blankForm(): Form {
  return {
    tiNumber: '', tiDate: new Date().toISOString().slice(0, 10),
    linkedPiId: '', clientId: '', projectId: '', milestoneId: '',
    baseAmount: '', gstPercent: '18', amountReceived: '', tdsPercent: '10',
    status: 'Draft', notes: '',
  }
}

function getStatusFromPayment(amountRcv: number, expReceipt: number): TIDocStatus {
  if (amountRcv === 0) return 'Pending'
  if (amountRcv === expReceipt) return 'Paid'
  if (amountRcv < expReceipt) return 'Shortfall'
  return 'Draft'
}

export function TIFormDrawer({ open, onClose, initial, fromPI }: {
  open: boolean
  onClose: () => void
  initial?: TaxInvoice | null
  fromPI?: ProformaInvoice | null
}) {
  const { pis, tis, projects, milestones, upsertTI } = useSales()
  const { customers } = useCustomers()
  const [form, setForm] = useState<Form>(blankForm())
  const SALES_CUSTOMERS = useMemo(() => {
    return customers
      .filter(c => c.status === 'ACTIVE' || c.id === form.clientId || c.id === initial?.clientId)
      .map(c => ({ id: c.id, name: c.companyName }))
  }, [customers, form.clientId, initial])

  useEffect(() => {
    if (initial) {
      setForm({
        tiNumber: initial.tiNumber, tiDate: initial.tiDate,
        linkedPiId: initial.linkedPiId ?? '',
        clientId: initial.clientId, projectId: initial.projectId ?? '',
        milestoneId: initial.milestoneId ?? '',
        baseAmount: String(initial.baseAmount),
        gstPercent: String(initial.gstPercent),
        amountReceived: String(initial.amountReceived),
        tdsPercent: String(initial.tdsPercent),
        status: initial.status,
        fileName: initial.fileName, notes: initial.notes ?? '',
      })
    } else if (fromPI) {
      applyPI(fromPI)
    } else {
      setForm({ ...blankForm(), tiNumber: generateTiNumber(tis) })
    }
  }, [initial, fromPI, open]) // eslint-disable-line react-hooks/exhaustive-deps

  function applyPI(pi: ProformaInvoice) {
    const expectedReceipt = pi.grossAmount - pi.tdsAmount
    const autoStatus = getStatusFromPayment(pi.amountReceived, expectedReceipt)
    setForm({
      ...blankForm(),
      tiNumber: generateTiNumber(tis),
      linkedPiId: pi.id,
      clientId: pi.clientId,
      projectId: pi.projectId ?? '',
      milestoneId: pi.milestoneId ?? '',
      baseAmount: String(pi.baseAmount),
      gstPercent: String(pi.gstPercent),
      amountReceived: String(pi.amountReceived),
      tdsPercent: String(pi.tdsPercent),
      status: autoStatus,
    })
  }

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function pickPI(piId: string) {
    if (!piId) { set('linkedPiId', ''); return }
    const pi = pis.find(p => p.id === piId)
    if (pi) applyPI(pi)
  }

  const availablePis = useMemo(() => {
    return pis.filter(p => {
      if (initial && initial.linkedPiId === p.id) return true
      if (fromPI && fromPI.id === p.id) return true
      return !tis.some(t => t.linkedPiId === p.id)
    })
  }, [pis, tis, initial, fromPI])

  const selectedPi = useMemo(() => {
    return pis.find(p => p.id === form.linkedPiId)
  }, [pis, form.linkedPiId])

  const clientProjects = useMemo(() => {
    if (!form.clientId) return projects
    return projects.filter(p => p.customerId === form.clientId)
  }, [projects, form.clientId])

  const base = parseFloat(form.baseAmount) || 0
  const gstP = parseFloat(form.gstPercent) || 0
  const tdsP = parseFloat(form.tdsPercent) || 0
  const received = parseFloat(form.amountReceived) || 0
  const gstAmount = round2(base * gstP / 100)
  const grossAmount = round2(base + gstAmount)
  const tdsAmount = round2(base * tdsP / 100)
  const expectedReceipt = round2(grossAmount - tdsAmount)
  const outstanding = round2(expectedReceipt - received)

  function save() {
    const cust = SALES_CUSTOMERS.find(c => c.id === form.clientId)
    const linkedPI = pis.find(p => p.id === form.linkedPiId)
    const proj = projects.find(p => p.id === form.projectId)
    const ms = milestones.find(m => m.id === form.milestoneId)
    if (!cust || !form.tiNumber.trim()) return

    const ti: TaxInvoice = {
      id: initial?.id ?? newId(),
      tiNumber: form.tiNumber.trim(),
      tiDate: form.tiDate,
      linkedPiId: form.linkedPiId || undefined,
      linkedPiNumber: linkedPI?.piNumber,
      clientId: form.clientId,
      clientName: cust.name,
      projectType: (proj?.projectType ?? linkedPI?.projectType ?? '') as ProjectType | '',
      projectId: form.projectId || undefined,
      projectName: proj?.name ?? linkedPI?.projectName,
      milestoneId: form.milestoneId || undefined,
      milestoneLabel: ms ? `Milestone ${ms.number} of ${ms.total} – ${ms.name}` : linkedPI?.milestoneLabel,
      baseAmount: base,
      gstPercent: gstP,
      gstAmount,
      grossAmount,
      amountReceived: received,
      tdsPercent: tdsP,
      tdsAmount,
      outstandingBeyondTds: outstanding,
      status: form.status,
      invoiceSent: false,
      fileName: form.fileName,
      notes: form.notes,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    }
    upsertTI(ti)
    onClose()
  }

  if (!open) return null
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white'
  const roCls = 'w-full px-3 py-2 text-sm bg-gray-50 border border-gray-100 rounded-lg text-gray-600'
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1.5'

  const isLinked = !!form.linkedPiId

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
              <ReceiptText size={15} className="text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{initial ? 'Edit Tax Invoice' : 'New Tax Invoice'}</h2>
              <p className="text-xs text-gray-400">Link a PI, or create directly without one.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>TI Number *</label>
              <input value={form.tiNumber} onChange={e => set('tiNumber', e.target.value)} className={inputCls} placeholder="MIPL/2526/001" />
            </div>
            <div>
              <label className={labelCls}>TI Date</label>
              <input type="date" value={form.tiDate} onChange={e => set('tiDate', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1"><Link2 size={11} /> Linked PI Number</span>
              <span className="text-gray-400 font-normal ml-1">(optional — leave blank for direct tax invoice)</span>
            </label>
            <select value={form.linkedPiId} onChange={e => pickPI(e.target.value)} className={inputCls}>
              <option value="">No linked PI (direct)</option>
              {availablePis.map(p => <option key={p.id} value={p.id}>{p.piNumber}</option>)}
            </select>
            {isLinked && (
              <p className="text-[10px] text-indigo-500 mt-1">Auto-filled from linked PI. Status auto-calculated from payment. You can still override fields below.</p>
            )}
          </div>

          {selectedPi && (
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Linked PI Details</span>
                <span className="text-xs font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100">{selectedPi.piNumber}</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] font-medium">Client</span>
                  <span className="font-semibold text-gray-800">{selectedPi.clientName}</span>
                </div>
                {selectedPi.projectName && (
                  <div>
                    <span className="text-gray-400 block text-[10px] font-medium">Project</span>
                    <span className="font-semibold text-gray-800">{selectedPi.projectName}</span>
                  </div>
                )}
                {selectedPi.milestoneLabel && (
                  <div className="col-span-2">
                    <span className="text-gray-400 block text-[10px] font-medium">Milestone</span>
                    <span className="font-semibold text-gray-800">{selectedPi.milestoneLabel}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Client *</label>
            <select value={form.clientId} onChange={e => setForm(prev => ({ ...prev, clientId: e.target.value, projectId: '', milestoneId: '' }))} className={inputCls} disabled={isLinked}>
              <option value="">Select client</option>
              {SALES_CUSTOMERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Project</label>
              <select value={form.projectId} onChange={e => setForm(prev => ({ ...prev, projectId: e.target.value, milestoneId: '' }))} className={inputCls} disabled={isLinked}>
                <option value="">No project</option>
                {clientProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Milestone</label>
              <select value={form.milestoneId} onChange={e => set('milestoneId', e.target.value)} className={inputCls} disabled={isLinked || !form.projectId}>
                <option value="">{form.projectId ? 'Select milestone' : 'Pick project'}</option>
                {milestones.filter(m => m.projectId === form.projectId).map(m => (
                  <option key={m.id} value={m.id}>Milestone {m.number} of {m.total} – {m.name}</option>
                ))}
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

          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
            <p className="text-xs text-violet-500 font-semibold">Expected Receipt</p>
            <p className="text-xl font-bold text-violet-800 mt-0.5">₹{expectedReceipt.toLocaleString('en-IN')}</p>
          </div>

          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value as TIDocStatus)} className={inputCls}>
              {TI_DOC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Tax Invoice File</label>
            <FileUpload fileName={form.fileName} onChange={n => set('fileName', n)} label="Attach tax invoice document" />
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button onClick={onClose} className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200">Cancel</button>
          <button onClick={save} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
            {initial ? 'Update Tax Invoice' : 'Save Tax Invoice'}
          </button>
        </div>
      </div>
    </>
  )
}
