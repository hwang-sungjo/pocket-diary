# Pocket Diary

iPhone과 Web에서 동작하는 로컬 우선 가계부의 Expo 프로젝트다. 현재 구현은 `PRODUCT_PLAN.md`의 Day 1 기술 검증 범위에 맞춰져 있다.

## 시작하기

Node.js 22.13 이상이 필요하다. nvm을 사용한다면 저장소 루트에서 다음 명령을 실행한다.

```bash
nvm use
npm install
npm run web
```

iOS Simulator가 설치된 macOS에서는 다음 명령으로 실행한다.

```bash
npm run ios
```

## 검증 명령

```bash
npm test
npm run typecheck
npm run lint
npm run export:web
npm run export:ios
```

## Day 1 저장 구조

- 화면은 `TransactionRepository` 인터페이스만 사용한다.
- iOS 네이티브 번들은 `expo-sqlite` 어댑터와 거래/상세 품목 테이블을 사용한다.
- Web 번들은 브라우저 IndexedDB 어댑터를 사용하며 거래와 상세 품목을 별도 object store에 저장한다.
- 홈 화면은 테스트 거래 한 건을 저장한 후 다시 조회해 결과를 표시한다.
- 원격 동기화와 로그인은 P1 범위이므로 포함하지 않는다.
