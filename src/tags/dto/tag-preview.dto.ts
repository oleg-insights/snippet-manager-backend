import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TagPreviewDto {
    @ApiProperty({ example: 'uuid', description: 'ID тега' })
    @IsUUID(4)
    id: string;

    @ApiProperty({ example: 'backend', description: 'Имя тега' })
    name: string;
}
