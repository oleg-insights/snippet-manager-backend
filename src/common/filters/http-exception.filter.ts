import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let error = 'Internal Server Error';
        let message: string | string[] = 'Внутренняя ошибка сервера';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();

            if (typeof res === 'string') {
                message = res;
                error = exception.name.replace('Exception', '');
            } else if (typeof res === 'object' && res !== null) {
                const responseBody = res as {
                    message?: string | string[];
                    error?: string;
                };
                message = responseBody.message || exception.message;
                error = responseBody.error || exception.name.replace('Exception', '');
            }
        } else {
            this.logger.error('Unhandled Exception:', exception);
        }

        const errorResponse: {
            statusCode: number;
            error: string;
            message: string | string[];
        } = {
            statusCode: status,
            error,
            message,
        };

        response.status(status).json(errorResponse);
    }
}
