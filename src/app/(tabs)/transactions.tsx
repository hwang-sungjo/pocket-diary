import { PlaceholderCard } from '@/components/placeholder-card';
import { Screen } from '@/components/screen';

export default function TransactionsScreen() {
  return (
    <Screen description="일별·월별 거래를 확인하는 공간" title="내역">
      <PlaceholderCard title="거래 목록 준비 중">
        Day 1 범위에서는 화면 이동 경로만 구성했습니다. P0 거래 조회·수정·삭제가 이
        화면에 연결됩니다.
      </PlaceholderCard>
    </Screen>
  );
}

