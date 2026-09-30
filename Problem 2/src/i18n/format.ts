import { useTranslation } from 'react-i18next';
import { compact, usd } from '../domain';
export const SNAPSHOT_DATE = new Date('2023-08-29T00:00:00Z');
export function formatDate(
  locale: string,
  style: 'short' | 'long' | 'month' | 'monthLong' = 'short',
) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    year: 'numeric',
    month: style === 'long' || style === 'monthLong' ? 'long' : 'short',
    ...((style === 'short' || style === 'long') && { day: 'numeric' }),
  }).format(SNAPSHOT_DATE);
}
export function decimalSeparator(locale: string) {
  return new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === 'decimal')!
    .value;
}
export function formatInput(value: string, locale: string) {
  return value.replaceAll('.', decimalSeparator(locale));
}
export function normalizeInput(value: string, locale: string) {
  // Accept decimal keyboard input and Japanese full-width digits, never strip grouping.
  const ascii = value
    .replace(/[０-９]/g, (char) => String(char.charCodeAt(0) - 0xff10))
    .replaceAll('．', '.')
    .replaceAll('，', ',');
  return ascii.replaceAll(decimalSeparator(locale), '.');
}
// Keep exact decimal strings: Number(value) would lose precision for large balances.
export function formatAmount(value: string | number, locale: string) {
  const separator = decimalSeparator(locale);
  return compact(value).replace('.', separator);
}
export function useFormatters() {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : i18n.resolvedLanguage || 'en-US';
  return {
    input: (value: string) => formatInput(value, locale),
    normalizeInput: (value: string) => normalizeInput(value, locale),
    amount: (value: string | number) => formatAmount(value, locale),
    rate: (value: string) =>
      new Intl.NumberFormat(locale, { useGrouping: false, maximumSignificantDigits: 8 }).format(
        Number(value),
      ),
    usd: (value: number) => usd(value, locale),
    percent: (value: number) =>
      new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(value),
    date: (style?: 'short' | 'long' | 'month' | 'monthLong') => formatDate(locale, style),
  };
}
