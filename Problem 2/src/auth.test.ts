import data from './data/prices.json';
import { decodeJwt, decodeProtectedHeader, SignJWT } from 'jose';
import { http, HttpResponse } from 'msw';
import {
  createAuth,
  JWT_AUDIENCE,
  JWT_ISSUER,
  JWT_LIFETIME_SECONDS,
  JWT_SUBJECT,
} from './mocks/auth';
import { getTokens, submitSwap } from './api';
import { getSessionToken, invalidateSession } from './session';
import { quote } from './domain';
import { server } from './test/setup';

describe('JWT signing and verification', () => {
  it('issues a signed short-lived JWT with required claims', async () => {
    const auth = createAuth();
    const { token, expiresAt } = await auth.issue();
    expect(decodeProtectedHeader(token)).toEqual({ alg: 'HS256', typ: 'JWT' });
    const payload = decodeJwt(token);
    expect(payload).toMatchObject({
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
      sub: JWT_SUBJECT,
      scope: 'swap',
    });
    expect(payload.exp! - payload.iat!).toBe(JWT_LIFETIME_SECONDS);
    expect(payload.exp! * 1000).toBe(expiresAt);
    expect(payload.jti).toEqual(expect.any(String));
    expect(await auth.verify(`Bearer ${token}`)).toBe(true);
    expect(await auth.verify(`bearer ${token}`)).toBe(true);
  });
  it.each([null, '', 'Basic abc', 'Bearer', 'Bearer broken', 'Bearer a.b.c extra'])(
    'rejects invalid headers %s',
    async (header) => expect(await createAuth().verify(header)).toBe(false),
  );
  it('rejects forged payloads and signatures and tokens from another session', async () => {
    const auth = createAuth();
    const { token } = await auth.issue();
    const parts = token.split('.');
    const fakePayload = btoa(JSON.stringify({ ...decodeJwt(token), sub: 'attacker' })).replace(
      /=/g,
      '',
    );
    expect(await auth.verify(`Bearer ${parts[0]}.${fakePayload}.${parts[2]}`)).toBe(false);
    expect(await auth.verify(`Bearer ${parts[0]}.${parts[1]}.${'a'.repeat(43)}`)).toBe(false);
    expect(await createAuth().verify(`Bearer ${token}`)).toBe(false);
  });
  it('rejects expired tokens', async () => {
    vi.useFakeTimers();
    const auth = createAuth();
    const { token, expiresAt } = await auth.issue();
    vi.setSystemTime(expiresAt);
    expect(await auth.verify(`Bearer ${token}`)).toBe(false);
  });
  it.each([
    { issuer: 'wrong' },
    { audience: 'wrong' },
    { subject: 'other-wallet' },
    { scope: 'read-only' },
    { algorithm: 'HS384' },
    { issuedAt: 100_000 },
    { omitExpiry: true },
    { omitId: true },
  ])('rejects a correctly signed token with invalid claims %j', async (change) => {
    // Fixed randomness lets the test independently sign invalid claims; no key is exposed by the app.
    const secret = new Uint8Array(32).fill(17);
    vi.spyOn(crypto, 'getRandomValues').mockReturnValue(secret);
    const auth = createAuth();
    const now = Math.floor(Date.now() / 1000);
    let jwt = new SignJWT({ scope: change.scope ?? 'swap' })
      .setProtectedHeader({ alg: change.algorithm ?? 'HS256', typ: 'JWT' })
      .setIssuer(change.issuer ?? JWT_ISSUER)
      .setAudience(change.audience ?? JWT_AUDIENCE)
      .setSubject(change.subject ?? JWT_SUBJECT)
      .setIssuedAt(now + (change.issuedAt ?? 0));
    if (!change.omitExpiry) jwt = jwt.setExpirationTime(now + JWT_LIFETIME_SECONDS);
    if (!change.omitId) jwt = jwt.setJti('test');
    expect(await auth.verify(`Bearer ${await jwt.sign(secret)}`)).toBe(false);
  });
});
describe('protected MSW routes', () => {
  it.each(['/api/tokens', '/api/swaps'])(
    'rejects missing authentication before handling %s',
    async (path) => {
      const response = await fetch(new URL(path, window.location.origin), {
        method: path.endsWith('swaps') ? 'POST' : 'GET',
        ...(path.endsWith('swaps') && { body: '{bad' }),
      });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ code: 'errors.unauthorized' });
    },
  );
  it('rejects tampered swap tokens without changing balances', async () => {
    const tokens = await getTokens();
    const token = await getSessionToken();
    const request = {
      from: 'ETH',
      to: 'USDC',
      amount: '1',
      expectedReceive: quote('1', tokens[0], tokens[1]).receive,
      expiresAt: Date.now() + 60000,
      requestId: 'protected-swap',
    };
    const response = await fetch(new URL('/api/swaps', window.location.origin), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.slice(0, -10)}aaaaaaaaaa` },
      body: JSON.stringify(request),
    });
    expect(response.status).toBe(401);
    expect((await getTokens())[0].balance).toBe('2.50000000');
    const result = await submitSwap(request);
    expect(result.balances.ETH).toBe('1.50000000');
  });
  it('attaches the bearer token to GET and POST requests', async () => {
    const seen: string[] = [];
    server.use(
      http.get('*/api/tokens', ({ request }) => {
        seen.push(request.headers.get('Authorization')!);
        return HttpResponse.json([]);
      }),
      http.post('*/api/swaps', ({ request }) => {
        seen.push(request.headers.get('Authorization')!);
        return HttpResponse.json({});
      }),
    );
    await expect(getTokens()).rejects.toThrow('errors.notEnoughTokens');
    await submitSwap({
      from: 'ETH',
      to: 'USDC',
      amount: '1',
      expectedReceive: '1',
      expiresAt: 1,
      requestId: 'test',
    });
    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(seen[1]);
    expect(decodeJwt(seen[0].slice(7)).sub).toBe(JWT_SUBJECT);
  });
  it('refreshes on 401 once and keeps the swap request unchanged', async () => {
    const calls: { token: string; body: unknown }[] = [];
    server.use(
      http.post('*/api/swaps', async ({ request }) => {
        calls.push({ token: request.headers.get('Authorization')!, body: await request.json() });
        return calls.length === 1
          ? HttpResponse.json({ code: 'errors.unauthorized' }, { status: 401 })
          : HttpResponse.json({ id: 'ok' });
      }),
    );
    await submitSwap({
      from: 'ETH',
      to: 'USDC',
      amount: '1',
      expectedReceive: '2',
      expiresAt: Date.now() + 60000,
      requestId: 'same-id',
    });
    expect(calls).toHaveLength(2);
    expect(calls[0].body).toEqual(calls[1].body);
    expect(calls[0].token).not.toBe(calls[1].token);
  });
  it('stops after one rejected retry', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/tokens', () => {
        calls++;
        return HttpResponse.json({ code: 'errors.unauthorized' }, { status: 401 });
      }),
    );
    await expect(getTokens()).rejects.toThrow('errors.unauthorized');
    expect(calls).toBe(2);
  });
});
describe('in-memory session lifecycle', () => {
  it('shares initialization across simultaneous requests and caches the token', async () => {
    const response = await fetch(new URL('/api/auth/token', window.location.origin), {
      method: 'POST',
    });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const fixture = await response.json();
    let calls = 0;
    server.use(
      http.post('*/api/auth/token', () => {
        calls++;
        return HttpResponse.json(fixture);
      }),
    );
    const results = await Promise.all([getSessionToken(), getSessionToken(), getSessionToken()]);
    expect(new Set(results).size).toBe(1);
    expect(calls).toBe(1);
    expect(await getSessionToken()).toBe(results[0]);
    expect(calls).toBe(1);
    invalidateSession('old-rejected-token');
    expect(await getSessionToken()).toBe(results[0]);
    expect(calls).toBe(1);
    invalidateSession(results[0]);
    await getSessionToken();
    expect(calls).toBe(2);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
  it('refreshes shortly before expiration', async () => {
    const first = await getSessionToken();
    const expiry = decodeJwt(first).exp! * 1000;
    vi.spyOn(Date, 'now').mockReturnValue(expiry - 4000);
    expect(await getSessionToken()).not.toBe(first);
  });
  it.each([
    null,
    {},
    { token: 7 },
    { token: 'bad-token', expiresAt: Date.now() + 60000 },
    { token: 'a.b.c', expiresAt: 'bad' },
    { token: 'a.b.c', expiresAt: 0 },
  ])('rejects malformed sessions %j', async (fixture) => {
    server.use(http.post('*/api/auth/token', () => HttpResponse.json(fixture)));
    await expect(getSessionToken()).rejects.toThrow('errors.invalidSession');
  });
  it('allows initialization retry after a server error', async () => {
    server.use(
      http.post(
        '*/api/auth/token',
        () => HttpResponse.json({ code: 'errors.unavailable' }, { status: 503 }),
        { once: true },
      ),
    );
    await expect(getSessionToken()).rejects.toThrow('errors.unavailable');
    expect(await getSessionToken()).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });
});

it('shares a single renewal across simultaneous unauthorized requests', async () => {
  const auth = createAuth();
  let issued = 0;
  let reads = 0;
  server.use(
    http.post('*/api/auth/token', async () => {
      issued++;
      return HttpResponse.json(await auth.issue());
    }),
    http.get('*/api/tokens', () => {
      reads++;
      return reads <= 2
        ? HttpResponse.json({ code: 'errors.unauthorized' }, { status: 401 })
        : HttpResponse.json(data);
    }),
  );
  const results = await Promise.all([getTokens(), getTokens()]);
  expect(results.every((tokens) => tokens.length === data.length)).toBe(true);
  expect(issued).toBe(2);
  expect(reads).toBe(4);
});
