import { useSaveAndExitOnboarding } from '../../hooks/useSaveAndExitOnboarding'
import { Button } from '@/components/ui/button'

export default function SaveAndExitButton() {
  const { saveAndExit, saving, error } = useSaveAndExitOnboarding()

  return (
    <div className="border-t border-zinc-200 pt-4 mt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500 max-w-sm">
          Можете зупинитися і повернутися пізніше. Профіль буде неактивним, поки ви не додасте хоча б одну послугу.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={saveAndExit}
          disabled={saving}
          className="text-zinc-600 hover:text-zinc-900 whitespace-nowrap"
        >
          {saving ? 'Зберігаємо…' : 'Зберегти і вийти'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  )
}
