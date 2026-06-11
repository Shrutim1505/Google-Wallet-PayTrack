/**
 * MSW node server — runs in JSDOM tests via the global setup file.
 *
 * Tests can call `server.use(handler)` to install per-test overrides;
 * the setup file resets between every test so overrides never leak.
 */
import { setupServer } from 'msw/node';

import { handlers } from './handlers';

export const server = setupServer(...handlers);
