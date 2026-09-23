/**
 * GEN_08 R5 — a failure crosses the wire as a stable code from one catalogue. The message
 * beside it is prose for humans and may be reworded freely, which is exactly why nothing
 * may match on it.
 *
 * FE_10 R7 — normalizing here means every call site sees one error shape, and an unknown
 * code falls through to the generic case rather than crashing.
 */

/** The body `CodedErrorFilter` produces for every failure the API answers with. */
interface WireErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly correlationId: string;
    readonly details?: unknown;
  };
}

/**
 * The single error shape this package throws.
 *
 * `correlationId` is on the error rather than only in a log, because FE_10 R5 wants it
 * quotable by the person who hit the failure.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly correlationId: string;
  readonly details?: unknown;

  constructor(init: {
    code: string;
    message: string;
    status: number;
    correlationId: string;
    details?: unknown;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.code = init.code;
    this.status = init.status;
    this.correlationId = init.correlationId;
    this.details = init.details;
  }
}

/**
 * The code used when the API could not be reached, or answered something that is not a
 * coded error body. Callers branch on it like any other code (FE_10 R7) rather than
 * checking whether the failure "looks like" a network problem.
 */
export const API_UNREACHABLE = 'API_UNREACHABLE';

/** GEN_07 R4 — narrowed, never asserted: the body is whatever the server sent. */
function isWireErrorBody(value: unknown): value is WireErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value))
    return false;

  const { error } = value as { error: unknown };
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

/**
 * Turns any failed response into an {@link ApiError}.
 *
 * A response the filter did not produce — a proxy's 502 page, an empty body — still
 * arrives as an `ApiError`, so no caller needs a second failure path.
 */
export async function toApiError(
  response: Response,
  fallbackCorrelationId: string,
): Promise<ApiError> {
  const correlationId =
    response.headers.get('x-correlation-id') ?? fallbackCorrelationId;
  const body: unknown = await response.json().catch(() => undefined);

  if (isWireErrorBody(body)) {
    return new ApiError({
      code: body.error.code,
      message: body.error.message,
      status: response.status,
      correlationId: body.error.correlationId || correlationId,
      details: body.error.details,
    });
  }

  return new ApiError({
    code: `HTTP_${response.status}`,
    message: `The API answered ${response.status} without a coded error body.`,
    status: response.status,
    correlationId,
  });
}
