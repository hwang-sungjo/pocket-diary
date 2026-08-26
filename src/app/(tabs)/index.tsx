import { StyleSheet, Text, View } from 'react-native';

import { Screen, sharedStyles } from '@/components/screen';
import { StorageVerificationCard } from '@/components/storage-verification-card';
import { colors } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <Screen
      description="상세 품목까지 기록하는 로컬 우선 가계부"
      title="Pocket Diary"
    >
      <View style={styles.summaryGrid}>
        <SummaryCard label="이번 달 지출" value="₩0" />
        <SummaryCard label="이번 달 수입" value="₩0" />
        <SummaryCard label="이번 달 잔액" value="₩0" />
      </View>
      <StorageVerificationCard />
      <View style={sharedStyles.card}>
        <Text style={sharedStyles.cardTitle}>최근 거래</Text>
        <Text style={sharedStyles.body}>
          Day 1에서는 앱 구조와 저장 기술을 검증합니다. 거래 입력 흐름은 다음 개발일에
          확장합니다.
        </Text>
      </View>
    </Screen>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexGrow: 1,
    gap: 6,
    minWidth: 150,
    padding: 16,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
});

