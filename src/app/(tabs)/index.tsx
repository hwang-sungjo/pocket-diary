import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { MonthlyStatisticsCard } from '@/components/monthly-statistics-card';
import { Screen, sharedStyles } from '@/components/screen';
import { AppButton } from '@/components/ui/app-button';

export default function HomeScreen() {
  return (
    <Screen
      action={
        <AppButton onPress={() => router.push('/transactions/new')}>
          거래 등록
        </AppButton>
      }
      description="상세 품목까지 기록하는 로컬 우선 가계부"
      title="Pocket Diary"
    >
      <MonthlyStatisticsCard categoryLimit={3} />
      <View style={sharedStyles.card}>
        <Text style={sharedStyles.cardTitle}>최근 거래</Text>
        <Text style={sharedStyles.body}>
          새 거래를 등록하면 저장 직후 상세 품목까지 다시 열어 확인할 수 있습니다.
        </Text>
      </View>
    </Screen>
  );
}
