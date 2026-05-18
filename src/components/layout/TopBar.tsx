import { Search, Bell, HelpCircle, Settings, User } from 'lucide-react'
import { useState } from 'react'

export default function TopBar() {
  const [search, setSearch] = useState('')

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shrink-0">
      <div className="flex-1 max-w-md relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search anything... (Ctrl+K)"
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-gray-400"
        />
      </div>
      <div className="flex items-center gap-1 ml-auto">
        <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <HelpCircle size={17} />
        </button>
        <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors relative">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>
        <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <Settings size={17} />
        </button>
        <div className="w-7 h-7 ml-1 rounded-full bg-indigo-600 flex items-center justify-center cursor-pointer">
          <User size={14} className="text-white" />
        </div>
      </div>
    </header>
  )
}
