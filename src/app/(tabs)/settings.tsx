import { useState } from 'react';

import { CategoryListCard } from '@/components/category-list-card';
import { PlaceholderCard } from '@/components/placeholder-card';
import { RecurringRuleCard } from '@/components/recurring-rule-card';
import { Screen } from '@/components/screen';

export default function SettingsScreen() {
  const [categoryRevision, setCategoryRevision] = useState(0);

  return (
    <Screen description="카테고리와 로컬 데이터를 관리하는 공간" title="설정">
      <PlaceholderCard title="로컬 모드">
        현재 버전은 로그인 없이 기기에 저장합니다. 계정과 클라우드를 도입할 때 가입을
        필수로 전환하며, Google Sheets 연동은 그 이후에 검토합니다.
      </PlaceholderCard>
      <CategoryListCard
        onCategoriesChange={() => setCategoryRevision((current) => current + 1)}
      />
      <RecurringRuleCard categoryRevision={categoryRevision} />
    </Screen>
  );
}
