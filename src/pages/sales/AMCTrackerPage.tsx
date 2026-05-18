import { useState, useMemo } from 'react'
import { Plus, Search, Eye, Pencil, Trash2, Repeat, FileText } from 'lucide-react'
import clsx from 'clsx'
import type { AMC, AMCBillingCycle } from '../../types/sales'
import { AMC_STATUSES, AMC_FREQUENCIES, calcPaymentStatus } from '../../types/sales'
import { useSales } from '../../contexts/SalesContext'
import { SALES_CUSTOMERS } from '../../data/sales'
import { fmtINR } from '../../utils/currency'
import { StatusBadge, amcStatusTone, piTone, tiTone, paymentTone } from './components/StatusBadge'
import { AMCFormDrawer } from './components/AMCFormDrawer'

export default function AMCTrackerPage() {
  const { amcs, amcCycles, projects, deleteAMC } = useSales()
  const [search, setSearch] = useState('')
  const [fCustomer, setFCustomer] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fFreq, setFFreq] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editAMC, setEditAMC] = useState<AMC | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Synthetic AMCs from projects with billingType === 'AMC' (so AMC project shows here too)
  const syntheticFromProjects: AMC[] = useMemo(() => {
    return projects
      .filter(p => p.billingType === 'AMC' && !amcs.some(a => a.name === p.name && a.customerId === p.customerId))
      .map(p => ({
        id: `proj-${p.id}`,
        customerId: p.customerId,
        customerName: p.customerName,
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        frequency: 'Monthly' as const,
        baseAmount: 0,
        gstPercent: p.gstPercent,
        tdsPercent: p.tdsPercent,
        nextBillingDate: '',
        status: 'Active' as const,
        notes: 'Auto-linked from project (billing type: AMC).',
        createdAt: p.createdAt,
      }))
  }, [projects, amcs])

  const allAMCs = [...amcs, ...syntheticFromProjects]

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allAMCs.filter(a => {
      if (q && !a.name.toLowerCase().includes(q) && !a.customerName.toLowerCase().includes(q)) return false
      if (fCustomer && a.customerId !== fCustomer) return false
      if (fStatus && a.status !== fStatus) return false
      if (fFreq && a.frequency !== fFreq) return false
      return true
    })
  }, [allAMCs, search, fCustomer, fStatus, fFreq])

  return (
    <div className="max-w-[1500px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AMC Tracker</h1>
          <p className="text-xs text-gray-400 mt-0.5">Recurring annual maintenance contracts and billing cycles.</p>
        </div>
        <button onClick={() => { setEditAMC(null); setFormOpen(true) }} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
          <Plus size={14} />
          New AMC
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-wrap">
          <div className="relative" style={{ minWidth: '220px' }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search AMCs..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
          </div>
          <FilterSelect value={fCustomer} onChange={setFCustomer} placeholder="All Customers" options={SALES_CUSTOMERS.map(c => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={fStatus} onChange={setFStatus} placeholder="All Status" options={AMC_STATUSES.map(s => ({ value: s, label: s }))} />
          <FilterSelect value={fFreq} onChange={setFFreq} placeholder="All Frequencies" options={AMC_FREQUENCIES.map(f => ({ value: f, label: f }))} />
          <span className="ml-auto text-xs text-gray-400">{filtered.length} of {allAMCs.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '1450px' }}>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                <th className="py-2.5 px-3">AMC Name</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Start</th>
                <th className="py-2.5 px-3">End</th>
                <th className="py-2.5 px-3">Frequency</th>
                <th className="py-2.5 px-3 text-right">Base Amount</th>
                <th className="py-2.5 px-3 text-right">GST</th>
                <th className="py-2.5 px-3 text-right">TDS</th>
                <th className="py-2.5 px-3">Next Billing</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="py-12 text-center text-xs text-gray-400">No AMC contracts.</td></tr>
              )}
              {filtered.map(a => {
                const cycles = amcCycles.filter(c => c.amcId === a.id)
                const expanded = expandedId === a.id
                return (
                  <FragmentRow key={a.id}>
                    <tr className="group border-b border-gray-50 hover:bg-gray-50/60">
                      <td className="py-2.5 px-3 text-xs">
                        <button onClick={() => setExpandedId(expanded ? null : a.id)} className="font-medium text-gray-900 hover:text-indigo-600 inline-flex items-center gap-1">
                          <Repeat size={11} className="text-emerald-500" />
                          {a.name}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-600">{a.customerName}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{a.startDate}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{a.endDate}</td>
                      <td className="py-2.5 px-3 text-xs"><StatusBadge label={a.frequency} tone="blue" size="xs" /></td>
                      <td className="py-2.5 px-3 text-xs text-right font-medium">{fmtINR(a.baseAmount)}</td>
                      <td className="py-2.5 px-3 text-xs text-right text-violet-700">{a.gstPercent}%</td>
                      <td className="py-2.5 px-3 text-xs text-right text-orange-700">{a.tdsPercent}%</td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{a.nextBillingDate || '—'}</td>
                      <td className="py-2.5 px-3"><StatusBadge label={a.status} tone={amcStatusTone(a.status)} size="xs" /></td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setExpandedId(expanded ? null : a.id)} title="View cycles" className="p-1.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600">
                            <Eye size={13} />
                          </button>
                          {!a.id.startsWith('proj-') && (
                            <>
                              <button onClick={() => { setEditAMC(a); setFormOpen(true) }} title="Edit" className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => { if (confirm(`Delete AMC "${a.name}"?`)) deleteAMC(a.id) }} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={11} className="px-3 pb-3 pt-1 bg-indigo-50/30">
                          <BillingCyclesTable cycles={cycles} amc={a} />
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AMCFormDrawer
        open={formOpen}
        initial={editAMC}
        onClose={() => { setFormOpen(false); setEditAMC(null) }}
      />
    </div>
  )
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>
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

function BillingCyclesTable({ cycles, amc }: { cycles: AMCBillingCycle[]; amc: AMC }) {
  if (cycles.length === 0) {
    return <p className="text-xs text-gray-400 py-3 px-2">No billing cycles yet for this AMC.</p>
  }
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
          <tr>
            <th className="text-left py-2 pl-3">Cycle / Period</th>
            <th className="text-left py-2">Due Date</th>
            <th className="text-right py-2">Base</th>
            <th className="text-right py-2">GST</th>
            <th className="text-right py-2">Gross</th>
            <th className="text-right py-2">TDS</th>
            <th className="text-right py-2">Expected</th>
            <th className="text-right py-2">Received</th>
            <th className="text-right py-2">Outstanding</th>
            <th className="text-left py-2">PI</th>
            <th className="text-left py-2">TI</th>
            <th className="text-left py-2">Payment</th>
            <th className="text-right py-2 pr-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cycles.map(c => {
            const outstanding = c.expectedReceipt - c.amountReceived
            const status = calcPaymentStatus(c.amountReceived, c.expectedReceipt)
            return (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="py-2 pl-3 font-medium">{c.period}</td>
                <td className="py-2 text-gray-500">{c.dueDate}</td>
                <td className="py-2 text-right">{fmtINR(c.baseAmount)}</td>
                <td className="py-2 text-right text-violet-700">{fmtINR(c.gstAmount)}</td>
                <td className="py-2 text-right">{fmtINR(c.grossAmount)}</td>
                <td className="py-2 text-right text-orange-700">{fmtINR(c.tdsAmount)}</td>
                <td className="py-2 text-right text-indigo-700 font-medium">{fmtINR(c.expectedReceipt)}</td>
                <td className="py-2 text-right text-emerald-700">{fmtINR(c.amountReceived)}</td>
                <td className={clsx('py-2 text-right font-medium', outstanding > 0 ? 'text-red-600' : 'text-gray-300')}>
                  {outstanding > 0 ? fmtINR(outstanding) : '—'}
                </td>
                <td className="py-2"><StatusBadge label={c.piStatus} tone={piTone(c.piStatus)} size="xs" /></td>
                <td className="py-2"><StatusBadge label={c.tiStatus} tone={tiTone(c.tiStatus)} size="xs" /></td>
                <td className="py-2"><StatusBadge label={status} tone={paymentTone(status)} size="xs" /></td>
                <td className="py-2 pr-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button title="Create PI" className="p-1 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600">
                      <FileText size={11} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="px-3 py-2 bg-gray-50 text-[11px] text-gray-500 border-t border-gray-100">
        AMC: {amc.name} · {amc.frequency} billing · {cycles.length} cycle{cycles.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
