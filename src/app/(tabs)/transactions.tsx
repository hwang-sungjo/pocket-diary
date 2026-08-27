import { router } from 'expo-router';

import { PlaceholderCard } from '@/components/placeholder-card';
import { Screen } from '@/components/screen';
import { AppButton } from '@/components/ui/app-button';

export default function TransactionsScreen() {
  return (
    <Screen
      action={
        <AppButton onPress={() => router.push('/transactions/new')}>
          새 거래
        </AppButton>
      }
      description="일별·월별 거래를 확인하는 공간"
      title="내역"
    >
      <PlaceholderCard title="거래 목록 준비 중">
        Day 3에서는 거래 등록과 저장 후 재조회를 연결했습니다. 월별 목록과 수정·삭제는
        Day 4에서 이 화면에 연결됩니다.
      </PlaceholderCard>
    </Screen>
  );
}
