export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface RolePermission {
  id: string;
  roleId: string;
  moduleName: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canApprove: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Role {
  id: string;
  roleName: string;
  description: string | null;
  isSystemRole: boolean;
  permissions?: RolePermission[];
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string | null;
  roleId: string;
  role: {
    id: string;
    roleName: string;
    description: string | null;
  };
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}
