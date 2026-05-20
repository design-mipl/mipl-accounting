import { X, User, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Employee } from '../../../types/employee'

type Props = {
  open: boolean
  onClose: () => void
  onSave: (name: string) => Promise<void>
  initialEmployee?: Employee | null
  saving?: boolean
  error?: string | null
}

export default function NewEmployeeDrawer({
  open,
  onClose,
  onSave,
  initialEmployee,
  saving,
  error: apiError,
}: Props) {
  const [name, setName] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (initialEmployee) {
      setName(initialEmployee.name)
    } else {
      setName('')
    }
    setValidationError(null)
  }, [initialEmployee, open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (name.trim().length < 2) {
      setValidationError('Employee name must be at least 2 characters long')
      return
    }

    try {
      setValidationError(null)
      await onSave(name.trim())
    } catch (err: any) {
      // Handled by parent container via apiError prop
    }
  }

  const activeError = validationError || apiError

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[450px] bg-white shadow-2xl z-50 flex flex-col transition-transform transform translate-x-0 animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <User size={15} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {initialEmployee ? 'Edit Employee' : 'New Employee'}
              </h2>
              <p className="text-xs text-gray-400">
                {initialEmployee ? 'Update the employee details' : 'Fill in the employee details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error message */}
        {activeError && !activeError.includes('Validation failed') && !activeError.includes('at least 2 characters') && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-start gap-2 text-xs text-red-600">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span className="whitespace-pre-wrap leading-relaxed">{activeError}</span>
          </div>
        )}

        {/* Form content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value)
                if (e.target.value.trim().length >= 2) {
                  setValidationError(null)
                }
              }}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-gray-400 transition-shadow"
              autoFocus
            />
            {activeError && (
              <p className="mt-1 text-xs text-red-500 font-medium">{activeError}</p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : initialEmployee ? 'Update Employee' : 'Save Employee'}
          </button>
        </div>
      </div>
    </>
  )
}
