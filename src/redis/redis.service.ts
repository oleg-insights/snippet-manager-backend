import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);

    constructor(configService: ConfigService) {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (redisUrl) {
            super(redisUrl);
        } else {
            super({ host: 'localhost', port: 6379, family: 4 });
        }
    }

    onModuleInit() {
        this.on('connect', () => this.logger.log('Соединение установлено'));

        this.on('error', (err) => {
            if (err instanceof AggregateError) {
                const messages = err.errors.map((e) => e.message);
                this.logger.error('[Redis]:', messages);
            } else {
                this.logger.error('[Redis]:', err.message || err.toString());
            }
        });
    }

    onModuleDestroy() {
        this.disconnect();
    }
}
