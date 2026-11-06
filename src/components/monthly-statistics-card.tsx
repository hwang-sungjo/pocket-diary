import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from 'react-native';

import { sharedStyles } from '@/components/screen';
import { MonthlyComparisonCard } from '@/components/monthly-comparison-card';
import { AppButton } from '@/components/ui/app-button';
import { colors } from '@/constants/theme';
import { localCategoryRepository } from '@/data/local-category-repository';
import { localTransactionRepository } from '@/data/local-transaction-repository';
import type { Category } from '@/domain/category';
import { formatKRW } from '@/domain/input-values';
import { calculateMonthlyStatistics } from '@/domain/statistics';
import type { TransactionAggregate } from '@/domain/transaction';
import {
  formatMonthLabel,
  shiftMonth,
  toMonthKey,
} from '@/domain/transaction-query';

interface MonthlyStatisticsCardProps {
  categoryLimit?: number;
  showMonthNavigation?: boolean;
  showMerchantExpenses?: boolean;
  showProductExpenses?: boolean;
  showMonthComparison?: boolean;
  source?: {
    aggregates: TransactionAggregate[];
    categories: Category[];
  };
}

export function MonthlyStatisticsCard({
  categoryLimit,
  showMonthNavigation = false,
  showMerchantExpenses = false,
  showProductExpenses = false,
  showMonthComparison = false,
  source,
}: MonthlyStatisticsCardProps) {
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [aggregates, setAggregates] = useState<TransactionAggregate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const externallyManaged = source !== undefined;

  useFocusEffect(
    useCallback(() => {
      if (externallyManaged) {
        return;
      }
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
            setError(null);
            setLoading(false);
          }
        },
        (cause: unknown) => {
          if (active) {
            setError(
              cause instanceof Error
                ? cause.message
                : '통계를 불러오지 못했습니다.',
            );
            setLoading(false);
          }
        },
      );

      return () => {
        active = false;
      };
    }, [externallyManaged]),
  );

  const visibleAggregates = source?.aggregates ?? aggregates;
  const statistics = useMemo(
    () => calculateMonthlyStatistics(visibleAggregates, month),
    [visibleAggregates, month],
  );
  const previousMonth = shiftMonth(month, -1);
  const previousStatistics = useMemo(
    () =>
      showMonthComparison
        ? calculateMonthlyStatistics(visibleAggregates, previousMonth)
        : null,
    [visibleAggregates, previousMonth, showMonthComparison],
  );
  const categoryNames = useMemo(
    () => new Map((source?.categories ?? categories).map(({ id, name }) => [id, name])),
    [source, categories],
  );
  const visibleCategoryExpenses =
    categoryLimit === undefined
      ? statistics.categoryExpenses
      : statistics.categoryExpenses.slice(0, categoryLimit);
  const maxCategoryAmount = Math.max(
    1,
    ...statistics.categoryExpenses.map(({ amount }) => Math.abs(amount)),
  );
  const maxMerchantAmount = Math.max(
    1,
    ...statistics.merchantExpenses.map(({ amount }) => amount),
  );
  const maxProductAmount = Math.max(
    1,
    ...statistics.productExpenses.map(({ amount }) => amount),
  );

  if (!externallyManaged && loading) {
    return (
      <View style={styles.status} testID="statistics-loading">
        <ActivityIndicator color={colors.primary} />
        <Text style={sharedStyles.body}>통계를 계산하는 중입니다.</Text>
      </View>
    );
  }

  if (!externallyManaged && error) {
    return (
      <Text
        accessibilityLiveRegion="assertive"
        style={styles.error}
        testID="statistics-error"
      >
        {error}
      </Text>
    );
  }

  return (
    <View style={styles.container} testID="monthly-statistics">
      {showMonthNavigation ? (
        <View style={styles.monthNavigation}>
          <AppButton
            accessibilityLabel="통계 이전 달"
            onPress={() => setMonth((current) => shiftMonth(current, -1))}
            variant="secondary"
          >
            ‹
          </AppButton>
          <Text style={styles.month} testID="statistics-month">
            {formatMonthLabel(month)}
          </Text>
          <AppButton
            accessibilityLabel="통계 다음 달"
            onPress={() => setMonth((current) => shiftMonth(current, 1))}
            variant="secondary"
          >
            ›
          </AppButton>
        </View>
      ) : null}

      <View style={styles.summaryGrid}>
        <SummaryCard
          label={showMonthNavigation ? '수입' : '이번 달 수입'}
          testID="monthly-income"
          tone="income"
          value={statistics.income}
        />
        <SummaryCard
          label={showMonthNavigation ? '지출' : '이번 달 지출'}
          testID="monthly-expense"
          tone="expense"
          value={statistics.expense}
        />
        <SummaryCard
          label={showMonthNavigation ? '잔액' : '이번 달 잔액'}
          testID="monthly-balance"
          tone={statistics.balance < 0 ? 'expense' : 'default'}
          value={statistics.balance}
        />
      </View>

      {previousStatistics ? (
        <MonthlyComparisonCard
          current={statistics}
          month={month}
          previous={previousStatistics}
          previousMonth={previousMonth}
        />
      ) : null}

      {statistics.excludedPendingCount > 0 ? (
        <Text style={styles.pendingNotice} testID="pending-statistics-notice">
          금액 확인 필요 {statistics.excludedPendingCount}건은 통계에서
          제외했습니다.
        </Text>
      ) : null}

      <View style={sharedStyles.card} testID="category-statistics">
        <View style={styles.categoryHeader}>
          <Text style={sharedStyles.cardTitle}>카테고리별 지출</Text>
          <Text style={styles.categoryRule}>품목 분류 + 미분류 금액</Text>
        </View>

        {visibleCategoryExpenses.length === 0 ? (
          <Text style={sharedStyles.body}>
            선택한 달에 확정된 지출이 없습니다.
          </Text>
        ) : (
          <View style={styles.categoryRows}>
            {visibleCategoryExpenses.map(({ categoryId, amount }) => {
              const width = `${Math.max(
                3,
                Math.round((Math.abs(amount) / maxCategoryAmount) * 100),
              )}%` as DimensionValue;

              return (
                <Pressable
                  accessibilityLabel={`${categoryNames.get(categoryId) ?? '알 수 없는 카테고리'} 지출 ${formatKRW(amount)}원`}
                  accessibilityRole="button"
                  key={categoryId}
                  onPress={() => router.push({ pathname: '/stat-transactions', params: { month, kind: 'category', categoryId } })}
                  style={({ pressed }) => [styles.categoryRow, pressed && styles.pressed]}
                  testID={`category-stat-${categoryId}`}
                >
                  <View style={styles.categoryLabels}>
                    <Text numberOfLines={1} style={styles.categoryName}>
                      {categoryNames.get(categoryId) ?? '알 수 없는 카테고리'}
                    </Text>
                    <Text
                      style={
                        amount < 0
                          ? styles.negativeCategoryAmount
                          : styles.categoryAmount
                      }
                    >
                      {formatKRW(amount)}원
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        amount < 0 && styles.negativeBar,
                        { width },
                      ]}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {showMerchantExpenses ? (
        <View style={sharedStyles.card} testID="merchant-statistics">
          <View style={styles.categoryHeader}>
            <Text style={sharedStyles.cardTitle}>상점별 지출</Text>
            <Text style={styles.categoryRule}>거래 총액 기준 · 상점 미입력 포함</Text>
          </View>

          {statistics.merchantExpenses.length === 0 ? (
            <Text style={sharedStyles.body}>
              선택한 달에 상점별로 집계할 확정 지출이 없습니다.
            </Text>
          ) : (
            <View style={styles.categoryRows}>
              {statistics.merchantExpenses.map(
                ({ merchantKey, merchantName, amount, transactionCount }) => {
                  const name = merchantName ?? '상점 미입력';
                  const width = `${Math.max(
                    3,
                    Math.round((amount / maxMerchantAmount) * 100),
                  )}%` as DimensionValue;

                  return (
                    <Pressable
                      accessibilityLabel={`${name} 지출 ${formatKRW(amount)}원, ${transactionCount}건`}
                      accessibilityRole="button"
                      key={merchantKey === null ? 'unassigned' : `named:${merchantKey}`}
                      onPress={() => router.push({ pathname: '/stat-transactions', params: { month, kind: 'merchant', ...(merchantName ? { merchantName } : {}) } })}
                      style={({ pressed }) => [styles.categoryRow, pressed && styles.pressed]}
                      testID={
                        merchantKey === null
                          ? 'merchant-stat-unassigned'
                          : `merchant-stat-named-${merchantKey}`
                      }
                    >
                      <View style={styles.categoryLabels}>
                        <View style={styles.statNameGroup}>
                          <Text numberOfLines={1} style={styles.statName}>
                            {name}
                          </Text>
                          <Text style={styles.statMeta}>
                            {transactionCount}건
                          </Text>
                        </View>
                        <Text style={styles.categoryAmount}>
                          {formatKRW(amount)}원
                        </Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View style={[styles.bar, { width }]} />
                      </View>
                    </Pressable>
                  );
                },
              )}
            </View>
          )}
        </View>
      ) : null}

      {showProductExpenses ? (
        <View style={sharedStyles.card} testID="product-statistics">
          <View style={styles.categoryHeader}>
            <Text style={sharedStyles.cardTitle}>품목별 누적 지출</Text>
            <Text style={styles.categoryRule}>상세 품목 입력액 기준 · 미분류 금액 제외</Text>
          </View>

          {statistics.productExpenses.length === 0 ? (
            <Text style={sharedStyles.body}>
              선택한 달에 기록된 상세 품목 지출이 없습니다.
            </Text>
          ) : (
            <View style={styles.categoryRows}>
              {statistics.productExpenses.map((product, index) => {
                const width = `${Math.max(
                  3,
                  Math.round((product.amount / maxProductAmount) * 100),
                )}%` as DimensionValue;

                return (
                  <Pressable
                    accessibilityLabel={`${product.name}${product.specification ? ` ${product.specification}` : ''} 지출 ${formatKRW(product.amount)}원, 품목 기록 ${product.itemCount}건`}
                    accessibilityRole="button"
                    key={product.key}
                    onPress={() => router.push({ pathname: '/stat-transactions', params: { month, kind: 'product', productName: product.name, ...(product.specification ? { specification: product.specification } : {}) } })}
                    style={({ pressed }) => [styles.categoryRow, pressed && styles.pressed]}
                    testID={`product-stat-${index}`}
                  >
                    <View style={styles.categoryLabels}>
                      <View style={styles.statNameGroup}>
                        <Text numberOfLines={1} style={styles.statName}>
                          {product.name}
                        </Text>
                        <Text style={styles.statMeta}>
                          {product.specification ? `${product.specification} · ` : ''}
                          품목 기록 {product.itemCount}건
                        </Text>
                      </View>
                      <Text style={styles.categoryAmount}>
                        {formatKRW(product.amount)}원
                      </Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.bar, { width }]} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function SummaryCard({
  label,
  value,
  testID,
  tone,
}: {
  label: string;
  value: number;
  testID: string;
  tone: 'default' | 'income' | 'expense';
}) {
  return (
    <View
      accessibilityLabel={`${label} ${formatKRW(value)}원`}
      accessible
      style={styles.summaryCard}
      testID={testID}
    >
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={[
          styles.summaryValue,
          tone === 'income' && styles.incomeValue,
          tone === 'expense' && styles.expenseValue,
        ]}
      >
        {formatKRW(value)}원
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: 180,
    flexGrow: 1,
    gap: 6,
    minWidth: 0,
    padding: 16,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  incomeValue: {
    color: colors.success,
  },
  expenseValue: {
    color: colors.danger,
  },
  pendingNotice: {
    backgroundColor: '#FFF4E5',
    borderColor: '#F0C36D',
    borderRadius: 12,
    borderWidth: 1,
    color: '#7A4B00',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    padding: 12,
  },
  categoryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  categoryRule: {
    color: colors.muted,
    fontSize: 12,
  },
  categoryRows: {
    gap: 15,
  },
  categoryRow: {
    gap: 7,
  },
  pressed: {
    opacity: 0.65,
  },
  categoryLabels: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  categoryName: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  statNameGroup: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  statName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  statMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  categoryAmount: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  negativeCategoryAmount: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  barTrack: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 9,
    overflow: 'hidden',
  },
  bar: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: '100%',
  },
  negativeBar: {
    backgroundColor: colors.danger,
  },
});
