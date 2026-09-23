import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import {
  ApiError,
  CORRELATION_ID_HEADER,
  createApiClient,
  unwrap,
} from '@repo/api';
import { API_BASE_URL, codedError } from '@/lib/test/msw/handlers';
import { server } from '@/lib/test/msw/server';

/**
 * FE_14 R4 — mocked at the network and nowhere else, so the generated client, its
 * middleware and its error normalization are all real. This is the test that would notice
 * the correlation id quietly stopping — the failure FE_10 R5 exists to prevent, and the
 * one nothing else in the pipeline catches.
 */
describe('the API client', () => {
  it('sends a correlation id on every request, without the call site asking', () => {
    const client = createApiClient({ baseUrl: API_BASE_URL });

    return new Promise<void>((resolve, reject) => {
      server.use(
        http.get(`${API_BASE_URL}/v1/todo-lists`, ({ request }) => {
          try {
            expect(request.headers.get(CORRELATION_ID_HEADER)).toMatch(
              /^[0-9a-f-]{36}$/,
            );
            resolve();
          } catch (error) {
            reject(error);
          }
          return HttpResponse.json({
            items: [],
            total: 0,
            page: 1,
            pageSize: 20,
          });
        }),
      );

      void client.GET('/v1/todo-lists', { params: { query: {} } });
    });
  });

  it('uses the correlation id a caller supplies, so one user action keeps one id', () => {
    const client = createApiClient({
      baseUrl: API_BASE_URL,
      correlationId: () => 'a-known-id',
    });

    return new Promise<void>((resolve, reject) => {
      server.use(
        http.get(`${API_BASE_URL}/v1/todo-lists`, ({ request }) => {
          try {
            expect(request.headers.get(CORRELATION_ID_HEADER)).toBe(
              'a-known-id',
            );
            resolve();
          } catch (error) {
            reject(error);
          }
          return HttpResponse.json({
            items: [],
            total: 0,
            page: 1,
            pageSize: 20,
          });
        }),
      );

      void client.GET('/v1/todo-lists', { params: { query: {} } });
    });
  });

  it('turns a coded error body into an ApiError carrying that code', async () => {
    const client = createApiClient({ baseUrl: API_BASE_URL });
    server.use(
      http.post(`${API_BASE_URL}/v1/todo-lists`, () =>
        codedError(
          409,
          'TODO_LIST_TITLE_DUPLICATE',
          'A todo list with that title already exists.',
        ),
      ),
    );

    // FE_10 R7 — a call site branches on `code`. It never sees a status, and it is never
    // offered the message as something to match on.
    await expect(
      client.POST('/v1/todo-lists', { body: { title: 'Trip to Kyoto' } }),
    ).rejects.toMatchObject({
      code: 'TODO_LIST_TITLE_DUPLICATE',
      correlationId: 'test-correlation-id',
    });
  });

  it('still produces an ApiError when the failure did not come from the API', async () => {
    // A proxy's error page, say. Without this, every call site would need a second
    // failure path for the responses the error filter never saw.
    const client = createApiClient({ baseUrl: API_BASE_URL });
    server.use(
      http.get(
        `${API_BASE_URL}/v1/todo-lists`,
        () => new HttpResponse('<html>502</html>', { status: 502 }),
      ),
    );

    await expect(
      client.GET('/v1/todo-lists', { params: { query: {} } }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('unwraps a successful body, so no caller needs a non-null assertion', async () => {
    const client = createApiClient({ baseUrl: API_BASE_URL });
    const result = await client.GET('/v1/todo-lists', {
      params: { query: {} },
    });

    // GEN_07 R4 — this is the check that replaces the assertion.
    expect(unwrap(result).items).toHaveLength(1);
  });
});
