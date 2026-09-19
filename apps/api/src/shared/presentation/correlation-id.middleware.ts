import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { v7 as uuidv7 } from 'uuid';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/** Where the id is parked for the rest of the request. */
export interface CorrelatedRequest extends Request {
  correlationId?: string;
}

/**
 * GEN_08 R6 — the API accepts a correlation id from the caller, carries it through the
 * request, and returns it on the response so a user can quote it. When the caller sends
 * none we mint one rather than leaving the trace to start nowhere.
 *
 * BE_02 R9 — a framework lifecycle piece, so it lives in `shared/presentation/`.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: CorrelatedRequest, response: Response, next: NextFunction): void {
    const incoming = request.header(CORRELATION_ID_HEADER);
    const correlationId = incoming !== undefined && incoming.trim() !== '' ? incoming : uuidv7();

    request.correlationId = correlationId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);
    next();
  }
}
