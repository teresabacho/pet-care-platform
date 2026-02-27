import { useState, useEffect } from 'react'
import { petsService } from '../services/pets.service'
import type { Pet } from '../types'

interface PetFormData {
  name: string
  species: string
  breed: string
  age: string
  weight: string
  specialNeeds: string
  description: string
}

const emptyForm: PetFormData = {
  name: '', species: '', breed: '', age: '',
  weight: '', specialNeeds: '', description: '',
}

function petToForm(pet: Pet): PetFormData {
  return {
    name: pet.name,
    species: pet.species ?? '',
    breed: pet.breed ?? '',
    age: pet.age?.toString() ?? '',
    weight: pet.weight ?? '',
    specialNeeds: pet.specialNeeds ?? '',
    description: pet.description ?? '',
  }
}

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const [form, setForm] = useState<PetFormData>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    petsService.getMyPets()
      .then(setPets)
      .finally(() => setIsLoading(false))
  }, [])

  const openAddForm = () => { setEditingPet(null); setForm(emptyForm); setShowForm(true) }
  const openEditForm = (pet: Pet) => { setEditingPet(pet); setForm(petToForm(pet)); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditingPet(null); setForm(emptyForm) }
  const setField = (field: keyof PetFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const dto = {
      name: form.name,
      species: form.species || undefined,
      breed: form.breed || undefined,
      age: form.age ? Number(form.age) : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      specialNeeds: form.specialNeeds || undefined,
      description: form.description || undefined,
    }
    try {
      if (editingPet) {
        const updated = await petsService.update(editingPet.id, dto)
        setPets((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      } else {
        const created = await petsService.create(dto)
        setPets((prev) => [...prev, created])
      }
      closeForm()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await petsService.delete(id)
    setPets((prev) => prev.filter((p) => p.id !== id))
    setDeleteConfirmId(null)
  }

  if (isLoading) return <div className="text-center py-12 text-gray-400">Завантаження...</div>

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Мої тварини</h1>
        {!showForm && (
          <button onClick={openAddForm}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            + Додати тварину
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingPet ? 'Редагувати тварину' : 'Нова тварина'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Кличка *</label>
              <input required value={form.name} onChange={(e) => setField('name', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Вид</label>
                <input value={form.species} onChange={(e) => setField('species', e.target.value)}
                  placeholder="Собака, Кіт..." className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Порода</label>
                <input value={form.breed} onChange={(e) => setField('breed', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Вік (років)</label>
                <input type="number" min={0} value={form.age} onChange={(e) => setField('age', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Вага (кг)</label>
                <input type="number" min={0} step="0.1" value={form.weight} onChange={(e) => setField('weight', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Особливі потреби</label>
              <input value={form.specialNeeds} onChange={(e) => setField('specialNeeds', e.target.value)}
                placeholder="Алергії, ліки, обмеження..."
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={isSaving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {isSaving ? 'Зберігаємо...' : 'Зберегти'}
              </button>
              <button type="button" onClick={closeForm} className="text-gray-500 hover:text-gray-700">
                Скасувати
              </button>
            </div>
          </form>
        </div>
      )}

      {pets.length === 0 && !showForm ? (
        <div className="text-center py-12 bg-white rounded-xl shadow">
          <div className="text-5xl mb-3">🐾</div>
          <p className="text-gray-500">У вас ще немає тварин</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pets.map((pet) => (
            <div key={pet.id} className="bg-white rounded-xl shadow p-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-lg">{pet.name}</span>
                  {pet.species && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {pet.species}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 space-y-0.5">
                  {pet.breed && <p>Порода: {pet.breed}</p>}
                  {pet.age != null && <p>Вік: {pet.age} р.</p>}
                  {pet.weight && <p>Вага: {pet.weight} кг</p>}
                  {pet.specialNeeds && <p className="text-orange-600">⚠️ {pet.specialNeeds}</p>}
                </div>
              </div>
              <div className="flex gap-2 text-sm">
                <button onClick={() => openEditForm(pet)} className="text-blue-600 hover:underline">
                  Ред.
                </button>
                {deleteConfirmId === pet.id ? (
                  <div className="flex gap-1 items-center">
                    <button onClick={() => handleDelete(pet.id)} className="text-red-600 font-medium hover:underline">Так</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => setDeleteConfirmId(null)} className="text-gray-500 hover:underline">Ні</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirmId(pet.id)} className="text-red-400 hover:text-red-600">
                    Вид.
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}