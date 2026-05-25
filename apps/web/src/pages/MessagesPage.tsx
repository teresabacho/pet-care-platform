import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { useChatStore } from '../store/chatStore'
import { chatService } from '../services/chat.service'
import ConversationsList from '../components/chat/ConversationsList'
import ConversationView from '../components/chat/ConversationView'
import { cn } from '@/lib/utils'

export default function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()

  const conversations = useChatStore((s) => s.conversations)
  const setConversations = useChatStore((s) => s.setConversations)
  const [loading, setLoading] = useState(true)

  // Sidebar default: open on /messages, closed on /messages/:id (повноекранний чат)
  const initialSidebarOpen = !conversationId
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    chatService
      .listConversations()
      .then((list) => {
        if (cancelled) return
        setConversations(list)
      })
      .catch(() => {
        if (cancelled) return
        setConversations([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [setConversations])

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === conversationId) ?? null,
    [conversations, conversationId],
  )

  function handleSelect(id: string) {
    navigate(`/messages/${id}`)
  }

  function handleBack() {
    setSidebarOpen(true)
    navigate('/messages')
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white">
      {/* Sidebar (collapsible) */}
      <aside
        className={cn(
          'border-r border-zinc-200 bg-white overflow-hidden flex flex-col transition-all duration-200',
          sidebarOpen ? 'w-full md:w-[340px]' : 'w-0 md:w-0',
          // On mobile: when conversation is open and sidebar closed, hide completely
          conversationId && !sidebarOpen && 'hidden',
        )}
      >
        <div className="shrink-0 px-4 py-3 border-b border-zinc-200">
          <h1 className="text-lg font-semibold text-zinc-900">Повідомлення</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationsList
            conversations={conversations}
            activeId={conversationId ?? null}
            onSelect={handleSelect}
            loading={loading}
          />
        </div>
      </aside>

      {/* Right pane */}
      <main className="flex-1 min-w-0 flex flex-col">
        {activeConversation ? (
          <ConversationView
            conversation={activeConversation}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            onBack={handleBack}
            showBackButton={!sidebarOpen}
          />
        ) : conversationId && !loading ? (
          <EmptyPane message="Розмову не знайдено" />
        ) : (
          <EmptyPane message="Оберіть розмову зі списку" />
        )}
      </main>
    </div>
  )
}

function EmptyPane({ message }: { message: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-2 bg-zinc-50">
      <MessageCircle className="w-12 h-12 text-zinc-300" />
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  )
}
