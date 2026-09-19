import { z } from 'zod';

/**
 * The shape of every environment variable this application reads.
 *
 * BE_10 R2 — the whole environment is parsed against this schema at boot.
 * BE_10 R5 — nothing here defaults a secret, and no default weakens production.
 * BE_10 R9 — a new entry here ships with its `.env.example` line in the same change.
 */
export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),

  /** Directory the file-backed store writes to. Relative paths resolve from the app root. */
  TODO_DATA_DIR: z.string().min(1).default('.data'),

  TODO_DEFAULT_PAGE_SIZE: z.coerce.number().int().min(1).max(200).default(20),

  TODO_MAX_PAGE_SIZE: z.coerce.number().int().min(1).max(200).default(100),
});

export type Environment = z.infer<typeof environmentSchema>;
