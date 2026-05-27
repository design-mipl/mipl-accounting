import React, { useState } from 'react';
import { Shield, Plus, Trash2, Edit3, Lock, AlertCircle, Info } from 'lucide-react';
import { useUserManagement } from '../../contexts/UserManagementContext';
import PermissionMatrix from './components/PermissionMatrix';
import type { Role } from '../../types/user';
import { useToast } from '../../contexts/ToastContext';
import DeleteConfirmationModal from '../../components/common/DeleteConfirmationModal';

export default function RolesPermissionsPage() {
  const { roles, createRole, deleteRole, loadingRoles } = useUserManagement();
  const { showSuccess, showError } = useToast();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // Create Role Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  // Sync selected role when roles list updates
  const currentRole = roles.find((r) => r.id === selectedRole?.id) || roles[0] || null;

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newRoleName.trim()) {
      setCreateError('Role name is required');
      return;
    }

    try {
      setCreateLoading(true);
      await createRole({
        roleName: newRoleName.trim(),
        description: newRoleDesc.trim() || undefined,
      });
      showSuccess(`Role "${newRoleName.trim()}" created successfully.`, 'Role Created');
      setNewRoleName('');
      setNewRoleDesc('');
      setShowCreateModal(false);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create role');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteRole = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const roleToDelete = roles.find(r => r.id === id);
    if (roleToDelete) {
      setDeletingRole(roleToDelete);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = async (isHardDelete: boolean) => {
    if (!deletingRole) return;
    try {
      await deleteRole(deletingRole.id, isHardDelete);
      showSuccess(isHardDelete ? 'Role permanently deleted.' : 'Role soft deleted successfully.', 'Role Deleted');
      if (selectedRole?.id === deletingRole.id) {
        setSelectedRole(null);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to delete role', 'Delete Failed');
    } finally {
      setDeleteModalOpen(false);
      setDeletingRole(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Roles List Panel */}
      <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">User Roles</h3>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Plus size={13} />
            Add Role
          </button>
        </div>

        {loadingRoles ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading roles...</div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {roles.map((role) => {
              const isSelected = currentRole?.id === role.id;
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'border-indigo-200 bg-indigo-50/40 shadow-xs'
                      : 'border-gray-100 bg-white hover:bg-gray-50/50'
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-sm font-semibold ${
                          isSelected ? 'text-indigo-950' : 'text-gray-950'
                        }`}
                      >
                        {role.roleName}
                      </span>
                      {role.isSystemRole && (
                        <span className="p-0.5 rounded-md bg-gray-100 text-gray-400">
                          <Lock size={10} />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {role.description || 'No description provided.'}
                    </p>
                  </div>

                  {!role.isSystemRole && (
                    <button
                      onClick={(e) => handleDeleteRole(role.id, e)}
                      className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-gray-100/50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 size={13.5} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex gap-2 items-start text-[11px] text-gray-500 leading-normal">
          <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
          <span>
            Roles group users and hold module permission matrices. System roles like Super Admin cannot be modified.
          </span>
        </div>
      </div>

      {/* Permission Matrix Panel */}
      <div className="lg:col-span-2">
        <PermissionMatrix role={currentRole} />
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-950">Create New Role</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 text-xs text-red-600 bg-red-50 rounded-lg border border-red-100">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Role Name
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Sales Manager, Accountant"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Description
                </label>
                <textarea
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                  placeholder="Explain what capabilities users in this role possess..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-75"
                >
                  {createLoading ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        title="Delete Role"
        message="Choose how you want to delete this role. Soft delete preserves associated historical data. Hard delete is permanent."
        itemName={deletingRole?.roleName || ''}
        onClose={() => { setDeleteModalOpen(false); setDeletingRole(null); }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

// Inline mini helper since we need X icon
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
