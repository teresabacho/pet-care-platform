import { create } from 'zustand'
import type { ChatConversation, ChatMessage } from '../types'

interface TypingState {
  userId: string
  expiresAt: number
}

interface ChatState {
  conversations: ChatConversation[]
  messagesByConversation: Record<string, ChatMessage[]>
  hasMoreByConversation: Record<string, boolean>
  unreadCount: number
  typingByConversation: Record<string, TypingState | null>

  setConversations: (list: ChatConversation[]) => void
  upsertConversation: (conv: ChatConversation) => void
  setMessages: (conversationId: string, messages: ChatMessage[]) => void
  prependMessages: (conversationId: string, messages: ChatMessage[]) => void
  appendMessage: (conversationId: string, message: ChatMessage) => void
  markRead: (conversationId: string, ids: string[]) => void
  setUnreadCount: (n: number) => void
  setTyping: (conversationId: string, userId: string) => void
  clearTyping: (conversationId: string) => void
  setHasMore: (conversationId: string, hasMore: boolean) => void
  reset: () => void
}

const TYPING_TTL_MS = 4000

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  messagesByConversation: {},
  hasMoreByConversation: {},
  unreadCount: 0,
  typingByConversation: {},

  setConversations: (list) =>
    set({
      conversations: list,
      unreadCount: list.reduce((acc, c) => acc + c.unreadCount, 0),
    }),

  upsertConversation: (conv) =>
    set((state) => {
      const others = state.conversations.filter((c) => c.id !== conv.id)
      const next = [conv, ...others].sort((a, b) => {
        const aT = a.lastMessageAt ?? a.createdAt
        const bT = b.lastMessageAt ?? b.createdAt
        return new Date(bT).getTime() - new Date(aT).getTime()
      })
      return {
        conversations: next,
        unreadCount: next.reduce((acc, c) => acc + c.unreadCount, 0),
      }
    }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: messages,
      },
    })),

  prependMessages: (conversationId, messages) =>
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? []
      const existingIds = new Set(existing.map((m) => m.id))
      const deduped = messages.filter((m) => !existingIds.has(m.id))
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: [...deduped, ...existing],
        },
      }
    }),

  appendMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? []
      if (existing.some((m) => m.id === message.id)) return state
      const updatedMessages = {
        ...state.messagesByConversation,
        [conversationId]: [...existing, message],
      }
      const conversations = state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: message,
              lastMessageAt: message.createdAt,
            }
          : c,
      )
      // re-sort
      conversations.sort((a, b) => {
        const aT = a.lastMessageAt ?? a.createdAt
        const bT = b.lastMessageAt ?? b.createdAt
        return new Date(bT).getTime() - new Date(aT).getTime()
      })
      return {
        messagesByConversation: updatedMessages,
        conversations,
      }
    }),

  markRead: (conversationId, ids) =>
    set((state) => {
      const idSet = new Set(ids)
      const list = state.messagesByConversation[conversationId] ?? []
      const updated = list.map((m) =>
        idSet.has(m.id) && !m.readAt
          ? { ...m, readAt: new Date().toISOString() }
          : m,
      )
      const conversations = state.conversations.map((c) => {
        if (c.id !== conversationId) return c
        const newUnread = Math.max(0, c.unreadCount - ids.length)
        return { ...c, unreadCount: newUnread }
      })
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: updated,
        },
        conversations,
        unreadCount: conversations.reduce((acc, c) => acc + c.unreadCount, 0),
      }
    }),

  setUnreadCount: (n) => set({ unreadCount: n }),

  setTyping: (conversationId, userId) =>
    set((state) => ({
      typingByConversation: {
        ...state.typingByConversation,
        [conversationId]: { userId, expiresAt: Date.now() + TYPING_TTL_MS },
      },
    })),

  clearTyping: (conversationId) =>
    set((state) => ({
      typingByConversation: {
        ...state.typingByConversation,
        [conversationId]: null,
      },
    })),

  setHasMore: (conversationId, hasMore) =>
    set((state) => ({
      hasMoreByConversation: {
        ...state.hasMoreByConversation,
        [conversationId]: hasMore,
      },
    })),

  reset: () =>
    set({
      conversations: [],
      messagesByConversation: {},
      hasMoreByConversation: {},
      unreadCount: 0,
      typingByConversation: {},
    }),
}))
