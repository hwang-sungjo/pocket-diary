import type {
  CategoryListOptions,
  CategoryRepository,
} from '@/data/category-repository';
import { getWebDatabase } from '@/data/web-database';
import { sortCategories, type Category } from '@/domain/category';

class IndexedDbCategoryRepository implements CategoryRepository {
  async findById(id: string): Promise<Category | null> {
    const database = await getWebDatabase();
    return (await database.get('categories', id)) ?? null;
  }

  async list(options: CategoryListOptions = {}): Promise<Category[]> {
    const database = await getWebDatabase();
    const categories = options.type
      ? await database.getAllFromIndex('categories', 'by-type', options.type)
      : await database.getAll('categories');

    return sortCategories(
      categories.filter(
        (category) => options.includeInactive || category.isActive,
      ),
    );
  }
}

export const localCategoryRepository: CategoryRepository =
  new IndexedDbCategoryRepository();
