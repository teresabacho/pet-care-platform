import { Link, useNavigate, useLocation } from 'react-router-dom'
import { PawPrint, LogIn, LogOut, User, BookOpen, Search, Dog } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation()
  const active = pathname === to

  return (
    <Link
      to={to}
      className={cn(
        'text-sm font-medium px-3 py-2 rounded-md transition-colors',
        active
          ? 'text-primary bg-accent'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
      )}
    >
      {children}
    </Link>
  )
}

export default function Header() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
      <nav className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <PawPrint className="size-5 text-primary" />
          <span className="font-bold text-base text-foreground tracking-tight">PetCare</span>
        </Link>

        {/* Centre nav links */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/search">
            <span className="flex items-center gap-1.5">
              <Search className="size-3.5" />
              Знайти доглядальника
            </span>
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/pets">
                <span className="flex items-center gap-1.5">
                  <Dog className="size-3.5" />
                  Мої тварини
                </span>
              </NavLink>
              <NavLink to="/bookings">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="size-3.5" />
                  Замовлення
                </span>
              </NavLink>
            </>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2"
              >
                <User className="size-4" />
                {user?.firstName ?? user?.email}
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="size-3.5 mr-1.5" />
                Вийти
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">
                  <LogIn className="size-3.5 mr-1.5" />
                  Увійти
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Реєстрація</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
