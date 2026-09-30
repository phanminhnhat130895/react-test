import { getSessionToken } from './session';
import { http, HttpResponse } from 'msw';
import { getTokens, submitSwap } from './api';
import { quote } from './domain';
import { server } from './test/setup';
import type { SwapRequest } from './types';

async function validRequest(): Promise<SwapRequest> {
  const tokens = await getTokens();
  return {
    from: 'ETH',
    to: 'USDC',
    amount: '1',
    expectedReceive: quote('1', tokens[0], tokens[1]).receive,
    expiresAt: Date.now() + 60_000,
    requestId: 'test-swap',
  };
}
describe('API and MSW contract', () => {
  it('loads local tokens, processes a swap, and returns updated balances', async () => {
    expect((await getTokens()).length).toBeGreaterThan(500);
    const body = await validRequest();
    const result = await submitSwap(body);
    expect(result.balances.ETH).toBe('1.50000000');
    expect(result.received).toBe(body.expectedReceive);
    expect((await getTokens())[0].balance).toBe('1.50000000');
    expect(await submitSwap(body)).toEqual(result);
    expect((await getTokens())[0].balance).toBe('1.50000000');
    await expect(submitSwap({ ...body, amount: '2' })).rejects.toThrow('errors.requestUsed');
  });
  it.each([{ from: 'BAD' }, { to: 'BAD' }, { to: 'ETH' }])(
    'rejects unsupported or identical tokens %j',
    async (change) => {
      await expect(submitSwap({ ...(await validRequest()), ...change })).rejects.toThrow(
        'errors.unsupportedTokens',
      );
    },
  );
  it.each([{ expiresAt: 0 }, { expiresAt: Date.now() + 1000_000 }])(
    'rejects invalid quote time %j',
    async (change) => {
      await expect(submitSwap({ ...(await validRequest()), ...change })).rejects.toThrow(
        'errors.quoteExpired',
      );
    },
  );
  it('rejects overdrafts and stale quotes', async () => {
    const body = await validRequest();
    await expect(submitSwap({ ...body, amount: '3' })).rejects.toThrow(
      'errors.insufficientBalance',
    );
    await expect(submitSwap({ ...body, expectedReceive: '123' })).rejects.toThrow(
      'errors.quoteChanged',
    );
  });
  it('rejects amounts rounded to zero', async () => {
    await expect(
      submitSwap({ ...(await validRequest()), from: 'USDC', to: 'ETH', amount: '0.00000001' }),
    ).rejects.toThrow('errors.dust');
  });
  it.each([
    null,
    {},
    { amount: 1 },
    { amount: '1', requestId: 2 },
    { amount: '1', requestId: '' },
    { amount: '1', requestId: 'x'.repeat(101) },
    { amount: '1', requestId: 'x', expectedReceive: 2 },
    { amount: '1', requestId: 'x', expectedReceive: '2', expiresAt: '1' },
  ])('rejects malformed bodies %j', async (body) => {
    const response = await fetch('http://localhost:3000/api/swaps', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await getSessionToken()}` },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(400);
  });
  it('rejects malformed JSON', async () => {
    const response = await fetch('http://localhost:3000/api/swaps', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await getSessionToken()}` },
      body: '{bad',
    });
    expect(response.status).toBe(400);
  });
  it('reports a failed service without JSON', async () => {
    server.use(http.get('*/api/tokens', () => new HttpResponse('offline', { status: 503 })));
    await expect(getTokens()).rejects.toThrow('errors.unavailable');
  });
  it('rejects malformed successful responses', async () => {
    server.use(http.get('*/api/tokens', () => HttpResponse.json({ invalid: true })));
    await expect(getTokens()).rejects.toThrow('errors.invalidData');
  });
  it('reports network errors', async () => {
    server.use(http.get('*/api/tokens', () => HttpResponse.error()));
    await expect(getTokens()).rejects.toThrow();
  });
  it('times out stalled requests and clears the timer', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          ),
        ),
    );
    const result = expect(getTokens()).rejects.toThrow('errors.timeout');
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });
});
