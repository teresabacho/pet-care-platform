import { apiClient } from './api'
import { MessageType } from '@pet-care/shared'
import type { ChatConversation, ChatMessage } from '../types'

export interface SendMessagePayload {
  messageType: MessageType
  text?: string
  mediaItemIds?: string[]
}

export const chatService = {
  async startConversation(otherUserId: string): Promise<{ id: string }> {
    const { data } = await apiClient.post<{ id: string }>(
      '/chat/conversations',
      { otherUserId },
    )
    return data
  },

  async listConversations(): Promise<ChatConversation[]> {
    const { data } = await apiClient.get<ChatConversation[]>(
      '/chat/conversations',
    )
    return data
  },

  async listMessages(
    conversationId: string,
    cursor?: string,
    limit = 50,
  ): Promise<ChatMessage[]> {
    const params: Record<string, string | number> = { limit }
    if (cursor) params.cursor = cursor
    const { data } = await apiClient.get<ChatMessage[]>(
      `/chat/conversations/${conversationId}/messages`,
      { params },
    )
    return data
  },

  async sendMessage(
    conversationId: string,
    payload: SendMessagePayload,
  ): Promise<ChatMessage> {
    const { data } = await apiClient.post<ChatMessage>(
      `/chat/conversations/${conversationId}/messages`,
      payload,
    )
    return data
  },

  async markRead(conversationId: string): Promise<{ markedIds: string[] }> {
    const { data } = await apiClient.post<{ markedIds: string[] }>(
      `/chat/conversations/${conversationId}/mark-read`,
    )
    return data
  },

  async unreadCount(): Promise<number> {
    const { data } = await apiClient.get<{ count: number }>(
      '/chat/unread-count',
    )
    return data.count
  },
}
