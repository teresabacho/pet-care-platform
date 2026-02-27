import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserRole } from '@pet-care/shared'
import { authService } from '../services/auth.service'
import { useAuthStore } from '../store/authStore'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>(UserRole.OWNER)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { login, setUser } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const tokens = await authService.register({ email, password, role })
      login(tokens)
      const user = await authService.getMe()
      setUser(user)
      navigate('/')
    } catch {
      setError('Помилка реєстрації. Можливо, цей email вже використовується.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Реєстрація</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Я є
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value={UserRole.OWNER}
                  checked={role === UserRole.OWNER}
                  onChange={() => setRole(UserRole.OWNER)}
                  className="text-blue-600"
                />
                <span>Власник тварини</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value={UserRole.CARETAKER}
                  checked={role === UserRole.CARETAKER}
                  onChange={() => setRole(UserRole.CARETAKER)}
                  className="text-blue-600"
                />
                <span>Доглядальник</span>
              </label>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isLoading ? 'Реєструємо...' : 'Зареєструватися'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Вже маєте акаунт?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Увійти
          </Link>
        </p>
      </div>
    </div>
  )
}