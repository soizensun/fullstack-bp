import type { Server } from 'node:http';
import request from 'supertest';
import { type AppHarness, startApp } from './support/app-harness';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

/**
 * The contract as a caller sees it.
 *
 * BE_07 R2 — the status codes asserted here are the ones the convention's table fixes,
 * so a route that starts answering `200` with an error inside fails the build.
 * GEN_08 R5 — failures are asserted on their stable `code`, never on message text.
 */
describe('Todo lists (e2e)', () => {
  let harness: AppHarness;
  let server: Server;

  beforeAll(async () => {
    harness = await startApp();
    server = harness.server;
  });

  afterAll(async () => {
    await harness.close();
  });

  async function createList(title: string): Promise<string> {
    const response = await request(server)
      .post('/v1/todo-lists')
      .send({ title })
      .expect(201);
    return response.body.id;
  }

  async function addItem(listId: string, title: string): Promise<string> {
    const response = await request(server)
      .post(`/v1/todo-lists/${listId}/items`)
      .send({ title })
      .expect(201);
    return response.body.id;
  }

  it('creates a list and reads it back with its items', async () => {
    const listId = await createList('Trip to Kyoto');
    await addItem(listId, 'Book flights');

    const { body } = await request(server)
      .get(`/v1/todo-lists/${listId}`)
      .expect(200);

    expect(body.title).toBe('Trip to Kyoto');
    expect(body.status).toBe('active');
    expect(body.itemCount).toBe(1);
    expect(body.openItemCount).toBe(1);
    expect(body.items[0].title).toBe('Book flights');
  });

  it('returns 404 with a stable code for a list that does not exist', async () => {
    const { body } = await request(server)
      .get('/v1/todo-lists/0199a000-0000-7000-8000-00000000dead')
      .expect(404);

    expect(body.code).toBe('TODO_LIST_NOT_FOUND');
  });

  it('returns 400 when an identifier is not a uuid', async () => {
    const { body } = await request(server)
      .get('/v1/todo-lists/not-a-uuid')
      .expect(400);

    expect(body.code).toBe('REQUEST_INVALID');
  });

  it('answers every error with a correlation id the caller can quote', async () => {
    // GEN_08 R6 — the id the caller sent comes back on the response.
    const response = await request(server)
      .get('/v1/todo-lists/0199a000-0000-7000-8000-00000000beef')
      .set('x-correlation-id', 'trace-me-123')
      .expect(404);

    expect(response.headers['x-correlation-id']).toBe('trace-me-123');
    expect(response.body.correlationId).toBe('trace-me-123');
  });

  it('completes an item and refuses to complete it twice', async () => {
    const listId = await createList('Chores');
    const itemId = await addItem(listId, 'Wash up');

    await request(server)
      .post(`/v1/todo-lists/${listId}/items/${itemId}/complete`)
      .expect(204);

    const { body } = await request(server)
      .post(`/v1/todo-lists/${listId}/items/${itemId}/complete`)
      .expect(409);

    expect(body.code).toBe('TODO_ITEM_ALREADY_COMPLETED');
  });

  it('replays a create with the same idempotency key instead of duplicating', async () => {
    const first = await request(server)
      .post('/v1/todo-lists')
      .set('idempotency-key', 'e2e-key-1')
      .send({ title: 'Reading list' })
      .expect(201);

    const replay = await request(server)
      .post('/v1/todo-lists')
      .set('idempotency-key', 'e2e-key-1')
      .send({ title: 'Reading list' })
      .expect(201);

    expect(replay.body.id).toBe(first.body.id);
  });

  it('refuses a second list with a title already in use', async () => {
    await createList('Unique name');

    const { body } = await request(server)
      .post('/v1/todo-lists')
      .send({ title: 'unique NAME' })
      .expect(409);

    expect(body.code).toBe('TODO_LIST_TITLE_DUPLICATE');
  });

  it('refuses to change an archived list', async () => {
    const listId = await createList('Finished project');

    await request(server).post(`/v1/todo-lists/${listId}/archive`).expect(204);

    const { body } = await request(server)
      .post(`/v1/todo-lists/${listId}/items`)
      .send({ title: 'Too late' })
      .expect(409);

    expect(body.code).toBe('TODO_LIST_ARCHIVED_NOT_MODIFIABLE');
  });

  it('completes many items in one request and reports what changed', async () => {
    const listId = await createList('Bulk work');
    const first = await addItem(listId, 'One');
    const second = await addItem(listId, 'Two');
    await request(server)
      .post(`/v1/todo-lists/${listId}/items/${first}/complete`)
      .expect(204);

    const { body } = await request(server)
      .post(`/v1/todo-lists/${listId}/items/complete`)
      .send({ itemIds: [first, second] })
      .expect(200);

    expect(body.completedIds).toEqual([second]);
  });

  it('pages and filters a collection', async () => {
    const listId = await createList('Filtering');
    const done = await addItem(listId, 'Done one');
    await addItem(listId, 'Still open');
    await request(server)
      .post(`/v1/todo-lists/${listId}/items/${done}/complete`)
      .expect(204);

    const { body } = await request(server)
      .get(`/v1/todo-lists/${listId}/items`)
      .query({ status: 'open', page: 1, pageSize: 10 })
      .expect(200);

    expect(body.total).toBe(1);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toBe('Still open');
  });

  it('rejects a sort value outside the declared set', async () => {
    const listId = await createList('Closed set');

    // BE_07 R6 — filtering and sorting accept only declared parameters.
    await request(server)
      .get(`/v1/todo-lists/${listId}/items`)
      .query({ sort: 'whatever' })
      .expect(400);
  });

  it('records activity for the changes it made', async () => {
    const listId = await createList('Watched list');
    await addItem(listId, 'Something');

    const { body } = await request(server)
      .get(`/v1/todo-lists/${listId}/activity`)
      .expect(200);

    const actions = body.items.map((entry: { action: string }) => entry.action);
    expect(actions).toContain('todo-list.created');
    expect(actions).toContain('todo-item.added');
  });
});
