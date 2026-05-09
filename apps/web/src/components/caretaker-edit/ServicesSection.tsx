import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { ServiceType } from '@pet-care/shared'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { serviceOfferingsService } from '../../services/service-offerings.service'
import ServiceListItem from '../caretaker-dashboard/ServiceListItem'
import {
  ServiceForm,
  buildCreateDto,
  buildUpdateDto,
  emptyServiceFormValue,
  isServiceFormValid,
  serviceFormValueFromOffering,
  type ServiceFormValue,
} from '../caretaker-form/ServiceForm'
import type { ServiceOffering } from '../../types'

interface ServicesSectionProps {
  services: ServiceOffering[]
  onChange: (next: ServiceOffering[]) => void
}

type Mode =
  | { kind: 'list' }
  | { kind: 'create'; value: ServiceFormValue }
  | { kind: 'edit'; service: ServiceOffering; value: ServiceFormValue }

export function ServicesSection({ services, onChange }: ServicesSectionProps) {
  const [mode, setMode] = useState<Mode>({ kind: 'list' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ServiceOffering | null>(
    null,
  )

  const availableTypes = Object.values(ServiceType).filter(
    (t) => !services.some((s) => s.serviceType === t),
  )

  function startCreate() {
    setError(null)
    if (availableTypes.length === 0) return
    setMode({
      kind: 'create',
      value: emptyServiceFormValue(availableTypes[0]),
    })
  }

  function startEdit(service: ServiceOffering) {
    setError(null)
    setMode({
      kind: 'edit',
      service,
      value: serviceFormValueFromOffering(service),
    })
  }

  function cancel() {
    setMode({ kind: 'list' })
    setError(null)
  }

  async function handleSave() {
    if (mode.kind === 'list') return
    if (!isServiceFormValid(mode.value)) return
    setBusy(true)
    setError(null)
    try {
      if (mode.kind === 'create') {
        const created = await serviceOfferingsService.create(
          buildCreateDto(mode.value),
        )
        onChange([...services, created])
      } else {
        const updated = await serviceOfferingsService.update(
          mode.service.id,
          buildUpdateDto(mode.value),
        )
        onChange(services.map((s) => (s.id === updated.id ? updated : s)))
      }
      setMode({ kind: 'list' })
    } catch (err) {
      const e = err as {
        response?: { status?: number; data?: { message?: string | string[] } }
      }
      const status = e.response?.status
      if (status === 409) {
        setError(
          'Не можна зберегти: тариф використовується в існуючому замовленні. Не видаляйте такі тарифи й не змінюйте їх ціну.',
        )
      } else {
        const message = e.response?.data?.message ?? null
        const flat = Array.isArray(message) ? message.join(', ') : message
        setError(flat ?? 'Не вдалося зберегти. Спробуйте ще раз.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    try {
      await serviceOfferingsService.delete(pendingDelete.id)
      onChange(services.filter((s) => s.id !== pendingDelete.id))
      setError(null)
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response
        ?.status
      if (status === 409) {
        setError(
          'Не можна видалити: на послугу є активні або завершені замовлення',
        )
      } else {
        setError('Не вдалося видалити послугу. Спробуйте ще раз.')
      }
    } finally {
      setPendingDelete(null)
    }
  }

  if (mode.kind !== 'list') {
    const title = mode.kind === 'create' ? 'Нова послуга' : 'Редагувати послугу'
    const submitLabel = mode.kind === 'create' ? 'Створити' : 'Зберегти'
    const valid = isServiceFormValid(mode.value)

    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-5 space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <Button variant="ghost" size="sm" onClick={cancel} disabled={busy}>
            Скасувати
          </Button>
        </header>

        <ServiceForm
          value={mode.value}
          onChange={(next) =>
            setMode((prev) =>
              prev.kind === 'list' ? prev : { ...prev, value: next },
            )
          }
          lockType={mode.kind === 'edit'}
          availableTypes={mode.kind === 'create' ? availableTypes : undefined}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
          <Button onClick={handleSave} disabled={busy || !valid}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
          </Button>
          <Button variant="outline" onClick={cancel} disabled={busy}>
            Скасувати
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Послуги</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Тарифи, прийняті види тваринок, правила.
          </p>
        </div>
        <Button onClick={startCreate} disabled={availableTypes.length === 0}>
          <Plus className="w-4 h-4 mr-1" />
          Додати
        </Button>
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {services.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">
          Ви ще не додали жодної послуги. Натисніть «Додати», щоб почати.
        </p>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <ServiceListItem
              key={s.id}
              service={s}
              onEdit={startEdit}
              onDelete={setPendingDelete}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null)
        }}
        title="Видалити послугу?"
        description="Це назавжди видалить послугу разом з усіма тарифами, надбавками за розмір та додатковими послугами. Активні замовлення цієї послуги не постраждають."
        confirmLabel="Видалити"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </section>
  )
}
