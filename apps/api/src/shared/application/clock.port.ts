/**
 * BE_02 R6 — reading the current time is an outward dependency, so the layer that
 * needs it declares the contract and infrastructure implements it. An abstract class
 * rather than an interface because it must survive as a runtime injection token.
 *
 * BE_11 R8 — this is what lets every test pin time instead of sleeping.
 */
export abstract class Clock {
  /** The current instant, always UTC (GEN_11). */
  abstract now(): Date;
}
