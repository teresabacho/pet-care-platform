import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  currentStep: number
  steps: ReadonlyArray<string>
  // Найвищий відвіданий крок — кліки дозволені тільки на кроки ≤ цього (включно з форвардом).
  // Якщо не передано — використовується currentStep (тільки backward).
  maxVisitedStep?: number
  onStepClick?: (step: number) => void
}

// Прогрес-бар wizard. Якщо передано onStepClick — кроки клікабельні в обидва
// боки в межах вже-відвіданих (controlled by maxVisitedStep).
export default function StepIndicator({
  currentStep,
  steps,
  maxVisitedStep,
  onStepClick,
}: StepIndicatorProps) {
  const maxClickable = maxVisitedStep ?? currentStep
  return (
    <div className="w-full">
      <ol className="flex items-center justify-between gap-2">
        {steps.map((label, idx) => {
          const stepNumber = idx + 1
          const isActive = stepNumber === currentStep
          const isComplete = stepNumber < currentStep
          const isLast = idx === steps.length - 1
          const clickable =
            Boolean(onStepClick) && stepNumber !== currentStep && stepNumber <= maxClickable

          const circle = (
            <div
              className={cn(
                'w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-colors',
                isComplete && 'bg-zinc-900 border-zinc-900 text-white',
                isActive && 'border-zinc-900 text-zinc-900 bg-white',
                !isActive && !isComplete && 'border-zinc-300 text-zinc-400 bg-white',
                clickable && 'cursor-pointer hover:opacity-80',
              )}
            >
              {isComplete ? <Check className="w-4 h-4" /> : stepNumber}
            </div>
          )

          return (
            <li key={label} className={cn('flex items-center', !isLast && 'flex-1')}>
              <div className="flex flex-col items-center gap-2">
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => onStepClick?.(stepNumber)}
                    className="bg-transparent border-0 p-0"
                    aria-label={`Перейти на крок ${stepNumber}: ${label}`}
                  >
                    {circle}
                  </button>
                ) : (
                  circle
                )}
                <span
                  className={cn(
                    'text-xs text-center max-w-[120px]',
                    isActive ? 'text-zinc-900 font-medium' : 'text-zinc-500',
                    clickable && 'cursor-pointer hover:text-zinc-900',
                  )}
                  onClick={clickable ? () => onStepClick?.(stepNumber) : undefined}
                >
                  {label}
                </span>
              </div>

              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 -mt-6',
                    isComplete ? 'bg-zinc-900' : 'bg-zinc-200',
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
