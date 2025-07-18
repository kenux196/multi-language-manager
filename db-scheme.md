# STPro 다국어 관리 시스템: 데이터베이스 스키마

PRD(제품 요구사항 문서)를 기반으로 설계된 SQLite 데이터베이스 스키마입니다.

## 스키마

```sql
-- 1. 언어 (Languages) 테이블
CREATE TABLE Languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,  -- IETF BCP 47 언어 코드 (예: ko, en-US, en-GB)
    name TEXT NOT NULL          -- UI에 표시될 언어 이름 (예: 한국어, 미국식 영어)
);

-- 2. 다국어 텍스트 키 (Translation Keys) 테이블
CREATE TABLE Translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,   -- 다국어 텍스트를 식별하는 고유 키 (예: "common.button.save")
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 텍스트 내용 (TextContents) 테이블
CREATE TABLE TextContents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    translation_id INTEGER NOT NULL, -- Translations(id) 외래 키
    language_id INTEGER NOT NULL,    -- Languages(id) 외래 키
    text TEXT NOT NULL,              -- 실제 번역된 텍스트
    FOREIGN KEY (translation_id) REFERENCES Translations(id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES Languages(id),
    UNIQUE (translation_id, language_id)
);

-- 4. 변경 이력 (History) 테이블
CREATE TABLE History (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    translation_id INTEGER NOT NULL, -- Translations(id) 외래 키
    language_id INTEGER NOT NULL,    -- Languages(id) 외래 키
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    changed_by TEXT,                 -- 변경자 (개발자 또는 시스템)
    old_text TEXT,                   -- 변경 전 텍스트
    new_text TEXT,                   -- 변경 후 텍스트
    FOREIGN KEY (translation_id) REFERENCES Translations(id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES Languages(id)
);
```

## 각 테이블에 대한 설명:

### Languages 테이블:

지원하는 언어 목록을 관리합니다.
id: 각 언어를 고유하게 식별하는 기본 키 (자동 증가).
code: 언어 코드 (예: ko, en-US, en-GB). 유일한 값이어야 합니다.
name: 언어 이름 (예: 한국어, 미국식 영어, 영국식 영어).

### Translations 테이블:

다국어 텍스트의 키와 생성/수정 시간을 관리합니다.
id: 각 다국어 텍스트를 고유하게 식별하는 기본 키 (자동 증가).
key: 다국어 텍스트를 식별하는 고유한 키 (예: "common.save", "user.welcome").
created_at: 레코드 생성 시각 (기본값: 현재 시각).
updated_at: 레코드 수정 시각 (기본값: 현재 시각).

### TextContents 테이블:

각 언어별 실제 텍스트 내용을 저장합니다.
id: 각 텍스트 내용을 고유하게 식별하는 기본 키 (자동 증가).
translation_id: Translations 테이블의 id를 참조하는 외래 키. 특정 다국어 텍스트를 가리킵니다.
language_id: Languages 테이블의 id를 참조하는 외래 키. 특정 언어를 가리킵니다.
text: 해당 언어로 번역된 텍스트 내용.
UNIQUE (translation_id, language_id): 동일한 다국어 텍스트에 대해 동일한 언어가 중복되지 않도록 제약합니다.

### History 테이블:

다국어 텍스트 변경 이력을 기록합니다.
id: 각 이력 레코드를 고유하게 식별하는 기본 키 (자동 증가).
translation_id: Translations 테이블의 id를 참조하는 외래 키. 변경된 다국어 텍스트를 가리킵니다.
language_id: Languages 테이블의 id를 참조하는 외래 키. 변경된 언어를 가리킵니다.
changed_at: 변경 시각 (기본값: 현재 시각).
changed_by: 변경자 (개발자 이름 또는 시스템).
old_text: 변경 전 텍스트 내용.
new_text: 변경 후 텍스트 내용.

## 참고 사항:

외래 키(Foreign Key): 테이블 간의 관계를 설정하고 데이터 무결성을 유지하기 위해 사용됩니다. ON DELETE CASCADE 옵션은 참조되는 Translations 레코드가 삭제될 때 관련 TextContents 및 History 레코드도 함께 삭제되도록 합니다.
유니크 제약(UNIQUE Constraint): Translations 테이블의 key 필드와 TextContents 테이블의 (translation_id, language_id) 조합에 유니크 제약을 설정하여 데이터 중복을 방지합니다.
자동 증가 (AUTOINCREMENT): 각 테이블의 id 필드는 새로운 레코드가 추가될 때 자동으로 증가하는 정수 값을 갖습니다.
데이터 타입: 텍스트 데이터는 TEXT, 시간 정보는 DATETIME 타입을 사용합니다. SQLite는 동적 타입 시스템을 가지므로 엄격한 타입 검사를 하지 않습니다.
