import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationDto {
    @ApiPropertyOptional({
        example: 1,
        description: 'Порядковый номер страницы, начиная с 1',
        default: 1,
    })
    @IsOptional()
    @IsInt({ message: 'Параметр page должен быть целым числом' })
    @Min(1, { message: 'Параметр page должен иметь значение 1 или больше' })
    @Type(() => Number)
    page: number = 1;

    @ApiPropertyOptional({
        example: 10,
        description: 'Количество записей на страницу',
        default: 10,
    })
    @IsOptional()
    @IsInt({ message: 'Параметр limit должен быть целым числом' })
    @Min(0, { message: 'Параметр limit должен иметь значение 0 или больше' })
    @Max(1000, { message: 'Максимальное значение параметра limit - 1000' })
    @Type(() => Number)
    limit: number = 10;

    @ApiPropertyOptional({
        example: 'createdAt',
        description: 'Поле, по которому сортируем. Общедоступные - id, name/title, createdAt',
        default: 'createdAt',
    })
    @IsOptional()
    @IsString({ message: 'Параметр sortBy должен быть строкой' })
    sortBy: string = 'createdAt';

    @ApiPropertyOptional({
        example: 'asc',
        description: 'Направление сортировки. По возрастанию - asc, по убыванию - desc',
        enum: ['asc', 'desc'],
        default: 'desc',
    })
    @IsOptional()
    @IsEnum(['asc', 'desc'], { message: 'Параметр order должен иметь значение asc или desc' })
    order: 'asc' | 'desc' = 'desc';
}
