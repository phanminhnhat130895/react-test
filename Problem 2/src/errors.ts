import en from './i18n/locales/en.json';
export type ErrorCode = `errors.${keyof typeof en.errors}`;
export function isErrorCode(value: unknown): value is ErrorCode {
  return (
    typeof value === 'string' &&
    value.startsWith('errors.') &&
    Object.hasOwn(en.errors, value.slice(7))
  );
}
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status?: number,
  ) {
    super(code);
    this.name = 'AppError';
  }
}
export function errorCode(error: unknown, fallback: ErrorCode): ErrorCode {
  return error instanceof AppError ? error.code : fallback;
}
