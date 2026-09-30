import { act, renderHook } from '@testing-library/react';
import { i18n, resources, supportedLanguages, syncDocumentLanguage } from './i18n';
import { formatAmount, formatDate, useFormatters } from './i18n/format';
import { AppError, errorCode, isErrorCode } from './errors';
import { requestJson } from './http';
import { http, HttpResponse } from 'msw';
import { server } from './test/setup';
it('ships three languages and falls back for an unsupported language', async () => {
  expect(supportedLanguages).toEqual(['en', 'vi', 'ja']);
  expect(Object.keys(resources)).toEqual(['en', 'vi', 'ja']);
  await i18n.changeLanguage('xx');
  expect(i18n.t('swap.pay')).toBe('You pay');
  expect(document.documentElement.lang).toBe('en');
  expect(i18n.t('market.description', { count: 1 })).toContain('1 asset with');
  expect(i18n.t('market.description', { count: 2 })).toContain('2 assets with');
  expect(i18n.t('swap.balance', { amount: '1.2' })).toBe('Balance: 1.2');
});
it('synchronizes page metadata and provides fallback language metadata', () => {
  const meta = document.createElement('meta');
  meta.name = 'description';
  document.head.append(meta);
  syncDocumentLanguage();
  expect(meta.content).toBe(resources.en.translation.app.description);
  expect(document.title).toBe(resources.en.translation.app.title);
  expect(document.documentElement.dir).toBe('ltr');
  const language = i18n.resolvedLanguage;
  i18n.resolvedLanguage = undefined;
  syncDocumentLanguage();
  expect(document.documentElement.lang).toBe('en');
  i18n.resolvedLanguage = language;
  meta.remove();
});
it('formats USD, percentages, tiny rates and snapshot dates in the active locale', async () => {
  const { result } = renderHook(useFormatters);
  expect(result.current.usd(1234.5)).toBe('$1,234.50');
  expect(result.current.percent(0.003)).toBe('0.3%');
  expect(result.current.date()).toBe('Aug 29, 2023');
  expect(result.current.date('long')).toBe('August 29, 2023');
  expect(result.current.date('month')).toBe('Aug 2023');
  expect(result.current.date('monthLong')).toBe('August 2023');
  expect(result.current.rate('0.0000000001')).toBe('0.0000000001');
  const language = i18n.resolvedLanguage;
  await act(async () => {
    i18n.resolvedLanguage = 'de';
    i18n.emit('languageChanged', 'de');
  });
  expect(result.current.usd(1234.5)).toContain('1.234,50');
  expect(result.current.amount('1.25')).toBe('1,25');
  await act(async () => {
    i18n.resolvedLanguage = undefined;
    i18n.emit('languageChanged', 'en');
  });
  expect(result.current.usd(1)).toBe('$1.00');
  i18n.resolvedLanguage = language;
});
it('keeps decimal string precision and uses UTC for historical dates', () => {
  expect(formatAmount('999999999999.12345678', 'de')).toBe('999999999999,12345678');
  expect(formatAmount('0', 'en-US')).toBe('0');
  expect(formatDate('en-US')).toBe('Aug 29, 2023');
});
it('accepts only known error codes and preserves typed errors', () => {
  expect(isErrorCode('errors.timeout')).toBe(true);
  for (const value of [null, 3, 'timeout', 'errors.fake', 'errors.toString'])
    expect(isErrorCode(value)).toBe(false);
  expect(errorCode(new AppError('errors.timeout'), 'errors.load')).toBe('errors.timeout');
  expect(errorCode(new Error('raw server text'), 'errors.load')).toBe('errors.load');
});
it('uses a translated generic error for unknown server codes', async () => {
  server.use(
    http.get('*/api/example', () => HttpResponse.json({ code: 'unknown' }, { status: 500 })),
  );
  await expect(requestJson('/api/example')).rejects.toThrow('errors.unavailable');
});
