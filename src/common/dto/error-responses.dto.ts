import { ApiProperty } from '@nestjs/swagger';

class BaseErrorDto {
    @ApiProperty({ description: 'HTTP-код ошибки' })
    statusCode: number;

    @ApiProperty({ description: 'Текстовое обозначение ошибки' })
    error: string;

    @ApiProperty({ description: 'Описание ошибки' })
    message: string;
}

export class UnauthorizedResponseDto extends BaseErrorDto {
    @ApiProperty({ example: 401 })
    declare statusCode: number;

    @ApiProperty({ example: 'Unauthorized' })
    declare error: string;

    @ApiProperty({ example: 'Token is missing' })
    declare message: string;
}

export class ForbiddenResponseDto extends BaseErrorDto {
    @ApiProperty({ example: 403 })
    declare statusCode: number;

    @ApiProperty({ example: 'Forbidden' })
    declare error: string;

    @ApiProperty({ example: 'Access denied' })
    declare message: string;
}

export class NotFoundResponseDto extends BaseErrorDto {
    @ApiProperty({ example: 404 })
    declare statusCode: number;

    @ApiProperty({ example: 'Not Found' })
    declare error: string;

    @ApiProperty({ example: 'Resource not found' })
    declare message: string;
}

export class ConflictResponseDto extends BaseErrorDto {
    @ApiProperty({ example: 409 })
    declare statusCode: number;

    @ApiProperty({ example: 'Conflict' })
    declare error: string;

    @ApiProperty({ example: 'Resource already exists' })
    declare message: string;
}

export class TooManyRequestsResponseDto extends BaseErrorDto {
    @ApiProperty({ example: 429 })
    declare statusCode: number;

    @ApiProperty({ example: 'TooManyRequests' })
    declare error: string;

    @ApiProperty({ example: 'Too many requests. Please try again later' })
    declare message: string;
}
