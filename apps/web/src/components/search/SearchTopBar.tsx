import { Search } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { TileSelectDropdown, type TileOption } from '@/components/ui/tile-select-dropdown'
import { CitySelectDropdown, type CityValue } from '@/components/ui/city-select-dropdown'
import { DateRangePopover } from '@/components/ui/date-range-popover'
import { cn } from '@/lib/utils'

const PET_OPTIONS: TileOption[] = [
  { value: 'dog', label: 'Собака', emoji: '🐕' },
  { value: 'cat', label: 'Кіт', emoji: '🐈' },
  { value: 'rodent', label: 'Гризун', emoji: '🐹' },
  { value: 'bird', label: 'Птах', emoji: '🦜' },
  { value: 'other', label: 'Інша тварина', emoji: '🐾' },
]

const SERVICE_OPTIONS: TileOption[] = [
  { value: 'boarding', label: 'Перетримка у доглядальника', emoji: '🏡' },
  { value: 'sitting', label: 'Догляд вдома', emoji: '🏠' },
  { value: 'walking', label: 'Вигул улюбленця', emoji: '🦮' },
  { value: 'daycare', label: 'Денна сидівка', emoji: '☀️' },
  { value: 'grooming', label: 'Грумінг', emoji: '✂️' },
]

export interface TopBarValue {
  pet: string
  service: string
  city: CityValue
  dates: DateRange | undefined
  flexibleDates: boolean
}

interface SearchTopBarProps {
  value: TopBarValue
  onChange: (next: TopBarValue) => void
  onSubmit: () => void
  className?: string
}

export default function SearchTopBar({ value, onChange, onSubmit, className }: SearchTopBarProps) {
  function patch<K extends keyof TopBarValue>(key: K, v: TopBarValue[K]) {
    onChange({ ...value, [key]: v })
  }

  return (
    <div
      className={cn(
        'sticky top-0 z-30 bg-white border-b border-zinc-200',
        className,
      )}
    >
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-col md:flex-row gap-3 items-stretch">
        <TileSelectDropdown
          label="Улюбленець"
          placeholder="Виберіть улюбленця"
          options={PET_OPTIONS}
          value={value.pet}
          onChange={(v) => patch('pet', v)}
          className="flex-1 min-w-[160px]"
        />
        <TileSelectDropdown
          label="Послуга"
          placeholder="Оберіть послугу"
          options={SERVICE_OPTIONS}
          value={value.service}
          onChange={(v) => patch('service', v)}
          className="flex-1 min-w-[180px]"
        />
        <CitySelectDropdown
          label="Місто"
          placeholder="Оберіть місто"
          value={value.city}
          onChange={(v) => patch('city', v)}
          className="flex-1 min-w-[180px]"
        />
        <DateRangePopover
          label="Дати"
          placeholder="Оберіть дати"
          value={value.dates}
          flexible={value.flexibleDates}
          onChange={(range, flexible) =>
            onChange({ ...value, dates: range, flexibleDates: flexible })
          }
          className="flex-1 min-w-[180px]"
        />

        <div className="flex flex-col gap-2 self-end">
          <span className="text-sm font-medium text-transparent select-none leading-none">.</span>
          <button
            type="button"
            onClick={onSubmit}
            className="bg-zinc-900 text-white rounded-md h-10 px-5 text-sm font-medium hover:bg-zinc-800 transition flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Шукати
          </button>
        </div>
      </div>
    </div>
  )
}
