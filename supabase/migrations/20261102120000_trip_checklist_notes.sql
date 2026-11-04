-- 준비물·메모 화면: 여행마다 준비물 체크리스트와 메모 목록
-- checklist: [{ "id": "...", "text": "여권", "done": true }, ...]
-- notes:     [{ "id": "...", "text": "환전은 공항보다 시내에서" }, ...]

alter table public.trips
  add column if not exists checklist jsonb,
  add column if not exists notes jsonb;

comment on column public.trips.checklist is '준비물 체크리스트. [{id, text, done}]';
comment on column public.trips.notes is '여행 메모. [{id, text}]';

notify pgrst, 'reload schema';
