import { Link } from 'react-router-dom'

// Мінімальний хедер для сторінок входу/реєстрації — тільки логотип PawMate,
// який веде на лендінг. Без меню та CTA, щоб не відволікати від форми.
export default function AuthHeader() {
  return (
    <header className="bg-white border-b border-zinc-200">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center">
        <Link
          to="/"
          className="text-base font-bold text-zinc-900 tracking-tight hover:text-zinc-700 transition-colors"
        >
          PawMate
        </Link>
      </nav>
    </header>
  )
}
