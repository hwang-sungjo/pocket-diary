import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, sharedStyles } from '@/components/screen';
import { AppButton } from '@/components/ui/app-button';
import { colors } from '@/constants/theme';
import { localCategoryRepository } from '@/data/local-category-repository';
import { localTransactionRepository } from '@/data/local-transaction-repository';
import type { Category } from '@/domain/category';
import { formatKRW } from '@/domain/input-values';
import { productIdentityKey } from '@/domain/product-history';
import { merchantIdentityKey } from '@/domain/statistics';
import {
  selectStatisticTransactions,
  type StatisticSelection,
} from '@/domain/statistic-drilldown';
import type { TransactionAggregate } from '@/domain/transaction';
import { formatMonthLabel, groupTransactionsByDate } from '@/domain/transaction-query';

type RouteParams = {
  month?: string | string[];
  kind?: string | string[];
  categoryId?: string | string[];
  merchantName?: string | string[];
  productName?: string | string[];
  specification?: string | string[];
};

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function StatisticTransactionsScreen() {
  const params = useLocalSearchParams<RouteParams>();
  const month = first(params.month);
  const kind = first(params.kind);
  const categoryId = first(params.categoryId);
  const merchantName = first(params.merchantName);
  const productName = first(params.productName);
  const specification = first(params.specification);
  const validMonth = month !== undefined && /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const selection = useMemo<StatisticSelection | null>(
    () => kind === 'category' && categoryId
      ? { kind, categoryId }
      : kind === 'merchant'
        ? { kind, merchantKey: merchantIdentityKey(merchantName ?? null) }
        : kind === 'product' && productName
          ? { kind, productKey: productIdentityKey(productName, specification ?? null) }
          : null,
    [kind, categoryId, merchantName, productName, specification],
  );

  const [aggregates, setAggregates] = useState<TransactionAggregate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      Promise.all([
        localTransactionRepository.list(),
        localCategoryRepository.list({ includeInactive: true }),
      ]).then(
        ([nextAggregates, nextCategories]) => {
          if (active) {
            setAggregates(nextAggregates);
            setCategories(nextCategories);
            setLoading(false);
          }
        },
        (cause: unknown) => {
          if (active) {
            setError(cause instanceof Error ? cause.message : '거래를 불러오지 못했습니다.');
            setLoading(false);
          }
        },
      );
      return () => {
        active = false;
      };
    }, []),
  );

  const matches = useMemo(
    () => validMonth && month && selection
      ? selectStatisticTransactions(aggregates, month, selection)
      : [],
    [aggregates, month, validMonth, selection],
  );
  const amounts = new Map(matches.map(({ aggregate, amount }) => [aggregate.transaction.id, amount]));
  const groups = groupTransactionsByDate(matches.map(({ aggregate }) => aggregate));
  const total = matches.reduce((sum, { amount }) => sum + amount, 0);
  const categoryName = categories.find(({ id }) => id === categoryId)?.name ?? '알 수 없는 카테고리';
  const label = kind === 'category'
    ? categoryName
    : kind === 'merchant'
      ? merchantName ?? '상점 미입력'
      : `${productName ?? ''}${specification ? ` · ${specification}` : ''}`;

  return (
    <Screen
      action={<AppButton onPress={() => router.back()} variant="secondary">통계로 돌아가기</AppButton>}
      description={validMonth && month ? `${formatMonthLabel(month)} · ${label}` : '통계 항목을 다시 선택해 주세요.'}
      title="통계 관련 거래"
    >
      {!validMonth || !selection ? (
        <View style={sharedStyles.card}>
          <Text style={sharedStyles.body}>올바른 통계 항목을 찾지 못했습니다.</Text>
        </View>
      ) : null}

      {validMonth && selection && loading ? (
        <View style={styles.status} testID="stat-transactions-loading">
          <ActivityIndicator color={colors.primary} />
          <Text style={sharedStyles.body}>관련 거래를 불러오는 중입니다.</Text>
        </View>
      ) : null}

      {validMonth && selection && error ? (
        <Text accessibilityLiveRegion="assertive" style={styles.error} testID="stat-transactions-error">
          {error}
        </Text>
      ) : null}

      {validMonth && selection && !loading && !error ? (
        <View style={styles.content} testID="stat-transactions">
          <View style={sharedStyles.card}>
            <Text style={sharedStyles.cardTitle}>{label}</Text>
            <Text style={styles.total} testID="stat-transactions-total">{formatKRW(total)}원</Text>
            <Text style={sharedStyles.body} testID="stat-transactions-count">관련 거래 {matches.length}건</Text>
            <Text style={styles.note}>각 거래에 표시된 금액은 이 통계 항목에 반영된 금액입니다.</Text>
          </View>
          {matches.length === 0 ? (
            <View style={sharedStyles.card}>
              <Text style={sharedStyles.body}>현재 이 항목에 해당하는 거래가 없습니다.</Text>
            </View>
          ) : null}
          {groups.map((group) => (
            <View key={group.dateKey} style={styles.group}>
              <Text style={styles.date}>
                {dateFormatter.format(new Date(`${group.dateKey}T12:00:00`))}
              </Text>
              <View style={styles.rows}>
                {group.transactions.map(({ transaction }) => {
                  const amount = amounts.get(transaction.id) ?? 0;
                  return (
                    <Pressable
                      accessibilityLabel={`${transaction.name}, 반영 금액 ${formatKRW(amount)}원`}
                      accessibilityRole="button"
                      key={transaction.id}
                      onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: transaction.id } })}
                      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                      testID={`stat-transaction-row-${transaction.id}`}
                    >
                      <View style={styles.rowText}>
                        <Text style={styles.name}>{transaction.name}</Text>
                        <Text style={styles.meta}>{transaction.merchantName ?? categories.find(({ id }) => id === transaction.categoryId)?.name ?? '상점 미입력'}</Text>
                      </View>
                      <Text style={styles.amount}>{formatKRW(amount)}원</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18 },
  status: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  error: { color: colors.danger, fontSize: 14 },
  total: { color: colors.text, fontSize: 26, fontWeight: '800' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  group: { gap: 8 },
  date: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  rows: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, justifyContent: 'space-between', minHeight: 68, padding: 14 },
  pressed: { backgroundColor: colors.primarySoft },
  rowText: { flex: 1, gap: 4 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13 },
  amount: { color: colors.text, flexShrink: 1, fontSize: 16, fontWeight: '800', textAlign: 'right' },
});
