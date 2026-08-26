import { PlaceholderCard } from '@/components/placeholder-card';
import { Screen } from '@/components/screen';

export default function SettingsScreen() {
  return (
    <Screen description="카테고리와 로컬 데이터를 관리하는 공간" title="설정">
      <PlaceholderCard title="로컬 모드">
        P0는 로그인 없이 사용할 수 있습니다. 계정과 클라우드 동기화는 P1에서 별도로
        연결합니다.
      </PlaceholderCard>
    </Screen>
  );
}

