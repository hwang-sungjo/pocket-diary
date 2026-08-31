import type {
  CategoryListOptions,
  CategoryRepository,
} from '@/data/category-repository';
import { getNativeDatabase } from '@/data/native-database';
import type { Category, CategoryType } from '@/domain/category';

interface CategoryRow {
  id: string;
  type: CategoryType;
  name: string;
  sort_order: number;
  is_default: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    sortOrder: row.sort_order,
    isDefault: row.is_default === 1,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

class SQLiteCategoryRepository implements CategoryRepository {
  async findById(id: string): Promise<Category | null> {
    const database = await getNativeDatabase();
    const row = await database.getFirstAsync<CategoryRow>(
      'SELECT * FROM categories WHERE id = ?',
      id,
    );

    return row ? toCategory(row) : null;
  }

  async list(options: CategoryListOptions = {}): Promise<Category[]> {
    const database = await getNativeDatabase();
    const conditions: string[] = [];
    const parameters: string[] = [];

    if (!options.includeInactive) {
      conditions.push('is_active = 1');
    }

    if (options.type) {
      conditions.push('type = ?');
      parameters.push(options.type);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await database.getAllAsync<CategoryRow>(
      `SELECT * FROM categories ${where} ORDER BY sort_order, name`,
      ...parameters,
    );

    return rows.map(toCategory);
  }

  async save(category: Category): Promise<void> {
    const database = await getNativeDatabase();
    await database.runAsync(
      `INSERT INTO categories (
        id, type, name, sort_order, is_default, is_active,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        name = excluded.name,
        sort_order = excluded.sort_order,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at`,
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

  async setActive(
    id: string,
    isActive: boolean,
    updatedAt: string,
  ): Promise<void> {
    const database = await getNativeDatabase();
    const result = await database.runAsync(
      `UPDATE categories
       SET is_active = ?, updated_at = ?, deleted_at = ?
       WHERE id = ?`,
      isActive ? 1 : 0,
      updatedAt,
      isActive ? null : updatedAt,
      id,
    );

    if (result.changes === 0) {
      throw new Error('변경할 카테고리를 찾지 못했습니다.');
    }
  }
}

export const localCategoryRepository: CategoryRepository =
  new SQLiteCategoryRepository();
