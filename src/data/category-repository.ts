import type { Category, CategoryType } from '@/domain/category';

export interface CategoryListOptions {
  type?: CategoryType;
  includeInactive?: boolean;
}

export interface CategoryRepository {
  findById(id: string): Promise<Category | null>;
  list(options?: CategoryListOptions): Promise<Category[]>;
}
