import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore()

  if (isAuthenticated) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">
          Привіт, {user?.firstName ?? user?.email}! 👋
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/search"
            className="bg-white p-6 rounded-xl shadow hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="text-3xl mb-3">🔍</div>
            <h2 className="font-semibold text-lg mb-1">Знайти виконавця</h2>
            <p className="text-gray-500 text-sm">Пошук доглядальників поблизу</p>
          </Link>
          <Link
            to="/bookings"
            className="bg-white p-6 rounded-xl shadow hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="text-3xl mb-3">📋</div>
            <h2 className="font-semibold text-lg mb-1">Мої замовлення</h2>
            <p className="text-gray-500 text-sm">Поточні та минулі бронювання</p>
          </Link>
          <Link
            to="/pets"
            className="bg-white p-6 rounded-xl shadow hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="text-3xl mb-3">🐾</div>
            <h2 className="font-semibold text-lg mb-1">Мої тварини</h2>
            <p className="text-gray-500 text-sm">Профілі ваших улюбленців</p>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-6">🐾</div>
      <h1 className="text-4xl font-bold mb-4 text-gray-800">
        PetCare — Догляд за тваринами
      </h1>
      <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto">
        Знайдіть надійного доглядальника для вашого улюбленця поблизу
      </p>
      <div className="flex justify-center gap-4">
        <Link
          to="/register"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
        >
          Почати
        </Link>
        <Link
          to="/login"
          className="border border-blue-600 text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 font-medium"
        >
          Увійти
        </Link>
      </div>
    </div>
  )
}