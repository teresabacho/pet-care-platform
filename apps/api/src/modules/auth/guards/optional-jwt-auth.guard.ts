import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Не падає, якщо токен відсутній або невалідний — просто залишає request.user undefined.
// Для публічних ендпоінтів, поведінка яких залежить від того, чи юзер автентифікований
// (наприклад, обфускація приватної адреси не застосовується до її власника).
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }

    handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser {
        return user;
    }
}
