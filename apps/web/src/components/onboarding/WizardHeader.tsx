import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCaretakerOnboardingStore } from '../../store/caretakerOnboardingStore'
import { useSaveAndExitOnboarding } from '../../hooks/useSaveAndExitOnboarding'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// Хедер для wizard-у реєстрації (Airbnb-style): тільки лого PawMate і кнопка
// "Зберегти і вийти". Клік на лого → confirm-modal: вийти без збереження?
// Якщо так — те, що в store, не зберігається; те, що вже було надіслано
// на бекенд (наприклад аватар через media-upload), залишається.
export default function WizardHeader() {
  const navigate = useNavigate()
  const reset = useCaretakerOnboardingStore((s) => s.reset)
  const { saveAndExit, saving } = useSaveAndExitOnboarding()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleExitWithoutSaving = () => {
    reset()
    navigate('/')
  }

  return (
    <header className="bg-white border-b border-zinc-200">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="text-base font-bold text-zinc-900 tracking-tight hover:text-zinc-700 transition-colors"
        >
          PawMate
        </button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={saveAndExit}
          disabled={saving}
        >
          {saving ? 'Зберігаємо…' : 'Зберегти і вийти'}
        </Button>
      </nav>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Залишити форму без збереження?"
        description="Те, що ви ввели на цій сторінці, буде втрачено. Кроки, які ви вже встигли зберегти раніше, залишаються."
        confirmLabel="Так, вийти"
        cancelLabel="Залишитись"
        variant="destructive"
        onConfirm={handleExitWithoutSaving}
      />
    </header>
  )
}
