import { X, Phone, Mail, Building2, MapPin, DollarSign, Landmark } from 'lucide-react'
import type { Vendor } from '../../../types/vendor'

export default function VendorDetailModal({ vendor, onClose }: { vendor: Vendor | null; onClose: () => void }) {
  if (!vendor) return null

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
              <h2 className="text-sm font-semibold text-gray-900">Vendor Details</h2>
              <p className="text-xs text-gray-400">{vendor.companyName || vendor.name}</p>
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
          {/* Basic Information */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Basic Information</h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">Vendor Type</p>
                <p className="text-sm font-medium text-gray-900">{vendor.vendorType === 'company' ? 'Company' : 'Individual'}</p>
              </div>
              {vendor.companyName && (
                <div>
                  <p className="text-xs text-gray-500">Company Name</p>
                  <p className="text-sm font-medium text-gray-900">{vendor.companyName}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">{vendor.vendorType === 'company' ? 'Contact Person' : 'Name'}</p>
                <p className="text-sm font-medium text-gray-900">{vendor.name}</p>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact Information</h3>
            <div className="space-y-2">
              {vendor.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" />
                  <p className="text-sm text-gray-900">{vendor.phone}</p>
                </div>
              )}
              {vendor.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" />
                  <p className="text-sm text-gray-900">{vendor.email}</p>
                </div>
              )}
              {vendor.ccEmails && vendor.ccEmails.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500">CC Emails</p>
                  <div className="space-y-1">
                    {vendor.ccEmails.map((email, idx) => (
                      <p key={idx} className="text-sm text-gray-900">{email}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tax Info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tax Information</h3>
            <div className="space-y-3">
              {vendor.gstin && (
                <div>
                  <p className="text-xs text-gray-500">GSTIN</p>
                  <p className="text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{vendor.gstin}</p>
                </div>
              )}
              {vendor.pan && (
                <div>
                  <p className="text-xs text-gray-500">PAN</p>
                  <p className="text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{vendor.pan}</p>
                </div>
              )}
              {vendor.panName && (
                <div>
                  <p className="text-xs text-gray-500">PAN Name</p>
                  <p className="text-sm text-gray-900">{vendor.panName}</p>
                </div>
              )}
              {vendor.tdsSection && (
                <div>
                  <p className="text-xs text-gray-500">TDS Section</p>
                  <p className="text-sm text-gray-900">{vendor.tdsSection}</p>
                </div>
              )}
              {vendor.tdsPercentage && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-600 font-semibold">TDS Percentage</p>
                  <p className="text-lg font-bold text-amber-700">{vendor.tdsPercentage}%</p>
                </div>
              )}
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Bank Information</h3>
            <div className="space-y-2">
              {vendor.bankName && (
                <div>
                  <p className="text-xs text-gray-500">Bank Name</p>
                  <p className="text-sm font-medium text-gray-900">{vendor.bankName}</p>
                </div>
              )}
              {vendor.accountHolderName && (
                <div>
                  <p className="text-xs text-gray-500">Account Holder Name</p>
                  <p className="text-sm text-gray-900">{vendor.accountHolderName}</p>
                </div>
              )}
              {vendor.accountNumber && (
                <div>
                  <p className="text-xs text-gray-500">Account Number</p>
                  <p className="text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{vendor.accountNumber}</p>
                </div>
              )}
              {vendor.ifscCode && (
                <div>
                  <p className="text-xs text-gray-500">IFSC Code</p>
                  <p className="text-sm font-mono text-gray-900">{vendor.ifscCode}</p>
                </div>
              )}
              {vendor.branchName && (
                <div>
                  <p className="text-xs text-gray-500">Branch Name</p>
                  <p className="text-sm text-gray-900">{vendor.branchName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Address</h3>
            <div className="space-y-2">
              {vendor.address1 && (
                <p className="text-sm text-gray-900">{vendor.address1}</p>
              )}
              {vendor.address2 && (
                <p className="text-sm text-gray-900">{vendor.address2}</p>
              )}
              <p className="text-sm text-gray-900 font-medium">
                {[vendor.city, vendor.state, vendor.country, vendor.pincode].filter(Boolean).join(' ')}
              </p>
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status</h3>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
                vendor.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-gray-50 text-gray-600'
              }`}
            >
              {vendor.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Created Date */}
          {vendor.createdAt && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Created</h3>
              <p className="text-sm text-gray-900">{new Date(vendor.createdAt).toLocaleDateString()}</p>
            </div>
          )}

          {/* Updated Date */}
          {vendor.updatedAt && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Last Updated</h3>
              <p className="text-sm text-gray-900">{new Date(vendor.updatedAt).toLocaleDateString()}</p>
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
