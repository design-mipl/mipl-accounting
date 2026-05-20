import { X, User } from 'lucide-react'
import { useEffect, useRef } from 'react'
import NewCustomerForm, { type NewCustomerFormRef } from './NewCustomerForm'
import type { Customer } from '../../../types/customer'

export default function NewCustomerDrawer({
  open,
  onClose,
  onSave,
  initialCustomer,
  saving = false,
  error = null,
}: {
  open: boolean
  onClose: () => void
  onSave?: (customer: Customer, logoFile?: File, newDocs?: any[], deletedDocIds?: string[]) => void
  initialCustomer?: Customer | null
  saving?: boolean
  error?: string | null
}) {
  const formRef = useRef<NewCustomerFormRef>(null)
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <User size={15} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{initialCustomer ? 'Edit Customer' : 'New Customer'}</h2>
              <p className="text-xs text-gray-400">{initialCustomer ? 'Update the customer details' : 'Fill in the customer details'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-hidden">
          <NewCustomerForm ref={formRef} onSave={onSave} onClose={onClose} initialCustomer={initialCustomer} open={open} error={error} />
        </div>

        {/* Error message */}
        {error && !error.includes('Validation failed') && (
          <div className="px-5 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600 whitespace-pre-wrap leading-relaxed">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => formRef.current?.handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </div>
    </>
  )
}
