-- 여행 정보에 "목적" 항목 추가 (자유 입력, 비어 있으면 '')

alter table public.trips
  add column if not exists purpose text not null default '';

comment on column public.trips.purpose is '여행 목적. 예: 가족 여행, 휴식, 출장.';

-- API(PostgREST)가 새 칸을 바로 알도록 스키마 캐시를 다시 읽게 한다
notify pgrst, 'reload schema';
