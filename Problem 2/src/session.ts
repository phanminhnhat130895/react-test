import { AppError } from './errors';
import { requestJson } from './http';
interface Session {
  token: string;
  expiresAt: number;
}
let session: Session | undefined;
let pending: Promise<string> | undefined;
export function invalidateSession(rejectedToken?: string) {
  if (!rejectedToken || session?.token === rejectedToken) session = undefined;
}
export async function getSessionToken(): Promise<string> {
  if (session && session.expiresAt > Date.now() + 5000) return session.token;
  if (pending) return pending;
  pending = requestJson<Session>('/api/auth/token', { method: 'POST' })
    .then((result) => {
      if (
        !result ||
        typeof result.token !== 'string' ||
        !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(result.token) ||
        !Number.isFinite(result.expiresAt) ||
        result.expiresAt <= Date.now() + 5000
      )
        throw new AppError('errors.invalidSession');
      session = result;
      return result.token;
    })
    .finally(() => {
      pending = undefined;
    });
  return pending;
}
