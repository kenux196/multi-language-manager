# STPro 다국어 관리 시스템: 작업 현황 및 To-Do List

## 1. 현재까지 구현된 내용

### 1.1. 프로젝트 초기 설정 및 기본 구조
- **백엔드**: Node.js, TypeScript, Express.js 기반 API 서버 구축 (`src/index.ts`, `src/api/translations.ts`, `src/api/history.ts`)
- **데이터베이스**: SQLite 연동 및 기본 스키마 구성 (`src/database.ts`)
- **프론트엔드**: Vue3, TypeScript, TailwindCSS 기반 UI 초기 설정 (`public/`, `index.html`, `tailwind.config.js`)
- **패키지 관리**: Yarn 사용 (`yarn.lock`, `package.json`)

### 1.2. 주요 기능 (Functional Requirements)
- **F-1: 초기 데이터 일괄 등록 (Bulk Import)**:
    - JSON 파일 업로드 및 파싱을 통한 데이터 일괄 등록 API (`/api/translations/import`) 및 UI 구현 완료.
- **F-2: 다국어 목록 조회 및 검색**:
    - 다국어 목록 조회 및 Key 또는 텍스트 내용으로 검색하는 API (`/api/translations`) 및 UI 구현 완료.
- **F-3: 다국어 추가**:
    - 신규 Key와 각 언어별 텍스트를 입력하여 추가하는 API (`/api/translations`) 및 UI 구현 완료.
- **F-4: 다국어 수정**:
    - `src/api/translations.ts`의 `PUT /:id` 엔드포인트 및 UI 구현 완료.
    - `old_text` 기록 로직 개선으로 변경 이력 추적 정확도 향상.
- **F-5: 데이터 Export**:
    - 등록된 전체 다국어 데이터를 언어별 JSON 파일로 Export하는 API (`/api/translations/export`) 및 UI 구현 완료.
- **F-6: 변경 이력 추적 (완성)**:
    - 다국어 텍스트 생성 및 수정 시 변경 이력 자동 기록 (`src/api/translations.ts`) 및 특정 다국어 Key에 대한 변경 이력 조회 API (`/api/history/:translation_id`) 및 UI 구현 완료.
- **F-7: 지원 언어 확장 (부분 구현)**:
    - 시스템은 동적으로 언어를 처리하도록 설계되었으나, UI를 통한 언어 추가/관리 기능은 아직 구현되지 않음.

## 2. 앞으로 진행할 작업 (To-Do List)

### 2.1. 주요 기능 요구사항 (Functional Requirements)

#### 2.1.1. 다국어 데이터 관리
- [x] **F-1: 초기 데이터 일괄 등록 (Bulk Import)**
    - JSON 또는 Excel(CSV) 파일 형태로 일괄 업로드 기능 구현.
    - 업로드 시 각 언어별 데이터 매핑 기능 구현.
- [x] **F-2: 다국어 목록 조회 및 검색**
    - Key 또는 특정 언어의 텍스트 내용으로 다국어를 검색하는 기능 구현.
- [x] **F-3: 다국어 추가**
    - 신규 Key와 함께 각 언어별 텍스트를 입력하여 추가하는 UI 및 API 연동.
- [x] **F-5: 데이터 Export**
    - 등록된 전체 다국어 데이터를 특정 포맷(예: 언어별 JSON 파일)으로 Export하는 UI 및 API 연동.

#### 2.1.2. 변경 이력 관리
- [x] **F-6: 변경 이력 추적 (완성)**
    - 특정 다국어 Key에 대한 변경 이력을 조회할 수 있는 기능 구현 (UI 및 API).

#### 2.1.3. 언어 관리
- [ ] **F-7: 지원 언어 확장**
    - 새로운 언어(예: 일본어, 중국어 등)를 쉽게 추가하고 관리할 수 있는 기능 구현 (UI 및 API).

### 2.2. 비기능적 요구사항 (Non-functional Requirements)
- [ ] **사용성 (Usability)**: 개발자가 직관적으로 사용할 수 있는 간결하고 명확한 UI/UX 개선.
- [ ] **성능 (Performance)**: 수천 개의 다국어 키가 등록되더라도 검색 및 목록 조회 시 빠른 응답 속도 보장.
- [ ] **보안 (Security)**: 인가된 사용자만 시스템에 접근하고 데이터를 수정할 수 있도록 보안 기능 구현.

### 2.3. 향후 고려사항 (Roadmap / Future Considerations)
- [ ] **사용자 인증 및 권한 관리**: 역할(Admin, Developer)에 따른 기능 접근 제어.
- [ ] **번역 상태 관리**: 각 텍스트의 번역 진행 상태(미번역, 초벌번역, 검수완료 등)를 표시하는 기능.
- [ ] **CI/CD 연동**: Git Push 등 특정 이벤트 발생 시, 다국어 데이터를 자동으로 프로젝트에 반영하는 CI/CD 파이프라인 연동.
- [ ] **API 제공**: 외부 시스템에서 다국어 데이터를 조회하거나 수정할 수 있는 RESTful API 제공.