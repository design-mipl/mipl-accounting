import { useState, useEffect } from 'react'
import {
  UserPlus, SlidersHorizontal, Search, ChevronDown,
  HelpCircle, Download, Upload, Calendar, ChevronLeft, ChevronRight
} from 'lucide-react'
import clsx from 'clsx'
import { useVendors } from '../../contexts/VendorContext'
import { useToast } from '../../contexts/ToastContext'
import type { Vendor } from '../../types/vendor'
import VendorTable from './components/VendorTable'
import NewVendorDrawer from './components/NewVendorDrawer'
import VendorDetailModal from './components/VendorDetailModal'
import BulkUploadVendorDrawer from './components/BulkUploadVendorDrawer'
import * as XLSX from 'xlsx'
import DeleteConfirmationModal from '../../components/common/DeleteConfirmationModal'

const btnPrimary =
  'inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm'
const btnSecondary =
  'inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors shadow-xs'

type DateFilterPreset = 'all' | 'today' | '7days' | '30days' | 'custom'

export default function VendorsPage() {
  const {
    vendors,
    loading,
    page,
    limit,
    totalPages,
    totalCount,
    search,
    vendorType,
    startDate,
    endDate,
    active,
    setPage,
    setLimit,
    setSearch,
    setVendorType,
    setDateRange,
    setActive,
    deleteVendor,
    restoreVendor,
    updateVendor,
    addVendor,
  } = useVendors()
  const { showSuccess, showError, showWarning } = useToast()

  const [searchInput, setSearchInput] = useState(search)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importDrawerOpen, setImportDrawerOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingVendorId, setDeletingVendorId] = useState<string | null>(null)
  const [deletingVendorName, setDeletingVendorName] = useState<string>('')

  // Filters UI State
  const [showFilters, setShowFilters] = useState(false)
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Sync search input
  useEffect(() => {
    setSearchInput(search)
  }, [search])

  // Debounced search logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput)
      }
    }, 400)

    return () => clearTimeout(delayDebounceFn)
  }, [searchInput, setSearch, search])

  // Handle Preset Date Filter Changes
  const handlePresetChange = (selectedPreset: DateFilterPreset) => {
    setDatePreset(selectedPreset)
    const todayStr = new Date().toISOString().split('T')[0]
    
    if (selectedPreset === 'all') {
      setDateRange('', '')
    } else if (selectedPreset === 'today') {
      setDateRange(todayStr, todayStr)
    } else if (selectedPreset === '7days') {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)
      const pastStr = pastDate.toISOString().split('T')[0]
      setDateRange(pastStr, todayStr)
    } else if (selectedPreset === '30days') {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 30)
      const pastStr = pastDate.toISOString().split('T')[0]
      setDateRange(pastStr, todayStr)
    }
  }

  // Handle Custom Date Filter Apply
  const applyCustomDates = () => {
    if (customStart || customEnd) {
      setDateRange(customStart, customEnd)
    }
  }

  // Handle Clear All Filters
  const handleClearAllFilters = () => {
    setSearchInput('')
    setSearch('')
    setVendorType('')
    setDatePreset('all')
    setCustomStart('')
    setCustomEnd('')
    setDateRange('', '')
  }

  function handleDelete(id: string, name?: string) {
    setDeletingVendorId(id)
    setDeletingVendorName(name || id)
    setDeleteModalOpen(true)
  }

  function handleDeleteConfirm(isHardDelete: boolean) {
    if (!deletingVendorId) return
    deleteVendor(deletingVendorId, isHardDelete)
      .then(() => {
        showSuccess(isHardDelete ? 'Vendor permanently deleted' : 'Vendor soft deleted successfully')
      })
      .catch(err => {
        console.error(err)
        showError(err.message || 'Failed to delete vendor')
      })
      .finally(() => {
        setDeleteModalOpen(false)
        setDeletingVendorId(null)
      })
  }

  const handleExportVendors = async () => {
    try {
      const token = sessionStorage.getItem('token')
      const res = await fetch('/api/vendors?limit=100000', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      })
      if (!res.ok) throw new Error('Failed to fetch vendors for export')
      const body = await res.json()
      const allVendors = body.data?.vendors || []

      if (allVendors.length === 0) {
        showWarning('No vendors found to export.')
        return
      }

      const exportData = allVendors.map((v: any) => ({
        "Vendor Type": v.vendorType === "COMPANY" ? "Company" : "Individual",
        "Company Name": v.companyName || "",
        "Vendor Name": v.vendorName,
        "Phone Number": v.phoneNumber,
        "Email": v.email,
        "CC Emails": v.ccEmails ? v.ccEmails.join(', ') : "",
        "Status": v.status,
        "GST Applicable": v.gstApplicable ? "Yes" : "No",
        "GSTIN Number": v.gstinNumber || "",
        "Verified GSTIN Name": v.verifiedGstinName || "",
        "PAN Number": v.panNumber || "",
        "PAN Name": v.panName || "",
        "TDS Applicable": v.tdsApplicable ? "Yes" : "No",
        "TDS Section": v.tdsSection || "",
        "TDS Percentage": v.tdsPercentage ? String(v.tdsPercentage) : "",
        "Address Line 1": v.addressLine1,
        "Address Line 2": v.addressLine2 || "",
        "City": v.city,
        "State": v.state,
        "Country": v.country || "India",
        "Pincode": v.pincode,
        "Bank Account Holder Name": v.bankAccountHolderName || "",
        "Bank Name": v.bankName || "",
        "Bank Account Number": v.bankAccountNumber || "",
        "Bank IFSC Code": v.bankIfscCode || "",
        "Bank SWIFT Code": v.bankSwiftCode || "",
        "Bank Branch Name": v.bankBranchName || ""
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Vendors")
      XLSX.writeFile(wb, "Vendors_Export.xlsx")
      setActionsOpen(false)
      showSuccess('Vendors exported successfully!')
    } catch (err: any) {
      console.error(err)
      showError(err.message || 'Failed to export vendors')
    }
  }

  function handleRestore(id: string) {
    restoreVendor(id)
      .then(() => {
        showSuccess('Vendor restored successfully')
      })
      .catch(err => {
        console.error(err)
        showError(err.message || 'Failed to restore vendor')
      })
  }

  function handleStatusChange(id: string, status: 'ACTIVE' | 'INACTIVE') {
    updateVendor(id, { status })
      .then(() => {
        showSuccess(`Vendor status changed to ${status.toLowerCase()}`)
      })
      .catch(err => {
        console.error(err)
        showError(err.message || 'Failed to change vendor status')
      })
  }

  async function handleSaveVendor(vendor: Vendor, logoFile?: File, newDocs?: any[], deletedDocIds?: string[]) {
    try {
      setSaving(true)
      setError(null)
      if (editingVendor) {
        await updateVendor(editingVendor.id, vendor, logoFile, newDocs, deletedDocIds)
        setEditingVendor(null)
        showSuccess('Vendor updated successfully')
      } else {
        await addVendor(vendor, logoFile, newDocs)
        showSuccess('Vendor created successfully')
      }
      setDrawerOpen(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to save vendor')
      showError(err.message || 'Failed to save vendor')
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

  const currentTab = active === 'false' ? 'inactive' : 'all'

  const TABS: { key: 'all' | 'inactive'; label: string; count?: number }[] = [
    { key: 'all', label: 'All Vendors', count: currentTab === 'all' ? totalCount : undefined },
    { key: 'inactive', label: 'Inactive Vendors', count: currentTab === 'inactive' ? totalCount : undefined },
  ]

  // Pagination calculation
  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, totalCount)

  // Generate page numbers
  const pageNumbers = []
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i)
  }

  const hasActiveFilters = search || vendorType || datePreset !== 'all' || customStart || customEnd

  return (
    <div className="max-w-[1200px] mx-auto pb-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">Vendors</h1>
          <button
            title="Help"
            className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
          >
            <HelpCircle size={12} />
          </button>
        </div>

        <button onClick={() => setDrawerOpen(true)} className={btnPrimary}>
          <UserPlus size={14} />
          New Vendor
        </button>
      </div>

      {/* Card container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-gray-100 px-4 shrink-0 bg-white">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActive(t.key === 'all' ? 'true' : 'false')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-3.5 text-sm font-medium border-b-2 transition-colors -mb-px cursor-pointer',
                currentTab === t.key
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-500 border-transparent hover:text-gray-800',
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={clsx(
                  'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold transition-all',
                  currentTab === t.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500',
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + actions row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search vendors by name, company, phone etc."
              className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-gray-400 transition-shadow shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                btnSecondary,
                hasActiveFilters && 'border-indigo-200 bg-indigo-50/20 text-indigo-700 hover:bg-indigo-50/40'
              )}
            >
              <SlidersHorizontal size={14} />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              )}
            </button>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleClearAllFilters}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors py-1.5 px-2 cursor-pointer"
              >
                Clear Filters
              </button>
            )}

            <div className="relative ml-auto sm:ml-0">
              <button
                onClick={() => setActionsOpen(o => !o)}
                className={btnSecondary}
              >
                Actions
                <ChevronDown size={13} className={clsx('transition-transform', actionsOpen && 'rotate-180')} />
              </button>
              {actionsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl border border-gray-200 shadow-lg z-20 py-1 overflow-hidden">
                    <button
                      onClick={handleExportVendors}
                      className="flex items-center gap-2 w-full px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <Download size={14} className="text-gray-400" />
                      Export Excel
                    </button>
                    <button
                      onClick={() => {
                        setImportDrawerOpen(true);
                        setActionsOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <Upload size={14} className="text-gray-400" />
                      Import Excel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible filter options panel */}
        {showFilters && (
          <div className="px-4 py-3.5 bg-gray-50 border-b border-gray-100 flex flex-col gap-4 animate-fade-in text-sm shrink-0">
            {/* Vendor Type Filter Row */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 w-24">Vendor Type:</span>
              <div className="flex items-center gap-1.5">
                {[
                  { key: '', label: 'All Types' },
                  { key: 'INDIVIDUAL', label: 'Individual' },
                  { key: 'COMPANY', label: 'Company' }
                ].map(type => (
                  <button
                    key={type.key}
                    onClick={() => setVendorType(type.key)}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer',
                      vendorType === type.key
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Created Date Preset Row */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 border-t border-gray-100 pt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-gray-500 w-24">Created Date:</span>
                {(['all', 'today', '7days', '30days', 'custom'] as DateFilterPreset[]).map(preset => (
                  <button
                    key={preset}
                    onClick={() => handlePresetChange(preset)}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer',
                      datePreset === preset
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    )}
                  >
                    {preset === 'all' && 'All Time'}
                    {preset === 'today' && 'Today'}
                    {preset === '7days' && 'Past 7 Days'}
                    {preset === '30days' && 'Past 30 Days'}
                    {preset === 'custom' && 'Custom Range'}
                  </button>
                ))}
              </div>

              {/* Custom dates picker picker */}
              {datePreset === 'custom' && (
                <div className="flex items-center gap-2 border-t md:border-t-0 border-gray-100 pt-3 md:pt-0 md:pl-4 md:border-l">
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
          </div>
        )}

        {/* Table content */}
        <div className="px-4 py-2 min-h-[300px] flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-100 shadow-md">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-gray-600">Loading vendors...</span>
              </div>
            </div>
          ) : null}

          <VendorTable
            vendors={vendors}
            tab={currentTab}
            onDelete={handleDelete}
            onRestore={handleRestore}
            onStatusChange={handleStatusChange}
            onEdit={handleEdit}
            onView={handleView}
          />
        </div>

        {/* Footer / Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-gray-100 bg-gray-50/50 shrink-0">
          {/* Total Info & Entries Page Limit Select */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              {totalCount > 0 ? (
                <>Showing <b className="font-semibold text-gray-800">{startIndex}</b> to <b className="font-semibold text-gray-800">{endIndex}</b> of <b className="font-semibold text-gray-800">{totalCount}</b> entries</>
              ) : (
                'No entries to show'
              )}
            </span>
            <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
              <span>Show</span>
              <select
                value={limit}
                onChange={e => setLimit(Number(e.target.value))}
                className="px-1.5 py-1 text-xs border border-gray-200 rounded-md bg-white text-gray-700 outline-none focus:border-indigo-400 font-semibold cursor-pointer"
              >
                {[5, 10, 25, 50].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              {/* Previous page button */}
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>

              {/* Number buttons */}
              <div className="flex items-center gap-1.5">
                {pageNumbers.map(num => (
                  <button
                    key={num}
                    onClick={() => setPage(num)}
                    className={clsx(
                      'w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs',
                      page === num
                        ? 'bg-indigo-600 border-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Next page button */}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      <NewVendorDrawer open={drawerOpen} onClose={closeDrawer} onSave={handleSaveVendor} initialVendor={editingVendor} saving={saving} error={error} />
      <VendorDetailModal vendor={viewingVendor} onClose={() => setViewingVendor(null)} />
      <BulkUploadVendorDrawer open={importDrawerOpen} onClose={() => setImportDrawerOpen(false)} />
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        title="Delete Vendor"
        message="Choose how you want to delete this vendor. Soft delete hides the record but keeps data intact. Hard delete is permanent."
        itemName={deletingVendorName}
        onClose={() => { setDeleteModalOpen(false); setDeletingVendorId(null); }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
