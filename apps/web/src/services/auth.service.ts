import { apiClient } from './api'
import type { UserRole } from '@pet-care/shared'
import type { User, AuthTokens } from '../types'

interface RegisterDto {
  email: string
  password: string
  role?: UserRole
}

interface LoginDto {
  email: string
  password: string
}

export const authService = {
  async register(dto: RegisterDto): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>('/auth/register', dto)
    return data
  },

  async login(dto: LoginDto): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>('/auth/login', dto)
    return data
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get<User>('/auth/me')
    return data
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>('/auth/refresh', {
      refresh_token: refreshToken,
    })
    return data
  },
}