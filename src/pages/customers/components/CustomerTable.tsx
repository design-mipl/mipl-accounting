import { Eye, Pencil, RotateCcw, Phone, Mail, Building2, Eye as EyeIcon, Trash2, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { Customer } from '../../../types/customer'
import InitialsAvatar from './InitialsAvatar'
import clsx from 'clsx'

type Props = {
  customers: Customer[]
  tab: 'all' | 'inactive'
  onDelete: (id: string) => void
  onRestore: (id: string) => void
  onStatusChange?: (id: string, status: 'ACTIVE' | 'INACTIVE') => void
  onEdit?: (customer: Customer) => void
  onView?: (customer: Customer) => void
}

function StatusToggle({ status, onChange }: { status: 'ACTIVE' | 'INACTIVE'; onChange: (s: 'ACTIVE' | 'INACTIVE') => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
          status === 'ACTIVE'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-gray-50 text-gray-700 border border-gray-200',
        )}
      >
        {status === 'ACTIVE' ? 'Active' : 'Inactive'}
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

export default function CustomerTable({ customers, tab, onDelete, onRestore, onStatusChange, onEdit, onView }: Props) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteValue, setEditingNoteValue] = useState('')

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
          <Building2 size={20} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-600">No customers found</p>
        <p className="text-xs text-gray-400 mt-1">Try adjusting your search or add a new customer.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-6 pl-2 w-[220px]">
              Company Name
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-6 w-[160px]">
              Owner
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-6 w-[180px]">
              Contact Info
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-6 w-[130px]">
              Location
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-6 w-[120px]">
              GST #
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-6 w-[100px]">
              Status
            </th>
            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4 w-[100px]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {customers.map(customer => (
            <tr key={customer.id} className="group hover:bg-gray-50/70 transition-colors">
              {/* Company Name */}
              <td className="py-3 pr-6 pl-2">
                <div className="flex items-center gap-2.5">
                  <InitialsAvatar name={customer.companyName} imageUrl={customer.clientLogo} />
                  <div>
                    <p className="font-medium text-gray-900 leading-tight">{customer.companyName}</p>
                  </div>
                </div>
              </td>

              {/* Owner */}
              <td className="py-3 pr-6">
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-medium text-gray-700">{customer.contactPerson}</p>
                </div>
              </td>

              {/* Contact Info */}
              <td className="py-3 pr-6">
                <div className="flex flex-col gap-1">
                  {customer.phoneNumber && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Phone size={11} className="text-gray-400 shrink-0" />
                      {customer.phoneNumber}
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Mail size={11} className="text-gray-400 shrink-0" />
                      <span className="truncate max-w-[150px]">{customer.email}</span>
                    </div>
                  )}
                  {(!customer.phoneNumber) && (!customer.email) && (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>
              </td>

              {/* Location */}
              <td className="py-3 pr-6">
                <p className="text-xs text-gray-600">
                  {customer.city && customer.state ? `${customer.city}, ${customer.state}` : customer.city || customer.state || '—'}
                </p>
              </td>

              {/* GST # */}
              <td className="py-3 pr-4">
                {customer.gstinNumber ? (
                  <p className="text-xs font-mono text-gray-600 bg-gray-50 border border-gray-100 rounded px-2 py-1 inline-block w-fit">
                    {customer.gstinNumber.substring(0, 10)}...
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
                    status={customer.status}
                    onChange={(s) => onStatusChange?.(customer.id, s)}
                  />
                )}
              </td>

              {/* Actions */}
              <td className="py-3 pr-4">
                <div className="flex items-center justify-end gap-1">
                  {tab === 'inactive' ? (
                    <button
                      onClick={() => onRestore(customer.id)}
                      title="Restore"
                      className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      <RotateCcw size={16} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => onView?.(customer)}
                        title="View"
                        className="p-1.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        <EyeIcon size={16} />
                      </button>
                      <button
                        onClick={() => onEdit?.(customer)}
                        title="Edit"
                        className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(customer.id)}
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
