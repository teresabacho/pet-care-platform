import { useCaretakerOnboardingStore } from '../../store/caretakerOnboardingStore'
import { Button } from '@/components/ui/button'
import {
  LocationForm,
  type LocationFormValue,
} from '../caretaker-form/LocationForm'

export default function Step2Location() {
  const { formData, setField, nextStep, prevStep } =
    useCaretakerOnboardingStore()
  const {
    serviceLatitude,
    serviceLongitude,
    radiusKm,
    addressIsPublic,
    country,
    city,
    street,
    apartment,
    floor,
    entrance,
  } = formData

  const value: LocationFormValue = {
    serviceLatitude,
    serviceLongitude,
    radiusKm,
    addressIsPublic,
    country: country || null,
    city,
    street,
    apartment,
    floor,
    entrance,
  }

  function handleChange(next: LocationFormValue) {
    if (next.serviceLatitude !== serviceLatitude)
      setField('serviceLatitude', next.serviceLatitude)
    if (next.serviceLongitude !== serviceLongitude)
      setField('serviceLongitude', next.serviceLongitude)
    if (next.radiusKm !== radiusKm) setField('radiusKm', next.radiusKm)
    if (next.addressIsPublic !== addressIsPublic)
      setField('addressIsPublic', next.addressIsPublic)
    if ((next.country ?? '') !== country) setField('country', next.country ?? '')
    if (next.city !== city) setField('city', next.city)
    if (next.street !== street) setField('street', next.street)
    if (next.apartment !== apartment) setField('apartment', next.apartment)
    if (next.floor !== floor) setField('floor', next.floor)
    if (next.entrance !== entrance) setField('entrance', next.entrance)
  }

  const isValid =
    Boolean(country) && serviceLatitude !== null && serviceLongitude !== null

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900">
          Локація і зона роботи
        </h2>
        <p className="text-sm text-zinc-600">
          Вкажіть, де ви знаходитесь, і в якому радіусі готові працювати. Клієнти
          бачитимуть вас у пошуку за цим радіусом.
        </p>
      </div>

      <LocationForm value={value} onChange={handleChange} showCountrySelect />

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={prevStep}>
          Назад
        </Button>
        <Button
          onClick={nextStep}
          disabled={!isValid}
          className="bg-zinc-900 hover:bg-zinc-800"
        >
          Далі
        </Button>
      </div>
    </div>
  )
}
