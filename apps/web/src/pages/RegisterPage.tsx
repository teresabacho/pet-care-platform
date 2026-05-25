import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Check,
  HandHeart,
  Loader2,
  PawPrint,
  type LucideIcon,
} from 'lucide-react'
import { UserRole } from '@pet-care/shared'
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
import { cn } from '@/lib/utils'

interface RoleOption {
  value: UserRole
  title: string
  description: string
  icon: LucideIcon
}

const ROLES: RoleOption[] = [
  {
    value: UserRole.OWNER,
    title: 'Власник',
    description: 'Шукаю догляд для своєї тваринки',
    icon: PawPrint,
  },
  {
    value: UserRole.CARETAKER,
    title: 'Доглядальник',
    description: 'Хочу пропонувати свої послуги',
    icon: HandHeart,
  },
]

export default function RegisterPage() {
  const [params] = useSearchParams()
  const initialRole =
    params.get('role') === 'CARETAKER' ? UserRole.CARETAKER : UserRole.OWNER

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>(initialRole)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { login, setUser } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const tokens = await authService.register({ email, password, role })
      login(tokens)
      const user = await authService.getMe()
      setUser(user)
      // CARETAKER одразу веде на wizard — без публічного профілю він не видимий у пошуку.
      // OWNER іде на лендинг.
      if (role === UserRole.CARETAKER) {
        navigate('/settings/caretaker-profile/onboarding')
      } else {
        navigate('/')
      }
    } catch {
      setError('Помилка реєстрації. Можливо, цей email вже використовується.')
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
          <CardTitle className="text-2xl">Створити акаунт</CardTitle>
          <CardDescription>Лиш email і пароль — далі заповниш профіль</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Role tiles */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm">Я хочу зареєструватися як</Label>
              <div className="grid grid-cols-2 gap-2.5">
                {ROLES.map((opt) => {
                  const active = role === opt.value
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRole(opt.value)}
                      aria-pressed={active}
                      className={cn(
                        'group relative flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left transition-all',
                        'hover:border-zinc-400',
                        active
                          ? 'border-zinc-900 bg-zinc-900/5 ring-1 ring-zinc-900'
                          : 'border-zinc-200 bg-white',
                      )}
                    >
                      <span
                        className={cn(
                          'flex w-9 h-9 items-center justify-center rounded-full',
                          active
                            ? 'bg-zinc-900 text-white'
                            : 'bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200',
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-zinc-900">
                          {opt.title}
                        </span>
                        <span className="text-xs text-zinc-500 leading-snug">
                          {opt.description}
                        </span>
                      </div>
                      {active && (
                        <span className="absolute top-2.5 right-2.5 flex w-5 h-5 items-center justify-center rounded-full bg-zinc-900 text-white">
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">Мінімум 6 символів</p>
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
              {isLoading ? 'Реєструємо…' : 'Зареєструватися'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          Вже маєш акаунт?
          <Link
            to="/login"
            className="ml-1.5 font-medium text-zinc-900 hover:underline"
          >
            Увійти
          </Link>
        </CardFooter>
        </Card>
      </div>
    </div>
  )
}
