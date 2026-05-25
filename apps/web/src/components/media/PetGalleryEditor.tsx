import { useEffect, useState } from 'react'
import { GripVertical, Loader2, Plus, Trash2, Video } from 'lucide-react'
import { MediaOwnerType, MediaType } from '@pet-care/shared'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { mediaService } from '../../services/media.service'
import type { MediaItem } from '../../types'
import { ImageUploader } from './ImageUploader'
import { VideoUploader } from './VideoUploader'

interface PetGalleryEditorProps {
  petId: string
  maxItems?: number
}

export function PetGalleryEditor({
  petId,
  maxItems = 10,
}: PetGalleryEditorProps) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<MediaItem | null>(null)
  const [uploaderMode, setUploaderMode] = useState<'image' | 'video' | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    mediaService
      .listForOwner(MediaOwnerType.PET_GALLERY, petId)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch(() => {
        if (!cancelled) setError('Не вдалося завантажити галерею')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [petId])

  const onUploadComplete = (item: MediaItem) => {
    setItems((prev) => [...prev, item])
    setUploaderMode(null)
    setError(null)
  }

  const onUploadError = (msg: string) => setError(msg)

  const handleDelete = async () => {
    if (!confirmDelete) return
    const id = confirmDelete.id
    try {
      await mediaService.delete(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      setError('Не вдалося видалити')
    }
  }

  const reorderItems = async (fromId: string, toId: string) => {
    if (fromId === toId) return
    const fromIdx = items.findIndex((i) => i.id === fromId)
    const toIdx = items.findIndex((i) => i.id === toId)
    if (fromIdx === -1 || toIdx === -1) return

    const newItems = [...items]
    const [moved] = newItems.splice(fromIdx, 1)
    newItems.splice(toIdx, 0, moved)
    setItems(newItems)

    try {
      const fresh = await mediaService.reorder(
        MediaOwnerType.PET_GALLERY,
        petId,
        newItems.map((i) => i.id),
      )
      setItems(fresh)
    } catch {
      setError('Не вдалося зберегти порядок')
    }
  }

  const canAdd = items.length < maxItems

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Можна додати до {maxItems} фото або відео.
          {' '}
          <span className="text-foreground font-medium">
            {items.length}/{maxItems}
          </span>
        </p>
        {canAdd && uploaderMode === null && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUploaderMode('image')}
            >
              <Plus className="w-3.5 h-3.5" />
              Фото
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUploaderMode('video')}
            >
              <Video className="w-3.5 h-3.5" />
              Відео
            </Button>
          </div>
        )}
      </div>

      {/* Active uploader */}
      {uploaderMode === 'image' && (
        <div className="flex flex-col gap-2">
          <ImageUploader
            ownerType={MediaOwnerType.PET_GALLERY}
            ownerId={petId}
            maxSizeBytes={10 * 1024 * 1024}
            onUploadComplete={onUploadComplete}
            onError={onUploadError}
          />
          <button
            type="button"
            onClick={() => setUploaderMode(null)}
            className="text-xs text-muted-foreground hover:text-foreground self-end"
          >
            Скасувати
          </button>
        </div>
      )}
      {uploaderMode === 'video' && (
        <div className="flex flex-col gap-2">
          <VideoUploader
            ownerType={MediaOwnerType.PET_GALLERY}
            ownerId={petId}
            maxSizeBytes={75 * 1024 * 1024}
            onUploadComplete={onUploadComplete}
            onError={onUploadError}
          />
          <button
            type="button"
            onClick={() => setUploaderMode(null)}
            className="text-xs text-muted-foreground hover:text-foreground self-end"
          >
            Скасувати
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          Поки що немає фото чи відео
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Щоб переставити — перетягни плитку на нове місце
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {items.map((item) => {
              const isDragging = draggingId === item.id
              const isDragOver = dragOverId === item.id && draggingId !== item.id
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingId(item.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnter={() => setDragOverId(item.id)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget === e.target) setDragOverId(null)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (draggingId) void reorderItems(draggingId, item.id)
                    setDraggingId(null)
                    setDragOverId(null)
                  }}
                  onDragEnd={() => {
                    setDraggingId(null)
                    setDragOverId(null)
                  }}
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-md bg-muted border-2 transition-all cursor-grab active:cursor-grabbing',
                    isDragging
                      ? 'opacity-40 border-zinc-900'
                      : isDragOver
                        ? 'border-zinc-900 ring-2 ring-zinc-900/20'
                        : 'border-transparent',
                  )}
                >
                  {item.mediaType === MediaType.IMAGE ? (
                    <img
                      src={item.thumbnailUrl ?? item.url}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <video
                      src={item.url}
                      className="w-full h-full object-cover pointer-events-none"
                      muted
                      preload="metadata"
                    />
                  )}

                  <span className="absolute top-1 left-1 rounded bg-black/60 text-white p-1 opacity-60 group-hover:opacity-100 transition">
                    <GripVertical className="w-3.5 h-3.5" />
                  </span>

                  {item.mediaType === MediaType.VIDEO && (
                    <span className="absolute top-1 right-9 rounded bg-black/60 text-white p-1">
                      <Video className="w-3.5 h-3.5" />
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmDelete(item)
                    }}
                    aria-label="Видалити"
                    className="absolute top-1 right-1 rounded bg-black/60 hover:bg-destructive text-white p-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Видалити з галереї?"
        description="Файл буде видалено остаточно. Цю дію не можна скасувати."
        confirmLabel="Видалити"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
