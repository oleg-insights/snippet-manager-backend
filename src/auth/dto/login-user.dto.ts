import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginUserDto {
    @ApiProperty({ example: 'max@test.com', description: 'Email пользователя' })
    @IsEmail({}, { message: 'Некорректный формат Email' })
    email: string;

    @ApiProperty({ example: 'max_password', description: 'Пароль пользователя' })
    @IsString()
    @MinLength(5, { message: 'Пароль должен содержать минимум 5 символов' })
    password: string;
}
