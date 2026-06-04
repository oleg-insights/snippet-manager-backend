import { Template } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { TemplateResponseDto } from '../dto/template-response.dto';

export const toTemplateResponseDto = (template: Template): TemplateResponseDto => {
    return plainToInstance(TemplateResponseDto, template, {
        excludeExtraneousValues: true,
    });
};
