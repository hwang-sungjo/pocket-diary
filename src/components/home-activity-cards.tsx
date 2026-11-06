import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { sharedStyles } from '@/components/screen';
import { colors } from '@/constants/theme';
import type { Category } from '@/domain/category';
import { formatKRW } from '@/domain/input-values';
import { recurringFrequencyLabel, type RecurringRule } from '@/domain/recurring-rule';
import type { TransactionAggregate } from '@/domain/transaction';

interface HomeActivityCardsProps {
  aggregates: TransactionAggregate[];
  categories: Category[];
  rules: RecurringRule[];
}

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

export function HomeActivityCards({ aggregates, categories, rules }: HomeActivityCardsProps) {
  const categoryNames = useMemo(
    () => new Map(categories.map(({ id, name }) => [id, name])),
    [categories],
  );
  const recentTransactions = useMemo(
    () =>
      [...aggregates]
        .sort((left, right) =>
          right.transaction.occurredAt.localeCompare(left.transaction.occurredAt),
        )
        .slice(0, 5),
    [aggregates],
  );
  const upcomingRules = useMemo(
    () =>
      rules
        .filter(
          (rule) =>
            rule.isActive &&
            (rule.endDate === null || rule.nextScheduledDate <= rule.endDate),
        )
        .sort(
          (left, right) =>
            left.nextScheduledDate.localeCompare(right.nextScheduledDate) ||
            left.name.localeCompare(right.name, 'ko'),
        )
        .slice(0, 3),
    [rules],
  );

  return (
    <>
      <View style={sharedStyles.card} testID="home-recent-transactions">
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={sharedStyles.cardTitle}>최근 거래</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/transactions')}>
            <Text style={styles.link}>전체 보기</Text>
          </Pressable>
        </View>
        {recentTransactions.length === 0 ? (
          <Text style={sharedStyles.body}>아직 저장된 거래가 없습니다.</Text>
        ) : (
          <View style={styles.rows}>
            {recentTransactions.map(({ transaction, items }) => (
              <Pressable
                accessibilityLabel={`${transaction.name}, ${transaction.type === 'expense' ? '지출' : '수입'} ${formatKRW(transaction.totalAmount)}원 상세 보기`}
                accessibilityRole="button"
                key={transaction.id}
                onPress={() =>
                  router.push({
                    pathname: '/transactions/[id]',
                    params: { id: transaction.id },
                  })
                }
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                testID={`home-recent-transaction-${transaction.id}`}
              >
                <View style={styles.rowText}>
                  <Text numberOfLines={1} style={styles.name}>{transaction.name}</Text>
                  <Text style={styles.meta}>
                    {dateFormatter.format(new Date(transaction.occurredAt))} ·{' '}
                    {categoryNames.get(transaction.categoryId) ?? '알 수 없음'}
                    {transaction.merchantName ? ` · ${transaction.merchantName}` : ''}
                    {items.length > 0 ? ` · 품목 ${items.length}개` : ''}
                  </Text>
                  {transaction.status === 'needs_confirmation' ? (
                    <Text style={styles.confirmation}>금액 확인 필요</Text>
                  ) : null}
                </View>
                <Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={transaction.type === 'expense' ? styles.expense : styles.income}
                >
                  {transaction.type === 'expense' ? '-' : '+'}{formatKRW(transaction.totalAmount)}원
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={sharedStyles.card} testID="home-upcoming-recurring">
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={sharedStyles.cardTitle}>반복 거래 예정</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/settings')}>
            <Text style={styles.link}>규칙 관리</Text>
          </Pressable>
        </View>
        {upcomingRules.length === 0 ? (
          <Text style={sharedStyles.body}>예정된 반복 거래가 없습니다.</Text>
        ) : (
          <View style={styles.rows}>
            {upcomingRules.map((rule) => (
              <View key={rule.id} style={styles.row} testID={`home-upcoming-rule-${rule.id}`}>
                <View style={styles.rowText}>
                  <Text numberOfLines={1} style={styles.name}>{rule.name}</Text>
                  <Text style={styles.meta}>
                    {dateFormatter.format(new Date(`${rule.nextScheduledDate}T12:00:00`))} ·{' '}
                    {recurringFrequencyLabel(rule)} ·{' '}
                    {categoryNames.get(rule.categoryId) ?? '알 수 없는 카테고리'}
                  </Text>
                  {rule.requiresConfirmation ? (
                    <Text style={styles.confirmation}>금액 확인 필요</Text>
                  ) : null}
                </View>
                <Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={rule.type === 'expense' ? styles.expense : styles.income}
                >
                  {rule.type === 'expense' ? '-' : '+'}{formatKRW(rule.totalAmount)}원
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  link: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  rows: {
    gap: 0,
  },
  row: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 13,
  },
  rowText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  confirmation: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  expense: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
    maxWidth: '42%',
  },
  income: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
    maxWidth: '42%',
  },
  pressed: {
    opacity: 0.65,
  },
});
