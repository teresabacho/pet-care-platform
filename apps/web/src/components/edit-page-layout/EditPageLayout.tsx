import type { ComponentType, ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface EditPageSection {
  id: string
  label: string
  Icon: ComponentType<{ className?: string }>
}

interface EditPageLayoutProps {
  title: string
  sections: EditPageSection[]
  activeSection: string
  onSectionChange: (id: string) => void
  backLabel?: string
  onBack?: () => void
  children: ReactNode
}

// Спільний layout для всіх edit-сторінок: лівий sidebar з табами на десктопі,
// горизонтальні таби на мобільному, заголовок зверху, опц. кнопка «Назад».
export function EditPageLayout({
  title,
  sections,
  activeSection,
  onSectionChange,
  backLabel,
  onBack,
  children,
}: EditPageLayoutProps) {
  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {onBack && (
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            {backLabel ?? 'Назад'}
          </Button>
        </div>
      )}

      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">{title}</h1>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <nav
          aria-label="Секції редагування"
          className="md:sticky md:top-6 md:self-start"
        >
          <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible -mx-4 px-4 md:m-0 md:p-0 pb-2 md:pb-0">
            {sections.map((s) => {
              const active = s.id === activeSection
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onSectionChange(s.id)}
                    className={cn(
                      'w-full whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors',
                      active
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400',
                    )}
                  >
                    <s.Icon className="w-4 h-4" />
                    <span>{s.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
