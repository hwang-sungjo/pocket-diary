import { router } from 'expo-router';

import { Screen } from '@/components/screen';
import { TransactionList } from '@/components/transaction-list';
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
      <TransactionList />
    </Screen>
  );
}
