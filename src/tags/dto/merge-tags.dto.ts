import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MergeTagsDto {
    @ApiProperty({ example: 'uuid', description: 'ID сливаемого тега' })
    @IsUUID(4, { message: 'sourceTagId должен быть валидным UUID' })
    sourceTagId: string;

    @ApiProperty({ example: 'uuid', description: 'ID целевого тега' })
    @IsUUID(4, { message: 'targetTagId должен быть валидным UUID' })
    targetTagId: string;
}
