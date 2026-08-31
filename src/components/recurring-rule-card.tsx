import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { sharedStyles } from '@/components/screen';
import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DateInput } from '@/components/ui/date-input';
import { MoneyInput } from '@/components/ui/money-input';
import { colors } from '@/constants/theme';
import { generateDueRecurringTransactions } from '@/data/generate-recurring-transactions';
import { localCategoryRepository } from '@/data/local-category-repository';
import { localRecurringRuleRepository } from '@/data/local-recurring-rule-repository';
import { localTransactionRepository } from '@/data/local-transaction-repository';
import type { Category } from '@/domain/category';
import { formatKRW } from '@/domain/input-values';
import {
  buildRecurringRule,
  createRecurringRuleDraft,
  getRecurringRuleDraftErrors,
  recurringFrequencyLabel,
  type RecurringFrequency,
  type RecurringRule,
  type RecurringRuleDraft,
} from '@/domain/recurring-rule';
import type { TransactionType } from '@/domain/transaction';

const TRANSACTION_TYPES = [
  { label: '지출', value: 'expense' },
  { label: '수입', value: 'income' },
] as const;

const FREQUENCIES = [
  { label: '매주', value: 'weekly' },
  { label: '매월', value: 'monthly' },
  { label: '매년', value: 'yearly' },
  { label: '사용자 지정', value: 'custom' },
] as const;

const CONFIRMATION_MODES = [
  { label: '자동 확정', value: 'automatic' },
  { label: '금액 확인 필요', value: 'needs_confirmation' },
] as const;

type ConfirmationMode = (typeof CONFIRMATION_MODES)[number]['value'];

interface RecurringRuleCardProps {
  categoryRevision?: number;
}

function defaultCategoryId(
  categories: readonly Category[],
  type: TransactionType,
): string {
  return categories.find(
    (category) => category.type === type && category.isActive,
  )?.id ?? '';
}

function intervalLabel(frequency: RecurringFrequency): string {
  switch (frequency) {
    case 'weekly':
      return '반복 간격 (주)';
    case 'monthly':
      return '반복 간격 (개월)';
    case 'yearly':
      return '반복 간격 (년)';
    case 'custom':
      return '반복 간격 (일)';
  }
}

function generationMessage(createdCount: number, existingCount: number): string {
  if (createdCount === 0 && existingCount === 0) {
    return '오늘까지 새로 생성할 예정 거래가 없습니다.';
  }

  const created = createdCount > 0 ? `${createdCount}건 생성` : '';
  const existing = existingCount > 0 ? `${existingCount}건 중복 방지` : '';
  return `예정 거래 ${[created, existing].filter(Boolean).join(' · ')}`;
}

export function RecurringRuleCard({
  categoryRevision = 0,
}: RecurringRuleCardProps) {
  const [draft, setDraft] = useState<RecurringRuleDraft>(() =>
    createRecurringRuleDraft(),
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextCategories, nextRules] = await Promise.all([
        localCategoryRepository.list({ includeInactive: true }),
        localRecurringRuleRepository.list(),
      ]);
      setCategories(nextCategories);
      setRules(nextRules);
      setDraft((current) => ({
        ...current,
        categoryId:
          nextCategories.some(
            ({ id, isActive, type }) =>
              id === current.categoryId && isActive && type === current.type,
          )
            ? current.categoryId
            : defaultCategoryId(nextCategories, current.type),
      }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '반복 거래 정보를 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([
      localCategoryRepository.list({ includeInactive: true }),
      localRecurringRuleRepository.list(),
    ]).then(
      ([nextCategories, nextRules]) => {
        if (!active) {
          return;
        }
        setCategories(nextCategories);
        setRules(nextRules);
        setDraft((current) => ({
          ...current,
          categoryId:
            nextCategories.some(
              ({ id, isActive, type }) =>
                id === current.categoryId &&
                isActive &&
                type === current.type,
            )
              ? current.categoryId
              : defaultCategoryId(nextCategories, current.type),
        }));
        setError(null);
        setLoading(false);
      },
      (cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : '반복 거래 정보를 불러오지 못했습니다.',
          );
          setLoading(false);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [categoryRevision]);

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        ({ isActive, type }) => isActive && type === draft.type,
      ),
    [categories, draft.type],
  );
  const categoryNames = useMemo(
    () => new Map(categories.map(({ id, name }) => [id, name])),
    [categories],
  );
  const errors = submitted ? getRecurringRuleDraftErrors(draft) : [];
  const confirmationMode: ConfirmationMode = draft.requiresConfirmation
    ? 'needs_confirmation'
    : 'automatic';

  function updateDraft(
    updater: (current: RecurringRuleDraft) => RecurringRuleDraft,
  ) {
    setDraft(updater);
    setError(null);
    setResultMessage(null);
  }

  function changeType(type: TransactionType) {
    updateDraft((current) => ({
      ...current,
      type,
      categoryId: defaultCategoryId(categories, type),
    }));
  }

  async function createRule() {
    setSubmitted(true);
    setError(null);
    setResultMessage(null);

    const validationErrors = getRecurringRuleDraftErrors(draft);
    if (validationErrors.length > 0) {
      setError(validationErrors[0] ?? '반복 규칙 입력값을 확인해 주세요.');
      return;
    }

    setSaving(true);
    try {
      const rule = buildRecurringRule(draft, randomUUID());
      await localRecurringRuleRepository.save(rule);
      const result = await generateDueRecurringTransactions(
        localRecurringRuleRepository,
        localTransactionRepository,
        randomUUID,
      );
      setResultMessage(generationMessage(result.createdCount, result.existingCount));
      const nextDraft = createRecurringRuleDraft();
      nextDraft.type = draft.type;
      nextDraft.categoryId = defaultCategoryId(categories, draft.type);
      setDraft(nextDraft);
      setSubmitted(false);
      await loadData();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '반복 규칙을 저장하지 못했습니다.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function generateDueTransactions() {
    setGenerating(true);
    setError(null);
    setResultMessage(null);
    try {
      const result = await generateDueRecurringTransactions(
        localRecurringRuleRepository,
        localTransactionRepository,
        randomUUID,
      );
      setResultMessage(generationMessage(result.createdCount, result.existingCount));
      await loadData();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '예정 거래를 생성하지 못했습니다.',
      );
    } finally {
      setGenerating(false);
    }
  }

  async function toggleRule(rule: RecurringRule) {
    setUpdatingId(rule.id);
    setError(null);
    setResultMessage(null);
    try {
      await localRecurringRuleRepository.save({
        ...rule,
        isActive: !rule.isActive,
        updatedAt: new Date().toISOString(),
      });
      if (!rule.isActive) {
        const result = await generateDueRecurringTransactions(
          localRecurringRuleRepository,
          localTransactionRepository,
          randomUUID,
        );
        setResultMessage(
          generationMessage(result.createdCount, result.existingCount),
        );
      }
      await loadData();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '반복 규칙 상태를 변경하지 못했습니다.',
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <View style={sharedStyles.card} testID="recurring-rule-card">
      <View style={styles.cardHeading}>
        <View style={styles.headingText}>
          <Text style={sharedStyles.cardTitle}>반복 거래 관리</Text>
          <Text style={sharedStyles.body}>
            시작일을 기준으로 앱 실행 시 오늘까지의 예정 거래를 한 번씩 생성합니다.
          </Text>
        </View>
        <AppButton
          loading={generating}
          onPress={() => void generateDueTransactions()}
          testID="generate-recurring-transactions"
          variant="secondary"
        >
          지금 생성
        </AppButton>
      </View>

      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>거래 유형 *</Text>
          <ChoiceChips
            accessibilityLabel="반복 거래 유형"
            onChange={changeType}
            options={TRANSACTION_TYPES}
            value={draft.type}
          />
        </View>

        <AppInput
          {...(submitted && !draft.name.trim()
            ? { errorMessage: '반복 거래명을 입력해 주세요.' }
            : {})}
          label="반복 거래명"
          onChangeText={(name) => updateDraft((current) => ({ ...current, name }))}
          placeholder="예: 월세"
          required
          value={draft.name}
        />

        <MoneyInput
          {...(submitted &&
          (draft.totalAmount === null || draft.totalAmount <= 0)
            ? { errorMessage: '0보다 큰 금액을 입력해 주세요.' }
            : {})}
          label="반복 금액"
          onChangeValue={(totalAmount) =>
            updateDraft((current) => ({ ...current, totalAmount }))
          }
          required
          value={draft.totalAmount}
        />

        <View style={styles.fieldGroup} testID="recurring-category-options">
          <Text style={styles.label}>카테고리 *</Text>
          <ChoiceChips
            accessibilityLabel="반복 거래 카테고리"
            onChange={(categoryId) =>
              updateDraft((current) => ({ ...current, categoryId }))
            }
            options={visibleCategories.map(({ id, name }) => ({
              label: name,
              value: id,
            }))}
            value={draft.categoryId}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>반복 주기 *</Text>
          <ChoiceChips
            accessibilityLabel="반복 주기"
            onChange={(frequency) =>
              updateDraft((current) => ({ ...current, frequency }))
            }
            options={FREQUENCIES}
            value={draft.frequency}
          />
        </View>

        <AppInput
          inputMode="numeric"
          label={intervalLabel(draft.frequency)}
          onChangeText={(interval) =>
            updateDraft((current) => ({ ...current, interval }))
          }
          required
          value={draft.interval}
        />

        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <DateInput
              label="시작일"
              onChangeValue={(startDate) =>
                updateDraft((current) => ({ ...current, startDate }))
              }
              required
              value={draft.startDate}
            />
          </View>
          <View style={styles.dateField}>
            <DateInput
              helperText="비워 두면 계속 반복"
              label="종료일"
              onChangeValue={(endDate) =>
                updateDraft((current) => ({ ...current, endDate }))
              }
              value={draft.endDate}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>생성 방식 *</Text>
          <ChoiceChips
            accessibilityLabel="반복 거래 생성 방식"
            onChange={(mode) =>
              updateDraft((current) => ({
                ...current,
                requiresConfirmation: mode === 'needs_confirmation',
              }))
            }
            options={CONFIRMATION_MODES}
            value={confirmationMode}
          />
          <Text style={styles.helper}>
            금액 확인 필요 거래는 수정·저장하면 확정 상태로 바뀝니다.
          </Text>
        </View>

        <AppButton
          disabled={loading}
          loading={saving}
          onPress={() => void createRule()}
          testID="save-recurring-rule"
        >
          반복 규칙 저장
        </AppButton>
      </View>

      {errors.length > 1 ? (
        <Text style={styles.error}>
          추가로 확인할 항목이 {errors.length - 1}개 있습니다.
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityLiveRegion="assertive" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {resultMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.success}>
          {resultMessage}
        </Text>
      ) : null}

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator color={colors.primary} />
          <Text style={sharedStyles.body}>반복 규칙을 불러오는 중입니다.</Text>
        </View>
      ) : null}

      {!loading && rules.length === 0 ? (
        <Text style={sharedStyles.body}>저장된 반복 규칙이 없습니다.</Text>
      ) : null}

      {!loading && rules.length > 0 ? (
        <View style={styles.ruleList}>
          {rules.map((rule) => (
            <View
              key={rule.id}
              style={[styles.ruleRow, !rule.isActive && styles.inactiveRule]}
              testID={`recurring-rule-${rule.id}`}
            >
              <View style={styles.ruleText}>
                <Text style={styles.ruleName}>{rule.name}</Text>
                <Text style={styles.ruleMeta}>
                  {rule.type === 'expense' ? '지출' : '수입'} ·{' '}
                  {categoryNames.get(rule.categoryId) ?? '알 수 없는 카테고리'} ·{' '}
                  {recurringFrequencyLabel(rule)}
                </Text>
                <Text style={styles.ruleMeta}>
                  {formatKRW(rule.totalAmount)}원 · 다음 예정일{' '}
                  {rule.nextScheduledDate} ·{' '}
                  {rule.requiresConfirmation ? '금액 확인 필요' : '자동 확정'}
                </Text>
              </View>
              <AppButton
                accessibilityLabel={`${rule.name} ${rule.isActive ? '중지' : '재개'}`}
                loading={updatingId === rule.id}
                onPress={() => void toggleRule(rule)}
                variant={rule.isActive ? 'danger' : 'secondary'}
              >
                {rule.isActive ? '중지' : '재개'}
              </AppButton>
            </View>
          ))}
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
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dateField: {
    flexGrow: 1,
    minWidth: 200,
  },
  status: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  success: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  ruleList: {
    gap: 8,
  },
  ruleRow: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    padding: 12,
  },
  inactiveRule: {
    opacity: 0.65,
  },
  ruleText: {
    flex: 1,
    gap: 4,
  },
  ruleName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  ruleMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
