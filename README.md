# Pocket Diary

Pocket Diary는 iPhone과 Web에서 사용할 수 있는 로컬 우선(local-first) 가계부 앱입니다. 거래와 품목을 빠르게 기록하고, 월별 거래 내역과 품목별 구매 이력을 확인하는 것이 현재 P0 목표입니다.

데이터는 계정이나 외부 서버 없이 기기에 저장됩니다. iOS에서는 SQLite를, Web에서는 IndexedDB를 사용하며, 화면은 공통 저장소 인터페이스를 통해 동일한 방식으로 데이터에 접근합니다.

## 현재 구현 범위

- 홈, 내역, 품목, 통계, 설정 탭
- 거래 및 상세 품목 등록·조회·수정·삭제
- 최근 입력을 활용한 품목명 자동완성
- 월별 거래 내역 조회
- 품목 검색 및 구매 이력 조회
- iOS SQLite 및 Web IndexedDB 기반 로컬 저장
- 단위 테스트와 데스크톱·모바일 Web Playwright E2E 테스트

로그인, 클라우드 동기화, 영수증 OCR과 같은 기능은 현재 P0 범위에 포함하지 않습니다. 상세 일정과 비즈니스 규칙은 [PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md)를 참고하세요.

## 프로젝트 구조

```text
pocket_diary/
├── src/
│   ├── app/          # Expo Router 화면과 라우트
│   ├── components/   # 거래 폼, 목록 등 재사용 UI
│   ├── constants/    # 테마와 공통 상수
│   ├── data/         # 저장소 인터페이스, SQLite/IndexedDB 어댑터, 마이그레이션
│   └── domain/       # 거래·품목 도메인 모델과 비즈니스 규칙
├── e2e/              # Playwright Web E2E 테스트
├── docs/             # 제품 계획과 프로젝트 작업 지침
├── assets/           # 앱 아이콘과 정적 이미지
├── app.json          # Expo 앱 설정
├── package.json      # 스크립트와 의존성
└── playwright.config.ts
```

주요 화면은 Expo Router의 파일 기반 라우팅을 사용합니다. 탭 화면은 `src/app/(tabs)`에, 거래 생성·상세·수정 화면은 `src/app/transactions`에 있습니다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 앱 프레임워크 | Expo SDK 57, React Native 0.86, React 19 |
| 언어 | TypeScript 6, strict mode |
| 라우팅 | Expo Router |
| iOS 로컬 저장 | `expo-sqlite` |
| Web 로컬 저장 | IndexedDB, `idb` |
| ID 생성 | `expo-crypto` |
| 단위 테스트 | Node.js test runner, `tsx`, `fake-indexeddb` |
| E2E 테스트 | Playwright, Chromium |
| 코드 품질 | ESLint, TypeScript, Expo Doctor |

정확한 패키지 버전은 `package.json`과 `package-lock.json`에서 관리합니다.

## 실행 방법

### 사전 준비

- Node.js 22.13 이상과 npm
- iOS 실행 시 macOS, Xcode 및 iOS Simulator

저장소의 `.nvmrc`는 Node.js 22를 지정합니다. nvm을 사용하는 경우 다음 명령으로 의존성을 설치합니다.

```bash
nvm install
nvm use
npm install
```

### Web 실행

```bash
npm run web
```

터미널에 표시되는 주소를 브라우저에서 열면 됩니다.

### iOS Simulator 실행

Xcode를 처음 설치한 환경이라면 먼저 Command Line Tools와 초기 구성 상태를 확인합니다.

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
xcrun simctl list devices available
```

그다음 저장소 루트에서 Simulator와 앱을 실행합니다. Xcode에서 프로젝트 파일을 직접 열 필요는 없습니다.

```bash
open -a Simulator
nvm use
npm run ios
```

## 테스트와 검증

Playwright를 처음 사용하는 환경에서는 Chromium을 한 번 설치합니다.

```bash
npx playwright install chromium
```

주요 검증 명령은 다음과 같습니다.

| 명령 | 용도 |
| --- | --- |
| `npm test` | 도메인 및 저장소 단위 테스트 |
| `npm run test:e2e` | 데스크톱·모바일 Web E2E 테스트 |
| `npm run test:e2e:headed` | 브라우저를 표시하며 E2E 테스트 |
| `npm run typecheck` | 앱·테스트·E2E TypeScript 검사 |
| `npm run lint` | ESLint 검사 |
| `npx expo-doctor@latest` | Expo 설정과 패키지 호환성 검사 |
| `npm run export:web` | Web 정적 번들 생성 확인 |
| `npm run export:ios` | iOS 번들 생성 확인 |

전체 로컬 검증은 아래 순서로 실행할 수 있습니다.

```bash
npm test
npm run test:e2e
npm run typecheck
npm run lint
npx expo-doctor@latest
npm run export:web
npm run export:ios
```

## 로컬 데이터 참고사항

- iOS와 Web은 서로 다른 기기 저장소를 사용하므로 데이터가 자동으로 동기화되지 않습니다.
- 브라우저 사이트 데이터나 Simulator의 앱 데이터를 삭제하면 저장된 거래도 함께 삭제됩니다.
- 금액은 부동소수점 오차를 피하기 위해 정수 단위로 저장합니다.
- 화면 코드는 플랫폼별 저장 기술에 직접 의존하지 않고 `TransactionRepository` 인터페이스를 사용합니다.

## 관련 문서

- [제품 계획 및 Day별 완료 조건](docs/PRODUCT_PLAN.md)
- [저장소 작업 지침](docs/AGENTS.md)
