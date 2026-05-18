import { Eye, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'
import type { Payment, PaymentStatus } from '../../../types/payment'
import { PAYMENT_STATUSES } from '../../../types/payment'

const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 })

type Props = {
  payments: Payment[]
  isGlobalMode?: boolean
  onView: (p: Payment) => void
  onEdit: (p: Payment) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Payment>) => void
}

const statusSelectCls: Record<PaymentStatus, string> = {
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  'Part Paid': 'bg-amber-50 text-amber-700 border-amber-300',
  Pending: 'bg-red-50 text-red-600 border-red-300',
}

function PaymentRow({ p, isGlobalMode, onView, onEdit, onDelete, onUpdate }: {
  p: Payment
  isGlobalMode?: boolean
  onView: (p: Payment) => void
  onEdit: (p: Payment) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Payment>) => void
}) {
  const [localPaid, setLocalPaid] = useState(String(p.paidAmount))

  useEffect(() => { setLocalPaid(String(p.paidAmount)) }, [p.paidAmount])

  function commitPaid(val: string) {
    const paid = parseFloat(val) || 0
    const bal = parseFloat(Math.max(0, p.netPayable - paid).toFixed(2))
    const autoStatus: PaymentStatus = paid === 0 ? 'Pending' : paid >= p.netPayable ? 'Paid' : 'Part Paid'
    onUpdate(p.id, { paidAmount: paid, balanceAmount: bal, paymentStatus: autoStatus })
  }

  const td = 'py-2 pr-3 text-xs text-gray-700 align-middle'
  const tdR = td + ' text-right'

  return (
    <tr className="group hover:bg-gray-50/60 transition-colors border-b border-gray-50">
      <td className={`${td} pl-2 text-gray-500 whitespace-nowrap`}>
        {isGlobalMode
          ? new Date(p.expenseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
          : `${p.expenseDate.slice(8)}/${p.expenseDate.slice(5, 7)}`}
      </td>
      <td className={`${td} text-gray-500`}>{p.partyType}</td>
      <td className={td}>
        <div className="flex items-center gap-1">
          {p.recurring && <span title="Recurring" className="inline-flex"><RotateCcw size={9} className="text-indigo-400 shrink-0" /></span>}
          <span className="font-medium text-gray-900 truncate max-w-[120px]" title={p.partyName}>{p.partyName}</span>
        </div>
      </td>
      <td className={tdR}>₹{fmt(p.baseAmount)}</td>
      <td className={`${tdR} text-violet-700`}>{p.gstAmount > 0 ? `₹${fmt(p.gstAmount)}` : <span className="text-gray-300">—</span>}</td>
      <td className={`${tdR} text-orange-700`}>{p.deductionAmount > 0 ? `₹${fmt(p.deductionAmount)}` : <span className="text-gray-300">—</span>}</td>
      <td className={`${tdR} font-semibold text-indigo-700`}>₹{fmt(p.netPayable)}</td>

      {/* Inline editable paid amount */}
      <td className="py-1.5 pr-3 align-middle">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">₹</span>
          <input
            type="number"
            min="0"
            value={localPaid}
            onChange={e => setLocalPaid(e.target.value)}
            onBlur={e => commitPaid(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitPaid((e.target as HTMLInputElement).value) }}
            className="w-[88px] pl-5 pr-2 py-1 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400 outline-none bg-white text-right text-emerald-700 font-medium"
          />
        </div>
      </td>

      <td className={clsx(tdR, 'font-semibold', p.balanceAmount > 0 ? 'text-red-600' : 'text-gray-300')}>
        {p.balanceAmount > 0 ? `₹${fmt(p.balanceAmount)}` : '—'}
      </td>

      {/* Status dropdown */}
      <td className="py-1.5 pr-3 align-middle">
        <select
          value={p.paymentStatus}
          onChange={e => onUpdate(p.id, { paymentStatus: e.target.value as PaymentStatus })}
          className={clsx(
            'text-[11px] px-2 py-1 rounded border font-medium outline-none focus:ring-1 focus:ring-indigo-200 cursor-pointer',
            statusSelectCls[p.paymentStatus],
          )}
        >
          {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>

      <td className={`${td} max-w-[100px]`}>
        {p.notes
          ? <span className="truncate block text-gray-500 text-[11px]" title={p.notes}>{p.notes}</span>
          : <span className="text-gray-300">—</span>}
      </td>

      <td className="py-1.5 pr-2 text-right align-middle">
        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onView(p)} title="View" className="p-1.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors">
            <Eye size={13} />
          </button>
          <button onClick={() => onEdit(p)} title="Edit" className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(p.id)} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function PaymentTable({ payments, isGlobalMode, onView, onEdit, onDelete, onUpdate }: Props) {
  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-gray-500">No payments found for this month</p>
        <p className="text-xs text-gray-400 mt-1">Add a payment or adjust your filters.</p>
      </div>
    )
  }

  const totBase = payments.reduce((s, p) => s + p.baseAmount, 0)
  const totGst = payments.reduce((s, p) => s + p.gstAmount, 0)
  const totDed = payments.reduce((s, p) => s + p.deductionAmount, 0)
  const totNet = payments.reduce((s, p) => s + p.netPayable, 0)
  const totPaid = payments.reduce((s, p) => s + p.paidAmount, 0)
  const totBal = payments.reduce((s, p) => s + p.balanceAmount, 0)

  const th = 'text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2.5 pr-3 whitespace-nowrap'

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: '1050px' }}>
        <thead>
          <tr className="border-b border-gray-100">
            <th className={`${th} pl-2`} style={{ width: '70px' }}>Date</th>
            <th className={th} style={{ width: '75px' }}>Party Type</th>
            <th className={th} style={{ width: '140px' }}>Party Name</th>
            <th className={`${th} text-right`} style={{ width: '85px' }}>Base</th>
            <th className={`${th} text-right`} style={{ width: '80px' }}>GST</th>
            <th className={`${th} text-right`} style={{ width: '80px' }}>Ded. Amt</th>
            <th className={`${th} text-right`} style={{ width: '95px' }}>Net Payable</th>
            <th className={`${th} text-right`} style={{ width: '95px' }}>Paid Amt</th>
            <th className={`${th} text-right`} style={{ width: '80px' }}>Balance</th>
            <th className={th} style={{ width: '105px' }}>Status</th>
            <th className={th} style={{ width: '100px' }}>Notes</th>
            <th className="text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2.5 pr-2" style={{ width: '80px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <PaymentRow
              key={p.id}
              p={p}
              isGlobalMode={isGlobalMode}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 bg-gray-50">
            <td className="py-2.5 pl-2 pr-3 text-xs font-bold text-gray-600" colSpan={3}>
              TOTALS · {payments.length} entries
            </td>
            <td className="py-2.5 pr-3 text-xs font-bold text-gray-900 text-right">₹{fmt(totBase)}</td>
            <td className="py-2.5 pr-3 text-xs font-bold text-violet-700 text-right">₹{fmt(totGst)}</td>
            <td className="py-2.5 pr-3 text-xs font-bold text-orange-700 text-right">₹{fmt(totDed)}</td>
            <td className="py-2.5 pr-3 text-xs font-bold text-indigo-700 text-right">₹{fmt(totNet)}</td>
            <td className="py-2.5 pr-3 text-xs font-bold text-emerald-700 text-right">₹{fmt(totPaid)}</td>
            <td className={`py-2.5 pr-3 text-xs font-bold text-right ${totBal > 0 ? 'text-red-600' : 'text-gray-300'}`}>
              {totBal > 0 ? `₹${fmt(totBal)}` : '—'}
            </td>
            <td colSpan={3} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
