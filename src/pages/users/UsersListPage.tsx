import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldAlert,
  Search,
  UserPlus,
  Key,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Lock,
} from 'lucide-react';
import { useUserManagement } from '../../contexts/UserManagementContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePermission, PermissionGuard } from '../../components/auth/PermissionGuard';
import InitialsAvatar from '../customers/components/InitialsAvatar';
import UserFormDrawer from './components/UserFormDrawer';
import ResetPasswordModal from './components/ResetPasswordModal';
import RolesPermissionsPage from './RolesPermissionsPage';
import type { User } from '../../types/user';
import { useToast } from '../../contexts/ToastContext';

export default function UsersListPage() {
  const {
    users,
    roles,
    loadingUsers,
    page,
    limit,
    totalPages,
    totalCount,
    search,
    roleId,
    status,
    setPage,
    setLimit,
    setSearch,
    setRoleId,
    setStatus,
    updateUserStatus,
    deleteUser,
  } = useUserManagement();

  const { user: currentUser } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [searchInput, setSearchInput] = useState(search);

  // Drawer & Modal States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);

  // Permissions checks
  const canCreateUser = usePermission('userManagement.create');
  const canEditUser = usePermission('userManagement.edit');
  const canDeleteUser = usePermission('userManagement.delete');

  // Debounced search sync
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchInput, setSearch, search]);

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setDrawerOpen(true);
  };

  const handleCreateClick = () => {
    setEditingUser(null);
    setDrawerOpen(true);
  };

  const handleDeleteClick = async (user: User) => {
    if (user.id === currentUser?.id) {
      showWarning('You cannot delete your own account.', 'Action Blocked');
      return;
    }
    if (
      window.confirm(`Are you sure you want to delete user ${user.firstName} ${user.lastName}? This action soft-deletes the account.`)
    ) {
      try {
        await deleteUser(user.id);
        showSuccess(`User "${user.firstName} ${user.lastName}" deleted successfully.`, 'User Deleted');
      } catch (err: any) {
        showError(err.message || 'Failed to delete user.', 'Delete Failed');
      }
    }
  };

  const handleStatusToggle = async (user: User) => {
    if (user.id === currentUser?.id) {
      showWarning('You cannot deactivate your own account.', 'Action Blocked');
      return;
    }
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateUserStatus(user.id, newStatus);
      showSuccess(`User "${user.firstName} ${user.lastName}" status updated to ${newStatus.toLowerCase()} successfully.`, 'Status Updated');
    } catch (err: any) {
      showError(err.message || 'Failed to update status.', 'Status Update Failed');
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setRoleId('');
    setStatus('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management & Permissions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage administrative user profiles, roles assignments, and module access control capabilities.
          </p>
        </div>

        {activeTab === 'users' && canCreateUser && (
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <UserPlus size={16} />
            Create User
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
          <Users size={16} />
          Users Directory
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'roles'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
          <ShieldAlert size={16} />
          Roles & Permissions Matrix
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'users' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-sm border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Role Filter */}
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 bg-white"
              >
                <option value="">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roleName}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 bg-white"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              {(search || roleId || status) && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {totalCount} {totalCount === 1 ? 'user' : 'users'} found
            </div>
          </div>

          {/* Table Directory */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-200">
                    <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      User Details
                    </th>
                    <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Contact Mobile
                    </th>
                    <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Role Assigned
                    </th>
                    <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                        Loading user list directory...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                        No users match the search criteria.
                      </td>
                    </tr>
                  ) : (
                    users.map((item) => {
                      const isSelf = item.id === currentUser?.id;
                      const fullName = `${item.firstName} ${item.lastName}`;

                      return (
                        <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-3.5 flex items-center gap-3">
                            <InitialsAvatar name={fullName} size="md" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-gray-900">
                                  {fullName}
                                </span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 rounded-sm bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wide border border-indigo-100">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400 block">{item.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-sm text-gray-500">
                            {item.mobile || '—'}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                              {item.role?.roleName || 'No Role'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <button
                              disabled={isSelf || !canEditUser}
                              onClick={() => handleStatusToggle(item)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border ${item.status === 'ACTIVE'
                                  ? 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100/50'
                                  : 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100/50'
                                } disabled:opacity-85 disabled:cursor-not-allowed`}
                            >
                              {item.status === 'ACTIVE' ? (
                                <>
                                  <UserCheck size={11} />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <UserX size={11} />
                                  <span>Inactive</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-3.5 text-right space-x-1.5">
                            {canEditUser && (
                              <>
                                <button
                                  onClick={() => setResettingUser(item)}
                                  title="Reset Password"
                                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-55/40 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                                >
                                  <Key size={14} />
                                </button>
                                <button
                                  onClick={() => handleEditClick(item)}
                                  title="Edit Profile"
                                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-55/40 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                                >
                                  <Edit2 size={14} />
                                </button>
                              </>
                            )}

                            {canDeleteUser && (
                              <button
                                disabled={isSelf}
                                onClick={() => handleDeleteClick(item)}
                                title="Delete User"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-55/40 rounded-lg transition-colors cursor-pointer inline-flex items-center disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Rows per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="text-xs border border-gray-200 rounded-md py-1 px-2 bg-white focus:outline-hidden"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="p-1 text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                      className="p-1 text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <RolesPermissionsPage />
      )}

      {/* Form Drawer (Create / Edit) */}
      <UserFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={editingUser}
      />

      {/* Reset password Modal */}
      {resettingUser && (
        <ResetPasswordModal
          user={resettingUser}
          onClose={() => setResettingUser(null)}
        />
      )}
    </div>
  );
}
