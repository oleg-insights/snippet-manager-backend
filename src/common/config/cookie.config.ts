import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';

export const getCookieConfig = (configService: ConfigService): CookieOptions => ({
    httpOnly: true,
    secure: configService.get<string>('NODE_ENV') === 'production',
    sameSite: 'strict',
    path: '/',
});
