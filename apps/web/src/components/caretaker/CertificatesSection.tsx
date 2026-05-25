import { useEffect, useState } from 'react'
import { ExternalLink, FileText, ImageIcon } from 'lucide-react'
import { certificatesService } from '../../services/certificates.service'
import { CERTIFICATE_TYPE_LABELS } from '@/lib/certificate-labels'
import type { Certificate } from '../../types'
import { cn } from '@/lib/utils'

interface CertificatesSectionProps {
  caretakerProfileId: string
  className?: string
}

function isImage(mime?: string): boolean {
  return Boolean(mime?.startsWith('image/'))
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function CertificatesSection({
  caretakerProfileId,
  className,
}: CertificatesSectionProps) {
  const [items, setItems] = useState<Certificate[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    certificatesService
      .getByCaretakerProfile(caretakerProfileId)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [caretakerProfileId])

  if (error) return null
  if (items === null) return null
  if (items.length === 0) return null

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <h2 className="text-base font-semibold text-zinc-900">
        Сертифікати та документи
      </h2>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((cert) => {
          const url = cert.mediaItem?.url
          const mime = cert.mediaItem?.mimeType
          return (
            <li
              key={cert.id}
              className="bg-white border border-zinc-200 rounded-lg p-3 flex items-start gap-3"
            >
              <div className="shrink-0 w-12 h-12 rounded-md bg-zinc-100 flex items-center justify-center overflow-hidden">
                {url && isImage(mime) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cert.mediaItem?.thumbnailUrl ?? url}
                    alt={cert.title}
                    className="w-full h-full object-cover"
                  />
                ) : url ? (
                  <FileText className="w-5 h-5 text-zinc-500" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-zinc-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">
                  {cert.title}
                </p>
                <p className="text-xs text-zinc-500">
                  {CERTIFICATE_TYPE_LABELS[cert.type]}
                  {' · '}
                  {formatDate(cert.uploadedAt)}
                </p>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-zinc-700 hover:text-zinc-900 mt-1"
                  >
                    Переглянути
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
