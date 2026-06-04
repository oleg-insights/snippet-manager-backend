import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { setupTestApplication, TestContext } from './test.setup';
import request from 'supertest';
import { UserRole, UserStatus } from '@prisma/client';
import { RedisService } from 'src/redis/redis.service';

describe('PATCH /api/admin/users/:id/role', () => {
    let context: TestContext;

    beforeAll(async () => {
        context = await setupTestApplication();
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 200 and update user role', async () => {
        const user = await context.generator.createUser({ role: UserRole.USER });
        const admin = await context.generator.createUser({ role: UserRole.ADMIN });
        const tokens = await context.authService.generateTokens(admin.id, admin.role);
        const adminToken = tokens.accessToken;

        const response = await request(context.app.getHttpServer())
            .patch(`/api/admin/users/${user.id}/role`)
            .send({ role: 'ADMIN' })
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);

        const userInDb = await context.prisma.user.findUnique({ where: { id: user.id } });

        expect(userInDb).not.toBeNull();
        expect(userInDb!.role).toBe(UserRole.ADMIN);
    });
});

describe('DELETE /api/admin/users/:id', () => {
    let context: TestContext;
    let redis: RedisService;

    beforeAll(async () => {
        context = await setupTestApplication();
        redis = context.app.get<RedisService>(RedisService);
    });

    afterAll(async () => {
        if (!context) return;
        await context.close();
    });

    it('should return 204 and delete(soft) user', async () => {
        // update name, email, status, deletedAt
        // delete sessions
        // invalidate userId

        const user = await context.generator.createUser();
        const userTokens = await context.authService.generateTokens(user.id, user.role);
        await context.authService.createSession(user.id, userTokens.refreshToken, userTokens.expiresAt, null, null);

        const admin = await context.generator.createUser({ role: UserRole.ADMIN });
        const adminTokens = await context.authService.generateTokens(admin.id, admin.role);
        const adminToken = adminTokens.accessToken;

        const response = await request(context.app.getHttpServer())
            .delete(`/api/admin/users/${user.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(204);

        const deleted = await context.prisma.user.findUnique({ where: { id: user.id } });

        expect(deleted).not.toBeNull();
        expect(deleted!.name).toMatch(/^deleted_/);
        expect(deleted!.email).toMatch(/^deleted_/);
        expect(deleted!.status).toBe(UserStatus.DELETED);
        expect(deleted!.deletedAt).not.toBeNull();

        const sessionsCount = await context.prisma.session.count({ where: { userId: user.id } });

        expect(sessionsCount).toBe(0);

        const rawInBlacklist = await redis.get(`blacklist:user:${user.id}`);

        expect(rawInBlacklist).toBeTruthy();
    });
});
