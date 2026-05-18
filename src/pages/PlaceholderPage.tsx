import { Construction } from 'lucide-react'

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Construction size={24} className="text-gray-400" />
      </div>
      <h2 className="text-base font-semibold text-gray-700">{title}</h2>
      <p className="text-sm text-gray-400 mt-1">This module is under construction.</p>
    </div>
  )
}
