import { DataValidationError } from "../wallet/validation";

export class HttpError extends Error {
  constructor(readonly status: number) {
    super(`The server returned HTTP ${status}.`);
    this.name = "HttpError";
  }
}

export async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
    headers: { Accept: "application/json" },
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) throw new HttpError(response.status);
  try {
    return await response.json() as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new DataValidationError("The server did not return valid JSON.");
    }
    throw error;
  }
}

export function shouldRetry(failureCount: number, error: Error): boolean {
  if (failureCount >= 2 || error instanceof DataValidationError) return false;
  if (error instanceof HttpError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return error instanceof TypeError || error.name === "TimeoutError";
}

export function describeError(error: Error): string {
  if (error instanceof DataValidationError) return error.message;
  if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
    return "Access was denied. Check your session and permissions.";
  }
  if (error.name === "TimeoutError") return "The request timed out. Please try again.";
  return "Data could not be loaded. Check your connection and try again.";
}
