import { useState, useMemo } from 'react'
import {
  UserPlus, SlidersHorizontal, Search, ChevronDown,
  HelpCircle, Download, Upload,
} from 'lucide-react'
import clsx from 'clsx'
import type { Customer } from '../../types/customer'
import { useCustomers } from '../../contexts/CustomerContext'
import CustomerTable from './components/CustomerTable'
import NewCustomerDrawer from './components/NewCustomerDrawer'

type Tab = 'all' | 'inactive'

const btnPrimary =
  'inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors'
const btnSecondary =
  'inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors'

export default function CustomersPage() {
  const { customers, deleteCustomer, restoreCustomer, updateCustomer, addCustomer } = useCustomers()

  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [actionsOpen, setActionsOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  const activeCustomers = useMemo(() => customers.filter(c => !c.deletedAt), [customers])
  const deletedCustomers = useMemo(() => customers.filter(c => !!c.deletedAt), [customers])

  const filteredActive = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return activeCustomers
    return activeCustomers.filter(c =>
      c.ownerName.toLowerCase().includes(q) ||
      c.companyName.toLowerCase().includes(q) ||
      c.phones.some(p => p.includes(q)) ||
      c.emails.some(e => e.toLowerCase().includes(q)),
    )
  }, [activeCustomers, search])

  const filteredDeleted = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return deletedCustomers
    return deletedCustomers.filter(c =>
      c.ownerName.toLowerCase().includes(q) ||
      c.companyName.toLowerCase().includes(q),
    )
  }, [deletedCustomers, search])

  function handleDelete(id: string) {
    deleteCustomer(id)
  }

  function handleRestore(id: string) {
    restoreCustomer(id)
  }

  function handleStatusChange(id: string, status: 'Active' | 'Inactive') {
    updateCustomer(id, { status })
  }

  function handleSaveCustomer(customer: Customer) {
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, customer)
      setEditingCustomer(null)
    } else {
      addCustomer(customer)
    }
    setDrawerOpen(false)
  }

  function handleEdit(customer: Customer) {
    setEditingCustomer(customer)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditingCustomer(null)
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'all', label: 'All Customers', count: activeCustomers.length },
    { key: 'inactive', label: 'Inactive Clients', count: deletedCustomers.length },
  ]

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-2 mb-5">
        <h1 className="text-xl font-bold text-gray-900">Customers</h1>
        <button
          title="Help"
          className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
        >
          <HelpCircle size={12} />
        </button>
      </div>


      {/* Card container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-gray-100 px-4">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-3.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                tab === t.key
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-500 border-transparent hover:text-gray-800',
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={clsx(
                  'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold',
                  tab === t.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500',
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + actions row */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customers by name, company, phone etc."
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-gray-400"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <button
                onClick={() => setActionsOpen(o => !o)}
                className={btnSecondary}
              >
                <SlidersHorizontal size={14} />
                Actions
                <ChevronDown size={13} className={clsx('transition-transform', actionsOpen && 'rotate-180')} />
              </button>
              {actionsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl border border-gray-200 shadow-lg z-20 py-1 overflow-hidden">
                    <button className="flex items-center gap-2 w-full px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Download size={14} className="text-gray-400" />
                      Export CSV
                    </button>
                    <button className="flex items-center gap-2 w-full px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Upload size={14} className="text-gray-400" />
                      Import CSV
                    </button>
                  </div>
                </>
              )}
            </div>

            <button onClick={() => setDrawerOpen(true)} className={btnPrimary}>
              <UserPlus size={14} />
              New Customer
            </button>
          </div>
        </div>

        {/* Table content */}
        <div className="px-4 py-2 min-h-[300px]">
          {tab === 'all' && (
            <CustomerTable customers={filteredActive} tab="all" onDelete={handleDelete} onRestore={handleRestore} onStatusChange={handleStatusChange} onEdit={handleEdit} onView={handleView} />
          )}
          {tab === 'inactive' && (
            <CustomerTable customers={filteredDeleted} tab="inactive" onDelete={handleDelete} onRestore={handleRestore} onEdit={handleEdit} onView={handleView} />
          )}
        </div>

        {/* Footer */}
        {(tab === 'all' || tab === 'inactive') && (
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {tab === 'all'
                ? `Showing ${filteredActive.length} of ${activeCustomers.length} customers`
                : `${filteredDeleted.length} inactive customer${filteredDeleted.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        )}
      </div>

      <NewCustomerDrawer open={drawerOpen} onClose={closeDrawer} onSave={handleSaveCustomer} initialCustomer={editingCustomer} />
    </div>
  )
}
