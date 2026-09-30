import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const names = {
  ETH: 'Ethereum',
  BTC: 'Bitcoin',
  USDC: 'USD Coin',
  USDT: 'Tether',
  SOL: 'Solana',
  BNB: 'BNB',
  ATOM: 'Cosmos',
  SWTH: 'Switcheo',
  AVAX: 'Avalanche',
  ADA: 'Cardano',
  DOGE: 'Dogecoin',
  DOT: 'Polkadot',
  XRP: 'XRP',
  LINK: 'Chainlink',
  DAI: 'Dai',
  MATIC: 'Polygon',
  WBTC: 'Wrapped Bitcoin',
  WETH: 'Wrapped Ether',
  UNI: 'Uniswap',
};
export function samplePrice(symbol) {
  const known = {
    BTC: 26000,
    ADA: 0.26,
    DOGE: 0.063,
    AVAX: 10.5,
    DOT: 4.6,
    XRP: 0.52,
    LINK: 6.1,
    DAI: 1,
  };
  let hash = 0;
  for (const char of symbol) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return known[symbol] ?? Number((0.01 + (hash % 150000) / 1000).toFixed(3));
}
export function buildDataset(raw, iconFiles) {
  const icons = new Map(iconFiles.map((file) => [basename(file, '.svg'), file]));
  const lowerIcons = new Map([...icons].map(([key, file]) => [key.toLowerCase(), file]));
  const prices = new Map();
  for (const entry of raw) {
    if (
      !entry ||
      typeof entry.currency !== 'string' ||
      !entry.currency.trim() ||
      !Number.isFinite(entry.price) ||
      entry.price <= 0 ||
      !Number.isFinite(Date.parse(entry.date))
    )
      continue;
    const old = prices.get(entry.currency);
    // Latest timestamp wins; the last feed entry breaks timestamp ties.
    if (!old || Date.parse(entry.date) >= Date.parse(old.date))
      prices.set(entry.currency, { ...entry, source: 'snapshot' });
  }
  for (const symbol of icons.keys()) {
    if (![...prices.keys()].some((key) => key.toLowerCase() === symbol.toLowerCase()))
      prices.set(symbol, {
        currency: symbol,
        date: '2023-08-29T00:00:00.000Z',
        price: samplePrice(symbol),
        source: 'sample',
      });
  }
  const priority = ['ETH', 'USDC', 'BTC', 'SOL', 'USDT', 'ATOM', 'SWTH'];
  return [...prices.values()]
    .map((row) => ({
      ...row,
      name: names[row.currency] ?? row.currency,
      icon: lowerIcons.has(row.currency.toLowerCase())
        ? '/tokens/' + lowerIcons.get(row.currency.toLowerCase())
        : null,
      balance:
        { ETH: '2.50000000', USDC: '5000.00000000', BTC: '0.05000000' }[row.currency] ??
        (2500 / row.price).toFixed(8),
    }))
    .sort((a, b) => {
      const rank = (symbol) => (priority.includes(symbol) ? priority.indexOf(symbol) : 100);
      return rank(a.currency) - rank(b.currency) || a.currency.localeCompare(b.currency);
    });
}
export async function generate(
  iconDirectory = process.argv[2] ?? 'E:/Test/token-icons/tokens',
  root = process.cwd(),
) {
  const raw = JSON.parse(await readFile(join(root, 'public/data/prices.original.json'), 'utf8'));
  const files = (await readdir(iconDirectory)).filter((file) => file.endsWith('.svg'));
  const dataset = buildDataset(raw, files);
  await mkdir(join(root, 'public/tokens'), { recursive: true });
  await mkdir(join(root, 'src/data'), { recursive: true });
  await Promise.all(
    files.map((file) => copyFile(join(iconDirectory, file), join(root, 'public/tokens', file))),
  );
  await writeFile(join(root, 'src/data/prices.json'), JSON.stringify(dataset, null, 2) + '\n');
  console.log(
    `Generated ${dataset.length} tokens: ${dataset.filter((t) => t.source === 'snapshot').length} snapshot, ${dataset.filter((t) => t.source === 'sample').length} sample.`,
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await generate();
