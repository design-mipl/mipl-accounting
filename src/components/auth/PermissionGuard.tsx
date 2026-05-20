import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve';

export function usePermission(permission?: string): boolean {
  const { user } = useAuth();

  if (!user) return false;

  // Super Admin has bypass for all actions
  if (user.role === 'Super Admin') return true;

  if (!permission) return true;

  const parts = permission.split('.');
  if (parts.length !== 2) {
    console.error(`Invalid permission format requested: "${permission}". Expected "module.action"`);
    return false;
  }

  const [moduleName, action] = parts as [string, ActionType];
  const userPermissions = user.permissions || [];

  const modulePerm = userPermissions.find(
    (p) => p.moduleName.toLowerCase() === moduleName.toLowerCase()
  );

  if (!modulePerm) return false;

  switch (action.toLowerCase()) {
    case 'view':
      return modulePerm.canView;
    case 'create':
      return modulePerm.canCreate;
    case 'edit':
      return modulePerm.canEdit;
    case 'delete':
      return modulePerm.canDelete;
    case 'export':
      return modulePerm.canExport;
    case 'approve':
      return modulePerm.canApprove;
    default:
      console.error(`Unknown permission action: "${action}"`);
      return false;
  }
}

interface PermissionGuardProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGuard({ permission, fallback = null, children }: PermissionGuardProps) {
  const hasPermission = usePermission(permission);
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
