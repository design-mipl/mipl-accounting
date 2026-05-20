import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, SlidersHorizontal, Calendar } from 'lucide-react'
import clsx from 'clsx'
import type { TaxInvoice } from '../../types/sales'
import { useCustomers } from '../../contexts/CustomerContext'
import { useSales } from '../../contexts/SalesContext'
import { fmtINR } from '../../utils/currency'
import { StatusBadge, tiTone } from './components/StatusBadge'
import { TIFormDrawer } from './components/TIFormDrawer'

type DateFilterPreset = 'all' | 'today' | '7days' | '30days' | 'custom'

const btnPrimary =
  'inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-indigo-100'
const btnSecondary =
  'inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors shadow-2xs'

export default function TaxInvoicesPage() {
  const { tis, deleteTI, fetchTIsPaginated } = useSales()
  const { customers } = useCustomers()
  const SALES_CUSTOMERS = useMemo(() => {
    return customers.map(c => ({ id: c.id, name: c.companyName }))
  }, [customers])

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [fClient, setFClient] = useState('')
  const [fStatus, setFStatus] = useState('')

  // Date preset filters
  const [showFilters, setShowFilters] = useState(false)
  const [preset, setPreset] = useState<DateFilterPreset>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [activeStartDate, setActiveStartDate] = useState('')
  const [activeEndDate, setActiveEndDate] = useState('')

  // Pagination state
  const [paginatedTIs, setPaginatedTIs] = useState<TaxInvoice[]>([])
  const [meta, setMeta] = useState({ totalCount: 0, page: 1, limit: 10, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [loadingLocal, setLoadingLocal] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editTI, setEditTI] = useState<TaxInvoice | null>(null)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Load paginated TIs
  useEffect(() => {
    let active = true
    async function load() {
      setLoadingLocal(true)
      try {
        const res = await fetchTIsPaginated({
          page,
          limit,
          search: debouncedSearch,
          clientId: fClient,
          status: fStatus || undefined,
          startDate: activeStartDate,
          endDate: activeEndDate,
        })
        if (active) {
          setPaginatedTIs(res.tis)
          setMeta(res.meta)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setLoadingLocal(false)
      }
    }
    load()
    return () => { active = false }
  }, [page, limit, debouncedSearch, fClient, fStatus, activeStartDate, activeEndDate, tis])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, fClient, fStatus, activeStartDate, activeEndDate])

  // Date preset handler
  const handlePresetChange = (selectedPreset: DateFilterPreset) => {
    setPreset(selectedPreset)
    const todayStr = new Date().toISOString().split('T')[0]
    if (selectedPreset === 'all') {
      setActiveStartDate('')
      setActiveEndDate('')
    } else if (selectedPreset === 'today') {
      setActiveStartDate(todayStr)
      setActiveEndDate(todayStr)
    } else if (selectedPreset === '7days') {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)
      setActiveStartDate(pastDate.toISOString().split('T')[0])
      setActiveEndDate(todayStr)
    } else if (selectedPreset === '30days') {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 30)
      setActiveStartDate(pastDate.toISOString().split('T')[0])
      setActiveEndDate(todayStr)
    }
  }

  const applyCustomDates = () => {
    if (customStart || customEnd) {
      setActiveStartDate(customStart)
      setActiveEndDate(customEnd)
    }
  }

  const handleClearAllFilters = () => {
    setSearchInput('')
    setFClient('')
    setFStatus('')
    setPreset('all')
    setCustomStart('')
    setCustomEnd('')
    setActiveStartDate('')
    setActiveEndDate('')
  }

  const isFilteringActive = searchInput || fClient || fStatus || preset !== 'all' || customStart || customEnd

  // Page numbers for footer
  const pageNumbers: number[] = []
  for (let i = 1; i <= meta.totalPages; i++) {
    pageNumbers.push(i)
  }

  return (
    <div className="max-w-[1700px] mx-auto pb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tax Invoices</h1>
          <p className="text-xs text-gray-400 mt-0.5">Linked PI is recommended but not mandatory — direct tax invoices allowed.</p>
        </div>
        <button onClick={() => { setEditTI(null); setFormOpen(true) }} className={btnPrimary}>
          <Plus size={14} />
          New Tax Invoice
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col relative">
        {/* Loader Overlay */}
        {loadingLocal && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-100 shadow-md">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-gray-600">Loading invoices...</span>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex-wrap">
          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search TI number, client, project..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-gray-400 transition-shadow shadow-2xs"
            />
          </div>

          <FilterSelect value={fClient} onChange={setFClient} placeholder="All Clients" options={SALES_CUSTOMERS.map(c => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={fStatus} onChange={setFStatus} placeholder="All Status" options={[
            { value: 'DRAFT', label: 'Draft' },
            { value: 'GENERATED', label: 'Generated' },
            { value: 'SENT', label: 'Sent' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]} />

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              btnSecondary,
              (preset !== 'all') && 'border-indigo-200 bg-indigo-50/20 text-indigo-700 hover:bg-indigo-50/40'
            )}
          >
            <SlidersHorizontal size={14} />
            Filters
            {(preset !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            )}
          </button>

          {isFilteringActive && (
            <button onClick={handleClearAllFilters} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors py-1.5 px-2 cursor-pointer">Clear Filters</button>
          )}
          <span className="ml-auto text-xs text-gray-400">Showing {paginatedTIs.length} of {meta.totalCount} invoices</span>
        </div>

        {/* Date Filter Panel */}
        {showFilters && (
          <div className="px-4 py-3.5 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-4 animate-fade-in">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 mr-1.5">TI Date:</span>
              {(['all', 'today', '7days', '30days', 'custom'] as DateFilterPreset[]).map(p => (
                <button
                  key={p}
                  onClick={() => handlePresetChange(p)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer',
                    preset === p
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  )}
                >
                  {p === 'all' && 'All Time'}
                  {p === 'today' && 'Today'}
                  {p === '7days' && 'Past 7 Days'}
                  {p === '30days' && 'Past 30 Days'}
                  {p === 'custom' && 'Custom Range'}
                </button>
              ))}
            </div>

            {preset === 'custom' && (
              <div className="flex items-center gap-2 border-t md:border-t-0 border-gray-100 pt-3.5 md:pt-0 md:pl-4 md:border-l">
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-gray-400" />
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-gray-200 rounded-md bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-gray-200 rounded-md bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
                <button
                  onClick={applyCustomDates}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        )}

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
              {paginatedTIs.length === 0 && (
                <tr><td colSpan={13} className="py-12 text-center text-xs text-gray-400">No tax invoices.</td></tr>
              )}
              {paginatedTIs.map(t => {
                const customer = customers.find(c => c.id === t.clientId)
                const clientName = customer ? customer.companyName : t.clientName
                return (
                  <tr key={t.id} className="group border-b border-gray-50 hover:bg-gray-50/60 text-xs">
                    <td className="py-2.5 px-3 font-mono font-medium text-gray-900">{t.tiNumber}</td>
                    <td className="py-2.5 px-3 text-gray-500">{t.tiDate}</td>
                    <td className="py-2.5 px-3 text-gray-700">{clientName}</td>
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
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => { setEditTI(t); setFormOpen(true) }} title="Edit" className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 cursor-pointer"><Pencil size={13} /></button>
                      <button onClick={() => { if (confirm(`Delete TI ${t.tiNumber}?`)) deleteTI(t.id) }} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
          {/* Total Info & Limit Selector */}
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

          {/* Page numbers */}
          {meta.totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              {/* Prev Button */}
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>

              {/* Page Number Selectors */}
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

              {/* Next Button */}
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

      <TIFormDrawer open={formOpen} initial={editTI} onClose={() => { setFormOpen(false); setEditTI(null) }} />
    </div>
  )
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
