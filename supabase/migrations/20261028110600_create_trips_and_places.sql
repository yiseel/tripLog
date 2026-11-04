-- 여행 기록 입력값. 앱에는 아직 로그인이 없어서 anon(publishable 키)이 읽고 쓸 수 있다.

create table public.trips (
  id uuid primary key,
  title text not null default '',
  region text not null default '',
  start_date date not null,
  end_date date not null,
  companions text not null default '',
  trip_type text not null default 'domestic',
  transport text,
  ticket_outbound text not null default '',
  ticket_inbound text not null default '',
  purpose text not null default '',
  checklist jsonb,
  notes jsonb,
  lodgings jsonb,
  reservations jsonb,
  headcount integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_trip_type_check check (trip_type in ('domestic', 'overseas')),
  constraint trips_transport_check check (
    transport is null or transport in ('car', 'bus', 'train', 'plane')
  ),
  constraint trips_date_range_check check (end_date >= start_date),
  constraint trips_headcount_check check (headcount is null or headcount between 1 and 99)
);

create table public.places (
  id uuid primary key,
  trip_id uuid not null references public.trips (id) on delete cascade,
  day_index integer not null,
  sort_order integer not null,
  name text not null,
  address text not null default '',
  memo text not null default '',
  lat double precision,
  lng double precision,
  start_time text,
  end_time text,
  cost integer,
  constraint places_day_index_check check (day_index >= 0),
  constraint places_sort_order_check check (sort_order >= 0),
  constraint places_start_time_check check (
    start_time is null or start_time ~ '^\d{2}:\d{2}$'
  ),
  constraint places_end_time_check check (
    end_time is null or end_time ~ '^\d{2}:\d{2}$'
  ),
  constraint places_time_range_check check (
    start_time is null or end_time is null or end_time >= start_time
  ),
  constraint places_cost_check check (cost is null or cost >= 0)
);

create index places_trip_day_order_idx
  on public.places (trip_id, day_index, sort_order);

comment on table public.trips is '여행 한 건. 제목, 지역, 기간, 동행, 국내/해외, 교통, 티켓.';
comment on table public.places is '일차별 장소. day_index 0이 1일차이고 sort_order가 그날 안에서의 순서.';
comment on column public.places.day_index is '0부터 시작하는 일차. 0 = 1일차.';
comment on column public.places.sort_order is '같은 날 안에서의 순서. 0이 맨 위.';
comment on column public.places.cost is '비용(원).';

create or replace function public.set_trips_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trips_set_updated_at
  before update on public.trips
  for each row
  execute function public.set_trips_updated_at();

alter table public.trips enable row level security;
alter table public.places enable row level security;

grant select, insert, update, delete on public.trips to anon, authenticated;
grant select, insert, update, delete on public.places to anon, authenticated;

create policy trips_select on public.trips
  for select to anon, authenticated using (true);
create policy trips_insert on public.trips
  for insert to anon, authenticated with check (true);
create policy trips_update on public.trips
  for update to anon, authenticated using (true) with check (true);
create policy trips_delete on public.trips
  for delete to anon, authenticated using (true);

create policy places_select on public.places
  for select to anon, authenticated using (true);
create policy places_insert on public.places
  for insert to anon, authenticated with check (true);
create policy places_update on public.places
  for update to anon, authenticated using (true) with check (true);
create policy places_delete on public.places
  for delete to anon, authenticated using (true);
