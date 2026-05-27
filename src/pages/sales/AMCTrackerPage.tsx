import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Eye, Pencil, Trash2, Repeat, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import type { AMC, AMCBillingCycle } from '../../types/sales'
import { AMC_STATUSES, AMC_FREQUENCIES, calcPaymentStatus } from '../../types/sales'
import { useCustomers } from '../../contexts/CustomerContext'
import { useSales } from '../../contexts/SalesContext'
import { fmtINR } from '../../utils/currency'
import { StatusBadge, amcStatusTone, piTone, tiTone, paymentTone } from './components/StatusBadge'
import { AMCFormDrawer } from './components/AMCFormDrawer'
import DeleteConfirmationModal from '../../components/common/DeleteConfirmationModal'
import { useToast } from '../../contexts/ToastContext'

const btnPrimary =
  'inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-indigo-100'
const btnSecondary =
  'inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors shadow-2xs'

export default function AMCTrackerPage() {
  const { amcs, amcCycles, deleteAMC, fetchAMCsPaginated, fetchAMCDetails } = useSales()
  const { customers } = useCustomers()
  const { showSuccess, showError } = useToast()
  
  // Search & Filters state
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [fCustomer, setFCustomer] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fFreq, setFFreq] = useState('')

  // Pagination state
  const [paginatedAMCs, setPaginatedAMCs] = useState<AMC[]>([])
  const [meta, setMeta] = useState({ totalCount: 0, page: 1, limit: 10, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [loadingLocal, setLoadingLocal] = useState(false)
  const [loadingCycles, setLoadingCycles] = useState<Record<string, boolean>>({})

  const [formOpen, setFormOpen] = useState(false)
  const [editAMC, setEditAMC] = useState<AMC | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingAMCId, setDeletingAMCId] = useState<string | null>(null)
  const [deletingAMCName, setDeletingAMCName] = useState<string>('')

  const SALES_CUSTOMERS = useMemo(() => {
    return customers.map(c => ({
      id: c.id,
      name: c.companyName,
    }))
  }, [customers])

  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Load paginated AMCs
  useEffect(() => {
    let active = true
    async function load() {
      setLoadingLocal(true)
      try {
        const res = await fetchAMCsPaginated({
          page,
          limit,
          search: debouncedSearch,
          customerId: fCustomer,
          status: fStatus ? fStatus.toUpperCase().replace('-', '_') : undefined,
          billingFrequency: fFreq ? fFreq.toUpperCase().replace('-', '_') : undefined,
        })
        if (active) {
          setPaginatedAMCs(res.amcs)
          setMeta(res.meta)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setLoadingLocal(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [page, limit, debouncedSearch, fCustomer, fStatus, fFreq, amcs])

  // Reset page on search/filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, fCustomer, fStatus, fFreq])

  const handleToggleExpand = async (amcId: string) => {
    if (expandedId === amcId) {
      setExpandedId(null)
    } else {
      setExpandedId(amcId)
      setLoadingCycles(prev => ({ ...prev, [amcId]: true }))
      try {
        await fetchAMCDetails(amcId)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingCycles(prev => ({ ...prev, [amcId]: false }))
      }
    }
  }

  const handleClearAllFilters = () => {
    setSearchInput('')
    setFCustomer('')
    setFStatus('')
    setFFreq('')
  }

  const pageNumbers = []
  for (let i = 1; i <= meta.totalPages; i++) {
    pageNumbers.push(i)
  }

  const handleDeleteClick = (amc: AMC) => {
    setDeletingAMCId(amc.id)
    setDeletingAMCName(amc.name)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async (isHardDelete: boolean) => {
    if (!deletingAMCId) return
    try {
      await deleteAMC(deletingAMCId, isHardDelete)
      showSuccess(isHardDelete ? 'AMC permanently deleted.' : 'AMC soft deleted successfully.', 'AMC Deleted')
    } catch (err: any) {
      showError(err.message || 'Failed to delete AMC', 'Delete Failed')
    } finally {
      setDeleteModalOpen(false)
      setDeletingAMCId(null)
    }
  }

  const isFilteringActive = searchInput || fCustomer || fStatus || fFreq

  return (
    <div className="max-w-[1500px] mx-auto pb-10">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AMC Tracker</h1>
          <p className="text-xs text-gray-400 mt-0.5">Recurring annual maintenance contracts and billing cycles.</p>
        </div>
        <button onClick={() => { setEditAMC(null); setFormOpen(true) }} className={btnPrimary}>
          <Plus size={14} />
          New AMC
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col relative">
        {/* Loader overlay */}
        {loadingLocal && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-100 shadow-md">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-gray-600">Loading contracts...</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex-wrap">
          <div className="relative" style={{ minWidth: '220px' }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search AMCs..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-gray-400 transition-shadow shadow-2xs"
            />
          </div>
          <FilterSelect value={fCustomer} onChange={setFCustomer} placeholder="All Customers" options={SALES_CUSTOMERS.map(c => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={fStatus} onChange={setFStatus} placeholder="All Status" options={AMC_STATUSES.map(s => ({ value: s, label: s }))} />
          <FilterSelect value={fFreq} onChange={setFFreq} placeholder="All Frequencies" options={AMC_FREQUENCIES.map(f => ({ value: f, label: f }))} />
          
          {isFilteringActive && (
            <button onClick={handleClearAllFilters} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors py-1.5 px-2 cursor-pointer">Clear Filters</button>
          )}

          <span className="ml-auto text-xs text-gray-400">Showing {paginatedAMCs.length} of {meta.totalCount} contracts</span>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
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
              {paginatedAMCs.length === 0 && (
                <tr><td colSpan={11} className="py-12 text-center text-xs text-gray-400">No AMC contracts.</td></tr>
              )}
              {paginatedAMCs.map(a => {
                const cycles = amcCycles.filter(c => c.amcId === a.id)
                const expanded = expandedId === a.id
                const isLoadingCyclesThisRow = loadingCycles[a.id]
                return (
                  <FragmentRow key={a.id}>
                    <tr className="group border-b border-gray-50 hover:bg-gray-50/60">
                      <td className="py-2.5 px-3 text-xs">
                        <button onClick={() => handleToggleExpand(a.id)} className="font-medium text-gray-900 hover:text-indigo-600 inline-flex items-center gap-1 cursor-pointer">
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
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => handleToggleExpand(a.id)} title="View cycles" className="p-1.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 cursor-pointer">
                            <Eye size={13} />
                          </button>
                          {!a.id.startsWith('proj-') && (
                            <>
                              <button onClick={() => { setEditAMC(a); setFormOpen(true) }} title="Edit" className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 cursor-pointer">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => handleDeleteClick(a)} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer">
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
                          {isLoadingCyclesThisRow ? (
                            <div className="py-6 flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs text-gray-500">Loading billing cycles...</span>
                            </div>
                          ) : (
                            <BillingCyclesTable cycles={cycles} amc={a} />
                          )}
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              {meta.totalCount > 0 ? (
                <>Showing <b className="font-semibold text-gray-800">{((page - 1) * limit) + 1}</b> to <b className="font-semibold text-gray-800">{Math.min(page * limit, meta.totalCount)}</b> of <b className="font-semibold text-gray-800">{meta.totalCount}</b> entries</>
              ) : (
                'No entries to show'
              )}
            </span>
            <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
              <span>Show</span>
              <select
                value={limit}
                onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
                className="px-1.5 py-1 text-xs border border-gray-200 rounded-md bg-white text-gray-700 outline-none focus:border-indigo-400 font-semibold cursor-pointer"
              >
                {[5, 10, 25, 50].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
          </div>

          {meta.totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="flex items-center gap-1.5">
                {pageNumbers.map(num => (
                  <button
                    key={num}
                    onClick={() => setPage(num)}
                    className={clsx(
                      'w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs',
                      page === num
                        ? 'bg-indigo-600 border-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-100'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPage(page + 1)}
                disabled={page === meta.totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      <AMCFormDrawer
        open={formOpen}
        initial={editAMC}
        onClose={() => { setFormOpen(false); setEditAMC(null) }}
      />
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        title="Delete AMC"
        message="Choose how you want to delete this AMC contract. Soft delete preserves associated historical data. Hard delete is permanent."
        itemName={deletingAMCName}
        onClose={() => { setDeleteModalOpen(false); setDeletingAMCId(null); }}
        onConfirm={handleDeleteConfirm}
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
      className={clsx('px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white cursor-pointer shadow-2xs',
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
