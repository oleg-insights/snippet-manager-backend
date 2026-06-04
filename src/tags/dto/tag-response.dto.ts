import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TagResponseDto {
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID тега (uuid)' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'Backend', description: 'Имя тега' })
    @Expose()
    name: string;

    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID создателя тега' })
    @Expose()
    authorId: string;

    @ApiPropertyOptional({
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Пользователь, использующий тег как приватный',
        nullable: true,
    })
    @Expose()
    scopeUserId?: string | null;

    @ApiPropertyOptional({
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Редактор тега',
        nullable: true,
    })
    @Expose()
    updatedBy?: string | null;

    @ApiProperty({
        example: '2026-05-16T23:44:57.000Z',
        format: 'date-time',
        description: 'Дата и время создания тега',
    })
    @Expose()
    createdAt: Date;

    @ApiProperty({
        example: '2026-05-16T23:44:57.000Z',
        format: 'date-time',
        description: 'Дата и время обновления тега',
    })
    @Expose()
    updatedAt: Date;
}
