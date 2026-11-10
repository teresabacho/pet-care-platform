import { useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import type { MediaOwnerType } from '@pet-care/shared'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { mediaService } from '../../services/media.service'
import type { MediaItem } from '../../types'

interface ImageUploaderProps {
  ownerType: MediaOwnerType
  ownerId: string
  onUploadComplete: (item: MediaItem) => void
  onError?: (message: string) => void
  accept?: string
  maxSizeBytes?: number
  className?: string
  label?: string
}

export function ImageUploader({
  ownerType,
  ownerId,
  onUploadComplete,
  onError,
  accept = 'image/jpeg,image/png,image/webp',
  maxSizeBytes = 10 * 1024 * 1024,
  className,
  label = 'Перетягніть зображення сюди або клацніть',
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    if (file.size > maxSizeBytes) {
      onError?.(
        `Файл завеликий (${Math.round(file.size / 1024 / 1024)} МБ). Ліміт: ${Math.round(maxSizeBytes / 1024 / 1024)} МБ`,
      )
      return
    }
    setPreviewUrl(URL.createObjectURL(file))
    setProgress(0)
    try {
      const item = await mediaService.uploadImage(
        file,
        ownerType,
        ownerId,
        (p) => setProgress(p),
      )
      onUploadComplete(item)
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Не вдалося завантажити зображення'
      onError?.(typeof message === 'string' ? message : message[0])
    } finally {
      setProgress(null)
    }
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
        dragActive ? 'border-primary bg-primary/5' : 'border-border',
        className,
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
      />
      {previewUrl && progress !== null ? (
        <div className="space-y-2">
          <img
            src={previewUrl}
            alt=""
            className="mx-auto max-h-40 rounded"
          />
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Завантаження… {progress}%
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Upload className="mx-auto size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{label}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              inputRef.current?.click()
            }}
          >
            Вибрати файл
          </Button>
        </div>
      )}
    </div>
  )
}
