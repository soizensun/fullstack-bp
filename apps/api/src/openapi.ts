import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

/**
 * GEN_08 R2 — the OpenAPI document is *generated from* the API app, never hand-written.
 * `cleanupOpenApiDoc` resolves the zod schemas the DTOs declared, so BE_07 R10's "declare
 * every route's types so they reach the specification" holds without a second description
 * of the same shapes.
 *
 * GEN_16 R5 — it is built here rather than in `main.ts`, because two callers need it: the
 * running app serves it at `/openapi.json`, and `scripts/emit-openapi.ts` writes it to
 * disk for the generator. One description, two consumers.
 */
export function buildOpenApiDocument(
  app: INestApplication,
): ReturnType<typeof cleanupOpenApiDoc> {
  return cleanupOpenApiDoc(
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Todo API')
        .setDescription('Reference implementation of the BE conventions.')
        .setVersion('1.0')
        .build(),
    ),
  );
}
