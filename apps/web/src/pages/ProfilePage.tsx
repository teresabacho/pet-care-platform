import { useState, useEffect, type FormEvent } from 'react'
import { ServiceType, PriceUnit } from '@pet-care/shared'
import { useAuthStore } from '../store/authStore'
import { usersService } from '../services/users.service'
import { serviceOfferingsService } from '../services/service-offerings.service'
import type { CaretakerProfile, ServiceOffering, UserPublic } from '../types'

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: 'Вигул',
  [ServiceType.PET_SITTING]: 'Пет-сіттінг',
  [ServiceType.BOARDING]: 'Перетримка',
  [ServiceType.GROOMING]: 'Грумінг',
  [ServiceType.VET_VISIT]: 'Ветеринарний візит',
}

const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  [PriceUnit.PER_SESSION]: 'за сеанс',
  [PriceUnit.PER_HOUR]: 'за годину',
  [PriceUnit.PER_DAY]: 'за добу',
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [profile, setProfile] = useState<UserPublic | null>(null)
  const [services, setServices] = useState<ServiceOffering[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // User info form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [userSaving, setUserSaving] = useState(false)
  const [userMsg, setUserMsg] = useState<string | null>(null)

  // Caretaker profile form
  const [showCaretakerForm, setShowCaretakerForm] = useState(false)
  const [bio, setBio] = useState('')
  const [experienceYears, setExperienceYears] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [serviceLatitude, setServiceLatitude] = useState('')
  const [serviceLongitude, setServiceLongitude] = useState('')
  const [radiusKm, setRadiusKm] = useState('')
  const [caretakerSaving, setCaretakerSaving] = useState(false)
  const [caretakerMsg, setCaretakerMsg] = useState<string | null>(null)

  // Service offering form
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [newServiceType, setNewServiceType] = useState<ServiceType>(ServiceType.WALKING)
  const [newPrice, setNewPrice] = useState('')
  const [newPriceUnit, setNewPriceUnit] = useState<PriceUnit>(PriceUnit.PER_SESSION)
  const [newDuration, setNewDuration] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [serviceSaving, setServiceSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const data = await usersService.getById(user.id)
        setProfile(data)
        setFirstName(data.firstName ?? '')
        setLastName(data.lastName ?? '')
        setPhone(data.phone ?? '')
        if (data.caretakerProfile) fillCaretakerForm(data.caretakerProfile)
        const svc = await serviceOfferingsService.getByCaretaker(user.id)
        setServices(svc)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user])

  const fillCaretakerForm = (cp: CaretakerProfile) => {
    setBio(cp.bio ?? '')
    setExperienceYears(cp.experienceYears?.toString() ?? '')
    setHourlyRate(cp.hourlyRate ?? '')
    setServiceTypes(cp.serviceTypes)
    setServiceLatitude(cp.serviceLatitude?.toString() ?? '')
    setServiceLongitude(cp.serviceLongitude?.toString() ?? '')
    setRadiusKm(cp.radiusKm?.toString() ?? '')
  }

  const toggleServiceType = (type: ServiceType) => {
    setServiceTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)  // вже є → видаляємо
        : [...prev, type]                  // немає → додаємо
    )
  }

  const saveUserInfo = async (e: FormEvent) => {
    e.preventDefault()
    setUserSaving(true)
    setUserMsg(null)
    try {
      const updated = await usersService.updateMe({ firstName, lastName, phone })
      setUser({ ...updated })
      setUserMsg('Збережено!')
    } catch {
      setUserMsg('Помилка збереження')
    } finally {
      setUserSaving(false)
    }
  }

  const saveCaretakerProfile = async (e: FormEvent) => {
    e.preventDefault()
    setCaretakerSaving(true)
    setCaretakerMsg(null)
    const dto = {
      bio: bio || undefined,
      experienceYears: experienceYears ? Number(experienceYears) : undefined,
      hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
      serviceTypes: serviceTypes.length ? serviceTypes : undefined,
      serviceLatitude: serviceLatitude ? Number(serviceLatitude) : undefined,
      serviceLongitude: serviceLongitude ? Number(serviceLongitude) : undefined,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
    }
    try {
      const cp = profile?.caretakerProfile
        ? await usersService.updateCaretakerProfile(dto)
        : await usersService.createCaretakerProfile(dto)
      setProfile((prev) => prev ? { ...prev, caretakerProfile: cp } : prev)
      setCaretakerMsg('Збережено!')
      setShowCaretakerForm(false)
    } catch {
      setCaretakerMsg('Помилка збереження')
    } finally {
      setCaretakerSaving(false)
    }
  }

  const addService = async (e: FormEvent) => {
    e.preventDefault()
    setServiceSaving(true)
    try {
      const created = await serviceOfferingsService.create({
        serviceType: newServiceType,
        price: Number(newPrice),
        priceUnit: newPriceUnit,
        durationMinutes: newDuration ? Number(newDuration) : undefined,
        description: newDescription || undefined,
      })
      setServices((prev) => [...prev, created])
      setShowServiceForm(false)
      setNewPrice('')
      setNewDuration('')
      setNewDescription('')
    } finally {
      setServiceSaving(false)
    }
  }

  if (isLoading) return <div className="text-center py-12 text-gray-400">Завантаження...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* Особисті дані */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Особисті дані</h2>
        <form onSubmit={saveUserInfo} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Ім'я</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Прізвище</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Телефон</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={userSaving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {userSaving ? 'Зберігаємо...' : 'Зберегти'}
            </button>
            {userMsg && <span className="text-sm text-green-600">{userMsg}</span>}
          </div>
        </form>
      </section>

      {/* Профіль виконавця */}
      <section className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Профіль виконавця</h2>
          {profile?.caretakerProfile && !showCaretakerForm && (
            <button onClick={() => setShowCaretakerForm(true)} className="text-sm text-blue-600 hover:underline">
              Редагувати
            </button>
          )}
        </div>

        {!profile?.caretakerProfile && !showCaretakerForm && (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm mb-3">Заповніть профіль, щоб пропонувати послуги</p>
            <button onClick={() => setShowCaretakerForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Стати виконавцем
            </button>
          </div>
        )}

        {profile?.caretakerProfile && !showCaretakerForm && (
          <div className="space-y-2 text-sm text-gray-700">
            {profile.caretakerProfile.bio && <p>{profile.caretakerProfile.bio}</p>}
            <p>Досвід: {profile.caretakerProfile.experienceYears ?? '—'} р. · Ставка: {profile.caretakerProfile.hourlyRate ?? '—'} грн/год · Радіус: {profile.caretakerProfile.radiusKm ?? '—'} км</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.caretakerProfile.serviceTypes.map((t) => (
                <span key={t} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                  {SERVICE_TYPE_LABELS[t]}
                </span>
              ))}
            </div>
          </div>
        )}

        {showCaretakerForm && (
          <form onSubmit={saveCaretakerProfile} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Про себе</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Досвід (років)</label>
                <input type="number" min={0} value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Ставка (грн/год)</label>
                <input type="number" min={0} value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Типи послуг</label>
              <div className="flex flex-wrap gap-3">
                {Object.values(ServiceType).map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={serviceTypes.includes(type)}
                      onChange={() => toggleServiceType(type)} />
                    <span className="text-sm">{SERVICE_TYPE_LABELS[type]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Широта</label>
                <input type="number" step="any" value={serviceLatitude} onChange={(e) => setServiceLatitude(e.target.value)}
                  placeholder="50.45"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Довгота</label>
                <input type="number" step="any" value={serviceLongitude} onChange={(e) => setServiceLongitude(e.target.value)}
                  placeholder="30.52"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Радіус (км)</label>
                <input type="number" min={0} value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={caretakerSaving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {caretakerSaving ? 'Зберігаємо...' : 'Зберегти'}
              </button>
              <button type="button" onClick={() => setShowCaretakerForm(false)} className="text-gray-500 hover:text-gray-700">
                Скасувати
              </button>
              {caretakerMsg && <span className="text-sm text-green-600">{caretakerMsg}</span>}
            </div>
          </form>
        )}
      </section>

      {/* Послуги виконавця */}
      {profile?.caretakerProfile && (
        <section className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Мої послуги</h2>
            <button onClick={() => setShowServiceForm((v) => !v)} className="text-sm text-blue-600 hover:underline">
              {showServiceForm ? 'Скасувати' : '+ Додати послугу'}
            </button>
          </div>

          {services.length === 0 && !showServiceForm && (
            <p className="text-gray-400 text-sm">Послуги ще не додано</p>
          )}

          <div className="space-y-2 mb-4">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div>
                  <span className="font-medium text-sm">{SERVICE_TYPE_LABELS[s.serviceType]}</span>
                  {s.description && <span className="text-gray-500 text-xs ml-2">{s.description}</span>}
                </div>
                <span className="text-sm text-blue-700 font-medium">
                  {s.price} грн {PRICE_UNIT_LABELS[s.priceUnit]}
                </span>
              </div>
            ))}
          </div>

          {showServiceForm && (
            <form onSubmit={addService} className="border-t pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Тип послуги</label>
                  <select value={newServiceType} onChange={(e) => setNewServiceType(e.target.value as ServiceType)}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.values(ServiceType).map((t) => (
                      <option key={t} value={t}>{SERVICE_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Одиниця оплати</label>
                  <select value={newPriceUnit} onChange={(e) => setNewPriceUnit(e.target.value as PriceUnit)}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.values(PriceUnit).map((u) => (
                      <option key={u} value={u}>{PRICE_UNIT_LABELS[u]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Ціна (грн) *</label>
                  <input type="number" min={0} required value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Тривалість (хв)</label>
                  <input type="number" min={1} value={newDuration} onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Опис</label>
                <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" disabled={serviceSaving || !newPrice}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {serviceSaving ? 'Додаємо...' : 'Додати послугу'}
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  )
}