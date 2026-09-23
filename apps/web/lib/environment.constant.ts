import 'server-only';
import { z } from 'zod';

/**
 * INFRA_07 R9 — the app fails to start on a missing or invalid variable, and says which.
 * INFRA_07 R8 — nothing here is marked public, so nothing here may reach the browser.
 * `server-only` turns a client import of this module into a build error rather than a
 * value that silently ships (FE_08 R5).
 *
 * INFRA_07 R2 — every variable below has its line in `.env.example`, added in the same
 * change that introduced it.
 */
const environmentSchema = z.object({
  /**
   * Where the API app answers. It genuinely differs per environment (INFRA_07 R6), which
   * is why it is a variable rather than a constant.
   */
  API_BASE_URL: z.url().default('http://localhost:3000'),
});

const parsed = environmentSchema.safeParse(process.env);

if (!parsed.success) {
  // INFRA_07 R9 — name the variables that failed, never the values they held.
  const failed = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${failed}`);
}

export const environment = parsed.data;
