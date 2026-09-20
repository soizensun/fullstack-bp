import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { CodedError, type ErrorCategory } from '../errors/coded-error';
import { CORRELATION_ID_HEADER, type CorrelatedRequest } from './correlation-id.middleware';

/**
 * BE_09 R4 — the *only* place a category becomes an HTTP status. Adding an error class
 * therefore never means editing this map; adding a category is a deliberate change.
 */
const STATUS_BY_CATEGORY: Readonly<Record<ErrorCategory, HttpStatus>> = {
  validation: HttpStatus.BAD_REQUEST,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  forbidden: HttpStatus.FORBIDDEN,
};

/** BE_09 R8 — the one response shape every client parses once. */
interface ErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly correlationId: string;
    readonly details?: unknown;
  };
}

/**
 * BE_09 R8 — errors become responses here and nowhere else, which is what lets
 * BE_09 R5 hold: nothing below the controller ever constructs an HTTP exception.
 */
@Catch()
export class CodedErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(CodedErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const correlationId =
      context.getRequest<CorrelatedRequest>().correlationId ??
      (response.getHeader(CORRELATION_ID_HEADER) as string | undefined) ??
      'unknown';

    const { status, body } = this.translate(exception, correlationId);
    response.status(status).json(body);
  }

  private translate(
    exception: unknown,
    correlationId: string,
  ): { status: HttpStatus; body: ErrorBody } {
    // GEN_08 R5 — a stable code crosses the wire; the message is for humans and may
    // be reworded freely, which is why nothing is allowed to match on it.
    if (exception instanceof CodedError) {
      return {
        status: STATUS_BY_CATEGORY[exception.category],
        body: { error: { code: exception.code, message: exception.message, correlationId } },
      };
    }

    if (exception instanceof ZodValidationException) {
      // `getZodError()` is typed `unknown`, so it is narrowed rather than asserted
      // (GEN_07 R4 — no type assertion the compiler cannot check).
      const zodError = exception.getZodError();

      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          error: {
            code: 'REQUEST_INVALID',
            message: 'The request did not match the expected shape.',
            correlationId,
            ...(zodError instanceof ZodError ? { details: zodError.issues } : {}),
          },
        },
      };
    }

    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        body: {
          error: { code: httpCodeOf(exception.getStatus()), message: exception.message, correlationId },
        },
      };
    }

    // BE_09 R9 — an unexpected failure is logged in full and answered with a generic
    // body. Nothing internal — no stack, no driver message — reaches the caller.
    this.logger.error(
      `Unhandled exception [${correlationId}]`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong. Quote the correlation id when reporting this.',
          correlationId,
        },
      },
    };
  }
}

function httpCodeOf(status: number): string {
  return status === HttpStatus.NOT_FOUND ? 'NOT_FOUND' : `HTTP_${status}`;
}
