import { ApiProperty } from '@nestjs/swagger';

export class SuggestedParentDto {
    @ApiProperty({ example: 'uuid', description: 'ID рекомендованного родительского тега' })
    id: string;

    @ApiProperty({ example: 'backend', description: 'Имя рекомендованного родительского тега' })
    name: string;

    @ApiProperty({ example: ['uuid1', 'uuid2'], description: 'ID тегов, которые заменяет родитель' })
    childIds: string[];
}
