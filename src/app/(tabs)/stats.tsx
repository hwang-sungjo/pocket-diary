import { PlaceholderCard } from '@/components/placeholder-card';
import { Screen } from '@/components/screen';

export default function StatsScreen() {
  return (
    <Screen description="월별 수입·지출·잔액을 확인하는 공간" title="통계">
      <PlaceholderCard title="통계 준비 중">
        분류된 품목 금액과 미분류 거래 금액만 합산하여 이중 집계를 방지할 예정입니다.
      </PlaceholderCard>
    </Screen>
  );
}

