import { useState } from 'react'
import { reviewsService } from '../services/reviews.service'

interface Props {
  bookingId: string
  onSubmitted: () => void
  onCancel: () => void
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)

  const active = hovered || value
  return (
    <div className="flex gap-1 text-2xl cursor-pointer" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          onClick={() => onChange(i)}
          onMouseEnter={() => setHovered(i)}
          className={active >= i ? 'text-yellow-400' : 'text-gray-300'}
        >
          ★
        </span>
      ))}
    </div>
  )
}

export default function ReviewForm({ bookingId, onSubmitted, onCancel }: Props) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (rating === 0) { setError('Будь ласка, оберіть оцінку'); return }
    setIsSubmitting(true)
    setError(null)
    try {
      await reviewsService.create({ bookingId, rating, comment: comment || undefined })
      onSubmitted()
    } catch {
      setError('Не вдалося надіслати відгук')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 border-t pt-3">
      <p className="text-sm font-medium text-gray-700">Залишити відгук</p>
      <StarRating value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Коментар (необов'язково)"
        rows={2}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white text-xs px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Надсилаємо...' : 'Надіслати'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 text-xs hover:text-gray-700"
        >
          Скасувати
        </button>
      </div>
    </form>
  )
}