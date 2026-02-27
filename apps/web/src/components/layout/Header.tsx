import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function Header() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-white shadow-sm">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-blue-600">
          PetCare
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {isAuthenticated ? (
            <>
              <Link to="/search" className="text-gray-600 hover:text-blue-600">
                Пошук
              </Link>
              <Link to="/pets" className="text-gray-600 hover:text-blue-600">
                Мої тварини
              </Link>
              <Link to="/bookings" className="text-gray-600 hover:text-blue-600">
                Замовлення
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-700 font-medium">
                {user?.firstName ?? user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-500"
              >
                Вийти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-blue-600">
                Увійти
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700"
              >
                Реєстрація
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}