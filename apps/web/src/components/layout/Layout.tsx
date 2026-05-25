import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { useChatSocket } from '../../hooks/useChatSocket'
import { chatService } from '../../services/chat.service'

export default function Layout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const isFullBleed = isHome || pathname.startsWith('/messages')

  // Single source of truth: socket + initial conversations load happen here,
  // so Header badge updates correctly anywhere in the app.
  useChatSocket()

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setUnreadCount = useChatStore((s) => s.setUnreadCount)
  const resetChat = useChatStore((s) => s.reset)

  useEffect(() => {
    if (!isAuthenticated) {
      resetChat()
      return
    }
    let cancelled = false
    chatService
      .unreadCount()
      .then((n) => {
        if (!cancelled) setUnreadCount(n)
      })
      .catch(() => {
        /* ignore */
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, setUnreadCount, resetChat])

  return (
    <div className="min-h-screen bg-white">
      <Header />
      {isFullBleed ? (
        <Outlet />
      ) : (
        <main className="container mx-auto px-4 py-6">
          <Outlet />
        </main>
      )}
    </div>
  )
}