import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

// LiqPay signature: base64(sha1(private_key + data + private_key))
// data: base64(JSON.stringify(payload))
// Документація: https://www.liqpay.ua/en/documentation/api/aquiring/

interface LiqPayBasePayload {
    version: 3;
    public_key: string;
    action: string;
}

export interface LiqPayPayPayload extends LiqPayBasePayload {
    action: 'pay';
    amount: number;
    currency: string;
    description: string;
    order_id: string;
    sandbox?: 1 | 0;
    result_url?: string;
    server_url?: string;
}

export interface LiqPayStatusResponse {
    status: string; // 'success' | 'failure' | 'wait_secure' | 'reversed' | ...
    payment_id?: number;
    amount?: number;
    currency?: string;
    order_id?: string;
    err_code?: string;
    err_description?: string;
    [k: string]: unknown;
}

@Injectable()
export class LiqPayClient {
    private readonly logger = new Logger(LiqPayClient.name);
    private readonly publicKey: string;
    private readonly privateKey: string;
    private readonly sandbox: boolean;
    private readonly apiUrl = 'https://www.liqpay.ua/api/request';
    readonly checkoutUrl = 'https://www.liqpay.ua/api/3/checkout';

    constructor(config: ConfigService) {
        this.publicKey = config.get<string>('LIQPAY_PUBLIC_KEY', '');
        this.privateKey = config.get<string>('LIQPAY_PRIVATE_KEY', '');
        this.sandbox = config.get<string>('LIQPAY_SANDBOX', '1') === '1';
        if (!this.publicKey || !this.privateKey) {
            this.logger.warn(
                'LIQPAY_PUBLIC_KEY / LIQPAY_PRIVATE_KEY не налаштовано — оплата не працюватиме',
            );
        }
    }

    isConfigured(): boolean {
        return Boolean(this.publicKey && this.privateKey);
    }

    encodeData(payload: Record<string, unknown>): string {
        return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
    }

    decodeData<T = Record<string, unknown>>(data: string): T {
        return JSON.parse(Buffer.from(data, 'base64').toString('utf-8')) as T;
    }

    sign(data: string): string {
        return createHash('sha1')
            .update(this.privateKey + data + this.privateKey)
            .digest('base64');
    }

    verify(data: string, signature: string): boolean {
        return this.sign(data) === signature;
    }

    // Будує { data, signature } для checkout-форми (фронт сабмітить на checkoutUrl).
    buildCheckoutForm(input: {
        amount: number;
        currency?: string;
        description: string;
        orderId: string;
        resultUrl: string;
        serverUrl?: string;
    }): { data: string; signature: string; publicKey: string; checkoutUrl: string } {
        const payload: LiqPayPayPayload = {
            version: 3,
            public_key: this.publicKey,
            action: 'pay',
            amount: input.amount,
            currency: input.currency ?? 'UAH',
            description: input.description,
            order_id: input.orderId,
            sandbox: this.sandbox ? 1 : 0,
            result_url: input.resultUrl,
            ...(input.serverUrl ? { server_url: input.serverUrl } : {}),
        };
        const data = this.encodeData(payload as unknown as Record<string, unknown>);
        const signature = this.sign(data);
        return {
            data,
            signature,
            publicKey: this.publicKey,
            checkoutUrl: this.checkoutUrl,
        };
    }

    // Server-to-server status query: повертає поточний стан платежу.
    async queryStatus(orderId: string): Promise<LiqPayStatusResponse | null> {
        if (!this.isConfigured()) return null;
        const payload = {
            version: 3,
            public_key: this.publicKey,
            action: 'status',
            order_id: orderId,
        };
        const data = this.encodeData(payload);
        const signature = this.sign(data);
        const body = new URLSearchParams({ data, signature });
        try {
            const res = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body.toString(),
            });
            if (!res.ok) {
                this.logger.warn(
                    `LiqPay status query HTTP ${res.status} for order ${orderId}`,
                );
                return null;
            }
            return (await res.json()) as LiqPayStatusResponse;
        } catch (err) {
            this.logger.error(
                `LiqPay status query failed: ${(err as Error).message}`,
            );
            return null;
        }
    }
}
