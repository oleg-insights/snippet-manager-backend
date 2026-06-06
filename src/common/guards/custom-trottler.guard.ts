import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
    protected throwThrottlingException(_: ExecutionContext): never {
        throw new HttpException(
            {
                statusCode: 429,
                error: 'Too Many Requests',
                message: 'Превышено количество запросов. Попробуйте позже.',
            },
            HttpStatus.TOO_MANY_REQUESTS,
        );
    }
}
