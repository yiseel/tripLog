-- profiles.email 을 일반 아이디(username)로 바꾼다.

alter table public.profiles add column if not exists username text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'email'
  ) then
    update public.profiles
    set username = case
      when coalesce(email, '') like '%@triplog.local' then split_part(email, '@', 1)
      when coalesce(email, '') <> '' then email
      else id::text
    end
    where username is null or username = '';

    alter table public.profiles drop column email;
  end if;
end $$;

update public.profiles
set username = id::text
where username is null or username = '';

alter table public.profiles alter column username set not null;

create unique index if not exists profiles_username_key on public.profiles (username);

comment on table public.profiles is '로그인한 계정의 아이디. 비밀번호는 auth.users에 암호화되어 있다.';
comment on column public.profiles.username is '로그인 아이디. 영문 소문자·숫자·밑줄.';

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
