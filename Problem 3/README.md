# Complete React wallet example

A runnable React + TypeScript refactor of the original wallet snippet. All components are functional. Both data hooks, row UI, styles, sample data, validation, HTTP transport, application entry point, and tests are included.

## Run

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. The default mode uses asynchronous sample data, so no backend, account, secrets, or setup is required. Sample quotes are illustrative, not market data.

```sh
npm test
npm run build
npm run preview
```

Verified on 2026-09-29: TypeScript check and production build passed; all 45 tests across 5 test files passed; npm audit reported zero known vulnerabilities. The build emits non-fatal Rollup notices about comments in the Zod dependency. Dependencies are pinned in package.json and package-lock.json.

## Files and responsibilities

```text
src/
  main.tsx                       React root and provider
  styles.css                     Responsive layout, table, focus styles
  api/
    demo.ts                      Cancellable sample data, including edge cases
    http.ts                      HTTP status checks, timeout, retry policy
    source.ts                    Demo/HTTP selection and account cache scope
    http.test.ts
  wallet/
    types.ts                     Explicit immutable data contracts
    validation.ts                Runtime validation at the API boundary
    format.ts                    Exact decimal arithmetic and display policy
    selectors.ts                 Filtering, deterministic sorting, quote valuation
    WalletProvider.tsx           Shared query cache and data-source context
    WalletPage.tsx               Loading/error/empty states and pagination
    WalletRow.tsx                Accessible table row
    hooks/
      useWalletBalances.ts       Shared, cancellable balance query
      usePrices.ts               Independently refreshed price query
      useNow.ts                  Quote expiration clock with cleanup
      useNow.test.tsx
    validation.test.ts
    selectors.test.ts
    WalletPage.test.tsx
  test/setup.ts
```

## What was wrong in the supplied code

| Original issue | Fix and reason |
| --- | --- |
| `lhsPriority` is undefined in the filter | Use one declared priority per balance. |
| `blockchain` is missing from `WalletBalance` | Define and validate the actual fields. |
| `amount <= 0` retains nonpositive balances | Explicit policy: show positive holdings only. Change the selector if debt positions belong on this page. |
| `formattedBalances` is calculated but unused | Prepare and consume formatted amounts in the same memoized pipeline. |
| Callback claims raw balances are formatted balances | Infer item types from actual prepared data; no assertions that fabricate properties. |
| Prices unnecessarily invalidate sorting | Balance preparation depends only on the balance array. |
| Helper uses `any` and is recreated inside the component | Typed module-level map; unknown chains are unsupported. |
| Priority is repeatedly calculated during comparisons | Store priority once per retained balance. |
| Comparator implicitly returns `undefined` on ties | Explicit numeric comparator with persistent ID tie-breaker. |
| Index is used as the React key | Use stable, validated, unique position IDs. |
| Missing prices become `NaN` | Explicit unavailable/stale/available states, with zero prices remaining valid. |
| Symbol-only prices can confuse distinct tokens | Match a canonical `assetId`; the symbol is only a display label. |
| `toFixed()` rounds all amounts to whole units | Preserve all accepted fractional digits. |
| JS numbers lose decimal precision | Require decimal strings and multiply with decimal.js. |
| Children are silently discarded | Render children. |
| Box props are spread onto a native div | Use native section props; no undefined Box library or classes object. |

Important distinctions: the original `filter(...).sort(...)` sorts a fresh array, not the original hook data. Mapping JSX during render is normal. `React.FC`, functional components, and a switch statement are not inherently inefficient. The missing hook implementations in the snippet do not prove that its original data-fetching behavior was wrong; this example supplies that missing behavior.

## Explicit behavior and edge cases

- **Filtering:** supported chains are Osmosis, Ethereum, Arbitrum, Zilliqa, and Neo, in the original priority order. Names are case-sensitive. Unknown chains, zero balances, and negative balances are excluded, with an excluded count. Empty source data is distinguished from data with no eligible holdings.
- **Stable identity:** `id` identifies a balance/position, including its wallet/account and asset. Multiple positions may use the same asset ID. IDs cannot be empty or duplicated. Do not generate random IDs while rendering.
- **Precision:** amount and price strings allow up to 18 integer and 18 fractional digits. Scientific notation, whitespace, NaN, infinity, numeric JSON values, excess precision, and negative prices are rejected. Balances may be negative but will be filtered. Products fit the 80-significant-digit arithmetic context. Input already rounded by a JS number cannot be recovered by converting it to a string later.
- **Formatting:** amounts are shown exactly without insignificant trailing zeros. USD uses an explicit en-US style, grouping separators, and half-up rounding to two decimal places. A positive value under one cent displays `<$0.01`; an actual zero quote displays `$0.00`.
- **Validation:** malformed payloads fail the entire response instead of silently presenting an incomplete portfolio as complete. Duplicate quote IDs, bad dates, and timestamps more than 60 seconds in the future fail validation. An invalid refresh preserves the previous successfully validated data with a warning.
- **Quote freshness:** each quote has its own `asOf` timestamp. Quotes older than two minutes are unavailable for valuation, even after a successful HTTP response. Expiration is reevaluated every second while active and when focus/visibility changes; browsers can delay timers in background tabs. This is a frontend display policy using the device clock.
- **Independent queries:** balances render while prices load, and remain visible if prices fail. A refresh error is distinguished from a first-load failure. Previous quotes can be used until their timestamps expire. Previously loaded balances are labeled after refresh failure and include the load time.
- **Networking:** a 10-second timeout, query cancellation, cleanup, shared requests/cache, background-tab polling suppression, reconnect/focus refetch, and bounded retries cover request lifecycle concerns. Only network failures, timeouts, HTTP 408/429, and 5xx responses are automatically retried, at most twice. Validation and other 4xx errors require a manual retry. The Refresh button retries both queries.
- **Offline:** the query library pauses network work while offline; the page shows that state and resumes when connectivity returns.
- **Performance:** unchanged JSON data benefits from the query library's structural sharing. Preparing `n` inputs and sorting `k` eligible rows costs approximately O(n + k log k) time and O(k) memory. Price or clock changes do not redo this preparation. Pagination bounds displayed rows to 50, with a clamped page when balances shrink; memoized rows receive stable references and primitive valuation props. Pagination does not eliminate the cost of downloading/preparing the full dataset.
- **Accessibility:** real table headers, a caption, keyboard-focusable horizontal scrolling, visible focus indicators, status/alert messages, and native buttons. Unknown prices are conveyed with text, not color alone.

## Connect a real API

Copy `.env.example` to `.env.local`, change `VITE_DATA_SOURCE=http`, set `VITE_API_BASE_URL`, and restart Vite. The repository does **not** include a backend. With the default base URL, a server must implement these endpoints:

`GET /api/wallet/balances`:

```json
[
  {
    "id": "wallet-1:ethereum:native",
    "assetId": "ethereum:native",
    "blockchain": "Ethereum",
    "currency": "ETH",
    "amount": "1.250000000000000001"
  }
]
```

`GET /api/prices`:

```json
[
  {
    "assetId": "ethereum:native",
    "usd": "2500.125",
    "asOf": "2026-09-29T08:00:00Z"
  }
]
```

The sample timestamp above is static; a real price service must supply the actual quote timestamp. Prices are keyed by asset ID internally after validation. A successful response is JSON with a 2xx status; an empty list is valid. The asset ID format is owned by the backend; choose a canonical chain + native token/contract identity, not a display symbol.

Requests send same-origin cookies. Authentication, account selection, CORS, and backend authorization must be implemented by the service; do not put secrets in Vite environment variables. When integrating login/account switching, pass the actual account/tenant scope to `createHttpSource` and remount `WalletProvider` with that scope as its React `key` to discard the old account cache and reset pagination. The demo's `current-session` scope is only for a single session without account switching.

The schema intentionally improves the original contract by adding `id`, `assetId`, and quote timestamps and changing amounts/prices to decimal strings. Update the producer or add an explicit adapter; do not cast the original numeric payload to these types.

## Scope and further scaling

This is a complete runnable frontend example, not a claim to handle every possible wallet system. It does not sign transactions, discover blockchain balances, supply live prices, or implement authentication. For large portfolios, move pagination/filtering to the API. If assets need more than 18 fractional digits, expand the validated numeric limits and arithmetic precision together. If your product includes debts, unsupported networks, custom locale/rounding rules, or streaming quotes, make those policies explicit before changing the selector or transport.

## References

- [React: useMemo and dependencies](https://react.dev/reference/react/useMemo)
- [React: list identity and keys](https://react.dev/learn/rendering-lists)
- [React: effect cleanup and request races](https://react.dev/reference/react/useEffect)
- [TanStack Query: cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)
- [TanStack Query: defaults and structural sharing](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
- [decimal.js: precision and rounding](https://mikemcl.github.io/decimal.js/)
