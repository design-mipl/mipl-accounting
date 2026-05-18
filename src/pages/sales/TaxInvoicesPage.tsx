import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import type { TaxInvoice } from '../../types/sales'
import { TI_DOC_STATUSES } from '../../types/sales'
import { useSales } from '../../contexts/SalesContext'
import { SALES_CUSTOMERS } from '../../data/sales'
import { fmtINR } from '../../utils/currency'
import { StatusBadge, tiTone } from './components/StatusBadge'
import { TIFormDrawer } from './components/TIFormDrawer'

export default function TaxInvoicesPage() {
  const { tis, pis, deleteTI } = useSales()
  const [search, setSearch] = useState('')
  const [fClient, setFClient] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fPI, setFPI] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTI, setEditTI] = useState<TaxInvoice | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return tis.filter(t => {
      if (q && !t.tiNumber.toLowerCase().includes(q)
            && !t.clientName.toLowerCase().includes(q)
            && !(t.linkedPiNumber ?? '').toLowerCase().includes(q)) return false
      if (fClient && t.clientId !== fClient) return false
      if (fStatus && t.status !== fStatus) return false
      if (fPI && t.linkedPiId !== fPI) return false
      return true
    })
  }, [tis, search, fClient, fStatus, fPI])

  return (
    <div className="max-w-[1700px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tax Invoices</h1>
          <p className="text-xs text-gray-400 mt-0.5">Linked PI is recommended but not mandatory — direct tax invoices allowed.</p>
        </div>
        <button onClick={() => { setEditTI(null); setFormOpen(true) }} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
          <Plus size={14} />
          New Tax Invoice
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-wrap">
          <div className="relative" style={{ minWidth: '220px' }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search TI number, client, PI..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
          </div>
          <FilterSelect value={fClient} onChange={setFClient} placeholder="All Clients" options={SALES_CUSTOMERS.map(c => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={fPI} onChange={setFPI} placeholder="All Linked PI" options={pis.map(p => ({ value: p.id, label: p.piNumber }))} />
          <FilterSelect value={fStatus} onChange={setFStatus} placeholder="All Status" options={TI_DOC_STATUSES.map(s => ({ value: s, label: s }))} />
          <span className="ml-auto text-xs text-gray-400">{filtered.length} of {tis.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '1400px' }}>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                <th className="py-2.5 px-3">TI Number</th>
                <th className="py-2.5 px-3">TI Date</th>
                <th className="py-2.5 px-3">Client</th>
                <th className="py-2.5 px-3">Project Type</th>
                <th className="py-2.5 px-3">Milestone</th>
                <th className="py-2.5 px-3 text-right">Base</th>
                <th className="py-2.5 px-3 text-right">GST Amt</th>
                <th className="py-2.5 px-3 text-right">Gross</th>
                <th className="py-2.5 px-3 text-right">Received</th>
                <th className="py-2.5 px-3 text-right">TDS Amt</th>
                <th className="py-2.5 px-3 text-right">Outstanding</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={13} className="py-12 text-center text-xs text-gray-400">No tax invoices.</td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} className="group border-b border-gray-50 hover:bg-gray-50/60 text-xs">
                  <td className="py-2.5 px-3 font-mono font-medium text-gray-900">{t.tiNumber}</td>
                  <td className="py-2.5 px-3 text-gray-500">{t.tiDate}</td>
                  <td className="py-2.5 px-3 text-gray-700">{t.clientName}</td>
                  <td className="py-2.5 px-3"><StatusBadge label={t.projectType || '—'} tone="gray" size="xs" /></td>
                  <td className="py-2.5 px-3 text-gray-500 text-[11px]">{t.milestoneLabel || '—'}</td>
                  <td className="py-2.5 px-3 text-right">{fmtINR(t.baseAmount)}</td>
                  <td className="py-2.5 px-3 text-right text-violet-700">{fmtINR(t.gstAmount)}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{fmtINR(t.grossAmount)}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-700">{fmtINR(t.amountReceived)}</td>
                  <td className="py-2.5 px-3 text-right text-orange-700">{fmtINR(t.tdsAmount)}</td>
                  <td className={clsx('py-2.5 px-3 text-right font-medium', t.outstandingBeyondTds > 0 ? 'text-red-600' : 'text-gray-300')}>
                    {t.outstandingBeyondTds > 0 ? fmtINR(t.outstandingBeyondTds) : '—'}
                  </td>
                  <td className="py-2.5 px-3"><StatusBadge label={t.status} tone={tiTone(t.status)} size="xs" /></td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditTI(t); setFormOpen(true) }} title="Edit" className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600"><Pencil size={13} /></button>
                      <button onClick={() => { if (confirm(`Delete TI ${t.tiNumber}?`)) deleteTI(t.id) }} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TIFormDrawer open={formOpen} initial={editTI} onClose={() => { setFormOpen(false); setEditTI(null) }} />
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
