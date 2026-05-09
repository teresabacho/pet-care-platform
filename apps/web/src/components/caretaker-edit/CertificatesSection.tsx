import { useState } from 'react'
import axios from 'axios'
import {
  CertificateType,
  MediaOwnerType,
  MediaType,
} from '@pet-care/shared'
import { FileText, Image as ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { apiClient } from '../../services/api'
import { certificatesService } from '../../services/certificates.service'
import { CERTIFICATE_TYPE_LABELS } from '../../lib/certificate-labels'
import type { Certificate, MediaItem } from '../../types'

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]
const MAX_BYTES = 20 * 1024 * 1024
const ACCEPT_ATTR = ALLOWED_MIME.join(',')

interface PresignedUploadResponse {
  mediaItem: MediaItem
  uploadUrl: string
}

async function uploadCertificateFile(
  file: File,
  caretakerProfileId: string,
): Promise<MediaItem> {
  const mediaType =
    file.type === 'application/pdf' ? MediaType.DOCUMENT : MediaType.IMAGE

  const presigned = await apiClient.post<PresignedUploadResponse>(
    '/media/presigned-upload',
    {
      ownerType: MediaOwnerType.CARETAKER_CERTIFICATE,
      ownerId: caretakerProfileId,
      mediaType,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  )

  await axios.put(presigned.data.uploadUrl, file, {
    headers: { 'Content-Type': file.type },
  })

  const { data } = await apiClient.post<MediaItem>(
    `/media/${presigned.data.mediaItem.id}/confirm`,
  )
  return data
}

interface CertificatesSectionProps {
  caretakerProfileId: string
  certificates: Certificate[]
  onChange: (next: Certificate[]) => void
}

export function CertificatesSection({
  caretakerProfileId,
  certificates,
  onChange,
}: CertificatesSectionProps) {
  const [type, setType] = useState<CertificateType>(CertificateType.OTHER)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Certificate | null>(null)

  const fileInvalid =
    file !== null &&
    (!ALLOWED_MIME.includes(file.type) || file.size > MAX_BYTES)

  const canSubmit =
    !busy && file !== null && !fileInvalid && title.trim().length > 0

  async function handleAdd() {
    if (!file || !canSubmit) return
    setBusy(true)
    setError(null)
    try {
      const media = await uploadCertificateFile(file, caretakerProfileId)
      const created = await certificatesService.create({
        type,
        title: title.trim(),
        mediaItemId: media.id,
      })
      onChange([...certificates, created])
      setTitle('')
      setFile(null)
      setType(CertificateType.OTHER)
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })
          .response?.data?.message ?? null
      const flat = Array.isArray(message) ? message.join(', ') : message
      setError(flat ?? 'Не вдалося завантажити сертифікат')
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    try {
      await certificatesService.delete(pendingDelete.id)
      onChange(certificates.filter((c) => c.id !== pendingDelete.id))
    } catch {
      setError('Не вдалося видалити сертифікат')
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-zinc-900">Сертифікати</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Дипломи, посвідчення про закінчення курсів. Підтримуються PDF та
          зображення (до 20 МБ).
        </p>
      </header>

      {certificates.length > 0 && (
        <ul className="space-y-2">
          {certificates.map((c) => (
            <CertificateRow
              key={c.id}
              certificate={c}
              onDelete={() => setPendingDelete(c)}
            />
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-lg border border-zinc-200 p-4 bg-zinc-50">
        <h3 className="text-sm font-semibold text-zinc-900">Додати новий</h3>

        <div className="space-y-1.5">
          <Label htmlFor="cs-type">Тип</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as CertificateType)}
          >
            <SelectTrigger id="cs-type" className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(CertificateType).map((t) => (
                <SelectItem key={t} value={t}>
                  {CERTIFICATE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cs-title">Назва</Label>
          <Input
            id="cs-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Наприклад: Диплом КНУ ветеринарної медицини"
            className="bg-white"
            maxLength={255}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cs-file">Файл</Label>
          <Input
            id="cs-file"
            type="file"
            accept={ACCEPT_ATTR}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="bg-white"
          />
          {fileInvalid && file && (
            <p className="text-xs text-destructive">
              {file.size > MAX_BYTES
                ? 'Файл більший за 20 МБ'
                : 'Підтримуються лише PDF, JPG, PNG, WebP'}
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleAdd} disabled={!canSubmit}>
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Завантажую…
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1" />
              Додати сертифікат
            </>
          )}
        </Button>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null)
        }}
        title="Видалити сертифікат?"
        description="Файл буде видалений безповоротно."
        confirmLabel="Видалити"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </section>
  )
}

interface CertificateRowProps {
  certificate: Certificate
  onDelete: () => void
}

function CertificateRow({ certificate, onDelete }: CertificateRowProps) {
  const isPdf =
    certificate.mediaItem?.mimeType === 'application/pdf' ||
    certificate.mediaItem?.mediaType === 'DOCUMENT'
  const thumbUrl = certificate.mediaItem?.thumbnailUrl

  return (
    <li className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-2">
      <div className="w-10 h-10 rounded bg-zinc-100 flex items-center justify-center shrink-0 overflow-hidden">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={certificate.title}
            className="w-full h-full object-cover"
          />
        ) : isPdf ? (
          <FileText className="w-5 h-5 text-zinc-500" />
        ) : (
          <ImageIcon className="w-5 h-5 text-zinc-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 truncate">
          {certificate.title}
        </p>
        <p className="text-xs text-zinc-500">
          {CERTIFICATE_TYPE_LABELS[certificate.type]}
        </p>
      </div>
      {certificate.mediaItem?.url && (
        <a
          href={certificate.mediaItem.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-zinc-600 underline shrink-0"
        >
          Відкрити
        </a>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDelete}
        aria-label="Видалити"
        className="text-destructive hover:text-destructive shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </li>
  )
}
