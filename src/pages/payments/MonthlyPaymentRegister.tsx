import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Search, Plus, SlidersHorizontal, HelpCircle, X } from 'lucide-react'
import clsx from 'clsx'
import type { Payment } from '../../types/payment'
import { EXPENSE_TYPES, PARTY_TYPES, PAYMENT_STATUSES } from '../../types/payment'
import { DUMMY_PAYMENTS } from '../../data/payments'
import SummaryCards from './components/SummaryCards'
import PaymentTable from './components/PaymentTable'
import PaymentFormDrawer from './components/PaymentFormDrawer'
import PaymentDetailModal from './components/PaymentDetailModal'

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function MonthlyPaymentRegister() {
  const [selectedMonth, setSelectedMonth] = useState('2026-04')
  const [payments, setPayments] = useState<Payment[]>(DUMMY_PAYMENTS)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterParty, setFilterParty] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null)

  // Global mode: when search text OR date range is set, ignore month filter
  const isGlobalMode = !!(search.trim() || fromDate || toDate)

  const filteredPayments = useMemo(() => {
    const q = search.toLowerCase().trim()
    return payments.filter(p => {
      // Month filter — only when not in global mode
      if (!isGlobalMode && p.month !== selectedMonth) return false
      // Date range
      if (fromDate && p.expenseDate < fromDate) return false
      if (toDate && p.expenseDate > toDate) return false
      // Omnisearch — party name, expense type, notes, party type
      if (q && ![p.partyName, p.expenseType, p.notes, p.partyType]
            .some(f => f.toLowerCase().includes(q))) return false
      // Dropdown filters
      if (filterType && p.expenseType !== filterType) return false
      if (filterParty && p.partyType !== filterParty) return false
      if (filterStatus && p.paymentStatus !== filterStatus) return false
      return true
    })
  }, [payments, selectedMonth, isGlobalMode, search, fromDate, toDate, filterType, filterParty, filterStatus])

  const summary = useMemo(() => ({
    totalBase: filteredPayments.reduce((s, p) => s + p.baseAmount, 0),
    totalGst: filteredPayments.reduce((s, p) => s + p.gstAmount, 0),
    totalDeduction: filteredPayments.reduce((s, p) => s + p.deductionAmount, 0),
    totalNet: filteredPayments.reduce((s, p) => s + p.netPayable, 0),
    totalPaid: filteredPayments.reduce((s, p) => s + p.paidAmount, 0),
    totalBalance: filteredPayments.reduce((s, p) => s + p.balanceAmount, 0),
  }), [filteredPayments])

  function handleSave(payment: Payment) {
    if (editingPayment) {
      setPayments(prev => prev.map(p => p.id === editingPayment.id ? payment : p))
    } else {
      setPayments(prev => [...prev, payment])
    }
    setDrawerOpen(false)
    setEditingPayment(null)
  }

  function handleEdit(payment: Payment) {
    setEditingPayment(payment)
    setDrawerOpen(true)
  }

  function handleView(payment: Payment) {
    setViewingPayment(payment)
  }

  function handleDelete(id: string) {
    setPayments(prev => prev.filter(p => p.id !== id))
  }

  function handleUpdate(id: string, updates: Partial<Payment>) {
    setPayments(prev => prev.map(p =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    ))
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditingPayment(null)
  }

  function clearAll() {
    setSearch('')
    setFromDate('')
    setToDate('')
    setFilterType('')
    setFilterParty('')
    setFilterStatus('')
  }

  const hasAnyFilter = search.trim() || fromDate || toDate || filterType || filterParty || filterStatus
  const monthEntryCount = payments.filter(p => p.month === selectedMonth).length

  const dateCls = 'px-2.5 py-2 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white text-gray-700 transition-colors'

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Monthly Payment Register</h1>
        <button title="Help" className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors">
          <HelpCircle size={12} />
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setSelectedMonth(m => shiftMonth(m, -1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className={clsx(
          'flex items-center gap-2 px-4 py-2 border rounded-lg min-w-[160px] justify-center transition-colors',
          isGlobalMode ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200',
        )}>
          <span className={clsx('text-sm font-semibold', isGlobalMode ? 'text-gray-400' : 'text-gray-900')}>
            {formatMonthLabel(selectedMonth)}
          </span>
        </div>
        <button
          onClick={() => setSelectedMonth(m => shiftMonth(m, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
        <span className="text-xs text-gray-400 ml-1">
          {isGlobalMode
            ? <span className="text-indigo-500 font-medium">Global search — month filter bypassed</span>
            : `${monthEntryCount} entries`}
        </span>
      </div>

      {/* Summary cards — always reflect filtered results */}
      <SummaryCards summary={summary} />

      {/* Card container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Filter bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-wrap">

          {/* Omnisearch */}
          <div className="relative" style={{ minWidth: '200px' }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search party, type, notes..."
              className={clsx(
                'w-full pl-8 pr-7 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-gray-400 transition-colors',
                search ? 'bg-white border-indigo-300' : 'bg-gray-50 border-gray-200',
              )}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className={clsx(dateCls, fromDate ? 'border-indigo-300 text-indigo-700' : 'border-gray-200')}
            />
            <span className="text-xs text-gray-400">—</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">To</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className={clsx(dateCls, toDate ? 'border-indigo-300 text-indigo-700' : 'border-gray-200')}
            />
          </div>

          <div className="flex items-center gap-1.5 text-gray-300">
            <SlidersHorizontal size={13} />
          </div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className={clsx(
              'px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white transition-colors',
              filterType ? 'border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600',
            )}
          >
            <option value="">All Expense Types</option>
            {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={filterParty}
            onChange={e => setFilterParty(e.target.value)}
            className={clsx(
              'px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white transition-colors',
              filterParty ? 'border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600',
            )}
          >
            <option value="">All Party Types</option>
            {PARTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className={clsx(
              'px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white transition-colors',
              filterStatus ? 'border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600',
            )}
          >
            <option value="">All Statuses</option>
            {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {hasAnyFilter && (
            <button
              onClick={clearAll}
              className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
            >
              Clear all
            </button>
          )}

          <button
            onClick={() => { setEditingPayment(null); setDrawerOpen(true) }}
            className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={14} />
            Add Payment
          </button>
        </div>

        {/* Global mode banner */}
        {isGlobalMode && (
          <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-indigo-700">
              <Search size={11} />
              <span className="font-medium">
                {filteredPayments.length} result{filteredPayments.length !== 1 ? 's' : ''} across all months
                {search && <> · "<span className="font-semibold">{search}</span>"</>}
                {fromDate && <> · from {fmtDate(fromDate)}</>}
                {toDate && <> · to {fmtDate(toDate)}</>}
              </span>
            </div>
            <button onClick={clearAll} className="text-xs text-indigo-400 hover:text-indigo-600 underline">
              Clear search
            </button>
          </div>
        )}

        {/* Table */}
        <div className="px-4 py-2 min-h-[300px]">
          <PaymentTable
            payments={filteredPayments}
            isGlobalMode={isGlobalMode}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {isGlobalMode
              ? `Showing ${filteredPayments.length} entr${filteredPayments.length !== 1 ? 'ies' : 'y'} across all months`
              : `Showing ${filteredPayments.length} of ${monthEntryCount} entries for ${formatMonthLabel(selectedMonth)}`
            }
          </p>
        </div>
      </div>

      <PaymentFormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onSave={handleSave}
        initialPayment={editingPayment}
        defaultMonth={selectedMonth}
      />
      <PaymentDetailModal payment={viewingPayment} onClose={() => setViewingPayment(null)} />
    </div>
  )
}
