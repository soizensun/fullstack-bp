import { z } from 'zod';

/**
 * FE_11 R7 — search params are a declared contract, parsed in one place per route.
 *
 * They are strings from an untrusted source: a typed URL reaches this code as easily as a
 * link does. Declaring names, types, allowed values and defaults here means the page reads
 * typed values, an unknown param is ignored rather than propagated, and the default state
 * has one canonical URL rather than three.
 *
 * What belongs in the URL is what should survive a reload, be shareable in a link, or be
 * readable by the server: the filter and the page number. What must not is anything a
 * colleague opening the link should not inherit.
 */
export const todoListsSearchParamsSchema = z.object({
  status: z.enum(['active', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type TodoListsSearchParams = z.infer<typeof todoListsSearchParamsSchema>;

/**
 * A malformed param is not an error page. Someone hand-editing `?page=banana` gets the
 * default view, which is what they would have got before they edited it — the alternative
 * is a route that 500s on a typo.
 */
export function parseTodoListsSearchParams(
  raw: Record<string, string | string[] | undefined>,
) {
  const parsed = todoListsSearchParamsSchema.safeParse(raw);
  return parsed.success ? parsed.data : todoListsSearchParamsSchema.parse({});
}
