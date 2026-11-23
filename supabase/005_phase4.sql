-- Phase 4: party rooms (1–8 players, invite codes), 1v1 quick match, live server-timed rounds.
-- Run after 004_phase3.sql. Safe to re-run.
--
-- Round timing is decided by the server:
--   question i is open from question_started_at for settings.seconds (+1s grace).
--   advance_room(i) moves on once everyone answered or time is up; the next question starts 4s later
--   (the reveal pause). After the last question the room is finished and XP is awarded.

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host uuid not null references public.profiles(id) on delete cascade,
  game_slug text not null,
  mode text not null default 'party' check (mode in ('party', 'match')),
  is_public boolean not null default false,
  settings jsonb not null default '{"count": 10, "seconds": 15, "scoring": "speed", "max_players": 8}',
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished', 'closed')),
  question_ids bigint[],
  current_index int not null default 0,
  question_started_at timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index if not exists rooms_lobby on public.rooms (status, mode, game_slug, created_at desc);

create table if not exists public.room_players (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  ready boolean not null default false,
  score int not null default 0,
  correct int not null default 0,
  streak int not null default 0,
  best_streak int not null default 0,
  answers jsonb not null default '{}',
  final_rank int,
  xp_earned int not null default 0,
  primary key (room_id, user_id)
);
create index if not exists room_players_user on public.room_players (user_id, joined_at desc);

create or replace function public.is_room_member(p_room uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.room_players where room_id = p_room and user_id = auth.uid());
$$;
revoke all on function public.is_room_member(uuid) from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated;

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
drop policy if exists "Members see room" on public.rooms;
create policy "Members see room" on public.rooms for select to authenticated using (public.is_room_member(id));
drop policy if exists "Members see players" on public.room_players;
create policy "Members see players" on public.room_players for select to authenticated using (public.is_room_member(room_id));
revoke all on public.rooms, public.room_players from anon;
revoke insert, update, delete on public.rooms, public.room_players from authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public._room_code()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where code = c);
  end loop;
  return c;
end;
$$;

create or replace function public._clean_settings(p jsonb, p_mode text)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'count', case when (p->>'count') in ('5', '10', '15', '20') then (p->>'count')::int else 10 end,
    'seconds', case when (p->>'seconds') in ('8', '10', '15', '20', '30') then (p->>'seconds')::int else 15 end,
    'scoring', case when p->>'scoring' in ('speed', 'classic') then p->>'scoring' else 'speed' end,
    'max_players', case when p_mode = 'match' then 2 when (p->>'max_players') ~ '^[1-8]$' then (p->>'max_players')::int else 8 end
  );
$$;

create or replace function public._age_ok(p_uid uuid, p_game text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select min_age from public.game_settings where game_slug = p_game), 0) = 0
      or coalesce(public.age_of(p_uid), -1) >= (select min_age from public.game_settings where game_slug = p_game);
$$;

create or replace function public._start_room(p_room uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.rooms;
  v_n int;
  v_k int;
  v_ids bigint[];
begin
  select * into r from public.rooms where id = p_room for update;
  if r.status <> 'lobby' then raise exception 'already_started'; end if;
  v_n := (r.settings->>'count')::int;
  v_k := v_n / 2 + floor(random() * 3)::int - 1;
  select array_agg(id order by random()) into v_ids from (
    (select id from public.quiz_questions where game_slug = r.game_slug and active and answer order by random() limit v_k)
    union all
    (select id from public.quiz_questions where game_slug = r.game_slug and active and not answer order by random() limit v_n - v_k)
  ) q;
  if v_ids is null or array_length(v_ids, 1) < 3 then raise exception 'no_questions'; end if;
  delete from public.room_players where room_id = p_room and left_at is not null;
  update public.room_players set score = 0, correct = 0, streak = 0, best_streak = 0, answers = '{}', final_rank = null, xp_earned = 0
    where room_id = p_room;
  update public.rooms set status = 'playing', question_ids = v_ids, current_index = 0,
    question_started_at = now() + interval '4 seconds', started_at = now(), finished_at = null
    where id = p_room;
end;
$$;

create or replace function public._finish_room(p_room uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.rooms;
  n int;
  pl record;
  v_xp int;
begin
  select * into r from public.rooms where id = p_room;
  select count(*) into n from public.room_players where room_id = p_room and left_at is null;
  for pl in
    select user_id, correct, rank() over (order by score desc, correct desc) as rk
    from public.room_players where room_id = p_room and left_at is null
  loop
    v_xp := 10 + pl.correct * 8 + case when n > 1 and pl.rk = 1 then 40 else 0 end;
    update public.room_players set final_rank = pl.rk, xp_earned = v_xp where room_id = p_room and user_id = pl.user_id;
    update public.profiles set xp = xp + v_xp where id = pl.user_id;
    perform public._grant_achievements(pl.user_id,
      array_remove(array['party_first', case when n > 1 and pl.rk = 1 then 'party_win' end, case when n >= 4 then 'party_crowd' end], null));
  end loop;
  update public.rooms set status = 'finished', finished_at = now() where id = p_room;
end;
$$;

revoke all on function public._room_code() from public, anon, authenticated;
revoke all on function public._clean_settings(jsonb, text) from public, anon, authenticated;
revoke all on function public._age_ok(uuid, text) from public, anon, authenticated;
revoke all on function public._start_room(uuid) from public, anon, authenticated;
revoke all on function public._finish_room(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Room lifecycle
-- ---------------------------------------------------------------------------
create or replace function public.create_room(p_game text, p_settings jsonb default '{}', p_public boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  v_id uuid;
  v_code text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.quiz_questions where game_slug = p_game and active) then raise exception 'no_questions'; end if;
  if not public._age_ok(me, p_game) then raise exception 'age_restricted'; end if;
  if (select count(*) from public.rooms where host = me and created_at > now() - interval '10 minutes') >= 10 then raise exception 'rate_limited'; end if;
  update public.room_players set left_at = now()
    where user_id = me and left_at is null and room_id in (select id from public.rooms where status = 'lobby');
  v_code := public._room_code();
  insert into public.rooms (code, host, game_slug, mode, is_public, settings)
    values (v_code, me, p_game, 'party', coalesce(p_public, false), public._clean_settings(p_settings, 'party'))
    returning id into v_id;
  insert into public.room_players (room_id, user_id, ready) values (v_id, me, true);
  return jsonb_build_object('room_id', v_id, 'code', v_code);
end;
$$;

create or replace function public.join_room(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  r public.rooms;
  n int;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into r from public.rooms where code = upper(trim(p_code)) for update;
  if not found or r.status = 'closed' or r.created_at < now() - interval '6 hours' then raise exception 'room_not_found'; end if;
  if exists (select 1 from public.room_players where room_id = r.id and user_id = me) then
    update public.room_players set left_at = null where room_id = r.id and user_id = me and r.status = 'lobby';
    return jsonb_build_object('room_id', r.id, 'code', r.code);
  end if;
  if r.status <> 'lobby' then raise exception 'room_started'; end if;
  if not public._age_ok(me, r.game_slug) then raise exception 'age_restricted'; end if;
  select count(*) into n from public.room_players where room_id = r.id and left_at is null;
  if n >= (r.settings->>'max_players')::int then raise exception 'room_full'; end if;
  insert into public.room_players (room_id, user_id) values (r.id, me);
  if r.mode = 'match' and n + 1 >= 2 then perform public._start_room(r.id); end if;
  return jsonb_build_object('room_id', r.id, 'code', r.code);
end;
$$;

create or replace function public.leave_room(p_room uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  r public.rooms;
  v_next uuid;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found then return; end if;
  update public.room_players set left_at = now(), ready = false where room_id = p_room and user_id = me;
  if r.host = me then
    select user_id into v_next from public.room_players where room_id = p_room and left_at is null order by joined_at limit 1;
    if v_next is null then
      update public.rooms set status = case when status = 'playing' then 'finished' else 'closed' end, finished_at = coalesce(finished_at, now()) where id = p_room;
    else
      update public.rooms set host = v_next where id = p_room;
    end if;
  end if;
end;
$$;

create or replace function public.set_ready(p_room uuid, p_ready boolean)
returns void language sql security definer set search_path = '' as $$
  update public.room_players set ready = p_ready where room_id = p_room and user_id = auth.uid() and left_at is null;
$$;

create or replace function public.update_room(p_room uuid, p_settings jsonb, p_public boolean, p_game text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.rooms;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found or r.host <> auth.uid() then raise exception 'not_host'; end if;
  if r.status <> 'lobby' then raise exception 'already_started'; end if;
  if p_game is not null and p_game <> r.game_slug then
    if not exists (select 1 from public.quiz_questions where game_slug = p_game and active) then raise exception 'no_questions'; end if;
    if exists (select 1 from public.room_players rp where rp.room_id = p_room and rp.left_at is null and not public._age_ok(rp.user_id, p_game)) then raise exception 'age_restricted'; end if;
  end if;
  update public.rooms set settings = public._clean_settings(coalesce(p_settings, settings), mode),
    is_public = case when mode = 'party' then coalesce(p_public, is_public) else false end,
    game_slug = coalesce(p_game, game_slug)
    where id = p_room;
  update public.room_players set ready = (user_id = auth.uid()) where room_id = p_room;
end;
$$;

create or replace function public.kick_player(p_room uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.rooms where id = p_room and host = auth.uid() and status = 'lobby') then raise exception 'not_host'; end if;
  if p_user = auth.uid() then raise exception 'self'; end if;
  delete from public.room_players where room_id = p_room and user_id = p_user;
end;
$$;

create or replace function public.start_room(p_room uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.rooms where id = p_room and host = auth.uid()) then raise exception 'not_host'; end if;
  perform public._start_room(p_room);
end;
$$;

-- Host turns a finished room back into a lobby with the same players.
create or replace function public.rematch_room(p_room uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.rooms set status = 'lobby', question_ids = null, current_index = 0, question_started_at = null
    where id = p_room and host = auth.uid() and status = 'finished';
  if not found then raise exception 'not_host'; end if;
  delete from public.room_players where room_id = p_room and left_at is not null;
  update public.room_players set ready = (user_id = auth.uid()), score = 0, correct = 0, streak = 0, best_streak = 0,
    answers = '{}', final_rank = null, xp_earned = 0 where room_id = p_room;
end;
$$;

-- 1v1 quick match: join an open match with the same quiz and speed, or open one and wait.
create or replace function public.quick_match(p_game text, p_seconds int default 10)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  v_room uuid;
  v_code text;
  v_settings jsonb := public._clean_settings(jsonb_build_object('count', 10, 'seconds', p_seconds, 'scoring', 'speed'), 'match');
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.quiz_questions where game_slug = p_game and active) then raise exception 'no_questions'; end if;
  if not public._age_ok(me, p_game) then raise exception 'age_restricted'; end if;
  update public.room_players set left_at = now()
    where user_id = me and left_at is null and room_id in (select id from public.rooms where status = 'lobby');
  update public.rooms set status = 'closed' where host = me and mode = 'match' and status = 'lobby';

  select r.id, r.code into v_room, v_code from public.rooms r
    where r.mode = 'match' and r.status = 'lobby' and r.game_slug = p_game and r.settings->>'seconds' = v_settings->>'seconds'
      and r.created_at > now() - interval '3 minutes' and r.host <> me
      and (select count(*) from public.room_players rp where rp.room_id = r.id and rp.left_at is null) = 1
    order by r.created_at
    limit 1
    for update skip locked;

  if v_room is not null then
    insert into public.room_players (room_id, user_id, ready) values (v_room, me, true)
      on conflict (room_id, user_id) do update set left_at = null, ready = true;
    perform public._start_room(v_room);
    return jsonb_build_object('room_id', v_room, 'code', v_code, 'matched', true);
  end if;

  if (select count(*) from public.rooms where host = me and created_at > now() - interval '10 minutes') >= 15 then raise exception 'rate_limited'; end if;
  v_code := public._room_code();
  insert into public.rooms (code, host, game_slug, mode, settings) values (v_code, me, p_game, 'match', v_settings) returning id into v_room;
  insert into public.room_players (room_id, user_id, ready) values (v_room, me, true);
  return jsonb_build_object('room_id', v_room, 'code', v_code, 'matched', false);
end;
$$;

create or replace function public.list_public_rooms()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) from (
    select jsonb_build_object('code', r.code, 'game_slug', r.game_slug, 'settings', r.settings, 'created_at', r.created_at,
      'host', (select username from public.profiles where id = r.host),
      'players', (select count(*) from public.room_players rp where rp.room_id = r.id and rp.left_at is null)) as x
    from public.rooms r
    where r.mode = 'party' and r.is_public and r.status = 'lobby' and r.created_at > now() - interval '2 hours'
      and (select count(*) from public.room_players rp where rp.room_id = r.id and rp.left_at is null) < (r.settings->>'max_players')::int
    order by r.created_at desc
    limit 20
  ) t;
$$;

-- ---------------------------------------------------------------------------
-- Live play
-- ---------------------------------------------------------------------------
create or replace function public.get_room(p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  r public.rooms;
  v_total int;
  v_q jsonb;
  v_last jsonb;
  v_li int;
begin
  select * into r from public.rooms where code = upper(trim(p_code));
  if not found then raise exception 'room_not_found'; end if;
  if not exists (select 1 from public.room_players where room_id = r.id and user_id = me) then raise exception 'not_member'; end if;
  v_total := coalesce(array_length(r.question_ids, 1), 0);

  if r.status = 'playing' and now() >= r.question_started_at - interval '300 milliseconds' and r.current_index < v_total then
    select jsonb_build_object('index', r.current_index, 'id', q.id, 'item', q.item, 'type', q.qtype, 'emoji', q.emoji, 'sprite', q.sprite)
      into v_q from public.quiz_questions q where q.id = r.question_ids[r.current_index + 1];
  end if;

  v_li := case when r.status = 'finished' then least(r.current_index, v_total - 1) else r.current_index - 1 end;
  if r.status in ('playing', 'finished') and v_li >= 0 and v_total > 0 then
    select jsonb_build_object('index', v_li, 'item', q.item, 'emoji', q.emoji, 'sprite', q.sprite, 'answer', q.answer, 'fact', q.fact)
      into v_last from public.quiz_questions q where q.id = r.question_ids[v_li + 1];
  end if;

  return jsonb_build_object(
    'id', r.id, 'code', r.code, 'me', me, 'host', r.host, 'is_host', r.host = me, 'game_slug', r.game_slug, 'mode', r.mode,
    'is_public', r.is_public, 'settings', r.settings, 'status', r.status, 'current_index', r.current_index, 'total', v_total,
    'question_started_at', r.question_started_at, 'now', now(), 'question', v_q, 'last', v_last,
    'players', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'username', p.username, 'level', public.level_for_xp(p.xp), 'ready', rp.ready, 'left', rp.left_at is not null,
        'score', rp.score, 'correct', rp.correct, 'streak', rp.streak, 'best_streak', rp.best_streak,
        'answered', (rp.answers -> r.current_index::text) is not null,
        'last_result', case when v_li >= 0 then rp.answers -> v_li::text end,
        'final_rank', rp.final_rank, 'xp_earned', rp.xp_earned
      ) order by rp.score desc, rp.joined_at), '[]'::jsonb)
      from public.room_players rp join public.profiles p on p.id = rp.user_id where rp.room_id = r.id),
    'my_answer', (select rp.answers -> r.current_index::text from public.room_players rp where rp.room_id = r.id and rp.user_id = me)
  );
end;
$$;

create or replace function public.submit_room_answer(p_room uuid, p_index int, p_choice boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  r public.rooms;
  rp public.room_players;
  v_secs int;
  v_elapsed numeric;
  v_ans boolean;
  v_ok boolean;
  v_pts int := 0;
begin
  select * into r from public.rooms where id = p_room;
  if not found or r.status <> 'playing' then raise exception 'not_playing'; end if;
  select * into rp from public.room_players where room_id = p_room and user_id = me and left_at is null for update;
  if not found then raise exception 'not_member'; end if;
  if p_index <> r.current_index then raise exception 'wrong_question'; end if;
  if (rp.answers -> p_index::text) is not null then raise exception 'already_answered'; end if;
  v_secs := (r.settings->>'seconds')::int;
  v_elapsed := extract(epoch from (now() - r.question_started_at));
  if v_elapsed < 0.25 then raise exception 'too_fast'; end if;
  if v_elapsed > v_secs + 1 then raise exception 'time_up'; end if;

  select answer into v_ans from public.quiz_questions where id = r.question_ids[p_index + 1];
  v_ok := v_ans = p_choice;
  if v_ok then
    v_pts := 100 + case when r.settings->>'scoring' = 'speed' then greatest(0, floor(100 * (1 - least(v_elapsed, v_secs) / v_secs)))::int else 0 end
                 + least(rp.streak, 5) * 10;
  end if;
  update public.room_players set
    answers = answers || jsonb_build_object(p_index::text, jsonb_build_object('choice', p_choice, 'correct', v_ok, 'points', v_pts, 'ms', floor(v_elapsed * 1000)::int)),
    score = score + v_pts,
    correct = correct + case when v_ok then 1 else 0 end,
    streak = case when v_ok then streak + 1 else 0 end,
    best_streak = greatest(best_streak, case when v_ok then streak + 1 else 0 end)
    where room_id = p_room and user_id = me;
  return jsonb_build_object('correct', v_ok, 'points', v_pts);
end;
$$;

-- Anyone in the room may call this; only the first call for a question takes effect.
create or replace function public.advance_room(p_room uuid, p_index int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.rooms;
  v_total int;
  v_waiting int;
begin
  if not public.is_room_member(p_room) then raise exception 'not_member'; end if;
  select * into r from public.rooms where id = p_room for update;
  if r.status <> 'playing' or r.current_index <> p_index then return; end if;
  v_total := array_length(r.question_ids, 1);
  select count(*) into v_waiting from public.room_players
    where room_id = p_room and left_at is null and (answers -> p_index::text) is null;
  if v_waiting > 0 and now() < r.question_started_at + make_interval(secs => (r.settings->>'seconds')::int + 1) then return; end if;
  if p_index + 1 >= v_total then
    perform public._finish_room(p_room);
  else
    update public.rooms set current_index = p_index + 1, question_started_at = now() + interval '4 seconds' where id = p_room;
  end if;
end;
$$;

-- Room invites ride on game_invites (adds the room code)
alter table public.game_invites add column if not exists room_code text;

create or replace function public.send_room_invite(p_to uuid, p_room uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  r public.rooms;
begin
  if not public.is_room_member(p_room) then raise exception 'not_member'; end if;
  if not public.are_friends(me, p_to) then raise exception 'not_friends'; end if;
  select * into r from public.rooms where id = p_room;
  if r.status <> 'lobby' then raise exception 'room_started'; end if;
  if not public._age_ok(p_to, r.game_slug) then raise exception 'age_restricted'; end if;
  if (select count(*) from public.game_invites where from_user = me and created_at > now() - interval '1 minute') >= 15 then raise exception 'rate_limited'; end if;
  if exists (select 1 from public.game_invites where from_user = me and to_user = p_to and room_code = r.code and status = 'pending') then raise exception 'already_invited'; end if;
  insert into public.game_invites (from_user, to_user, game_slug, room_code, expires_at) values (me, p_to, r.game_slug, r.code, now() + interval '20 minutes');
end;
$$;

create or replace function public.list_game_invites()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'game_slug', i.game_slug, 'room_code', i.room_code, 'created_at', i.created_at,
    'from', jsonb_build_object('id', p.id, 'username', p.username, 'level', public.level_for_xp(p.xp))) order by i.created_at desc), '[]'::jsonb)
  from public.game_invites i join public.profiles p on p.id = i.from_user
  where i.to_user = auth.uid() and i.status = 'pending' and i.expires_at > now();
$$;

-- ---------------------------------------------------------------------------
-- Permissions + live updates
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array['create_room(text, jsonb, boolean)', 'join_room(text)', 'leave_room(uuid)', 'set_ready(uuid, boolean)',
    'update_room(uuid, jsonb, boolean, text)', 'kick_player(uuid, uuid)', 'start_room(uuid)', 'rematch_room(uuid)', 'quick_match(text, int)',
    'list_public_rooms()', 'get_room(text)', 'submit_room_answer(uuid, int, boolean)', 'advance_room(uuid, int)', 'send_room_invite(uuid, uuid)',
    'list_game_invites()']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  begin alter publication supabase_realtime add table public.rooms; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.room_players; exception when duplicate_object then null; end;
end $$;
