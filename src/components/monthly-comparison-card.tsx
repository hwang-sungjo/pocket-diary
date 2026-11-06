import { StyleSheet, Text, View } from 'react-native';

import { sharedStyles } from '@/components/screen';
import { colors } from '@/constants/theme';
import { formatKRW } from '@/domain/input-values';
import type { MonthlyStatistics } from '@/domain/statistics';
import { formatMonthLabel } from '@/domain/transaction-query';

type MonthlyTotals = Pick<MonthlyStatistics, 'income' | 'expense' | 'balance'>;
type TotalKind = keyof MonthlyTotals;

interface MonthlyComparisonCardProps {
  month: string;
  previousMonth: string;
  current: MonthlyTotals;
  previous: MonthlyTotals;
}

const metrics: { kind: TotalKind; label: string }[] = [
  { kind: 'income', label: '수입' },
  { kind: 'expense', label: '지출' },
  { kind: 'balance', label: '잔액' },
];

function formatDifference(amount: number): string {
  return `${amount > 0 ? '+' : ''}${formatKRW(amount)}원`;
}

export function MonthlyComparisonCard({
  month,
  previousMonth,
  current,
  previous,
}: MonthlyComparisonCardProps) {
  return (
    <View style={sharedStyles.card} testID="monthly-comparison">
      <Text accessibilityRole="header" style={sharedStyles.cardTitle}>
        직전 달과 비교
      </Text>
      <Text style={sharedStyles.body}>
        {formatMonthLabel(month)}과 {formatMonthLabel(previousMonth)}의 확정 거래 합계
      </Text>
      <View style={styles.grid}>
        {metrics.map(({ kind, label }) => {
          const difference = current[kind] - previous[kind];
          const favorable = kind === 'expense' ? difference < 0 : difference > 0;

          return (
            <View
              accessibilityLabel={`${label} 선택한 달 ${formatKRW(current[kind])}원, 직전 달 ${formatKRW(previous[kind])}원, 차이 ${formatDifference(difference)}`}
              accessible
              key={kind}
              style={styles.metric}
              testID={`comparison-${kind}`}
            >
              <Text style={styles.metricTitle}>{label}</Text>
              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>선택한 달</Text>
                <Text adjustsFontSizeToFit numberOfLines={1} style={styles.value}>
                  {formatKRW(current[kind])}원
                </Text>
              </View>
              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>직전 달</Text>
                <Text adjustsFontSizeToFit numberOfLines={1} style={styles.value}>
                  {formatKRW(previous[kind])}원
                </Text>
              </View>
              <View style={[styles.valueRow, styles.differenceRow]}>
                <Text style={styles.valueLabel}>차이</Text>
                <Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={[
                    styles.difference,
                    difference === 0
                      ? styles.neutral
                      : favorable
                        ? styles.favorable
                        : styles.unfavorable,
                  ]}
                >
                  {formatDifference(difference)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={styles.note}>각 월에 현재까지 저장된 거래 기준이며 기간 보정은 하지 않습니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: 220,
    flexGrow: 1,
    gap: 8,
    minWidth: 0,
    padding: 12,
  },
  metricTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  valueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  valueLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  value: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  differenceRow: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  difference: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  neutral: { color: colors.muted },
  favorable: { color: colors.success },
  unfavorable: { color: colors.danger },
  note: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
