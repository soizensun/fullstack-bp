import { Global, Module } from '@nestjs/common';
import {
  CONFIGURATION,
  type Configuration,
  HttpConfig,
  PaginationConfig,
  StorageConfig,
  loadConfiguration,
} from './configuration';

/**
 * BE_10 R1/R3 — configuration is parsed once at boot and handed out as typed
 * values. Global so a module declares a dependency on a namespace, not on this module.
 */
@Global()
@Module({
  providers: [
    { provide: CONFIGURATION, useFactory: () => loadConfiguration() },
    // BE_10 R7 — parsed once above; each namespace is a projection of that one value.
    { provide: HttpConfig, useFactory: (config: Configuration) => config.http, inject: [CONFIGURATION] },
    { provide: StorageConfig, useFactory: (config: Configuration) => config.storage, inject: [CONFIGURATION] },
    {
      provide: PaginationConfig,
      useFactory: (config: Configuration) => config.pagination,
      inject: [CONFIGURATION],
    },
  ],
  exports: [HttpConfig, StorageConfig, PaginationConfig],
})
export class ConfigModule {}
