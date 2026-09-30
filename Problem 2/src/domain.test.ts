import {
  add,
  compact,
  fraction,
  parseTokens,
  quote,
  subtract,
  usd,
  validateAmount,
} from './domain';
import type { Token } from './types';
export const eth: Token = {
  currency: 'ETH',
  name: 'Ethereum',
  price: 2000,
  balance: '2.5',
  date: '2023-08-29T00:00:00Z',
  source: 'snapshot',
  icon: '/tokens/ETH.svg',
};
export const usdc: Token = {
  ...eth,
  currency: 'USDC',
  name: 'USD Coin',
  price: 1,
  balance: '5000',
};
describe('amount validation', () => {
  it.each([
    ['', 'errors.amountRequired'],
    [' ', 'errors.amountRequired'],
    ['-1', 'errors.amountInvalid'],
    ['1e3', 'errors.amountInvalid'],
    ['1,000', 'errors.amountInvalid'],
    ['Infinity', 'errors.amountInvalid'],
    ['NaN', 'errors.amountInvalid'],
    ['.', 'errors.amountInvalid'],
    ['1..2', 'errors.amountInvalid'],
    ['1 2', 'errors.amountInvalid'],
    ['0', 'errors.amountZero'],
    ['0.00000000', 'errors.amountZero'],
    ['0.123456789', 'errors.amountPrecision'],
    ['1000000000001', 'errors.amountLimit'],
    ['3', 'errors.insufficientBalance'],
  ])('rejects %s', (input, message) => {
    expect(validateAmount(input, '2.5')).toContain(message);
  });
  it.each(['1', '2.5', '.5', '1.', '0.00000001', '0001.50'])('accepts %s', (input) =>
    expect(validateAmount(input, '2.5')).toBeNull(),
  );
});
describe('precise conversions', () => {
  it('deducts 0.3% and rounds down to eight decimals', () =>
    expect(quote('1', eth, usdc)).toEqual({
      receive: '1994.00000000',
      fee: '0.00300000',
      usd: 2000,
      rate: '2000',
    }));
  it('avoids floating point drift and does not overpay', () => {
    expect(add('0.1', '0.2')).toBe('0.30000000');
    expect(subtract('0.3', '0.1')).toBe('0.20000000');
    expect(fraction('0.00000003', 0.5)).toBe('0.00000001');
    expect(quote('1', usdc, { ...eth, price: 3 }).receive).toBe('0.33233333');
  });
  it('represents tiny quotes as zero for minimum validation', () =>
    expect(quote('0.00000001', usdc, eth).receive).toBe('0.00000000'));
  it('rejects identical tokens', () =>
    expect(() => quote('1', eth, eth)).toThrow('errors.sameTokens'));
  it.each([0, -1, NaN, Infinity])('rejects invalid prices %s', (price) =>
    expect(() => quote('1', { ...eth, price }, usdc)).toThrow('errors.priceUnavailable'),
  );
  it.each(['0', '-1', 'Infinity', 'NaN'])('rejects invalid amounts %s', (amount) =>
    expect(() => quote(amount, eth, usdc)).toThrow(),
  );
  it('formats amounts without losing integer zeros', () => {
    expect(compact('100.00000000')).toBe('100');
    expect(compact('0')).toBe('0');
    expect(compact('1.00100')).toBe('1.001');
    expect(usd(0.00012)).toBe('$0.00012');
    expect(usd(1234.5)).toBe('$1,234.50');
  });
});
describe('price response validation', () => {
  it('deduplicates using the newest date', () => {
    const newer = { ...eth, date: '2024-01-01', price: 2100 };
    expect(parseTokens([eth, newer, eth, usdc])).toEqual([newer, usdc]);
  });
  it('accepts missing icons', () =>
    expect(parseTokens([{ ...eth, icon: null }, usdc])[0].icon).toBeNull());
  it.each([null, {}, 'bad data'])('rejects invalid root %s', (value) =>
    expect(() => parseTokens(value)).toThrow('errors.invalidData'),
  );
  it('filters corrupt records', () => {
    const corrupt = [
      null,
      {},
      { ...eth, currency: 3 },
      { ...eth, currency: ' ' },
      { ...eth, name: 1 },
      { ...eth, price: '1' },
      { ...eth, price: Infinity },
      { ...eth, price: 0 },
      { ...eth, source: 'live' },
      { ...eth, date: 3 },
      { ...eth, date: 'bad' },
      { ...eth, balance: -2 },
      { ...eth, balance: '-2' },
      { ...eth, icon: 'https://invalid.test/x.svg' },
    ];
    expect(parseTokens([...corrupt, eth, usdc])).toEqual([eth, usdc]);
    expect(() => parseTokens([eth])).toThrow('errors.notEnoughTokens');
  });
});
