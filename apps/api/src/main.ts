import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

import { AppModule } from './app.module';
import { HttpConfig } from './config/configuration';
import { buildOpenApiDocument } from './openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const document = buildOpenApiDocument(app);

  SwaggerModule.setup('openapi', app, document, {
    jsonDocumentUrl: 'openapi.json',
  });
  app.use('/reference', apiReference({ content: document }));

  await app.listen(app.get(HttpConfig).port);
}

void bootstrap();
