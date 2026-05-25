import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { TileSelectDropdown, type TileOption } from '@/components/ui/tile-select-dropdown'
import { CitySelectDropdown, EMPTY_CITY, type CityValue } from '@/components/ui/city-select-dropdown'
import { DateRangePopover } from '@/components/ui/date-range-popover'

const PET_OPTIONS: TileOption[] = [
  { value: 'dog', label: 'Собака', emoji: '🐕' },
  { value: 'cat', label: 'Кіт', emoji: '🐈' },
  { value: 'rodent', label: 'Гризун', emoji: '🐹' },
  { value: 'bird', label: 'Птах', emoji: '🦜' },
  { value: 'other', label: 'Інша тварина', emoji: '🐾' },
]

const SERVICE_OPTIONS: TileOption[] = [
  { value: 'boarding', label: 'Перетримка у доглядальника', emoji: '🏡' },
  { value: 'sitting', label: 'Догляд вдома', emoji: '🏠' },
  { value: 'walking', label: 'Вигул улюбленця', emoji: '🦮' },
  { value: 'daycare', label: 'Денна сидівка', emoji: '☀️' },
  { value: 'grooming', label: 'Грумінг', emoji: '✂️' },
]

function HeroSection() {
  const navigate = useNavigate()
  const [pet, setPet] = useState('')
  const [service, setService] = useState('')
  const [city, setCity] = useState<CityValue>(EMPTY_CITY)
  const [dates, setDates] = useState<DateRange | undefined>(undefined)
  const [flexibleDates, setFlexibleDates] = useState(false)
  function handleSearch() {
    const params = new URLSearchParams()
    if (pet) params.set('pet', pet)
    if (service) params.set('service', service)
    if (city.label) {
      params.set('city', city.label)
      if (city.lat != null) params.set('lat', city.lat.toString())
      if (city.lng != null) params.set('lng', city.lng.toString())
      if (city.country) params.set('country', city.country)
    }
    if (flexibleDates) {
      params.set('flexible', '1')
    } else {
      if (dates?.from) params.set('from', format(dates.from, 'yyyy-MM-dd'))
      if (dates?.to) params.set('to', format(dates.to, 'yyyy-MM-dd'))
    }
    navigate(`/search?${params.toString()}`)
  }

  return (
    <section className="relative overflow-hidden">
      {/* background image */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none rounded-xl mx-8 mt-4"
        style={{ backgroundImage: 'url(/hero.png)' }}
      />

      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-0 text-center">
        <h1
          className="text-5xl font-bold text-white leading-tight max-w-2xl mx-auto"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.4)' }}
        >
          Дбайливі люди для ваших пухнастих друзів
        </h1>
      </div>

      {/* search card */}
      <div className="relative max-w-5xl mx-auto mt-26 mb-0 px-6">
        <div className="bg-white/40 backdrop-blur-md border border-white/50 shadow-lg rounded-lg px-10 py-8 flex flex-col gap-6 items-center">
          {/* fields row */}
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <TileSelectDropdown
              label="Для кого шукаємо помічника?"
              placeholder="Виберіть улюбленця"
              options={PET_OPTIONS}
              value={pet}
              onChange={setPet}
              className="flex-1"
            />

            <TileSelectDropdown
              label="Яка послуга потрібна?"
              placeholder="Оберіть послугу"
              options={SERVICE_OPTIONS}
              value={service}
              onChange={setService}
              className="flex-1"
            />

            <CitySelectDropdown
              label="У якому місті?"
              placeholder="Оберіть місто чи адресу"
              value={city}
              onChange={setCity}
              className="flex-1"
            />

            <DateRangePopover
              label="На які дати?"
              placeholder="Оберіть дати"
              value={dates}
              flexible={flexibleDates}
              onChange={(range, flexible) => {
                setDates(range)
                setFlexibleDates(flexible)
              }}
              className="flex-1"
            />

          </div>

          {/* buttons */}
          <div className="flex flex-col items-center gap-3 w-full">
            <button
              onClick={handleSearch}
              className="bg-zinc-900 text-white rounded-md h-10 px-6 text-sm font-medium w-80 hover:bg-zinc-800 transition-colors"
            >
              Шукати
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-2">
    </section>
  )
}

function BenefitsSection() {
  const benefits = [
    'Перевірені доглядальники',
    'Відгуки реальних власників',
    'GPS-трекінг під час прогулянки',
    'Зручне онлайн-бронювання',
    'Підтримка 24/7',
    'Гарантія якості послуг',
  ]

  return (
    <section className="bg-zinc-50 py-20">
      <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row gap-12 items-center">
        <div className="flex-1">
          <h2 className="text-4xl font-bold text-zinc-900 mb-4">Що ви отримуєте з PawMate</h2>
          <p className="text-zinc-500 text-base mb-8 max-w-sm">
            Ми дбаємо про вашого улюбленця так само, як дбаєте ви. Турботливі люди, підтверджені відгуки, надійний сервіс.
          </p>
          <ul className="flex flex-col gap-3">
            {benefits.map(b => (
              <li key={b} className="flex items-center gap-3 text-zinc-700 text-sm">
                <span className="w-5 h-5 flex-shrink-0 text-zinc-900">✓</span>
                {b}
              </li>
            ))}
          </ul>
          <Link
            to="/register"
            className="mt-8 inline-block bg-zinc-900 text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Спробувати безкоштовно
          </Link>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
          <div className="bg-zinc-100 rounded-lg h-48 mb-4 flex items-center justify-center text-4xl">🐾</div>
          <p className="font-semibold text-zinc-900 text-sm mb-1">Марія Коваленко</p>
          <p className="text-zinc-500 text-xs mb-3">Доглядальник • Київ</p>
          <div className="flex items-center gap-1 text-yellow-400 text-sm mb-3">
            {'★'.repeat(5)}
            <span className="text-zinc-500 text-xs ml-1">4.9 (127 відгуків)</span>
          </div>
          <p className="text-zinc-500 text-xs leading-relaxed">
            Досвідчений доглядальник із 5-річним стажем. Люблю тварин і ставлюся до кожного улюбленця як до власного.
          </p>
        </div>
      </div>
    </section>
  )
}

function ServiceCardsSection() {
  const services = [
    {
      emoji: '🏡',
      title: 'Догляд вдома',
      desc: 'Доглядальник приходить до вас додому і доглядає за вашим улюбленцем у звичному для нього середовищі.',
      badge: 'Найпопулярніше',
    },
    {
      emoji: '🦮',
      title: 'Денний догляд',
      desc: 'Ваш улюбленець проводить день у доглядальника в теплій домашній атмосфері, поки ви на роботі.',
      badge: null,
    },
    {
      emoji: '🌙',
      title: 'Нічна перетримка',
      desc: 'Ваш улюбленець залишається у перевіреного доглядальника на ніч або кілька днів.',
      badge: null,
    },
  ]

  return (
    <section className="max-w-5xl mx-auto px-6 py-20">
      <div className="text-center mb-14">
        <h2 className="text-4xl font-bold text-zinc-900">
          Ваш улюбленець у добрих руках — від першого кліку до повернення додому
        </h2>
        <p className="mt-4 text-base text-zinc-500 max-w-xl mx-auto">
          Підберіть послугу, яка підходить саме вам. Усі доглядальники на PawMate перевірені та мають реальні відгуки.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map(s => (
          <div key={s.title} className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-zinc-100 h-40 flex items-center justify-center text-5xl">{s.emoji}</div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-zinc-900 text-base">{s.title}</h3>
                {s.badge && (
                  <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {s.badge}
                  </span>
                )}
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Олена Ткач',
      role: 'Власниця такси Тара',
      text: 'Скористалась сервісом вперше і залишилась у захваті. Доглядальниця Марія була уважна та турботлива. Тара поверталась задоволена та весела!',
      rating: 5,
    },
    {
      name: 'Дмитро Савченко',
      role: 'Власник двох котів',
      text: 'Чудовий сервіс! Зручне бронювання, GPS-трекінг прогулянок і чесні відгуки. Нарешті знайшов доглядальника, якому можна довіряти.',
      rating: 5,
    },
    {
      name: 'Ліна Мороз',
      role: 'Власниця шпіца Бублика',
      text: 'Скористалась розумним підбором і дуже задоволена результатом. Бублик в захваті від нового вигульника. Рекомендую всім!',
      rating: 5,
    },
  ]

  return (
    <section className="bg-zinc-50 py-20">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-zinc-900 text-center mb-4">
          Інші власники вже довірили нам своїх улюбленців
        </h2>
        <p className="text-zinc-500 text-center text-base mb-12">
          Реальні відгуки від власників, які скористались PawMate
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(t => (
            <div key={t.name} className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
              <div className="flex items-center gap-1 text-yellow-400 text-sm mb-4">
                {'★'.repeat(t.rating)}
              </div>
              <p className="text-zinc-700 text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center text-base">
                  🐾
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 text-sm">{t.name}</p>
                  <p className="text-zinc-500 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null)

  const items = [
    {
      q: 'Що таке PawMate?',
      a: 'PawMate — це платформа, яка з\'єднує власників домашніх тварин із перевіреними доглядальниками та вигульниками. Ми допомагаємо знайти надійного фахівця швидко та безпечно.',
    },
    {
      q: 'Як працює розумний підбір ШІ?',
      a: 'Ви заповнюєте коротку анкету про свою тварину та побажання. Наш ШІ аналізує ці дані і підбирає доглядальників, які найкраще підходять саме вам.',
    },
    {
      q: 'Чи перевірені доглядальники на платформі?',
      a: 'Так. Усі доглядальники проходять верифікацію та мають підтверджені відгуки від реальних власників.',
    },
    {
      q: 'Що робити, якщо щось пішло не так?',
      a: 'Наша служба підтримки доступна 24/7. Напишіть нам або зателефонуйте — ми допоможемо вирішити будь-яку ситуацію.',
    },
    {
      q: 'Як здійснюється оплата?',
      a: 'Оплата проводиться безпечно через платформу після підтвердження бронювання. Ми підтримуємо картки Visa, Mastercard та інші популярні методи.',
    },
  ]

  return (
    <section className="max-w-3xl mx-auto px-6 py-20">
      <h2 className="text-4xl font-bold text-zinc-900 text-center mb-12">Часті запитання</h2>

      <div className="flex flex-col divide-y divide-zinc-200">
        {items.map((item, i) => (
          <div key={i} className="py-4">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex items-center justify-between w-full text-left gap-4"
            >
              <span className="font-medium text-zinc-900 text-sm">{item.q}</span>
              <span className="text-zinc-400 text-lg flex-shrink-0">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && (
              <p className="mt-3 text-sm text-zinc-500 leading-relaxed">{item.a}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 bg-zinc-50 rounded-xl p-8 text-center">
        <h3 className="font-semibold text-zinc-900 text-lg mb-2">Залишилось питання?</h3>
        <p className="text-zinc-500 text-sm mb-5">Напишіть нам — відповімо протягом кількох хвилин</p>
        <Link
          to="/register"
          className="inline-block bg-zinc-900 text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          Зв'язатись з нами
        </Link>
      </div>
    </section>
  )
}

function ContactSection() {
  const [email, setEmail] = useState('')

  return (
    <section className="bg-zinc-50 py-20">
      <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row gap-12">
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">Залишайтесь з нами</h2>
          <p className="text-zinc-500 text-sm mb-6 max-w-sm">
            Отримуйте корисні поради з догляду за тваринами та ексклюзивні пропозиції PawMate першими.
          </p>
          <div className="flex gap-2 max-w-sm">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Ваш email"
              className="flex-1 border border-zinc-200 rounded-md h-10 px-3 text-sm bg-white"
            />
            <button
              onClick={() => setEmail('')}
              className="bg-zinc-900 text-white rounded-md px-4 text-sm font-medium hover:bg-zinc-800 transition-colors h-10"
            >
              Підписатись
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 text-sm text-zinc-600">
          <h3 className="font-semibold text-zinc-900">Наші контакти</h3>
          <p>📧 hello@pawmate.ua</p>
          <p>📞 +38 (073) 000-00-00</p>
          <p>📍 Київ, Україна</p>
        </div>
      </div>
    </section>
  )
}

function FooterSection() {
  return (
    <footer className="bg-zinc-900 text-zinc-400 py-12">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <p className="font-bold text-white text-base mb-4">PawMate</p>
            <p className="text-xs leading-relaxed">Турботливий сервіс для ваших улюбленців</p>
          </div>
          <div>
            <p className="font-semibold text-zinc-300 text-sm mb-3">Сервіс</p>
            <ul className="flex flex-col gap-2 text-xs">
              <li><Link to="/search" className="hover:text-white transition-colors">Знайти доглядальника</Link></li>
              <li><Link to="/search" className="hover:text-white transition-colors">Знайти вигульника</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Стати доглядальником</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-zinc-300 text-sm mb-3">Компанія</p>
            <ul className="flex flex-col gap-2 text-xs">
              <li><Link to="/" className="hover:text-white transition-colors">Про нас</Link></li>
              <li><Link to="/" className="hover:text-white transition-colors">Блог</Link></li>
              <li><Link to="/" className="hover:text-white transition-colors">Кар'єра</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-zinc-300 text-sm mb-3">Підтримка</p>
            <ul className="flex flex-col gap-2 text-xs">
              <li><Link to="/" className="hover:text-white transition-colors">Часті питання</Link></li>
              <li><Link to="/" className="hover:text-white transition-colors">Умови використання</Link></li>
              <li><Link to="/" className="hover:text-white transition-colors">Конфіденційність</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-zinc-800 pt-6 text-xs text-center">
          © 2024 PawMate. Всі права захищено.
        </div>
      </div>
    </footer>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────

import CaretakerOnboardingBanner from '../components/CaretakerOnboardingBanner'

export default function HomePage() {
  return (
    <div className="bg-white">
      <CaretakerOnboardingBanner />
      <HeroSection />
      <HowItWorksSection />
      <BenefitsSection />
      <ServiceCardsSection />
      <TestimonialsSection />
      <FaqSection />
      <ContactSection />
      <FooterSection />
    </div>
  )
}
