import { Eye, Pencil, RotateCcw, Phone, Mail, Building2, Eye as EyeIcon, Trash2, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { Vendor } from '../../../types/vendor'
import InitialsAvatar from '../../customers/components/InitialsAvatar'
import clsx from 'clsx'

type Props = {
  vendors: Vendor[]
  tab: 'all' | 'inactive'
  onDelete: (id: string) => void
  onRestore: (id: string) => void
  onStatusChange?: (id: string, status: 'ACTIVE' | 'INACTIVE') => void
  onEdit?: (vendor: Vendor) => void
  onView?: (vendor: Vendor) => void
}

function StatusToggle({ status, onChange }: { status: 'ACTIVE' | 'INACTIVE'; onChange: (s: 'ACTIVE' | 'INACTIVE') => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
          status?.toUpperCase() === 'ACTIVE'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-gray-50 text-gray-700 border border-gray-200',
        )}
      >
        {status?.toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive'}
        <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-gray-200 rounded shadow-lg z-20 overflow-hidden">
            <button
              onClick={() => {
                onChange('ACTIVE')
                setOpen(false)
              }}
              className="block w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 text-gray-700"
            >
              Active
            </button>
            <button
              onClick={() => {
                onChange('INACTIVE')
                setOpen(false)
              }}
              className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-gray-700 border-t border-gray-100"
            >
              Inactive
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function VendorTable({ vendors, tab, onDelete, onRestore, onStatusChange, onEdit, onView }: Props) {
  if (vendors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
          <Building2 size={20} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-600">No vendors found</p>
        <p className="text-xs text-gray-400 mt-1">Try adjusting your search or add a new vendor.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-6 pl-2 w-[220px]">
              Vendor Name
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-6 w-[200px]">
              Contact Info
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-6 w-[140px]">
              GST
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-6 w-[140px]">
              Status
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-6 flex-1">
              Bank Name
            </th>
            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4 w-[100px]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {vendors.map(vendor => (
            <tr key={vendor.id} className="group hover:bg-gray-50/70 transition-colors">
              {/* Vendor Name */}
              <td className="py-3 pr-6 pl-2">
                <div className="flex items-center gap-2.5">
                  <InitialsAvatar name={vendor.companyName || vendor.name} imageUrl={vendor.clientLogo} />
                  <div>
                    <p className="font-medium text-gray-900 leading-tight">{vendor.companyName || vendor.name}</p>
                    {vendor.companyName && vendor.name && (
                      <p className="text-xs text-gray-400 mt-0.5">{vendor.name}</p>
                    )}
                  </div>
                </div>
              </td>

              {/* Contact Info */}
              <td className="py-3 pr-6">
                <div className="flex flex-col gap-1">
                  {vendor.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Phone size={11} className="text-gray-400 shrink-0" />
                      {vendor.phone}
                    </div>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Mail size={11} className="text-gray-400 shrink-0" />
                      <span className="truncate max-w-[150px]">{vendor.email}</span>
                    </div>
                  )}
                  {!vendor.phone && !vendor.email && (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>
              </td>

              {/* GST */}
              <td className="py-3 pr-4">
                {vendor.gstin ? (
                  <p className="text-xs font-mono text-gray-600 bg-gray-50 border border-gray-100 rounded px-2 py-1 inline-block w-fit">
                    {vendor.gstin}
                  </p>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </td>

              {/* Status */}
              <td className="py-3 pr-4">
                {tab === 'inactive' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    Inactive
                  </span>
                ) : (
                  <StatusToggle
                    status={vendor.status}
                    onChange={(s) => onStatusChange?.(vendor.id, s)}
                  />
                )}
              </td>

              {/* Bank Name */}
              <td className="py-3 pr-4">
                <p className="text-xs text-gray-600 truncate">
                  {vendor.bankName || '—'}
                </p>
              </td>

              {/* Actions */}
              <td className="py-3 pr-4">
                <div className="flex items-center justify-end gap-1">
                  {tab === 'inactive' ? (
                    <button
                      onClick={() => onRestore(vendor.id)}
                      title="Restore"
                      className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      <RotateCcw size={16} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => onView?.(vendor)}
                        title="View"
                        className="p-1.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        <EyeIcon size={16} />
                      </button>
                      <button
                        onClick={() => onEdit?.(vendor)}
                        title="Edit"
                        className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(vendor.id)}
                        title="Delete"
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
