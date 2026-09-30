import { webcrypto } from 'node:crypto';
import { invalidateSession } from '../session';
import { i18n } from '../i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { createHandlers } from '../mocks/handlers';
Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
beforeEach(async () => {
  invalidateSession();
  await i18n.changeLanguage('en');
  localStorage.clear();
});
export const server = setupServer(...createHandlers(0));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers(...createHandlers(0));
  vi.restoreAllMocks();
  vi.useRealTimers();
});
afterAll(() => server.close());
