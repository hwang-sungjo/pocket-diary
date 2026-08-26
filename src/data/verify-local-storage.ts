import type { TransactionRepository } from '@/data/transaction-repository';
import {
  createDayOneTestTransaction,
  DAY_ONE_TEST_TRANSACTION_ID,
  type TransactionAggregate,
} from '@/domain/transaction';

export async function verifyLocalStorage(
  repository: TransactionRepository,
): Promise<TransactionAggregate> {
  const testTransaction = createDayOneTestTransaction();

  await repository.save(testTransaction);
  const savedTransaction = await repository.findById(DAY_ONE_TEST_TRANSACTION_ID);

  if (!savedTransaction) {
    throw new Error('저장한 테스트 거래를 다시 조회하지 못했습니다.');
  }

  if (
    savedTransaction.transaction.totalAmount !==
    testTransaction.transaction.totalAmount
  ) {
    throw new Error('조회한 테스트 거래의 금액이 저장한 값과 다릅니다.');
  }

  return savedTransaction;
}

