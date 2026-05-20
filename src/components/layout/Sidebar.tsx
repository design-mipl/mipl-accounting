import { NavLink, useNavigate } from 'react-router-dom'
import {
  TrendingUp, ShoppingCart, FileText, Receipt, Package, Warehouse,
  CreditCard, Users, Store, Truck, FolderOpen, BarChart2,
  PieChart, Settings, UserPlus, Zap, ChevronDown, BookOpen,
  Shield,
} from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

type NavItem = {
  label: string
  icon: React.ReactNode
  path?: string
  permission?: string
  children?: { label: string; path: string; permission?: string }[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Sales', icon: <TrendingUp size={16} />,
    children: [
      { label: 'Projected Sale', path: '/sales/projects', permission: 'projectedSales.view' },
      { label: 'AMC Tracker', path: '/sales/amc', permission: 'amcTracker.view' },
      { label: 'Proforma Invoices', path: '/sales/proforma', permission: 'proformaInvoice.view' },
      { label: 'Tax Invoices', path: '/sales/tax-invoices', permission: 'taxInvoice.view' },
      { label: 'Billing Tracker', path: '/sales/billing', permission: 'billingTracker.view' },
    ],
  },
  {
    label: 'Expenses', icon: <Receipt size={16} />,
    children: [
      { label: 'Monthly Payment Register', path: '/expenses/monthly-payment', permission: 'expenses.view' },
      { label: 'Recurring Payments', path: '/expenses/recurring', permission: 'expenses.view' },
    ],
  },
  { label: 'Customers', icon: <Users size={16} />, path: '/customers', permission: 'customers.view' },
  { label: 'Vendors', icon: <Truck size={16} />, path: '/vendors', permission: 'vendors.view' },
  { label: 'Employees', icon: <UserPlus size={16} />, path: '/employees', permission: 'employees.view' },
]

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'User Management', icon: <Shield size={16} />, path: '/users', permission: 'userManagement.view' },
  { label: 'Settings', icon: <Settings size={16} />, path: '/settings', permission: 'settings.view' },
]

const sidebarItemBase =
  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer select-none w-full'

function NavGroup({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false)

  if (item.path) {
    return (
      <NavLink
        to={item.path}
        className={({ isActive }) =>
          clsx(
            sidebarItemBase,
            isActive
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
          )
        }
      >
        {item.icon}
        <span className="flex-1">{item.label}</span>
      </NavLink>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(sidebarItemBase, 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')}
      >
        {item.icon}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          size={14}
          className={clsx('text-gray-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && item.children && (
        <div className="ml-6 mt-0.5 flex flex-col gap-0.5">
          {item.children.map(child => (
            <NavLink
              key={child.path}
              to={child.path}
              className={({ isActive }) =>
                clsx(
                  sidebarItemBase,
                  'text-xs py-1.5',
                  isActive
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
                )
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const hasPermission = (permission?: string): boolean => {
    if (!user) return false
    if (user.role === 'Super Admin') return true
    if (!permission) return true

    const parts = permission.split('.')
    if (parts.length !== 2) return false
    const [moduleName, action] = parts
    const userPermissions = user.permissions || []
    const modulePerm = userPermissions.find(
      p => p.moduleName.toLowerCase() === moduleName.toLowerCase()
    )
    if (!modulePerm) return false

    switch (action.toLowerCase()) {
      case 'view':
        return modulePerm.canView
      case 'create':
        return modulePerm.canCreate
      case 'edit':
        return modulePerm.canEdit
      case 'delete':
        return modulePerm.canDelete
      case 'export':
        return modulePerm.canExport
      case 'approve':
        return modulePerm.canApprove
      default:
        return false
    }
  }

  const filteredNavItems = NAV_ITEMS.map(item => {
    if (item.children) {
      const filteredChildren = item.children.filter(child => hasPermission(child.permission))
      return { ...item, children: filteredChildren }
    }
    return item
  }).filter(item => {
    if (item.children) {
      return item.children.length > 0
    }
    return hasPermission(item.permission)
  })

  const filteredBottomItems = BOTTOM_ITEMS.filter(item => hasPermission(item.permission))

  return (
    <aside className="w-56 shrink-0 h-screen bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100 cursor-pointer"
        onClick={() => {
          // Go to first available route
          if (filteredNavItems.length > 0) {
            const first = filteredNavItems[0]
            if (first.path) navigate(first.path)
            else if (first.children && first.children.length > 0) navigate(first.children[0].path)
          } else {
            navigate('/customers')
          }
        }}
      >
        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
          <BookOpen size={14} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">Accounting Pro</p>
          <p className="text-[10px] text-gray-400 leading-tight">Your Business Name</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
        {filteredNavItems.map(item => (
          <NavGroup key={item.label} item={item} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-gray-100 flex flex-col gap-0.5">
        {filteredBottomItems.map(item => (
          <NavGroup key={item.label} item={item} />
        ))}
      </div>
    </aside>
  )
}
