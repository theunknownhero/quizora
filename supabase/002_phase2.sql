-- QuizBit — Phase 2: server-side scoring, play history, XP/levels, achievements, library, playlists.
-- Run after schema.sql. Safe to re-run.

-- ============================================================================
-- Questions (hidden from browsers; only the game functions below can read them)
-- ============================================================================
create table if not exists public.quiz_questions (
  id bigint generated always as identity primary key,
  game_slug text not null,
  item text not null,
  qtype text not null,
  emoji text,
  sprite text,
  answer boolean not null,
  fact text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (game_slug, item)
);
alter table public.quiz_questions enable row level security;
revoke all on public.quiz_questions from anon, authenticated;

-- ============================================================================
-- Plays (one row per game played)
-- ============================================================================
create table if not exists public.play_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  guest_token text,
  game_slug text not null,
  question_ids bigint[] not null,
  answers jsonb not null default '[]',
  status text not null default 'active' check (status in ('active', 'finished', 'expired')),
  correct int not null default 0,
  total int not null,
  streak int not null default 0,
  best_streak int not null default 0,
  won boolean,
  xp_earned int not null default 0,
  started_at timestamptz not null default now(),
  last_answer_at timestamptz,
  finished_at timestamptz
);
create index if not exists play_sessions_user on public.play_sessions (user_id, finished_at desc);
alter table public.play_sessions enable row level security;
drop policy if exists "Read own plays" on public.play_sessions;
create policy "Read own plays" on public.play_sessions for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.play_sessions from anon;
revoke insert, update, delete on public.play_sessions from authenticated;
grant select on public.play_sessions to authenticated;

-- ============================================================================
-- Profile additions: XP, daily streak, showcased badges
-- ============================================================================
alter table public.profiles add column if not exists xp int not null default 0;
alter table public.profiles add column if not exists day_streak int not null default 0;
alter table public.profiles add column if not exists best_day_streak int not null default 0;
alter table public.profiles add column if not exists last_played_on date;
alter table public.profiles add column if not exists showcase text[] not null default '{}';
alter table public.profiles drop constraint if exists profiles_showcase_max;
alter table public.profiles add constraint profiles_showcase_max check (cardinality(showcase) <= 3);
grant update (showcase) on public.profiles to authenticated;

-- Level from XP: level L starts at 50*L*(L-1) XP (L2=100, L3=300, L4=600, L5=1000, ...)
create or replace function public.level_for_xp(p_xp int)
returns int language sql immutable set search_path = '' as $$
  select greatest(1, floor((1 + sqrt(1 + greatest(p_xp, 0) / 12.5)) / 2)::int);
$$;

-- ============================================================================
-- Achievements
-- ============================================================================
create table if not exists public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
alter table public.user_achievements enable row level security;
drop policy if exists "Read own achievements" on public.user_achievements;
create policy "Read own achievements" on public.user_achievements for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.user_achievements from anon;
revoke insert, update, delete on public.user_achievements from authenticated;
grant select on public.user_achievements to authenticated;

-- ============================================================================
-- Library: likes, favorites, saved games
-- ============================================================================
create table if not exists public.user_game_flags (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_slug text not null check (length(game_slug) between 1 and 80),
  kind text not null check (kind in ('like', 'favorite', 'save')),
  created_at timestamptz not null default now(),
  primary key (user_id, game_slug, kind)
);
alter table public.user_game_flags enable row level security;
drop policy if exists "Own flags" on public.user_game_flags;
create policy "Own flags" on public.user_game_flags for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.user_game_flags from anon;
revoke update on public.user_game_flags from authenticated;
grant select, insert, delete on public.user_game_flags to authenticated;

-- ============================================================================
-- Playlists (shareable by link)
-- ============================================================================
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  title text not null check (length(title) between 1 and 60),
  description text not null default '' check (length(description) <= 200),
  emoji text not null default U&'\+01F3AF' check (length(emoji) <= 8),
  is_public boolean not null default false,
  share_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.playlist_items (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  game_slug text not null check (length(game_slug) between 1 and 80),
  position int not null default 0,
  added_at timestamptz not null default now(),
  primary key (playlist_id, game_slug)
);
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;

drop policy if exists "Own playlists" on public.playlists;
create policy "Own playlists" on public.playlists for all to authenticated
  using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
drop policy if exists "Own playlist items" on public.playlist_items;
create policy "Own playlist items" on public.playlist_items for all to authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_id and p.owner = (select auth.uid())))
  with check (exists (select 1 from public.playlists p where p.id = playlist_id and p.owner = (select auth.uid())));
revoke all on public.playlists, public.playlist_items from anon;
grant select, insert, update, delete on public.playlists, public.playlist_items to authenticated;

drop trigger if exists playlists_touch on public.playlists;
create trigger playlists_touch before update on public.playlists
  for each row execute function public.touch_updated_at();

-- Anyone with the link can view a playlist (returns no private data except the owner's username)
create or replace function public.get_playlist(p_code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'title', p.title, 'description', p.description, 'emoji', p.emoji,
    'owner', pr.username, 'is_owner', p.owner = auth.uid(), 'share_code', p.share_code,
    'items', coalesce((select jsonb_agg(i.game_slug order by i.position, i.added_at) from public.playlist_items i where i.playlist_id = p.id), '[]'::jsonb)
  )
  from public.playlists p join public.profiles pr on pr.id = p.owner
  where p.share_code = p_code;
$$;
revoke all on function public.get_playlist(text) from public;
grant execute on function public.get_playlist(text) to anon, authenticated;

-- ============================================================================
-- Achievement checks (internal)
-- ============================================================================
create or replace function public._grant_achievements(p_uid uuid, p_extra text[] default '{}')
returns text[] language plpgsql security definer set search_path = '' as $$
declare
  v_games int; v_wins int; v_perfect boolean; v_best int; v_xp int; v_bds int;
  v_saves int; v_likes int; v_lists int; v_lvl int; v_cand text[]; v_new text[];
begin
  if p_uid is null then return '{}'; end if;
  select count(*) filter (where status = 'finished'), count(*) filter (where won),
         coalesce(bool_or(status = 'finished' and correct = total), false), coalesce(max(best_streak), 0)
    into v_games, v_wins, v_perfect, v_best
    from public.play_sessions where user_id = p_uid;
  select xp, best_day_streak into v_xp, v_bds from public.profiles where id = p_uid;
  v_lvl := public.level_for_xp(coalesce(v_xp, 0));
  select count(*) filter (where kind = 'save'), count(*) filter (where kind = 'like')
    into v_saves, v_likes from public.user_game_flags where user_id = p_uid;
  select count(*) into v_lists from public.playlists where owner = p_uid;

  v_cand := array_remove(array[
    case when v_games >= 1 then 'first_game' end,
    case when v_wins >= 1 then 'first_win' end,
    case when v_games >= 10 then 'games_10' end,
    case when v_games >= 50 then 'games_50' end,
    case when v_games >= 100 then 'games_100' end,
    case when v_wins >= 10 then 'wins_10' end,
    case when v_wins >= 50 then 'wins_50' end,
    case when v_perfect then 'perfect' end,
    case when v_best >= 5 then 'streak_5' end,
    case when v_best >= 10 then 'streak_10' end,
    case when v_best >= 20 then 'streak_20' end,
    case when v_lvl >= 5 then 'level_5' end,
    case when v_lvl >= 10 then 'level_10' end,
    case when v_lvl >= 25 then 'level_25' end,
    case when v_bds >= 3 then 'day_streak_3' end,
    case when v_bds >= 7 then 'day_streak_7' end,
    case when v_bds >= 30 then 'day_streak_30' end,
    case when v_saves >= 5 then 'collector' end,
    case when v_likes >= 3 then 'critic' end,
    case when v_lists >= 1 then 'curator' end
  ], null) || coalesce(p_extra, '{}');

  with ins as (
    insert into public.user_achievements (user_id, achievement_id)
    select p_uid, a from unnest(v_cand) a
    on conflict do nothing
    returning achievement_id
  )
  select coalesce(array_agg(achievement_id), '{}') into v_new from ins;
  return v_new;
end;
$$;
revoke all on function public._grant_achievements(uuid, text[]) from public, anon, authenticated;

-- Called by the site after saving/liking/creating playlists
create or replace function public.refresh_achievements()
returns text[] language sql security definer set search_path = '' as $$
  select public._grant_achievements(auth.uid());
$$;
revoke all on function public.refresh_achievements() from public;
grant execute on function public.refresh_achievements() to authenticated;

-- ============================================================================
-- Game flow: start → answer (one by one) → finish
-- ============================================================================
create or replace function public.start_session(p_game text, p_count int default 20, p_guest_token text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_token text := p_guest_token;
  v_n int := least(greatest(coalesce(p_count, 20), 5), 30);
  v_k int;
  v_ids bigint[];
  v_sid uuid;
  v_recent int;
begin
  if v_uid is null and (v_token is null or length(v_token) < 16) then
    v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  end if;
  select count(*) into v_recent from public.play_sessions
   where started_at > now() - interval '1 minute'
     and (case when v_uid is not null then user_id = v_uid else guest_token = v_token end);
  if v_recent >= 8 then raise exception 'rate_limited'; end if;

  update public.play_sessions set status = 'expired'
   where status = 'active' and game_slug = p_game
     and (case when v_uid is not null then user_id = v_uid else guest_token = v_token end);

  -- fair mix: about half true, half false
  v_k := v_n / 2 + floor(random() * 3)::int - 1;
  select array_agg(id order by random()) into v_ids from (
    (select id from public.quiz_questions where game_slug = p_game and active and answer order by random() limit v_k)
    union all
    (select id from public.quiz_questions where game_slug = p_game and active and not answer order by random() limit v_n - v_k)
  ) q;
  if v_ids is null or array_length(v_ids, 1) < 5 then raise exception 'no_questions'; end if;

  insert into public.play_sessions (user_id, guest_token, game_slug, question_ids, total)
  values (v_uid, case when v_uid is null then v_token end, p_game, v_ids, array_length(v_ids, 1))
  returning id into v_sid;

  return jsonb_build_object(
    'session_id', v_sid,
    'guest_token', case when v_uid is null then v_token end,
    'questions', (
      select jsonb_agg(jsonb_build_object('id', q.id, 'item', q.item, 'type', q.qtype, 'emoji', q.emoji, 'sprite', q.sprite) order by o.ord)
      from unnest(v_ids) with ordinality o(qid, ord) join public.quiz_questions q on q.id = o.qid
    )
  );
end;
$$;

create or replace function public.submit_answer(p_session uuid, p_index int, p_choice boolean, p_guest_token text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_s public.play_sessions%rowtype;
  v_q public.quiz_questions%rowtype;
  v_ok boolean;
  v_ms int;
begin
  select * into v_s from public.play_sessions where id = p_session for update;
  if not found then raise exception 'no_session'; end if;
  if not ((v_s.user_id is not null and v_s.user_id = v_uid) or (v_s.user_id is null and v_s.guest_token = p_guest_token)) then
    raise exception 'not_yours';
  end if;
  if v_s.status <> 'active' or v_s.started_at < now() - interval '45 minutes' then raise exception 'session_closed'; end if;
  if p_index <> jsonb_array_length(v_s.answers) or p_index >= v_s.total then raise exception 'out_of_order'; end if;
  v_ms := (extract(epoch from (now() - coalesce(v_s.last_answer_at, v_s.started_at))) * 1000)::int;
  if v_ms < 300 then raise exception 'too_fast'; end if;

  select * into v_q from public.quiz_questions where id = v_s.question_ids[p_index + 1];
  v_ok := (v_q.answer = p_choice);

  update public.play_sessions set
    answers = answers || jsonb_build_array(jsonb_build_object('q', v_q.id, 'item', v_q.item, 'type', v_q.qtype, 'choice', p_choice, 'answer', v_q.answer, 'correct', v_ok, 'ms', v_ms)),
    correct = correct + case when v_ok then 1 else 0 end,
    streak = case when v_ok then streak + 1 else 0 end,
    best_streak = greatest(best_streak, case when v_ok then streak + 1 else 0 end),
    last_answer_at = now()
  where id = p_session;

  return jsonb_build_object('correct', v_ok, 'answer', v_q.answer, 'fact', v_q.fact, 'index', p_index);
end;
$$;

create or replace function public.finish_session(p_session uuid, p_guest_token text default null, p_tz_offset_min int default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_s public.play_sessions%rowtype;
  v_won boolean;
  v_perfect boolean;
  v_xp int := 0;
  v_first_today boolean;
  v_before int; v_after int; v_xp_total int;
  v_local timestamptz;
  v_hour int;
  v_secs int;
  v_extra text[] := '{}';
  v_new text[] := '{}';
  v_today date;
begin
  select * into v_s from public.play_sessions where id = p_session for update;
  if not found then raise exception 'no_session'; end if;
  if not ((v_s.user_id is not null and v_s.user_id = v_uid) or (v_s.user_id is null and v_s.guest_token = p_guest_token)) then
    raise exception 'not_yours';
  end if;
  if v_s.status <> 'active' then raise exception 'session_closed'; end if;
  if jsonb_array_length(v_s.answers) <> v_s.total then raise exception 'not_finished'; end if;

  v_won := v_s.correct >= ceil(v_s.total * 0.7);
  v_perfect := v_s.correct = v_s.total;
  v_secs := extract(epoch from (now() - v_s.started_at))::int;
  v_local := now() + make_interval(mins => least(greatest(coalesce(p_tz_offset_min, 0), -840), 840));
  v_today := (v_local at time zone 'UTC')::date;

  if v_uid is not null then
    select not exists (
      select 1 from public.play_sessions where user_id = v_uid and status = 'finished'
        and ((finished_at + make_interval(mins => least(greatest(coalesce(p_tz_offset_min, 0), -840), 840))) at time zone 'UTC')::date = v_today
    ) into v_first_today;
    v_xp := v_s.correct * 10 + case when v_won then 50 else 0 end + v_s.best_streak * 3
          + case when v_perfect then 100 else 0 end + case when v_first_today then 20 else 0 end;

    select xp into v_xp_total from public.profiles where id = v_uid;
    v_before := public.level_for_xp(coalesce(v_xp_total, 0));
    update public.profiles set
      xp = xp + v_xp,
      day_streak = case when last_played_on = v_today then day_streak when last_played_on = v_today - 1 then day_streak + 1 else 1 end,
      best_day_streak = greatest(best_day_streak, case when last_played_on = v_today then day_streak when last_played_on = v_today - 1 then day_streak + 1 else 1 end),
      last_played_on = v_today
    where id = v_uid
    returning xp into v_xp_total;
    v_after := public.level_for_xp(v_xp_total);
  end if;

  update public.play_sessions set status = 'finished', won = v_won, xp_earned = v_xp, finished_at = now() where id = p_session;

  if v_uid is not null then
    v_hour := extract(hour from (v_local at time zone 'UTC'))::int;
    if v_hour < 5 then v_extra := v_extra || 'night_owl'::text; end if;
    if v_hour >= 5 and v_hour < 8 then v_extra := v_extra || 'early_bird'::text; end if;
    if v_won and v_secs <= 120 then v_extra := v_extra || 'speed_runner'::text; end if;
    v_new := public._grant_achievements(v_uid, v_extra);
  end if;

  return jsonb_build_object(
    'correct', v_s.correct, 'total', v_s.total, 'won', v_won, 'perfect', v_perfect,
    'best_streak', v_s.best_streak, 'seconds', v_secs,
    'xp_earned', v_xp, 'xp_total', v_xp_total, 'level_before', v_before, 'level_after', v_after,
    'new_achievements', to_jsonb(v_new), 'saved', v_uid is not null
  );
end;
$$;

revoke all on function public.start_session(text, int, text) from public;
revoke all on function public.submit_answer(uuid, int, boolean, text) from public;
revoke all on function public.finish_session(uuid, text, int) from public;
grant execute on function public.start_session(text, int, text) to anon, authenticated;
grant execute on function public.submit_answer(uuid, int, boolean, text) to anon, authenticated;
grant execute on function public.finish_session(uuid, text, int) to anon, authenticated;
