import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { TagPreviewDto } from 'src/tags/dto/tag-preview.dto';
import { ContentBlockDto } from './create-template.dto';

export class TemplateResponseDto {
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID шаблона (uuid)' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'Название шаблона', description: 'Название шаблона' })
    @Expose()
    title: string;

    @ApiProperty({ type: () => [ContentBlockDto], description: 'Блоки шаблона' })
    @Expose()
    content: ContentBlockDto[];

    @ApiProperty({ example: false, description: 'Видимость в общем доступе' })
    @Expose()
    isPublic: boolean;

    @ApiProperty({ example: 0, description: 'Количество просмотров' })
    @Expose()
    useCount: number;

    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID автора шаблона' })
    @Expose()
    authorId: string;

    @ApiPropertyOptional({
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'ID пользователя, изменившего шаблон',
        nullable: true,
    })
    @Expose()
    updatedBy: string | null;

    @ApiProperty({
        type: () => [TagPreviewDto],
        description: 'Превью связанных с шаблоном тегов',
    })
    @Expose()
    tags: TagPreviewDto[];

    @ApiProperty({ example: '2026-05-16T23:44:57.000Z', format: 'date-time', description: 'Дата и время создания' })
    @Expose()
    createdAt: Date;

    @ApiProperty({ example: '2026-05-16T23:44:57.000Z', format: 'date-time', description: 'Дата и время обновления' })
    @Expose()
    updatedAt: Date;
}
