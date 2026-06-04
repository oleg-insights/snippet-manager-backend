import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserPublicResponseDto {
    @ApiProperty({ example: 'uuid', description: 'ID пользователя' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'Max', description: 'Имя пользователя' })
    @Expose()
    name: string;

    @ApiProperty({ example: 'https//avatar.png', description: 'Аватарка пользователя', nullable: true })
    @Expose()
    avatar?: string | null;

    @ApiProperty({ example: 'USER', description: 'Роль пользователя' })
    @Expose()
    role: string;

    @ApiProperty({
        example: '2026-05-16T23:44:57.000Z',
        format: 'date-time',
        description: 'Дата и время создания пользователя',
    })
    @Expose()
    createdAt: string;
}
