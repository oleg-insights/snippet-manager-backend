import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);

    constructor() {
        const redisUrl = process.env.REDIS_URL;

        if (redisUrl) {
            super(redisUrl);
        } else {
            super({ host: 'localhost', port: 6379, family: 4 });
        }
    }

    onModuleInit() {
        this.on('connect', () => this.logger.log('[Redis]:', 'Соединение установлено'));

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
