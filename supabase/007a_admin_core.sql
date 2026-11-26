-- Phase 6a: staff roles, bans, audit log, editable catalog (games, categories, badges), site settings.
-- Run after 006_phase5.sql. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Roles and bans (players can't change these: profiles column grants exclude them)
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists banned_until timestamptz;
alter table public.profiles add column if not exists ban_reason text;
do $$ begin
  alter table public.profiles add constraint profiles_role_check check (role in ('user', 'moderator', 'editor', 'admin', 'owner'));
exception when duplicate_object then null; end $$;

create or replace function public._my_role()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'user');
$$;

-- Permission matrix
--   owner      everything
--   admin      everything except making/removing admins and owners
--   editor     dashboard, content (games, questions, categories), tournaments, badges, prizes view
--   moderator  dashboard, view users, ban/unban + rename, rooms
create or replace function public._perm(p text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case public._my_role()
    when 'owner' then true
    when 'admin' then p <> 'staff.admin'
    when 'editor' then p in ('dash', 'content', 'tournaments', 'badges', 'prizes.view', 'users.view')
    when 'moderator' then p in ('dash', 'users.view', 'users.moderate', 'rooms')
    else false end;
$$;

create or replace function public._require(p text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public._perm(p) then raise exception 'forbidden'; end if;
end;
$$;

create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  actor uuid references public.profiles(id) on delete set null,
  action text not null,
  target text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_time on public.admin_audit (created_at desc);
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;

create or replace function public._audit(p_action text, p_target text, p_details jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.admin_audit (actor, action, target, details) values (auth.uid(), p_action, p_target, coalesce(p_details, '{}'));
$$;

-- ---------------------------------------------------------------------------
-- Site settings (key → JSON). Everything here is public config, read by the site.
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;

insert into public.site_settings (key, value) values
  ('announcement', '{"enabled": false, "text": "", "link": "", "link_label": "", "tone": "info"}'),
  ('features', '{"signups": true, "multiplayer": true, "tournaments": true, "community_tournaments": true, "friends": true, "leaderboards": true}'),
  ('maintenance', '{"enabled": false, "message": "We are making QuizBit even better. Back soon!"}'),
  ('prize', '{"url": "https://fortunejack.com", "label": "Claim the Prize"}'),
  ('xp_event', '{"multiplier": 1, "label": "", "starts_at": null, "ends_at": null}'),
  ('home', '{"featured_slug": "hungary-or-not", "hero_title": "", "hero_subtitle": ""}'),
  ('tournament_templates', '{
    "daily": {"enabled": true, "game": null, "title": "Daily Challenge", "description": "A fresh challenge every day. Three attempts, your best round counts.", "attempts": 3, "min_level": 1,
      "prizes": [{"from":1,"to":1,"label":"Daily Champion + 300 XP","xp":300},{"from":2,"to":3,"label":"150 XP","xp":150},{"from":4,"to":10,"label":"50 XP","xp":50}],
      "terms": "Rewards are added to your account automatically when the challenge ends."},
    "weekly": {"enabled": true, "game": null, "title": "Weekly Masters", "description": "The hard one. One attempt only, level 3 and up. Accuracy first, speed breaks ties.", "attempts": 1, "min_level": 3,
      "prizes": [{"from":1,"to":1,"label":"Weekly prize (announced on this page) + 1000 XP","xp":1000,"external":true},{"from":2,"to":3,"label":"500 XP","xp":500},{"from":4,"to":10,"label":"150 XP","xp":150}],
      "terms": "One attempt per player. Leaving a round counts as your attempt. External prizes are sent to the email on the winning account within 7 days. QuizBit may disqualify entries that break the rules."}
  }')
on conflict (key) do nothing;

create or replace function public._setting(p_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select value from public.site_settings where key = p_key;
$$;

-- ---------------------------------------------------------------------------
-- Catalog: games, categories, custom badges
-- ---------------------------------------------------------------------------
create table if not exists public.games (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  title text not null,
  tagline text not null default '',
  emoji text not null default '🎯',
  gradient text[] not null default array['#8b5cf6', '#22d3ee'],
  categories text[] not null default '{}',
  countries text[],
  status text not null default 'soon' check (status in ('live', 'soon', 'hidden')),
  featured boolean not null default false,
  difficulty text not null default 'Medium',
  minutes int not null default 4,
  questions int not null default 20 check (questions between 5 and 50),
  age_rating int not null default 0,
  prompt text not null default 'True or false?',
  yes_label text not null default 'True',
  no_label text not null default 'False',
  sort int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.games enable row level security;
revoke all on public.games from anon, authenticated;

create table if not exists public.categories (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  emoji text not null default '✨',
  grp text not null default 'knowledge',
  color text not null default '#a78bfa',
  blurb text not null default '',
  sort int not null default 100,
  visible boolean not null default true
);
alter table public.categories enable row level security;
revoke all on public.categories from anon, authenticated;

create table if not exists public.custom_badges (
  id text primary key check (id ~ '^c_[a-z0-9_]{2,40}$'),
  emoji text not null,
  name text not null,
  description text not null default '',
  tier text not null default 'gold' check (tier in ('bronze', 'silver', 'gold', 'platinum')),
  created_at timestamptz not null default now()
);
alter table public.custom_badges enable row level security;
revoke all on public.custom_badges from anon, authenticated;

-- Everything the site needs at start-up, in one call (public).
create or replace function public.get_site_config()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'settings', (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from public.site_settings where key <> 'tournament_templates'),
    'games', (select coalesce(jsonb_agg(to_jsonb(g) - 'created_at' - 'updated_at' order by g.sort, g.title), '[]'::jsonb) from public.games g where g.status <> 'hidden'),
    'categories', (select coalesce(jsonb_agg(to_jsonb(c) order by c.sort, c.name), '[]'::jsonb) from public.categories c where c.visible),
    'badges', (select coalesce(jsonb_agg(to_jsonb(b) - 'created_at' order by b.created_at), '[]'::jsonb) from public.custom_badges b),
    'now', now()
  );
$$;
revoke all on function public.get_site_config() from public;
grant execute on function public.get_site_config() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Server-side enforcement: bans, feature switches, XP events
-- ---------------------------------------------------------------------------
create or replace function public._is_banned(p_uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select banned_until > now() from public.profiles where id = p_uid), false);
$$;

create or replace function public._guard_play()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null and public._is_banned(new.user_id) then raise exception 'banned'; end if;
  if coalesce((public._setting('maintenance')->>'enabled')::boolean, false) and public._my_role() = 'user' then raise exception 'maintenance'; end if;
  return new;
end;
$$;
drop trigger if exists play_sessions_guard on public.play_sessions;
create trigger play_sessions_guard before insert on public.play_sessions for each row execute function public._guard_play();

create or replace function public._guard_room_player()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public._is_banned(new.user_id) then raise exception 'banned'; end if;
  if not coalesce((public._setting('features')->>'multiplayer')::boolean, true) and public._my_role() = 'user' then raise exception 'feature_off'; end if;
  return new;
end;
$$;
drop trigger if exists room_players_guard on public.room_players;
create trigger room_players_guard before insert on public.room_players for each row execute function public._guard_room_player();

create or replace function public._guard_tournament()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'community' then
    if new.created_by is not null and public._is_banned(new.created_by) then raise exception 'banned'; end if;
    if not coalesce((public._setting('features')->>'community_tournaments')::boolean, true) then raise exception 'feature_off'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists tournaments_guard on public.tournaments;
create trigger tournaments_guard before insert on public.tournaments for each row execute function public._guard_tournament();

create or replace function public._guard_friendship()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public._is_banned(new.requester) then raise exception 'banned'; end if;
  if not coalesce((public._setting('features')->>'friends')::boolean, true) then raise exception 'feature_off'; end if;
  return new;
end;
$$;
drop trigger if exists friendships_guard on public.friendships;
create trigger friendships_guard before insert on public.friendships for each row execute function public._guard_friendship();

-- Sign-ups can be switched off
create or replace function public._guard_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce((public._setting('features')->>'signups')::boolean, true) then raise exception 'signups_closed'; end if;
  return new;
end;
$$;
drop trigger if exists profiles_signup_guard on public.profiles;
create trigger profiles_signup_guard before insert on public.profiles for each row execute function public._guard_signup();

-- XP events (e.g. double XP weekend): bonus is added on top of what a round or room awarded.
create or replace function public._xp_multiplier()
returns numeric language sql stable security definer set search_path = '' as $$
  select case
    when (e->>'multiplier') is null then 1
    when (e->>'starts_at') is not null and now() < (e->>'starts_at')::timestamptz then 1
    when (e->>'ends_at') is not null and now() > (e->>'ends_at')::timestamptz then 1
    else least(greatest((e->>'multiplier')::numeric, 1), 5) end
  from (select public._setting('xp_event') as e) s;
$$;

create or replace function public._xp_bonus_session()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  m numeric := public._xp_multiplier();
  bonus int;
begin
  if old.status = 'active' and new.status = 'finished' and new.user_id is not null and coalesce(new.xp_earned, 0) > 0 and m > 1 then
    bonus := floor(new.xp_earned * (m - 1))::int;
    new.xp_earned := new.xp_earned + bonus;
    update public.profiles set xp = xp + bonus where id = new.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists play_sessions_xp_event on public.play_sessions;
create trigger play_sessions_xp_event before update on public.play_sessions for each row execute function public._xp_bonus_session();

create or replace function public._xp_bonus_room()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  m numeric := public._xp_multiplier();
  bonus int;
begin
  if old.final_rank is null and new.final_rank is not null and coalesce(new.xp_earned, 0) > 0 and m > 1 then
    bonus := floor(new.xp_earned * (m - 1))::int;
    new.xp_earned := new.xp_earned + bonus;
    update public.profiles set xp = xp + bonus where id = new.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists room_players_xp_event on public.room_players;
create trigger room_players_xp_event before update on public.room_players for each row execute function public._xp_bonus_room();

-- Official tournaments now follow the templates in site settings
create or replace function public._ensure_official()
returns void language plpgsql security definer set search_path = '' as $$
declare
  tpl jsonb := public._setting('tournament_templates');
  dt jsonb := tpl->'daily';
  wt jsonb := tpl->'weekly';
  d timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  w timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
  g text;
begin
  if coalesce((dt->>'enabled')::boolean, true) then
    g := coalesce(nullif(dt->>'game', ''), public._top_game());
    if g is not null then
      insert into public.tournaments (code, kind, title, description, game_slug, starts_at, ends_at, max_attempts, min_level, prizes, terms)
      values (public._t_code(), 'daily', coalesce(dt->>'title', 'Daily Challenge') || ' - ' || to_char(d, 'Mon DD'), coalesce(dt->>'description', ''),
        g, d, d + interval '1 day', least(greatest(coalesce((dt->>'attempts')::int, 3), 1), 10), coalesce((dt->>'min_level')::int, 1),
        coalesce(dt->'prizes', '[]'::jsonb), coalesce(dt->>'terms', ''))
      on conflict do nothing;
    end if;
  end if;
  if coalesce((wt->>'enabled')::boolean, true) then
    g := coalesce(nullif(wt->>'game', ''), public._top_game());
    if g is not null then
      insert into public.tournaments (code, kind, title, description, game_slug, starts_at, ends_at, max_attempts, min_level, prizes, terms)
      values (public._t_code(), 'weekly', coalesce(wt->>'title', 'Weekly Masters') || ' - week ' || to_char(w, 'IW'), coalesce(wt->>'description', ''),
        g, w, w + interval '7 days', least(greatest(coalesce((wt->>'attempts')::int, 1), 1), 10), coalesce((wt->>'min_level')::int, 3),
        coalesce(wt->'prizes', '[]'::jsonb), coalesce(wt->>'terms', ''))
      on conflict do nothing;
    end if;
  end if;
end;
$$;

-- Admin-made one-off events
do $$ begin
  alter table public.tournaments drop constraint if exists tournaments_kind_check;
  alter table public.tournaments add constraint tournaments_kind_check check (kind in ('daily', 'weekly', 'community', 'special'));
end $$;

-- Badge ids come from achievements.js plus custom badges
do $$
declare f text;
begin
  foreach f in array array['_my_role()', '_perm(text)', '_require(text)', '_audit(text, text, jsonb)', '_setting(text)', '_is_banned(uuid)', '_xp_multiplier()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
