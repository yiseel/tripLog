# Trip Log — 여행 기록 웹앱

여행을 **일자별 타임라인**으로 기록하는 웹 앱입니다.
기본 정보, 교통 티켓, 숙소·예약, 날짜별 방문 장소, 비용, 준비물과 메모를 여행마다 한곳에 모아 둡니다.

화면별 동작, 데이터 구조, 디자인 규칙 등 자세한 내용은 [PROJECT.md](PROJECT.md)를 참고하세요.

## 주요 기능

- **여행 목록**: 티켓 모양 카드로 보여주고, 연도·국내/해외·제목으로 검색합니다. 한 페이지에 10개씩 나옵니다.
- **여행 정보**: 출발→도착 티켓, 정보 카드, 교통 탑승권, 세로 타임라인과 스케줄 표를 보여줍니다.
- **여행 수정**
  - 지역·기간·동행·교통수단·목적을 입력합니다.
  - 교통 티켓을 입력합니다. 비행기는 경유 구간도 넣을 수 있습니다.
  - 숙소와 기타 예약을 입력합니다.
- **일자별 타임라인**
  - 기간에 맞춰 N일차가 자동으로 만들어집니다.
  - 장소를 드래그해서 순서를 바꾸거나 다른 날로 옮깁니다.
- **장소 검색**
  - 국내 여행은 카카오맵, 해외 여행은 Geoapify 지도에서 검색합니다.
  - 키가 없으면 직접 입력합니다.
- **비용 상세**: 여행 전 예약과 일자별 비용을 보여주고, 전체 금액과 인원수로 나눈 1인 금액을 계산합니다.
- **준비물 · 메모**: 진행률이 보이는 체크리스트와 자유 메모를 씁니다.
- **로그인과 저장**
  - Supabase를 설정하면 아이디로 로그인하고, 여행은 계정별로 Supabase에 저장됩니다.
  - 설정하지 않으면 브라우저 `localStorage`에만 저장됩니다.

## 기술 스택

React 19 · TypeScript · Vite · react-router-dom 7 · @dnd-kit · Leaflet · Supabase

## 시작하기

```bash
npm install
npm run dev      # 개발 서버 http://localhost:5173
npm run build    # 타입 검사 + 빌드 (dist/)
npm run lint     # oxlint
```

## 환경 변수 (선택)

`.env.example`을 복사해 프로젝트 루트에 `.env`를 만듭니다. 값이 없는 기능은 꺼진 채로 동작합니다.

| 변수 | 용도 | 발급처 |
|---|---|---|
| `VITE_KAKAO_MAP_KEY` | 국내 여행 장소 검색·지도 | [Kakao Developers](https://developers.kakao.com) (JavaScript 키, 플랫폼에 `http://localhost:5173` 등록) |
| `VITE_GEOAPIFY_KEY` | 해외 여행 장소 검색·지도 | [Geoapify](https://myprojects.geoapify.com) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | 로그인과 DB 저장 | [Supabase](https://supabase.com/dashboard) → Project Settings → API |

`.env`는 커밋하지 마세요. 값을 바꾼 뒤에는 개발 서버를 다시 시작해야 합니다.

## Supabase 설정

1. Supabase 대시보드 → SQL Editor에서 `supabase/migrations/`의 SQL을 **파일 이름 순서대로** 실행합니다.
   이름의 시각이 같은 두 파일은 `profiles_username`을 `username_login`보다 먼저 실행합니다.
2. Authentication → Sign In / Providers → Email에서 **Confirm email을 끕니다.**
   앱은 아이디를 내부용 이메일 `아이디@triplog.local`로 바꿔 가입시키기 때문에, 켜 두면 가입이 막힙니다.

## 배포 (Netlify)

`netlify.toml`에 빌드 설정(`npm run build` → `dist`)과 SPA 주소 처리가 들어 있습니다.

- **Git 연결 배포**: Netlify 사이트 설정의 Environment variables에 위 `VITE_*` 값을 넣습니다.
- **폴더 직접 업로드**: 로컬에서 `npm run build`를 한 뒤 `dist`를 올립니다.
