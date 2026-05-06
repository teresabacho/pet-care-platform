import { Link } from 'react-router-dom'
import { PawPrint, MapPin, Star, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import SearchForm from '../components/search/SearchForm'

const HOW_IT_WORKS = [
  {
    icon: <MapPin className="size-7 text-primary" />,
    title: 'Знайди виконавця',
    description: 'Введи місто та тип послуги — ми покажемо перевірених доглядальників поряд з тобою на карті.',
  },
  {
    icon: <Star className="size-7 text-primary" />,
    title: 'Замов послугу',
    description: 'Переглянь профіль, відгуки та ціни. Одне натискання — і бронювання оформлено.',
  },
  {
    icon: <ShieldCheck className="size-7 text-primary" />,
    title: 'Відстежуй у реальному часі',
    description: 'Під час вигулу або пансіону дивись на карті, де зараз твій улюбленець, в режимі реального часу.',
  },
]

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary/5 via-background to-background py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <PawPrint className="size-4" />
            Турбота про тварин поряд з тобою
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Надійний догляд<br />для твого улюбленця
          </h1>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Знаходь перевірених доглядальників у своєму місті — з відстеженням на карті в реальному часі.
          </p>

          <SearchForm className="max-w-4xl mx-auto" />
        </div>
      </section>

      {/* Quick links for authenticated users */}
      {isAuthenticated && (
        <section className="max-w-screen-xl mx-auto px-6 py-8 w-full">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Привіт, {user?.firstName ?? user?.email}! Швидкий доступ:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { to: '/bookings', label: 'Мої замовлення' },
              { to: '/pets', label: 'Мої тварини' },
              { to: '/profile', label: 'Профіль' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="bg-white border border-border rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="max-w-screen-xl mx-auto px-6 py-16 w-full">
        <h2 className="text-2xl font-bold text-foreground text-center mb-10">Як це працює</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-4">
              <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                {step.icon}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA for guests */}
      {!isAuthenticated && (
        <section className="bg-primary/5 border-t border-border py-14 px-4 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Стань доглядальником</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            Заробляй, допомагаючи тваринам. Реєструйся як виконавець і приймай замовлення.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Зареєструватись
          </Link>
        </section>
      )}
    </div>
  )
}
