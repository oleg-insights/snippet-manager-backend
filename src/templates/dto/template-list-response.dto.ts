import { ListResponseDto, PaginationMetaResponseDto } from 'src/common/dto/list-response.dto';
import { TemplateResponseDto } from './template-response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { TagPreviewDto } from 'src/tags/dto/tag-preview.dto';
import { SuggestedParentDto } from './suggested-parent.dto';

export class TemplateListResponseDto extends ListResponseDto<TemplateResponseDto> {
    @ApiProperty({ description: 'Массив шаблонов', type: () => [TemplateResponseDto] })
    declare data: TemplateResponseDto[];

    @ApiProperty({ description: 'Метаданные пагинации', type: () => PaginationMetaResponseDto })
    declare meta: PaginationMetaResponseDto;

    @ApiProperty({
        description: 'Теги, присутствующие в выборке шаблонов, но не в запросе',
        type: () => [TagPreviewDto],
    })
    declare availableTags: TagPreviewDto[];

    @ApiProperty({ description: 'Теги, выбранные пользователем', type: () => [TagPreviewDto] })
    declare selectedTags: TagPreviewDto[];

    @ApiProperty({
        description: 'Рекомендованные родительские теги, обобщающие выборку',
        type: () => [SuggestedParentDto],
    })
    declare suggestedParents: SuggestedParentDto[];
}
