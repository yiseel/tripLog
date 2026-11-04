-- 비용 화면 합계의 1인당 금액을 계산할 인원 (비어 있으면 앱에서 1명으로 본다)
alter table public.trips
  add column if not exists headcount integer check (headcount is null or headcount between 1 and 99);

comment on column public.trips.headcount is '비용을 나눌 인원. 1인당 금액 = 전체 금액 / headcount.';

notify pgrst, 'reload schema';
