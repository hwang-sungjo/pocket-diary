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
}

export const localCategoryRepository: CategoryRepository =
  new SQLiteCategoryRepository();
