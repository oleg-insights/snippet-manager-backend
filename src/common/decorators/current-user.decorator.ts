import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): { sub: string; role: string } => {
    const request: Request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new UnauthorizedException('Требуется авторизация');

    return user;
});
