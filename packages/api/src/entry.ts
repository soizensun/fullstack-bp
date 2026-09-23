/**
 * GEN_07 R6 / INFRA_03 R5 — the package's only public surface. Everything reachable from
 * here is API; everything else is internal, including the generated module, which is
 * re-exported only as types.
 */
export { createApiClient, unwrap, CORRELATION_ID_HEADER } from './client';
export type { ApiClient, ApiClientConfig } from './client';
export { ApiError, API_UNREACHABLE } from './api-error';
export type { components, operations, paths } from './generated/schema';
