import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Image as ImageIcon, Video, X } from 'lucide-react'
import { MediaOwnerType, MediaType } from '@pet-care/shared'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { mediaService } from '../../services/media.service'
import type { MediaItem } from '../../types'

interface MediaGallerySectionProps {
  ownerType: MediaOwnerType
  ownerId: string
  title?: string
  className?: string
}

export function MediaGallerySection({
  ownerType,
  ownerId,
  title = 'Фото та відео',
  className,
}: MediaGallerySectionProps) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    mediaService
      .listForOwner(ownerType, ownerId)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ownerType, ownerId])

  if (loading || items.length === 0) {
    return null
  }

  const open = (idx: number) => setLightboxIndex(idx)
  const close = () => setLightboxIndex(null)
  const prev = () =>
    setLightboxIndex((i) => (i === null ? null : (i - 1 + items.length) % items.length))
  const next = () =>
    setLightboxIndex((i) => (i === null ? null : (i + 1) % items.length))

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>

      <Layout items={items} onOpen={open} />

      {lightboxIndex !== null && (
        <Lightbox
          item={items[lightboxIndex]}
          index={lightboxIndex}
          total={items.length}
          onClose={close}
          onPrev={prev}
          onNext={next}
        />
      )}
    </section>
  )
}

// ── Adaptive layout ───────────────────────────────────────────────────────

interface LayoutProps {
  items: MediaItem[]
  onOpen: (idx: number) => void
}

function Layout({ items, onOpen }: LayoutProps) {
  const count = items.length

  // 1 — single full-width tile
  if (count === 1) {
    return (
      <div className="h-64 rounded-xl overflow-hidden">
        <Tile item={items[0]} onClick={() => onOpen(0)} />
      </div>
    )
  }

  // 2 — two equal tiles side-by-side
  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-2 h-64 rounded-xl overflow-hidden">
        {items.map((item, i) => (
          <Tile key={item.id} item={item} onClick={() => onOpen(i)} />
        ))}
      </div>
    )
  }

  // 3 — hero (2x2) + 2 small in right column
  if (count === 3) {
    return (
      <div className="grid grid-cols-3 grid-rows-2 gap-2 h-64 rounded-xl overflow-hidden">
        <Tile
          item={items[0]}
          onClick={() => onOpen(0)}
          spanClassName="col-span-2 row-span-2"
        />
        <Tile item={items[1]} onClick={() => onOpen(1)} />
        <Tile item={items[2]} onClick={() => onOpen(2)} />
      </div>
    )
  }

  // 4 — 2×2 grid of equal squares
  if (count === 4) {
    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-2 h-64 rounded-xl overflow-hidden">
        {items.map((item, i) => (
          <Tile key={item.id} item={item} onClick={() => onOpen(i)} />
        ))}
      </div>
    )
  }

  // 5+ — hero + 4 small. Last small shows «+N» if there are more.
  const visible = items.slice(0, 5)
  const remainder = count - 5
  return (
    <div className="grid grid-cols-4 grid-rows-2 gap-2 h-64 rounded-xl overflow-hidden">
      <Tile
        item={visible[0]}
        onClick={() => onOpen(0)}
        spanClassName="col-span-2 row-span-2"
      />
      {visible.slice(1).map((item, i) => {
        const tileIndex = i + 1
        const isLast = tileIndex === 4 && remainder > 0
        return (
          <Tile
            key={item.id}
            item={item}
            onClick={() => onOpen(tileIndex)}
            moreCount={isLast ? remainder : undefined}
          />
        )
      })}
    </div>
  )
}

// ── Tile ──────────────────────────────────────────────────────────────────

interface TileProps {
  item: MediaItem
  onClick: () => void
  spanClassName?: string
  moreCount?: number
}

function Tile({ item, onClick, spanClassName, moreCount }: TileProps) {
  const isVideo = item.mediaType === MediaType.VIDEO
  const [imgSrc, setImgSrc] = useState(item.thumbnailUrl ?? item.url)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative bg-zinc-100 rounded-lg border border-zinc-200 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900',
        spanClassName,
      )}
    >
      {isVideo ? (
        <video
          src={item.url}
          className="w-full h-full object-cover"
          muted
          preload="metadata"
        />
      ) : (
        <img
          src={imgSrc}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          onError={() => {
            if (imgSrc !== item.url) setImgSrc(item.url)
          }}
        />
      )}

      <span className="absolute top-1.5 right-1.5 bg-white/85 backdrop-blur rounded p-1 text-zinc-500">
        {isVideo ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
      </span>

      {moreCount !== undefined && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white text-lg font-semibold">
          +{moreCount}
        </span>
      )}
    </button>
  )
}

// ── Lightbox ──────────────────────────────────────────────────────────────

interface LightboxProps {
  item: MediaItem
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

function Lightbox({ item, index, total, onClose, onPrev, onNext }: LightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/10"
        onClick={onClose}
        aria-label="Закрити"
      >
        <X />
      </Button>

      {total > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation()
              onPrev()
            }}
            aria-label="Попереднє"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
            aria-label="Наступне"
          >
            <ChevronRight />
          </Button>
        </>
      )}

      {item.mediaType === MediaType.IMAGE ? (
        <img
          src={item.url}
          alt=""
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <video
          src={item.url}
          controls
          autoPlay
          className="max-w-full max-h-full"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      <span className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs tabular-nums">
        {index + 1} / {total}
      </span>
    </div>
  )
}
