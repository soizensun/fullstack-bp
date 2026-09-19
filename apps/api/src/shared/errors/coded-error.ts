/**
 * BE_09 R1 — every deliberate failure is a domain error, an application error, or an
 * infrastructure failure. The first two are modelled here; the third is whatever the
 * runtime throws and is never wrapped into a code.
 *
 * BE_09 R2 — each carries a stable code and a category. BE_09 R4 maps the *category*
 * to an HTTP status in one place, so adding an error never means touching the filter.
 */

export type ErrorCategory = 'validation' | 'not-found' | 'conflict' | 'forbidden';

export abstract class CodedError extends Error {
  /** BE_09 R3 — from the catalogue, never renamed once shipped, never matched on by message. */
  abstract readonly code: string;

  abstract readonly category: ErrorCategory;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown by the domain when a business invariant refuses an operation (BE_04 R7). */
export abstract class DomainError extends CodedError {}

/** Thrown by a use case for a workflow failure — absence, duplication, wrong state (BE_05 R6). */
export abstract class ApplicationError extends CodedError {}
