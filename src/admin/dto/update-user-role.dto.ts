import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateUserRoleDto {
    @ApiProperty({
        example: UserRole.ADMIN,
        description: 'Новая роль пользователя',
        enum: UserRole,
    })
    @IsEnum(UserRole, { message: 'Роль должна иметь значение USER или ADMIN' })
    role: UserRole;
}
