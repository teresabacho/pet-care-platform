import {
    Body,
    Controller,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface CallbackBody {
    data: string;
    signature: string;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    @Post('bookings/:id/invoice')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Створити LiqPay-інвойс для замовлення (повертає data+signature)',
    })
    @ApiResponse({ status: 201 })
    createInvoice(
        @Param('id', ParseUUIDPipe) bookingId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.paymentsService.createInvoice(bookingId, userId);
    }

    @Post('bookings/:id/check-status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(200)
    @ApiOperation({
        summary: 'Опитати LiqPay про стан платежу і синхронізувати з Booking',
    })
    @ApiResponse({ status: 200 })
    checkStatus(
        @Param('id', ParseUUIDPipe) bookingId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.paymentsService.checkStatus(bookingId, userId);
    }

    @Post('bookings/:id/stub-confirm')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(200)
    @ApiOperation({
        summary: 'Stub-провайдер: підтвердити оплату вручну (test/dev only)',
    })
    @ApiResponse({ status: 200 })
    stubConfirm(
        @Param('id', ParseUUIDPipe) bookingId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.paymentsService.stubConfirmPayment(bookingId, userId);
    }

    // Публічний webhook — LiqPay сюди POSTить { data, signature }.
    // Без guard. Сервіс перевіряє підпис.
    @Post('liqpay-callback')
    @HttpCode(200)
    @ApiOperation({ summary: 'LiqPay webhook (server_url)' })
    @ApiResponse({ status: 200 })
    async callback(@Body() body: CallbackBody) {
        await this.paymentsService.handleCallback(body.data, body.signature);
        return { ok: true };
    }
}
