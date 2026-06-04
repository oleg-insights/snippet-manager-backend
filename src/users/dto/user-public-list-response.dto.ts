import { ApiProperty } from '@nestjs/swagger';
import { ListResponseDto, PaginationMetaResponseDto } from 'src/common/dto/list-response.dto';
import { UserPublicResponseDto } from './user-public-response.dto';

export class UserPublicListResponseDto extends ListResponseDto<UserPublicResponseDto> {
    @ApiProperty({
        type: () => [UserPublicResponseDto],
        description: 'Массив пользователей',
    })
    declare data: UserPublicResponseDto[];

    @ApiProperty({
        type: () => PaginationMetaResponseDto,
        description: 'Мета-данные пагинации',
    })
    declare meta: PaginationMetaResponseDto;
}
