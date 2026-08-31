import { randomUUID } from 'expo-crypto';
import { StyleSheet, Text, View } from 'react-native';

import {
  AutocompleteInput,
  type AutocompleteOption,
} from '@/components/ui/autocomplete-input';
import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { MoneyInput } from '@/components/ui/money-input';
import { colors } from '@/constants/theme';
import type { Category } from '@/domain/category';
import {
  normalizeLookupValue,
  type ProductSuggestion,
} from '@/domain/autocomplete';
import type { TransactionItemDraft } from '@/domain/transaction-draft';

interface TransactionItemEditorProps {
  categories: Category[];
  index: number;
  item: TransactionItemDraft;
  productSuggestions: ProductSuggestion[];
  showErrors: boolean;
  onChange: (item: TransactionItemDraft) => void;
  onRemove: () => void;
}

function calculateTotal(
  quantityText: string,
  unitPrice: number | null,
): number | null {
  const quantity = Number(quantityText);
  const total = unitPrice === null ? Number.NaN : quantity * unitPrice;
  return Number.isSafeInteger(total) && total > 0 ? total : null;
}

export function TransactionItemEditor({
  categories,
  index,
  item,
  productSuggestions,
  showErrors,
  onChange,
  onRemove,
}: TransactionItemEditorProps) {
  const productOptions: AutocompleteOption[] = productSuggestions.map(
    (product) => ({
      id: product.id,
      label: product.specification
        ? `${product.name} · ${product.specification}`
        : product.name,
      value: product.name,
    }),
  );
  const categoryOptions = [
    { label: '거래 카테고리 사용', value: '__inherit__' },
    ...categories.map(({ id, isActive, name }) => ({
      label: isActive ? name : `${name} (숨김)`,
      value: id,
    })),
  ];
  const quantity = Number(item.quantity);

  return (
    <View style={styles.card} testID={`transaction-item-${index + 1}`}>
      <View style={styles.heading}>
        <Text style={styles.title}>품목 {index + 1}</Text>
        <AppButton onPress={onRemove} variant="danger">
          삭제
        </AppButton>
      </View>

      <AutocompleteInput
        {...(
          showErrors && !item.productName.trim()
            ? { errorMessage: '제품명을 입력해 주세요.' }
            : {}
        )}
        label={`품목 ${index + 1} 제품명`}
        onChangeValue={(productName) =>
          onChange({
            ...item,
            productId:
              productSuggestions.some(({ id }) => id === item.productId) &&
              normalizeLookupValue(productName) !==
                normalizeLookupValue(item.productName)
                ? randomUUID()
                : item.productId,
            productName,
          })
        }
        onSelectOption={(option) => {
          const product = productSuggestions.find(({ id }) => id === option.id);
          onChange({
            ...item,
            productId: option.id,
            productName: option.value,
            specification: product?.specification ?? item.specification,
          });
        }}
        options={productOptions}
        placeholder="예: 우유"
        required
        value={item.productName}
      />

      <View style={styles.row}>
        <View style={styles.field}>
          <AppInput
            {...(
              showErrors && (!Number.isFinite(quantity) || quantity <= 0)
                ? { errorMessage: '0보다 큰 수량을 입력해 주세요.' }
                : {}
            )}
            inputMode="decimal"
            label={`품목 ${index + 1} 수량`}
            onChangeText={(nextQuantity) =>
              onChange({
                ...item,
                quantity: nextQuantity,
                totalPrice:
                  item.unitPrice === null
                    ? item.totalPrice
                    : calculateTotal(nextQuantity, item.unitPrice),
              })
            }
            value={item.quantity}
          />
        </View>
        <View style={styles.field}>
          <MoneyInput
            label={`품목 ${index + 1} 단가`}
            onChangeValue={(unitPrice) =>
              onChange({
                ...item,
                unitPrice,
                totalPrice: calculateTotal(item.quantity, unitPrice),
              })
            }
            placeholder="선택"
            value={item.unitPrice}
          />
        </View>
        <View style={styles.field}>
          <MoneyInput
            {...(
              showErrors &&
              (item.totalPrice === null || item.totalPrice <= 0)
                ? { errorMessage: '합계 금액을 입력해 주세요.' }
                : {}
            )}
            label={`품목 ${index + 1} 합계`}
            onChangeValue={(totalPrice) => onChange({ ...item, totalPrice })}
            required
            value={item.totalPrice}
          />
        </View>
      </View>

      <AppInput
        label={`품목 ${index + 1} 규격`}
        onChangeText={(specification) =>
          onChange({
            ...item,
            productId:
              productSuggestions.some(({ id }) => id === item.productId) &&
              normalizeLookupValue(specification) !==
                normalizeLookupValue(item.specification)
                ? randomUUID()
                : item.productId,
            specification,
          })
        }
        placeholder="예: 2L, 500g"
        value={item.specification}
      />

      <View style={styles.categoryField}>
        <Text style={styles.label}>품목 카테고리</Text>
        <ChoiceChips
          accessibilityLabel={`품목 ${index + 1} 카테고리`}
          onChange={(categoryId) =>
            onChange({
              ...item,
              categoryId: categoryId === '__inherit__' ? null : categoryId,
            })
          }
          options={categoryOptions}
          value={item.categoryId ?? '__inherit__'}
        />
      </View>

      <AppInput
        label={`품목 ${index + 1} 메모`}
        multiline
        onChangeText={(memo) => onChange({ ...item, memo })}
        placeholder="할인, 묶음 상품 등"
        value={item.memo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 16,
    padding: 14,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  field: {
    flexGrow: 1,
    minWidth: 160,
  },
  categoryField: {
    gap: 8,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
