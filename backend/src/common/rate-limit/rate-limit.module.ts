import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 秒
        limit: 3, // 最多 3 次请求
      },
      {
        name: 'medium',
        ttl: 10000, // 10 秒
        limit: 20, // 最多 20 次请求
      },
      {
        name: 'long',
        ttl: 60000, // 1 分钟
        limit: 100, // 最多 100 次请求
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class RateLimitModule {}
