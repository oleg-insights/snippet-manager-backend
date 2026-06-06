import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly redis: RedisService) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const canActivate = await super.canActivate(context);

        if (!canActivate) return false;

        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const token = request.headers.authorization.split(' ')[1];

        const [isBlacklistedUser, isBlacklistedToken] = await Promise.all([
            this.redis.get(`blacklist:user:${user.sub}`),
            this.redis.get(`blacklist:token:${token}`),
        ]);

        if (isBlacklistedUser || isBlacklistedToken) {
            throw new UnauthorizedException('Невалидная сессия');
        }

        return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleRequest<TUser = any>(err: any, user: any): TUser {
        if (!err && user) return user;
        throw new UnauthorizedException('Access-токен не передан или невалиден');
    }
}
