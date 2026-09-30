import { AppError } from './errors';
import type { ErrorCode } from './errors';
import Decimal from 'decimal.js';
import type { Token } from './types';

const D = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_DOWN });
export const FEE_RATE = '0.003';
export const QUOTE_LIFETIME = 60_000;
export function validateAmount(amount: string, balance: string): ErrorCode | null {
  if (!amount.trim()) return 'errors.amountRequired';
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(amount)) return 'errors.amountInvalid';
  if ((amount.split('.')[1]?.length ?? 0) > 8) return 'errors.amountPrecision';
  const value = new D(amount);
  if (value.lte(0)) return 'errors.amountZero';
  if (value.gt('1000000000000')) return 'errors.amountLimit';
  if (value.gt(balance)) return 'errors.insufficientBalance';
  return null;
}
export function quote(amount: string, from: Token, to: Token) {
  if (from.currency === to.currency) throw new AppError('errors.sameTokens');
  if (![from.price, to.price].every((p) => Number.isFinite(p) && p > 0))
    throw new AppError('errors.priceUnavailable');
  const value = new D(amount);
  if (!value.isFinite() || value.lte(0)) throw new AppError('errors.invalidAmount');
  const gross = value.mul(from.price).div(to.price);
  return {
    receive: gross.mul(new D(1).minus(FEE_RATE)).toFixed(8),
    fee: value.mul(FEE_RATE).toFixed(8),
    usd: value.mul(from.price).toNumber(),
    rate: new D(from.price).div(to.price).toSignificantDigits(8).toString(),
  };
}
export function subtract(a: string, b: string) {
  return new D(a).minus(b).toFixed(8);
}
export function add(a: string, b: string) {
  return new D(a).plus(b).toFixed(8);
}
export function fraction(amount: string, part: number) {
  return new D(amount).mul(part).toFixed(8);
}
export function compact(value: string | number) {
  const n = new D(value);
  return n.isZero() ? '0' : n.toFixed(8).replace(/\.?0+$/, '');
}
export function usd(value: number, locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: value > 0 && value < 0.01 ? 6 : 2,
  }).format(value);
}
export function parseTokens(data: unknown): Token[] {
  if (!Array.isArray(data)) throw new AppError('errors.invalidData');
  const unique = new Map<string, Token>();
  for (const row of data) {
    if (
      !row ||
      typeof row.currency !== 'string' ||
      !row.currency.trim() ||
      typeof row.name !== 'string' ||
      typeof row.price !== 'number' ||
      !Number.isFinite(row.price) ||
      row.price <= 0 ||
      !['snapshot', 'sample'].includes(row.source) ||
      typeof row.date !== 'string' ||
      !Number.isFinite(Date.parse(row.date)) ||
      typeof row.balance !== 'string' ||
      !/^\d+(\.\d{1,8})?$/.test(row.balance) ||
      !(row.icon === null || (typeof row.icon === 'string' && row.icon.startsWith('/tokens/')))
    )
      continue;
    const previous = unique.get(row.currency);
    if (!previous || Date.parse(row.date) > Date.parse(previous.date))
      unique.set(row.currency, row as Token);
  }
  if (unique.size < 2) throw new AppError('errors.notEnoughTokens');
  return [...unique.values()];
}
