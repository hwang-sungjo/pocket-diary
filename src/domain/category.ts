import type { TransactionType } from '@/domain/transaction';

export type CategoryType = TransactionType;

export interface Category {
  id: string;
  type: CategoryType;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface DefaultCategoryDefinition {
  id: string;
  type: CategoryType;
  name: string;
  sortOrder: number;
}

const DEFAULT_CATEGORY_TIMESTAMP = '2026-08-24T00:00:00.000Z';

const DEFAULT_CATEGORY_DEFINITIONS: readonly DefaultCategoryDefinition[] = [
  { id: '0198d66a-0b81-7000-8000-000000000001', type: 'expense', name: '식비', sortOrder: 1 },
  { id: '0198d66a-0b81-7000-8000-000000000002', type: 'expense', name: '장보기', sortOrder: 2 },
  { id: '0198d66a-0b81-7000-8000-000000000003', type: 'expense', name: '주거·월세', sortOrder: 3 },
  { id: '0198d66a-0b81-7000-8000-000000000004', type: 'expense', name: '공과금', sortOrder: 4 },
  { id: '0198d66a-0b81-7000-8000-000000000005', type: 'expense', name: '통신', sortOrder: 5 },
  { id: '0198d66a-0b81-7000-8000-000000000006', type: 'expense', name: '교통', sortOrder: 6 },
  { id: '0198d66a-0b81-7000-8000-000000000007', type: 'expense', name: '생활용품', sortOrder: 7 },
  { id: '0198d66a-0b81-7000-8000-000000000008', type: 'expense', name: '의료·건강', sortOrder: 8 },
  { id: '0198d66a-0b81-7000-8000-000000000009', type: 'expense', name: '문화·여가', sortOrder: 9 },
  { id: '0198d66a-0b81-7000-8000-000000000010', type: 'expense', name: '쇼핑', sortOrder: 10 },
  { id: '0198d66a-0b81-7000-8000-000000000011', type: 'expense', name: '교육', sortOrder: 11 },
  { id: '0198d66a-0b81-7000-8000-000000000012', type: 'expense', name: '보험·금융', sortOrder: 12 },
  { id: '0198d66a-0b81-7000-8000-000000000013', type: 'expense', name: '기타 지출', sortOrder: 13 },
  { id: '0198d66a-0b81-7000-8000-000000000014', type: 'income', name: '월급', sortOrder: 1 },
  { id: '0198d66a-0b81-7000-8000-000000000015', type: 'income', name: '부수입', sortOrder: 2 },
  { id: '0198d66a-0b81-7000-8000-000000000016', type: 'income', name: '이자·배당', sortOrder: 3 },
  { id: '0198d66a-0b81-7000-8000-000000000017', type: 'income', name: '환급', sortOrder: 4 },
  { id: '0198d66a-0b81-7000-8000-000000000018', type: 'income', name: '기타 수입', sortOrder: 5 },
] as const;

export const DEFAULT_CATEGORIES: readonly Category[] =
  DEFAULT_CATEGORY_DEFINITIONS.map((category) => ({
    ...category,
    isDefault: true,
    isActive: true,
    createdAt: DEFAULT_CATEGORY_TIMESTAMP,
    updatedAt: DEFAULT_CATEGORY_TIMESTAMP,
    deletedAt: null,
  }));

export function sortCategories(categories: readonly Category[]): Category[] {
  return [...categories].sort(
    (left, right) =>
      (left.type === right.type ? 0 : left.type === 'expense' ? -1 : 1) ||
      left.sortOrder - right.sortOrder ||
      left.name.localeCompare(right.name, 'ko'),
  );
}
