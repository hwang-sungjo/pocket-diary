import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { HomeActivityCards } from '@/components/home-activity-cards';
import { MonthlyStatisticsCard } from '@/components/monthly-statistics-card';
import { Screen, sharedStyles } from '@/components/screen';
import { AppButton } from '@/components/ui/app-button';
import { colors } from '@/constants/theme';
import { ensureDueRecurringTransactions } from '@/data/ensure-due-recurring-transactions';
import { localCategoryRepository } from '@/data/local-category-repository';
import { localRecurringRuleRepository } from '@/data/local-recurring-rule-repository';
import { localTransactionRepository } from '@/data/local-transaction-repository';
import type { Category } from '@/domain/category';
import type { RecurringRule } from '@/domain/recurring-rule';
import type { TransactionAggregate } from '@/domain/transaction';

interface HomeData {
  aggregates: TransactionAggregate[];
  categories: Category[];
  rules: RecurringRule[];
}

export default function HomeScreen() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);

      async function load() {
        let nextGenerationError = false;
        try {
          await ensureDueRecurringTransactions();
        } catch (cause) {
          console.error('반복 거래 자동 생성에 실패했습니다.', cause);
          nextGenerationError = true;
        }

        try {
          const [aggregates, categories, rules] = await Promise.all([
            localTransactionRepository.list(),
            localCategoryRepository.list({ includeInactive: true }),
            localRecurringRuleRepository.list(),
          ]);

          if (active) {
            setData({ aggregates, categories, rules });
            setGenerationError(nextGenerationError);
            setError(null);
          }
        } catch (cause) {
          if (active) {
            setError(cause instanceof Error ? cause.message : '홈 정보를 불러오지 못했습니다.');
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      void load();
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <Screen
      action={<AppButton onPress={() => router.push('/transactions/new')}>거래 등록</AppButton>}
      description="상세 품목까지 기록하는 로컬 우선 가계부"
      title="Pocket Diary"
    >
      {loading ? (
        <View style={styles.status} testID="home-loading">
          <ActivityIndicator color={colors.primary} />
          <Text style={sharedStyles.body}>홈 정보를 불러오는 중입니다.</Text>
        </View>
      ) : null}
      {!loading && error ? (
        <Text accessibilityLiveRegion="assertive" style={styles.error} testID="home-error">
          {error}
        </Text>
      ) : null}
      {!loading && !error && data ? (
        <>
          {generationError ? (
            <Text accessibilityLiveRegion="polite" style={styles.error} testID="home-recurring-error">
              반복 거래 생성에 실패했습니다. 설정에서 다시 실행해 주세요.
            </Text>
          ) : null}
          <MonthlyStatisticsCard categoryLimit={3} source={data} />
          <HomeActivityCards aggregates={data.aggregates} categories={data.categories} rules={data.rules} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
});
