import { http, HttpResponse } from 'msw';

/**
 * FE_14 R4 — the mocking boundary. The network is genuinely outside the thing under test,
 * so it is the honest seam: the client, the correlation-id middleware, the error
 * normalization and the mapping to view models all stay real, which is nearly all of what
 * can break.
 *
 * A mocked *component* would be inside the thing under test — asserting that the parent
 * talks to a fake correctly, which is true no matter how broken the real child is.
 */

export const API_BASE_URL = 'http://localhost:3000';

/** BE_09 R8's response shape, so a test exercises the real normalization path. */
export function codedError(
  status: number,
  code: string,
  message: string,
  correlationId = 'test-correlation-id',
) {
  return HttpResponse.json(
    { error: { code, message, correlationId } },
    { status },
  );
}

/**
 * The default handlers. A test that needs a different answer overrides just that endpoint
 * with `server.use(...)`, so each test states only what it is about.
 */
export const handlers = [
  http.get(`${API_BASE_URL}/v1/todo-lists`, () =>
    HttpResponse.json({
      items: [
        {
          id: '0199c2a0-0000-7000-8000-000000000001',
          title: 'Trip to Kyoto',
          status: 'active',
          itemCount: 2,
          openItemCount: 1,
          createdAt: '2026-09-01T08:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    }),
  ),

  http.post(
    `${API_BASE_URL}/v1/todo-lists/:listId/items/:itemId/complete`,
    () => new HttpResponse(null, { status: 204 }),
  ),

  http.post(
    `${API_BASE_URL}/v1/todo-lists/:listId/items/:itemId/reopen`,
    () => new HttpResponse(null, { status: 204 }),
  ),

  http.delete(
    `${API_BASE_URL}/v1/todo-lists/:listId/items/:itemId`,
    () => new HttpResponse(null, { status: 204 }),
  ),
];
