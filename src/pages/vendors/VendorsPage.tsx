import { useState, useMemo } from 'react'
import {
  UserPlus, SlidersHorizontal, Search, ChevronDown,
  HelpCircle, Download, Upload,
} from 'lucide-react'
import clsx from 'clsx'
import { useVendors } from '../../contexts/VendorContext'
import type { Vendor } from '../../types/vendor'
import VendorTable from './components/VendorTable'
import NewVendorDrawer from './components/NewVendorDrawer'
import VendorDetailModal from './components/VendorDetailModal'

type Tab = 'all' | 'inactive'

const btnPrimary =
  'inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors'
const btnSecondary =
  'inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors'

export default function VendorsPage() {
  const { vendors, deleteVendor, restoreVendor, updateVendor, addVendor } = useVendors()

  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [actionsOpen, setActionsOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeVendors = useMemo(() => vendors.filter(v => v.status === 'ACTIVE' && !v.deletedAt), [vendors])
  const deletedVendors = useMemo(() => vendors.filter(v => v.status === 'INACTIVE' || !!v.deletedAt), [vendors])

  const filteredActive = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return activeVendors
    return activeVendors.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.companyName.toLowerCase().includes(q) ||
      v.phone.includes(q) ||
      v.email.toLowerCase().includes(q),
    )
  }, [activeVendors, search])

  const filteredDeleted = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return deletedVendors
    return deletedVendors.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.companyName.toLowerCase().includes(q),
    )
  }, [deletedVendors, search])

  function handleDelete(id: string) {
    deleteVendor(id)
  }

  function handleRestore(id: string) {
    restoreVendor(id)
  }

  function handleStatusChange(id: string, status: 'ACTIVE' | 'INACTIVE') {
    updateVendor(id, { status })
  }

  async function handleSaveVendor(vendor: Vendor, logoFile?: File, newDocs?: any[], deletedDocIds?: string[]) {
    try {
      setSaving(true)
      setError(null)
      if (editingVendor) {
        await updateVendor(editingVendor.id, vendor, logoFile, newDocs, deletedDocIds)
        setEditingVendor(null)
      } else {
        await addVendor(vendor, logoFile, newDocs)
      }
      setDrawerOpen(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to save vendor')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(vendor: Vendor) {
    setEditingVendor(vendor)
    setDrawerOpen(true)
  }

  function handleView(vendor: Vendor) {
    setViewingVendor(vendor)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditingVendor(null)
    setError(null)
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'all', label: 'All Vendors', count: activeVendors.length },
    { key: 'inactive', label: 'Inactive Vendors', count: deletedVendors.length },
  ]

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-2 mb-5">
        <h1 className="text-xl font-bold text-gray-900">Vendors</h1>
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
              placeholder="Search vendors by name, company, phone etc."
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
              New Vendor
            </button>
          </div>
        </div>

        {/* Table content */}
        <div className="px-4 py-2 min-h-[300px]">
          {tab === 'all' && (
            <VendorTable vendors={filteredActive} tab="all" onDelete={handleDelete} onRestore={handleRestore} onStatusChange={handleStatusChange} onEdit={handleEdit} onView={handleView} />
          )}
          {tab === 'inactive' && (
            <VendorTable vendors={filteredDeleted} tab="inactive" onDelete={handleDelete} onRestore={handleRestore} onEdit={handleEdit} onView={handleView} />
          )}
        </div>

        {/* Footer */}
        {(tab === 'all' || tab === 'inactive') && (
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {tab === 'all'
                ? `Showing ${filteredActive.length} of ${activeVendors.length} vendors`
                : `${filteredDeleted.length} inactive vendor${filteredDeleted.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        )}
      </div>

      <NewVendorDrawer open={drawerOpen} onClose={closeDrawer} onSave={handleSaveVendor} initialVendor={editingVendor} saving={saving} error={error} />
      <VendorDetailModal vendor={viewingVendor} onClose={() => setViewingVendor(null)} />
    </div>
  )
}
