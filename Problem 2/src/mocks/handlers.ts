import { createAuth, withAuth } from './auth';
import { http, HttpResponse, delay } from 'msw';
import data from '../data/prices.json';
import { add, subtract, quote, validateAmount, QUOTE_LIFETIME } from '../domain';
import type { Token, SwapRequest, SwapResult } from '../types';

export function createHandlers(latency = 450) {
  const auth = createAuth();
  const tokens = structuredClone(data) as Token[];
  const completed = new Map<string, { request: string; result: SwapResult }>();
  return [
    http.post('*/api/auth/token', async () =>
      HttpResponse.json(await auth.issue(), { headers: { 'Cache-Control': 'no-store' } }),
    ),
    http.get(
      '*/api/tokens',
      withAuth(auth, async () => {
        await delay(latency);
        return HttpResponse.json(tokens);
      }),
    ),
    http.post(
      '*/api/swaps',
      withAuth(auth, async ({ request }) => {
        await delay(latency);
        let body: SwapRequest;
        try {
          body = (await request.json()) as SwapRequest;
        } catch {
          return HttpResponse.json({ code: 'errors.invalidRequest' }, { status: 400 });
        }
        if (
          !body ||
          typeof body.amount !== 'string' ||
          typeof body.requestId !== 'string' ||
          !body.requestId ||
          body.requestId.length > 100 ||
          typeof body.expectedReceive !== 'string' ||
          typeof body.expiresAt !== 'number' ||
          !Number.isFinite(body.expiresAt)
        )
          return HttpResponse.json({ code: 'errors.invalidRequest' }, { status: 400 });
        const cached = completed.get(body.requestId);
        if (cached)
          return JSON.stringify(body) === cached.request
            ? HttpResponse.json(cached.result)
            : HttpResponse.json({ code: 'errors.requestUsed' }, { status: 409 });
        const from = tokens.find((t) => t.currency === body.from);
        const to = tokens.find((t) => t.currency === body.to);
        if (!from || !to || from === to)
          return HttpResponse.json({ code: 'errors.unsupportedTokens' }, { status: 400 });
        if (body.expiresAt <= Date.now() || body.expiresAt > Date.now() + QUOTE_LIFETIME)
          return HttpResponse.json({ code: 'errors.quoteExpired' }, { status: 409 });
        const error = validateAmount(body.amount, from.balance);
        if (error) return HttpResponse.json({ code: error }, { status: 400 });
        const { receive } = quote(body.amount, from, to);
        if (Number(receive) <= 0)
          return HttpResponse.json({ code: 'errors.dust' }, { status: 400 });
        if (receive !== body.expectedReceive)
          return HttpResponse.json({ code: 'errors.quoteChanged' }, { status: 409 });
        from.balance = subtract(from.balance, body.amount);
        to.balance = add(to.balance, receive);
        const result = {
          id: `demo-${body.requestId}`,
          received: receive,
          balances: Object.fromEntries(tokens.map((t) => [t.currency, t.balance])),
        };
        completed.set(body.requestId, { request: JSON.stringify(body), result });
        return HttpResponse.json(result);
      }),
    ),
  ];
}
