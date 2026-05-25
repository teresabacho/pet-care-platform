import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentStatus } from '@pet-care/shared';
import { Booking } from '../bookings/entities/booking.entity';
import { LiqPayClient } from './liqpay-client';

// mode='liqpay' — frontend сабмітить { data, signature } на checkoutUrl LiqPay.
// mode='stub' — внутрішня заглушка: checkoutUrl — внутрішній шлях фронта
// (/payments/stub-checkout?bookingId=...), data/signature/publicKey порожні.
export interface InvoiceFormResponse {
    mode: 'liqpay' | 'stub';
    data: string;
    signature: string;
    publicKey: string;
    checkoutUrl: string;
}

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        @InjectRepository(Booking)
        private readonly bookingRepo: Repository<Booking>,
        private readonly liqpay: LiqPayClient,
        private readonly config: ConfigService,
    ) {}

    private get provider(): 'liqpay' | 'stub' {
        const raw = this.config.get<string>('PAYMENTS_PROVIDER', 'liqpay');
        return raw === 'stub' ? 'stub' : 'liqpay';
    }

    async createInvoice(
        bookingId: string,
        currentUserId: string,
    ): Promise<InvoiceFormResponse> {
        const booking = await this.bookingRepo.findOne({
            where: { id: bookingId },
        });
        if (!booking) throw new NotFoundException('Замовлення не знайдено');
        if (booking.ownerId !== currentUserId) {
            throw new ForbiddenException('Платити може тільки власник');
        }
        if (booking.paymentStatus === PaymentStatus.PAID) {
            throw new ConflictException('Замовлення вже оплачено');
        }

        // Stub-режим — повертаємо внутрішній шлях, без LiqPay.
        if (this.provider === 'stub') {
            return {
                mode: 'stub',
                data: '',
                signature: '',
                publicKey: '',
                checkoutUrl: `/payments/stub-checkout?bookingId=${booking.id}`,
            };
        }

        if (!this.liqpay.isConfigured()) {
            throw new BadRequestException(
                'LiqPay не налаштовано на сервері (LIQPAY_PUBLIC_KEY / LIQPAY_PRIVATE_KEY)',
            );
        }

        const frontendUrl = this.config.get<string>(
            'FRONTEND_URL',
            'http://localhost:5173',
        );
        const backendPublicUrl = this.config.get<string>(
            'BACKEND_PUBLIC_URL',
            '',
        );
        const resultUrl = `${frontendUrl}/bookings?paid=1&bookingId=${booking.id}`;
        // server_url передаємо тільки якщо є публічний URL — інакше LiqPay не зможе
        // достукатись до localhost і покаже помилку валідації. Без webhook
        // ми покладаємось на /check-status (опитування з фронта після redirect).
        const serverUrl = backendPublicUrl
            ? `${backendPublicUrl.replace(/\/+$/, '')}/payments/liqpay-callback`
            : undefined;

        const form = this.liqpay.buildCheckoutForm({
            amount: Number(booking.price),
            currency: 'UAH',
            description: `Замовлення ${booking.id.slice(0, 8)} на платформі PawMate`,
            orderId: booking.id,
            resultUrl,
            serverUrl,
        });
        return { mode: 'liqpay', ...form };
    }

    // Викликається з фронту коли користувач натиснув «Оплатити» у stub-чекауті.
    // Працює лише у stub-режимі — захист від випадкового виклику в проді.
    async stubConfirmPayment(
        bookingId: string,
        currentUserId: string,
    ): Promise<{ paymentStatus: PaymentStatus; paidAt: Date | null }> {
        if (this.provider !== 'stub') {
            throw new BadRequestException(
                'Stub-режим вимкнено. Встановіть PAYMENTS_PROVIDER=stub',
            );
        }
        const booking = await this.bookingRepo.findOne({
            where: { id: bookingId },
        });
        if (!booking) throw new NotFoundException('Замовлення не знайдено');
        if (booking.ownerId !== currentUserId) {
            throw new ForbiddenException('Платити може тільки власник');
        }
        if (booking.paymentStatus === PaymentStatus.PAID) {
            return {
                paymentStatus: booking.paymentStatus,
                paidAt: booking.paidAt,
            };
        }
        const paidAt = new Date();
        await this.bookingRepo.update(booking.id, {
            paymentStatus: PaymentStatus.PAID,
            paidAt,
            paymentExternalId: `stub-${Date.now()}`,
        });
        return { paymentStatus: PaymentStatus.PAID, paidAt };
    }

    async checkStatus(
        bookingId: string,
        currentUserId: string,
    ): Promise<{ paymentStatus: PaymentStatus; paidAt: Date | null }> {
        const booking = await this.bookingRepo.findOne({
            where: { id: bookingId },
        });
        if (!booking) throw new NotFoundException('Замовлення не знайдено');
        if (
            booking.ownerId !== currentUserId &&
            booking.caretakerId !== currentUserId
        ) {
            throw new ForbiddenException('Немає доступу');
        }
        if (booking.paymentStatus === PaymentStatus.PAID) {
            return {
                paymentStatus: booking.paymentStatus,
                paidAt: booking.paidAt,
            };
        }

        const remote = await this.liqpay.queryStatus(bookingId);
        if (!remote) {
            return {
                paymentStatus: booking.paymentStatus,
                paidAt: booking.paidAt,
            };
        }

        await this.applyStatus(booking, remote.status, remote.payment_id);
        return {
            paymentStatus: booking.paymentStatus,
            paidAt: booking.paidAt,
        };
    }

    // Викликається з webhook (server_url) — LiqPay POST з { data, signature }.
    async handleCallback(data: string, signature: string): Promise<void> {
        if (!this.liqpay.verify(data, signature)) {
            this.logger.warn('LiqPay callback: signature mismatch');
            throw new BadRequestException('Invalid signature');
        }
        const payload = this.liqpay.decodeData<{
            order_id?: string;
            status?: string;
            payment_id?: number;
        }>(data);
        const orderId = payload.order_id;
        const status = payload.status;
        if (!orderId || !status) {
            throw new BadRequestException('Invalid payload');
        }
        const booking = await this.bookingRepo.findOne({ where: { id: orderId } });
        if (!booking) {
            this.logger.warn(`LiqPay callback: booking ${orderId} not found`);
            return;
        }
        await this.applyStatus(booking, status, payload.payment_id);
    }

    private async applyStatus(
        booking: Booking,
        liqpayStatus: string,
        paymentId?: number,
    ): Promise<void> {
        // LiqPay коди:
        //   success / wait_compensation / sandbox — успіх (gross)
        //   failure / error / 3ds_verify — невдало
        //   reversed — повернення
        const successStatuses = new Set([
            'success',
            'sandbox',
            'wait_compensation',
        ]);
        const failureStatuses = new Set(['failure', 'error']);
        const refundStatuses = new Set(['reversed']);

        let next: PaymentStatus | null = null;
        let paidAt: Date | null = booking.paidAt;
        if (successStatuses.has(liqpayStatus)) {
            next = PaymentStatus.PAID;
            paidAt = paidAt ?? new Date();
        } else if (failureStatuses.has(liqpayStatus)) {
            next = PaymentStatus.FAILED;
        } else if (refundStatuses.has(liqpayStatus)) {
            next = PaymentStatus.REFUNDED;
        }

        if (!next || next === booking.paymentStatus) return;

        await this.bookingRepo.update(booking.id, {
            paymentStatus: next,
            paymentExternalId: paymentId ? String(paymentId) : booking.paymentExternalId,
            paidAt,
        });
        booking.paymentStatus = next;
        booking.paidAt = paidAt;
        booking.paymentExternalId = paymentId
            ? String(paymentId)
            : booking.paymentExternalId;
    }
}
