import { MonthlyStatisticsCard } from '@/components/monthly-statistics-card';
import { Screen } from '@/components/screen';

export default function StatsScreen() {
  return (
    <Screen description="월별 수입·지출·잔액을 확인하는 공간" title="통계">
      <MonthlyStatisticsCard showMonthNavigation />
    </Screen>
  );
}
