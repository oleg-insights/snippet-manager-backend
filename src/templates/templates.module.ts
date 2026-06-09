import { Module } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
    imports: [NotificationsModule],
    controllers: [TemplatesController],
    providers: [TemplatesService],
})
export class TemplatesModule {}
