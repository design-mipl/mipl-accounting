import { X, CreditCard, RotateCcw, Clock } from 'lucide-react'
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import clsx from 'clsx'
import type { Payment, ExpenseType, PartyType, PaymentStatus, DeductionType } from '../../../types/payment'
import { EXPENSE_TYPES, PARTY_TYPES, PAYMENT_STATUSES, DEDUCTION_TYPES } from '../../../types/payment'

type FormTab = 'basic' | 'amount'

const TABS: { key: FormTab; label: string }[] = [
  { key: 'basic', label: 'Basic Details' },
  { key: 'amount', label: 'Amount & Tax' },
]

type FormData = {
  expenseDate: string
  expenseType: ExpenseType
  partyType: PartyType
  partyName: string
  partyNameInput: string
  notes: string
  recurring: boolean
  baseAmount: string
  gstApplicable: boolean
  gstPercent: number
  deductionType: DeductionType
  deductionPercent: string  // for TDS / Other — percentage
  ptAmount: string          // for PT — fixed rupee amount
  paidAmount: string
  paymentStatus: PaymentStatus
}

function compute(form: FormData) {
  const base = parseFloat(form.baseAmount) || 0
  const gstPct = form.gstApplicable ? form.gstPercent : 0
  const gstAmt = Math.round(base * gstPct) / 100

  let dedAmt = 0
  if (form.deductionType === 'PT') {
    dedAmt = parseFloat(form.ptAmount) || 0
  } else if (form.deductionType !== 'None') {
    dedAmt = Math.round(base * (parseFloat(form.deductionPercent) || 0)) / 100
  }

  const net = parseFloat((base + gstAmt - dedAmt).toFixed(2))
  const paid = parseFloat(form.paidAmount) || 0
  const bal = parseFloat(Math.max(0, net - paid).toFixed(2))
  const autoStatus: PaymentStatus = paid === 0 ? 'Pending' : paid >= net ? 'Paid' : 'Part Paid'
  return { base, gstAmt, dedAmt, net, paid, bal, autoStatus }
}

export type PaymentFormRef = { handleSave: () => void }

type DropdownVendor = { id: string; vendorName: string; companyName: string | null }
type DropdownEmployee = { id: string; name: string }

const PaymentForm = forwardRef<PaymentFormRef, {
  onSave?: (p: Payment) => void
  onClose?: () => void
  initialPayment?: Payment | null
  defaultMonth: string
  mode?: 'create' | 'edit'
}>(function PaymentForm({ onSave, initialPayment, defaultMonth, mode }, ref) {
  const [tab, setTab] = useState<FormTab>('basic')
  const [vendors, setVendors] = useState<DropdownVendor[]>([])
  const [employees, setEmployees] = useState<DropdownEmployee[]>([])

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    fetch('/api/vendors/dropdown', { headers })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setVendors(res.data)
        }
      })
      .catch(err => console.error('Error fetching vendors dropdown:', err))

    fetch('/api/employees/dropdown', { headers })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setEmployees(res.data)
        }
      })
      .catch(err => console.error('Error fetching employees dropdown:', err))
  }, [])

  const blank: FormData = {
    expenseDate: `${defaultMonth}-01`,
    expenseType: 'Other',
    partyType: 'Vendor',
    partyName: '',
    partyNameInput: '',
    notes: '',
    recurring: false,
    baseAmount: '',
    gstApplicable: false,
    gstPercent: 18,
    deductionType: 'None',
    deductionPercent: '',
    ptAmount: '',
    paidAmount: '',
    paymentStatus: 'Pending',
  }

  const [form, setForm] = useState<FormData>(blank)

  useEffect(() => {
    if (initialPayment) {
      setForm({
        expenseDate: initialPayment.expenseDate,
        expenseType: initialPayment.expenseType,
        partyType: initialPayment.partyType,
        partyName: initialPayment.partyType === 'Vendor' ? (initialPayment.vendorId || '') : (initialPayment.partyType === 'Employee' ? (initialPayment.employeeId || '') : ''),
        partyNameInput: (initialPayment.partyType === 'Household' || initialPayment.partyType === 'Other') ? initialPayment.partyName : '',
        notes: initialPayment.notes,
        recurring: initialPayment.recurring ?? false,
        baseAmount: String(initialPayment.baseAmount),
        gstApplicable: initialPayment.gstApplicable,
        gstPercent: initialPayment.gstPercent || 18,
        deductionType: initialPayment.deductionType,
        deductionPercent: initialPayment.deductionType === 'PT' ? '' : (initialPayment.deductionPercent ? String(initialPayment.deductionPercent) : ''),
        ptAmount: initialPayment.deductionType === 'PT' ? String(initialPayment.deductionPercent) : '',
        paidAmount: String(initialPayment.paidAmount),
        paymentStatus: initialPayment.paymentStatus,
      })
    } else {
      setForm({ ...blank, expenseDate: `${defaultMonth}-01` })
    }
  }, [initialPayment, defaultMonth])

  // Auto-update payment status as amounts change
  useEffect(() => {
    const { autoStatus } = compute(form)
    setForm(prev => ({ ...prev, paymentStatus: autoStatus }))
  }, [form.paidAmount, form.baseAmount, form.gstApplicable, form.gstPercent, form.deductionType, form.deductionPercent, form.ptAmount])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    const { base, gstAmt, dedAmt, net, paid, bal } = compute(form)
    const month = form.expenseDate.substring(0, 7)

    if (form.partyType === 'Vendor' && !form.partyName) {
      alert('Please select a vendor')
      return
    }
    if (form.partyType === 'Employee' && !form.partyName) {
      alert('Please select an employee')
      return
    }
    if ((form.partyType === 'Household' || form.partyType === 'Other') && !form.partyNameInput.trim()) {
      alert('Please enter a party name')
      return
    }
    if (!form.recurring && (!form.baseAmount || parseFloat(form.baseAmount) <= 0)) {
      alert('Please enter a valid base amount')
      return
    }

    const vendorId = form.partyType === 'Vendor' ? form.partyName : undefined
    const employeeId = form.partyType === 'Employee' ? form.partyName : undefined

    let partyName = ''
    if (form.partyType === 'Vendor') {
      const v = vendors.find(x => x.id === vendorId)
      partyName = v ? (v.companyName ? `${v.companyName} (${v.vendorName})` : v.vendorName) : ''
    } else if (form.partyType === 'Employee') {
      const e = employees.find(x => x.id === employeeId)
      partyName = e ? e.name : ''
    } else {
      partyName = form.partyNameInput
    }

    const payment: Payment = {
      id: mode === 'edit' ? (initialPayment?.id || '') : '',
      expenseDate: form.expenseDate,
      month,
      expenseType: form.expenseType,
      partyType: form.partyType,
      partyName,
      vendorId,
      employeeId,
      notes: form.notes,
      recurring: form.recurring,
      baseAmount: base,
      gstApplicable: form.gstApplicable,
      gstPercent: form.gstApplicable ? form.gstPercent : 0,
      gstAmount: gstAmt,
      deductionType: form.deductionType,
      deductionPercent: form.deductionType === 'PT' ? (parseFloat(form.ptAmount) || 0) : (form.deductionType !== 'None' ? (parseFloat(form.deductionPercent) || 0) : 0),
      deductionAmount: dedAmt,
      netPayable: net,
      paidAmount: paid,
      paymentStatus: form.paymentStatus,
      balanceAmount: bal,
      createdAt: initialPayment?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onSave?.(payment)
  }

  useImperativeHandle(ref, () => ({ handleSave }))

  const { gstAmt, dedAmt, net, bal, autoStatus } = compute(form)
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white'
  const readonlyCls = 'w-full px-3 py-2 text-sm bg-gray-50 border border-gray-100 rounded-lg text-gray-600 select-none'
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1.5'

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-5 shrink-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'px-5 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
              tab === t.key ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* ── BASIC DETAILS ── */}
        {tab === 'basic' && (
          <>
            {/* One Time / Recurring */}
            <div>
              <label className={labelCls}>Payment Frequency</label>
              <div className="flex gap-2">
                <button
                  onClick={() => set('recurring', false)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                    !form.recurring ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300',
                  )}
                >
                  <Clock size={12} />
                  One Time
                </button>
                <button
                  onClick={() => set('recurring', true)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                    form.recurring ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300',
                  )}
                >
                  <RotateCcw size={12} />
                  Recurring
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Expense Date *</label>
                <input type="date" value={form.expenseDate} onChange={e => set('expenseDate', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Expense Type *</label>
                <select value={form.expenseType} onChange={e => set('expenseType', e.target.value as ExpenseType)} className={inputCls}>
                  {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Party Type *</label>
              <div className="flex gap-2">
                {PARTY_TYPES.map(pt => (
                  <button
                    key={pt}
                    onClick={() => { set('partyType', pt); set('partyName', ''); set('partyNameInput', '') }}
                    className={clsx(
                      'flex-1 px-2 py-2 rounded-lg text-xs font-medium border transition-colors',
                      form.partyType === pt ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300',
                    )}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Party Name *</label>
              {form.partyType === 'Vendor' ? (
                <select value={form.partyName} onChange={e => set('partyName', e.target.value)} className={inputCls}>
                  <option value="">Select vendor</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.companyName ? `${v.companyName} (${v.vendorName})` : v.vendorName}
                    </option>
                  ))}
                </select>
              ) : form.partyType === 'Employee' ? (
                <select value={form.partyName} onChange={e => set('partyName', e.target.value)} className={inputCls}>
                  <option value="">Select employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.partyNameInput}
                  onChange={e => set('partyNameInput', e.target.value)}
                  placeholder="Enter party name"
                  className={inputCls}
                />
              )}
            </div>

            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={2}
                placeholder="Add any notes or remarks..."
                className={`${inputCls} resize-none`}
              />
            </div>
          </>
        )}

        {/* ── AMOUNT & TAX ── */}
        {tab === 'amount' && (
          <>
            <div>
              <label className={labelCls}>Base Amount{!form.recurring && ' *'}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                <input
                  type="number"
                  min="0"
                  value={form.baseAmount}
                  onChange={e => set('baseAmount', e.target.value)}
                  placeholder="0"
                  className={`${inputCls} pl-7`}
                />
              </div>
            </div>

            {/* GST */}
            <div>
              <label className={labelCls}>GST Applicable</label>
              <div className="flex gap-2">
                {(['Yes', 'No'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => set('gstApplicable', opt === 'Yes')}
                    className={clsx(
                      'flex-1 px-4 py-2 rounded-lg text-xs font-medium border transition-colors',
                      (opt === 'Yes') === form.gstApplicable ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-600',
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {form.gstApplicable && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>GST %</label>
                  <select value={form.gstPercent} onChange={e => set('gstPercent', Number(e.target.value))} className={inputCls}>
                    {[0, 5, 12, 18, 28].map(p => <option key={p} value={p}>{p}%</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>GST Amount</label>
                  <div className={readonlyCls}>₹{gstAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            )}

            {/* Deduction */}
            <div className="border-t border-gray-100 pt-4">
              <label className={labelCls}>Deduction Type</label>
              <select
                value={form.deductionType}
                onChange={e => { set('deductionType', e.target.value as DeductionType); set('deductionPercent', ''); set('ptAmount', '') }}
                className={inputCls}
              >
                {DEDUCTION_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {form.deductionType === 'PT' && (
              <div>
                <label className={labelCls}>PT Amount (Fixed ₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={form.ptAmount}
                    onChange={e => set('ptAmount', e.target.value)}
                    placeholder="200"
                    className={`${inputCls} pl-7`}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Enter fixed professional tax in rupees (e.g. ₹200)</p>
              </div>
            )}

            {form.deductionType !== 'None' && form.deductionType !== 'PT' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Deduction % ({form.deductionType})</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.deductionPercent}
                      onChange={e => set('deductionPercent', e.target.value)}
                      placeholder="0"
                      className={`${inputCls} pr-7`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Deduction Amount</label>
                  <div className={readonlyCls}>₹{dedAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            )}

            {form.deductionType === 'PT' && (
              <div>
                <label className={labelCls}>Deduction Amount</label>
                <div className={readonlyCls}>₹{dedAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
              </div>
            )}

            {/* Net Payable */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="text-xs text-indigo-500 font-semibold mb-0.5">Net Payable</p>
              <p className="text-2xl font-bold text-indigo-800">₹{net.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              {net > 0 && (
                <p className="text-[10px] text-indigo-400 mt-1">
                  ₹{(parseFloat(form.baseAmount) || 0).toLocaleString('en-IN')} base
                  {gstAmt > 0 && ` + ₹${gstAmt.toLocaleString('en-IN')} GST`}
                  {dedAmt > 0 && ` − ₹${dedAmt.toLocaleString('en-IN')} deduction`}
                </p>
              )}
            </div>

            {/* Paid Amount — quick entry at the bottom */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment (optional)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Paid Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={form.paidAmount}
                      onChange={e => set('paidAmount', e.target.value)}
                      placeholder="0"
                      className={`${inputCls} pl-7`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Balance</label>
                  <div className={clsx(readonlyCls, bal > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600')}>
                    ₹{bal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <div>
                <label className={labelCls}>Payment Status</label>
                <select value={form.paymentStatus} onChange={e => set('paymentStatus', e.target.value as PaymentStatus)} className={inputCls}>
                  {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {form.paymentStatus !== autoStatus && (
                  <p className="text-[10px] text-amber-600 mt-1">Auto-suggested: {autoStatus}</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
})

export default function PaymentFormDrawer({
  open, onClose, onSave, initialPayment, defaultMonth, mode,
}: {
  open: boolean
  onClose: () => void
  onSave?: (p: Payment) => void
  initialPayment?: Payment | null
  defaultMonth: string
  mode?: 'create' | 'edit'
}) {
  const formRef = useRef<PaymentFormRef>(null)
  const isEdit = mode === 'edit' || (!mode && !!initialPayment?.id)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <CreditCard size={15} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{isEdit ? 'Edit Payment' : 'Add Payment'}</h2>
              <p className="text-xs text-gray-400">{isEdit ? 'Update payment entry' : 'Record a new payment'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <PaymentForm ref={formRef} onSave={onSave} onClose={onClose} initialPayment={initialPayment} defaultMonth={defaultMonth} mode={mode || (initialPayment?.id ? 'edit' : 'create')} />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button onClick={onClose} className="inline-flex items-center px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={() => formRef.current?.handleSave()} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
            {isEdit ? 'Update Payment' : 'Save Payment'}
          </button>
        </div>
      </div>
    </>
  )
}
