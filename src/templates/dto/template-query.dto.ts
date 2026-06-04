import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class TemplateQueryDto extends PaginationDto {
    @ApiPropertyOptional({
        type: [String],
        example: ['uuid'],
        description: 'ID тегов для фильтра шаблонов',
    })
    @IsOptional()
    @IsArray()
    @IsUUID(4, { each: true, message: 'Каждый ID тега должен быть корректным UUID' })
    @Transform(({ value }) => {
        if (value === undefined) return undefined;
        return Array.isArray(value) ? value : [value];
    })
    tagIds?: string[];
}
