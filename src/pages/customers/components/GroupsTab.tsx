import { Users, Trash2 } from 'lucide-react'
import type { CustomerGroup } from '../../../types/customer'

type Props = {
  groups: CustomerGroup[]
}

export default function GroupsTab({ groups }: Props) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
          <Users size={20} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-600">No groups yet</p>
        <p className="text-xs text-gray-400 mt-1">Create groups to organise your customers.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4 pl-2">
              Group Name
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">
              Customers
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">
              Created
            </th>
            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-2">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {groups.map(group => (
            <tr key={group.id} className="group hover:bg-gray-50/70 transition-colors">
              <td className="py-3 pr-4 pl-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                    <Users size={14} className="text-primary-500" />
                  </div>
                  <span className="font-medium text-gray-900">{group.name}</span>
                </div>
              </td>
              <td className="py-3 pr-4">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                  {group.customerCount} customers
                </span>
              </td>
              <td className="py-3 pr-4 text-xs text-gray-500">
                {new Date(group.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </td>
              <td className="py-3 pr-2">
                <div className="flex items-center justify-end gap-1">
                  <button className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
