import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { i18n, resources, supportedLanguages } from './i18n';
import { formatInput, normalizeInput } from './i18n/format';
import {
  LANGUAGE_STORAGE_KEY,
  languages,
  readLanguage,
  resolveLanguage,
  saveLanguage,
} from './i18n/preferences';
import { LanguageSelector } from './components/LanguageSelector';

function leaves(object: object, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    Object.entries(object).flatMap(([key, value]) => {
      const path = prefix + key;
      return typeof value === 'string'
        ? [[path, value]]
        : Object.entries(leaves(value, path + '.'));
    }),
  );
}
it('ships complete translations with matching interpolation variables and selector entries', () => {
  const english = leaves(resources.en.translation);
  expect(Object.keys(languages)).toEqual(supportedLanguages);
  for (const resource of [resources.vi, resources.ja]) {
    const translated = leaves(resource.translation);
    expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
    for (const [key, value] of Object.entries(translated)) {
      expect(value.trim(), key).not.toBe('');
      expect(value.match(/{{\w+}}/g)?.sort(), key).toEqual(english[key].match(/{{\w+}}/g)?.sort());
    }
  }
});
it('resolves supported regional preferences and safely falls back for untrusted values', () => {
  for (const [input, expected] of [
    ['vi-VN', 'vi'],
    ['JA-jp', 'ja'],
    ['en-US', 'en'],
    ['fr', 'en'],
    ['__proto__', 'en'],
    ['constructor', 'en'],
    [null, 'en'],
    [42, 'en'],
  ]) {
    expect(resolveLanguage(input)).toBe(expected);
  }
  expect(readLanguage()).toBe('en');
  saveLanguage('ja');
  expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ja');
  expect(readLanguage()).toBe('ja');
  localStorage.setItem(LANGUAGE_STORAGE_KEY, 'bad');
  expect(readLanguage()).toBe('en');
});
it('continues to work when storage access is blocked', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(readLanguage()).toBe('en');
  expect(() => saveLanguage('vi')).not.toThrow();
  await i18n.changeLanguage('vi');
  expect(i18n.t('swap.pay')).toBe('Bạn trả');
});
it('normalizes decimal keyboards without losing precision or silently stripping grouping', () => {
  expect(formatInput('999999999999.12345678', 'vi')).toBe('999999999999,12345678');
  expect(normalizeInput('999999999999,12345678', 'vi')).toBe('999999999999.12345678');
  expect(normalizeInput('1.25', 'vi')).toBe('1.25');
  expect(normalizeInput('1.234,56', 'vi')).toBe('1.234.56');
  expect(normalizeInput('1,234', 'en')).toBe('1,234');
  expect(normalizeInput('１．２５', 'ja')).toBe('1.25');
  expect(normalizeInput('１，２５', 'vi')).toBe('1.25');
  expect(formatInput('.', 'vi')).toBe(',');
  expect(normalizeInput(',', 'vi')).toBe('.');
  expect(formatInput('', 'ja')).toBe('');
});
it('supports keyboard menu dismissal, selection indication and saved preference', async () => {
  const user = userEvent.setup();
  render(<LanguageSelector />);
  const button = screen.getByRole('button', { name: /^Language/ });
  await user.click(button);
  expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  expect(button).toHaveFocus();
  await user.click(button);
  await user.click(screen.getByRole('menuitemradio', { name: '日本語' }));
  expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ja');
  expect(document.documentElement.lang).toBe('ja');
  await user.click(screen.getByRole('button', { name: /^言語/ }));
  expect(screen.getByRole('menuitemradio', { name: '日本語' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});
it('preserves quantities, selections and errors across languages and swaps a Vietnamese decimal', async () => {
  render(<App />);
  fireEvent.change(await screen.findByLabelText('Pay amount'), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: /^Language/ }));
  fireEvent.click(screen.getByRole('menuitemradio', { name: 'Tiếng Việt' }));
  await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  expect(screen.getByRole('alert')).toHaveTextContent(
    resources.vi.translation.errors.insufficientBalance,
  );
  expect(screen.getByLabelText('Số lượng trả')).toHaveValue('3');
  fireEvent.change(screen.getByLabelText('Số lượng trả'), { target: { value: '1,25' } });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Ngôn ngữ/ }));
  fireEvent.click(screen.getByRole('menuitemradio', { name: '日本語' }));
  await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  expect(screen.getByLabelText('支払い数量')).toHaveValue('1.25');
  expect(screen.getByLabelText('支払いトークンを選択、ETH')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^言語/ }));
  fireEvent.click(screen.getByRole('menuitemradio', { name: 'Tiếng Việt' }));
  await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  expect(screen.getByLabelText('Số lượng trả')).toHaveValue('1,25');
  fireEvent.click(screen.getByRole('button', { name: 'Xem lại giao dịch' }));
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hoán đổi mô phỏng' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Số dư mô phỏng đã được cập nhật'),
  );
  expect(screen.getByText('Số dư: 1,25')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Ngôn ngữ/ }));
  fireEvent.click(screen.getByRole('menuitemradio', { name: 'English' }));
  await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  expect(screen.getByText('Balance: 1.25')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Swapped 1.25 ETH');
});
