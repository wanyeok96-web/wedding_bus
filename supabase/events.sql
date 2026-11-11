-- 신청·취소·수정 기록. Supabase SQL Editor에서 한 번 실행합니다.

begin;

create table if not exists public.reservation_events (
  id bigint generated always as identity primary key,
  reservation_id uuid,
  action text not null check (action in ('book', 'cancel', 'edit')),
  actor text not null check (actor in ('guest', 'admin')),
  seat_no smallint,
  trip text,
  name text not null default '',
  phone text not null default '',
  group_type text,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists reservation_events_created_idx on public.reservation_events (created_at desc);

alter table public.reservation_events enable row level security;
revoke all on public.reservation_events from public, anon, authenticated;
grant select, insert on public.reservation_events to service_role;

insert into public.reservation_events (reservation_id, action, actor, seat_no, trip, name, phone, group_type, detail, created_at)
select r.id, 'book', 'guest', r.seat_no, r.trip, r.name, r.phone, r.group_type, '기록 기능 추가 전 예약', r.created_at
from public.reservations r
where not exists (
  select 1 from public.reservation_events e where e.reservation_id = r.id and e.action = 'book'
);

commit;
