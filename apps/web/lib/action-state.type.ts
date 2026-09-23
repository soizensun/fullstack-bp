/**
 * What a form action hands back to the component that rendered it.
 *
 * FE_01 R1 — this is in `lib/` rather than beside the actions because both sides of the
 * boundary need it: the server action produces it, and the client component renders it.
 * Leaving it in an action module would drag that module — and the server-only API client
 * it imports — into every client component and test that only needed this shape.
 *
 * FE_01 R8 — `.type.ts`. `noActionError` sits with it rather than in a `.constant.ts` of
 * its own, because a neutral value that is not beside its type is a second place to keep
 * the two in step.
 */
export type ActionState = { readonly error: string | null };

export const noActionError: ActionState = { error: null };
