import { useState } from 'react'
import { X, CreditCard, RotateCcw, Clock } from 'lucide-react'
import clsx from 'clsx'
import type { Payment } from '../../../types/payment'

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

type DetailTab = 'basic' | 'amounts' | 'payment'

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'basic', label: 'Basic Info' },
  { key: 'amounts', label: 'Amounts' },
  { key: 'payment', label: 'Payment' },
]

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  )
}

export default function PaymentDetailModal({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
  const [tab, setTab] = useState<DetailTab>('basic')

  if (!payment) return null

  const statusStyle = {
    Paid: 'bg-emerald-50 text-emerald-700',
    'Part Paid': 'bg-amber-50 text-amber-700',
    Pending: 'bg-red-50 text-red-600',
  }[payment.paymentStatus]

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[460px] bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <CreditCard size={15} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{payment.partyName}</h2>
              <p className="text-xs text-gray-400">{payment.expenseType} · {payment.expenseDate}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 shrink-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors',
                tab === t.key ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-700',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 px-5 py-4 overflow-y-auto">

          {/* ── BASIC INFO ── */}
          {tab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Row label="Expense Date" value={payment.expenseDate} />
                <Row label="Month" value={new Date(payment.month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Row label="Expense Type" value={
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                    {payment.expenseType}
                  </span>
                } />
                <Row label="Party Type" value={payment.partyType} />
              </div>
              <Row label="Party Name" value={<span className="font-medium">{payment.partyName}</span>} />
              <Row label="Frequency" value={
                <span className={clsx(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
                  payment.recurring ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600',
                )}>
                  {payment.recurring ? <RotateCcw size={11} /> : <Clock size={11} />}
                  {payment.recurring ? 'Recurring' : 'One Time'}
                </span>
              } />
              {payment.notes && <Row label="Notes" value={payment.notes} />}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <Row label="Created" value={new Date(payment.createdAt).toLocaleDateString('en-IN')} />
                {payment.updatedAt && <Row label="Last Updated" value={new Date(payment.updatedAt).toLocaleDateString('en-IN')} />}
              </div>
            </div>
          )}

          {/* ── AMOUNTS ── */}
          {tab === 'amounts' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Row label="Base Amount" value={<span className="font-semibold">{fmt(payment.baseAmount)}</span>} />
                <Row label="GST Applicable" value={payment.gstApplicable ? 'Yes' : 'No'} />
              </div>

              {payment.gstApplicable && (
                <div className="grid grid-cols-2 gap-4">
                  <Row label="GST %" value={`${payment.gstPercent}%`} />
                  <Row label="GST Amount" value={<span className="text-violet-700 font-semibold">{fmt(payment.gstAmount)}</span>} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Row label="Deduction Type" value={payment.deductionType} />
                {payment.deductionType !== 'None' && (
                  <>
                    {payment.deductionType === 'PT'
                      ? <Row label="PT Amount (Fixed)" value={<span className="text-orange-700 font-semibold">{fmt(payment.deductionAmount)}</span>} />
                      : <Row label="Deduction %" value={`${payment.deductionPercent}%`} />
                    }
                  </>
                )}
              </div>

              {payment.deductionType !== 'None' && payment.deductionType !== 'PT' && (
                <Row label="Deduction Amount" value={<span className="text-orange-700 font-semibold">{fmt(payment.deductionAmount)}</span>} />
              )}

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mt-2">
                <p className="text-xs text-indigo-500 font-semibold">Net Payable</p>
                <p className="text-3xl font-bold text-indigo-800 mt-1">{fmt(payment.netPayable)}</p>
                {payment.netPayable > 0 && (
                  <p className="text-[10px] text-indigo-400 mt-1.5">
                    {fmt(payment.baseAmount)} base
                    {payment.gstAmount > 0 && ` + ${fmt(payment.gstAmount)} GST`}
                    {payment.deductionAmount > 0 && ` − ${fmt(payment.deductionAmount)} deduction`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── PAYMENT ── */}
          {tab === 'payment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Row label="Paid Amount" value={<span className="text-emerald-700 font-semibold">{fmt(payment.paidAmount)}</span>} />
                <Row label="Status" value={
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${statusStyle}`}>
                    {payment.paymentStatus}
                  </span>
                } />
              </div>

              {payment.balanceAmount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs text-red-500 font-semibold">Balance Outstanding</p>
                  <p className="text-2xl font-bold text-red-700 mt-1">{fmt(payment.balanceAmount)}</p>
                </div>
              )}

              {payment.paymentMode && (
                <Row label="Payment Mode" value={payment.paymentMode} />
              )}
              {payment.referenceNumber && (
                <Row label="Reference / UTR" value={<span className="font-mono text-sm">{payment.referenceNumber}</span>} />
              )}
              {payment.paymentDate && (
                <Row label="Payment Date" value={payment.paymentDate} />
              )}
              {payment.attachmentName && (
                <Row label="Attachment" value={
                  <span className="inline-flex items-center px-2.5 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-700">
                    {payment.attachmentName}
                  </span>
                } />
              )}

              {!payment.paymentMode && !payment.referenceNumber && !payment.paymentDate && !payment.attachmentName && payment.balanceAmount === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">No additional payment details recorded.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-gray-200 bg-gray-50 shrink-0">
          <button onClick={onClose} className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </>
  )
}
