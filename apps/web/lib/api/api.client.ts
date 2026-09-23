import 'server-only';
import { createApiClient } from '@repo/api';
import { environment } from '@/lib/environment.constant';

/**
 * FE_10 R4 — constructed once, from configuration. A component that builds a client has
 * taken configuration into the render tree, and it will be built with a different base
 * URL somewhere.
 *
 * FE_10 R8 / FE_08 R5 — this module is server-only. Reads happen on the server
 * (FE_09 R1), so this is the client that may one day hold a credential; the browser never
 * imports it, and `server-only` makes an attempt a build error rather than a leak.
 */
export const apiClient = createApiClient({ baseUrl: environment.API_BASE_URL });
