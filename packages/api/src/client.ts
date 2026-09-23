import createClient, { type Client, type Middleware } from 'openapi-fetch';
import { v7 as uuidv7 } from 'uuid';
import { API_UNREACHABLE, ApiError, toApiError } from './api-error';
import type { paths } from './generated/schema';

/**
 * GEN_08 R6 — the header the API app accepts, propagates and returns. Named once here so
 * no caller spells it differently.
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

export interface ApiClientConfig {
  /** Where the API app is reachable. INFRA_07 R6 — it differs per environment, so it is configuration. */
  readonly baseUrl: string;
  /**
   * Supplies the correlation id for one request.
   *
   * FE_10's open questions note that nothing yet says how a server render and a later
   * client call share one id per user action. Until that is settled, a caller that holds
   * an id passes a function returning it; the default mints a fresh one so the trace is
   * never missing entirely.
   */
  readonly correlationId?: () => string;
}

export type ApiClient = Client<paths>;

/**
 * FE_10 R1 — the one way this repository talks to the backend.
 * FE_10 R4 — constructed once per runtime from configuration. A component never calls this.
 * FE_10 R5 — the correlation id is set here, so no call site can forget it.
 * FE_10 R7 — a failure leaves this function as an `ApiError` carrying a code, never as a
 * status a caller has to interpret.
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  const nextCorrelationId = config.correlationId ?? uuidv7;
  const client = createClient<paths>({ baseUrl: config.baseUrl });

  const correlate: Middleware = {
    onRequest({ request }) {
      if (!request.headers.has(CORRELATION_ID_HEADER)) {
        request.headers.set(CORRELATION_ID_HEADER, nextCorrelationId());
      }
      return request;
    },
    async onResponse({ request, response }) {
      if (response.ok) return response;
      throw await toApiError(
        response,
        request.headers.get(CORRELATION_ID_HEADER) ?? 'unknown',
      );
    },
    onError({ error }) {
      // The request never reached the API. It still leaves here as one shape (FE_10 R7).
      if (error instanceof ApiError) return error;
      return new ApiError({
        code: API_UNREACHABLE,
        message: 'The API could not be reached.',
        status: 0,
        correlationId: 'unknown',
      });
    },
  };

  client.use(correlate);
  return client;
}

/**
 * Narrows a result to its body.
 *
 * The middleware above throws on every response that is not ok, so a successful result
 * always carries `data`. `openapi-fetch`'s signature cannot know that — it describes a
 * client without the middleware — so the type stays optional and every caller would
 * otherwise reach for a non-null assertion, which GEN_07 R4 forbids.
 *
 * This is the check instead of the assertion: one runtime guard, in one place, that turns
 * the impossible case into an `ApiError` like any other rather than into `undefined`
 * rendered as a blank cell.
 */
export function unwrap<T>(result: { data?: T }): T {
  if (result.data === undefined) {
    throw new ApiError({
      code: API_UNREACHABLE,
      message: 'The API answered successfully with no body.',
      status: 0,
      correlationId: 'unknown',
    });
  }
  return result.data;
}
