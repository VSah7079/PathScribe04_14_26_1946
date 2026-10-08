// Batch 434: every outbound transaction type the browser can send is listed
// in docs/architecture/INTERFACE_TRANSACTIONS.md (the engine's routing list,
// PS-331) and accepted by the development receiver (functions/main.py). The
// receiver's list had stopped at ORDER_CREATED, refusing registry, print and
// alert messages; this keeps the three in step.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

function browserTypes(): string[] {
  const src = read('src/services/interfaceDispatch/dispatchInterfaceMessage.ts');
  const m = src.match(/export type InterfaceTransactionType =([^;]+);/);
  if (!m) throw new Error('InterfaceTransactionType not found');
  return [...m[1].matchAll(/'([A-Z0-9_]+)'/g)].map(x => x[1]).sort();
}

describe('interface transactions: browser, engine routing list, development receiver', () => {
  it('INTERFACE_TRANSACTIONS.md lists every type, and nothing else', () => {
    const doc = read('docs/architecture/INTERFACE_TRANSACTIONS.md');
    const block = doc.split('<!-- interface-transactions:start -->')[1]?.split('<!-- interface-transactions:end -->')[0] ?? '';
    const listed = [...block.matchAll(/^\| `([A-Z0-9_]+)` \|/gm)].map(x => x[1]).sort();
    expect(listed).toEqual(browserTypes());
  });

  it('functions/main.py accepts every type, and nothing else', () => {
    const py = read('functions/main.py');
    const m = py.match(/_VALID_TRANSACTION_TYPES = \{([^}]+)\}/);
    expect(m).toBeTruthy();
    const accepted = [...m![1].matchAll(/'([A-Z0-9_]+)'/g)].map(x => x[1]).sort();
    expect(accepted).toEqual(browserTypes());
  });
});
