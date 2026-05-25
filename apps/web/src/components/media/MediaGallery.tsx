import { useState } from 'react'
import { X } from 'lucide-react'
import { MediaType } from '@pet-care/shared'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MediaItem } from '../../types'

interface MediaGalleryProps {
  items: MediaItem[]
  editable?: boolean
  onDelete?: (item: MediaItem) => void
  className?: string
}

export function MediaGallery({
  items,
  editable = false,
  onDelete,
  className,
}: MediaGalleryProps) {
  const [lightbox, setLightbox] = useState<MediaItem | null>(null)

  if (items.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground py-4', className)}>
        Немає медіа
      </div>
    )
  }

  return (
    <>
      <div
        className={cn(
          'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2',
          className,
        )}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="relative aspect-square overflow-hidden rounded-md bg-muted group"
          >
            {item.mediaType === MediaType.IMAGE ? (
              <img
                src={item.thumbnailUrl ?? item.url}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                onClick={() => setLightbox(item)}
              />
            ) : (
              <video
                src={item.url}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightbox(item)}
                muted
                preload="metadata"
              />
            )}
            {editable && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(item)
                }}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Видалити"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/10"
            onClick={() => setLightbox(null)}
          >
            <X />
          </Button>
          {lightbox.mediaType === MediaType.IMAGE ? (
            <img
              src={lightbox.url}
              alt=""
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={lightbox.url}
              controls
              autoPlay
              className="max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  )
}
