import { plainToInstance } from 'class-transformer';
import { TemplateResponseDto } from '../dto/template-response.dto';
import { TemplateWithAuthorAndTags } from '../templates.service';

export const toTemplateResponseDto = (template: TemplateWithAuthorAndTags): TemplateResponseDto => {
    return plainToInstance(TemplateResponseDto, template, {
        excludeExtraneousValues: true,
    });
};
