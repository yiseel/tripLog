# Trip Log (여행앱)

여행을 일자별 타임라인으로 기록하는 React SPA. 백엔드 없이 `localStorage`에만 저장한다.

## 명령어

```bash
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # tsc -b 타입체크 + vite build — 변경 후 검증은 이걸로
npm run lint     # oxlint
```

- 테스트 코드 없음. git 저장소 아님.
- lint의 `react(set-state-in-effect)` 경고 3건(KakaoMapPicker, PlaceModal, TripDetailPage)은 기존 패턴이며 무시해도 됨.
- 이 환경에는 Python이 없다. 스크립트가 필요하면 node 사용.

## 스택

React 19 + TypeScript + Vite, react-router-dom 7, @dnd-kit(드래그), uuid. 스타일은 `src/index.css` 한 파일(BEM 비슷한 `block__elem--mod` 클래스명).

## 구조

| 경로 | 역할 |
|---|---|
| `src/App.tsx` | 라우트: `/` 목록, `/trips/:id` 정보, `/trips/:id/edit` 수정, `/trips/:id/costs` 비용, `/trips/:id/notes` 준비물·메모, `/login`. `useTrips()` 결과(`api`)를 페이지에 props로 전달 |
| `src/hooks/useTrips.ts` | 모든 상태와 CRUD. `trips` 변경 시 `localStorage` 저장 |
| `src/types/trip.ts` | `Trip`, `Place`, `TripMeta`, `PlaceDraft` 타입 |
| `src/utils/dates.ts` | 날짜/시간/비용 포맷 함수 (`formatDateRange`, `formatTimeRange`, `formatCost` 등) |
| `src/utils/days.ts` | `syncDays` — 날짜 범위가 바뀌면 `days` 배열 길이 조정(넘치는 장소는 마지막 날로) |
| `src/utils/storage.ts` | `localStorage` 키 `trip-log:trips` |
| `src/pages/TripListPage.tsx` | hero + 새 여행 버튼 + 티켓 모양 카드 목록. 시작일 내림차순(같으면 `createdAt` 내림차순) 정렬. 검색 결과를 `PAGE_SIZE`(10)개씩 `Pagination`으로 나눔(검색 조건이 바뀌면 1페이지로) |
| `src/pages/TripViewPage.tsx` | `/trips/:id` 정보 화면(읽기 전용, 스타일 `.trip-view*`). 상단 티켓(목록 카드와 같은 mask 절취선, 출발→도착·박수·장소 수·총 비용) + 정보 카드 4개 + 교통 티켓 탑승권(`.pass`) + 세로 시간축 타임라인(`TimelineView`, `.timeline-view*`)/스케줄 표 전환. [수정] → `/trips/:id/edit`. 목록 카드는 여기로 온다 |
| `src/pages/TripCostPage.tsx` | `/trips/:id/costs` 비용 화면(정보 화면 상단 티켓의 "비용 상세 →"에서 진입). 일자별 카드(장소명·비용 + 일자 합계, 메모는 표시 안 함) + 맨 아래 전체 합계 티켓. 정보 화면의 타임라인·스케줄 표에는 비용을 표시하지 않는다(`ScheduleTable showCost={false}`) |
| `src/pages/TripNotesPage.tsx` | `/trips/:id/notes` 준비물·메모 화면(정보 화면 header의 "준비물 · 메모"에서 진입). 왼쪽 준비물 체크리스트(체크박스·진행률, Enter로 다음 칸) / 오른쪽 메모. 720px 이하에서는 위에 `.notes-tabs`(준비물/메모 탭)가 나타나 한 칸씩만 보인다(`notes-board--checklist|notes` 클래스 + CSS로 숨김). `+`로 칸 추가, `×`로 삭제. 체크·삭제는 즉시, 글자는 blur 때 `api.updateTrip`으로 저장하며 빈 칸은 저장하지 않는다. 데이터 `Trip.checklist`/`notes`(optional) → DB `trips.checklist`/`notes`(jsonb, 쓴 적 있는 여행만 키를 보냄) |
| `src/components/TripPageFallback.tsx` | 정보·비용 화면 공용 "불러오는 중 / 로그인 필요 / 없는 여행" 화면 |
| `src/pages/TripDetailPage.tsx` | `/trips/:id/edit` 수정 화면. meta-panel(여행 정보 폼) + 편집 타임라인(드래그·추가·수정) + 장소 모달. 스케줄 표 버튼 없음. 새 여행 작성도 여기로 바로 온다 |
| `src/components/Timeline.tsx` | dnd-kit 일자별 타임라인(같은 날 순서 변경, 다른 날로 이동) |
| `src/components/PlaceItem.tsx` | 한 줄 장소 카드. `PlaceItemBody`는 드래그 오버레이에서도 재사용 |
| `src/components/ScheduleTable.tsx` | "스케줄 보기" 표 (열=날짜, 행=시간대) |
| `src/components/PlaceModal.tsx` | 장소 추가/수정 모달 (카카오맵 검색, 시간대, 비용) |
| `src/hooks/useAuth.ts` | Supabase Auth 세션(`user`, `signIn`, `signOut`). Supabase 미설정이면 `available=false` |
| `src/pages/LoginPage.tsx`, `src/components/AuthButton.tsx` | `/login` 로그인/회원가입 화면. 아이디(영문 소문자·숫자·`_` 4~20자)는 `useAuth`가 내부용 이메일 `아이디@triplog.local`로 바꿔 Supabase Auth에 넘긴다(메일 발송 없음 — 대시보드에서 Confirm email 꺼야 함). 실제 아이디는 `user_metadata.username`·`profiles.username`. `@`가 든 입력은 예전 이메일 계정으로 보고 그대로 로그인. `AuthButton`은 목록 hero 우측 상단에만 있는 로그인/로그아웃 버튼(상세 header에는 두지 않음) |
| `src/hooks/useDialog.ts`, `src/components/DialogProvider.tsx` | 앱 전용 alert/confirm 팝업. `main.tsx`에서 `DialogProvider`로 감싸고 `const dialog = useDialog(); await dialog.confirm({...})`로 쓴다. **`window.alert/confirm` 대신 이걸 쓸 것** |
| `src/lib/geoapify.ts`, `GeoapifyMapPicker.tsx` | **해외 여행**(`tripType === 'overseas'`)의 장소 검색·지도. Geoapify Autocomplete/Reverse API + Leaflet(`osm-bright` 타일). 여행 `region`으로 지도 시작 위치와 검색 근처 우선(`bias`)을 잡는다. 지도 아래 Geoapify/OSM 출처 표시 필수. 키 `VITE_GEOAPIFY_KEY` |
| `src/lib/kakao.ts`, `KakaoMapPicker.tsx` | **국내 여행**의 장소 검색·지도(카카오맵 SDK). `PlaceModal`이 `overseas` prop으로 둘 중 하나를 고른다. 키가 없으면 직접 입력만 가능 |

## 데이터 규칙

- `Trip.days: Place[][]` — 인덱스 0 = 1일차. 날짜 변경은 `updateTrip`이 `syncDays`로 맞춘다.
- 나중에 추가된 필드는 모두 **optional**이다: `Trip.tripType`(`domestic`/`overseas`), `transport`(`car`/`bus`/`train`/`plane`), `tickets`(`outbound`/`inbound` 구간 배열 — 아래 참고), `purpose`(목적, 자유 텍스트 — DB `trips.purpose`), `Place.startTime`/`endTime`(`HH:MM`), `cost`(원, number). 기존 저장 데이터와 호환되도록 읽을 때 기본값(`?? 'domestic'` 등)으로 처리하고, 새 필드도 optional로 추가할 것.
- 티켓 입력란은 교통수단이 자동차가 아닐 때만 보인다.
- "기간" 항목은 `DateRangeInput` = `[시작일 DateInput] ~ [종료일 DateInput] [달력 버튼]`. 각 칸은 직접 입력(`20261030`, `2026.10.30` 등 → blur/Enter 때 `YYYY-MM-DD`)이고, 종료일 칸은 시작일보다 앞이면 거부한다. 달력은 하나(`Calendar`, body 포털)로 첫 클릭 = 시작일, 두 번째 클릭 = 종료일(시작일보다 앞을 누르면 새 시작일)을 고르고, 둘 다 고른 뒤에야 `onRangeChange`로 한 번에 반영한다. 브라우저 기본 date picker는 쓰지 않는다.
- 새 여행(`emptyTrip`)은 시작·종료일이 `''`이다. 날짜가 비어 있으면 일차 헤더는 "1일차"만 표시.
- 티켓은 `Tickets { outbound, inbound: TicketSegment[] }`(편명·출발지·도착지·출발/도착 시간·금액 `price`(숫자 문자열) — 예전 `seat`은 읽지 않음). 비행기만 구간을 여러 개(경유) 둘 수 있다. DB에는 스키마 변경 없이 기존 텍스트 칸 `ticket_outbound/inbound`에 JSON 문자열로 저장한다. 예전 자유 텍스트는 `utils/tickets.ts`의 `parseTicketLeg`가 첫 구간의 `name`으로 읽는다.
- 숙소 `Trip.lodgings: Lodging[]`(숙소명·주소·`cost`) / 기타 예약 `Trip.reservations: Reservation[]`(예약명·메모·`cost`·`links?: string[]` — jsonb 안이라 DB 변경 없음. 수정 화면은 `BookingFields withLinks`의 "링크 추가"로 칸 추가(빈 칸 저장 안 함), 정보 화면은 링크 있는 예약 오른쪽 "🔗 링크" 버튼 → `LinksDialog` 팝업 목록) — optional, DB `trips.lodgings`/`reservations`(jsonb, 쓴 적 있는 여행만 키를 보냄). 수정 화면 `BookingFields`(제목 옆 `+`로 줄 추가, 빈 줄은 저장 안 함), 정보 화면은 목적 아래 `.trip-view__bookings`(이름·주소/메모만), 비용 화면은 DAY 1 위 "여행 전 예약"(교통 티켓 금액·숙소·기타 예약, 이름·금액). 금액 합산은 `utils/costs.ts`(`bookingGroups`, `tripTotalCost` — 정보 화면 총 비용도 예약 포함).
- 비용 화면 전체 합계는 `전체 금액 / 1인 금액`. 인원 `Trip.headcount`(optional, 기본 1, 1~99) → DB `trips.headcount`(정한 적 있는 여행만 보냄). 제목 아래 `.cost-people`의 `−`/`+`로 바꾸면 즉시 `updateTrip`. 여행 전 예약의 항목별 토탈(`.cost-group__sum`, 교통·숙소·기타 예약)은 핑크 알약 + `/ 1인 금액`, 세부 내역 금액(`.cost-row__amount`)은 글자만.
- 시간 입력은 `<input type="time">`이 아니라 텍스트 칸이다. `utils/time.ts`의 `typingTime`/`normalizeTime`(장소 모달·티켓 시간 공용)이 `1120`, `930`, `9` 같은 입력을 `HH:MM`으로 정리한다.
- 스케줄 표: 시작 시간(없으면 종료 시간) 기준 행 정렬. 같은 시작 시간은 한 행에 묶임. 시간 없는 장소는 `-` 행에 등록 순서대로 아래쪽에.
- meta-panel 값은 로컬 state에 두고 blur/선택 시 `persistMeta()`로 저장한다. 필수값(지역·시작일·종료일, 종료일 ≥ 시작일)은 `validateMeta`로 검사해 하나라도 비면 저장하지 않는다. 자동 저장은 조용히 건너뛰고, 저장 버튼/Enter일 때만 `.form-error` 메시지를 띄우고, 저장에 성공하면 그 여행의 정보 화면(`/trips/:id`)으로 이동한다(새 여행도 동일). 삭제하면 목록(`/`)으로.
- "새 여행 작성"은 `useTrips`의 `draft`(메모리)만 만든다. 목록·저장소에는 저장 버튼(`saveTripMeta(..., publish=true)`)을 눌러야 추가된다. 그 전의 자동 저장·장소 추가 등은 `mutateTrip`이 draft에만 반영하며, 저장 없이 나가거나 새로고침하면 사라진다.

## 스타일 / 주의사항

- **색상**: `:root` 변수로 관리. 사용자 지정 파스텔 팔레트 `#F5D2D2`(핑크, `--gold-soft`·배지/비용 태그·배경), `#F8F7BA`(버터, `--sand`), `#BDE3C3`(세이지, `--foam`), `#A3CCDA`(더스티 블루, `--gold`·주 버튼). 팔레트가 모두 밝아서 글자·기본 버튼·테두리는 `#A3CCDA`를 진하게 한 `--sea: #2f6b80`(`--sea-deep: #214f60`)을 쓴다. 변수 이름(`sea`, `gold`, `sand`)은 예전 팔레트에서 온 것이라 실제 색과 다르다. 하드코딩된 `rgba(...)`도 같은 색 계열에 맞춰져 있으니 팔레트를 바꿀 땐 함께 바꿀 것.
- **폰트**: Google Fonts 링크 한 줄(`index.html`). 본문 `--font-body`(Chiron GoRound TC), 목록 hero 로고 `.hero .brand`만 `--font-display`(Chango + 흰 테두리 `text-shadow`). hero 배경은 `src/assets/hero-bg.png` 일러스트 + 왼쪽을 밝히는 `.hero__veil`.
- 파스텔 위에는 흰 글씨 대비가 낮다 → `.btn--primary`는 `#A3CCDA` 배경 + 짙은 글씨 `#1d3d48`, 핑크 배지/태그 글씨는 `#8a4545`, 필수 표시 `em`은 `#c47a7a`.
- `.meta-panel`, `.timeline-section` 등은 `rise` 애니메이션(`fill-mode: both`)으로 `transform`이 남아 있다. 그 안에서 `position: fixed` 요소는 위치가 어긋나므로 dnd-kit `DragOverlay`는 `createPortal(..., document.body)`로 렌더링한다. 새 오버레이/팝업도 같은 방식으로.
- 목록 페이지는 `.page--list`가 화면 높이에 고정되고 `.list-scroll`만 스크롤된다(hero, `.hero-cta`, 개수·페이지 줄 `.list-summary`는 고정). `.hero`는 `overflow: hidden`이라 경계에 걸치는 버튼은 hero 밖 `.hero-cta`에 두고 음수 margin으로 올렸다.
- 티켓 카드(`.trip-card__ticket`)는 CSS `mask`로 절취선 양옆 반원 홈을 뚫는다. mask가 `box-shadow`를 자르므로 그림자는 바깥 `.trip-card`의 `filter: drop-shadow`로 준다.
- 장소 카드 장소명 옆 작은 지역 표시는 `utils/address.ts`의 `shortArea`: `Place.area`(해외 지도에서 고를 때 Geoapify `city country`로 저장, DB `places.area`)가 있으면 그것, 없으면 주소에서 계산(쉼표 없는 카카오 주소 → 앞 두 단어 "충북 충주시", 쉼표 있는 해외 주소 → 우편번호 뺀 도시 + 국가). `tripsDb`는 `area`가 있을 때만 행에 넣는다.
- 장소 카드는 한 줄(`white-space: nowrap` + 말줄임)이며 전체 내용은 `title` 툴팁으로 보여준다.
- 반응형 기준: `@media (max-width: 720px)` (파일 하단).

## 환경 변수

- `.env`의 `VITE_KAKAO_MAP_KEY` — 카카오 JavaScript 키(선택, 국내 지도).
- `.env`의 `VITE_GEOAPIFY_KEY` — Geoapify API 키(선택, 해외 지도). 형식은 `.env.example` 참고. `.env` 값은 커밋/노출하지 말 것.