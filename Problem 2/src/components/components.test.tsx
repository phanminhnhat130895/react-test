import { fireEvent, render, screen } from '@testing-library/react';
import { AmountPanel } from './AmountPanel';
import { TokenPicker } from './TokenPicker';
import { TokenAvatar } from './TokenAvatar';
import { MarketPanel } from './MarketPanel';
import type { Token } from '../types';
const eth: Token = {
  currency: 'ETH',
  name: 'Ethereum',
  price: 2000,
  balance: '2.5',
  date: '2023-08-29',
  source: 'snapshot',
  icon: '/tokens/ETH.svg',
};
const usdc: Token = {
  ...eth,
  currency: 'USDC',
  name: 'USD Coin',
  price: 1,
  source: 'sample',
  balance: '5000',
};
it('renders a fallback avatar when an icon is unavailable', () => {
  render(<TokenAvatar token={{ ...eth, icon: null }} />);
  expect(screen.getByText('ET')).toBeInTheDocument();
});
it('renders decorative token images with empty alt text', () => {
  const { container } = render(<TokenAvatar token={eth} />);
  expect(container.querySelector('img')).toHaveAttribute('alt', '');
  expect(container.querySelector('img')).toHaveAttribute('src', '/tokens/ETH.svg');
});
it('renders input error, selects token, and applies balance fractions', () => {
  const onChange = vi.fn(),
    onSelect = vi.fn(),
    onFraction = vi.fn();
  render(
    <AmountPanel
      token={eth}
      value="1"
      dollarValue="$2,000"
      onChange={onChange}
      onSelect={onSelect}
      onFraction={onFraction}
      error="errors.amountInvalid"
    />,
  );
  fireEvent.change(screen.getByLabelText('Pay amount'), { target: { value: '2' } });
  expect(onChange).toHaveBeenCalledWith('2');
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid positive number.');
  fireEvent.click(screen.getByRole('button', { name: 'MAX' }));
  expect(onFraction).toHaveBeenCalledWith(1);
  fireEvent.click(screen.getByRole('button', { name: '50%' }));
  expect(onFraction).toHaveBeenCalledWith(0.5);
  fireEvent.click(screen.getByRole('button', { name: /Select pay token/ }));
  expect(onSelect).toHaveBeenCalled();
});
it('supports a read-only receive panel and absent optional callbacks', () => {
  const { rerender } = render(
    <AmountPanel token={eth} receiving value="1" dollarValue="$1" onSelect={vi.fn()} />,
  );
  expect(screen.getByLabelText('Receive amount')).toHaveAttribute('readonly');
  fireEvent.change(screen.getByLabelText('Receive amount'), { target: { value: '2' } });
  rerender(<AmountPanel token={eth} value="" dollarValue="$0" onSelect={vi.fn()} />);
  fireEvent.click(screen.getByText('MAX'));
});
it('searches tokens, excludes opposite token, labels samples, and closes', () => {
  const select = vi.fn(),
    close = vi.fn();
  render(
    <TokenPicker
      tokens={[eth, usdc]}
      selected="ETH"
      excluded="USDC"
      onSelect={select}
      onClose={close}
    />,
  );
  expect(screen.getByRole('button', { name: 'Select USDC' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(screen.getByText('Sample')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search tokens'), { target: { value: ' ethereum ' } });
  expect(screen.queryByRole('button', { name: 'Select USDC' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Select ETH' }));
  expect(select).toHaveBeenCalledWith('ETH');
  fireEvent.change(screen.getByLabelText('Search tokens'), { target: { value: 'zzzzz' } });
  expect(screen.getByText('No tokens found')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Close token picker'));
  expect(close).toHaveBeenCalled();
});
it('renders historical and sample market rows, omitting absent tokens', () => {
  render(<MarketPanel tokens={[eth, { ...usdc, currency: 'BTC', name: 'Bitcoin' }]} />);
  expect(screen.getByText('Historical price')).toBeInTheDocument();
  expect(screen.getByText('Sample price')).toBeInTheDocument();
  expect(screen.queryByText('SOL')).not.toBeInTheDocument();
});
