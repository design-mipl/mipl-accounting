import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, ReceiptText, Eye, FileText } from 'lucide-react'
import clsx from 'clsx'
import type { ProformaInvoice } from '../../types/sales'
import { useSales } from '../../contexts/SalesContext'
import { SALES_CUSTOMERS } from '../../data/sales'
import { fmtINR } from '../../utils/currency'
import { StatusBadge, piTone } from './components/StatusBadge'
import { PIFormDrawer } from './components/PIFormDrawer'
import { TIFormDrawer } from './components/TIFormDrawer'

function getStatusFromPayment(received: number, expectedReceipt: number): 'Pending' | 'Paid' | 'Shortfall' {
  if (received === 0) return 'Pending'
  if (received === expectedReceipt) return 'Paid'
  return 'Shortfall'
}

export default function ProformaInvoicesPage() {
  const { pis, deletePI, upsertPI } = useSales()
  const [search, setSearch] = useState('')
  const [fClient, setFClient] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editPI, setEditPI] = useState<ProformaInvoice | null>(null)
  const [tiPrefill, setTiPrefill] = useState<ProformaInvoice | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return pis.filter(p => {
      if (q && !p.piNumber.toLowerCase().includes(q)
            && !p.clientName.toLowerCase().includes(q)
            && !(p.projectName ?? '').toLowerCase().includes(q)) return false
      if (fClient && p.clientId !== fClient) return false
      if (fStatus && getStatusFromPayment(p.amountReceived, p.grossAmount - p.tdsAmount) !== fStatus) return false
      return true
    })
  }, [pis, search, fClient, fStatus])

  function updateAmountReceived(pi: ProformaInvoice, newAmount: number) {
    const expectedReceipt = pi.grossAmount - pi.tdsAmount
    const newStatus = getStatusFromPayment(newAmount, expectedReceipt)
    upsertPI({
      ...pi,
      amountReceived: newAmount,
      status: newStatus as any,
      outstandingBeyondTds: expectedReceipt - newAmount,
    })
  }

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Proforma Invoices</h1>
          <p className="text-xs text-gray-400 mt-0.5">Track PIs separately. PI is usually created before payment.</p>
        </div>
        <button onClick={() => { setEditPI(null); setFormOpen(true) }} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
          <Plus size={14} />
          New PI
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-wrap">
          <div className="relative" style={{ minWidth: '220px' }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search PI number, client..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
          </div>
          <FilterSelect value={fClient} onChange={setFClient} placeholder="All Clients" options={SALES_CUSTOMERS.map(c => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={fStatus} onChange={setFStatus} placeholder="All Status" options={[{ value: 'Pending', label: 'Pending' }, { value: 'Paid', label: 'Paid' }, { value: 'Shortfall', label: 'Shortfall' }]} />
          <span className="ml-auto text-xs text-gray-400">{filtered.length} of {pis.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '1400px' }}>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                <th className="py-2.5 px-3">PI Number</th>
                <th className="py-2.5 px-3">PI Date</th>
                <th className="py-2.5 px-3">Client</th>
                <th className="py-2.5 px-3">Project Type</th>
                <th className="py-2.5 px-3">Milestone</th>
                <th className="py-2.5 px-3 text-right">Base</th>
                <th className="py-2.5 px-3 text-right">GST Amt</th>
                <th className="py-2.5 px-3 text-right">Gross</th>
                <th className="py-2.5 px-3 text-right">Received (Edit)</th>
                <th className="py-2.5 px-3 text-right">TDS Amt</th>
                <th className="py-2.5 px-3 text-right">Outstanding</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={13} className="py-12 text-center text-xs text-gray-400">No proforma invoices.</td></tr>
              )}
              {filtered.map(p => {
                const expectedReceipt = p.grossAmount - p.tdsAmount
                const status = getStatusFromPayment(p.amountReceived, expectedReceipt)
                return (
                  <tr key={p.id} className="group border-b border-gray-50 hover:bg-gray-50/60 text-xs">
                    <td className="py-2.5 px-3 font-mono font-medium text-gray-900">{p.piNumber}</td>
                    <td className="py-2.5 px-3 text-gray-500">{p.piDate}</td>
                    <td className="py-2.5 px-3 text-gray-700">{p.clientName}</td>
                    <td className="py-2.5 px-3"><StatusBadge label={p.projectType || '—'} tone="gray" size="xs" /></td>
                    <td className="py-2.5 px-3 text-gray-500 text-[11px]">{p.milestoneLabel || '—'}</td>
                    <td className="py-2.5 px-3 text-right">{fmtINR(p.baseAmount)}</td>
                    <td className="py-2.5 px-3 text-right text-violet-700">{fmtINR(p.gstAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{fmtINR(p.grossAmount)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        value={p.amountReceived}
                        onChange={e => updateAmountReceived(p, parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 text-right text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 rounded outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right text-orange-700">{fmtINR(p.tdsAmount)}</td>
                    <td className={clsx('py-2.5 px-3 text-right font-medium', expectedReceipt - p.amountReceived > 0 ? 'text-red-600' : 'text-gray-300')}>
                      {expectedReceipt - p.amountReceived > 0 ? fmtINR(expectedReceipt - p.amountReceived) : '—'}
                    </td>
                    <td className="py-2.5 px-3"><StatusBadge label={status} tone={status === 'Paid' ? 'green' : status === 'Shortfall' ? 'orange' : 'gray'} size="xs" /></td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditPI(p); setFormOpen(true) }} title="Edit" className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600"><Pencil size={13} /></button>
                        <button onClick={() => setTiPrefill(p)} title="Create Tax Invoice" className="p-1.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600"><ReceiptText size={13} /></button>
                        <button onClick={() => { if (confirm(`Delete PI ${p.piNumber}?`)) deletePI(p.id) }} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PIFormDrawer open={formOpen} initial={editPI} onClose={() => { setFormOpen(false); setEditPI(null) }} />
      <TIFormDrawer
        open={!!tiPrefill}
        onClose={() => setTiPrefill(null)}
        fromPI={tiPrefill}
      />
      <span className="hidden"><Eye size={1} /><FileText size={1} /></span>
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
