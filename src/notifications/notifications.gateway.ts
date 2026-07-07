import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationsGateway {
    @WebSocketServer() server: Server;

    newTemplateNotification(body: { title: string; authorId: string }): void {
        this.server.emit('receive_publish', {
            title: 'Опубликован новый шаблон',
            text: body.title,
            authorId: body.authorId,
        });
    }
}
