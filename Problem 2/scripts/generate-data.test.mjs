import { describe, it, expect } from 'vitest';
import { buildDataset, samplePrice, generate } from './generate-data.mjs';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
describe('local dataset generation', () => {
  it('writes a reproducible local dataset and copies only SVG assets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'demo-swap-data-test-'));
    try {
      await mkdir(join(root, 'public/data'), { recursive: true });
      await mkdir(join(root, 'icons'));
      await writeFile(
        join(root, 'public/data/prices.original.json'),
        JSON.stringify([{ currency: 'ETH', price: 1600, date: '2023-08-29' }]),
      );
      await writeFile(join(root, 'icons/BTC.svg'), '<svg/>');
      await writeFile(join(root, 'icons/ignore.txt'), 'ignore');
      await generate(join(root, 'icons'), root);
      const result = JSON.parse(await readFile(join(root, 'src/data/prices.json'), 'utf8'));
      expect(result).toHaveLength(2);
      expect(await readFile(join(root, 'public/tokens/BTC.svg'), 'utf8')).toBe('<svg/>');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it('generates positive repeatable sample prices', () => {
    expect(samplePrice('BTC')).toBe(26000);
    expect(samplePrice('ADA')).toBe(0.26);
    expect(samplePrice('EXAMPLE')).toBe(samplePrice('EXAMPLE'));
    expect(samplePrice('EXAMPLE')).toBeGreaterThan(0);
  });
  it('uses latest records, last tie, preserves case aliases, and adds missing icons', () => {
    const row = { currency: 'ETH', date: '2023-08-29', price: 1600 };
    const output = buildDataset(
      [
        row,
        { ...row, price: 1700 },
        { ...row, date: '2023-08-28', price: 2 },
        { ...row, currency: 'STETH' },
        { ...row, currency: 'NOICON' },
        null,
        {},
        { ...row, price: -1 },
        { ...row, date: 'bad' },
      ],
      ['ETH.svg', 'stETH.svg', 'BTC.svg', 'ADA.svg', 'ZZZ.svg'],
    );
    expect(output.filter((t) => t.currency.toLowerCase() === 'steth')).toHaveLength(1);
    expect(output.find((t) => t.currency === 'STETH').icon).toBe('/tokens/stETH.svg');
    expect(output.find((t) => t.currency === 'ETH')).toMatchObject({
      price: 1700,
      source: 'snapshot',
      name: 'Ethereum',
    });
    expect(output.find((t) => t.currency === 'NOICON').icon).toBeNull();
    expect(output.find((t) => t.currency === 'BTC')).toMatchObject({
      source: 'sample',
      balance: '0.05000000',
    });
    expect(output.find((t) => t.currency === 'ZZZ').name).toBe('ZZZ');
  });
});
