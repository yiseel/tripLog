-- 장소 카드에 붙이는 짧은 지역 표시 ("파리 프랑스"). 해외 지도(Geoapify)에서 고른 장소만 값이 있다.
-- 국내 장소는 주소("충북 충주시 …")에서 앞 두 단어를 잘라 쓰므로 비어 있다.

alter table public.places
  add column if not exists area text;

comment on column public.places.area is '짧은 지역 표시(도시 국가). 해외 지도에서 고른 장소만. 예: 파리 프랑스';

notify pgrst, 'reload schema';
