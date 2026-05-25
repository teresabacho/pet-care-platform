import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BookingStatus, PaymentStatus, ServiceType } from '@pet-care/shared'
import { bookingsService } from '../services/bookings.service'
import { paymentsService, submitToLiqPay } from '../services/payments.service'
import { useAuthStore } from '../store/authStore'
import ReviewForm from '../components/ReviewForm'
import type { Booking } from '../types'

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.AWAITING_PAYMENT]: 'Очікує оплати',
  [PaymentStatus.PAID]: 'Оплачено',
  [PaymentStatus.FAILED]: 'Помилка оплати',
  [PaymentStatus.REFUNDED]: 'Повернено',
}

const PAYMENT_COLORS: Record<PaymentStatus, string> = {
  [PaymentStatus.AWAITING_PAYMENT]: 'bg-amber-100 text-amber-700',
  [PaymentStatus.PAID]: 'bg-emerald-100 text-emerald-700',
  [PaymentStatus.FAILED]: 'bg-red-100 text-red-700',
  [PaymentStatus.REFUNDED]: 'bg-gray-100 text-gray-600',
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'Очікує підтвердження',
  [BookingStatus.CONFIRMED]: 'Підтверджено',
  [BookingStatus.HANDOVER_PENDING]: 'Передача тварини',
  [BookingStatus.IN_PROGRESS]: 'В процесі',
  [BookingStatus.RETURN_PENDING]: 'Повернення тварини',
  [BookingStatus.COMPLETED]: 'Завершено',
  [BookingStatus.CANCELLED]: 'Скасовано',
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'bg-yellow-100 text-yellow-700',
  [BookingStatus.CONFIRMED]: 'bg-blue-100 text-blue-700',
  [BookingStatus.HANDOVER_PENDING]: 'bg-orange-100 text-orange-700',
  [BookingStatus.IN_PROGRESS]: 'bg-green-100 text-green-700',
  [BookingStatus.RETURN_PENDING]: 'bg-orange-100 text-orange-700',
  [BookingStatus.COMPLETED]: 'bg-gray-100 text-gray-600',
  [BookingStatus.CANCELLED]: 'bg-red-100 text-red-600',
}

const SERVICE_LABELS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: 'Вигул',
  [ServiceType.PET_SITTING]: 'Догляд вдома',
  [ServiceType.BOARDING]: 'Пансіон',
  [ServiceType.GROOMING]: 'Грумінг',
  [ServiceType.VET_VISIT]: 'Ветеринар',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('uk-UA', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function BookingsPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(
    searchParams.get('highlight') ?? searchParams.get('bookingId'),
  )
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [reviewFormId, setReviewFormId] = useState<string | null>(null)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null)

  useEffect(() => {
    bookingsService.getMyBookings()
      .then(setBookings)
      .finally(() => setIsLoading(false))
  }, [])

  // Якщо повернулися з LiqPay (?paid=1&bookingId=...), опитуємо статус.
  useEffect(() => {
    const paidFlag = searchParams.get('paid')
    const targetId = searchParams.get('bookingId')
    if (paidFlag !== '1' || !targetId) return
    setPaymentNotice('Перевіряємо статус оплати…')
    paymentsService
      .checkStatus(targetId)
      .then(async (res) => {
        // оновлюємо локальний список — перезавантажуємо
        const fresh = await bookingsService.getMyBookings()
        setBookings(fresh)
        if (res.paymentStatus === PaymentStatus.PAID) {
          setPaymentNotice('Оплату успішно отримано.')
        } else if (res.paymentStatus === PaymentStatus.FAILED) {
          setPaymentNotice('Оплата не пройшла. Спробуйте ще раз.')
        } else {
          setPaymentNotice(
            'Оплата ще обробляється. Спробуйте оновити сторінку за хвилину.',
          )
        }
      })
      .catch(() => setPaymentNotice('Не вдалося перевірити статус оплати.'))
      .finally(() => {
        const next = new URLSearchParams(searchParams)
        next.delete('paid')
        next.delete('bookingId')
        setSearchParams(next, { replace: true })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handlePay(bookingId: string) {
    setActionLoading(`pay-${bookingId}`)
    try {
      const invoice = await paymentsService.createInvoice(bookingId)
      if (invoice.mode === 'stub') {
        // Внутрішня заглушка — navigate замість full-page submit
        navigate(invoice.checkoutUrl)
        return
      }
      submitToLiqPay(invoice)
      // success-шлях не очищає loading — браузер уже редіректить на LiqPay
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Не вдалося створити інвойс'
      setPaymentNotice(typeof msg === 'string' ? msg : 'Помилка оплати')
      setActionLoading(null)
    }
  }

  const updateBooking = (updated: Booking) =>
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))

  const doAction = async (action: () => Promise<Booking>, key: string) => {
    setActionLoading(key)
    try {
      const updated = await action()
      updateBooking(updated)
    } finally {
      setActionLoading(null)
    }
  }

  const cancelWithReason = async (bookingId: string, key: string) => {
    const reason = window.prompt(
      'Вкажіть причину скасування (буде показано іншій стороні):',
      '',
    )
    if (!reason || !reason.trim()) return
    await doAction(
      () =>
        bookingsService.updateStatus(
          bookingId,
          BookingStatus.CANCELLED,
          reason.trim(),
        ),
      key,
    )
  }

  const renderActions = (booking: Booking) => {
    if (!user) return null
    const isOwner = booking.ownerId === user.id
    const isCaretaker = booking.caretakerId === user.id
    const busy = (key: string) => actionLoading === key

    const btn = (label: string, action: () => Promise<Booking>, key: string, danger = false) => (
      <button
        key={key}
        disabled={!!actionLoading}
        onClick={() => doAction(action, key)}
        className={`text-xs px-3 py-1.5 rounded-lg border disabled:opacity-40 ${
          danger
            ? 'border-red-300 text-red-600 hover:bg-red-50'
            : 'border-blue-300 text-blue-700 hover:bg-blue-50'
        }`}
      >
        {busy(key) ? '...' : label}
      </button>
    )

    const cancelBtn = (key: string) => (
      <button
        key={key}
        disabled={!!actionLoading}
        onClick={() => cancelWithReason(booking.id, key)}
        className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40"
      >
        {busy(key) ? '...' : 'Скасувати'}
      </button>
    )

    switch (booking.status) {
      case BookingStatus.PENDING:
        return (
          <>
            {isCaretaker && btn('Підтвердити', () => bookingsService.updateStatus(booking.id, BookingStatus.CONFIRMED), `confirm-${booking.id}`)}
            {(isOwner || isCaretaker) && cancelBtn(`cancel-${booking.id}`)}
          </>
        )
      case BookingStatus.CONFIRMED:
        return (
          <>
            {isCaretaker && btn('Почати передачу', () => bookingsService.updateStatus(booking.id, BookingStatus.HANDOVER_PENDING), `handover-start-${booking.id}`)}
            {(isOwner || isCaretaker) && cancelBtn(`cancel-${booking.id}`)}
          </>
        )
      case BookingStatus.HANDOVER_PENDING: {
        const myHandover = isOwner ? booking.handoverConfirmedByOwner : booking.handoverConfirmedByCaretaker
        return (
          <>
            {!myHandover && btn(
              isOwner ? 'Підтвердити отримання' : 'Підтвердити передачу',
              () => bookingsService.confirmHandover(booking.id),
              `handover-confirm-${booking.id}`
            )}
            <span className="text-xs text-gray-400">
              Власник: {booking.handoverConfirmedByOwner ? '✓' : '–'} | Виконавець: {booking.handoverConfirmedByCaretaker ? '✓' : '–'}
            </span>
          </>
        )
      }
      case BookingStatus.IN_PROGRESS:
        return (
          <>
            {isCaretaker && btn('Почати повернення', () => bookingsService.updateStatus(booking.id, BookingStatus.RETURN_PENDING), `return-start-${booking.id}`)}
          </>
        )
      case BookingStatus.RETURN_PENDING: {
        const myReturn = isOwner ? booking.returnConfirmedByOwner : booking.returnConfirmedByCaretaker
        return (
          <>
            {!myReturn && btn(
              isOwner ? 'Підтвердити повернення' : 'Підтвердити здачу',
              () => bookingsService.confirmReturn(booking.id),
              `return-confirm-${booking.id}`
            )}
            <span className="text-xs text-gray-400">
              Власник: {booking.returnConfirmedByOwner ? '✓' : '–'} | Виконавець: {booking.returnConfirmedByCaretaker ? '✓' : '–'}
            </span>
          </>
        )
      }
      default:
        return null
    }
  }

  if (isLoading) return <div className="text-center py-12 text-gray-400">Завантаження...</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Замовлення</h1>

      {paymentNotice && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900 flex items-start justify-between gap-3">
          <span>{paymentNotice}</span>
          <button
            type="button"
            onClick={() => setPaymentNotice(null)}
            className="text-amber-700 hover:text-amber-900"
          >
            ✕
          </button>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow">
          <p className="text-gray-500">У вас ще немає замовлень</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const isExpanded = activeId === booking.id
            const isOwner = booking.ownerId === user?.id
            return (
              <div key={booking.id} className="bg-white rounded-xl shadow overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => setActiveId(isExpanded ? null : booking.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">
                        {SERVICE_LABELS[booking.serviceType]}
                        {booking.pet && <span className="text-gray-400"> · {booking.pet.name}</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(booking.scheduledStart)}
                        {isOwner ? ' · як власник' : ' · як виконавець'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[booking.status]}`}>
                      {STATUS_LABELS[booking.status]}
                    </span>
                    <span className="text-gray-300 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-5 pb-4 border-t space-y-3 pt-3">
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <p className="text-xs text-gray-400">Початок</p>
                        <p>{formatDate(booking.scheduledStart)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Кінець</p>
                        <p>{formatDate(booking.scheduledEnd)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Вартість</p>
                        <p className="font-semibold">{booking.price} грн</p>
                        <span
                          className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded ${PAYMENT_COLORS[booking.paymentStatus]}`}
                        >
                          {PAYMENT_LABELS[booking.paymentStatus]}
                        </span>
                      </div>
                      {booking.pet && (
                        <div>
                          <p className="text-xs text-gray-400">Тварина</p>
                          <p>{booking.pet.name}{booking.pet.breed ? ` (${booking.pet.breed})` : ''}</p>
                        </div>
                      )}
                    </div>
                    {booking.notes && (
                      <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        {booking.notes}
                      </p>
                    )}
                    {booking.cancellationReason && (
                      <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-red-700 mb-0.5">
                          Причина скасування
                          {booking.cancelledByUserId === user?.id
                            ? ' (ви)'
                            : booking.cancelledByUserId === booking.caretakerId
                              ? ' (доглядальник)'
                              : booking.cancelledByUserId === booking.ownerId
                                ? ' (власник)'
                                : ''}
                        </p>
                        <p className="text-sm text-red-900">
                          {booking.cancellationReason}
                        </p>
                      </div>
                    )}
                    {isOwner && (
                      <Link
                        to={`/caretaker/${booking.caretakerId}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Профіль виконавця →
                      </Link>
                    )}
                    {(booking.status === BookingStatus.IN_PROGRESS ||
                      booking.status === BookingStatus.RETURN_PENDING ||
                      booking.status === BookingStatus.COMPLETED) && (
                      <Link
                        to={`/bookings/${booking.id}/tracking`}
                        className="inline-block text-xs px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 font-medium"
                      >
                        {booking.status === BookingStatus.IN_PROGRESS
                          ? 'Live-трекінг'
                          : 'Маршрут прогулянки'}
                      </Link>
                    )}
                    {isOwner && booking.status === BookingStatus.COMPLETED && (
                      reviewedIds.has(booking.id) ? (
                        <p className="text-xs text-green-600 mt-2">✓ Відгук надіслано</p>
                      ) : reviewFormId === booking.id ? (
                        <ReviewForm
                          bookingId={booking.id}
                          onSubmitted={() => {
                            setReviewedIds((prev) => new Set([...prev, booking.id]))
                            setReviewFormId(null)
                          }}
                          onCancel={() => setReviewFormId(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setReviewFormId(booking.id)}
                          className="text-xs text-blue-600 hover:underline mt-2"
                        >
                          Залишити відгук
                        </button>
                      )
                    )}
                    <div className="flex flex-wrap gap-2 pt-1 items-center">
                      {isOwner &&
                        booking.paymentStatus !== PaymentStatus.PAID &&
                        booking.status !== BookingStatus.CANCELLED && (
                          <button
                            type="button"
                            onClick={() => handlePay(booking.id)}
                            disabled={actionLoading === `pay-${booking.id}`}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-60"
                          >
                            {actionLoading === `pay-${booking.id}`
                              ? '...'
                              : booking.paymentStatus === PaymentStatus.FAILED
                                ? 'Спробувати оплату ще раз'
                                : 'Оплатити'}
                          </button>
                        )}
                      {renderActions(booking)}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}