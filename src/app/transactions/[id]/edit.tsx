import { useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/screen';
import { TransactionForm } from '@/components/transaction-form';

export default function EditTransactionScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <Screen
      description="저장된 거래와 상세 품목을 수정합니다."
      title="거래 수정"
    >
      {id ? <TransactionForm transactionId={id} /> : null}
    </Screen>
  );
}
