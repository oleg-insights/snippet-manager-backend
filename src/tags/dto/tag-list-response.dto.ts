import { ApiProperty } from '@nestjs/swagger';
import { ListResponseDto, PaginationMetaResponseDto } from 'src/common/dto/list-response.dto';
import { TagResponseDto } from './tag-response.dto';

export class TagListResponseDto extends ListResponseDto<TagResponseDto> {
    @ApiProperty({ type: () => [TagResponseDto], description: 'Массив тегов' })
    declare data: TagResponseDto[];

    @ApiProperty({ type: () => PaginationMetaResponseDto, description: 'Мета-данные пагинации' })
    declare meta: PaginationMetaResponseDto;
}
