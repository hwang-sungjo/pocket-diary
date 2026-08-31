import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { sharedStyles } from '@/components/screen';
import { AppButton } from '@/components/ui/app-button';
import { colors } from '@/constants/theme';
import { localCategoryRepository } from '@/data/local-category-repository';
import { localTransactionRepository } from '@/data/local-transaction-repository';
import type { Category } from '@/domain/category';
import { formatKRW } from '@/domain/input-values';
import type { TransactionAggregate } from '@/domain/transaction';
import {
  filterTransactionsByMonth,
  formatMonthLabel,
  groupTransactionsByDate,
  shiftMonth,
  toMonthKey,
} from '@/domain/transaction-query';

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});

export function TransactionList() {
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [aggregates, setAggregates] = useState<TransactionAggregate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      Promise.all([
        localTransactionRepository.list(),
        localCategoryRepository.list({ includeInactive: true }),
      ]).then(
        ([nextAggregates, nextCategories]) => {
          if (active) {
            setAggregates(nextAggregates);
            setCategories(nextCategories);
            setError(null);
            setLoading(false);
          }
        },
        (cause: unknown) => {
          if (active) {
            setError(
              cause instanceof Error
                ? cause.message
                : '거래 목록을 불러오지 못했습니다.',
            );
            setLoading(false);
          }
        },
      );

      return () => {
        active = false;
      };
    }, []),
  );

  const groups = useMemo(
    () =>
      groupTransactionsByDate(filterTransactionsByMonth(aggregates, month)),
    [aggregates, month],
  );
  const categoryNames = useMemo(
    () => new Map(categories.map(({ id, name }) => [id, name])),
    [categories],
  );

  return (
    <View style={styles.container} testID="transaction-list">
      <View style={styles.monthNavigation}>
        <AppButton
          accessibilityLabel="이전 달"
          onPress={() => setMonth((current) => shiftMonth(current, -1))}
          variant="secondary"
        >
          ‹
        </AppButton>
        <Text style={styles.month} testID="selected-month">
          {formatMonthLabel(month)}
        </Text>
        <AppButton
          accessibilityLabel="다음 달"
          onPress={() => setMonth((current) => shiftMonth(current, 1))}
          variant="secondary"
        >
          ›
        </AppButton>
      </View>

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator color={colors.primary} />
          <Text style={sharedStyles.body}>거래를 불러오는 중입니다.</Text>
        </View>
      ) : null}

      {error ? (
        <Text
          accessibilityLiveRegion="assertive"
          style={styles.error}
          testID="transaction-list-error"
        >
          {error}
        </Text>
      ) : null}

      {!loading && !error && groups.length === 0 ? (
        <View style={sharedStyles.card}>
          <Text style={sharedStyles.cardTitle}>거래가 없습니다</Text>
          <Text style={sharedStyles.body}>
            선택한 달에 저장된 거래가 없습니다.
          </Text>
        </View>
      ) : null}

      {groups.map((group) => (
        <View key={group.dateKey} style={styles.group}>
          <Text style={styles.date}>
            {dateFormatter.format(new Date(`${group.dateKey}T12:00:00`))}
          </Text>
          <View style={styles.rows}>
            {group.transactions.map((aggregate) => {
              const { transaction, items } = aggregate;
              return (
                <Pressable
                  accessibilityLabel={`${transaction.name}, ${transaction.type === 'expense' ? '지출' : '수입'} ${formatKRW(transaction.totalAmount)}원`}
                  accessibilityRole="button"
                  key={transaction.id}
                  onPress={() =>
                    router.push({
                      pathname: '/transactions/[id]',
                      params: { id: transaction.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.transaction,
                    pressed && styles.pressed,
                  ]}
                  testID={`transaction-row-${transaction.id}`}
                >
                  <View style={styles.transactionText}>
                    <Text style={styles.transactionName}>{transaction.name}</Text>
                    {transaction.status === 'needs_confirmation' ? (
                      <Text style={styles.confirmationRequired}>
                        금액 확인 필요
                      </Text>
                    ) : null}
                    <Text style={styles.meta}>
                      {categoryNames.get(transaction.categoryId) ?? '알 수 없음'}
                      {transaction.merchantName
                        ? ` · ${transaction.merchantName}`
                        : ''}
                      {items.length > 0 ? ` · 품목 ${items.length}개` : ''}
                    </Text>
                  </View>
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    style={
                      transaction.type === 'expense'
                        ? styles.expenseAmount
                        : styles.incomeAmount
                    }
                  >
                    {transaction.type === 'expense' ? '-' : '+'}
                    {formatKRW(transaction.totalAmount)}원
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  monthNavigation: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  month: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    minWidth: 130,
    textAlign: 'center',
  },
  status: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  group: {
    gap: 8,
  },
  date: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  rows: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  transaction: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    minHeight: 72,
    padding: 14,
  },
  pressed: {
    backgroundColor: colors.primarySoft,
  },
  transactionText: {
    flex: 1,
    gap: 5,
  },
  transactionName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  confirmationRequired: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  expenseAmount: {
    color: colors.danger,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
    maxWidth: '52%',
    textAlign: 'right',
  },
  incomeAmount: {
    color: colors.success,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
    maxWidth: '52%',
    textAlign: 'right',
  },
});
