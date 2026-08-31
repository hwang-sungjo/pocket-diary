import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from 'react-native';

import { sharedStyles } from '@/components/screen';
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
}

export function MonthlyStatisticsCard({
  categoryLimit,
  showMonthNavigation = false,
}: MonthlyStatisticsCardProps) {
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
                : '통계를 불러오지 못했습니다.',
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

  const statistics = useMemo(
    () => calculateMonthlyStatistics(aggregates, month),
    [aggregates, month],
  );
  const categoryNames = useMemo(
    () => new Map(categories.map(({ id, name }) => [id, name])),
    [categories],
  );
  const visibleCategoryExpenses =
    categoryLimit === undefined
      ? statistics.categoryExpenses
      : statistics.categoryExpenses.slice(0, categoryLimit);
  const maxCategoryAmount = Math.max(
    1,
    ...statistics.categoryExpenses.map(({ amount }) => Math.abs(amount)),
  );

  if (loading) {
    return (
      <View style={styles.status} testID="statistics-loading">
        <ActivityIndicator color={colors.primary} />
        <Text style={sharedStyles.body}>통계를 계산하는 중입니다.</Text>
      </View>
    );
  }

  if (error) {
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
                <View
                  accessibilityLabel={`${categoryNames.get(categoryId) ?? '알 수 없는 카테고리'} 지출 ${formatKRW(amount)}원`}
                  accessible
                  key={categoryId}
                  style={styles.categoryRow}
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
                </View>
              );
            })}
          </View>
        )}
      </View>
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
