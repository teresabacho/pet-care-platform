import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  CertificateType,
  MediaOwnerType,
  MediaType,
} from '@pet-care/shared'
import { FileText, Image as ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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

interface EditCertificatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caretakerProfileId: string
  certificates: Certificate[]
  onChange: (next: Certificate[]) => void
}

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]
const MAX_BYTES = 20 * 1024 * 1024 // 20 MB — як на бекенді
const ACCEPT_ATTR = ALLOWED_MIME.join(',')

interface PresignedUploadResponse {
  mediaItem: MediaItem
  uploadUrl: string
}

// Triple-step upload через media-модуль: presigned-upload → PUT → confirm.
// Аналог mediaService.uploadVideo, але mediaType вибирається залежно від file.type.
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

export default function EditCertificatesModal({
  open,
  onOpenChange,
  caretakerProfileId,
  certificates,
  onChange,
}: EditCertificatesModalProps) {
  const [items, setItems] = useState<Certificate[]>(certificates)
  const [type, setType] = useState<CertificateType>(CertificateType.OTHER)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Certificate | null>(null)

  useEffect(() => {
    if (open) {
      setItems(certificates)
      setType(CertificateType.OTHER)
      setTitle('')
      setFile(null)
      setError(null)
    }
  }, [open, certificates])

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
      const next = [...items, created]
      setItems(next)
      onChange(next)
      // Reset form
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

  async function handleDelete() {
    if (!pendingDelete) return
    try {
      await certificatesService.delete(pendingDelete.id)
      const next = items.filter((c) => c.id !== pendingDelete.id)
      setItems(next)
      onChange(next)
    } catch {
      setError('Не вдалося видалити сертифікат')
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Сертифікати</SheetTitle>
          <SheetDescription>
            Завантажте дипломи, посвідчення про закінчення курсів — це підвищує
            довіру клієнтів. Підтримуються PDF та зображення (до 20 МБ).
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {items.length > 0 && (
            <div className="space-y-2">
              <Label>Завантажені сертифікати</Label>
              <ul className="space-y-2">
                {items.map((c) => (
                  <CertificateRow
                    key={c.id}
                    certificate={c}
                    onDelete={() => setPendingDelete(c)}
                  />
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3 rounded-lg border border-zinc-200 p-3 bg-zinc-50">
            <Label className="text-sm font-semibold">Додати новий</Label>

            <div className="space-y-1.5">
              <Label htmlFor="cert-type">Тип</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as CertificateType)}
              >
                <SelectTrigger id="cert-type" className="bg-white">
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
              <Label htmlFor="cert-title">Назва</Label>
              <Input
                id="cert-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Наприклад: Диплом КНУ ветеринарної медицини"
                className="bg-white"
                maxLength={255}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cert-file">Файл</Label>
              <Input
                id="cert-file"
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

            <Button onClick={handleAdd} disabled={!canSubmit} className="w-full">
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
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрити
          </Button>
        </SheetFooter>
      </SheetContent>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null)
        }}
        title="Видалити сертифікат?"
        description="Файл буде видалений безповоротно."
        confirmLabel="Видалити"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </Sheet>
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
