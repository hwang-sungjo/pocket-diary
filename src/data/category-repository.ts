import type { Category, CategoryType } from '@/domain/category';

export interface CategoryListOptions {
  type?: CategoryType;
  includeInactive?: boolean;
}

export interface CategoryRepository {
  findById(id: string): Promise<Category | null>;
  list(options?: CategoryListOptions): Promise<Category[]>;
  save(category: Category): Promise<void>;
  setActive(id: string, isActive: boolean, updatedAt: string): Promise<void>;
}
