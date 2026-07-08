import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AuthorPreviewDto {
    @ApiProperty({ example: 'uuid', description: 'ID автора шаблона' })
    @IsUUID(4)
    id: string;

    @ApiProperty({ example: 'Max', description: 'Имя автора шаблона' })
    name: string;
}
