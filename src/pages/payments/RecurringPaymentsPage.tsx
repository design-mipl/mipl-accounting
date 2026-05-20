import { useState, useMemo } from 'react'
import { Search, Plus, RotateCcw, SlidersHorizontal, Calendar, ArrowRight, Eye, Pencil, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import type { Payment, ExpenseType, PartyType, PaymentStatus } from '../../types/payment'
import { EXPENSE_TYPES, PARTY_TYPES, PAYMENT_STATUSES } from '../../types/payment'
import { usePayments } from '../../contexts/PaymentContext'
import SummaryCards from './components/SummaryCards'
import PaymentTable from './components/PaymentTable'
import PaymentFormDrawer from './components/PaymentFormDrawer'
import PaymentDetailModal from './components/PaymentDetailModal'
import BulkUploadDrawer from './components/BulkUploadDrawer'

type TabType = 'series' | 'history'

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 })

export default function RecurringPaymentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('series')
  const { payments, loading, addPayment, updatePayment, deletePayment } = usePayments()
  
  // Search & filter states
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterParty, setFilterParty] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  
  // Drawer & detail modal states
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [prefillPayment, setPrefillPayment] = useState<Payment | null>(null)
  const [prefillMode, setPrefillMode] = useState<'create' | 'edit'>('create')
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null)
  const [bulkDrawerOpen, setBulkDrawerOpen] = useState(false)

  // Filter payments to only recurring payments
  const recurringPayments = useMemo(() => {
    return payments.filter(p => p.recurring)
  }, [payments])

  // Group recurring payments into active series templates based on unique combo of expenseType, partyType, and partyName
  const groupedSeries = useMemo(() => {
    const map = new Map<string, Payment[]>()
    for (const p of recurringPayments) {
      const key = `${p.expenseType}-${p.partyType}-${p.vendorId || p.employeeId || p.partyName}`
      const list = map.get(key) || []
      list.push(p)
      map.set(key, list)
    }
    
    return Array.from(map.entries()).map(([key, list]) => {
      // Sort payments descending by date to find the latest payment record
      const sorted = [...list].sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
      const latest = sorted[0]
      return {
        key,
        latest,
        history: sorted,
      }
    }).sort((a, b) => b.latest.expenseDate.localeCompare(a.latest.expenseDate))
  }, [recurringPayments])

  // Filtered series list
  const filteredSeries = useMemo(() => {
    const q = search.toLowerCase().trim()
    return groupedSeries.filter(({ latest }) => {
      if (filterType && latest.expenseType !== filterType) return false
      if (filterParty && latest.partyType !== filterParty) return false
      if (filterStatus && latest.paymentStatus !== filterStatus) return false
      if (q && ![latest.partyName, latest.expenseType, latest.notes]
            .some(f => f?.toLowerCase()?.includes(q))) return false
      return true
    })
  }, [groupedSeries, search, filterType, filterParty, filterStatus])

  // Filtered history list
  const filteredHistory = useMemo(() => {
    const q = search.toLowerCase().trim()
    return recurringPayments.filter(p => {
      if (filterType && p.expenseType !== filterType) return false
      if (filterParty && p.partyType !== filterParty) return false
      if (filterStatus && p.paymentStatus !== filterStatus) return false
      if (q && ![p.partyName, p.expenseType, p.notes]
            .some(f => f?.toLowerCase()?.includes(q))) return false
      return true
    }).sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
  }, [recurringPayments, search, filterType, filterParty, filterStatus])

  // Aggregate sums specifically for recurring payments
  const summary = useMemo(() => {
    const list = activeTab === 'series' ? filteredSeries.map(s => s.latest) : filteredHistory
    return {
      totalBase: list.reduce((s, p) => s + p.baseAmount, 0),
      totalGst: list.reduce((s, p) => s + p.gstAmount, 0),
      totalDeduction: list.reduce((s, p) => s + p.deductionAmount, 0),
      totalNet: list.reduce((s, p) => s + p.netPayable, 0),
      totalPaid: list.reduce((s, p) => s + p.paidAmount, 0),
      totalBalance: list.reduce((s, p) => s + p.balanceAmount, 0),
    }
  }, [activeTab, filteredSeries, filteredHistory])

  // Actions
  function handleAddNextMonth(latest: Payment) {
    const [y, m] = latest.month.split('-').map(Number)
    let nextY = y
    let nextM = m + 1
    if (nextM > 12) {
      nextM = 1
      nextY += 1
    }
    const nextMonthStr = `${nextY}-${String(nextM).padStart(2, '0')}`
    const nextDateStr = `${nextMonthStr}-01`

    // Pre-fill next month's payment based on latest record details
    const prefill: Payment = {
      ...latest,
      id: '', // Blank ID to trigger API post creation
      expenseDate: nextDateStr,
      month: nextMonthStr,
      paidAmount: 0,
      paymentStatus: 'Pending',
      balanceAmount: latest.netPayable,
      createdAt: '',
      updatedAt: '',
    }

    setPrefillPayment(prefill)
    setPrefillMode('create')
    setDrawerOpen(true)
  }

  function handleEditLatest(latest: Payment) {
    setPrefillPayment(latest)
    setPrefillMode('edit')
    setDrawerOpen(true)
  }

  function handleViewHistoryOfSeries(latest: Payment) {
    setSearch(latest.partyName)
    setFilterType(latest.expenseType)
    setActiveTab('history')
  }

  function handleAddNewRecurring() {
    const d = new Date()
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const blankPrefill: Payment = {
      id: '',
      expenseDate: `${currentMonth}-01`,
      month: currentMonth,
      expenseType: 'Other',
      partyType: 'Vendor',
      partyName: '',
      notes: '',
      recurring: true,
      baseAmount: 0,
      gstApplicable: false,
      gstPercent: 18,
      gstAmount: 0,
      deductionType: 'None',
      deductionPercent: 0,
      deductionAmount: 0,
      netPayable: 0,
      paidAmount: 0,
      paymentStatus: 'Pending',
      balanceAmount: 0,
      createdAt: '',
      updatedAt: '',
    }
    setPrefillPayment(blankPrefill)
    setPrefillMode('create')
    setDrawerOpen(true)
  }

  async function handleSave(payment: Payment) {
    try {
      if (prefillMode === 'edit' && prefillPayment?.id) {
        await updatePayment(prefillPayment.id, payment)
      } else {
        await addPayment(payment)
      }
      setDrawerOpen(false)
      setPrefillPayment(null)
    } catch (err: any) {
      console.error('Failed to save recurring payment:', err.message)
    }
  }

  function handleCloseDrawer() {
    setDrawerOpen(false)
    setPrefillPayment(null)
  }

  function clearAll() {
    setSearch('')
    setFilterType('')
    setFilterParty('')
    setFilterStatus('')
  }

  const hasAnyFilter = !!(search.trim() || filterType || filterParty || filterStatus)
  const inputCls = 'px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white transition-colors text-gray-600'

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Recurring Payments</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage and log monthly repeating expenditures, utilities, rent, and subscriptions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBulkDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <SlidersHorizontal size={14} />
            Bulk Upload
          </button>
          <button
            onClick={handleAddNewRecurring}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus size={14} />
            Add New Recurring Bill
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <SummaryCards summary={summary} />

      {/* Filters Toolbar */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Search by party, notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={clsx(inputCls, 'w-full pl-9')}
          />
        </div>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className={clsx(inputCls, filterType && 'border-indigo-300 text-indigo-700')}
        >
          <option value="">All Expense Types</option>
          {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filterParty}
          onChange={e => setFilterParty(e.target.value)}
          className={clsx(inputCls, filterParty && 'border-indigo-300 text-indigo-700')}
        >
          <option value="">All Party Types</option>
          {PARTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className={clsx(inputCls, filterStatus && 'border-indigo-300 text-indigo-700')}
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
      </div>

      {/* Tabs Layout */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <button
            onClick={() => setActiveTab('series')}
            className={clsx(
              'px-5 py-3.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2',
              activeTab === 'series'
                ? 'text-indigo-600 border-indigo-600 bg-white'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50',
            )}
          >
            <RotateCcw size={12} />
            Active Recurring Series ({filteredSeries.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={clsx(
              'px-5 py-3.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2',
              activeTab === 'history'
                ? 'text-indigo-600 border-indigo-600 bg-white'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50',
            )}
          >
            <Calendar size={12} />
            Logged Payment History ({filteredHistory.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'series' ? (
            filteredSeries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm font-medium text-gray-500">No active recurring payment series found</p>
                <p className="text-xs text-gray-400 mt-1">Create one by adding a payment and marking it as Recurring.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2.5 pl-2">Expense Type</th>
                      <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2.5">Party Type</th>
                      <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2.5">Party Name</th>
                      <th className="text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2.5 pr-4">Last Net Amount</th>
                      <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2.5 pl-4">Last Billed Month</th>
                      <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2.5">Last Status</th>
                      <th className="text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2.5 pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSeries.map(({ key, latest }) => {
                      const statusCls = latest.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        latest.paymentStatus === 'Part Paid' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      
                      // Calculate the next month label
                      const [y, m] = latest.month.split('-').map(Number)
                      let nextY = y
                      let nextM = m + 1
                      if (nextM > 12) {
                        nextM = 1
                        nextY += 1
                      }
                      const nextMonthLabel = new Date(nextY, nextM - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

                      return (
                        <tr key={key} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                          <td className="py-3 pl-2 text-xs font-semibold text-gray-900">{latest.expenseType}</td>
                          <td className="py-3 text-xs text-gray-500">{latest.partyType}</td>
                          <td className="py-3 text-xs font-medium text-gray-700">{latest.partyName}</td>
                          <td className="py-3 text-xs font-bold text-indigo-700 text-right pr-4">₹{fmt(latest.netPayable)}</td>
                          <td className="py-3 text-xs text-gray-600 pl-4">{formatMonthLabel(latest.month)}</td>
                          <td className="py-3 text-xs">
                            <span className={clsx('px-2 py-0.5 border rounded-full text-[10px] font-medium', statusCls)}>
                              {latest.paymentStatus}
                            </span>
                          </td>
                          <td className="py-2 pr-2">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleAddNextMonth(latest)}
                                title={`Add payment for ${nextMonthLabel}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg border border-indigo-200 transition-colors"
                              >
                                <Plus size={11} />
                                Next Month
                              </button>
                              <button
                                onClick={() => handleViewHistoryOfSeries(latest)}
                                title="View payment history for this series"
                                className="p-1.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                onClick={() => handleEditLatest(latest)}
                                title="Edit latest template entry"
                                className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                              >
                                <Pencil size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <PaymentTable
              payments={filteredHistory}
              isGlobalMode={true}
              onView={setViewingPayment}
              onEdit={handleEditLatest}
              onDelete={deletePayment}
              onUpdate={updatePayment}
            />
          )}
        </div>
      </div>

      {/* Payment Forms & Drawers */}
      <PaymentFormDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        onSave={handleSave}
        initialPayment={prefillPayment}
        defaultMonth={prefillPayment?.month || new Date().toISOString().substring(0, 7)}
        mode={prefillMode}
      />
      <PaymentDetailModal payment={viewingPayment} onClose={() => setViewingPayment(null)} />
      <BulkUploadDrawer open={bulkDrawerOpen} onClose={() => setBulkDrawerOpen(false)} />
    </div>
  )
}
