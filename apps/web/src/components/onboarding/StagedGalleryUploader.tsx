import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StagedGalleryUploaderProps {
  files: File[]
  onChange: (next: File[]) => void
  maxItems?: number
  maxSizeBytes?: number
  className?: string
}

// Стейджить файли локально (без upload). Завантаження виконується у Step 5
// після створення CaretakerProfile (бо ownerId для CARETAKER_GALLERY = profile.id,
// якого ще немає в момент wizard-у).
export function StagedGalleryUploader({
  files,
  onChange,
  maxItems = 20,
  maxSizeBytes = 10 * 1024 * 1024,
  className,
}: StagedGalleryUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Перевизначаємо preview-URL при зміні files
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [files])

  const handlePick = (chosen: FileList | null) => {
    if (!chosen) return
    setError(null)
    const arr = Array.from(chosen)
    const oversized = arr.find((f) => f.size > maxSizeBytes)
    if (oversized) {
      setError(`Файл «${oversized.name}» завеликий (ліміт ${Math.round(maxSizeBytes / 1024 / 1024)} МБ)`)
      return
    }
    const remaining = maxItems - files.length
    if (remaining <= 0) {
      setError(`Можна максимум ${maxItems} фото`)
      return
    }
    onChange([...files, ...arr.slice(0, remaining)])
  }

  const remove = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx))
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {previews.map((url, idx) => (
          <div
            key={idx}
            className="relative aspect-square rounded-md overflow-hidden border border-zinc-200 bg-zinc-100"
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
              aria-label="Видалити"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {files.length < maxItems && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-md border-2 border-dashed border-zinc-300 bg-zinc-50 flex flex-col items-center justify-center text-zinc-500 hover:border-zinc-500 hover:bg-zinc-100 transition-colors"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs mt-1">Додати</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          handlePick(e.target.files)
          e.target.value = ''
        }}
        className="hidden"
      />
      <p className="text-xs text-zinc-500">
        До {maxItems} фото. Макс. розмір — {Math.round(maxSizeBytes / 1024 / 1024)} МБ.
        Завантажаться після завершення реєстрації.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {files.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([])}
          className="text-zinc-500"
        >
          Очистити всі
        </Button>
      )}
    </div>
  )
}
