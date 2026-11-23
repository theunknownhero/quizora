-- Phase 3: date of birth + 18+ quizzes, friends, player search, public profiles, game invites.
-- Run after 002_phase2.sql. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Date of birth (private: only the player can read their own row)
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists birth_date date;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  uname text := new.raw_user_meta_data ->> 'username';
  bd date;
begin
  if uname is null or uname !~ '^[A-Za-z0-9_.]{3,20}$' then
    raise exception 'invalid_username';
  end if;
  begin
    bd := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;
  exception when others then
    raise exception 'invalid_birth_date';
  end;
  if bd is not null and (bd > (current_date - interval '13 years')::date or bd < (current_date - interval '120 years')::date) then
    raise exception 'invalid_birth_date';
  end if;
  insert into public.profiles (id, username, birth_date) values (new.id, uname, bd);
  return new;
exception
  when unique_violation then
    raise exception 'username_taken';
end;
$$;

-- Older accounts add their date of birth once. It can't be changed afterwards.
create or replace function public.set_birth_date(p_birth_date date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if p_birth_date is null or p_birth_date < (current_date - interval '120 years')::date then raise exception 'invalid_birth_date'; end if;
  if p_birth_date > (current_date - interval '13 years')::date then raise exception 'too_young'; end if;
  update public.profiles set birth_date = p_birth_date where id = uid and birth_date is null;
  if not found then raise exception 'already_set'; end if;
end;
$$;
revoke all on function public.set_birth_date(date) from public;
grant execute on function public.set_birth_date(date) to authenticated;

create or replace function public.age_of(uid uuid)
returns int language sql stable security definer set search_path = '' as $$
  select extract(year from age(current_date, p.birth_date))::int from public.profiles p where p.id = uid;
$$;
revoke all on function public.age_of(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Per-game settings. min_age = 18 makes a quiz adults-only on the server.
-- ---------------------------------------------------------------------------
create table if not exists public.game_settings (
  game_slug text primary key,
  min_age int not null default 0 check (min_age between 0 and 21)
);
alter table public.game_settings enable row level security;
drop policy if exists "Anyone reads game settings" on public.game_settings;
create policy "Anyone reads game settings" on public.game_settings for select to anon, authenticated using (true);
revoke insert, update, delete on public.game_settings from anon, authenticated;

-- Every round goes through play_sessions, so check the age here.
create or replace function public.check_play_age()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_min int;
begin
  select min_age into v_min from public.game_settings where game_slug = new.game_slug;
  if coalesce(v_min, 0) > 0 then
    if new.user_id is null or coalesce(public.age_of(new.user_id), -1) < v_min then
      raise exception 'age_restricted';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists play_sessions_age on public.play_sessions;
create trigger play_sessions_age before insert on public.play_sessions
  for each row execute function public.check_play_age();

-- ---------------------------------------------------------------------------
-- Friendships: one row per pair. pending → accepted. Changes go through RPCs.
-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester <> addressee)
);
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee on public.friendships (addressee);
alter table public.friendships enable row level security;
drop policy if exists "See own friendships" on public.friendships;
create policy "See own friendships" on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester, addressee));
revoke all on public.friendships from anon;
revoke insert, update, delete on public.friendships from authenticated;

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.friendships f where f.status = 'accepted'
    and least(f.requester, f.addressee) = least(a, b) and greatest(f.requester, f.addressee) = greatest(a, b));
$$;
revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;

-- relation of me to someone: self | friend | outgoing | incoming | none
create or replace function public._relation(me uuid, other uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case
    when me is null then jsonb_build_object('relation', 'none')
    when me = other then jsonb_build_object('relation', 'self')
    else coalesce((
      select jsonb_build_object('relation', case when f.status = 'accepted' then 'friend' when f.requester = me then 'outgoing' else 'incoming' end, 'friendship_id', f.id)
      from public.friendships f
      where least(f.requester, f.addressee) = least(me, other) and greatest(f.requester, f.addressee) = greatest(me, other)
    ), jsonb_build_object('relation', 'none'))
  end;
$$;
revoke all on function public._relation(uuid, uuid) from public, anon, authenticated;

create or replace function public.send_friend_request(p_username text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  other uuid;
  f public.friendships;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select id into other from public.profiles where lower(username) = lower(trim(p_username));
  if other is null then raise exception 'not_found'; end if;
  if other = me then raise exception 'self'; end if;
  select * into f from public.friendships
    where least(requester, addressee) = least(me, other) and greatest(requester, addressee) = greatest(me, other);
  if found then
    if f.status = 'accepted' then raise exception 'already_friends'; end if;
    if f.requester = me then raise exception 'already_sent'; end if;
    update public.friendships set status = 'accepted', responded_at = now() where id = f.id;
    return jsonb_build_object('status', 'accepted', 'friendship_id', f.id);
  end if;
  if (select count(*) from public.friendships where requester = me and status = 'pending') >= 50 then raise exception 'too_many_pending'; end if;
  if (select count(*) from public.friendships where requester = me and created_at > now() - interval '1 minute') >= 10 then raise exception 'rate_limited'; end if;
  insert into public.friendships (requester, addressee) values (me, other) returning * into f;
  return jsonb_build_object('status', 'sent', 'friendship_id', f.id);
end;
$$;

create or replace function public.respond_friend_request(p_id bigint, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now() where id = p_id and addressee = me and status = 'pending';
  else
    delete from public.friendships where id = p_id and addressee = me and status = 'pending';
  end if;
  if not found then raise exception 'no_request'; end if;
end;
$$;

-- Cancel an outgoing request, decline, or unfriend.
create or replace function public.remove_friendship(p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.friendships where id = p_id and auth.uid() in (requester, addressee);
  if not found then raise exception 'no_friendship'; end if;
end;
$$;

-- My friends and requests, with each player's public card.
create or replace function public.list_friends()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(r order by r->>'sort'), '[]'::jsonb) from (
    select jsonb_build_object(
      'friendship_id', f.id,
      'status', case when f.status = 'accepted' then 'friend' when f.requester = auth.uid() then 'outgoing' else 'incoming' end,
      'since', coalesce(f.responded_at, f.created_at),
      'sort', lower(p.username),
      'user', jsonb_build_object('id', p.id, 'username', p.username, 'xp', p.xp, 'level', public.level_for_xp(p.xp),
        'showcase', p.showcase, 'day_streak', p.day_streak, 'last_played_on', p.last_played_on)
    ) as r
    from public.friendships f
    join public.profiles p on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
    where auth.uid() in (f.requester, f.addressee)
  ) t;
$$;

create or replace function public.search_players(p_q text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(r order by r->>'rank', r->>'username'), '[]'::jsonb) from (
    select jsonb_build_object('id', p.id, 'username', p.username, 'xp', p.xp, 'level', public.level_for_xp(p.xp), 'showcase', p.showcase,
      'rank', case when lower(p.username) = lower(trim(p_q)) then '0' when lower(p.username) like lower(trim(p_q)) || '%' then '1' else '2' end)
      || public._relation(auth.uid(), p.id) as r
    from public.profiles p
    where length(trim(p_q)) >= 2 and auth.uid() is not null and p.id <> auth.uid()
      and lower(p.username) like '%' || replace(replace(replace(lower(trim(p_q)), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    order by case when lower(p.username) = lower(trim(p_q)) then 0 when lower(p.username) like lower(trim(p_q)) || '%' then 1 else 2 end, p.username
    limit 12
  ) t;
$$;

-- Public profile by username. Everyone sees the card, stats and badges; friends (and you) also see recent games.
create or replace function public.get_public_profile(p_username text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  p public.profiles;
  me uuid := auth.uid();
  rel jsonb;
  can_see boolean;
begin
  select * into p from public.profiles where lower(username) = lower(trim(p_username));
  if not found then return null; end if;
  rel := public._relation(me, p.id);
  can_see := rel->>'relation' in ('self', 'friend');
  return jsonb_build_object(
    'id', p.id, 'username', p.username, 'xp', p.xp, 'level', public.level_for_xp(p.xp), 'showcase', p.showcase,
    'joined', p.created_at, 'day_streak', p.day_streak, 'best_day_streak', p.best_day_streak, 'last_played_on', p.last_played_on,
    'stats', (select jsonb_build_object('games', count(*), 'wins', count(*) filter (where won), 'correct', coalesce(sum(correct), 0),
        'answered', coalesce(sum(total), 0), 'best_streak', coalesce(max(best_streak), 0), 'best_score', coalesce(max(correct), 0),
        'perfects', count(*) filter (where correct = total))
      from public.play_sessions s where s.user_id = p.id and s.status = 'finished'),
    'achievements', (select coalesce(jsonb_agg(achievement_id), '[]'::jsonb) from public.user_achievements a where a.user_id = p.id),
    'friends', (select count(*) from public.friendships f where f.status = 'accepted' and p.id in (f.requester, f.addressee)),
    'quizlists', (select coalesce(jsonb_agg(jsonb_build_object('title', l.title, 'share_code', l.share_code,
        'count', (select count(*) from public.playlist_items i where i.playlist_id = l.id)) order by l.updated_at desc), '[]'::jsonb)
      from public.playlists l where l.owner = p.id and l.is_public),
    'recent', case when can_see then (select coalesce(jsonb_agg(x order by x->>'finished_at' desc), '[]'::jsonb) from (
        select jsonb_build_object('game_slug', s.game_slug, 'correct', s.correct, 'total', s.total, 'won', s.won, 'finished_at', s.finished_at) as x
        from public.play_sessions s where s.user_id = p.id and s.status = 'finished' order by s.finished_at desc limit 8) r)
      else null end
  ) || rel;
end;
$$;

-- ---------------------------------------------------------------------------
-- Game invites between friends ("come play this quiz with me")
-- ---------------------------------------------------------------------------
create table if not exists public.game_invites (
  id bigint generated always as identity primary key,
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  game_slug text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);
create index if not exists game_invites_to on public.game_invites (to_user, created_at desc);
alter table public.game_invites enable row level security;
drop policy if exists "See own invites" on public.game_invites;
create policy "See own invites" on public.game_invites for select to authenticated
  using ((select auth.uid()) in (from_user, to_user));
revoke all on public.game_invites from anon;
revoke insert, update, delete on public.game_invites from authenticated;

create or replace function public.send_game_invite(p_to uuid, p_game text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  v_min int;
  v_id bigint;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not public.are_friends(me, p_to) then raise exception 'not_friends'; end if;
  if p_game !~ '^[a-z0-9-]{2,60}$' then raise exception 'bad_game'; end if;
  select min_age into v_min from public.game_settings where game_slug = p_game;
  if coalesce(v_min, 0) > 0 and coalesce(public.age_of(p_to), -1) < v_min then raise exception 'age_restricted'; end if;
  if (select count(*) from public.game_invites where from_user = me and created_at > now() - interval '1 minute') >= 10 then raise exception 'rate_limited'; end if;
  if exists (select 1 from public.game_invites where from_user = me and to_user = p_to and game_slug = p_game and status = 'pending' and expires_at > now()) then
    raise exception 'already_invited';
  end if;
  insert into public.game_invites (from_user, to_user, game_slug) values (me, p_to, p_game) returning id into v_id;
  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.respond_game_invite(p_id bigint, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.game_invites set status = case when p_accept then 'accepted' else 'declined' end
    where id = p_id and to_user = auth.uid() and status = 'pending';
end;
$$;

create or replace function public.list_game_invites()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'game_slug', i.game_slug, 'created_at', i.created_at,
    'from', jsonb_build_object('id', p.id, 'username', p.username, 'level', public.level_for_xp(p.xp))) order by i.created_at desc), '[]'::jsonb)
  from public.game_invites i join public.profiles p on p.id = i.from_user
  where i.to_user = auth.uid() and i.status = 'pending' and i.expires_at > now();
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
revoke all on function public.send_friend_request(text) from public;
revoke all on function public.respond_friend_request(bigint, boolean) from public;
revoke all on function public.remove_friendship(bigint) from public;
revoke all on function public.list_friends() from public;
revoke all on function public.search_players(text) from public;
revoke all on function public.get_public_profile(text) from public;
revoke all on function public.send_game_invite(uuid, text) from public;
revoke all on function public.respond_game_invite(bigint, boolean) from public;
revoke all on function public.list_game_invites() from public;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(bigint, boolean) to authenticated;
grant execute on function public.remove_friendship(bigint) to authenticated;
grant execute on function public.list_friends() to authenticated;
grant execute on function public.search_players(text) to authenticated;
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.send_game_invite(uuid, text) to authenticated;
grant execute on function public.respond_game_invite(bigint, boolean) to authenticated;
grant execute on function public.list_game_invites() to authenticated;

-- Live updates for friend requests and invites (Row Level Security still applies)
do $$
begin
  begin alter publication supabase_realtime add table public.friendships; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.game_invites; exception when duplicate_object then null; end;
end $$;
