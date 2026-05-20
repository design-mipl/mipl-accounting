import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, Role, RolePermission, UserStatus } from '../types/user';
import { useAuth } from './AuthContext';

// API Helper
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = sessionStorage.getItem('token');
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`/api${endpoint}`, { ...options, headers });
  if (res.status === 401) {
    sessionStorage.removeItem('token');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'API request failed');
  }
  return res.json();
}

type UserManagementState = {
  users: User[];
  roles: Role[];
  loadingUsers: boolean;
  loadingRoles: boolean;
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
  search: string;
  roleId: string;
  status: string;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setRoleId: (roleId: string) => void;
  setStatus: (status: string) => void;
  fetchUsers: () => Promise<void>;
  fetchRoles: () => Promise<void>;
  createUser: (data: any) => Promise<void>;
  updateUser: (id: string, data: any) => Promise<void>;
  updateUserStatus: (id: string, status: UserStatus) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  resetPassword: (id: string, newPass: string) => Promise<void>;
  changePassword: (oldPass: string, newPass: string) => Promise<void>;
  createRole: (data: { roleName: string; description?: string }) => Promise<void>;
  updateRole: (id: string, data: { roleName?: string; description?: string }) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  updateRolePermissions: (id: string, permissions: Partial<RolePermission>[]) => Promise<void>;
};

const UserManagementContext = createContext<UserManagementState | null>(null);

export function UserManagementProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);

  // Filters & Pagination for Users
  const [page, setPageState] = useState(1);
  const [limit, setLimitState] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearchState] = useState('');
  const [roleId, setRoleIdState] = useState('');
  const [status, setStatusState] = useState('');

  const { token } = useAuth();

  const fetchUsers = async (
    currentPage = page,
    currentLimit = limit,
    currentSearch = search,
    currentRoleId = roleId,
    currentStatus = status
  ) => {
    if (!token) {
      setUsers([]);
      setLoadingUsers(false);
      return;
    }
    try {
      setLoadingUsers(true);
      const params = new URLSearchParams();
      params.append('page', String(currentPage));
      params.append('limit', String(currentLimit));
      if (currentSearch.trim()) params.append('search', currentSearch.trim());
      if (currentRoleId) params.append('roleId', currentRoleId);
      if (currentStatus) params.append('status', currentStatus);

      const data = await apiCall(`/users?${params.toString()}`);
      setUsers(data.data?.users || []);
      setTotalPages(data.data?.meta?.totalPages || 1);
      setTotalCount(data.data?.meta?.totalCount || 0);
    } catch (err: any) {
      console.error('Failed to fetch users:', err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRoles = async () => {
    if (!token) {
      setRoles([]);
      setLoadingRoles(false);
      return;
    }
    try {
      setLoadingRoles(true);
      const data = await apiCall('/roles');
      setRoles(data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch roles:', err.message);
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    fetchUsers(page, limit, search, roleId, status);
  }, [token, page, limit, search, roleId, status]);

  useEffect(() => {
    fetchRoles();
  }, [token]);

  const setPage = (p: number) => {
    setPageState(p);
  };

  const setLimit = (l: number) => {
    setLimitState(l);
    setPageState(1);
  };

  const setSearch = (s: string) => {
    setSearchState(s);
    setPageState(1);
  };

  const setRoleId = (r: string) => {
    setRoleIdState(r);
    setPageState(1);
  };

  const setStatus = (st: string) => {
    setStatusState(st);
    setPageState(1);
  };

  const value: UserManagementState = {
    users,
    roles,
    loadingUsers,
    loadingRoles,
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
    fetchUsers: () => fetchUsers(page, limit, search, roleId, status),
    fetchRoles,

    createUser: async (data) => {
      await apiCall('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await fetchUsers(page, limit, search, roleId, status);
    },

    updateUser: async (id, data) => {
      await apiCall(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      await fetchUsers(page, limit, search, roleId, status);
    },

    updateUserStatus: async (id, newStatus) => {
      await apiCall(`/users/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchUsers(page, limit, search, roleId, status);
    },

    deleteUser: async (id) => {
      await apiCall(`/users/${id}`, {
        method: 'DELETE',
      });
      const newCount = totalCount - 1;
      const newTotalPages = Math.ceil(newCount / limit) || 1;
      const targetPage = page > newTotalPages ? newTotalPages : page;
      setPageState(targetPage);
      await fetchUsers(targetPage, limit, search, roleId, status);
    },

    resetPassword: async (id, newPass) => {
      await apiCall(`/users/${id}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword: newPass }),
      });
    },

    changePassword: async (oldPass, newPass) => {
      await apiCall('/users/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
      });
    },

    createRole: async (data) => {
      await apiCall('/roles', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await fetchRoles();
    },

    updateRole: async (id, data) => {
      await apiCall(`/roles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      await fetchRoles();
    },

    deleteRole: async (id) => {
      await apiCall(`/roles/${id}`, {
        method: 'DELETE',
      });
      await fetchRoles();
    },

    updateRolePermissions: async (id, permissions) => {
      await apiCall(`/roles/${id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify(permissions),
      });
      await fetchRoles();
    },
  };

  return (
    <UserManagementContext.Provider value={value}>
      {children}
    </UserManagementContext.Provider>
  );
}

export function useUserManagement() {
  const ctx = useContext(UserManagementContext);
  if (!ctx) throw new Error('useUserManagement must be used inside <UserManagementProvider>');
  return ctx;
}
