import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterUserDto {
    @ApiProperty({ example: 'Max', description: 'Имя нового пользователя' })
    @IsString()
    @MinLength(3, { message: 'Имя должно содержать минимум 3 символа' })
    @MaxLength(50, { message: 'Имя должно содержать максимум 50 символов' })
    name: string;

    @ApiProperty({ example: 'max@test.com', description: 'Email нового пользователя' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'max_password', description: 'Пароль нового пользователя' })
    @IsString()
    @MinLength(5, { message: 'Пароль должен содержать минимум 5 символов' })
    @MaxLength(50, { message: 'Пароль должен содержать максимум 50 символов' })
    password: string;
}
