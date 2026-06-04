import { User } from '@prisma/client';

export interface RefreshResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
}
