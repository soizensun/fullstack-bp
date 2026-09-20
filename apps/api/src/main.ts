import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { cleanupOpenApiDoc } from 'nestjs-zod';

import { AppModule } from './app.module';
import { HttpConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  /**
   * GEN_08 R2 — the OpenAPI document is *generated from* the API app, never
   * hand-written. `cleanupOpenApiDoc` resolves the zod schemas the DTOs declared, so
   * BE_07 R10's "declare every route's types so they reach the specification" holds
   * without a second description of the same shapes.
   */
  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Todo API')
        .setDescription('Reference implementation of the BE conventions.')
        .setVersion('1.0')
        .build(),
    ),
  );

  SwaggerModule.setup('openapi', app, document, { jsonDocumentUrl: 'openapi.json' });
  app.use('/reference', apiReference({ content: document }));

  await app.listen(app.get(HttpConfig).port);
}

void bootstrap();
