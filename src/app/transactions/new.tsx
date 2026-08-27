import { Screen } from '@/components/screen';
import { TransactionForm } from '@/components/transaction-form';

export default function NewTransactionScreen() {
  return (
    <Screen
      description="총액만 빠르게 기록하거나 상세 품목을 함께 저장하세요."
      title="거래 등록"
    >
      <TransactionForm />
    </Screen>
  );
}
