import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateUserDto {
    @ApiPropertyOptional({ example: 'Max', description: 'Новое имя пользователя' })
    @IsOptional()
    @IsString({ message: 'Имя должно быть строкой' })
    @MinLength(3, { message: 'Имя должно содержать минимум 3 символа' })
    @MaxLength(50, { message: 'Имя должно содержать максимум 50 символов' })
    name?: string;

    @ApiPropertyOptional({ example: 'max@test.com', description: 'Новый email пользователя' })
    @IsOptional()
    @IsEmail({}, { message: 'Некорректный формат email' })
    email?: string;

    @ApiPropertyOptional({
        example: 'https://avatar.png',
        description: 'Новый аватар пользователя',
        nullable: true,
    })
    @IsOptional()
    @IsUrl({}, { message: 'Значение поля `avatar` должно быть корректным URL-адресом' })
    @Matches(/\.(png|jpg|jpeg|gif)$/, { message: 'Изображение должно иметь формат JPG, JPEG, PNG или GIF' })
    @ValidateIf((o, value) => value !== null)
    avatar?: string | null;
}
