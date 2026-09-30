import { parseTokens } from './domain';
import { AppError } from './errors';
import { requestJson } from './http';
import { getSessionToken, invalidateSession } from './session';
import type { SwapRequest, SwapResult } from './types';
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getSessionToken();
  const send = (jwt: string) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${jwt}`);
    return requestJson<T>(path, { ...init, headers });
  };
  try {
    return await send(token);
  } catch (error) {
    if (!(error instanceof AppError) || error.status !== 401) throw error;
    // Retry once; the same swap request ID is retained for idempotency.
    invalidateSession(token);
    return send(await getSessionToken());
  }
}
export async function getTokens() {
  return parseTokens(await request('/api/tokens'));
}
export async function submitSwap(body: SwapRequest): Promise<SwapResult> {
  return request('/api/swaps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
