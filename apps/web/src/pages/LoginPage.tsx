import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, PawPrint } from 'lucide-react'
import { authService } from '../services/auth.service'
import { useAuthStore } from '../store/authStore'
import AuthHeader from '../components/layout/AuthHeader'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { login, setUser } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const tokens = await authService.login({ email, password })
      login(tokens)
      const user = await authService.getMe()
      setUser(user)
      navigate('/')
    } catch {
      setError('Невірний email або пароль')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AuthHeader />
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-11 h-11 rounded-full bg-zinc-900 flex items-center justify-center">
            <PawPrint className="w-5 h-5 text-white" />
          </div>
          <CardTitle className="text-2xl">З поверненням</CardTitle>
          <CardDescription>Увійди, щоб продовжити</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ola@example.com"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-zinc-900 hover:bg-zinc-800"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Входимо…' : 'Увійти'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          Ще не маєте акаунту?
          <Link
            to="/register"
            className="ml-1.5 font-medium text-zinc-900 hover:underline"
          >
            Зареєструватися
          </Link>
        </CardFooter>
        </Card>
      </div>
    </div>
  )
}
