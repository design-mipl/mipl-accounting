import { useState, useEffect } from 'react'
import { UserPlus, Search, HelpCircle, Calendar, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { useEmployees } from '../../contexts/EmployeeContext'
import type { Employee } from '../../types/employee'
import EmployeeTable from './components/EmployeeTable'
import NewEmployeeDrawer from './components/NewEmployeeDrawer'
import clsx from 'clsx'
import { useToast } from '../../contexts/ToastContext'
import DeleteConfirmationModal from '../../components/common/DeleteConfirmationModal'

const btnPrimary =
  'inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm'
const btnSecondary =
  'inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors shadow-xs'

type DateFilterPreset = 'all' | 'today' | '7days' | '30days' | 'custom'

export default function EmployeesPage() {
  const {
    employees,
    loading,
    page,
    limit,
    totalPages,
    totalCount,
    search,
    startDate,
    endDate,
    setPage,
    setLimit,
    setSearch,
    setDateRange,
    addEmployee,
    updateEmployee,
    deleteEmployee,
  } = useEmployees()

  const { showSuccess, showError } = useToast()

  // Local state for search input (to avoid refetching on every single keypress, or allow instant feel with search trigger)
  const [searchInput, setSearchInput] = useState(search)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null)
  const [deletingEmployeeName, setDeletingEmployeeName] = useState<string>('')

  // Filters UI state
  const [showFilters, setShowFilters] = useState(false)
  const [preset, setPreset] = useState<DateFilterPreset>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Sync search input
  useEffect(() => {
    setSearchInput(search)
  }, [search])

  // Debounced search logic or simple trigger on submit/type
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
    setPreset(selectedPreset)
    
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

  const handleClearAllFilters = () => {
    setSearchInput('')
    setSearch('')
    setPreset('all')
    setCustomStart('')
    setCustomEnd('')
    setDateRange('', '')
  }

  async function handleSaveEmployee(name: string) {
    try {
      setSaving(true)
      setError(null)
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, name)
        showSuccess(`Employee "${name}" updated successfully.`, 'Employee Updated')
        setEditingEmployee(null)
      } else {
        await addEmployee(name)
        showSuccess(`Employee "${name}" created successfully.`, 'Employee Created')
      }
      setDrawerOpen(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to save employee')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(employee: Employee) {
    setEditingEmployee(employee)
    setDrawerOpen(true)
  }

  function handleDelete(id: string, name?: string) {
    setDeletingEmployeeId(id)
    setDeletingEmployeeName(name || id)
    setDeleteModalOpen(true)
  }

  function handleDeleteConfirm(isHardDelete: boolean) {
    if (!deletingEmployeeId) return
    deleteEmployee(deletingEmployeeId, isHardDelete)
      .then(() => {
        showSuccess(isHardDelete ? 'Employee permanently deleted' : 'Employee soft deleted successfully')
      })
      .catch(err => {
        console.error(err)
        showError(err.message || 'Failed to delete employee')
      })
      .finally(() => {
        setDeleteModalOpen(false)
        setDeletingEmployeeId(null)
      })
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditingEmployee(null)
    setError(null)
  }

  // Pagination calculation
  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, totalCount)

  // Generate page numbers
  const pageNumbers = []
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i)
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">Employees</h1>
          <button
            title="Help"
            className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
          >
            <HelpCircle size={12} />
          </button>
        </div>

        <button onClick={() => setDrawerOpen(true)} className={btnPrimary}>
          <UserPlus size={14} />
          New Employee
        </button>
      </div>

      {/* Main card container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* Search + Action Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search employees by name..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-gray-400 transition-shadow shadow-2xs"
            />
          </div>

          {/* Toggle Filter Panel */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              btnSecondary,
              (preset !== 'all' || search) && 'border-indigo-200 bg-indigo-50/20 text-indigo-700 hover:bg-indigo-50/40'
            )}
          >
            <SlidersHorizontal size={14} />
            Filters
            {(preset !== 'all' || search) && (
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            )}
          </button>

          {/* Clear Filters Button (If filtering is active) */}
          {(preset !== 'all' || search || customStart || customEnd) && (
            <button
              onClick={handleClearAllFilters}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors py-1.5 px-2"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Date Filter Panel */}
        {showFilters && (
          <div className="px-4 py-3.5 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-4 animate-fade-in">
            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 mr-1.5">Created Date:</span>
              {(['all', 'today', '7days', '30days', 'custom'] as DateFilterPreset[]).map(p => (
                <button
                  key={p}
                  onClick={() => handlePresetChange(p)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
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

            {/* Custom range dates picker */}
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
                  className="px-2.5 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        )}

        {/* Table Content */}
        <div className="px-4 py-2 min-h-[300px] flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-100 shadow-md">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-gray-600">Loading employees...</span>
              </div>
            </div>
          ) : null}

          <EmployeeTable
            employees={employees}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>

        {/* Footer / Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-gray-100 bg-gray-50/50 shrink-0">
          
          {/* Total Info & Page Limit selector */}
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

          {/* Navigation buttons */}
          {totalPages > 1 && (
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
                        ? 'bg-indigo-600 border-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
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
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      <NewEmployeeDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onSave={handleSaveEmployee}
        initialEmployee={editingEmployee}
        saving={saving}
        error={error}
      />
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        title="Delete Employee"
        message="Choose how you want to delete this employee. Soft delete hides the record but keeps data intact. Hard delete is permanent."
        itemName={deletingEmployeeName}
        onClose={() => { setDeleteModalOpen(false); setDeletingEmployeeId(null); }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
