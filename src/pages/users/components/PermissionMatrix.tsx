import React, { useState, useEffect } from 'react';
import { Shield, Save, CheckSquare, Square, ShieldAlert } from 'lucide-react';
import { useUserManagement } from '../../../contexts/UserManagementContext';
import type { Role, RolePermission } from '../../../types/user';

interface PermissionMatrixProps {
  role: Role | null;
}

// Module translations/friendly names
const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard / Analytics',
  customers: 'Customers Management',
  vendors: 'Vendors Management',
  employees: 'Employees Directory',
  expenses: 'Expense Management',
  projectedSales: 'Projected Sales',
  amcTracker: 'AMC Tracker',
  proformaInvoice: 'Proforma Invoice',
  taxInvoice: 'Tax Invoice',
  billingTracker: 'Billing Tracker',
  userManagement: 'User Management & RBAC',
  settings: 'System Settings',
};

const ALL_CAPABILITIES = ['canView', 'canCreate', 'canEdit', 'canDelete', 'canExport', 'canApprove'] as const;
type Capability = typeof ALL_CAPABILITIES[number];

export default function PermissionMatrix({ role }: PermissionMatrixProps) {
  const { updateRolePermissions } = useUserManagement();
  const [matrix, setMatrix] = useState<Partial<RolePermission>[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (role && role.permissions) {
      // Map current permissions
      setMatrix(
        role.permissions.map((perm) => ({
          moduleName: perm.moduleName,
          canView: perm.canView,
          canCreate: perm.canCreate,
          canEdit: perm.canEdit,
          canDelete: perm.canDelete,
          canExport: perm.canExport,
          canApprove: perm.canApprove,
        }))
      );
    } else {
      setMatrix([]);
    }
    setMessage(null);
  }, [role]);

  if (!role) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
        <Shield className="w-10 h-10 mb-2 text-gray-300" />
        <p className="text-sm font-medium">Select a role from the list to manage its permissions</p>
      </div>
    );
  }

  const isSuperAdmin = role.roleName === 'Super Admin';

  const handleCheckboxChange = (moduleName: string, field: Capability, value: boolean) => {
    if (isSuperAdmin) return;
    
    setMatrix((prev) =>
      prev.map((row) =>
        row.moduleName === moduleName ? { ...row, [field]: value } : row
      )
    );
  };

  const handleToggleModule = (moduleName: string, checkAll: boolean) => {
    if (isSuperAdmin) return;

    setMatrix((prev) =>
      prev.map((row) =>
        row.moduleName === moduleName
          ? {
              ...row,
              canView: checkAll,
              canCreate: checkAll,
              canEdit: checkAll,
              canDelete: checkAll,
              canExport: checkAll,
              canApprove: checkAll,
            }
          : row
      )
    );
  };

  const handleToggleColumn = (field: Capability, checkAll: boolean) => {
    if (isSuperAdmin) return;

    setMatrix((prev) =>
      prev.map((row) => ({
        ...row,
        [field]: checkAll,
      }))
    );
  };

  const handleSave = async () => {
    if (isSuperAdmin) return;
    
    try {
      setSaving(true);
      setMessage(null);
      await updateRolePermissions(role.id, matrix);
      setMessage({ type: 'success', text: 'Permissions matrix updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update permissions' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      {/* Title / Description Header */}
      <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-950 text-base">
              Permissions for role: <span className="text-indigo-600 font-bold">{role.roleName}</span>
            </h3>
            {isSuperAdmin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                System Role
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {role.description || 'No description provided.'}
          </p>
        </div>

        {!isSuperAdmin && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-70"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Matrix'}
          </button>
        )}
      </div>

      {isSuperAdmin && (
        <div className="px-6 py-3.5 bg-amber-50/60 border-b border-amber-100 flex gap-2.5 items-start text-xs text-amber-800 font-medium">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            The <strong>Super Admin</strong> role always has full permissions across all modules by default. These settings are system-defined and cannot be customized.
          </span>
        </div>
      )}

      {message && (
        <div
          className={`px-6 py-3 border-b text-xs font-medium ${
            message.type === 'success'
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-red-50 border-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Permissions Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-200">
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[200px]">
                Module / Feature Area
              </th>
              {ALL_CAPABILITIES.map((cap) => {
                const label = cap.replace('can', '');
                return (
                  <th
                    key={cap}
                    className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span>{label}</span>
                      {!isSuperAdmin && (
                        <div className="flex gap-1 mt-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleToggleColumn(cap, true)}
                            className="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                          >
                            All
                          </button>
                          <span className="text-gray-300">/</span>
                          <button
                            type="button"
                            onClick={() => handleToggleColumn(cap, false)}
                            className="text-gray-400 hover:text-gray-600 hover:underline cursor-pointer"
                          >
                            None
                          </button>
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
              {!isSuperAdmin && (
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                  Quick Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {matrix.map((row) => (
              <tr
                key={row.moduleName}
                className={`hover:bg-gray-50/50 transition-colors ${
                  isSuperAdmin ? 'opacity-85' : ''
                }`}
              >
                <td className="px-6 py-3.5">
                  <span className="text-sm font-semibold text-gray-900 block">
                    {MODULE_LABELS[row.moduleName || ''] || row.moduleName}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                    {row.moduleName}
                  </span>
                </td>
                {ALL_CAPABILITIES.map((cap) => (
                  <td key={cap} className="px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={!!row[cap]}
                      disabled={isSuperAdmin}
                      onChange={(e) =>
                        handleCheckboxChange(row.moduleName!, cap, e.target.checked)
                      }
                      className="w-4.5 h-4.5 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500/30 disabled:text-indigo-400 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </td>
                ))}
                {!isSuperAdmin && (
                  <td className="px-6 py-3.5 text-right space-x-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleModule(row.moduleName!, true)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      Allow All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleModule(row.moduleName!, false)}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
                    >
                      Clear
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isSuperAdmin && (
        <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-70"
          >
            <Save size={15} />
            {saving ? 'Saving changes...' : 'Save Matrix Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
