import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { IdGenerator } from '../application/id-generator.port';

/** BE_02 R6 — the outward end of {@link IdGenerator}. GEN_11 fixes the version at v7. */
@Injectable()
export class UuidIdGenerator extends IdGenerator {
  next(): string {
    return uuidv7();
  }
}
