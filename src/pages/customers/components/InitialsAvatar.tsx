import { useState } from 'react'
import clsx from 'clsx'

const COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
]

function colorFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function InitialsAvatar({ name, imageUrl, size = 'md' }: { name: string; imageUrl?: string; size?: 'sm' | 'md' }) {
  const [imgFailed, setImgFailed] = useState(false)

  if (imageUrl && !imgFailed) {
    return (
      <img
        src={imageUrl}
        alt={name}
        onError={() => setImgFailed(true)}
        className={clsx(
          'rounded-full object-cover shrink-0 border border-gray-200',
          size === 'sm' ? 'w-7 h-7' : 'w-9 h-9',
        )}
      />
    )
  }

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center font-semibold shrink-0',
        colorFor(name),
        size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm',
      )}
    >
      {initials(name)}
    </div>
  )
}
