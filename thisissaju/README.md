# 이것이 사주다 — 사주 풀이 웹 서비스

생년월일시 → 사주 원국·오행·일간 풀이(무료) → **990원 결제(토스페이먼츠)** → **AI 상세 풀이**(연애·재물·직업·내년 운세·대운) + 궁합·공유 링크.

## 구조

```
public/            브라우저에 그대로 나가는 파일
  index.html       메인 화면 (내 사주 / 궁합)
  success.html     결제 성공 → 서버 승인 요청 → 메인으로 복귀
  fail.html        결제 실패·취소 안내
  js/engine.js     만세력 엔진 (절기·진태양시·서머타임·대운)
  js/lunar.js      음력→양력 표 (1920~2060)
  js/content-free.js  무료 풀이 문구
api/               서버 (Vercel 서버리스 함수)
  config.js        공개 설정 (클라이언트 키, 가격, 모드)
  confirm.js       결제 승인: 금액 검증 → 토스 승인 API → 열람 토큰 발급
  reading.js       토큰 검증 → 사주 계산 → AI 풀이 (실패 시 규칙 기반)
lib/               서버 전용 코드 (유료 문구·AI 프롬프트는 브라우저로 안 나감)
dev-server.js      로컬 실행용
```

## 기능

- **내 사주(무료):** 원국·십신, 일간 성격, 오행 밸런스, **부족한 오행 보완법**(색·숫자·방향·음식·습관·아이템), **올해·내년 키워드**
- **상세 풀이(990원):** 연애·재물·직업·내년 운세·대운 (AI 또는 규칙 기반)
- **궁합:** 점수와 근거, 공유 링크
- **기록:** 최근 본 사주·궁합을 이 기기에 저장(최대 20개), 누르면 다시 보기. 결제한 사주는 '상세' 표시, 재결제 없이 열림
- **공유:** 카카오톡 공유 카드(일간 오행별 이미지 5종 + 궁합 이미지), 키가 없으면 기본 공유창/링크 복사. 내 사주 링크는 `/#s-…`, 궁합은 `/#c-…`

## 결제·열람 흐름

1. "전체 풀이 열어보기" → 토스 결제창 v2 (`requestPayment`, 카드·간편결제)
2. 인증 성공 → `success.html?paymentKey&orderId&amount`
3. `/api/confirm`이 **서버에 고정된 가격(990)** 과 금액을 비교한 뒤, 시크릿 키로 `POST /v1/payments/confirm` 호출
4. 승인(`DONE`)되면 `HMAC(orderId|생년월일시)` 열람 토큰 발급 → 브라우저에 저장
5. `/api/reading`이 토큰을 검증하고 풀이를 생성. 같은 생년월일시는 다시 결제하지 않아도 열려요(같은 브라우저 기준)

> 토스 키가 없으면 **데모 모드**(결제창 없이 열람), AI 키가 없으면 **규칙 기반 풀이**로 자동 동작해요.

## 결제 수단 화면

결제 버튼을 누르면 이것이 사주다 자체 화면에서 수단을 고르고, 고른 수단의 토스 결제창이 바로 열려요.

| 화면 | 토스 요청 값 |
|---|---|
| 국내 카드 / 간편결제 > 신용카드 | `method: 'CARD'`, `card.flowMode: 'DEFAULT'` |
| 간편결제 > 카카오페이·네이버페이·토스페이 | `method: 'CARD'`, `card.flowMode: 'DIRECT'`, `card.easyPay: 'KAKAOPAY' / 'NAVERPAY' / 'TOSSPAY'` |
| 퀵계좌이체 | `method: 'TRANSFER'` (현금영수증 소득공제) |
| 해외카드 | `method: 'CARD'`, `card.useInternationalCardOnly: true` |

- **계약된 수단만 보이게:** 환경변수 `PAY_METHODS`(card,easypay,transfer,foreign), `EASY_PAYS`(KAKAOPAY,NAVERPAY,TOSSPAY)에서 빼면 화면에서 사라져요.
- **간편결제**는 상점관리자 > 이용정보 > 결제/부가서비스에서 각각 추가 신청·승인 후 사용 가능해요.
- **퀵계좌이체**는 계좌이체 계약이 포함돼 있어야 해요.
- **해외카드**는 별도 계약(해외카드용 상점아이디가 따로 나올 수 있음)이 필요해요. 따로 나오면 `TOSS_INTL_CLIENT_KEY`, `TOSS_INTL_SECRET_KEY`에 넣으면 해외카드 결제만 그 키로 처리돼요.

## 1. 내 컴퓨터에서 실행

Node.js 18 이상이 필요해요. 설치할 패키지는 없어요.

```bash
cp .env.example .env     # 값 채우기
node dev-server.js       # → http://localhost:3000
```

## 2. 키 발급

| 키 | 어디서 | 비고 |
|---|---|---|
| `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY` | developers.tosspayments.com → 내 개발정보 → API 키 → **API 개별 연동 키** | 가입만 하면 `test_` 키가 바로 나와요. 테스트 결제는 청구되지 않아요 |
| `TOKEN_SECRET` | 직접 생성 | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `KAKAO_JS_KEY` | developers.kakao.com → 애플리케이션 추가 → 앱 키 → **JavaScript 키** | 아래 '카카오 설정' 필수 |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | 사용량만큼 과금돼요. 결제 한도(Spend limit)를 꼭 설정하세요 |

⚠️ 시크릿 키(`TOSS_SECRET_KEY`, `ANTHROPIC_API_KEY`)는 절대 브라우저 코드나 GitHub에 올리지 마세요. `.env`는 `.gitignore`에 들어 있어요.

## 카카오톡 공유 설정

1. 카카오 디벨로퍼스 → 내 애플리케이션 → **플랫폼 → Web**에 사이트 도메인 등록 (예: `https://thisissaju.com`, 테스트용 `http://localhost:3000`)
2. **JavaScript SDK 도메인**에도 같은 도메인 등록 (안 하면 4019 오류)
3. 카카오톡 공유 → 활성화
4. `KAKAO_JS_KEY` 환경변수 입력 후 재배포

> 공유 카드 이미지는 `public/og/` 에 있어요. 카톡에 링크만 붙여넣을 때 뜨는 미리보기를 위해, 도메인이 정해지면 `public/index.html` 의 `og:image` 값 `/og/default.png` 를 `https://내도메인/og/default.png` 처럼 전체 주소로 바꿔 주세요.

## 3. Vercel 배포 (무료 플랜 가능)

1. 이 폴더를 GitHub 저장소로 올리기
2. vercel.com → Add New Project → 저장소 선택 (Framework: **Other**, 설정 변경 없음)
3. Settings → Environment Variables에 `.env.example`의 값 입력
4. Deploy → `https://프로젝트명.vercel.app` 에서 테스트 결제 확인

## 4. 실제 결제(라이브)로 바꾸기

토스 라이브 키는 **사업자등록 + 토스페이먼츠 가맹 계약 심사**가 끝나야 나와요.

- [ ] 사업자등록 (개인사업자 가능)
- [ ] 통신판매업 신고 (정부24)
- [ ] 사이트 하단에 사업자 정보·이용약관·개인정보처리방침·환불정책 게시 (심사 필수 항목)
- [ ] 토스페이먼츠 전자결제 신청 → 심사 → 라이브 키(`live_ck_`, `live_sk_`)로 교체
- [ ] 도메인 연결 (Vercel → Domains)

## 출시 전에 손볼 것

- **AI 비용 보호**: 지금은 같은 결제 건으로 풀이를 다시 요청할 수 있어요(브라우저 캐시로 대부분 막힘). 트래픽이 늘면 Vercel KV 등에 결과를 저장해 주문당 1회만 생성하세요.
- **결제 기록**: DB 없이 동작해요. 매출·환불 관리는 토스 상점관리자에서 하면 되지만, 고객 문의 대응용으로 주문 저장(Supabase 등)을 추천해요.
- **웹훅**: 카드·간편결제만 쓰면 필수는 아니에요. 가상계좌를 추가하면 필요해요.
- **정확도**: 절기 경계 몇 분 이내 출생자는 월주가 다르게 나올 수 있어요(검증: 2만 건 중 3건).

## 사업자 정보·약관
- `public/js/biz.js` 한 곳에 상호·대표자·사업자번호·통신판매업 번호·주소·연락처를 넣으면 푸터, 이용약관(`/terms.html`), 개인정보처리방침(`/privacy.html`), 환불정책(`/refund.html`)에 모두 반영돼요. 빈 칸은 "(준비 중)"으로 보여요.
- 결제 수단 시트에 환불 제한·약관·국외 이전 동의 체크박스(필수)가 있어요. 체크하지 않으면 결제가 시작되지 않아요.

## 상세 풀이 구성 (샘플 5~15번)
타고난 기질 · 쓴소리 좀 할게 · 나만의 매력 · 나에게 맞는 일 · 재물복 · 연애운 · 가족 인연 · 곁에 둘 사람 · 내년 운세와 10년 흐름 · 나의 행운 동물 · 마지막 한마디
- 섹션마다 카피 제목 + 본문 400~600자를 AI가 써요 (`lib/ai.js`). 4묶음 동시 요청이라 보통 20~40초.
- 전문용어가 섞였거나 길이가 맞지 않는 섹션은 자동으로 기본 문장(`lib/paid.js`)으로 바뀌어요.
- 행운 동물은 항상 규칙 기반(`lib/animal.js`), AI가 건드리지 않아요.
- 한 번 받은 풀이는 그 기기에 저장돼서, 다시 열어도 AI 비용이 다시 들지 않아요.
