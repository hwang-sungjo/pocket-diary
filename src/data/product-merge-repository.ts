import type { ProductMergeRequest } from '@/domain/product-merge';

export interface ProductMergeResult {
  sourceItemCount: number;
  totalItemCount: number;
}

export interface ProductMergeRepository {
  merge(request: ProductMergeRequest): Promise<ProductMergeResult>;
}
