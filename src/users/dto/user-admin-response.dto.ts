import { ApiProperty } from '@nestjs/swagger';
import { UserPrivateResponseDto } from './user-private-response.dto';
import { Expose } from 'class-transformer';

export class UserAdminResponseDto extends UserPrivateResponseDto {
    @ApiProperty({ example: 'ACTIVE', description: 'Статус пользователя' })
    @Expose()
    status: string;

    @ApiProperty({
        example: '2026-05-16T23:44:57.000Z',
        format: 'date-time',
        description: 'Дата и время удаления пользователя',
    })
    @Expose()
    deletedAt?: string;
}
