# Trip Log — 여행 기록 웹앱

지도 검색·직접 입력을 지원하는 N일차 타임라인 여행 기록 앱입니다.

## 기능

- 여행 목록 카드 (제목 / 일자 / 큰 장소 / 동행인)
- 자동 제목 생성 (`[큰 장소] 여행`)
- 시작·종료일 기준 N일차 타임라인 자동 생성
- 장소 드래그로 일차 내 순서 변경 및 일차 간 이동
- 장소 추가 모달: 카카오맵 검색 또는 직접 입력
- 브라우저 `localStorage`에 데이터 저장

## 시작하기

```bash
npm install
npm run dev
```

## 카카오맵 연동 (선택)

1. [Kakao Developers](https://developers.kakao.com)에서 JavaScript 키 발급
2. 프로젝트 루트에 `.env` 생성:

```env
VITE_KAKAO_MAP_KEY=발급받은_키
```

3. 플랫폼에 `http://localhost:5173` 등록 후 개발 서버 재시작

키가 없어도 장소명·주소·메모를 직접 입력해 사용할 수 있습니다.
