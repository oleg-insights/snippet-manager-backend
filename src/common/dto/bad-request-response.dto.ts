import { ApiProperty } from '@nestjs/swagger';

export class BadRequestResponseDto {
    @ApiProperty({ example: 400, description: 'HTTP-код ошибки' })
    statusCode: number;

    @ApiProperty({ example: 'Bad Request', description: 'Текстовое обозначение ошибки' })
    error: string;

    @ApiProperty({ example: ['Validation error'], type: [String], description: 'Описание ошибки' })
    message: string[];
}
