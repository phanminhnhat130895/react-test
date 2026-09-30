import { i18n } from './i18n';
import { getSessionToken } from './session';
import { errorCode } from './errors';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
export async function bootstrap(element: HTMLElement) {
  try {
    // This app is intentionally a standalone demo, including production previews.
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    });
    await getSessionToken();
    createRoot(element).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    element.textContent = i18n.t(errorCode(error, 'errors.startup'));
    element.setAttribute('role', 'alert');
  }
}
