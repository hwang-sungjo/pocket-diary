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
import { calculateProductPurchaseCycle } from '@/domain/product-purchase-cycle';

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

      {error ? (
        <Text
          accessibilityLiveRegion="assertive"
          style={styles.error}
          testID="product-history-error"
        >
          {error}
        </Text>
      ) : null}

      {!loading && !error && filteredHistories.length === 0 ? (
        <View style={sharedStyles.card}>
          <Text style={sharedStyles.cardTitle}>검색 결과가 없습니다</Text>
          <Text style={sharedStyles.body}>
            상세 품목으로 저장된 제품명을 검색해 주세요.
          </Text>
        </View>
      ) : null}

      {filteredHistories.map((history, index) => {
        const cycle = calculateProductPurchaseCycle(history.purchases);

        return (
          <View
            key={history.key}
            style={sharedStyles.card}
            testID={`product-history-${index}`}
          >
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

            <View style={styles.cycle} testID={`product-cycle-${index}`}>
              <Text style={styles.cycleTitle}>구매 주기 (중앙값)</Text>
              {cycle ? (
                <View style={styles.cycleDetails}>
                  <Text
                    style={styles.cycleValue}
                    testID={`product-cycle-interval-${index}`}
                  >
                    약 {cycle.typicalIntervalDays}일 간격
                  </Text>
                  <Text
                    style={styles.cycleDate}
                    testID={`product-cycle-date-${index}`}
                  >
                    다음 구매 예상:{' '}
                    {purchaseDateFormatter.format(
                      new Date(`${cycle.expectedNextPurchaseDate}T12:00:00`),
                    )}
                  </Text>
                  <Text style={styles.cycleNote}>
                    과거 구매일을 바탕으로 한 참고 정보입니다.
                  </Text>
                </View>
              ) : (
                <Text style={styles.cycleNote}>
                  데이터 부족 · 날짜가 다른 구매 3회부터 표시합니다.
                </Text>
              )}
            </View>

            {history.purchases.map((purchase) => (
              <Pressable
                accessibilityLabel={`${history.name}, ${purchaseDateFormatter.format(new Date(purchase.occurredAt))}, ${formatKRW(purchase.totalPrice)}원 거래 열기`}
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
                <Text adjustsFontSizeToFit numberOfLines={1} style={styles.price}>
                  {formatKRW(purchase.totalPrice)}원
                </Text>
              </Pressable>
            ))}
          </View>
        );
      })}
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
  cycle: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    gap: 4,
    padding: 12,
  },
  cycleDetails: {
    gap: 3,
  },
  cycleTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  cycleValue: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  cycleDate: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  cycleNote: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
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
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
    maxWidth: '48%',
    textAlign: 'right',
  },
});
