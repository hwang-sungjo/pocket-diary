import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { sharedStyles } from '@/components/screen';
import { colors } from '@/constants/theme';
import { localTransactionRepository } from '@/data/local-transaction-repository';
import { verifyLocalStorage } from '@/data/verify-local-storage';
import type { TransactionAggregate } from '@/domain/transaction';

type VerificationState =
  | { status: 'checking' }
  | { status: 'success'; aggregate: TransactionAggregate }
  | { status: 'error'; message: string };

const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

export function StorageVerificationCard() {
  const [state, setState] = useState<VerificationState>({ status: 'checking' });

  const verify = useCallback(async () => {
    setState({ status: 'checking' });

    try {
      const aggregate = await verifyLocalStorage(localTransactionRepository);
      setState({ status: 'success', aggregate });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '알 수 없는 저장 오류가 발생했습니다.';
      setState({ status: 'error', message });
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    void verifyLocalStorage(localTransactionRepository)
      .then((aggregate) => {
        if (isActive) {
          setState({ status: 'success', aggregate });
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          const message =
            error instanceof Error
              ? error.message
              : '알 수 없는 저장 오류가 발생했습니다.';
          setState({ status: 'error', message });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <View style={sharedStyles.card} testID="storage-verification-card">
      <View style={styles.titleRow}>
        <View style={styles.titleGroup}>
          <Text style={sharedStyles.cardTitle}>Day 1 로컬 저장 검증</Text>
          <Text style={sharedStyles.body}>
            테스트 거래를 저장한 직후 Repository를 통해 다시 조회합니다.
          </Text>
        </View>
        <StatusBadge status={state.status} />
      </View>

      {state.status === 'checking' ? (
        <View style={styles.resultRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.resultText}>저장하고 다시 읽는 중…</Text>
        </View>
      ) : null}

      {state.status === 'success' ? (
        <View accessibilityLiveRegion="polite" style={styles.resultPanel}>
          <Text style={styles.transactionName}>
            {state.aggregate.transaction.name}
          </Text>
          <Text style={styles.amount}>
            {currencyFormatter.format(state.aggregate.transaction.totalAmount)}
          </Text>
          <Text style={styles.resultText} testID="storage-verification-result">
            저장 및 재조회 완료 · 품목 {state.aggregate.items.length}개
          </Text>
        </View>
      ) : null}

      {state.status === 'error' ? (
        <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
          {state.message}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={state.status === 'checking'}
        onPress={() => void verify()}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          state.status === 'checking' && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.buttonText}>다시 검증</Text>
      </Pressable>
    </View>
  );
}

function StatusBadge({ status }: { status: VerificationState['status'] }) {
  const label =
    status === 'checking' ? '확인 중' : status === 'success' ? '정상' : '오류';

  return (
    <View
      style={[
        styles.badge,
        status === 'error' ? styles.errorBadge : styles.successBadge,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          status === 'error' ? styles.errorBadgeText : styles.successBadgeText,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  titleGroup: {
    flex: 1,
    gap: 6,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  successBadge: {
    backgroundColor: colors.primarySoft,
  },
  errorBadge: {
    backgroundColor: '#FEE4E2',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  successBadgeText: {
    color: colors.success,
  },
  errorBadgeText: {
    color: colors.danger,
  },
  resultRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  resultPanel: {
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    gap: 4,
    padding: 14,
  },
  transactionName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  amount: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  resultText: {
    color: colors.muted,
    fontSize: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
