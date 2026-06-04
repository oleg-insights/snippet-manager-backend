import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaResponseDto {
    @ApiProperty({ example: 1500, description: 'Общее количество записей по текущему запросу' })
    totalItems: number;

    @ApiProperty({ example: 30, description: 'Общее количество страниц по текущему запросу' })
    totalPages: number;

    @ApiProperty({ example: 1, description: 'Текущая страница' })
    currentPage: number;

    @ApiProperty({ example: 10, description: 'Текущий лимит количества записей на страницу' })
    limit: number;
}

export class ListResponseDto<T> {
    data: T[];
    meta: PaginationMetaResponseDto;
}
