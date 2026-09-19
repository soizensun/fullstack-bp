import assert from 'node:assert/strict';
import { After, Before, Given, Then, When, setWorldConstructor, World } from '@cucumber/cucumber';
import type { Server } from 'node:http';
import request from 'supertest';
import { type AppHarness, startApp } from '../support/app-harness';

/**
 * BE_13 R1 — every `@api` scenario is driven over HTTP against the running application.
 *   Nothing here calls a use case, a repository or a service directly.
 * BE_13 R2 — every HTTP detail is in this file. The feature file has no route, no
 *   payload, no header and no status code.
 * BE_13 R5 — state passes between steps through this per-scenario world, never through
 *   a module-level variable two scenarios could share.
 */
class TodoWorld extends World {
  harness?: AppHarness;
  listId?: string;
  lastStatus?: number;
  lastBody?: Record<string, unknown>;

  get server(): Server {
    if (this.harness === undefined) {
      throw new Error('The application was not started for this scenario.');
    }
    return this.harness.server;
  }

  get list(): string {
    if (this.listId === undefined) {
      throw new Error('This scenario has no list yet.');
    }
    return this.listId;
  }

  /** BE_13 R3 — given-state is established through the API, because endpoints exist. */
  async itemIdFor(title: string): Promise<string> {
    const { body } = await request(this.server)
      .get(`/v1/todo-lists/${this.list}/items`)
      .query({ pageSize: 200 })
      .expect(200);

    const match = body.items.find(
      (item: { title: string }) => item.title.toLowerCase() === title.toLowerCase(),
    );
    if (match === undefined) {
      throw new Error(`No item called "${title}" on this list.`);
    }
    return match.id;
  }
}

setWorldConstructor(TodoWorld);

// BE_13 R6/R9 — each scenario gets its own application and its own data directory, so
// nothing is left behind for the next one.
Before(async function (this: TodoWorld) {
  this.harness = await startApp();
});

After(async function (this: TodoWorld) {
  await this.harness?.close();
});

Given('I have a list called {string}', async function (this: TodoWorld, title: string) {
  const { body } = await request(this.server)
    .post('/v1/todo-lists')
    .send({ title })
    .expect(201);

  this.listId = body.id;
});

Given('that list contains {string}', async function (this: TodoWorld, title: string) {
  await request(this.server)
    .post(`/v1/todo-lists/${this.list}/items`)
    .send({ title })
    .expect(201);
});

Given('I have ticked off {string}', async function (this: TodoWorld, title: string) {
  const itemId = await this.itemIdFor(title);
  await request(this.server)
    .post(`/v1/todo-lists/${this.list}/items/${itemId}/complete`)
    .expect(204);
});

Given('I have archived that list', async function (this: TodoWorld) {
  await request(this.server).post(`/v1/todo-lists/${this.list}/archive`).expect(204);
});

When('I add {string} to that list', async function (this: TodoWorld, title: string) {
  await request(this.server)
    .post(`/v1/todo-lists/${this.list}/items`)
    .send({ title })
    .expect(201);
});

// A separate phrase from "I add", because this one expects to be refused (GEN_10 R6:
// reuse wording exactly, so a different meaning gets a different phrase).
When('I try to add {string} to that list', async function (this: TodoWorld, title: string) {
  const response = await request(this.server)
    .post(`/v1/todo-lists/${this.list}/items`)
    .send({ title });

  this.lastStatus = response.status;
  this.lastBody = response.body;
});

When('I tick off {string}', async function (this: TodoWorld, title: string) {
  const itemId = await this.itemIdFor(title);
  await request(this.server)
    .post(`/v1/todo-lists/${this.list}/items/${itemId}/complete`)
    .expect(204);
});

When('I put {string} back on the list', async function (this: TodoWorld, title: string) {
  const itemId = await this.itemIdFor(title);
  await request(this.server)
    .post(`/v1/todo-lists/${this.list}/items/${itemId}/reopen`)
    .expect(204);
});

/**
 * BE_13 R7/R8 — the assertions below read the product outcome back through the API.
 * Nothing inspects the data directory, because the API can already report all of it.
 */
Then(
  'the list shows {int} thing(s) left to do',
  async function (this: TodoWorld, expected: number) {
    const { body } = await request(this.server)
      .get(`/v1/todo-lists/${this.list}`)
      .expect(200);

    assert.equal(body.openItemCount, expected);
  },
);

Then('{string} is still to do', async function (this: TodoWorld, title: string) {
  await assertStatusOf(this, title, 'open');
});

Then('{string} is done', async function (this: TodoWorld, title: string) {
  await assertStatusOf(this, title, 'completed');
});

Then(
  'I am told that the list already has something with that name',
  function (this: TodoWorld) {
    // GEN_08 R5 — asserted on the stable code, never on the message text.
    assert.equal(this.lastStatus, 409);
    assert.equal(this.lastBody?.code, 'TODO_ITEM_TITLE_DUPLICATE');
  },
);

Then('I am told the list is archived and cannot be changed', function (this: TodoWorld) {
  assert.equal(this.lastStatus, 409);
  assert.equal(this.lastBody?.code, 'TODO_LIST_ARCHIVED_NOT_MODIFIABLE');
});

async function assertStatusOf(world: TodoWorld, title: string, expected: string): Promise<void> {
  const { body } = await request(world.server)
    .get(`/v1/todo-lists/${world.list}`)
    .expect(200);

  const item = body.items.find(
    (candidate: { title: string }) => candidate.title.toLowerCase() === title.toLowerCase(),
  );
  assert.ok(item !== undefined, `No item called "${title}" on this list.`);
  assert.equal(item.status, expected);
}
