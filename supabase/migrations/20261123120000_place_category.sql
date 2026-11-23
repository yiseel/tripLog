-- 장소 분류 ("점심", "소품샵", "호텔" 등 자유 텍스트). 정한 장소만 값이 있다.

alter table public.places
  add column if not exists category text;

comment on column public.places.category is '장소 분류(자유 텍스트). 예: 점심, 소품샵, 호텔';

notify pgrst, 'reload schema';
