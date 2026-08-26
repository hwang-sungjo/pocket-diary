import type { TransactionAggregate } from '@/domain/transaction';

export interface TransactionRepository {
  save(aggregate: TransactionAggregate): Promise<void>;
  findById(id: string): Promise<TransactionAggregate | null>;
  list(): Promise<TransactionAggregate[]>;
}

