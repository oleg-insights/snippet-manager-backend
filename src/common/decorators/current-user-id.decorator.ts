import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

export const CurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
    const request: Request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new UnauthorizedException('Требуется авторизация');

    return user.sub;
});
