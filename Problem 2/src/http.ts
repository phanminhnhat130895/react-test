import { AppError, isErrorCode } from './errors';
export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(new URL(path, window.location.origin), {
      ...init,
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new AppError(
        isErrorCode(body?.code) ? body.code : 'errors.unavailable',
        response.status,
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    if (controller.signal.aborted) throw new AppError('errors.timeout');
    if (error instanceof AppError) throw error;
    throw new AppError('errors.network');
  } finally {
    clearTimeout(timeout);
  }
}
