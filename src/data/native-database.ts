import * as SQLite from 'expo-sqlite';

import { DEFAULT_CATEGORIES } from '@/domain/category';

const LATEST_SCHEMA_VERSION = 3;

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

async function applyMigration(
  database: SQLite.SQLiteDatabase,
  version: number,
): Promise<void> {
  await database.withExclusiveTransactionAsync(async (transaction) => {
    if (version === 1) {
      await transaction.execAsync(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
          name TEXT NOT NULL,
          total_amount INTEGER NOT NULL CHECK (total_amount > 0),
          occurred_at TEXT NOT NULL,
          category_id TEXT NOT NULL,
          merchant_id TEXT,
          payment_method TEXT,
          memo TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transaction_items (
          id TEXT PRIMARY KEY NOT NULL,
          transaction_id TEXT NOT NULL,
          product_id TEXT NOT NULL,
          category_id TEXT,
          quantity REAL NOT NULL DEFAULT 1,
          unit_price INTEGER,
          total_price INTEGER NOT NULL,
          specification TEXT,
          memo TEXT,
          FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS transaction_items_transaction_id_idx
          ON transaction_items(transaction_id);
      `);
    }

    if (version === 2) {
      await transaction.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
          name TEXT NOT NULL,
          sort_order INTEGER NOT NULL,
          is_default INTEGER NOT NULL CHECK (is_default IN (0, 1)),
          is_active INTEGER NOT NULL CHECK (is_active IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          UNIQUE(type, name)
        );

        CREATE INDEX IF NOT EXISTS categories_type_sort_order_idx
          ON categories(type, sort_order);
      `);

      for (const category of DEFAULT_CATEGORIES) {
        await transaction.runAsync(
          `INSERT INTO categories (
            id, type, name, sort_order, is_default, is_active,
            created_at, updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO NOTHING`,
          category.id,
          category.type,
          category.name,
          category.sortOrder,
          category.isDefault ? 1 : 0,
          category.isActive ? 1 : 0,
          category.createdAt,
          category.updatedAt,
          category.deletedAt,
        );
      }
    }

    if (version === 3) {
      await transaction.execAsync(`
        CREATE TABLE IF NOT EXISTS merchants (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          normalized_name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS merchants_normalized_name_idx
          ON merchants(normalized_name);

        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          normalized_name TEXT NOT NULL,
          specification TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS products_normalized_name_idx
          ON products(normalized_name);
      `);
    }

    await transaction.execAsync(`PRAGMA user_version = ${version};`);
  });
}

async function openAndMigrateDatabase(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync('pocket-diary.db');
  await database.execAsync('PRAGMA foreign_keys = ON;');

  const result = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version;',
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion > LATEST_SCHEMA_VERSION) {
    throw new Error(
      `지원하지 않는 로컬 데이터베이스 버전입니다: ${currentVersion}`,
    );
  }

  for (
    let version = currentVersion + 1;
    version <= LATEST_SCHEMA_VERSION;
    version += 1
  ) {
    await applyMigration(database, version);
  }

  return database;
}

export function getNativeDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= openAndMigrateDatabase();
  return databasePromise;
}
