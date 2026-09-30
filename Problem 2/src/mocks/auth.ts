import { jwtVerify, SignJWT } from 'jose';
import { HttpResponse } from 'msw';
import type { HttpResponseResolver } from 'msw';
export const JWT_ISSUER = 'demo-swap-msw';
export const JWT_AUDIENCE = 'demo-swap-api';
export const JWT_SUBJECT = 'demo-wallet';
export const JWT_LIFETIME_SECONDS = 15 * 60;
export function createAuth() {
  // A fresh signing key lives only inside this mock session. Never a production secret.
  const key = crypto.getRandomValues(new Uint8Array(32));
  return {
    async issue() {
      const issuedAt = Math.floor(Date.now() / 1000);
      const expiresAt = issuedAt + JWT_LIFETIME_SECONDS;
      const token = await new SignJWT({ scope: 'swap' })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuer(JWT_ISSUER)
        .setAudience(JWT_AUDIENCE)
        .setSubject(JWT_SUBJECT)
        .setIssuedAt(issuedAt)
        .setExpirationTime(expiresAt)
        .setJti(crypto.randomUUID())
        .sign(key);
      return { token, expiresAt: expiresAt * 1000 };
    },
    async verify(header: string | null) {
      const match = /^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/i.exec(header ?? '');
      if (!match) return false;
      try {
        const { payload } = await jwtVerify(match[1], key, {
          algorithms: ['HS256'],
          typ: 'JWT',
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
          subject: JWT_SUBJECT,
          requiredClaims: ['iat', 'exp', 'jti', 'scope'],
          maxTokenAge: JWT_LIFETIME_SECONDS,
        });
        return payload.scope === 'swap';
      } catch {
        return false;
      }
    },
  };
}
export function withAuth(
  auth: ReturnType<typeof createAuth>,
  resolver: HttpResponseResolver,
): HttpResponseResolver {
  return async (args) => {
    if (!(await auth.verify(args.request.headers.get('Authorization'))))
      return HttpResponse.json({ code: 'errors.unauthorized' }, { status: 401 });
    return resolver(args);
  };
}
