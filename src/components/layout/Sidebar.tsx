import { NavLink, useNavigate } from 'react-router-dom'
import {
  TrendingUp, ShoppingCart, FileText, Receipt, Package, Warehouse,
  CreditCard, Users, Store, Truck, FolderOpen, BarChart2,
  PieChart, Settings, UserPlus, Zap, ChevronDown, BookOpen,
} from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'

type NavItem = {
  label: string
  icon: React.ReactNode
  path?: string
  children?: { label: string; path: string }[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Sales', icon: <TrendingUp size={16} />,
    children: [
      { label: 'Projected Sale', path: '/sales/projects' },
      { label: 'AMC Tracker', path: '/sales/amc' },
      { label: 'Proforma Invoices', path: '/sales/proforma' },
      { label: 'Tax Invoices', path: '/sales/tax-invoices' },
      { label: 'Billing Tracker', path: '/sales/billing' },
    ],
  },
  {
    label: 'Expenses', icon: <Receipt size={16} />,
    children: [
      { label: 'Monthly Payment Register', path: '/expenses/monthly-payment' },
    ],
  },
  { label: 'Customers', icon: <Users size={16} />, path: '/customers' },
  { label: 'Vendors', icon: <Truck size={16} />, path: '/vendors' },
  { label: 'Employees', icon: <UserPlus size={16} />, path: '/employees' },
]

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Settings', icon: <Settings size={16} />, path: '/settings' },
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

  return (
    <aside className="w-56 shrink-0 h-screen bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100 cursor-pointer"
        onClick={() => navigate('/customers')}
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
        {NAV_ITEMS.map(item => (
          <NavGroup key={item.label} item={item} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-gray-100 flex flex-col gap-0.5">
        {BOTTOM_ITEMS.map(item => (
          <NavGroup key={item.label} item={item} />
        ))}
      </div>
    </aside>
  )
}
