import { X, Phone, Mail, Building2, MapPin, DollarSign, FileText } from 'lucide-react'
import type { Customer } from '../../../types/customer'

export default function CustomerDetailModal({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  if (!customer) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Building2 size={15} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Customer Details</h2>
              <p className="text-xs text-gray-400">{customer.companyName || customer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Company Info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Company Information</h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">Company Name</p>
                <p className="text-sm font-medium text-gray-900">{customer.companyName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Contact Person</p>
                <p className="text-sm font-medium text-gray-900">{customer.name}</p>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact Information</h3>
            <div className="space-y-2">
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" />
                  <p className="text-sm text-gray-900">{customer.phone}</p>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" />
                  <p className="text-sm text-gray-900">{customer.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tax Info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tax Information</h3>
            <div className="space-y-3">
              {customer.gstin && (
                <div>
                  <p className="text-xs text-gray-500">GSTIN</p>
                  <p className="text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{customer.gstin}</p>
                </div>
              )}
              {customer.gstinName && (
                <div>
                  <p className="text-xs text-gray-500">GSTIN Name</p>
                  <p className="text-sm text-gray-900">{customer.gstinName}</p>
                </div>
              )}
              {customer.pan && (
                <div>
                  <p className="text-xs text-gray-500">PAN</p>
                  <p className="text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{customer.pan}</p>
                </div>
              )}
              {customer.panName && (
                <div>
                  <p className="text-xs text-gray-500">PAN Name</p>
                  <p className="text-sm text-gray-900">{customer.panName}</p>
                </div>
              )}
              {customer.tdsPercentage && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-600 font-semibold">TDS Percentage</p>
                  <p className="text-lg font-bold text-amber-700">{customer.tdsPercentage}%</p>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Address</h3>
            <div className="space-y-2">
              {customer.address1 && (
                <p className="text-sm text-gray-900">{customer.address1}</p>
              )}
              {customer.address2 && (
                <p className="text-sm text-gray-900">{customer.address2}</p>
              )}
              <p className="text-sm text-gray-900 font-medium">
                {[customer.city, customer.state, customer.country, customer.pincode].filter(Boolean).join(' ')}
              </p>
            </div>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Notes</h3>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">{customer.notes}</p>
            </div>
          )}

          {/* Status */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status</h3>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
                customer.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-gray-50 text-gray-600'
              }`}
            >
              {customer.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Created Date */}
          {customer.createdAt && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Created</h3>
              <p className="text-sm text-gray-900">{new Date(customer.createdAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}
