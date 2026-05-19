import { useCallback, useState } from 'react'
import { Upload, FileImage, Loader2 } from 'lucide-react'
import { useUploadDocument } from '../../hooks/useDocuments'
import type { Document } from '@keel/types'

interface UploadDropzoneProps {
  onUploaded?: (doc: Document) => void
}

export function UploadDropzone({ onUploaded }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const upload = useUploadDocument()

  const handleFile = useCallback(
    async (file: File) => {
      const doc = await upload.mutateAsync(file)
      onUploaded?.(doc)
    },
    [upload, onUploaded],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`
        relative flex flex-col items-center justify-center gap-3
        rounded-xl border-2 border-dashed p-10 cursor-pointer
        transition-colors
        ${dragging ? 'border-keel-500 bg-keel-50' : 'border-slate-200 hover:border-keel-400 hover:bg-slate-50'}
        ${upload.isPending ? 'pointer-events-none opacity-60' : ''}
      `}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        className="sr-only"
        onChange={onInputChange}
        disabled={upload.isPending}
      />

      {upload.isPending ? (
        <Loader2 size={32} className="animate-spin text-keel-500" />
      ) : (
        <div className="rounded-full bg-keel-100 p-4">
          <Upload size={24} className="text-keel-600" />
        </div>
      )}

      <div className="text-center">
        <p className="text-sm font-medium text-slate-700">
          {upload.isPending ? 'Uploading…' : 'Drop a receipt or click to browse'}
        </p>
        <p className="mt-1 text-xs text-slate-400">JPEG, PNG, WEBP, HEIC or PDF · max 20 MB</p>
      </div>

      {upload.isError && (
        <p className="text-xs text-red-600">Upload failed — please try again</p>
      )}
    </label>
  )
}
