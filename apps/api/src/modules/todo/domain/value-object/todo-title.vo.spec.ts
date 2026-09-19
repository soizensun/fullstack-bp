import { TodoTitleEmptyError, TodoTitleTooLongError } from '../todo.errors';
import { TodoTitle } from './todo-title.vo';
import { describe, it, expect } from '@jest/globals';

describe('TodoTitle', () => {
  it('collapses surrounding and repeated whitespace', () => {
    // BE_08 R8 — normalizing once here is what lets everything downstream assume the
    // value is already clean.
    expect(TodoTitle.of('  Book   flights  ').toString()).toBe('Book flights');
  });

  it('refuses a title that is only whitespace', () => {
    expect(() => TodoTitle.of('   ')).toThrow(TodoTitleEmptyError);
  });

  it('refuses a title longer than the limit', () => {
    expect(() => TodoTitle.of('x'.repeat(TodoTitle.MAX_LENGTH + 1))).toThrow(TodoTitleTooLongError);
  });

  it('accepts a title exactly at the limit', () => {
    expect(TodoTitle.of('x'.repeat(TodoTitle.MAX_LENGTH)).toString()).toHaveLength(
      TodoTitle.MAX_LENGTH,
    );
  });

  it('treats titles differing only by case as the same title', () => {
    expect(TodoTitle.of('Book Flights').matches(TodoTitle.of('book flights'))).toBe(true);
  });

  it('distinguishes titles that differ by more than case', () => {
    expect(TodoTitle.of('Book flights').matches(TodoTitle.of('Book trains'))).toBe(false);
  });
});
