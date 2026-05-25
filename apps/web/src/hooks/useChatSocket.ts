import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import type { ChatMessage } from '../types'

const WS_URL = 'http://localhost:3000/chat'

interface MessageReadPayload {
  conversationId: string
  readerId: string
  markedIds: string[]
  readAt: string
}

interface TypingPayload {
  conversationId: string
  userId: string
}

let socketSingleton: Socket | null = null

export function getChatSocket(): Socket | null {
  return socketSingleton
}

export function useChatSocket(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const accessToken = useAuthStore((s) => s.accessToken)
  const userId = useAuthStore((s) => s.user?.id)

  const appendMessage = useChatStore((s) => s.appendMessage)
  const markRead = useChatStore((s) => s.markRead)
  const setTyping = useChatStore((s) => s.setTyping)
  const clearTyping = useChatStore((s) => s.clearTyping)
  const upsertConversation = useChatStore((s) => s.upsertConversation)

  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        socketSingleton = null
      }
      return
    }

    const socket = io(WS_URL, {
      auth: { token: accessToken },
      // default transports (polling → websocket upgrade) — більш стабільно
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      withCredentials: false,
    })
    socketRef.current = socket
    socketSingleton = socket

    socket.on('chat:message-received', (msg: ChatMessage) => {
      appendMessage(msg.conversationId, msg)
      // If the message arrived in a conversation we haven't loaded yet, we'll
      // pick it up on next conversations refresh; for now just bump existing.
      if (msg.senderId !== userId) {
        // Increment unread for that conversation via upsert
        const existing = useChatStore.getState().conversations.find(
          (c) => c.id === msg.conversationId,
        )
        if (existing) {
          upsertConversation({
            ...existing,
            lastMessage: msg,
            lastMessageAt: msg.createdAt,
            unreadCount: existing.unreadCount + 1,
          })
        }
      }
    })

    socket.on('chat:message-read', (p: MessageReadPayload) => {
      markRead(p.conversationId, p.markedIds)
    })

    socket.on('chat:typing', (p: TypingPayload) => {
      if (p.userId === userId) return
      setTyping(p.conversationId, p.userId)
      window.setTimeout(() => clearTyping(p.conversationId), 4000)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      socketSingleton = null
    }
  }, [
    isAuthenticated,
    accessToken,
    userId,
    appendMessage,
    markRead,
    setTyping,
    clearTyping,
    upsertConversation,
  ])
}
