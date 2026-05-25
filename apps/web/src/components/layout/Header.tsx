import { Link, useNavigate } from 'react-router-dom'
import { UserRole } from '@pet-care/shared'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Heart, MessageCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Header() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const unreadCount = useChatStore((s) => s.unreadCount)
  const navigate = useNavigate()

  const initials = user?.firstName
    ? user.firstName[0].toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? '?')

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="bg-white border-b border-zinc-200">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-base font-bold text-zinc-900 tracking-tight">
            PawMate
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Знайти доглядальника
          </Link>
        </div>

        <div className="flex items-center gap-1">
          {isAuthenticated ? (
            <>
              <Link
                to="/favorites"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5 text-zinc-600 font-medium')}
              >
                <Heart className="w-4 h-4" />
                Уподобані виконавці
              </Link>

              <Link
                to="/messages"
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'gap-1.5 text-zinc-600 font-medium relative',
                )}
              >
                <MessageCircle className="w-4 h-4" />
                Повідомлення
                {unreadCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-zinc-900 text-white text-[10px] font-semibold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2 font-medium')}
                >
                  <Avatar size="sm">
                    <AvatarFallback className="text-xs bg-zinc-900 text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  Профіль
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    Мій акаунт
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/bookings')}>
                    Мої замовлення
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/pets')}>
                    Мої тварини
                  </DropdownMenuItem>
                  {user?.role === UserRole.CARETAKER && (
                    <DropdownMenuItem onClick={() => navigate('/settings/caretaker-profile')}>
                      Профіль виконавця
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-600"
                  >
                    Вийти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'font-medium')}
              >
                Увійти
              </Link>
              <Link
                to="/register"
                className={cn(buttonVariants({ size: 'sm' }), 'bg-zinc-900 hover:bg-zinc-800 text-white font-medium')}
              >
                Зареєструватися
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
