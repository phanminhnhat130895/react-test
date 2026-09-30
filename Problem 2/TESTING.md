# Verification notes

## Automated checks

The unit/integration suite has 130 tests. V8 coverage with the language selector and locale-input handling:

| Metric     | Coverage |
| ---------- | -------: |
| Statements |   99.24% |
| Branches   |   97.95% |
| Functions  |     100% |
| Lines      |   99.70% |

All included application modules individually exceed 80% in all four categories. `vite.config.ts` enforces a minimum of 81% **per file**, including the data generator. The generated HTML report is `coverage/index.html` and machine-readable summary is `coverage/coverage-summary.json`. These files are regenerated with `npm run test:coverage`.

## Scenarios covered

| Area        | Checks                                                                                                                                                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Amounts     | Empty/whitespace, zero, negative, scientific notation, separators, multiple dots, NaN/infinity, extra decimal places, max balance, tiny amount, excessive amount, leading zeros, fractional input                                                                                                                         |
| Conversions | Decimal arithmetic, fee deduction, rounding down, zero output, invalid price, same-token rejection, balance arithmetic, rate formatting                                                                                                                                                                                   |
| Price data  | Invalid root/records, latest duplicate selection, missing icons, timestamp ties, case aliases, reproducible samples, asset copying                                                                                                                                                                                        |
| API         | Successful load/swap, rejected body, malformed JSON, invalid pair, expired/future/mismatched quote, overdraft, dust, idempotent retry, conflicting request IDs, non-JSON server failure, network failure, 10-second timeout                                                                                               |
| UI          | Loading, disabled CTA, error messages, 50%/MAX, reverse direction, search/no results, excluded counterpart token, sample labels, review/cancel, keyboard submit, pending confirmation, success balances, failed-swap retry, quote expiry, refresh, load retry, default-token fallback, info dialogs, unmount during fetch |
| Browser     | Full swap at desktop/mobile sizes, axe accessibility checks of the form/review/picker, console exceptions, viewport overflow, keyboard dismissal, missing-icon fallback, long symbols at 320px                                                                                                                            |
| Startup     | MSW starts before React; failed service-worker startup yields an actionable error                                                                                                                                                                                                                                         |

## JWT and i18n checks

JWT tests cover signed claims, missing/malformed headers, tampered payloads/signatures, another signing key, expiry, wrong algorithm/issuer/audience/subject/scope, future issue times, required claims, unauthorized requests before business logic, bearer headers on both API methods, single-retry limits, preserved swap request IDs, shared initialization/renewal, malformed session responses, and recovery after issuance failure. Startup tests verify MSW starts before JWT issuance and React renders only after the session is ready.

I18n tests cover complete English/Vietnamese/Japanese resources and interpolation parity, keyboard-accessible language selection, saved/invalid/blocked preferences, translated errors and success messages, preservation of form state and balances, Vietnamese decimal input, Japanese full-width digits, unsupported-language fallback, interpolation/plurals, document metadata, UTC dates, locale-aware currency/percent/decimal/rate formatting, exact balance precision, and typed error-code fallback. Browser tests also verify English metadata, startup token issuance, authorization headers, and 401/200 responses from protected routes. The multilingual flow verifies menu accessibility, a complete swap entered with a Vietnamese comma (including the canonical API payload), Japanese full-width input, saved preference after reload, translated metadata, 320px dialog layout, and accessibility scans in both desktop/mobile viewports.

## Browser environment

The ten Playwright checks run against a freshly generated **production build**, using installed Microsoft Edge (Chromium), desktop and iPhone viewport emulation. This does not imply physical iOS or cross-browser certification. The test report is in `playwright-report/index.html`; desktop/mobile screenshots are in `test-results/`.

MSW owns the API requests in these checks. The broken-icon test uses **browser-context routing**, which also catches the service worker's outgoing asset request. Accessibility scans wait for dialog and menu fades to finish so transient opacity does not create false contrast failures.

## Review boundaries

- This is a local simulation with historical and fictional prices, not a real exchange.
- Browser MSW state is in memory and resets on page reload; swaps are not persistent.
- Unit coverage excludes tests, erased types, and the minimal stylesheet/import/bootstrap entry point. Bootstrap behavior itself is covered. CSS is checked visually and through the browser scenarios rather than counted as JavaScript coverage.
- The mock validates requests independently of the UI, but client-controlled MSW is not a production security boundary.
- Dependency audit after updating the test runner reported zero known vulnerabilities.

Run `npm run test:coverage`, `npm run test:e2e`, `npm run build`, and `npm run format:check` to reproduce the checks.
