import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CreditCard, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { bookingsService } from '../services/bookings.service'
import { paymentsService } from '../services/payments.service'
import type { Booking } from '../types'

// Локальна заглушка чекауту — імітує оплату без реального провайдера.
// Після натискання «Оплатити» викликається POST /payments/bookings/:id/stub-confirm,
// який ставить paymentStatus=PAID. Архітектура (статуси, redirect, polling) така ж
// як для LiqPay — лише провайдер замінено.

export default function StubCheckoutPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const bookingId = searchParams.get('bookingId')

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242')
  const [expiry, setExpiry] = useState('12/30')
  const [cvv, setCvv] = useState('123')
  const [cardholder, setCardholder] = useState('TEST USER')

  useEffect(() => {
    if (!bookingId) {
      setLoading(false)
      return
    }
    bookingsService
      .getOne(bookingId)
      .then(setBooking)
      .catch(() => setError('Замовлення не знайдено'))
      .finally(() => setLoading(false))
  }, [bookingId])

  async function handlePay() {
    if (!bookingId) return
    setError(null)
    setSubmitting(true)
    try {
      await paymentsService.stubConfirm(bookingId)
      // Імітуємо LiqPay-flow — повертаємо користувача на /bookings з тими ж query-параметрами
      navigate(`/bookings?paid=1&bookingId=${bookingId}`)
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Не вдалося провести оплату'
      setError(typeof msg === 'string' ? msg : 'Помилка')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <p className="text-zinc-500 mb-4">Замовлення не знайдено.</p>
        <Link to="/bookings" className="text-zinc-900 underline">
          ← До замовлень
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-zinc-900 text-white px-5 py-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          <div>
            <p className="text-sm font-semibold">Безпечна оплата</p>
            <p className="text-[11px] text-zinc-400">
              Тестовий режим — реальні гроші не списуються
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-zinc-100">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
            До оплати
          </p>
          <p className="text-2xl font-semibold text-zinc-900">
            {booking.price} грн
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Замовлення {booking.id.slice(0, 8)}
          </p>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-number">Номер картки</Label>
            <div className="relative">
              <Input
                id="card-number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4242 4242 4242 4242"
                className="pl-9 tabular-nums"
              />
              <CreditCard className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="card-expiry">Термін дії</Label>
              <Input
                id="card-expiry"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="MM/YY"
                className="tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="card-cvv">CVV</Label>
              <Input
                id="card-cvv"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="123"
                maxLength={4}
                className="tabular-nums"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-name">Власник картки</Label>
            <Input
              id="card-name"
              value={cardholder}
              onChange={(e) => setCardholder(e.target.value)}
              placeholder="IVAN IVANENKO"
              className="uppercase"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md p-2">
              {error}
            </p>
          )}

          <Button
            type="button"
            onClick={handlePay}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              `Оплатити ${booking.price} грн`
            )}
          </Button>

          <button
            type="button"
            onClick={() => navigate(`/bookings`)}
            disabled={submitting}
            className="text-xs text-zinc-500 hover:text-zinc-900 mt-1"
          >
            Скасувати оплату
          </button>
        </div>

        <p className="text-[11px] text-zinc-400 text-center px-5 py-3 border-t border-zinc-100 bg-zinc-50">
          Це stub-чекаут для розробки. У продакшені тут буде LiqPay/Monobank/Stripe.
        </p>
      </div>
    </div>
  )
}
