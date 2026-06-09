import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { setupTestApplication, TestContext } from '../test/test.setup';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';

describe('Notification on publish', () => {
    let context: TestContext;
    let socket: Socket;

    beforeAll(async () => {
        context = await setupTestApplication();

        const server = context.app.getHttpServer();

        await server.listen(0);

        const port = server.address().port;

        socket = io(`http://localhost:${port}`);

        await new Promise<void>((resolve) => socket.on('connect', resolve));
    });

    afterAll(async () => {
        if (socket) socket.disconnect();
        if (context) await context.close();
    });

    it('should return notification after template publish', async () => {
        const notificationResolve = new Promise<{ title: string; text: string }>((resolve) => {
            socket.on('receive_publish', (data) => resolve(data));
        });

        const user = await context.generator.createUser();
        const tokens = await context.authService.generateTokens(user.id, user.role);
        const userToken = tokens.accessToken;

        const tag = await context.generator.createTag(user.id, { scopeUserId: user.id });
        const template = await context.generator.createTemplate(user.id, { tagIds: [tag.id] });

        const response = await request(context.app.getHttpServer())
            .post(`/api/templates/${template.id}/publish`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);

        const notification = await notificationResolve;

        expect(notification).toBeDefined();
        expect(notification).toMatchObject({
            title: 'Опубликован новый шаблон',
        });
    });
});
