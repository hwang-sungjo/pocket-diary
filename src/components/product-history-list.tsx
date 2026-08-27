import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { sharedStyles } from '@/components/screen';
import { AppInput } from '@/components/ui/app-input';
import { colors } from '@/constants/theme';
import { localTransactionRepository } from '@/data/local-transaction-repository';
import { formatKRW } from '@/domain/input-values';
import {
  buildProductPurchaseHistories,
  searchProductPurchaseHistories,
  type ProductPurchaseHistory,
} from '@/domain/product-history';

const purchaseDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function ProductHistoryList() {
  const [query, setQuery] = useState('');
  const [histories, setHistories] = useState<ProductPurchaseHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      localTransactionRepository.list().then(
        (aggregates) => {
          if (active) {
            setHistories(buildProductPurchaseHistories(aggregates));
            setError(null);
            setLoading(false);
          }
        },
        (cause: unknown) => {
          if (active) {
            setError(
              cause instanceof Error
                ? cause.message
                : '품목 구매 이력을 불러오지 못했습니다.',
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

  const filteredHistories = useMemo(
    () => searchProductPurchaseHistories(histories, query),
    [histories, query],
  );

  return (
    <View style={styles.container} testID="product-history-list">
      <AppInput
        label="제품명 검색"
        onChangeText={setQuery}
        placeholder="예: 우유, 세제"
        value={query}
      />

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator color={colors.primary} />
          <Text style={sharedStyles.body}>구매 이력을 불러오는 중입니다.</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error && filteredHistories.length === 0 ? (
        <View style={sharedStyles.card}>
          <Text style={sharedStyles.cardTitle}>검색 결과가 없습니다</Text>
          <Text style={sharedStyles.body}>
            상세 품목으로 저장된 제품명을 검색해 주세요.
          </Text>
        </View>
      ) : null}

      {filteredHistories.map((history) => (
        <View key={history.key} style={sharedStyles.card}>
          <View style={styles.historyHeading}>
            <View style={styles.headingText}>
              <Text accessibilityRole="header" style={sharedStyles.cardTitle}>
                {history.name}
              </Text>
              {history.specification ? (
                <Text style={styles.specification}>{history.specification}</Text>
              ) : null}
            </View>
            <Text style={styles.count}>{history.purchases.length}회 구매</Text>
          </View>

          {history.purchases.map((purchase) => (
            <Pressable
              accessibilityRole="button"
              key={purchase.itemId}
              onPress={() =>
                router.push({
                  pathname: '/transactions/[id]',
                  params: { id: purchase.transactionId },
                })
              }
              style={({ pressed }) => [
                styles.purchase,
                pressed && styles.pressed,
              ]}
              testID={`purchase-${purchase.transactionId}`}
            >
              <View style={styles.purchaseText}>
                <Text style={styles.purchaseDate}>
                  {purchaseDateFormatter.format(new Date(purchase.occurredAt))}
                </Text>
                <Text style={styles.purchaseMeta}>
                  {purchase.merchantName ?? '상점 미입력'} · 수량 {purchase.quantity}
                  {purchase.unitPrice === null
                    ? ''
                    : ` · 단가 ${formatKRW(purchase.unitPrice)}원`}
                </Text>
              </View>
              <Text style={styles.price}>{formatKRW(purchase.totalPrice)}원</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
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
  historyHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headingText: {
    flex: 1,
    gap: 3,
  },
  specification: {
    color: colors.muted,
    fontSize: 13,
  },
  count: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  purchase: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  purchaseText: {
    flex: 1,
    gap: 4,
  },
  purchaseDate: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  purchaseMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  price: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
});
