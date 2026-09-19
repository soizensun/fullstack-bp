import { Injectable } from '@nestjs/common';
import { Clock } from '../application/clock.port';

/** BE_02 R6 — the outward end of {@link Clock}. */
@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
