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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function deleteTransaction() {
    if (!id) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await localTransactionRepository.delete(id);
      const deleted = await localTransactionRepository.findById(id);
      if (deleted) {
        throw new Error('삭제한 거래가 로컬 저장소에 남아 있습니다.');
      }
      router.replace('/transactions');
    } catch (cause) {
      setDeleteError(
        cause instanceof Error ? cause.message : '거래를 삭제하지 못했습니다.',
      );
      setDeleting(false);
    }
  }

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
          <Text accessibilityLiveRegion="assertive" style={styles.error}>
            {state.message}
          </Text>
          <AppButton onPress={() => router.replace('/transactions')} variant="secondary">
            내역으로 돌아가기
          </AppButton>
        </View>
      ) : null}

      {state.status === 'success' ? (
        <View style={styles.content}>
          <TransactionDetail
            aggregate={state.aggregate}
            categories={state.categories}
          />
          <View style={sharedStyles.card}>
            <Text style={sharedStyles.cardTitle}>거래 관리</Text>
            <View style={styles.actions}>
              <AppButton
                onPress={() =>
                  router.push({
                    pathname: '/transactions/[id]/edit',
                    params: { id: state.aggregate.transaction.id },
                  })
                }
                testID="edit-transaction"
                variant="secondary"
              >
                거래 수정
              </AppButton>
              <AppButton
                onPress={() => setConfirmingDelete(true)}
                testID="delete-transaction"
                variant="danger"
              >
                거래 삭제
              </AppButton>
            </View>

            {confirmingDelete ? (
              <View style={styles.deleteWarning} testID="delete-confirmation">
                <Text style={styles.deleteTitle}>
                  거래와 연결된 상세 품목을 모두 삭제할까요?
                </Text>
                <Text style={styles.deleteDescription}>
                  P0 로컬 모드에서는 삭제 후 되돌릴 수 없습니다.
                </Text>
                <View style={styles.actions}>
                  <AppButton
                    disabled={deleting}
                    onPress={() => setConfirmingDelete(false)}
                    variant="secondary"
                  >
                    취소
                  </AppButton>
                  <AppButton
                    loading={deleting}
                    onPress={() => void deleteTransaction()}
                    testID="confirm-delete-transaction"
                    variant="danger"
                  >
                    삭제 확인
                  </AppButton>
                </View>
              </View>
            ) : null}
            {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
          </View>
        </View>
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
    <View style={styles.detailContent} testID="saved-transaction-detail">
      <View style={sharedStyles.card}>
        {transaction.status === 'needs_confirmation' ? (
          <View style={styles.confirmationWarning} testID="confirmation-required">
            <Text style={styles.confirmationTitle}>금액 확인이 필요합니다.</Text>
            <Text style={styles.confirmationDescription}>
              반복 규칙이 만든 예정 거래입니다. 금액을 확인하고 거래를 수정·저장하면
              확정됩니다.
            </Text>
          </View>
        ) : null}
        <View style={styles.detailHeading}>
          <View style={styles.headingText}>
            <Text style={styles.type}>
              {transaction.type === 'expense' ? '지출' : '수입'} · {categoryName}
            </Text>
            <Text style={styles.name}>{transaction.name}</Text>
          </View>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.total}>
            {formatKRW(transaction.totalAmount)}원
          </Text>
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
                <Text adjustsFontSizeToFit numberOfLines={1} style={styles.itemPrice}>
                  {formatKRW(item.totalPrice)}원
                </Text>
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
  detailContent: {
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
    flexShrink: 1,
    fontSize: 24,
    fontWeight: '800',
    maxWidth: '100%',
    textAlign: 'right',
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
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
    maxWidth: '55%',
    textAlign: 'right',
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  deleteWarning: {
    backgroundColor: '#FEE4E2',
    borderRadius: 12,
    gap: 8,
    padding: 14,
  },
  deleteTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  deleteDescription: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  confirmationWarning: {
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
    gap: 5,
    padding: 12,
  },
  confirmationTitle: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  confirmationDescription: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
});
