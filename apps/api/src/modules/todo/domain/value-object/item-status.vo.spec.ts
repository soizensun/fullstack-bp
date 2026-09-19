import { TodoItemAlreadyCompletedError, TodoItemNotCompletedError } from '../todo.errors';
import { ItemStatus } from './item-status.vo';
import { describe, it, expect } from '@jest/globals';

/** BE_04 R6 — the declared transitions are the thing under test. */
describe('ItemStatus', () => {
  it('moves an open item to completed', () => {
    expect(ItemStatus.open().complete().isCompleted).toBe(true);
  });

  it('moves a completed item back to open', () => {
    expect(ItemStatus.completed().reopen().isCompleted).toBe(false);
  });

  it('refuses to complete an item that is already completed', () => {
    expect(() => ItemStatus.completed().complete()).toThrow(TodoItemAlreadyCompletedError);
  });

  it('refuses to reopen an item that was never completed', () => {
    expect(() => ItemStatus.open().reopen()).toThrow(TodoItemNotCompletedError);
  });

  it('returns a new value rather than mutating the original', () => {
    // BE_04 R5 — a value object is replaced, never mutated.
    const open = ItemStatus.open();

    open.complete();

    expect(open.isCompleted).toBe(false);
  });
});
