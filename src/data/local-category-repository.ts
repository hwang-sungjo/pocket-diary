import type {
  CategoryListOptions,
  CategoryRepository,
} from '@/data/category-repository';
import { getWebDatabase } from '@/data/web-database';
import { sortCategories, type Category, type CategoryOrderUpdate } from '@/domain/category';

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

  async save(category: Category): Promise<void> {
    const database = await getWebDatabase();
    await database.put('categories', category);
  }

  async setActive(
    id: string,
    isActive: boolean,
    updatedAt: string,
  ): Promise<void> {
    const database = await getWebDatabase();
    const category = await database.get('categories', id);

    if (!category) {
      throw new Error('변경할 카테고리를 찾지 못했습니다.');
    }

    await database.put('categories', {
      ...category,
      isActive,
      updatedAt,
      deletedAt: isActive ? null : updatedAt,
    });
  }

  async setSortOrders(
    updates: readonly CategoryOrderUpdate[],
    updatedAt: string,
  ): Promise<void> {
    const database = await getWebDatabase();
    const transaction = database.transaction('categories', 'readwrite');
    try {
      for (const update of updates) {
        const category = await transaction.store.get(update.id);
        if (!category) {
          throw new Error('순서를 변경할 카테고리를 찾지 못했습니다.');
        }
        await transaction.store.put({
          ...category,
          sortOrder: update.sortOrder,
          updatedAt,
        });
      }
      await transaction.done;
    } catch (cause) {
      try {
        transaction.abort();
      } catch {
        // The transaction may already have aborted after a failed request.
      }
      await transaction.done.catch(() => undefined);
      throw cause;
    }
  }
}

export const localCategoryRepository: CategoryRepository =
  new IndexedDbCategoryRepository();
