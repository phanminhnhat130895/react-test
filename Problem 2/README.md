# Demo Swap · Currency swap

A responsive React + TypeScript currency-swap demo using Material UI, Vite, and Mock Service Worker. The supplied destination was empty, so the interface is an original Material Design implementation.

## Run

Requires Node.js 22.12+ (or a supported newer LTS).

```sh
npm ci
npm run dev
```

Open the localhost address printed by Vite. MSW also runs in the production preview, because this submission is intentionally a standalone demo:

```sh
npm run build
npm run preview
```

Use localhost or HTTPS; browsers require a secure context for service workers. All fonts, token images, and prices are included locally. No external API or wallet connection is needed at runtime. The host's npm PowerShell launcher was broken during development; if that occurs on this machine, use the installed CLI directly, e.g. `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev`.

## Features

- Search 534 tokens by name or symbol, with local icons and a text fallback.
- Live receive estimate, precise decimal math, a disclosed 0.3% simulated fee, 50%/MAX shortcuts, and direction reversal.
- Validation for empty, zero, negative, malformed, scientific-notation, over-precision, over-balance, excessive, and dust amounts.
- Review before confirmation, a 60-second quote lifetime, loading/error/retry states, duplicate-submission protection, and updated demo balances.
- Responsive layouts, labeled inputs, keyboard-accessible MUI dialogs and tooltips, screen-reader error announcements, and reduced-motion support.
- Explicit historical/sample pricing labels. This is a practice wallet; a page reload resets its balances.

## Data provenance

`public/data/prices.original.json` is the unmodified download from [Switcheo's supplied endpoint](https://interview.switcheo.com/prices.json), downloaded September 30, 2026. **The feed itself is dated August 29, 2023. These are not current prices.**

`src/data/prices.json` is the generated local dataset served by MSW. It contains 32 currencies from the feed and 502 generated sample currencies. Duplicate feed records resolve to the latest timestamp; the last record wins timestamp ties. Non-positive or malformed prices are omitted. Case-insensitive matching maps feed aliases to existing icon filenames without adding duplicate aliases.

Missing icon-library currencies receive deterministic, positive **fictional** prices. A few recognizable tokens use illustrative fixed values; the rest use a stable symbol hash. Each record has a `source` field (`snapshot` or `sample`). Sample values are labeled in the picker, market panel, form, and review. No random prices or fabricated market changes are presented as live information.

The original token SVG files are copied from `E:\Test\token-icons\tokens` to `public/tokens`. Regenerate the dataset/assets from that library with:

```sh
npm run data:generate
# Or supply a different icon directory:
npm run data:generate -- "path/to/tokens"
```

## Architecture

| File                        | Responsibility                                                         |
| --------------------------- | ---------------------------------------------------------------------- |
| `src/App.tsx`               | Swap state, loading/retry, token selection, review and confirmation    |
| `src/components/`           | Reusable amount fields, token picker/avatar and market panel           |
| `src/domain.ts`             | Decimal conversions, validation, formatting and response normalization |
| `src/api.ts`                | Real fetch calls to the mock API, bounded by a 10-second timeout       |
| `src/mocks/handlers.ts`     | Stateful mock prices/balances, request validation and idempotent swaps |
| `src/bootstrap.tsx`         | Starts MSW, initializes JWT, then mounts React                         |
| `scripts/generate-data.mjs` | Reproducible dataset and icon generation                               |

MSW intercepts `GET /api/tokens` and `POST /api/swaps` in both the browser and tests. The mock API independently rechecks the balance, token pair, amount, expiration and quoted receive amount. Retrying the same request ID returns the original result; reusing it with different content is rejected. UI controls prevent edits during confirmation. Session state is in memory, with no persistence or chain transaction.

Decimal.js uses 50 significant digits and rounds down to 8 decimal places. The receive calculation is `amount × payPrice ÷ receivePrice × (1 − 0.003)`. Input is limited to 8 decimal places and 1 trillion units. Direction reversal copies the current receive estimate as the new pay amount, then recalculates and revalidates; the fee means it is not a lossless round trip. Balances are illustrative and have no real value.

Additional modules: `src/http.ts` handles transport/timeouts, `src/session.ts` owns the in-memory JWT lifecycle, `src/mocks/auth.ts` signs/verifies tokens and wraps protected routes, `src/errors.ts` defines stable error codes, and `src/i18n/` contains bundled translations, saved language preferences, configuration, key types and formatting helpers.

## Verification

```sh
npm run test:coverage
npm run test:e2e
npm run build
npm run format:check
```

- Vitest + React Testing Library + MSW cover the domain, API, mock handlers, app interactions, components, startup, and data generation.
- Coverage enforces **greater than 80% in statements, branches, functions and lines for every application module**. Only the import-only entry point, erased TypeScript interfaces, and tests are excluded. HTML and JSON reports are generated under `coverage/`.
- Playwright checks desktop, emulated mobile, and 320px widths, including successful swaps, invalid balances, token search, direction reversal, broken icons, long symbols, and accessibility scans using axe. Screenshots and traces are saved for failures; the HTML report is in `playwright-report/`.
- The browser suite defaults to installed Microsoft Edge. To use another supported installed channel, set `PLAYWRIGHT_CHANNEL=chrome`; for example `$env:PLAYWRIGHT_CHANNEL='chrome'` in PowerShell before running the tests. Mobile tests use Chromium device emulation, not a physical iOS browser.

This app deliberately uses local historical/sample data. It does not model on-chain gas, liquidity, slippage, wallet signing, or production trading infrastructure.

## Internationalization

English, Vietnamese and Japanese are available from the globe menu in the header. The accessible MUI menu displays native language names and marks the active choice; compact labels keep it usable on narrow screens. The selected language is saved in localStorage and restored on reload, with English as the default/fallback. Blocked storage does not prevent switching. The app uses i18next and react-i18next with bundled resources in `src/i18n/locales/`; no translation network calls are needed. All interface text, accessibility labels, errors, and success messages use semantic translation keys. The product name and asset names/symbols remain unchanged.

`src/i18n/i18next.d.ts` type-checks translation keys against the English resource. Messages interpolate complete sentences and use i18next plural forms. Error state contains stable codes rather than translated strings, so messages can be retranslated when the active language changes. The mock API returns `{ code: "errors.…" }`, which the client validates before rendering a translation.

`src/i18n/format.ts` centralizes locale-aware USD, percentage, decimal, rate, and date formatting. Decimal balances stay strings to avoid precision loss. Historical dates use UTC to avoid shifting a day in other time zones. English uses en-US formatting. Vietnamese displays decimal commas and accepts comma or dot decimal input; Japanese full-width digits and decimal points are normalized. Grouping separators are not stripped. Internal amounts and request bodies retain canonical dot decimals with full precision. Switching languages preserves the amount, selected tokens, and balances. The page title, description, language and direction update immediately. Vietnamese Inter font subsets are bundled; Japanese uses system sans-serif fonts.

To add a language:

1. Copy `src/i18n/locales/en.json` to the new locale and translate its values, preserving interpolation names and plural suffixes.
2. Import it into the `resources` object in `src/i18n/index.ts`. Supported language codes are derived from that object; English remains the fallback.
3. Register its native label and compact code in `src/i18n/preferences.ts`; the existing selector and preference persistence then handle it automatically.
4. Add locale tests, check any additional plural forms and keyboard conventions, and verify translated layouts. Resource tests enforce matching keys and interpolation variables. Do not send localized numbers to the API.

## Mock JWT sessions

Startup order is **MSW → POST /api/auth/token → React → protected API calls**. The token endpoint issues an anonymous demo-wallet JWT using jose and HS256, with a fresh in-memory signing key and a 15-minute lifetime. It is public by design; no real identity or password is verified. The response disables caching.

The client keeps the JWT in memory, attaches `Authorization: Bearer <token>` to prices and swaps, and shares in-flight token issuance across concurrent requests. It renews five seconds before expiry, or once after a 401. A retried swap retains its request ID and body for idempotency. There is no token in localStorage or sessionStorage.

`src/mocks/auth.ts` provides the shared `withAuth` verification layer. Both business routes reject missing, malformed, tampered, expired, wrongly signed, or incorrectly scoped tokens before processing a request. Verification restricts HS256 and checks issuer, audience, subject, issue time, expiry, JWT type, scope, and required claims. Public assets and the token-issuance route do not require authorization.

MSW is client-controlled demo infrastructure, **not a production authentication boundary**. In production, token issuance and verification belong on a trusted server, with real identity checks and appropriate key management. Do not reuse this anonymous token endpoint as a production login flow.
