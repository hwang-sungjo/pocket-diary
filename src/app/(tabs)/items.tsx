import { ProductHistoryList } from '@/components/product-history-list';
import { Screen } from '@/components/screen';

export default function ItemsScreen() {
  return (
    <Screen description="제품별 구매 이력과 가격을 찾는 공간" title="품목">
      <ProductHistoryList />
    </Screen>
  );
}
