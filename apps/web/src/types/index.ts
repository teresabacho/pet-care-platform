import type { UserRole } from '@pet-care/shared'

export interface User {
  id: string
  email: string
  role: UserRole
  firstName: string | null
  lastName: string | null
  phone: string | null
  avatarUrl: string | null
  createdAt: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
}