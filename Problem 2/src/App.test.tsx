import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import App from './App';
import { server } from './test/setup';
import data from './data/prices.json';

async function ready() {
  render(<App />);
  return screen.findByLabelText('Pay amount');
}
async function reviewSwap() {
  const input = await ready();
  fireEvent.change(input, { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review swap' }));
  return screen.getByRole('dialog', { name: 'Review your swap' });
}

it('shows loading, accessible empty fields and initial rates', async () => {
  render(<App />);
  expect(screen.getByLabelText('Loading prices')).toBeInTheDocument();
  expect(await screen.findByLabelText('Pay amount')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Enter an amount' })).toBeDisabled();
  expect(screen.getByLabelText('Receive amount')).toHaveAttribute('readonly');
  expect(screen.getByText(/Historical prices · Aug/)).toBeInTheDocument();
});
it('validates bad input and balance while accepting decimal quantities', async () => {
  const input = await ready();
  for (const [value, message] of [
    ['-1', 'valid positive'],
    ['0', 'greater than zero'],
    ['3', 'Not enough balance'],
    ['0.123456789', '8 decimal'],
  ]) {
    fireEvent.change(input, { target: { value } });
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Review swap' })).toBeDisabled();
  }
  fireEvent.change(input, { target: { value: '.5' } });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Review swap' })).toBeEnabled();
});
it('applies half and max and reverses the selected pair and estimate', async () => {
  await ready();
  fireEvent.click(screen.getByRole('button', { name: '50%' }));
  expect(screen.getByLabelText('Pay amount')).toHaveValue('1.25000000');
  fireEvent.click(screen.getByRole('button', { name: 'MAX' }));
  expect(screen.getByLabelText('Pay amount')).toHaveValue('2.50000000');
  const receive = (screen.getByLabelText('Receive amount') as HTMLInputElement).value;
  fireEvent.click(screen.getByLabelText('Reverse swap direction'));
  expect(screen.getByLabelText('Select pay token, USDC')).toBeInTheDocument();
  expect(screen.getByLabelText('Pay amount')).toHaveValue(receive);
  fireEvent.change(screen.getByLabelText('Pay amount'), { target: { value: '' } });
  fireEvent.click(screen.getByLabelText('Reverse swap direction'));
  expect(screen.getByLabelText('Pay amount')).toHaveValue('');
});
it('selects and searches pay and receive tokens, labels samples, and handles tiny quotes', async () => {
  await ready();
  fireEvent.click(screen.getByLabelText('Select pay token, ETH'));
  fireEvent.change(screen.getByLabelText('Search tokens'), { target: { value: 'USDC' } });
  expect(screen.getByRole('button', { name: 'Select USDC' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  fireEvent.change(screen.getByLabelText('Search tokens'), { target: { value: 'BTC' } });
  fireEvent.click(screen.getByRole('button', { name: 'Select BTC' }));
  expect(screen.getByText('Includes generated sample prices')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Select receive token, USDC'));
  fireEvent.change(screen.getByLabelText('Search tokens'), { target: { value: 'ETH' } });
  fireEvent.click(screen.getByRole('button', { name: 'Select ETH' }));
  fireEvent.click(screen.getByLabelText('Select pay token, BTC'));
  fireEvent.change(screen.getByLabelText('Search tokens'), { target: { value: 'USDC' } });
  fireEvent.click(screen.getByRole('button', { name: 'Select USDC' }));
  fireEvent.change(screen.getByLabelText('Pay amount'), { target: { value: '0.00000001' } });
  expect(screen.getByRole('alert')).toHaveTextContent('too small');
  expect(screen.getByRole('button', { name: 'Review swap' })).toBeDisabled();
  fireEvent.click(screen.getByLabelText('Select pay token, USDC'));
  fireEvent.click(screen.getByLabelText('Close token picker'));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
it('reviews and completes a demo swap with a single deduction', async () => {
  const dialog = await reviewSwap();
  expect(within(dialog).getByText('1 ETH')).toBeInTheDocument();
  expect(within(dialog).getByText('Based on the August 2023 snapshot.')).toBeInTheDocument();
  const confirm = screen.getByRole('button', { name: 'Confirm demo swap' });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(screen.getByRole('button', { name: 'Swapping…' })).toBeDisabled();
  expect(screen.getByLabelText('Close review')).toBeDisabled();
  expect(await screen.findByRole('alert')).toHaveTextContent('Your demo balances are updated');
  expect(screen.getByText('Balance: 1.5')).toBeInTheDocument();
  expect(screen.getByLabelText('Pay amount')).toHaveValue('');
  fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('cancels review without changing balances and supports keyboard submit', async () => {
  const user = userEvent.setup();
  await ready();
  await user.type(screen.getByLabelText('Pay amount'), '1{Enter}');
  expect(screen.getByRole('dialog', { name: 'Review your swap' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByText('Balance: 2.5')).toBeInTheDocument();
  expect(screen.getByLabelText('Pay amount')).toHaveValue('1');
});
it('shows a failed swap and allows a retry without losing input', async () => {
  server.use(
    http.post(
      '*/api/swaps',
      () => HttpResponse.json({ code: 'errors.unavailable' }, { status: 503 }),
      { once: true },
    ),
  );
  await reviewSwap();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm demo swap' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('The demo service is unavailable');
  expect(screen.getByRole('button', { name: 'Confirm demo swap' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm demo swap' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('demo balances are updated'),
  );
});
it('expires a review and prevents confirmation', async () => {
  await reviewSwap();
  const future = Date.now() + 61_000;
  vi.spyOn(Date, 'now').mockReturnValue(future);
  await waitFor(() => expect(screen.getByRole('timer')).toHaveTextContent('Quote expired'), {
    timeout: 3000,
  });
  expect(screen.getByRole('button', { name: 'Confirm demo swap' })).toBeDisabled();
  fireEvent.click(screen.getByLabelText('Close review'));
});
it('displays load errors and retries the API', async () => {
  server.use(
    http.get(
      '*/api/tokens',
      () => HttpResponse.json({ code: 'errors.priceUnavailable' }, { status: 503 }),
      { once: true },
    ),
  );
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('A valid price is unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByLabelText('Pay amount')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Refresh prices'));
  expect(screen.getByLabelText('Loading prices')).toBeInTheDocument();
  expect(await screen.findByLabelText('Pay amount')).toBeInTheDocument();
});
it('keeps fallback selections distinct if a default token is missing', async () => {
  server.use(
    http.get('*/api/tokens', () =>
      HttpResponse.json(data.filter((t) => ['USDC', 'BTC'].includes(t.currency))),
    ),
  );
  await ready();
  expect(screen.getByLabelText('Select pay token, USDC')).toBeInTheDocument();
  expect(screen.getByLabelText('Select receive token, BTC')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Pay amount'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review swap' }));
  expect(screen.getByText('Includes generated sample prices.')).toBeInTheDocument();
});
it('opens rate information from both entry points', async () => {
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'How it works' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('not live market rates');
  fireEvent.click(screen.getByLabelText('Close information'));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /About these rates/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
it('does not update after unmounting during a pending request', async () => {
  server.use(
    http.get('*/api/tokens', async () => {
      await delay(50);
      return HttpResponse.json(data);
    }),
  );
  const { unmount } = render(<App />);
  unmount();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 70));
  });
  expect(screen.queryByLabelText('Pay amount')).not.toBeInTheDocument();
});
