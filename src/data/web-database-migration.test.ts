import assert from 'node:assert/strict';
import { test } from 'node:test';

import 'fake-indexeddb/auto';

import { getWebDatabase } from '@/data/web-database';
import { createDayOneTestTransaction } from '@/domain/transaction';

async function createVersionOneDatabase(): Promise<void> {
  const fixture = createDayOneTestTransaction(
    new Date('2026-08-24T00:00:00.000Z'),
  );

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('pocket-diary', 1);

    request.addEventListener('upgradeneeded', () => {
      const database = request.result;
      const transactions = database.createObjectStore('transactions', {
        keyPath: 'id',
      });
      transactions.createIndex('by-occurred-at', 'occurredAt');

      const items = database.createObjectStore('transactionItems', {
        keyPath: 'id',
      });
      items.createIndex('by-transaction-id', 'transactionId');

      transactions.put(fixture.transaction);
    });
    request.addEventListener('success', () => {
      request.result.close();
      resolve();
    });
    request.addEventListener('error', () => reject(request.error));
  });
}

test('IndexedDB v1 거래를 보존하면서 v2 카테고리를 추가한다', async () => {
  await createVersionOneDatabase();

  const database = await getWebDatabase();
  const transactions = await database.getAll('transactions');
  const categories = await database.getAll('categories');

  assert.equal(database.version, 2);
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0]?.name, 'Day 1 로컬 저장 테스트');
  assert.equal(categories.length, 18);
});
