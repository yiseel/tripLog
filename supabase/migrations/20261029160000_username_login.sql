-- 로그인 아이디를 이메일에서 직접 입력하는 아이디로 바꾼다.
-- Supabase Auth는 이메일로만 계정을 만들 수 있어서, 앱은 "아이디@triplog.local" 내부용 이메일로 가입시키고
-- 실제 아이디는 user_metadata.username 과 profiles.username 에 둔다. 메일은 보내지 않는다
-- (대시보드 Authentication > Sign In / Providers > Email 에서 Confirm email 을 꺼야 한다).

-- profiles.email → profiles.username
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email'
  ) then
    alter table public.profiles rename column email to username;
  end if;
end;
$$;

comment on table public.profiles is '로그인한 계정의 아이디. 비밀번호는 auth.users에 암호화되어 있다.';
comment on column public.profiles.username is
  '로그인 아이디(영문 소문자·숫자·밑줄 4~20자). 이메일로 가입한 예전 계정은 이메일 그대로.';

-- 아이디로 가입한 계정은 내부용 이메일 앞부분을 아이디로 정리
update public.profiles p
set username = coalesce(u.raw_user_meta_data ->> 'username', split_part(u.email, '@', 1))
from auth.users u
where u.id = p.id and u.email like '%@triplog.local';

create unique index if not exists profiles_username_key on public.profiles (lower(username));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      case when new.email like '%@triplog.local' then split_part(new.email, '@', 1) end,
      new.email,
      ''
    )
  )
  on conflict (id) do update set username = excluded.username;
  return new;
end;
$$;
