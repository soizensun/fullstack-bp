import { mkdtemp, rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '@app/app.module';

/**
 * Boots the application wired exactly as it ships.
 *
 * BE_13 R9 — nothing is substituted here. The only thing the harness changes is where
 * the store writes, because a test must not share a data directory with a developer's
 * running application.
 */
export interface AppHarness {
  readonly app: INestApplication<Server>;
  /**
   * The HTTP server, typed. `INestApplication` defaults its server to `any`, so naming
   * the type here is what keeps `any` out of every test that calls it (GEN_07 R4).
   */
  readonly server: Server;
  close(): Promise<void>;
}

export async function startApp(): Promise<AppHarness> {
  const dataDir = await mkdtemp(join(tmpdir(), 'todo-e2e-'));
  process.env.TODO_DATA_DIR = dataDir;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<Server>>();
  await app.init();

  return {
    app,
    server: app.getHttpServer(),
    async close() {
      await app.close();
      await rm(dataDir, { recursive: true, force: true });
    },
  };
}
