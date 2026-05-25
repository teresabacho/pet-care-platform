import { MessageCircle } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { uk } from 'date-fns/locale'
import { MessageType } from '@pet-care/shared'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { ChatConversation } from '../../types'

interface ConversationsListProps {
  conversations: ChatConversation[]
  activeId: string | null
  onSelect: (id: string) => void
  loading: boolean
  className?: string
}

function fullName(p: ChatConversation['otherParticipant']): string {
  const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim()
  return name || p.email
}

function initials(p: ChatConversation['otherParticipant']): string {
  const a = p.firstName?.[0] ?? p.email[0] ?? '?'
  const b = p.lastName?.[0] ?? ''
  return (a + b).toUpperCase()
}

function previewText(c: ChatConversation): string {
  if (!c.lastMessage) return 'Розмова створена. Напишіть перше повідомлення.'
  if (c.lastMessage.messageType === MessageType.MEDIA) {
    return c.lastMessage.text || '📎 Вкладення'
  }
  return c.lastMessage.text ?? ''
}

function timeAgo(value: string | null): string {
  if (!value) return ''
  try {
    return formatDistanceToNowStrict(new Date(value), {
      addSuffix: false,
      locale: uk,
    })
  } catch {
    return ''
  }
}

export default function ConversationsList({
  conversations,
  activeId,
  onSelect,
  loading,
  className,
}: ConversationsListProps) {
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-8 text-zinc-400', className)}>
        Завантаження…
      </div>
    )
  }
  if (conversations.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 p-8 text-center text-zinc-500', className)}>
        <MessageCircle className="w-8 h-8 text-zinc-300" />
        <p className="text-sm">Поки що жодного чату.</p>
        <p className="text-xs text-zinc-400">
          Розмова з'являється коли ви напишете доглядальнику або забронюєте послугу.
        </p>
      </div>
    )
  }

  return (
    <ul className={cn('flex flex-col', className)}>
      {conversations.map((c) => {
        const isActive = c.id === activeId
        const name = fullName(c.otherParticipant)
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={cn(
                'w-full flex items-start gap-3 px-3 py-3 text-left transition border-b border-zinc-100',
                isActive
                  ? 'bg-zinc-100'
                  : 'hover:bg-zinc-50',
              )}
            >
              <Avatar className="w-11 h-11 shrink-0">
                {c.otherParticipant.avatarUrl && (
                  <AvatarImage src={c.otherParticipant.avatarUrl} alt={name} />
                )}
                <AvatarFallback className="bg-zinc-200 text-zinc-700 text-sm font-semibold">
                  {initials(c.otherParticipant)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-zinc-900 truncate">
                    {name}
                  </span>
                  <span className="text-[11px] text-zinc-400 ml-auto shrink-0">
                    {timeAgo(c.lastMessageAt ?? c.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p
                    className={cn(
                      'text-xs truncate',
                      c.unreadCount > 0 && !isActive
                        ? 'text-zinc-900 font-medium'
                        : 'text-zinc-500',
                    )}
                  >
                    {previewText(c)}
                  </p>
                  {c.unreadCount > 0 && (
                    <span className="ml-auto shrink-0 bg-zinc-900 text-white text-[10px] font-semibold rounded-full px-1.5 min-w-[20px] text-center">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
