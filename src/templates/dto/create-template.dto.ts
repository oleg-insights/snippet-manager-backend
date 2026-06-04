import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    Allow,
    ArrayNotEmpty,
    IsArray,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
    Validate,
    ValidateNested,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

export enum ContentBlockType {
    LIST = 'list',
    SUBTITLE = 'subtitle',
    CODE = 'code',
    IMAGE = 'image',
    TEXT = 'text',
}

export class ContentBlockDto {
    @ApiProperty({ enum: ContentBlockType, example: ContentBlockType.TEXT, description: 'Тип контента в блоке' })
    @IsEnum(ContentBlockType)
    type: ContentBlockType;

    @ApiProperty({ example: 'Необходимо загрузить дистрибутив', description: 'Данные блока' })
    @Allow()
    data: unknown;
}

@ValidatorConstraint({ name: 'atLeastOneTag', async: false })
class AtLeastOneTag implements ValidatorConstraintInterface {
    validate(_: unknown, args: ValidationArguments): boolean {
        const dto = args.object as CreateTemplateDto;
        const hasTagIds = dto.tagIds && dto.tagIds.length > 0;
        const hasNewTagNames = dto.newTagNames && dto.newTagNames.length > 0;

        return Boolean(hasTagIds || hasNewTagNames);
    }

    defaultMessage() {
        return 'Должен быть указан хотя бы один существующий или новый тег';
    }
}

export class CreateTemplateDto {
    @ApiProperty({ example: 'Установка Node.js', description: 'Название шаблона' })
    @IsString()
    @MinLength(1, { message: 'Заголовок шаблона должен содержать минимум 1 символ' })
    @MaxLength(100, { message: 'Заголовок шаблона должен содержать максимум 100 символов' })
    title: string;

    @ApiProperty({ type: [ContentBlockDto], description: 'Массив блоков контента' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ContentBlockDto)
    content: ContentBlockDto[];

    @ApiPropertyOptional({ example: ['123e4567-e89b-12d3-a456-426614174000'], description: 'ID существующих тегов' })
    @IsOptional()
    @IsArray()
    @IsUUID(4, { each: true, message: 'Каждый ID тега должен быть валидным UUID' })
    @ArrayNotEmpty({ message: 'Запрос должен содержать минимум 1 существующий или новый тег' })
    tagIds?: string[];

    @ApiPropertyOptional({ example: ['backend', 'nodejs'], description: 'Имена новых тегов' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true, message: 'Каждое имя тега должно быть строкой' })
    @ArrayNotEmpty({ message: 'Запрос должен содержать минимум 1 существующий или новый тег' })
    newTagNames?: string[];

    @Validate(AtLeastOneTag)
    @ApiHideProperty()
    private readonly _atLeastOneTag?: never;
}
