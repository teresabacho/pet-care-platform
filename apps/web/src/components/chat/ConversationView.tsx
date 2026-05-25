import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Loader2,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Send,
  X,
} from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { uk } from 'date-fns/locale'
import { MediaOwnerType, MediaType, MessageType } from '@pet-care/shared'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { chatService } from '../../services/chat.service'
import { mediaService } from '../../services/media.service'
import { getChatSocket } from '../../hooks/useChatSocket'
import { cn } from '@/lib/utils'
import type { ChatConversation, ChatMessage, MediaItem } from '../../types'

interface ConversationViewProps {
  conversation: ChatConversation
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onBack?: () => void
  showBackButton?: boolean
}

const PAGE_SIZE = 50
const EMPTY_MESSAGES: ChatMessage[] = []

function nameOf(p: ChatConversation['otherParticipant']): string {
  const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim()
  return name || p.email
}

function initialsOf(p: ChatConversation['otherParticipant']): string {
  const a = p.firstName?.[0] ?? p.email[0] ?? '?'
  const b = p.lastName?.[0] ?? ''
  return (a + b).toUpperCase()
}

function formatTime(value: string): string {
  return format(new Date(value), 'HH:mm', { locale: uk })
}

function formatDateLabel(date: Date): string {
  return format(date, 'd MMMM yyyy', { locale: uk })
}

export default function ConversationView({
  conversation,
  sidebarOpen,
  onToggleSidebar,
  onBack,
  showBackButton,
}: ConversationViewProps) {
  const navigate = useNavigate()
  const currentUserId = useAuthStore((s) => s.user?.id)

  const messages = useChatStore(
    (s) => s.messagesByConversation[conversation.id] ?? EMPTY_MESSAGES,
  )
  const hasMore = useChatStore(
    (s) => s.hasMoreByConversation[conversation.id] ?? false,
  )
  const typing = useChatStore(
    (s) => s.typingByConversation[conversation.id] ?? null,
  )
  const setMessages = useChatStore((s) => s.setMessages)
  const prependMessages = useChatStore((s) => s.prependMessages)
  const appendMessage = useChatStore((s) => s.appendMessage)
  const setHasMore = useChatStore((s) => s.setHasMore)
  const markReadStore = useChatStore((s) => s.markRead)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [attachments, setAttachments] = useState<MediaItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const listRef = useRef<HTMLDivElement | null>(null)
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)
  const prevScrollHeightRef = useRef<number>(0)
  const isInitialLoadRef = useRef(true)

  // Сортуємо ASC для рендеру (бекенд віддає DESC).
  const orderedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
  }, [messages])

  // Load initial messages
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    isInitialLoadRef.current = true
    chatService
      .listMessages(conversation.id, undefined, PAGE_SIZE)
      .then((rows) => {
        if (cancelled) return
        setMessages(conversation.id, rows)
        setHasMore(conversation.id, rows.length === PAGE_SIZE)
      })
      .catch(() => {
        if (cancelled) return
        setMessages(conversation.id, [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [conversation.id, setMessages, setHasMore])

  // Mark read on open and when new messages arrive
  useEffect(() => {
    if (loading) return
    if (orderedMessages.length === 0) return
    chatService
      .markRead(conversation.id)
      .then(({ markedIds }) => {
        if (markedIds.length > 0) {
          markReadStore(conversation.id, markedIds)
        }
      })
      .catch(() => {
        /* ignore */
      })
  }, [conversation.id, orderedMessages.length, loading, markReadStore])

  // Auto-scroll to bottom: on initial load and on new own message.
  // For incoming messages: only if user was already near bottom.
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    if (isInitialLoadRef.current && !loading && orderedMessages.length > 0) {
      list.scrollTop = list.scrollHeight
      isInitialLoadRef.current = false
      return
    }
    // For ongoing message updates — keep at bottom if already near it
    const nearBottom =
      list.scrollHeight - list.scrollTop - list.clientHeight < 200
    if (nearBottom) {
      list.scrollTop = list.scrollHeight
    }
  }, [orderedMessages.length, loading])

  // Pagination: when user scrolls to top, load older
  const handleScroll = useCallback(() => {
    const list = listRef.current
    if (!list || loadingOlder || !hasMore) return
    if (list.scrollTop < 40 && orderedMessages.length > 0) {
      setLoadingOlder(true)
      prevScrollHeightRef.current = list.scrollHeight
      const oldestId = orderedMessages[0].id
      chatService
        .listMessages(conversation.id, oldestId, PAGE_SIZE)
        .then((older) => {
          if (older.length > 0) {
            prependMessages(conversation.id, older)
          }
          setHasMore(conversation.id, older.length === PAGE_SIZE)
        })
        .finally(() => {
          setLoadingOlder(false)
          // Restore scroll position after prepend
          requestAnimationFrame(() => {
            if (listRef.current) {
              const diff = listRef.current.scrollHeight - prevScrollHeightRef.current
              listRef.current.scrollTop = diff
            }
          })
        })
    }
  }, [
    conversation.id,
    orderedMessages,
    hasMore,
    loadingOlder,
    prependMessages,
    setHasMore,
  ])

  async function handleSend() {
    const text = draft.trim()
    const hasMedia = attachments.length > 0
    if ((!text && !hasMedia) || sending || uploading || !currentUserId) return
    setSending(true)
    try {
      const message = await chatService.sendMessage(conversation.id, {
        messageType: hasMedia ? MessageType.MEDIA : MessageType.TEXT,
        text: text || undefined,
        mediaItemIds: hasMedia ? attachments.map((a) => a.id) : undefined,
      })
      appendMessage(conversation.id, message)
      setDraft('')
      setAttachments([])
    } catch {
      // тости додамо пізніше
    } finally {
      setSending(false)
    }
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0 || !currentUserId) return
    setUploadError(null)
    setUploading(true)
    try {
      const uploaded: MediaItem[] = []
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith('video/')
        const isImage = file.type.startsWith('image/')
        if (!isVideo && !isImage) {
          setUploadError('Підтримуються лише фото та відео')
          continue
        }
        try {
          const item = isVideo
            ? await mediaService.uploadVideo(
                file,
                MediaOwnerType.MESSAGE_MEDIA,
                currentUserId,
              )
            : await mediaService.uploadImage(
                file,
                MediaOwnerType.MESSAGE_MEDIA,
                currentUserId,
              )
          uploaded.push(item)
        } catch {
          setUploadError(`Не вдалося завантажити ${file.name}`)
        }
      }
      if (uploaded.length > 0) {
        setAttachments((prev) => [...prev, ...uploaded])
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  function handleTyping() {
    const socket = getChatSocket()
    socket?.emit('chat:typing', { conversationId: conversation.id })
  }

  function gotoProfile() {
    navigate(`/caretaker/${conversation.otherParticipant.id}`)
  }

  // Group messages by date for date dividers
  const dateGroups = useMemo(() => {
    const groups: Array<{ date: Date; messages: ChatMessage[] }> = []
    for (const m of orderedMessages) {
      const d = new Date(m.createdAt)
      const last = groups[groups.length - 1]
      if (last && isSameDay(last.date, d)) {
        last.messages.push(m)
      } else {
        groups.push({ date: d, messages: [m] })
      }
    }
    return groups
  }, [orderedMessages])

  const typingActive = typing && typing.expiresAt > Date.now()
  const name = nameOf(conversation.otherParticipant)

  return (
    <div className="flex flex-col h-full bg-white min-h-0">
      {/* Header */}
      <header className="shrink-0 border-b border-zinc-200 px-3 py-2.5 flex items-center gap-2">
        {showBackButton && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-md hover:bg-zinc-100 flex items-center justify-center"
            aria-label="Назад"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-700" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="w-9 h-9 rounded-md hover:bg-zinc-100 flex items-center justify-center"
          aria-label={sidebarOpen ? 'Сховати чати' : 'Показати чати'}
          title={sidebarOpen ? 'Сховати список чатів' : 'Показати список чатів'}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-4 h-4 text-zinc-700" />
          ) : (
            <PanelLeftOpen className="w-4 h-4 text-zinc-700" />
          )}
        </button>

        <button
          type="button"
          onClick={gotoProfile}
          className="flex items-center gap-3 flex-1 min-w-0 hover:bg-zinc-50 rounded-md px-2 py-1 text-left transition"
        >
          <Avatar className="w-9 h-9 shrink-0">
            {conversation.otherParticipant.avatarUrl && (
              <AvatarImage
                src={conversation.otherParticipant.avatarUrl}
                alt={name}
              />
            )}
            <AvatarFallback className="bg-zinc-200 text-zinc-700 text-xs font-semibold">
              {initialsOf(conversation.otherParticipant)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-zinc-900 truncate">
              {name}
            </span>
            <span className="text-[11px] text-zinc-500">
              Натисніть, щоб відкрити профіль
            </span>
          </div>
        </button>
      </header>

      {/* Messages list */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0"
      >
        {loadingOlder && (
          <div className="flex justify-center py-2 text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : orderedMessages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
            Поки що повідомлень немає. Напишіть перше.
          </div>
        ) : (
          dateGroups.map((g) => (
            <div key={g.date.toISOString()} className="flex flex-col gap-2">
              <div className="text-center text-[11px] text-zinc-400 my-2">
                {formatDateLabel(g.date)}
              </div>
              {g.messages.map((m, idx) => {
                const isMine = m.senderId === currentUserId
                const next = g.messages[idx + 1]
                const isLastInBurst = !next || next.senderId !== m.senderId
                return (
                  <div
                    key={m.id}
                    className={cn(
                      'flex',
                      isMine ? 'justify-end' : 'justify-start',
                    )}
                  >
                    <MessageBubble
                      message={m}
                      isMine={isMine}
                      isLastInBurst={isLastInBurst}
                    />
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={scrollAnchorRef} />
      </div>

      {typingActive && (
        <div className="px-4 py-1 text-[11px] text-zinc-500">
          {name} друкує…
        </div>
      )}

      {/* Composer */}
      <div className="shrink-0 border-t border-zinc-200 px-3 py-2 flex flex-col gap-2 bg-white">
        {(attachments.length > 0 || uploading || uploadError) && (
          <div className="flex flex-wrap gap-2 px-1">
            {attachments.map((a) => (
              <AttachmentPreview
                key={a.id}
                item={a}
                onRemove={() => removeAttachment(a.id)}
              />
            ))}
            {uploading && (
              <div className="w-16 h-16 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
            {uploadError && (
              <p className="text-xs text-rose-600 w-full">{uploadError}</p>
            )}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/quicktime"
            multiple
            className="hidden"
            onChange={(e) => void handleFilesSelected(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
            className="h-10 w-10 rounded-md flex items-center justify-center text-zinc-600 hover:bg-zinc-100 transition disabled:opacity-40"
            aria-label="Додати вкладення"
            title="Додати фото або відео"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              handleTyping()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            placeholder={
              attachments.length > 0
                ? 'Додайте підпис (необов\'язково)…'
                : 'Напишіть повідомлення…'
            }
            rows={1}
            className="flex-1 resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[40px] max-h-32"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={(!draft.trim() && attachments.length === 0) || sending || uploading}
            className={cn(
              'h-10 px-4 rounded-md flex items-center gap-1 text-sm font-medium transition',
              (!draft.trim() && attachments.length === 0) || sending || uploading
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                : 'bg-zinc-900 text-white hover:bg-zinc-800',
            )}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Надіслати</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── Subcomponents ──────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage
  isMine: boolean
  isLastInBurst: boolean
}

function MessageBubble({ message, isMine, isLastInBurst }: MessageBubbleProps) {
  const mediaItems = message.mediaItems ?? []
  const hasMedia = mediaItems.length > 0
  return (
    <div
      className={cn(
        'max-w-[78%] rounded-2xl text-sm break-words',
        isMine
          ? 'bg-zinc-900 text-white rounded-br-sm'
          : 'bg-zinc-100 text-zinc-900 rounded-bl-sm',
        hasMedia ? 'p-1.5' : 'px-3.5 py-2',
      )}
    >
      {hasMedia && (
        <div
          className={cn(
            'grid gap-1 mb-1',
            mediaItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
          )}
        >
          {mediaItems
            .slice()
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((mmi) => (
              <MediaTile key={mmi.mediaItemId} media={mmi.mediaItem} />
            ))}
        </div>
      )}
      {message.text && (
        <div className={cn(hasMedia ? 'px-2 pb-1' : '', 'whitespace-pre-wrap')}>
          {message.text}
        </div>
      )}
      <div
        className={cn(
          'mt-1 flex items-center gap-1 text-[10px] justify-end',
          isMine ? 'text-zinc-400' : 'text-zinc-500',
          hasMedia ? 'px-2 pb-1' : '',
        )}
      >
        <span>{formatTime(message.createdAt)}</span>
        {isMine && isLastInBurst && (
          message.readAt ? (
            <CheckCheck className="w-3 h-3 text-blue-300" />
          ) : (
            <Check className="w-3 h-3" />
          )
        )}
      </div>
    </div>
  )
}

function MediaTile({ media }: { media?: MediaItem }) {
  if (!media) return null
  const isVideo = media.mediaType === MediaType.VIDEO
  if (isVideo) {
    return (
      <video
        src={media.url}
        controls
        className="rounded-lg max-h-80 max-w-full bg-black"
      />
    )
  }
  return (
    <a
      href={media.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <img
        src={media.thumbnailUrl ?? media.url}
        alt=""
        className="rounded-lg max-h-80 max-w-full object-cover"
        loading="lazy"
      />
    </a>
  )
}

interface AttachmentPreviewProps {
  item: MediaItem
  onRemove: () => void
}

function AttachmentPreview({ item, onRemove }: AttachmentPreviewProps) {
  const isVideo = item.mediaType === MediaType.VIDEO
  return (
    <div className="relative w-16 h-16 rounded-md overflow-hidden bg-zinc-100 group">
      {isVideo ? (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white">
          <Play className="w-5 h-5" />
        </div>
      ) : (
        <img
          src={item.thumbnailUrl ?? item.url}
          alt=""
          className="w-full h-full object-cover"
        />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 bg-zinc-900/80 hover:bg-zinc-900 text-white rounded-full p-0.5 transition"
        aria-label="Видалити"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
