-- 결혼식 버스 27석. 마감: 2026-12-02 13:00 Asia/Seoul
-- Supabase SQL Editor에서 한 번에 실행합니다.

begin;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  seat_no smallint not null check (seat_no between 1 and 27),
  name text not null check (char_length(name) between 1 and 40),
  phone text not null check (phone ~ '^01[016789][0-9]{7,8}$'),
  trip text not null check (trip in ('round', 'outbound', 'inbound')),
  group_type text not null check (group_type in ('teacher', 'friend', 'other')),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create table if not exists public.seat_holds (
  seat_no smallint not null check (seat_no between 1 and 27),
  leg text not null check (leg in ('outbound', 'inbound')),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  primary key (seat_no, leg)
);

create index if not exists seat_holds_reservation_idx on public.seat_holds (reservation_id);

alter table public.reservations enable row level security;
alter table public.seat_holds enable row level security;

revoke all on public.reservations from public, anon, authenticated;
revoke all on public.seat_holds from public, anon, authenticated;
grant select, insert, update, delete on public.reservations to service_role;
grant select, insert, update, delete on public.seat_holds to service_role;

create or replace function public.book_seat(
  p_seat smallint,
  p_name text,
  p_phone text,
  p_trip text,
  p_group text,
  p_note text
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text;
  v_note text;
  v_legs text[];
begin
  if (now() at time zone 'Asia/Seoul') >= timestamp '2026-12-02 13:00:00' then
    return json_build_object('ok', false, 'error', 'closed');
  end if;

  v_name := btrim(regexp_replace(coalesce(p_name, ''), '[[:space:]]+', ' ', 'g'));
  v_note := btrim(coalesce(p_note, ''));

  if p_seat is null or p_seat < 1 or p_seat > 27 then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;

  if coalesce(p_phone, '') !~ '^01[016789][0-9]{7,8}$' then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;

  if p_trip = 'round' then
    v_legs := array['outbound', 'inbound'];
  elsif p_trip = 'outbound' then
    v_legs := array['outbound'];
  elsif p_trip = 'inbound' then
    v_legs := array['inbound'];
  else
    return json_build_object('ok', false, 'error', 'invalid');
  end if;

  if p_group not in ('teacher', 'friend', 'other') then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;

  if char_length(v_note) > 200 then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;

  perform pg_advisory_xact_lock(1205, p_seat);

  if exists (
    select 1
    from public.seat_holds
    where seat_no = p_seat
      and leg = any (v_legs)
  ) then
    return json_build_object('ok', false, 'error', 'taken');
  end if;

  insert into public.reservations (seat_no, name, phone, trip, group_type, note)
  values (p_seat, v_name, p_phone, p_trip, p_group, v_note)
  returning id into v_id;

  insert into public.seat_holds (seat_no, leg, reservation_id)
  select p_seat, leg, v_id
  from unnest(v_legs) as leg;

  return json_build_object('ok', true, 'id', v_id);
exception
  when unique_violation then
    return json_build_object('ok', false, 'error', 'taken');
end;
$$;

revoke all on function public.book_seat(smallint, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.book_seat(smallint, text, text, text, text, text) to service_role;

commit;
