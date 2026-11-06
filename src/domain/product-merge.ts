import { normalizeLookupValue } from '@/domain/autocomplete';
import { productIdentityKey } from '@/domain/product-history';

export interface ProductIdentity {
  name: string;
  specification: string | null;
}

export interface ProductMergeRequest {
  source: ProductIdentity;
  target: ProductIdentity;
  newProductId: string;
  updatedAt: string;
}

export interface ProductMergePlan {
  sourceKey: string;
  targetKey: string;
  targetName: string;
  targetSpecification: string | null;
}

export function prepareProductMerge(request: ProductMergeRequest): ProductMergePlan {
  const sourceName = request.source.name.trim().replace(/\s+/g, ' ');
  const targetName = request.target.name.trim().replace(/\s+/g, ' ');
  const targetSpecification =
    request.target.specification?.trim().replace(/\s+/g, ' ') || null;
  if (!sourceName || !targetName || !request.newProductId.trim()) {
    throw new Error('병합할 제품을 올바르게 선택해 주세요.');
  }
  if (
    normalizeLookupValue(request.source.specification ?? '') !==
    normalizeLookupValue(request.target.specification ?? '')
  ) {
    throw new Error('규격이 다른 제품은 병합할 수 없습니다.');
  }

  const sourceKey = productIdentityKey(sourceName, request.source.specification);
  const targetKey = productIdentityKey(targetName, targetSpecification);
  if (sourceKey === targetKey) {
    throw new Error('같은 제품은 병합할 수 없습니다.');
  }

  return { sourceKey, targetKey, targetName, targetSpecification };
}
