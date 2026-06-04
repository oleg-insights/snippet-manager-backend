import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePasswordDto {
    @ApiProperty({ example: 'my_old_password', description: 'Старый пароль пользователя' })
    @IsString({ message: 'Некорректный формат старого пароля' })
    oldPassword: string;

    @ApiProperty({ example: 'my_new_password', description: 'Новый пароль пользователя' })
    @IsString({ message: 'Некорректный формат нового пароля' })
    @MinLength(5, { message: 'Новый пароль должен содержать минимум 5 символов' })
    @MaxLength(50, { message: 'Новый пароль должен содержать максимум 50 символов' })
    newPassword: string;
}
