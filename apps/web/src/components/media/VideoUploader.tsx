import { useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import type { MediaOwnerType } from '@pet-care/shared'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { mediaService } from '../../services/media.service'
import type { MediaItem } from '../../types'

interface VideoUploaderProps {
  ownerType: MediaOwnerType
  ownerId: string
  onUploadComplete: (item: MediaItem) => void
  onError?: (message: string) => void
  accept?: string
  maxSizeBytes?: number
  className?: string
}

export function VideoUploader({
  ownerType,
  ownerId,
  onUploadComplete,
  onError,
  accept = 'video/mp4,video/quicktime',
  maxSizeBytes = 75 * 1024 * 1024,
  className,
}: VideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)

  const handleFile = async (file: File) => {
    if (file.size > maxSizeBytes) {
      onError?.(
        `Відео завелике (${Math.round(file.size / 1024 / 1024)} МБ). Ліміт: ${Math.round(maxSizeBytes / 1024 / 1024)} МБ`,
      )
      return
    }
    setProgress(0)
    try {
      const item = await mediaService.uploadVideo(
        file,
        ownerType,
        ownerId,
        (p) => setProgress(p),
      )
      onUploadComplete(item)
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Не вдалося завантажити відео'
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

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
      />
      {progress !== null ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Завантаження… {progress}%
        </div>
      ) : (
        <div className="space-y-2">
          <Upload className="mx-auto size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            MP4 або MOV до {Math.round(maxSizeBytes / 1024 / 1024)} МБ
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Вибрати відео
          </Button>
        </div>
      )}
    </div>
  )
}
