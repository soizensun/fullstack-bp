/**
 * BE_02 R6 — identifier generation is inverted the same way the clock is.
 *
 * BE_04 R9 keeps *store-assigned* ids out of the domain; an id minted here before the
 * aggregate exists is not store-assigned, which is what lets the domain own its identity.
 */
export abstract class IdGenerator {
  /** A fresh UUIDv7 — time-ordered, per GEN_11. */
  abstract next(): string;
}
