import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from './PermissionGuard'

interface ProtectedRouteProps {
  requiredPermission?: string
}

export default function ProtectedRoute({ requiredPermission }: ProtectedRouteProps) {
  const { token, loading } = useAuth()
  const hasPermission = usePermission(requiredPermission)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (requiredPermission && !hasPermission) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
