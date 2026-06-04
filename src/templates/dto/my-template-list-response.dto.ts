import { ListResponseDto, PaginationMetaResponseDto } from 'src/common/dto/list-response.dto';
import { TemplateResponseDto } from './template-response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class MyTemplateListResponseDto extends ListResponseDto<TemplateResponseDto> {
    @ApiProperty({ description: 'Массив шаблонов', type: () => [TemplateResponseDto] })
    declare data: TemplateResponseDto[];

    @ApiProperty({ description: 'Метаданные пагинации', type: () => PaginationMetaResponseDto })
    declare meta: PaginationMetaResponseDto;
}
