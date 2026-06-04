import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentBlockDto } from './create-template.dto';
import { IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTemplateDto {
    @ApiPropertyOptional({ example: 'Установка Nodejs', description: 'Новый заголовок' })
    @IsOptional()
    @IsString()
    @MinLength(1, { message: 'Заголовок шаблона должен содержать минимум 1 символ' })
    @MaxLength(100, { message: 'Заголовок шаблона должен содержать максимум 100 символов' })
    title?: string;

    @ApiPropertyOptional({ type: () => [ContentBlockDto], description: 'Массив блоков контента' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ContentBlockDto)
    content?: ContentBlockDto[];

    @ApiPropertyOptional({ example: ['uuid'], description: 'ID существующих тегов' })
    @IsOptional()
    @IsArray()
    @IsUUID(4, { each: true, message: 'Каждый ID тега должен быть валидным UUID' })
    tagIds?: string[];

    @ApiPropertyOptional({ example: ['backend'], description: 'Имена новых тегов' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true, message: 'Каждое имя тега должно быть строкой' })
    newTagNames?: string[];
}
