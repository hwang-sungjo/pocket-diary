import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Screen, sharedStyles } from '@/components/screen';
import { AppButton } from '@/components/ui/app-button';
import { colors } from '@/constants/theme';
import { localCategoryRepository } from '@/data/local-category-repository';
import { localTransactionRepository } from '@/data/local-transaction-repository';
import type { Category } from '@/domain/category';
import { formatKRW } from '@/domain/input-values';
import {
  calculateItemTotal,
  calculateUnclassifiedAmount,
  type TransactionAggregate,
} from '@/domain/transaction';

type DetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'success';
      aggregate: TransactionAggregate;
      categories: Category[];
    };

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function TransactionDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [state, setState] = useState<DetailState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    if (!id) {
      return () => {
        active = false;
      };
    }

    Promise.all([
      localTransactionRepository.findById(id),
      localCategoryRepository.list({ includeInactive: true }),
    ]).then(
      ([aggregate, categories]) => {
        if (!active) {
          return;
        }

        setState(
          aggregate
            ? { status: 'success', aggregate, categories }
            : { status: 'error', message: '저장된 거래를 찾지 못했습니다.' },
        );
      },
      (cause: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message:
              cause instanceof Error
                ? cause.message
                : '거래를 다시 조회하지 못했습니다.',
          });
        }
      },
    );

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <Screen
      action={
        <AppButton onPress={() => router.replace('/transactions/new')}>
          새 거래
        </AppButton>
      }
      description="로컬 저장소에서 거래와 상세 품목을 다시 조회했습니다."
      title="거래 상세"
    >
      {state.status === 'loading' ? (
        <View style={styles.status}>
          <ActivityIndicator color={colors.primary} />
          <Text style={sharedStyles.body}>저장된 거래를 불러오는 중입니다.</Text>
        </View>
      ) : null}

      {state.status === 'error' ? (
        <View style={sharedStyles.card}>
          <Text style={styles.error}>{state.message}</Text>
          <AppButton onPress={() => router.replace('/transactions')} variant="secondary">
            내역으로 돌아가기
          </AppButton>
        </View>
      ) : null}

      {state.status === 'success' ? (
        <TransactionDetail
          aggregate={state.aggregate}
          categories={state.categories}
        />
      ) : null}
    </Screen>
  );
}

function TransactionDetail({
  aggregate,
  categories,
}: {
  aggregate: TransactionAggregate;
  categories: Category[];
}) {
  const { transaction, items } = aggregate;
  const categoryName =
    categories.find(({ id }) => id === transaction.categoryId)?.name ??
    '알 수 없는 카테고리';
  const itemTotal = calculateItemTotal(items);
  const unclassifiedAmount = calculateUnclassifiedAmount(aggregate);

  return (
    <View style={styles.content} testID="saved-transaction-detail">
      <View style={sharedStyles.card}>
        <View style={styles.detailHeading}>
          <View style={styles.headingText}>
            <Text style={styles.type}>
              {transaction.type === 'expense' ? '지출' : '수입'} · {categoryName}
            </Text>
            <Text style={styles.name}>{transaction.name}</Text>
          </View>
          <Text style={styles.total}>{formatKRW(transaction.totalAmount)}원</Text>
        </View>
        <DetailRow
          label="일시"
          value={dateTimeFormatter.format(new Date(transaction.occurredAt))}
        />
        <DetailRow label="상점·수입처" value={transaction.merchantName ?? '—'} />
        <DetailRow label="결제 수단" value={paymentMethodLabel(transaction.paymentMethod)} />
        <DetailRow label="메모" value={transaction.memo ?? '—'} />
      </View>

      <View style={sharedStyles.card}>
        <View style={styles.itemsHeading}>
          <Text style={sharedStyles.cardTitle}>상세 품목</Text>
          <Text style={styles.itemCount} testID="saved-item-count">
            {items.length}개
          </Text>
        </View>
        {items.length === 0 ? (
          <Text style={sharedStyles.body}>저장된 상세 품목이 없습니다.</Text>
        ) : null}
        {items.map((item) => {
          const itemCategory = item.categoryId
            ? categories.find(({ id }) => id === item.categoryId)?.name
            : categoryName;
          return (
            <View key={item.id} style={styles.item}>
              <View style={styles.itemHeading}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemPrice}>{formatKRW(item.totalPrice)}원</Text>
              </View>
              <Text style={styles.itemMeta}>
                수량 {item.quantity}
                {item.unitPrice === null ? '' : ` · 단가 ${formatKRW(item.unitPrice)}원`}
                {item.specification ? ` · ${item.specification}` : ''}
              </Text>
              <Text style={styles.itemMeta}>카테고리 {itemCategory}</Text>
              {item.memo ? <Text style={styles.itemMeta}>{item.memo}</Text> : null}
            </View>
          );
        })}
        <View style={styles.amountSummary}>
          <DetailRow label="품목 합계" value={`${formatKRW(itemTotal)}원`} />
          <DetailRow
            label={unclassifiedAmount < 0 ? '초과 금액' : '미분류 금액'}
            value={`${formatKRW(Math.abs(unclassifiedAmount))}원`}
          />
        </View>
      </View>

      <AppButton onPress={() => router.replace('/transactions')} variant="secondary">
        내역으로 돌아가기
      </AppButton>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function paymentMethodLabel(paymentMethod: string | null): string {
  switch (paymentMethod) {
    case 'card':
      return '카드';
    case 'cash':
      return '현금';
    case 'transfer':
      return '계좌이체';
    case 'other':
      return '기타';
    default:
      return '—';
  }
}

const styles = StyleSheet.create({
  status: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  content: {
    gap: 20,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  detailHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
  },
  headingText: {
    flex: 1,
    gap: 5,
    minWidth: 180,
  },
  type: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  total: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  rowValue: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  itemsHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  itemCount: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  item: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 5,
    paddingTop: 12,
  },
  itemHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  itemName: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  itemPrice: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  itemMeta: {
    color: colors.muted,
    fontSize: 13,
  },
  amountSummary: {
    backgroundColor: colors.background,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
    padding: 12,
  },
});
