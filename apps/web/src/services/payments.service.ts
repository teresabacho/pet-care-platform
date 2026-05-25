import { apiClient } from './api'
import type { PaymentStatus } from '@pet-care/shared'

export interface InvoiceFormResponse {
  mode: 'liqpay' | 'stub'
  data: string
  signature: string
  publicKey: string
  checkoutUrl: string
}

interface StatusResponse {
  paymentStatus: PaymentStatus
  paidAt: string | null
}

export const paymentsService = {
  async createInvoice(bookingId: string): Promise<InvoiceFormResponse> {
    const { data } = await apiClient.post<InvoiceFormResponse>(
      `/payments/bookings/${bookingId}/invoice`,
    )
    return data
  },

  async checkStatus(bookingId: string): Promise<StatusResponse> {
    const { data } = await apiClient.post<StatusResponse>(
      `/payments/bookings/${bookingId}/check-status`,
    )
    return data
  },

  async stubConfirm(bookingId: string): Promise<StatusResponse> {
    const { data } = await apiClient.post<StatusResponse>(
      `/payments/bookings/${bookingId}/stub-confirm`,
    )
    return data
  },
}

// Сабмітить приховану форму на LiqPay checkout — це викличе redirect
// у тому ж вікні. Користувача повернуть назад через result_url.
export function submitToLiqPay(invoice: InvoiceFormResponse): void {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = invoice.checkoutUrl
  form.target = '_self'
  form.style.display = 'none'

  const dataInput = document.createElement('input')
  dataInput.name = 'data'
  dataInput.value = invoice.data
  form.appendChild(dataInput)

  const sigInput = document.createElement('input')
  sigInput.name = 'signature'
  sigInput.value = invoice.signature
  form.appendChild(sigInput)

  document.body.appendChild(form)
  form.submit()
}
