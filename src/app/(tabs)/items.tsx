import { PlaceholderCard } from '@/components/placeholder-card';
import { Screen } from '@/components/screen';

export default function ItemsScreen() {
  return (
    <Screen description="제품별 구매 이력과 가격을 찾는 공간" title="품목">
      <PlaceholderCard title="품목 검색 준비 중">
        거래와 상세 품목은 별도 엔티티로 저장하며, 품목 합계를 거래 총액과 중복 집계하지
        않습니다.
      </PlaceholderCard>
    </Screen>
  );
}

