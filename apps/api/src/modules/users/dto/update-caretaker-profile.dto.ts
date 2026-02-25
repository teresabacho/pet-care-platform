import { PartialType } from '@nestjs/swagger';
import { CreateCaretakerProfileDto } from './create-caretaker-profile.dto';

export class UpdateCaretakerProfileDto extends PartialType(CreateCaretakerProfileDto) {}
