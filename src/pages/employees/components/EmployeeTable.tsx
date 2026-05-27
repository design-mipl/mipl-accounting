import { Pencil, Trash2, User } from 'lucide-react'
import type { Employee } from '../../../types/employee'
import InitialsAvatar from '../../customers/components/InitialsAvatar'

type Props = {
  employees: Employee[]
  onDelete: (id: string, name?: string) => void
  onEdit: (employee: Employee) => void
}

export default function EmployeeTable({ employees, onDelete, onEdit }: Props) {
  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
          <User size={20} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-600">No employees found</p>
        <p className="text-xs text-gray-400 mt-1">Try adjusting your search or add a new employee.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-6 pl-2 flex-1">
              Employee Name
            </th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-6 w-[200px]">
              Created Date
            </th>
            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4 w-[120px]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {employees.map(employee => (
            <tr key={employee.id} className="group hover:bg-gray-50/70 transition-colors">
              {/* Employee Name */}
              <td className="py-3 pr-6 pl-2">
                <div className="flex items-center gap-2.5">
                  <InitialsAvatar name={employee.name} />
                  <div>
                    <p className="font-medium text-gray-900 leading-tight">{employee.name}</p>
                  </div>
                </div>
              </td>

              {/* Created Date */}
              <td className="py-3 pr-6">
                <p className="text-xs text-gray-600">
                  {new Date(employee.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </td>

              {/* Actions */}
              <td className="py-3 pr-4">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(employee)}
                    title="Edit"
                    className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(employee.id, employee.name)}
                    title="Delete"
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
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
