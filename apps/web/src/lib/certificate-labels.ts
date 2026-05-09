import { CertificateType } from '@pet-care/shared'

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  [CertificateType.VET_DEGREE]: 'Диплом ветеринара',
  [CertificateType.TRAINER_COURSE]: 'Курс кінолога',
  [CertificateType.FIRST_AID_COURSE]: 'Курс першої допомоги',
  [CertificateType.GROOMING_COURSE]: 'Курс грумінгу',
  [CertificateType.SCHOOL_DIPLOMA]: 'Атестат',
  [CertificateType.COLLEGE_DIPLOMA]: 'Диплом коледжу',
  [CertificateType.UNIVERSITY_DEGREE]: 'Диплом ВНЗ',
  [CertificateType.OTHER]: 'Інше',
}
