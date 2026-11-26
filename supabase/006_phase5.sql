-- Phase 5: weekly / monthly / yearly leaderboards and tournaments.
-- Run after 005_phase4.sql. Safe to re-run.
--
-- Tournaments
--   daily     official, created automatically each UTC day, 3 attempts, on-site rewards (XP + badge)
--   weekly    official "hard" one, created automatically each ISO week (Monday UTC), 1 attempt, level 3+,
--             external prize for 1st (set the label/terms in the admin panel, phase 6)
--   community made by players, points only
-- An attempt is a normal server-scored round (play_sessions) tagged with tournament_id.
-- Score = correct × 1000 + up to 900 time bonus (faster is better). Best attempt counts.
-- Results are final 15 minutes after the end (so rounds in progress can finish), then prizes are paid.

alter table public.play_sessions add column if not exists tournament_id uuid;
create index if not exists play_sessions_finished on public.play_sessions (finished_at) where status = 'finished';
create index if not exists play_sessions_tournament on public.play_sessions (tournament_id, user_id) where tournament_id is not null;
create index if not exists room_players_finished on public.room_players (user_id) where final_rank is not null;

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('daily', 'weekly', 'community')),
  title text not null check (length(title) between 3 and 80),
  description text not null default '' check (length(description) <= 600),
  game_slug text not null,
  created_by uuid references public.profiles(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  question_count int not null default 20,
  max_attempts int not null default 3 check (max_attempts between 1 and 10),
  min_level int not null default 1,
  is_public boolean not null default true,
  prizes jsonb not null default '[]',
  terms text not null default '',
  finalized_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists tournaments_official on public.tournaments (kind, starts_at) where kind in ('daily', 'weekly');
create index if not exists tournaments_time on public.tournaments (ends_at desc);

create table if not exists public.tournament_entries (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

create table if not exists public.tournament_results (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rank int not null,
  score int not null,
  correct int not null,
  seconds int not null,
  prize_label text,
  xp_awarded int not null default 0,
  external_prize boolean not null default false,
  claim_status text not null default 'none' check (claim_status in ('none', 'pending', 'sent')),
  primary key (tournament_id, user_id)
);

alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.tournament_results enable row level security;
revoke all on public.tournaments, public.tournament_entries, public.tournament_results from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public._t_score(p_correct int, p_secs int)
returns int language sql immutable set search_path = '' as $$
  select p_correct * 1000 + greatest(0, 900 - coalesce(p_secs, 900));
$$;

create or replace function public._t_code()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := 'T';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.tournaments where code = c);
  end loop;
  return c;
end;
$$;

-- Best attempt per player (live standings)
create or replace function public._t_standings(p_tid uuid)
returns table (user_id uuid, correct int, seconds int, score int, rk bigint)
language sql stable security definer set search_path = '' as $$
  with t as (select * from public.tournaments where id = p_tid),
  best as (
    select distinct on (s.user_id) s.user_id, s.correct,
      extract(epoch from (s.finished_at - s.started_at))::int as seconds,
      public._t_score(s.correct, extract(epoch from (s.finished_at - s.started_at))::int) as score
    from public.play_sessions s, t
    where s.tournament_id = t.id and s.status = 'finished' and s.user_id is not null
      and s.started_at < t.ends_at and s.finished_at < t.ends_at + interval '15 minutes'
    order by s.user_id, score desc, seconds asc
  )
  select b.user_id, b.correct, b.seconds, b.score, rank() over (order by b.score desc) as rk from best b;
$$;

create or replace function public._top_game()
returns text language sql stable security definer set search_path = '' as $$
  select game_slug from public.quiz_questions where active group by game_slug order by count(*) desc limit 1;
$$;

-- Create today's daily and this week's weekly tournament if they don't exist yet.
create or replace function public._ensure_official()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_game text := public._top_game();
  d timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  w timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
begin
  if v_game is null then return; end if;
  insert into public.tournaments (code, kind, title, description, game_slug, starts_at, ends_at, max_attempts, min_level, prizes, terms)
  values (public._t_code(), 'daily', 'Daily Challenge - ' || to_char(d, 'Mon DD'),
    'A fresh challenge every day. Three attempts, your best round counts.',
    v_game, d, d + interval '1 day', 3, 1,
    '[{"from":1,"to":1,"label":"Daily Champion + 300 XP","xp":300},{"from":2,"to":3,"label":"150 XP","xp":150},{"from":4,"to":10,"label":"50 XP","xp":50}]'::jsonb,
    'Rewards are added to your account automatically when the challenge ends.')
  on conflict do nothing;
  insert into public.tournaments (code, kind, title, description, game_slug, starts_at, ends_at, max_attempts, min_level, prizes, terms)
  values (public._t_code(), 'weekly', 'Weekly Masters - week ' || to_char(w, 'IW'),
    'The hard one. One attempt only, level 3 and up. Accuracy first, speed breaks ties.',
    v_game, w, w + interval '7 days', 1, 3,
    '[{"from":1,"to":1,"label":"Weekly prize (announced on this page) + 1000 XP","xp":1000,"external":true},{"from":2,"to":3,"label":"500 XP","xp":500},{"from":4,"to":10,"label":"150 XP","xp":150}]'::jsonb,
    'One attempt per player. Leaving a round counts as your attempt. External prizes are sent to the email on the winning account within 7 days. QuizBit may disqualify entries that break the rules.')
  on conflict do nothing;
end;
$$;

create or replace function public._finalize_tournament(p_tid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.tournaments;
  s record;
  pz jsonb;
  v_xp int;
begin
  select * into t from public.tournaments where id = p_tid for update;
  if t.finalized_at is not null or now() < t.ends_at + interval '15 minutes' then return; end if;
  for s in select * from public._t_standings(p_tid) loop
    select p into pz from jsonb_array_elements(t.prizes) p
      where s.rk between (p->>'from')::int and (p->>'to')::int limit 1;
    v_xp := case when t.kind in ('daily', 'weekly') then coalesce((pz->>'xp')::int, 0) else 0 end;
    insert into public.tournament_results (tournament_id, user_id, rank, score, correct, seconds, prize_label, xp_awarded, external_prize, claim_status)
    values (p_tid, s.user_id, s.rk, s.score, s.correct, s.seconds, pz->>'label', v_xp, coalesce((pz->>'external')::boolean, false),
      case when coalesce((pz->>'external')::boolean, false) then 'pending' else 'none' end)
    on conflict do nothing;
    if v_xp > 0 then update public.profiles set xp = xp + v_xp where id = s.user_id; end if;
    perform public._grant_achievements(s.user_id, array_remove(array[
      'tourney_first',
      case when s.rk <= 3 then 'tourney_podium' end,
      case when s.rk = 1 and t.kind in ('daily', 'weekly') then 'tourney_champion' end], null));
  end loop;
  update public.tournaments set finalized_at = now() where id = p_tid;
end;
$$;

create or replace function public._finalize_due()
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select id from public.tournaments where finalized_at is null and ends_at + interval '15 minutes' < now() order by ends_at limit 20 loop
    perform public._finalize_tournament(r.id);
  end loop;
end;
$$;

drop function if exists public._t_card(public.tournaments, uuid);
create or replace function public._t_card(p_id uuid, me uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'code', t.code, 'kind', t.kind, 'title', t.title, 'description', t.description, 'game_slug', t.game_slug,
    'starts_at', t.starts_at, 'ends_at', t.ends_at, 'max_attempts', t.max_attempts, 'min_level', t.min_level,
    'is_public', t.is_public, 'prizes', t.prizes, 'finalized', t.finalized_at is not null,
    'creator', (select username from public.profiles where id = t.created_by),
    'players', (select count(*) from public.tournament_entries e where e.tournament_id = t.id),
    'joined', exists (select 1 from public.tournament_entries e where e.tournament_id = t.id and e.user_id = me),
    'winner', (select p.username from public.tournament_results r join public.profiles p on p.id = r.user_id where r.tournament_id = t.id and r.rank = 1 limit 1)
  ) from public.tournaments t where t.id = p_id;
$$;

revoke all on function public._t_score(int, int) from public, anon, authenticated;
revoke all on function public._t_code() from public, anon, authenticated;
revoke all on function public._t_standings(uuid) from public, anon, authenticated;
revoke all on function public._top_game() from public, anon, authenticated;
revoke all on function public._ensure_official() from public, anon, authenticated;
revoke all on function public._finalize_tournament(uuid) from public, anon, authenticated;
revoke all on function public._finalize_due() from public, anon, authenticated;
revoke all on function public._t_card(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public API
-- ---------------------------------------------------------------------------
create or replace function public.list_tournaments()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  perform public._ensure_official();
  perform public._finalize_due();
  return jsonb_build_object(
    'now', now(),
    'official', (select coalesce(jsonb_agg(public._t_card(t.id, me) order by t.kind), '[]'::jsonb) from public.tournaments t
      where t.kind in ('daily', 'weekly') and now() between t.starts_at and t.ends_at),
    'live', (select coalesce(jsonb_agg(public._t_card(t.id, me) order by t.ends_at), '[]'::jsonb) from (
      select * from public.tournaments where kind = 'community' and is_public and now() between starts_at and ends_at order by ends_at limit 30) t),
    'upcoming', (select coalesce(jsonb_agg(public._t_card(t.id, me) order by t.starts_at), '[]'::jsonb) from (
      select * from public.tournaments where is_public and starts_at > now() order by starts_at limit 20) t),
    'finished', (select coalesce(jsonb_agg(public._t_card(t.id, me) order by t.ends_at desc), '[]'::jsonb) from (
      select * from public.tournaments where (is_public or kind <> 'community') and ends_at < now() order by ends_at desc limit 12) t),
    'mine', (select coalesce(jsonb_agg(public._t_card(t.id, me) order by t.ends_at), '[]'::jsonb) from (
      select * from public.tournaments t2 where me is not null and t2.ends_at > now() - interval '1 day'
        and (t2.created_by = me or exists (select 1 from public.tournament_entries e where e.tournament_id = t2.id and e.user_id = me))
      order by t2.ends_at limit 20) t)
  );
end;
$$;

create or replace function public.get_tournament(p_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  t public.tournaments;
  v_board jsonb;
  v_me jsonb;
  v_used int := 0;
begin
  select * into t from public.tournaments where code = upper(trim(p_code));
  if not found then raise exception 'tournament_not_found'; end if;
  if t.finalized_at is null and now() > t.ends_at + interval '15 minutes' then
    perform public._finalize_tournament(t.id);
    select * into t from public.tournaments where id = t.id;
  end if;

  if t.finalized_at is not null then
    select coalesce(jsonb_agg(jsonb_build_object('rank', r.rank, 'id', p.id, 'username', p.username, 'level', public.level_for_xp(p.xp),
        'score', r.score, 'correct', r.correct, 'seconds', r.seconds, 'prize', r.prize_label) order by r.rank, r.seconds), '[]'::jsonb)
      into v_board from (select * from public.tournament_results where tournament_id = t.id order by rank, seconds limit 100) r
      join public.profiles p on p.id = r.user_id;
    select jsonb_build_object('rank', r.rank, 'score', r.score, 'correct', r.correct, 'seconds', r.seconds, 'prize', r.prize_label,
        'xp_awarded', r.xp_awarded, 'external_prize', r.external_prize, 'claim_status', r.claim_status)
      into v_me from public.tournament_results r where r.tournament_id = t.id and r.user_id = me;
  else
    select coalesce(jsonb_agg(jsonb_build_object('rank', s.rk, 'id', p.id, 'username', p.username, 'level', public.level_for_xp(p.xp),
        'score', s.score, 'correct', s.correct, 'seconds', s.seconds) order by s.rk, s.seconds), '[]'::jsonb)
      into v_board from (select * from public._t_standings(t.id) order by rk, seconds limit 100) s
      join public.profiles p on p.id = s.user_id;
    select jsonb_build_object('rank', s.rk, 'score', s.score, 'correct', s.correct, 'seconds', s.seconds)
      into v_me from public._t_standings(t.id) s where s.user_id = me;
  end if;

  if me is not null then
    select count(*) into v_used from public.play_sessions where tournament_id = t.id and user_id = me;
  end if;

  return public._t_card(t.id, me) || jsonb_build_object(
    'now', now(), 'terms', t.terms, 'question_count', t.question_count, 'is_creator', t.created_by = me,
    'board', v_board, 'me', v_me, 'attempts_used', v_used,
    'my_level', (select public.level_for_xp(xp) from public.profiles where id = me)
  );
end;
$$;

create or replace function public.join_tournament(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  t public.tournaments;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into t from public.tournaments where code = upper(trim(p_code));
  if not found then raise exception 'tournament_not_found'; end if;
  if now() >= t.ends_at then raise exception 'tournament_over'; end if;
  if (select public.level_for_xp(xp) from public.profiles where id = me) < t.min_level then raise exception 'level_too_low'; end if;
  if not public._age_ok(me, t.game_slug) then raise exception 'age_restricted'; end if;
  insert into public.tournament_entries (tournament_id, user_id) values (t.id, me) on conflict do nothing;
end;
$$;

-- Starts a tournament attempt. Same response shape as start_session, so the game plays it as usual.
create or replace function public.start_tournament_round(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  t public.tournaments;
  v_n int;
  v_k int;
  v_ids bigint[];
  v_sid uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into t from public.tournaments where code = upper(trim(p_code));
  if not found then raise exception 'tournament_not_found'; end if;
  if now() < t.starts_at then raise exception 'tournament_not_started'; end if;
  if now() >= t.ends_at then raise exception 'tournament_over'; end if;
  perform public.join_tournament(p_code);
  if (select count(*) from public.play_sessions where tournament_id = t.id and user_id = me) >= t.max_attempts then raise exception 'no_attempts_left'; end if;
  if (select count(*) from public.play_sessions where user_id = me and started_at > now() - interval '1 minute') >= 8 then raise exception 'rate_limited'; end if;

  update public.play_sessions set status = 'expired' where user_id = me and status = 'active' and game_slug = t.game_slug;

  v_n := t.question_count;
  v_k := v_n / 2 + floor(random() * 3)::int - 1;
  select array_agg(id order by random()) into v_ids from (
    (select id from public.quiz_questions where game_slug = t.game_slug and active and answer order by random() limit v_k)
    union all
    (select id from public.quiz_questions where game_slug = t.game_slug and active and not answer order by random() limit v_n - v_k)
  ) q;
  if v_ids is null or array_length(v_ids, 1) < 5 then raise exception 'no_questions'; end if;

  insert into public.play_sessions (user_id, game_slug, question_ids, total, tournament_id)
  values (me, t.game_slug, v_ids, array_length(v_ids, 1), t.id) returning id into v_sid;

  return jsonb_build_object(
    'session_id', v_sid, 'guest_token', null,
    'tournament', jsonb_build_object('code', t.code, 'title', t.title, 'kind', t.kind),
    'questions', (
      select jsonb_agg(jsonb_build_object('id', q.id, 'item', q.item, 'type', q.qtype, 'emoji', q.emoji, 'sprite', q.sprite) order by o.ord)
      from unnest(v_ids) with ordinality o(qid, ord) join public.quiz_questions q on q.id = o.qid
    )
  );
end;
$$;

create or replace function public.create_tournament(p_title text, p_description text, p_game text, p_starts_at timestamptz, p_hours int, p_attempts int, p_public boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  v_start timestamptz := greatest(coalesce(p_starts_at, now()), now());
  v_code text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if (select public.level_for_xp(xp) from public.profiles where id = me) < 2 then raise exception 'level_too_low'; end if;
  if length(trim(coalesce(p_title, ''))) < 3 then raise exception 'bad_title'; end if;
  if p_hours not in (1, 3, 6, 12, 24, 72, 168) then raise exception 'bad_duration'; end if;
  if p_attempts not in (1, 3, 5, 10) then raise exception 'bad_attempts'; end if;
  if v_start > now() + interval '7 days' then raise exception 'too_far'; end if;
  if not exists (select 1 from public.quiz_questions where game_slug = p_game and active) then raise exception 'no_questions'; end if;
  if not public._age_ok(me, p_game) then raise exception 'age_restricted'; end if;
  if (select count(*) from public.tournaments where created_by = me and ends_at > now()) >= 3 then raise exception 'too_many'; end if;
  v_code := public._t_code();
  insert into public.tournaments (code, kind, title, description, game_slug, created_by, starts_at, ends_at, max_attempts, is_public)
  values (v_code, 'community', left(trim(p_title), 80), left(trim(coalesce(p_description, '')), 600), p_game, me, v_start,
    v_start + make_interval(hours => p_hours), p_attempts, coalesce(p_public, true));
  insert into public.tournament_entries (tournament_id, user_id) select id, me from public.tournaments where code = v_code;
  return jsonb_build_object('code', v_code);
end;
$$;

-- XP leaderboard for a period. p_period: week | month | year | all. p_scope: global | friends.
create or replace function public.get_leaderboard(p_period text default 'week', p_scope text default 'global', p_game text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  v_from timestamptz;
  v_to timestamptz;
  v_rows jsonb;
  v_me jsonb;
begin
  v_from := case p_period
    when 'week' then date_trunc('week', now() at time zone 'UTC') at time zone 'UTC'
    when 'month' then date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'
    when 'year' then date_trunc('year', now() at time zone 'UTC') at time zone 'UTC'
    else '-infinity'::timestamptz end;
  v_to := case p_period
    when 'week' then v_from + interval '7 days'
    when 'month' then v_from + interval '1 month'
    when 'year' then v_from + interval '1 year'
    else 'infinity'::timestamptz end;
  if p_scope = 'friends' and me is null then raise exception 'not_signed_in'; end if;

  with pool as (
    select p.id from public.profiles p
    where p_scope <> 'friends' or p.id = me or public.are_friends(me, p.id)
  ),
  earned as (
    select s.user_id as id, s.xp_earned as xp, 1 as games from public.play_sessions s
      where s.status = 'finished' and s.user_id is not null and s.finished_at >= v_from and s.finished_at < v_to
        and (p_game is null or s.game_slug = p_game)
    union all
    select rp.user_id, rp.xp_earned, 1 from public.room_players rp join public.rooms r on r.id = rp.room_id
      where rp.final_rank is not null and r.finished_at >= v_from and r.finished_at < v_to
        and (p_game is null or r.game_slug = p_game)
    union all
    select tr.user_id, tr.xp_awarded, 0 from public.tournament_results tr join public.tournaments t on t.id = tr.tournament_id
      where tr.xp_awarded > 0 and t.finalized_at >= v_from and t.finalized_at < v_to and (p_game is null or t.game_slug = p_game)
  ),
  totals as (
    select e.id, sum(e.xp)::int as xp, sum(e.games)::int as games from earned e join pool on pool.id = e.id group by e.id having sum(e.xp) > 0
  ),
  ranked as (
    select t.*, rank() over (order by t.xp desc) as rk from totals t
  )
  select
    (select coalesce(jsonb_agg(jsonb_build_object('rank', r.rk, 'id', p.id, 'username', p.username, 'level', public.level_for_xp(p.xp),
        'showcase', p.showcase, 'xp', r.xp, 'games', r.games) order by r.rk, p.username), '[]'::jsonb)
      from (select * from ranked order by rk limit 50) r join public.profiles p on p.id = r.id),
    (select jsonb_build_object('rank', r.rk, 'xp', r.xp, 'games', r.games, 'of', (select count(*) from ranked)) from ranked r where r.id = me)
  into v_rows, v_me;

  return jsonb_build_object('period', p_period, 'scope', p_scope, 'from', case when p_period = 'all' then null else v_from end,
    'to', case when p_period = 'all' then null else v_to end, 'now', now(), 'rows', v_rows, 'me', v_me);
end;
$$;

do $$
declare f text;
begin
  foreach f in array array['list_tournaments()', 'get_tournament(text)', 'get_leaderboard(text, text, text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  foreach f in array array['join_tournament(text)', 'start_tournament_round(text)',
    'create_tournament(text, text, text, timestamptz, int, int, boolean)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
