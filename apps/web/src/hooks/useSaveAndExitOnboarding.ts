import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCaretakerOnboardingStore } from '../store/caretakerOnboardingStore'
import { caretakerProfileService } from '../services/caretaker-profile.service'

// Hook для збереження часткового профілю на будь-якому кроці wizard.
// Створює CaretakerProfile тільки з тих полів, що вже заповнені (без послуги).
// Профіль буде НЕ активним (немає offering) — користувача про це повідомить
// дашборд через StatusBanner (6.5.2).
export function useSaveAndExitOnboarding() {
  const navigate = useNavigate()
  const { formData, reset } = useCaretakerOnboardingStore()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveAndExit = async () => {
    setSaving(true)
    setError(null)
    try {
      await caretakerProfileService.createCaretakerProfile({
        bio: formData.bio.trim() || undefined,
        experienceYears: formData.experienceYears ?? undefined,
        skills: formData.skills.length > 0 ? formData.skills : undefined,
        addressIsPublic: formData.addressIsPublic,
        serviceLatitude: formData.serviceLatitude ?? undefined,
        serviceLongitude: formData.serviceLongitude ?? undefined,
        radiusKm: formData.radiusKm,
        country: formData.country.trim() || undefined,
        city: formData.city.trim() || undefined,
        street: formData.street.trim() || undefined,
        apartment: formData.apartment.trim() || undefined,
        floor: formData.floor.trim() || undefined,
        entrance: formData.entrance.trim() || undefined,
      })
      reset()
      navigate('/settings/caretaker-profile')
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message ?? null
      const flat = Array.isArray(message) ? message.join(', ') : message
      setError(flat ?? 'Не вдалося зберегти профіль')
    } finally {
      setSaving(false)
    }
  }

  return { saveAndExit, saving, error }
}
