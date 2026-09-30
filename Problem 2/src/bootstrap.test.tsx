import { http, HttpResponse } from 'msw';
import { server } from './test/setup';
const { start, renderApp, setupWorker } = vi.hoisted(() => ({
  start: vi.fn(),
  renderApp: vi.fn(),
  setupWorker: vi.fn(),
}));
vi.mock('msw/browser', () => ({
  setupWorker: (...args: unknown[]) => {
    setupWorker(...args);
    return { start };
  },
}));
vi.mock('react-dom/client', () => ({ createRoot: () => ({ render: renderApp }) }));
import { bootstrap } from './bootstrap';
beforeEach(() => {
  renderApp.mockClear();
});
it('starts MSW before rendering React', async () => {
  start.mockResolvedValue(undefined);
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  await bootstrap(document.createElement('div'));
  expect(start).toHaveBeenCalledWith(expect.objectContaining({ onUnhandledRequest: 'bypass' }));
  expect(setupWorker).toHaveBeenCalled();
  expect(renderApp).toHaveBeenCalled();
  expect(fetchSpy.mock.calls[0][0].toString()).toContain('/api/auth/token');
  expect(start.mock.invocationCallOrder[0]).toBeLessThan(fetchSpy.mock.invocationCallOrder[0]);
  expect(fetchSpy.mock.invocationCallOrder[0]).toBeLessThan(renderApp.mock.invocationCallOrder[0]);
});
it('shows an actionable startup error when service workers fail', async () => {
  start.mockRejectedValue(new Error('blocked'));
  const element = document.createElement('div');
  await bootstrap(element);
  expect(element).toHaveAttribute('role', 'alert');
  expect(element.textContent).toContain('localhost or HTTPS');
});

it('does not render the app when startup JWT issuance fails', async () => {
  start.mockResolvedValue(undefined);
  server.use(
    http.post('*/api/auth/token', () =>
      HttpResponse.json({ code: 'errors.unauthorized' }, { status: 401 }),
    ),
  );
  const element = document.createElement('div');
  await bootstrap(element);
  expect(renderApp).not.toHaveBeenCalled();
  expect(element).toHaveAttribute('role', 'alert');
  expect(element).toHaveTextContent('Your demo session could not be verified');
});
