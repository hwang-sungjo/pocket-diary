import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { sharedStyles } from '@/components/screen';
import { AppButton } from '@/components/ui/app-button';
import { colors } from '@/constants/theme';
import { localCategoryRepository } from '@/data/local-category-repository';
import type { Category } from '@/domain/category';

interface CategoryGroupProps {
  categories: Category[];
  countTestID: string;
  title: string;
}

function CategoryGroup({ categories, countTestID, title }: CategoryGroupProps) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeading}>
        <Text style={styles.groupTitle}>{title}</Text>
        <Text style={styles.count} testID={countTestID}>
          {categories.length}개
        </Text>
      </View>
      <View style={styles.chips}>
        {categories.map((category) => (
          <View key={category.id} style={styles.chip}>
            <Text style={styles.chipText}>{category.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function CategoryListCard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setCategories(await localCategoryRepository.list());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '카테고리를 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    localCategoryRepository.list().then(
      (nextCategories) => {
        if (active) {
          setCategories(nextCategories);
          setLoading(false);
        }
      },
      (cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : '카테고리를 불러오지 못했습니다.',
          );
          setLoading(false);
        }
      },
    );

    return () => {
      active = false;
    };
  }, []);

  const expenses = categories.filter(({ type }) => type === 'expense');
  const incomes = categories.filter(({ type }) => type === 'income');

  return (
    <View style={sharedStyles.card} testID="category-list">
      <View style={styles.cardHeading}>
        <View style={styles.headingText}>
          <Text style={sharedStyles.cardTitle}>기본 카테고리</Text>
          <Text style={sharedStyles.body}>
            거래 유형에 맞는 활성 카테고리만 표시합니다.
          </Text>
        </View>
        <AppButton
          disabled={loading}
          onPress={() => void loadCategories()}
          variant="secondary"
        >
          새로고침
        </AppButton>
      </View>

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator color={colors.primary} />
          <Text style={sharedStyles.body}>카테고리를 불러오는 중입니다.</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.status}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error ? (
        <View style={styles.groups}>
          <CategoryGroup
            categories={expenses}
            countTestID="expense-category-count"
            title="지출"
          />
          <CategoryGroup
            categories={incomes}
            countTestID="income-category-count"
            title="수입"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  headingText: {
    flex: 1,
    gap: 6,
  },
  status: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
  },
  error: {
    color: colors.danger,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  groups: {
    gap: 20,
  },
  group: {
    gap: 10,
  },
  groupHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  groupTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  count: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
