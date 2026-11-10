import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { MediaOwnerType } from '@pet-care/shared'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { mediaService } from '../../services/media.service'
import type { MediaItem } from '../../types'

interface MediaGalleryProps {
  ownerType: MediaOwnerType
  ownerId: string
  /** Максимальна кількість елементів — для галереї caretaker = 20 (бекенд ліміт) */
  maxItems?: number
  /** Які MIME дозволені у file picker */
  acceptMimes?: string[]
}

const DEFAULT_ACCEPT = ['image/jpeg', 'image/png', 'image/webp']

export function MediaGallery({
  ownerType,
  ownerId,
  maxItems = 20,
  acceptMimes = DEFAULT_ACCEPT,
}: MediaGalleryProps) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void mediaService
      .listForOwner(ownerType, ownerId)
      .then((data) => {
        if (!cancelled) {
          // Сортуємо за orderIndex для стабільного відображення
          setItems([...data].sort((a, b) => a.orderIndex - b.orderIndex))
        }
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
  }, [ownerType, ownerId])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const list = Array.from(files)
    if (items.length + list.length > maxItems) {
      setError(`Максимум ${maxItems} файлів у галереї`)
      return
    }
    setError(null)

    for (const file of list) {
      if (!acceptMimes.includes(file.type)) {
        setError(`Тип ${file.type} не підтримується`)
        continue
      }
      const tempId = `pending-${Date.now()}-${Math.random()}`
      setUploading((prev) => [...prev, tempId])
      try {
        const created = await mediaService.uploadImage(file, ownerType, ownerId)
        setItems((prev) =>
          [...prev, created].sort((a, b) => a.orderIndex - b.orderIndex),
        )
      } catch {
        setError('Не вдалося завантажити файл')
      } finally {
        setUploading((prev) => prev.filter((x) => x !== tempId))
      }
    }
  }

  async function handleMove(idx: number, direction: -1 | 1) {
    const target = idx + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setItems(next)
    try {
      const updated = await mediaService.reorder(
        ownerType,
        ownerId,
        next.map((i) => i.id),
      )
      setItems([...updated].sort((a, b) => a.orderIndex - b.orderIndex))
    } catch {
      setError('Не вдалося змінити порядок')
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    const id = pendingDelete.id
    try {
      await mediaService.delete(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      setError('Не вдалося видалити фото')
    } finally {
      setPendingDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        Фото з ваших попередніх замовлень — клієнти бачать їх на вашому
        профілі. До {maxItems} зображень.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100"
          >
            <img
              src={item.thumbnailUrl ?? item.url}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleMove(idx, -1)}
                  disabled={idx === 0}
                  aria-label="Перемістити вгору"
                  className="text-white p-1 rounded hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(idx, 1)}
                  disabled={idx === items.length - 1}
                  aria-label="Перемістити вниз"
                  className="text-white p-1 rounded hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(item)}
                aria-label="Видалити"
                className="text-white p-1 rounded hover:bg-red-500/40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {uploading.map((id) => (
          <div
            key={id}
            className="aspect-square rounded-lg border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center"
          >
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
          </div>
        ))}
        {items.length + uploading.length < maxItems && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 hover:border-zinc-500 hover:bg-zinc-100 transition-colors flex flex-col items-center justify-center gap-1 text-sm text-zinc-600"
          >
            <ImagePlus className="w-6 h-6" />
            <span>Додати фото</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptMimes.join(',')}
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
        className="hidden"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null)
        }}
        title="Видалити фото?"
        description="Файл буде видалений з галереї і сховища безповоротно."
        confirmLabel="Видалити"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
