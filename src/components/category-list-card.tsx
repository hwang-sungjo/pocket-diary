import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { sharedStyles } from '@/components/screen';
import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { colors } from '@/constants/theme';
import { localCategoryRepository } from '@/data/local-category-repository';
import {
  createCustomCategory,
  type Category,
  type CategoryType,
} from '@/domain/category';

const CATEGORY_TYPES = [
  { label: '지출', value: 'expense' },
  { label: '수입', value: 'income' },
] as const;

interface CategoryGroupProps {
  categories: Category[];
  countTestID: string;
  onToggle: (category: Category) => void;
  title: string;
  updatingId: string | null;
}

function CategoryGroup({
  categories,
  countTestID,
  onToggle,
  title,
  updatingId,
}: CategoryGroupProps) {
  const activeCount = categories.filter(({ isActive }) => isActive).length;

  return (
    <View style={styles.group}>
      <View style={styles.groupHeading}>
        <Text style={styles.groupTitle}>{title}</Text>
        <Text style={styles.count} testID={countTestID}>
          {activeCount}개
        </Text>
      </View>
      <View style={styles.categoryRows}>
        {categories.map((category) => (
          <View
            key={category.id}
            style={[styles.categoryRow, !category.isActive && styles.inactiveRow]}
            testID={`category-${category.id}`}
          >
            <View style={styles.categoryText}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryMeta}>
                {category.isDefault ? '기본' : '사용자'} ·{' '}
                {category.isActive ? '사용 중' : '숨김'}
              </Text>
            </View>
            <AppButton
              accessibilityLabel={`${category.name} ${category.isActive ? '숨기기' : '활성화'}`}
              loading={updatingId === category.id}
              onPress={() => onToggle(category)}
              variant={category.isActive ? 'danger' : 'secondary'}
            >
              {category.isActive ? '숨기기' : '활성화'}
            </AppButton>
          </View>
        ))}
      </View>
    </View>
  );
}

interface CategoryListCardProps {
  onCategoriesChange?: () => void;
}

export function CategoryListCard({
  onCategoriesChange,
}: CategoryListCardProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryType, setCategoryType] = useState<CategoryType>('expense');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setCategories(
        await localCategoryRepository.list({ includeInactive: true }),
      );
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

    localCategoryRepository.list({ includeInactive: true }).then(
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

  async function addCategory() {
    setSaving(true);
    setError(null);

    try {
      const category = createCustomCategory(
        randomUUID(),
        categoryType,
        name,
        categories,
      );
      await localCategoryRepository.save(category);
      setName('');
      await loadCategories();
      onCategoriesChange?.();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '카테고리를 추가하지 못했습니다.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(category: Category) {
    const activeInType = categories.filter(
      (candidate) => candidate.type === category.type && candidate.isActive,
    ).length;

    if (category.isActive && activeInType <= 1) {
      setError('거래 입력을 위해 유형별 카테고리를 하나 이상 유지해 주세요.');
      return;
    }

    setUpdatingId(category.id);
    setError(null);
    try {
      await localCategoryRepository.setActive(
        category.id,
        !category.isActive,
        new Date().toISOString(),
      );
      await loadCategories();
      onCategoriesChange?.();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '카테고리 상태를 변경하지 못했습니다.',
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const expenses = categories.filter(({ type }) => type === 'expense');
  const incomes = categories.filter(({ type }) => type === 'income');

  return (
    <View style={sharedStyles.card} testID="category-list">
      <View style={styles.cardHeading}>
        <View style={styles.headingText}>
          <Text style={sharedStyles.cardTitle}>카테고리 관리</Text>
          <Text style={sharedStyles.body}>
            사용자 카테고리를 추가하거나 거래 입력에서 사용하지 않을 항목을 숨깁니다.
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

      <View style={styles.form}>
        <ChoiceChips
          accessibilityLabel="새 카테고리 유형"
          onChange={setCategoryType}
          options={CATEGORY_TYPES}
          value={categoryType}
        />
        <AppInput
          label="새 카테고리 이름"
          onChangeText={setName}
          placeholder="예: 반려동물"
          value={name}
        />
        <AppButton
          loading={saving}
          onPress={() => void addCategory()}
          testID="add-category"
        >
          카테고리 추가
        </AppButton>
      </View>

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator color={colors.primary} />
          <Text style={sharedStyles.body}>카테고리를 불러오는 중입니다.</Text>
        </View>
      ) : null}

      {error ? (
        <Text accessibilityLiveRegion="assertive" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {!loading ? (
        <View style={styles.groups}>
          <CategoryGroup
            categories={expenses}
            countTestID="expense-category-count"
            onToggle={(category) => void toggleCategory(category)}
            title="지출"
            updatingId={updatingId}
          />
          <CategoryGroup
            categories={incomes}
            countTestID="income-category-count"
            onToggle={(category) => void toggleCategory(category)}
            title="수입"
            updatingId={updatingId}
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
  form: {
    gap: 12,
  },
  status: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
  },
  error: {
    color: colors.danger,
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
  categoryRows: {
    gap: 8,
  },
  categoryRow: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    padding: 10,
  },
  inactiveRow: {
    opacity: 0.65,
  },
  categoryText: {
    flex: 1,
    gap: 3,
  },
  categoryName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  categoryMeta: {
    color: colors.muted,
    fontSize: 12,
  },
});
