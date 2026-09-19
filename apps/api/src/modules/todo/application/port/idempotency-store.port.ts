/**
 * BE_07 R8 — a creating POST is made idempotent through a client-supplied key. The
 * key maps to the id that was created, plus a fingerprint of the request so a replay
 * with a *different* body can be refused rather than silently answered with the wrong
 * resource.
 *
 * BE_02 R6 — declared here because the use case needs it; implemented further out.
 */
export interface IdempotentResult {
  readonly resourceId: string;
  readonly fingerprint: string;
}

export abstract class IdempotencyStore {
  abstract find(key: string): Promise<IdempotentResult | null>;

  abstract remember(key: string, result: IdempotentResult): Promise<void>;
}
