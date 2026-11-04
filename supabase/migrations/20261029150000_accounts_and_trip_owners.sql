-- 로그인 아이디. 비밀번호는 이 테이블에 두지 않고 Supabase Auth(auth.users)가 암호화해 보관한다.
-- Auth는 이메일 칸만 받으므로, 앱은 "아이디@triplog.local"로 바꿔 저장하고 메일은 보내지 않는다.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_key unique (username)
);

comment on table public.profiles is '로그인한 계정의 아이디. 비밀번호는 auth.users에 암호화되어 있다.';
comment on column public.profiles.username is '로그인 아이디. 영문 소문자·숫자·밑줄.';

alter table public.profiles enable row level security;

grant select, insert, update on public.profiles to authenticated;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  uname := nullif(new.raw_user_meta_data->>'username', '');
  if uname is null and new.email is not null and new.email like '%@triplog.local' then
    uname := split_part(new.email, '@', 1);
  end if;
  if uname is null then
    uname := coalesce(nullif(new.email, ''), new.id::text);
  end if;
  insert into public.profiles (id, username)
  values (new.id, uname)
  on conflict (id) do update set username = excluded.username;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.trips
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists trips_user_id_idx on public.trips (user_id);

comment on column public.trips.user_id is '이 여행을 작성한 계정. auth.users.id';

drop policy if exists trips_select on public.trips;
drop policy if exists trips_insert on public.trips;
drop policy if exists trips_update on public.trips;
drop policy if exists trips_delete on public.trips;
drop policy if exists places_select on public.places;
drop policy if exists places_insert on public.places;
drop policy if exists places_update on public.places;
drop policy if exists places_delete on public.places;

revoke all on public.trips from anon;
revoke all on public.places from anon;

create policy trips_select on public.trips
  for select to authenticated using (user_id = (select auth.uid()));
create policy trips_insert on public.trips
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy trips_update on public.trips
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 로그인 기능 이전에 저장된 여행(user_id 없음)은 그 기록을 가진 계정이 다시 저장할 때 자기 여행으로 붙인다.
-- upsert는 기존 행이 select 정책에 보여야 해서, 내용 없이 소유자만 바꾸는 함수로 처리한다.
create or replace function public.claim_unowned_trip(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.trips
  set user_id = auth.uid()
  where id = target_id and user_id is null;
end;
$$;

revoke all on function public.claim_unowned_trip(uuid) from public;
grant execute on function public.claim_unowned_trip(uuid) to authenticated;
create policy trips_delete on public.trips
  for delete to authenticated using (user_id = (select auth.uid()));

create policy places_select on public.places
  for select to authenticated using (
    exists (
      select 1 from public.trips
      where trips.id = places.trip_id and trips.user_id = (select auth.uid())
    )
  );
create policy places_insert on public.places
  for insert to authenticated with check (
    exists (
      select 1 from public.trips
      where trips.id = places.trip_id and trips.user_id = (select auth.uid())
    )
  );
create policy places_update on public.places
  for update to authenticated
  using (
    exists (
      select 1 from public.trips
      where trips.id = places.trip_id and trips.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.trips
      where trips.id = places.trip_id and trips.user_id = (select auth.uid())
    )
  );
create policy places_delete on public.places
  for delete to authenticated using (
    exists (
      select 1 from public.trips
      where trips.id = places.trip_id and trips.user_id = (select auth.uid())
    )
  );
