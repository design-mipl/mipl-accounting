import { Paperclip, X, Eye } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'

export function FileUpload({ fileName, file, onChange, label = 'Attach file' }: {
  fileName?: string
  file?: File
  onChange: (name: string | undefined, file?: File) => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setPreviewUrl(undefined)
    }
  }, [file])

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) onChange(f.name, f)
  }

  const viewUrl = previewUrl || (fileName && (fileName.startsWith('/') || fileName.startsWith('http')) ? fileName : undefined)

  if (fileName) {
    // Extract base name for display if it's a full path
    const displayFileName = fileName.substring(fileName.lastIndexOf('/') + 1)

    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 animate-fade-in">
        <Paperclip size={13} className="text-gray-500 shrink-0" />
        <span className="text-xs text-gray-700 truncate flex-1 font-medium" title={displayFileName}>
          {displayFileName}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {viewUrl && (
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-indigo-600 transition-colors flex items-center justify-center cursor-pointer"
              title="View Document"
            >
              <Eye size={13} />
            </a>
          )}
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center cursor-pointer"
            title="Remove"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-indigo-300 hover:bg-indigo-50/30 hover:text-indigo-600 transition-colors cursor-pointer"
    >
      <Paperclip size={13} />
      {label}
      <input ref={inputRef} type="file" className="hidden" onChange={handlePick} />
    </button>
  )
}
