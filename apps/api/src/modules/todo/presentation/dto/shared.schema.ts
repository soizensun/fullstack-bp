import { z } from 'zod';

/**
 * Schema fragments shared by the operation DTOs below.
 *
 * BE_07 R5 wants the same pagination parameters and the same page shape on every
 * collection route; BE_08 R10 wants one DTO per operation and no DTO reused across
 * two. Both hold if the *schema* is shared and each operation still declares its own
 * DTO from it — which is what these fragments are for.
 */

export const uuidSchema = z.uuid();

/** BE_07 R6 — filtering and sorting come from a closed set, declared once. */
export const sortDirectionSchema = z.enum(['asc', 'desc']).default('desc');

export const paginationQueryShape = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
} as const;

export function pageSchemaOf<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });
}
