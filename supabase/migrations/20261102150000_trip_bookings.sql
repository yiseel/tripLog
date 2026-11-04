-- 여행 정보의 숙소 / 기타 예약 (비용 화면에서 DAY 1 위에 표시)
alter table public.trips
  add column if not exists lodgings jsonb,
  add column if not exists reservations jsonb;

comment on column public.trips.lodgings is '숙소 예약. [{id, name, address, cost}]';
comment on column public.trips.reservations is '기타 예약(입장권 등). [{id, name, memo, cost}]';

notify pgrst, 'reload schema';
