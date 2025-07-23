# STPro Language Management


# STPro 다국어 관리 시스템

## 개요
STPro 프로젝트의 웹/앱 서비스에 사용되는 다국어 텍스트(String)를 효율적으로 관리하고, 개발 프로세스와의 통합을 용이하게 하기 위한 웹 기반 시스템입니다. 다국어 추가/수정 작업을 간소화하고, 번역 품질을 일관되게 유지하며, 변경 이력을 투명하게 관리하는 것을 목표로 합니다.

## 주요 기능
- 초기 데이터 일괄 등록 (JSON/CSV 업로드)
- 다국어 목록 조회 및 검색 (Key, 한국어, 미국식 영어, 영국식 영어 등)
- 신규 다국어 추가 및 기존 텍스트 수정
- 전체 다국어 데이터 Export (언어별 JSON 등)
- 변경 이력 자동 기록 및 조회
- 지원 언어 확장 (ko, en-US, en-GB, 추후 추가 가능)

## 사용자 및 역할
- **개발자**: 신규/수정 요청, Export 기능 활용
- **프로젝트 관리자(Admin)**: 번역 상태 모니터링, 계정/언어 관리

## 기술 스택
### Backend
- Node.js
- TypeScript
- Express.js
- SQLite

### Frontend
- HTML
- JavaScript
- Tailwind CSS

### 패키지 매니저
- yarn

## 프로젝트 구조
- db-scheme.md: 데이터베이스 구조 문서
- GEMINI.md: 제품 요구사항(PRD)
- index.html: 프론트엔드 진입점
- package.json: 프로젝트 설정 및 의존성
- README.md: 프로젝트 소개 및 사용법
- ux.md: UX 설계 문서

## 향후 고려사항
- 사용자 인증 및 권한 관리
- 번역 상태 관리(미번역/초벌/검수 등)
- CI/CD 연동 및 자동화
- 외부 API 제공

---
문의: 프로젝트 담당자에게 연락