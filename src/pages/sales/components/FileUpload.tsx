import { Paperclip, X } from 'lucide-react'
import { useRef } from 'react'

export function FileUpload({ fileName, onChange, label = 'Attach file' }: {
  fileName?: string
  onChange: (name: string | undefined) => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) onChange(f.name)
  }

  if (fileName) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
        <Paperclip size={13} className="text-gray-500 shrink-0" />
        <span className="text-xs text-gray-700 truncate flex-1" title={fileName}>{fileName}</span>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700"
          title="Remove"
        >
          <X size={12} />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-indigo-300 hover:bg-indigo-50/30 hover:text-indigo-600 transition-colors"
    >
      <Paperclip size={13} />
      {label}
      <input ref={inputRef} type="file" className="hidden" onChange={handlePick} />
    </button>
  )
}
