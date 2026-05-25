import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

@ApiTags('availability')
@Controller('caretaker-profile')
export class AvailabilityController {
    constructor(private readonly availabilityService: AvailabilityService) {}

    @Get(':caretakerProfileId/availability')
    @ApiOperation({ summary: 'Календар доступності caretaker-а (публічний)' })
    @ApiQuery({ name: 'from', description: 'Дата у форматі YYYY-MM-DD' })
    @ApiQuery({ name: 'to', description: 'Дата у форматі YYYY-MM-DD' })
    @ApiResponse({ status: 200 })
    list(
        @Param('caretakerProfileId', ParseUUIDPipe) caretakerProfileId: string,
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        if (!from || !ISO_DATE.test(from) || !to || !ISO_DATE.test(to)) {
            throw new BadRequestException('from та to мають бути у форматі YYYY-MM-DD');
        }
        return this.availabilityService.findByCaretakerProfileId(
            caretakerProfileId,
            from,
            to,
        );
    }

    @Put('me/availability')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Зберегти доступність на вказані дати (replace-by-date)',
    })
    @ApiResponse({ status: 200 })
    @ApiResponse({ status: 404, description: 'Профіль виконавця не знайдено' })
    set(
        @CurrentUser('id') userId: string,
        @Body() dto: SetAvailabilityDto,
    ) {
        return this.availabilityService.setForCurrentUser(userId, dto);
    }
}
