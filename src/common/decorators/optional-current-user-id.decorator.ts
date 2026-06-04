import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const OptionalCurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string | null => {
    const request: Request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return null;

    return user.sub;
});
