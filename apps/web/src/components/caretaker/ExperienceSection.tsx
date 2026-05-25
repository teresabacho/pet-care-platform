import { ServiceType } from '@pet-care/shared'
import { Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SKILL_LABELS } from '@/lib/caretaker-labels'
import type { CaretakerProfile, ServiceOffering } from '../../types'

const SERVICE_LABELS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: 'вигулу',
  [ServiceType.PET_SITTING]: 'догляду вдома',
  [ServiceType.BOARDING]: 'перетримки',
  [ServiceType.GROOMING]: 'грумінгу',
  [ServiceType.VET_VISIT]: 'вет-візитів',
}

interface ExperienceSectionProps {
  profile: CaretakerProfile
  offering: ServiceOffering
  className?: string
}

export default function ExperienceSection({
  profile,
  offering,
  className,
}: ExperienceSectionProps) {
  const generalSkills = profile.skills
  const perServiceDescription = offering.experienceDescription?.trim() ?? ''
  const perServiceSkills = offering.experienceSkills ?? []

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <h2 className="text-base font-semibold text-zinc-900">
        Досвід та навички — {SERVICE_LABELS[offering.serviceType]}
      </h2>

      {profile.experienceYears != null && (
        <div className="flex items-center gap-2 text-sm text-zinc-700">
          <Briefcase className="w-4 h-4 text-zinc-500" />
          {profile.experienceYears} р. практики у цій категорії
        </div>
      )}

      {perServiceDescription ? (
        <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
          {perServiceDescription}
        </p>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-500 italic">
          Доглядальник ще не додав опис досвіду для цієї послуги.
        </div>
      )}

      {perServiceSkills.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-wide text-zinc-500">
            Теги під цей тип послуги
          </span>
          <div className="flex flex-wrap gap-1.5">
            {perServiceSkills.map((skill) => (
              <span
                key={skill}
                className="text-xs px-2.5 py-1 rounded-full bg-zinc-900 text-white"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {generalSkills.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <span className="text-[11px] uppercase tracking-wide text-zinc-500">
            Загальні навички
          </span>
          <div className="flex flex-wrap gap-1.5">
            {generalSkills.map((skill) => (
              <span
                key={skill}
                className="text-xs px-2.5 py-1 rounded-full bg-white border border-zinc-200 text-zinc-700"
              >
                {SKILL_LABELS[skill]}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
