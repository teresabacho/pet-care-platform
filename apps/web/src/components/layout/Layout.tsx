import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'

export default function Layout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="min-h-screen bg-white">
      <Header />
      {isHome ? (
        <Outlet />
      ) : (
        <main className="container mx-auto px-4 py-6">
          <Outlet />
        </main>
      )}
    </div>
  )
}