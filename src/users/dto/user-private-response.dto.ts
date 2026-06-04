import { ApiProperty } from '@nestjs/swagger';
import { UserPublicResponseDto } from './user-public-response.dto';
import { Expose } from 'class-transformer';

export class UserPrivateResponseDto extends UserPublicResponseDto {
    @ApiProperty({ example: 'max@test.com', description: 'Email пользователя' })
    @Expose()
    email: string;

    @ApiProperty({
        example: '2026-05-16T23:44:57.000Z',
        format: 'date-time',
        description: 'Дата и время редактирования пользователя',
    })
    @Expose()
    updatedAt: string;
}
