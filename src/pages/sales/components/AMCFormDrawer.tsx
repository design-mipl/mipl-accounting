import { useState, useEffect } from 'react'
import { X, Repeat } from 'lucide-react'
import type { AMC, AMCFrequency, AMCStatus } from '../../../types/sales'
import { AMC_FREQUENCIES, AMC_STATUSES } from '../../../types/sales'
import { SALES_CUSTOMERS } from '../../../data/sales'
import { useSales, newId } from '../../../contexts/SalesContext'

type Form = {
  customerId: string
  name: string
  startDate: string
  endDate: string
  frequency: AMCFrequency
  baseAmount: string
  gstPercent: string
  tdsPercent: string
  nextBillingDate: string
  status: AMCStatus
  notes: string
}

const blank: Form = {
  customerId: '', name: '', startDate: '', endDate: '',
  frequency: 'Monthly', baseAmount: '', gstPercent: '18', tdsPercent: '10',
  nextBillingDate: '', status: 'Active', notes: '',
}

export function AMCFormDrawer({ open, onClose, initial }: {
  open: boolean
  onClose: () => void
  initial?: AMC | null
}) {
  const { upsertAMC } = useSales()
  const [form, setForm] = useState<Form>(blank)

  useEffect(() => {
    if (initial) {
      setForm({
        customerId: initial.customerId, name: initial.name,
        startDate: initial.startDate, endDate: initial.endDate,
        frequency: initial.frequency,
        baseAmount: String(initial.baseAmount),
        gstPercent: String(initial.gstPercent),
        tdsPercent: String(initial.tdsPercent),
        nextBillingDate: initial.nextBillingDate,
        status: initial.status,
        notes: initial.notes ?? '',
      })
    } else setForm(blank)
  }, [initial, open])

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function save() {
    const cust = SALES_CUSTOMERS.find(c => c.id === form.customerId)
    if (!cust || !form.name.trim()) return
    const amc: AMC = {
      id: initial?.id ?? newId(),
      customerId: form.customerId,
      customerName: cust.name,
      name: form.name.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      frequency: form.frequency,
      baseAmount: parseFloat(form.baseAmount) || 0,
      gstPercent: parseFloat(form.gstPercent) || 0,
      tdsPercent: parseFloat(form.tdsPercent) || 0,
      nextBillingDate: form.nextBillingDate,
      status: form.status,
      notes: form.notes,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    }
    upsertAMC(amc)
    onClose()
  }

  if (!open) return null
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white'
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1.5'

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Repeat size={15} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{initial ? 'Edit AMC' : 'New AMC'}</h2>
              <p className="text-xs text-gray-400">{initial ? 'Update AMC contract' : 'Annual Maintenance Contract'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className={labelCls}>Customer *</label>
            <select value={form.customerId} onChange={e => set('customerId', e.target.value)} className={inputCls}>
              <option value="">Select customer</option>
              {SALES_CUSTOMERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>AMC Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="e.g. Website Maintenance AMC" />
          </div>
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
              <select value={form.frequency} onChange={e => set('frequency', e.target.value as AMCFrequency)} className={inputCls}>
                {AMC_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value as AMCStatus)} className={inputCls}>
                {AMC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Base Amount per cycle (₹)</label>
            <input type="number" min="0" value={form.baseAmount} onChange={e => set('baseAmount', e.target.value)} className={inputCls} placeholder="50000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>GST %</label>
              <input type="number" min="0" max="100" value={form.gstPercent} onChange={e => set('gstPercent', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>TDS %</label>
              <input type="number" min="0" max="100" value={form.tdsPercent} onChange={e => set('tdsPercent', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Next Billing Date</label>
            <input type="date" value={form.nextBillingDate} onChange={e => set('nextBillingDate', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button onClick={onClose} className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200">Cancel</button>
          <button onClick={save} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
            {initial ? 'Update AMC' : 'Save AMC'}
          </button>
        </div>
      </div>
    </>
  )
}
