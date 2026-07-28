# 서술형 LLM AI 평가도구 학회 체험판

```text
휴대전화 QR 접속
  → Vercel의 index.html
  → /api/evaluate
  → OpenAI Responses API
  → Google Apps Script
  → Google Sheets 로그 및 통계
  → 평가 결과 화면
```

## 파일 구성

```text
music_ai_evaluator_vercel/
├─ index.html
├─ package.json
├─ vercel.json
├─ .env.example
├─ .gitignore
├─ api/
│  └─ evaluate.js
└─ apps-script/
   └─ Code.gs
```

---

## 1. OpenAI API 준비

1. OpenAI API 플랫폼에 로그인합니다.
2. 학회 체험판 전용 Project를 만듭니다.
3. Project의 API Keys에서 새 비밀키를 만듭니다.
4. 키는 한 번만 표시되므로 안전한 곳에 복사합니다.
5. Project의 Limits에서 월 지출 한도와 알림을 설정합니다.
6. ChatGPT Plus 구독과 API 요금은 별개이므로 API 결제 수단이 준비되어 있어야 합니다.

Vercel에는 다음 환경변수를 넣습니다.

```text
OPENAI_API_KEY=발급받은_API_키
OPENAI_MODEL=gpt-5-mini
```

---

## 2. Google Sheets 준비

### 2-1. 시트 생성

1. Google Sheets에서 새 스프레드시트를 만듭니다.
2. 주소에서 Spreadsheet ID를 복사합니다.

```text
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit
                                      └──────── Spreadsheet ID ────────┘
```

### 2-2. Apps Script 코드 입력

1. 스프레드시트 메뉴에서 `확장 프로그램 > Apps Script`를 엽니다.
2. 기존 코드를 모두 지웁니다.
3. `apps-script/Code.gs` 전체를 붙여 넣습니다.
4. 저장합니다.

### 2-3. Script Properties 설정

Apps Script 왼쪽의 `프로젝트 설정`에서 `스크립트 속성`에 아래 세 값을 추가합니다.

```text
SPREADSHEET_ID = 위에서 복사한 Spreadsheet ID
SHEET_NAME = responses
SHARED_SECRET = 직접 만든 긴 임의 문자열
```

`SHARED_SECRET`은 Vercel의 `GOOGLE_SCRIPT_SECRET`에도 똑같이 입력합니다.

### 2-4. 시트 초기화

1. Apps Script 상단 함수 선택 목록에서 `setupSheet`를 선택합니다.
2. `실행`을 누릅니다.
3. Google 권한을 승인합니다.
4. 스프레드시트에 `responses` 시트와 헤더가 생성되었는지 확인합니다.

### 2-5. 웹앱 배포

1. `배포 > 새 배포`
2. `유형 선택 > 웹 앱`
3. 실행 사용자: `나`
4. 액세스 권한: `모든 사용자(Anyone)`
5. `배포`
6. 마지막이 `/exec`인 URL을 복사합니다.

브라우저에서 URL을 열었을 때 다음과 비슷한 JSON이 보이면 정상입니다.

```json
{
  "ok": true,
  "service": "music-ai-evaluator-sheet-log",
  "message": "Google Apps Script endpoint is running."
}
```

---

## 3. GitHub에 프로젝트 올리기

1. GitHub 로그인
2. `New repository`
3. 저장소 이름 예: `music-ai-evaluator`
4. 저장소 생성
5. `Add file > Upload files`
6. 압축을 푼 프로젝트 안의 파일과 폴더를 모두 업로드
7. 다음 구조 확인

```text
index.html
package.json
vercel.json
api/evaluate.js
apps-script/Code.gs
```

8. `Commit changes`

---

## 4. Vercel 배포

1. Vercel에 GitHub 계정으로 로그인
2. `Add New... > Project`
3. GitHub 저장소 옆 `Import`
4. Framework Preset: `Other` 또는 자동 감지값
5. Root Directory: `./`
6. Build Command, Output Directory, Install Command: 입력하지 않음
7. `Deploy`

배포가 끝나면 다음과 같은 주소가 생성됩니다.

```text
https://프로젝트이름.vercel.app
```

---

## 5. Vercel 환경변수 입력

Vercel 프로젝트의 `Settings > Environment Variables`에 다음 네 값을 추가합니다.

```text
OPENAI_API_KEY
OPENAI_MODEL
GOOGLE_SCRIPT_URL
GOOGLE_SCRIPT_SECRET
```

예:

```text
OPENAI_API_KEY = sk-proj-...
OPENAI_MODEL = gpt-5-mini
GOOGLE_SCRIPT_URL = https://script.google.com/macros/s/.../exec
GOOGLE_SCRIPT_SECRET = Apps Script의 SHARED_SECRET과 같은 값
```

환경변수를 추가한 다음:

1. `Deployments`
2. 최근 배포의 `...`
3. `Redeploy`

---

## 6. 작동 시험 답안

### 상 수준

```text
세 장르는 모두 독창이나 합창과 기악 반주를 결합하여 가사의 내용을 음악으로 표현한다. 오페라는 연기, 의상, 무대 장치가 포함되는 종합무대예술이며 대체로 세속적 이야기를 다룬다. 오라토리오는 주로 종교적 내용을 다루지만 무대 연기 없이 연주회 형식으로 공연되는 대규모 성악곡이다. 칸타타는 교회용과 세속용이 있으며 오라토리오보다 규모가 비교적 작고 예배나 특정 행사와 연결되는 경우가 많다.
```

### 중 수준

```text
오페라, 오라토리오, 칸타타는 모두 노래와 악기 반주가 함께 사용되는 성악곡이다. 오페라는 무대에서 연기하고, 오라토리오는 종교적인 내용이 많다. 칸타타는 다른 두 장르보다 규모가 작은 편이다.
```

### 하 수준

```text
세 장르는 모두 옛날 음악이다. 오페라는 공연장에서 하고 칸타타와 오라토리오는 비슷한 음악이다. 자세한 차이는 잘 모르겠다.
```

확인 사항:

- 결과가 표시되는가
- 척도 선택이 작동하는가
- 강점과 보완점이 답안에 따라 달라지는가
- Google Sheets에 행이 추가되는가
- 응답자 수, 평균, 표준편차, 순위가 갱신되는가

---

## 7. 오류 확인

### Vercel

`Logs` 또는 `Observability`에서 `/api/evaluate` 오류를 확인합니다.

### Apps Script 수정 후

저장만 하지 말고 운영 배포를 새 버전으로 갱신합니다.

1. `배포 > 배포 관리`
2. 기존 배포 편집
3. `새 버전`
4. 다시 배포

---

## 8. QR

최종 QR에는 Preview URL이 아니라 Production URL을 사용합니다.

```text
https://프로젝트이름.vercel.app
```

다음 환경에서 모두 시험합니다.

- 안드로이드 기본 카메라
- 아이폰 기본 카메라
- 행사장 Wi-Fi
- 휴대전화 데이터망
- 카카오톡·네이버 앱 내 브라우저

---

## 9. 보안

- OpenAI API 키를 `index.html`에 넣지 않습니다.
- API 키와 공유 비밀값을 GitHub에 올리지 않습니다.
- 실제 비밀값은 Vercel Environment Variables와 Apps Script Script Properties에만 저장합니다.
- 학회 종료 후 API 키 교체 또는 폐기를 고려합니다.
