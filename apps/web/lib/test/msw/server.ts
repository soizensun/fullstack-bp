import { setupServer } from 'msw/node';
import { handlers } from '@/lib/test/msw/handlers';

/** One server for the whole suite; `test/setup.ts` owns its lifecycle. */
export const server = setupServer(...handlers);
