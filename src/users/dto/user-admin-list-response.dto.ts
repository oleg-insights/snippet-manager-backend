import { ApiProperty } from '@nestjs/swagger';
import { ListResponseDto, PaginationMetaResponseDto } from 'src/common/dto/list-response.dto';
import { UserAdminResponseDto } from './user-admin-response.dto';

export class UserAdminListResponseDto extends ListResponseDto<UserAdminResponseDto> {
    @ApiProperty({
        type: () => [UserAdminResponseDto],
        description: 'Массив пользователей',
    })
    declare data: UserAdminResponseDto[];

    @ApiProperty({
        type: () => PaginationMetaResponseDto,
        description: 'Мета-данные пагинации',
    })
    declare meta: PaginationMetaResponseDto;
}
