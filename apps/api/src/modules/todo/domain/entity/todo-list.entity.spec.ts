import { aListId, aTitle, aTodoList, anItemId } from '@test/support/todo.builders';
import {
  ArchivedTodoListNotModifiableError,
  DuplicateTodoItemTitleError,
  TodoItemAlreadyCompletedError,
  TodoItemNotInListError,
  TodoListAlreadyArchivedError,
} from '../todo.errors';
import { TodoList } from './todo-list.entity';
import { describe, it, expect } from '@jest/globals';

/**
 * BE_11 R1 — the aggregate is where the rules live, so this is where the tests are.
 * BE_11 R2 — each name reads as actor, action, observable outcome, in business words.
 * BE_11 R4 — every assertion goes through the public surface, via `snapshot()`.
 */
describe('TodoList', () => {
  describe('adding an item', () => {
    it('puts the item in the list as open', () => {
      const list = TodoList.create(aListId(), aTitle('Trip'));

      list.addItem(anItemId(), aTitle('Book flights'), null);

      const { items } = list.snapshot();
      expect(items).toHaveLength(1);
      expect(items[0]?.title).toBe('Book flights');
      expect(items[0]?.status).toBe('open');
    });

    it('refuses a title another item in the same list already uses', () => {
      const list = aTodoList({ items: ['Book flights'] });

      // BE_11 R3 — one behaviour per test; the case differs to prove the comparison
      // is the user's idea of "the same title", not a byte comparison.
      expect(() => list.addItem(anItemId(), aTitle('book FLIGHTS'), null)).toThrow(
        DuplicateTodoItemTitleError,
      );
    });

    it('allows the same title in a different list', () => {
      const other = aTodoList({ title: 'Other', items: ['Book flights'] });
      const list = aTodoList({ title: 'Trip' });

      list.addItem(anItemId(), aTitle('Book flights'), null);

      expect(list.snapshot().items).toHaveLength(1);
      expect(other.snapshot().items).toHaveLength(1);
    });
  });

  describe('completing an item', () => {
    it('marks the item completed', () => {
      const list = TodoList.create(aListId(), aTitle('Trip'));
      const itemId = anItemId();
      list.addItem(itemId, aTitle('Pack'), null);

      list.completeItem(itemId);

      expect(list.snapshot().items[0]?.status).toBe('completed');
    });

    it('refuses to complete an item that is already completed', () => {
      const list = TodoList.create(aListId(), aTitle('Trip'));
      const itemId = anItemId();
      list.addItem(itemId, aTitle('Pack'), null);
      list.completeItem(itemId);

      expect(() => list.completeItem(itemId)).toThrow(TodoItemAlreadyCompletedError);
    });

    it('refuses an item that belongs to no list', () => {
      const list = aTodoList({ items: ['Pack'] });

      expect(() => list.completeItem(anItemId(9_999))).toThrow(TodoItemNotInListError);
    });
  });

  describe('completing many items', () => {
    it('reports only the items that changed', () => {
      const list = TodoList.create(aListId(), aTitle('Trip'));
      const first = anItemId();
      const second = anItemId();
      list.addItem(first, aTitle('Pack'), null);
      list.addItem(second, aTitle('Book'), null);
      list.completeItem(first);

      // The already-completed item is skipped rather than refused, which is what
      // makes a retried bulk request safe.
      const completed = list.completeItems([first, second]);

      expect(completed.map((id) => id.toString())).toEqual([second.toString()]);
      expect(list.snapshot().items.every((item) => item.status === 'completed')).toBe(true);
    });
  });

  describe('archiving', () => {
    it('refuses to archive a list that is already archived', () => {
      const list = aTodoList({ archived: true });

      expect(() => list.archive()).toThrow(TodoListAlreadyArchivedError);
    });

    it('refuses every change once the list is archived', () => {
      const list = aTodoList({ items: ['Pack'], archived: true });

      expect(() => list.addItem(anItemId(), aTitle('Book'), null)).toThrow(
        ArchivedTodoListNotModifiableError,
      );
      expect(() => list.rename(aTitle('New name'))).toThrow(ArchivedTodoListNotModifiableError);
    });
  });

  describe('renaming an item', () => {
    it('allows an item to keep its own title', () => {
      const list = TodoList.create(aListId(), aTitle('Trip'));
      const itemId = anItemId();
      list.addItem(itemId, aTitle('Pack'), null);

      list.renameItem(itemId, aTitle('Pack'));

      expect(list.snapshot().items[0]?.title).toBe('Pack');
    });

    it('refuses a title another item already uses', () => {
      const list = TodoList.create(aListId(), aTitle('Trip'));
      const first = anItemId();
      list.addItem(first, aTitle('Pack'), null);
      list.addItem(anItemId(), aTitle('Book'), null);

      expect(() => list.renameItem(first, aTitle('Book'))).toThrow(DuplicateTodoItemTitleError);
    });
  });
});
