import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { sharedStyles } from '@/components/screen';
import { TransactionItemEditor } from '@/components/transaction-item-editor';
import {
  AutocompleteInput,
  type AutocompleteOption,
} from '@/components/ui/autocomplete-input';
import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DateInput } from '@/components/ui/date-input';
import { MoneyInput } from '@/components/ui/money-input';
import { colors } from '@/constants/theme';
import { localCategoryRepository } from '@/data/local-category-repository';
import { localTransactionRepository } from '@/data/local-transaction-repository';
import {
  buildAutocompleteSuggestions,
  normalizeLookupValue,
  type AutocompleteSuggestions,
} from '@/domain/autocomplete';
import type { Category } from '@/domain/category';
import { formatKRW, isValidISODate } from '@/domain/input-values';
import {
  buildTransactionAggregate,
  calculateDraftItemTotal,
  calculateDraftUnclassifiedAmount,
  createTransactionDraft,
  createTransactionDraftFromAggregate,
  createTransactionItemDraft,
  getTransactionDraftErrors,
  isValidTime,
  type TransactionDraft,
  type TransactionItemDraft,
} from '@/domain/transaction-draft';
import type {
  TransactionAggregate,
  TransactionType,
} from '@/domain/transaction';

const EMPTY_SUGGESTIONS: AutocompleteSuggestions = {
  transactionNames: [],
  merchants: [],
  products: [],
};

const TRANSACTION_TYPES = [
  { label: '지출', value: 'expense' },
  { label: '수입', value: 'income' },
] as const;

const PAYMENT_METHODS = [
  { label: '선택 안 함', value: '__none__' },
  { label: '카드', value: 'card' },
  { label: '현금', value: 'cash' },
  { label: '계좌이체', value: 'transfer' },
  { label: '기타', value: 'other' },
] as const;

interface TransactionFormProps {
  transactionId?: string;
}

export function TransactionForm({ transactionId }: TransactionFormProps) {
  const [draft, setDraft] = useState<TransactionDraft>(() =>
    createTransactionDraft(),
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestions, setSuggestions] =
    useState<AutocompleteSuggestions>(EMPTY_SUGGESTIONS);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [overageConfirmed, setOverageConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [existingAggregate, setExistingAggregate] =
    useState<TransactionAggregate | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      localCategoryRepository.list({ includeInactive: true }),
      localTransactionRepository.list(),
      transactionId
        ? localTransactionRepository.findById(transactionId)
        : Promise.resolve(null),
    ]).then(
      ([nextCategories, aggregates, aggregateToEdit]) => {
        if (!active) {
          return;
        }

        setCategories(nextCategories);
        setSuggestions(buildAutocompleteSuggestions(aggregates));
        setExistingAggregate(aggregateToEdit);

        if (transactionId && !aggregateToEdit) {
          setFormError('수정할 거래를 찾지 못했습니다.');
        } else if (aggregateToEdit) {
          setDraft(createTransactionDraftFromAggregate(aggregateToEdit));
        } else {
          setDraft((current) => ({
            ...current,
            categoryId:
              current.categoryId ||
              nextCategories.find(
                ({ isActive, type }) => isActive && type === current.type,
              )?.id ||
              '',
          }));
        }
        setLoadingData(false);
      },
      (cause: unknown) => {
        if (active) {
          setFormError(
            cause instanceof Error
              ? cause.message
              : '거래 입력에 필요한 데이터를 불러오지 못했습니다.',
          );
          setLoadingData(false);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [transactionId]);

  const visibleCategories = useMemo(() => {
    const selectedCategoryIds = new Set([
      draft.categoryId,
      ...draft.items.map(({ categoryId }) => categoryId),
    ]);
    return categories.filter(
      ({ id, isActive, type }) =>
        type === draft.type && (isActive || selectedCategoryIds.has(id)),
    );
  }, [categories, draft.categoryId, draft.items, draft.type]);
  const itemTotal = calculateDraftItemTotal(draft.items);
  const unclassifiedAmount = calculateDraftUnclassifiedAmount(draft);
  const hasOverage = unclassifiedAmount !== null && unclassifiedAmount < 0;
  const errors = submitted ? getTransactionDraftErrors(draft) : [];

  const transactionNameOptions: AutocompleteOption[] =
    suggestions.transactionNames.map((name) => ({
      id: `transaction-${normalizeLookupValue(name)}`,
      label: name,
      value: name,
    }));
  const merchantOptions: AutocompleteOption[] = suggestions.merchants.map(
    (merchant) => ({
      id: merchant.id,
      label: merchant.name,
      value: merchant.name,
    }),
  );
  const categoryOptions = visibleCategories.map(({ id, isActive, name }) => ({
    label: isActive ? name : `${name} (숨김)`,
    value: id,
  }));

  function updateDraft(
    updater: (current: TransactionDraft) => TransactionDraft,
    amountMayChange = false,
  ) {
    setDraft(updater);
    setFormError(null);
    if (amountMayChange) {
      setOverageConfirmed(false);
    }
  }

  function changeType(type: TransactionType) {
    updateDraft((current) => ({
      ...current,
      type,
      categoryId:
        categories.find(
          (category) => category.isActive && category.type === type,
        )?.id ?? '',
      items: current.items.map((item) => ({ ...item, categoryId: null })),
    }));
  }

  function updateItem(index: number, item: TransactionItemDraft) {
    updateDraft(
      (current) => ({
        ...current,
        items: current.items.map((currentItem, currentIndex) =>
          currentIndex === index ? item : currentItem,
        ),
      }),
      true,
    );
  }

  async function saveTransaction() {
    setSubmitted(true);
    setFormError(null);

    const validationErrors = getTransactionDraftErrors(draft);
    if (validationErrors.length > 0) {
      setFormError(validationErrors[0] ?? '입력값을 확인해 주세요.');
      return;
    }

    if (hasOverage && !overageConfirmed) {
      setFormError('품목 합계 초과 금액을 확인한 뒤 저장해 주세요.');
      return;
    }

    setSaving(true);
    try {
      const savedTransactionId = transactionId ?? randomUUID();
      const aggregate = buildTransactionAggregate(
        draft,
        savedTransactionId,
        new Date(),
        existingAggregate ?? undefined,
      );
      await localTransactionRepository.save(aggregate);

      const saved = await localTransactionRepository.findById(savedTransactionId);
      if (!saved || saved.items.length !== aggregate.items.length) {
        throw new Error('저장한 거래와 상세 품목을 다시 조회하지 못했습니다.');
      }

      router.replace({
        pathname: '/transactions/[id]',
        params: { id: savedTransactionId },
      });
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? cause.message
          : '거래를 저장하지 못했습니다.',
      );
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <View style={sharedStyles.card}>
        <Text style={sharedStyles.cardTitle}>거래 정보</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>거래 유형 *</Text>
          <ChoiceChips
            accessibilityLabel="거래 유형"
            onChange={changeType}
            options={TRANSACTION_TYPES}
            value={draft.type}
          />
        </View>

        <AutocompleteInput
          {...(submitted && !draft.name.trim()
            ? { errorMessage: '거래명을 입력해 주세요.' }
            : {})}
          label="거래명"
          onChangeValue={(name) => updateDraft((current) => ({ ...current, name }))}
          options={transactionNameOptions}
          placeholder="예: OO마트 장보기"
          required
          value={draft.name}
        />

        <MoneyInput
          {...(submitted &&
          (draft.totalAmount === null || draft.totalAmount <= 0)
            ? { errorMessage: '0보다 큰 금액을 입력해 주세요.' }
            : {})}
          label="총금액"
          onChangeValue={(totalAmount) =>
            updateDraft((current) => ({ ...current, totalAmount }), true)
          }
          required
          value={draft.totalAmount}
        />

        <View style={styles.row}>
          <View style={styles.field}>
            <DateInput
              {...(submitted && !isValidISODate(draft.date)
                ? { errorMessage: '올바른 날짜를 입력해 주세요.' }
                : {})}
              label="날짜"
              onChangeValue={(date) =>
                updateDraft((current) => ({ ...current, date }))
              }
              required
              value={draft.date}
            />
          </View>
          <View style={styles.field}>
            <AppInput
              {...(submitted && !isValidTime(draft.time)
                ? { errorMessage: 'HH:mm 형식으로 입력해 주세요.' }
                : {})}
              inputMode="numeric"
              label="시간"
              onChangeText={(time) =>
                updateDraft((current) => ({ ...current, time }))
              }
              placeholder="HH:mm"
              required
              value={draft.time}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>카테고리 *</Text>
          <ChoiceChips
            accessibilityLabel="거래 카테고리"
            onChange={(categoryId) =>
              updateDraft((current) => ({ ...current, categoryId }))
            }
            options={categoryOptions}
            value={draft.categoryId}
          />
          {submitted && !draft.categoryId ? (
            <Text style={styles.error}>카테고리를 선택해 주세요.</Text>
          ) : null}
        </View>

        <AutocompleteInput
          label="상점 또는 수입처"
          onChangeValue={(merchantName) => {
            const exact = suggestions.merchants.find(
              ({ name }) =>
                normalizeLookupValue(name) === normalizeLookupValue(merchantName),
            );
            updateDraft((current) => ({
              ...current,
              merchantId: merchantName
                ? exact?.id ??
                  (suggestions.merchants.some(
                    ({ id }) => id === current.merchantId,
                  )
                    ? randomUUID()
                    : current.merchantId ?? randomUUID())
                : null,
              merchantName,
            }));
          }}
          onSelectOption={(option) =>
            updateDraft((current) => ({
              ...current,
              merchantId: option.id,
              merchantName: option.value,
            }))
          }
          options={merchantOptions}
          placeholder="예: OO마트 강남점"
          value={draft.merchantName}
        />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>결제 수단</Text>
          <ChoiceChips
            accessibilityLabel="결제 수단"
            onChange={(paymentMethod) =>
              updateDraft((current) => ({
                ...current,
                paymentMethod:
                  paymentMethod === '__none__' ? null : paymentMethod,
              }))
            }
            options={PAYMENT_METHODS}
            value={draft.paymentMethod ?? '__none__'}
          />
        </View>

        <AppInput
          label="메모"
          multiline
          numberOfLines={3}
          onChangeText={(memo) => updateDraft((current) => ({ ...current, memo }))}
          placeholder="선택 사항"
          value={draft.memo}
        />
      </View>

      <View style={sharedStyles.card}>
        <View style={styles.sectionHeading}>
          <View style={styles.sectionTitleGroup}>
            <Text style={sharedStyles.cardTitle}>상세 품목</Text>
            <Text style={sharedStyles.body}>선택 사항이며 여러 개를 추가할 수 있습니다.</Text>
          </View>
          <AppButton
            onPress={() =>
              updateDraft(
                (current) => ({
                  ...current,
                  items: [
                    ...current.items,
                    createTransactionItemDraft(randomUUID(), randomUUID()),
                  ],
                }),
                true,
              )
            }
            variant="secondary"
          >
            품목 추가
          </AppButton>
        </View>

        {draft.items.length === 0 ? (
          <Text style={sharedStyles.body}>
            품목 없이 거래 총액만으로도 저장할 수 있습니다.
          </Text>
        ) : null}

        {draft.items.map((item, index) => (
          <TransactionItemEditor
            categories={visibleCategories}
            index={index}
            item={item}
            key={item.id}
            onChange={(nextItem) => updateItem(index, nextItem)}
            onRemove={() =>
              updateDraft(
                (current) => ({
                  ...current,
                  items: current.items.filter(({ id }) => id !== item.id),
                }),
                true,
              )
            }
            productSuggestions={suggestions.products}
            showErrors={submitted}
          />
        ))}

        <View style={styles.amountSummary} testID="amount-summary">
          <AmountRow label="거래 총액" value={draft.totalAmount} />
          <AmountRow label="품목 합계" value={itemTotal} />
          <AmountRow
            danger={hasOverage}
            label={hasOverage ? '초과 금액' : '미분류 금액'}
            testID="unclassified-amount"
            value={
              unclassifiedAmount === null
                ? null
                : Math.abs(unclassifiedAmount)
            }
          />
        </View>

        {hasOverage ? (
          <View style={styles.warning} testID="overage-warning">
            <Text style={styles.warningTitle}>품목 합계가 거래 총액보다 큽니다.</Text>
            <Text style={styles.warningText}>
              금액을 수정하거나, 의도한 입력이라면 초과 금액을 확인해 주세요.
            </Text>
            <AppButton
              onPress={() => {
                setOverageConfirmed(true);
                setFormError(null);
              }}
              variant={overageConfirmed ? 'secondary' : 'danger'}
            >
              {overageConfirmed ? '초과 금액 확인 완료' : '초과 금액 확인'}
            </AppButton>
          </View>
        ) : null}
      </View>

      {formError ? (
        <Text accessibilityLiveRegion="assertive" style={styles.formError}>
          {formError}
        </Text>
      ) : null}
      {errors.length > 1 ? (
        <Text style={styles.error}>추가로 확인할 항목이 {errors.length - 1}개 있습니다.</Text>
      ) : null}

      <AppButton
        disabled={loadingData}
        loading={saving}
        onPress={() => void saveTransaction()}
        testID="save-transaction"
      >
        {transactionId ? '변경 저장' : '거래 저장'}
      </AppButton>
    </View>
  );
}

function AmountRow({
  label,
  value,
  danger = false,
  testID,
}: {
  label: string;
  value: number | null;
  danger?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.amountRow} testID={testID}>
      <Text style={danger ? styles.dangerLabel : styles.amountLabel}>{label}</Text>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={danger ? styles.dangerAmount : styles.amountValue}
      >
        {value === null ? '—' : `${formatKRW(value)}원`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  field: {
    flexGrow: 1,
    minWidth: 200,
  },
  sectionHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  sectionTitleGroup: {
    flex: 1,
    gap: 5,
  },
  amountSummary: {
    backgroundColor: colors.background,
    borderRadius: 14,
    gap: 9,
    padding: 14,
  },
  amountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  amountValue: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  dangerAmount: {
    color: colors.danger,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
    maxWidth: '65%',
    textAlign: 'right',
  },
  dangerLabel: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  warning: {
    backgroundColor: '#FEE4E2',
    borderRadius: 14,
    gap: 8,
    padding: 14,
  },
  warningTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  warningText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  formError: {
    backgroundColor: '#FEE4E2',
    borderRadius: 12,
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
    padding: 14,
  },
});
