import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';

import { LinksModule } from './links/links.module';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { ConfigModule } from './config/config.module';
import { TodoModule } from './modules/todo';
import { SharedModule } from './shared/shared.module';
import { CodedErrorFilter } from './shared/presentation/coded-error.filter';
import { CorrelationIdMiddleware } from './shared/presentation/correlation-id.middleware';

@Module({
  imports: [ConfigModule, SharedModule, TodoModule, LinksModule],
  controllers: [AppController],
  providers: [
    AppService,
    // BE_08 R2 — every value entering from outside is validated at the boundary, so a
    // use case can assume its input already matched a schema.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // BE_09 R8 — errors become responses in one filter and nowhere else.
    { provide: APP_FILTER, useClass: CodedErrorFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
