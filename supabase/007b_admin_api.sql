-- Phase 6b: admin API. Every function checks the caller's staff permission and writes to the audit log.
-- Run after 007a_admin_core.sql. Safe to re-run.

-- Special (admin-made) tournaments behave like official ones: listed on top and pay XP prizes.
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
    select p into pz from jsonb_array_elements(t.prizes) p where s.rk between (p->>'from')::int and (p->>'to')::int limit 1;
    v_xp := case when t.kind in ('daily', 'weekly', 'special') then coalesce((pz->>'xp')::int, 0) else 0 end;
    insert into public.tournament_results (tournament_id, user_id, rank, score, correct, seconds, prize_label, xp_awarded, external_prize, claim_status)
    values (p_tid, s.user_id, s.rk, s.score, s.correct, s.seconds, pz->>'label', v_xp, coalesce((pz->>'external')::boolean, false),
      case when coalesce((pz->>'external')::boolean, false) then 'pending' else 'none' end)
    on conflict do nothing;
    if v_xp > 0 then update public.profiles set xp = xp + v_xp where id = s.user_id; end if;
    perform public._grant_achievements(s.user_id, array_remove(array['tourney_first',
      case when s.rk <= 3 then 'tourney_podium' end,
      case when s.rk = 1 and t.kind in ('daily', 'weekly', 'special') then 'tourney_champion' end], null));
  end loop;
  update public.tournaments set finalized_at = now() where id = p_tid;
end;
$$;

create or replace function public.list_tournaments()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  perform public._ensure_official();
  perform public._finalize_due();
  return jsonb_build_object(
    'now', now(),
    'official', (select coalesce(jsonb_agg(public._t_card(t.id, me) order by t.kind, t.ends_at), '[]'::jsonb) from public.tournaments t
      where t.kind in ('daily', 'weekly', 'special') and t.is_public and now() between t.starts_at and t.ends_at),
    'live', (select coalesce(jsonb_agg(public._t_card(t.id, me) order by t.ends_at), '[]'::jsonb) from (
      select * from public.tournaments where kind = 'community' and is_public and now() between starts_at and ends_at order by ends_at limit 30) t),
    'upcoming', (select coalesce(jsonb_agg(public._t_card(t.id, me) order by t.starts_at), '[]'::jsonb) from (
      select * from public.tournaments where is_public and starts_at > now() order by starts_at limit 20) t),
    'finished', (select coalesce(jsonb_agg(public._t_card(t.id, me) order by t.ends_at desc), '[]'::jsonb) from (
      select * from public.tournaments where is_public and ends_at < now() order by ends_at desc limit 12) t),
    'mine', (select coalesce(jsonb_agg(public._t_card(t.id, me) order by t.ends_at), '[]'::jsonb) from (
      select * from public.tournaments t2 where me is not null and t2.ends_at > now() - interval '1 day'
        and (t2.created_by = me or exists (select 1 from public.tournament_entries e where e.tournament_id = t2.id and e.user_id = me))
      order by t2.ends_at limit 20) t)
  );
end;
$$;

-- Who am I (role + permissions) — used by the site to show the admin panel.
create or replace function public.my_staff()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('role', public._my_role(), 'perms', (
    select coalesce(jsonb_agg(p), '[]'::jsonb) from unnest(array['dash', 'users.view', 'users.moderate', 'users.manage', 'staff', 'staff.admin',
      'content', 'tournaments', 'prizes', 'prizes.view', 'badges', 'rooms', 'settings', 'audit']) p where public._perm(p)));
$$;

-- ---------------------------------------------------------------------------
-- Dashboard
-- ---------------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._require('dash');
  return jsonb_build_object(
    'now', now(),
    'kpis', jsonb_build_object(
      'users', (select count(*) from public.profiles),
      'users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
      'users_prev_7d', (select count(*) from public.profiles where created_at between now() - interval '14 days' and now() - interval '7 days'),
      'active_today', (select count(distinct user_id) from public.play_sessions where user_id is not null and started_at > date_trunc('day', now())),
      'active_7d', (select count(distinct user_id) from public.play_sessions where user_id is not null and started_at > now() - interval '7 days'),
      'rounds_today', (select count(*) from public.play_sessions where status = 'finished' and finished_at > date_trunc('day', now())),
      'rounds_7d', (select count(*) from public.play_sessions where status = 'finished' and finished_at > now() - interval '7 days'),
      'guest_rounds_7d', (select count(*) from public.play_sessions where status = 'finished' and user_id is null and finished_at > now() - interval '7 days'),
      'rooms_live', (select count(*) from public.rooms where status in ('lobby', 'playing') and created_at > now() - interval '6 hours'),
      'rooms_7d', (select count(*) from public.rooms where status = 'finished' and finished_at > now() - interval '7 days'),
      'tournaments_live', (select count(*) from public.tournaments where now() between starts_at and ends_at),
      'prizes_pending', (select count(*) from public.tournament_results where claim_status = 'pending'),
      'banned', (select count(*) from public.profiles where banned_until > now()),
      'questions', (select count(*) from public.quiz_questions where active),
      'games_live', (select count(*) from public.games where status = 'live'),
      'xp_multiplier', public._xp_multiplier()
    ),
    'series', (select jsonb_agg(jsonb_build_object('day', d::date,
        'signups', (select count(*) from public.profiles p where p.created_at >= d and p.created_at < d + interval '1 day'),
        'rounds', (select count(*) from public.play_sessions s where s.status = 'finished' and s.finished_at >= d and s.finished_at < d + interval '1 day'),
        'players', (select count(distinct s.user_id) from public.play_sessions s where s.user_id is not null and s.started_at >= d and s.started_at < d + interval '1 day'),
        'rooms', (select count(*) from public.rooms r where r.status = 'finished' and r.finished_at >= d and r.finished_at < d + interval '1 day')
      ) order by d)
      from generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') d),
    'top_games', (select coalesce(jsonb_agg(x order by (x->>'rounds')::int desc), '[]'::jsonb) from (
      select jsonb_build_object('slug', game_slug, 'rounds', count(*), 'players', count(distinct user_id),
        'win_rate', round(100.0 * count(*) filter (where won) / greatest(count(*), 1))) as x
      from public.play_sessions where status = 'finished' and finished_at > now() - interval '30 days' group by game_slug order by count(*) desc limit 8) t),
    'recent_users', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'created_at', p.created_at, 'level', public.level_for_xp(p.xp)) order by p.created_at desc), '[]'::jsonb)
      from (select * from public.profiles order by created_at desc limit 8) p),
    'recent_audit', (select coalesce(jsonb_agg(jsonb_build_object('action', a.action, 'target', a.target, 'at', a.created_at, 'actor', pr.username) order by a.created_at desc), '[]'::jsonb)
      from (select * from public.admin_audit order by created_at desc limit 8) a left join public.profiles pr on pr.id = a.actor)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_users(p_q text default '', p_role text default null, p_status text default null, p_sort text default 'new', p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_rows jsonb;
  v_total int;
begin
  perform public._require('users.view');
  with base as (
    select p.*, u.email, u.last_sign_in_at, u.email_confirmed_at,
      (select count(*) from public.play_sessions s where s.user_id = p.id and s.status = 'finished') as games
    from public.profiles p join auth.users u on u.id = p.id
    where (coalesce(p_q, '') = '' or p.username ilike '%' || p_q || '%' or u.email ilike '%' || p_q || '%')
      and (p_role is null or p.role = p_role)
      and (p_status is null or (p_status = 'banned' and p.banned_until > now()) or (p_status = 'staff' and p.role <> 'user')
           or (p_status = 'unverified' and u.email_confirmed_at is null))
  )
  select (select count(*) from base),
    (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'username', b.username, 'email', b.email, 'role', b.role, 'xp', b.xp,
        'level', public.level_for_xp(b.xp), 'games', b.games, 'created_at', b.created_at, 'last_sign_in_at', b.last_sign_in_at,
        'last_played_on', b.last_played_on, 'verified', b.email_confirmed_at is not null, 'banned_until', b.banned_until, 'ban_reason', b.ban_reason)), '[]'::jsonb)
     from (select * from base order by
        case when p_sort = 'xp' then -base.xp end,
        case when p_sort = 'games' then -base.games end,
        case when p_sort = 'active' then base.last_sign_in_at end desc nulls last,
        base.created_at desc
      limit least(coalesce(p_limit, 50), 200) offset greatest(coalesce(p_offset, 0), 0)) b)
  into v_total, v_rows;
  return jsonb_build_object('total', v_total, 'rows', v_rows);
end;
$$;

create or replace function public.admin_get_user(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  p public.profiles;
  u record;
begin
  perform public._require('users.view');
  select * into p from public.profiles where id = p_id;
  if not found then raise exception 'not_found'; end if;
  select email, created_at, last_sign_in_at, email_confirmed_at into u from auth.users where id = p_id;
  return jsonb_build_object(
    'id', p.id, 'username', p.username, 'email', u.email, 'role', p.role, 'xp', p.xp, 'level', public.level_for_xp(p.xp),
    'created_at', p.created_at, 'last_sign_in_at', u.last_sign_in_at, 'verified', u.email_confirmed_at is not null,
    'birth_date', p.birth_date, 'age', public.age_of(p.id), 'banned_until', p.banned_until, 'ban_reason', p.ban_reason,
    'day_streak', p.day_streak, 'best_day_streak', p.best_day_streak, 'last_played_on', p.last_played_on,
    'interests', p.interests, 'countries', p.countries, 'showcase', p.showcase,
    'stats', (select jsonb_build_object('games', count(*), 'wins', count(*) filter (where won), 'correct', coalesce(sum(correct), 0), 'answered', coalesce(sum(total), 0))
      from public.play_sessions where user_id = p.id and status = 'finished'),
    'achievements', (select coalesce(jsonb_agg(jsonb_build_object('id', achievement_id, 'at', unlocked_at) order by unlocked_at desc), '[]'::jsonb) from public.user_achievements where user_id = p.id),
    'plays', (select coalesce(jsonb_agg(x order by x->>'finished_at' desc), '[]'::jsonb) from (
      select jsonb_build_object('id', s.id, 'game_slug', s.game_slug, 'correct', s.correct, 'total', s.total, 'won', s.won, 'xp', s.xp_earned,
        'finished_at', s.finished_at, 'tournament', s.tournament_id is not null) as x
      from public.play_sessions s where s.user_id = p.id and s.status = 'finished' order by s.finished_at desc limit 20) t),
    'tournaments', (select coalesce(jsonb_agg(jsonb_build_object('title', t.title, 'code', t.code, 'rank', r.rank, 'prize', r.prize_label, 'claim', r.claim_status) order by t.ends_at desc), '[]'::jsonb)
      from public.tournament_results r join public.tournaments t on t.id = r.tournament_id where r.user_id = p.id),
    'friends', (select count(*) from public.friendships f where f.status = 'accepted' and p.id in (f.requester, f.addressee)),
    'audit', (select coalesce(jsonb_agg(jsonb_build_object('action', a.action, 'at', a.created_at, 'actor', pr.username, 'details', a.details) order by a.created_at desc), '[]'::jsonb)
      from (select * from public.admin_audit where target = p.id::text order by created_at desc limit 20) a left join public.profiles pr on pr.id = a.actor)
  );
end;
$$;

-- p_action: ban {until, reason} | unban | rename {username} | xp {delta, reason} | role {role} | grant_badge {id} | revoke_badge {id} | reset_birth_date
create or replace function public.admin_user_action(p_id uuid, p_action text, p_data jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare
  target_role text;
  new_role text;
begin
  select role into target_role from public.profiles where id = p_id;
  if target_role is null then raise exception 'not_found'; end if;
  -- Nobody below owner can act on owners; only owners can act on admins
  if target_role = 'owner' and public._my_role() <> 'owner' then raise exception 'forbidden'; end if;
  if target_role = 'admin' and public._my_role() not in ('owner') and p_action <> 'grant_badge' then raise exception 'forbidden'; end if;

  if p_action = 'ban' then
    perform public._require('users.moderate');
    if p_id = auth.uid() then raise exception 'self'; end if;
    update public.profiles set banned_until = coalesce((p_data->>'until')::timestamptz, 'infinity'::timestamptz), ban_reason = left(p_data->>'reason', 300) where id = p_id;
    update public.room_players set left_at = now() where user_id = p_id and left_at is null;
  elsif p_action = 'unban' then
    perform public._require('users.moderate');
    update public.profiles set banned_until = null, ban_reason = null where id = p_id;
  elsif p_action = 'rename' then
    perform public._require('users.moderate');
    if (p_data->>'username') !~ '^[A-Za-z0-9_.]{3,20}$' then raise exception 'invalid_username'; end if;
    if exists (select 1 from public.profiles where lower(username) = lower(p_data->>'username') and id <> p_id) then raise exception 'username_taken'; end if;
    update public.profiles set username = p_data->>'username' where id = p_id;
  elsif p_action = 'xp' then
    perform public._require('users.manage');
    update public.profiles set xp = greatest(0, xp + least(greatest((p_data->>'delta')::int, -1000000), 1000000)) where id = p_id;
  elsif p_action = 'role' then
    new_role := p_data->>'role';
    if new_role not in ('user', 'moderator', 'editor', 'admin', 'owner') then raise exception 'bad_role'; end if;
    perform public._require(case when new_role in ('admin', 'owner') or target_role in ('admin', 'owner') then 'staff.admin' else 'staff' end);
    if p_id = auth.uid() and new_role <> 'owner' and (select count(*) from public.profiles where role = 'owner') <= 1 then raise exception 'last_owner'; end if;
    update public.profiles set role = new_role where id = p_id;
  elsif p_action = 'grant_badge' then
    perform public._require('badges');
    insert into public.user_achievements (user_id, achievement_id) values (p_id, p_data->>'id') on conflict do nothing;
  elsif p_action = 'revoke_badge' then
    perform public._require('users.manage');
    delete from public.user_achievements where user_id = p_id and achievement_id = p_data->>'id';
  elsif p_action = 'reset_birth_date' then
    perform public._require('users.manage');
    update public.profiles set birth_date = null where id = p_id;
  else
    raise exception 'bad_action';
  end if;
  perform public._audit('user.' || p_action, p_id::text, coalesce(p_data, '{}'));
end;
$$;

-- ---------------------------------------------------------------------------
-- Catalog: games, categories, questions, badges
-- ---------------------------------------------------------------------------
create or replace function public.admin_catalog()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._require('dash');
  return jsonb_build_object(
    'games', (select coalesce(jsonb_agg(to_jsonb(g) || jsonb_build_object(
        'question_count', (select count(*) from public.quiz_questions q where q.game_slug = g.slug and q.active),
        'true_count', (select count(*) from public.quiz_questions q where q.game_slug = g.slug and q.active and q.answer),
        'rounds_30d', (select count(*) from public.play_sessions s where s.game_slug = g.slug and s.status = 'finished' and s.finished_at > now() - interval '30 days'))
      order by g.sort, g.title), '[]'::jsonb) from public.games g),
    'categories', (select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object('games', (select count(*) from public.games g where c.id = any(g.categories))) order by c.sort, c.name), '[]'::jsonb) from public.categories c),
    'badges', (select coalesce(jsonb_agg(to_jsonb(b) || jsonb_build_object('holders', (select count(*) from public.user_achievements a where a.achievement_id = b.id)) order by b.created_at desc), '[]'::jsonb) from public.custom_badges b),
    'orphan_questions', (select coalesce(jsonb_agg(distinct q.game_slug), '[]'::jsonb) from public.quiz_questions q where not exists (select 1 from public.games g where g.slug = q.game_slug))
  );
end;
$$;

create or replace function public.admin_upsert_game(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_slug text := lower(trim(p->>'slug'));
begin
  perform public._require('content');
  if v_slug !~ '^[a-z0-9-]{2,60}$' then raise exception 'bad_slug'; end if;
  if length(trim(coalesce(p->>'title', ''))) < 2 then raise exception 'bad_title'; end if;
  insert into public.games (slug, title, tagline, emoji, gradient, categories, countries, status, featured, difficulty, minutes, questions, age_rating, prompt, yes_label, no_label, sort, updated_at)
  values (v_slug, trim(p->>'title'), coalesce(p->>'tagline', ''), coalesce(nullif(p->>'emoji', ''), '🎯'),
    coalesce((select array_agg(x) from jsonb_array_elements_text(p->'gradient') x), array['#8b5cf6', '#22d3ee']),
    coalesce((select array_agg(x) from jsonb_array_elements_text(p->'categories') x), '{}'),
    (select array_agg(x) from jsonb_array_elements_text(case when jsonb_typeof(p->'countries') = 'array' then p->'countries' else '[]'::jsonb end) x),
    coalesce(p->>'status', 'soon'), coalesce((p->>'featured')::boolean, false), coalesce(p->>'difficulty', 'Medium'),
    coalesce((p->>'minutes')::int, 4), least(greatest(coalesce((p->>'questions')::int, 20), 5), 50), coalesce((p->>'age_rating')::int, 0),
    coalesce(nullif(p->>'prompt', ''), 'True or false?'), coalesce(nullif(p->>'yes_label', ''), 'True'), coalesce(nullif(p->>'no_label', ''), 'False'),
    coalesce((p->>'sort')::int, 100), now())
  on conflict (slug) do update set title = excluded.title, tagline = excluded.tagline, emoji = excluded.emoji, gradient = excluded.gradient,
    categories = excluded.categories, countries = excluded.countries, status = excluded.status, featured = excluded.featured,
    difficulty = excluded.difficulty, minutes = excluded.minutes, questions = excluded.questions, age_rating = excluded.age_rating,
    prompt = excluded.prompt, yes_label = excluded.yes_label, no_label = excluded.no_label, sort = excluded.sort, updated_at = now();
  if coalesce((p->>'featured')::boolean, false) then update public.games set featured = false where slug <> v_slug; end if;
  insert into public.game_settings (game_slug, min_age) values (v_slug, case when coalesce((p->>'age_rating')::int, 0) >= 18 then 18 else 0 end)
    on conflict (game_slug) do update set min_age = excluded.min_age;
  perform public._audit('game.save', v_slug, p);
end;
$$;

create or replace function public.admin_delete_game(p_slug text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._require('content');
  if exists (select 1 from public.play_sessions where game_slug = p_slug) then
    update public.games set status = 'hidden', updated_at = now() where slug = p_slug;  -- keep history intact
  else
    delete from public.quiz_questions where game_slug = p_slug;
    delete from public.games where slug = p_slug;
  end if;
  perform public._audit('game.delete', p_slug, '{}');
end;
$$;

create or replace function public.admin_upsert_category(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_id text := lower(trim(p->>'id'));
begin
  perform public._require('content');
  if v_id !~ '^[a-z0-9-]{2,40}$' then raise exception 'bad_id'; end if;
  insert into public.categories (id, name, emoji, grp, color, blurb, sort, visible)
  values (v_id, trim(p->>'name'), coalesce(nullif(p->>'emoji', ''), '✨'), coalesce(p->>'grp', 'knowledge'), coalesce(p->>'color', '#a78bfa'),
    coalesce(p->>'blurb', ''), coalesce((p->>'sort')::int, 100), coalesce((p->>'visible')::boolean, true))
  on conflict (id) do update set name = excluded.name, emoji = excluded.emoji, grp = excluded.grp, color = excluded.color,
    blurb = excluded.blurb, sort = excluded.sort, visible = excluded.visible;
  perform public._audit('category.save', v_id, p);
end;
$$;

create or replace function public.admin_delete_category(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._require('content');
  update public.games set categories = array_remove(categories, p_id) where p_id = any(categories);
  delete from public.categories where id = p_id;
  perform public._audit('category.delete', p_id, '{}');
end;
$$;

create or replace function public.admin_list_questions(p_game text, p_q text default '', p_active boolean default null, p_limit int default 100, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._require('content');
  return jsonb_build_object(
    'total', (select count(*) from public.quiz_questions where game_slug = p_game and (coalesce(p_q, '') = '' or item ilike '%' || p_q || '%' or fact ilike '%' || p_q || '%') and (p_active is null or active = p_active)),
    'rows', (select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'item', q.item, 'type', q.qtype, 'emoji', q.emoji, 'sprite', q.sprite, 'answer', q.answer, 'fact', q.fact, 'active', q.active,
        'asked', (select count(*) from public.play_sessions s where q.id = any(s.question_ids) and s.status = 'finished'))
      order by q.id desc), '[]'::jsonb)
      from (select * from public.quiz_questions where game_slug = p_game and (coalesce(p_q, '') = '' or item ilike '%' || p_q || '%' or fact ilike '%' || p_q || '%') and (p_active is null or active = p_active)
        order by id desc limit least(coalesce(p_limit, 100), 500) offset greatest(coalesce(p_offset, 0), 0)) q)
  );
end;
$$;

create or replace function public.admin_upsert_question(p jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_id bigint;
begin
  perform public._require('content');
  if length(trim(coalesce(p->>'item', ''))) < 1 then raise exception 'bad_item'; end if;
  if (p->>'id') is not null then
    update public.quiz_questions set item = trim(p->>'item'), qtype = coalesce(p->>'type', qtype), emoji = coalesce(p->>'emoji', emoji),
      answer = (p->>'answer')::boolean, fact = coalesce(p->>'fact', ''), active = coalesce((p->>'active')::boolean, active)
      where id = (p->>'id')::bigint returning id into v_id;
  else
    insert into public.quiz_questions (game_slug, item, qtype, emoji, answer, fact, active)
    values (p->>'game_slug', trim(p->>'item'), coalesce(p->>'type', 'General'), coalesce(p->>'emoji', '❓'), (p->>'answer')::boolean, coalesce(p->>'fact', ''), coalesce((p->>'active')::boolean, true))
    returning id into v_id;
  end if;
  perform public._audit('question.save', v_id::text, p);
  return v_id;
end;
$$;

create or replace function public.admin_delete_question(p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._require('content');
  -- Questions used in finished rounds are deactivated, not deleted, so history stays readable
  if exists (select 1 from public.play_sessions where p_id = any(question_ids)) then
    update public.quiz_questions set active = false where id = p_id;
  else
    delete from public.quiz_questions where id = p_id;
  end if;
  perform public._audit('question.delete', p_id::text, '{}');
end;
$$;

-- rows: [{item, type, emoji, answer, fact}]. Existing items (same text) are updated.
create or replace function public.admin_import_questions(p_game text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  n_new int := 0;
  n_upd int := 0;
begin
  perform public._require('content');
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 2000 then raise exception 'bad_rows'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    continue when length(trim(coalesce(r->>'item', ''))) = 0 or (r->>'answer') is null;
    update public.quiz_questions set qtype = coalesce(r->>'type', qtype), emoji = coalesce(r->>'emoji', emoji), answer = (r->>'answer')::boolean,
      fact = coalesce(r->>'fact', fact), active = true
      where game_slug = p_game and item = trim(r->>'item');
    if found then n_upd := n_upd + 1;
    else
      insert into public.quiz_questions (game_slug, item, qtype, emoji, answer, fact, active)
      values (p_game, trim(r->>'item'), coalesce(r->>'type', 'General'), coalesce(r->>'emoji', '❓'), (r->>'answer')::boolean, coalesce(r->>'fact', ''), true);
      n_new := n_new + 1;
    end if;
  end loop;
  perform public._audit('question.import', p_game, jsonb_build_object('new', n_new, 'updated', n_upd));
  return jsonb_build_object('new', n_new, 'updated', n_upd);
end;
$$;

create or replace function public.admin_upsert_badge(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_id text := 'c_' || regexp_replace(lower(coalesce(p->>'id', p->>'name')), '^c_|[^a-z0-9_]+', '', 'g');
begin
  perform public._require('badges');
  if length(v_id) < 4 then raise exception 'bad_id'; end if;
  insert into public.custom_badges (id, emoji, name, description, tier) values (v_id, coalesce(nullif(p->>'emoji', ''), '🏅'), trim(p->>'name'), coalesce(p->>'description', ''), coalesce(p->>'tier', 'gold'))
  on conflict (id) do update set emoji = excluded.emoji, name = excluded.name, description = excluded.description, tier = excluded.tier;
  perform public._audit('badge.save', v_id, p);
end;
$$;

create or replace function public.admin_delete_badge(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._require('badges');
  delete from public.user_achievements where achievement_id = p_id and p_id like 'c\_%';
  delete from public.custom_badges where id = p_id;
  perform public._audit('badge.delete', p_id, '{}');
end;
$$;

-- ---------------------------------------------------------------------------
-- Tournaments, prizes, rooms
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_tournaments(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._require('tournaments');
  return (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object(
      'creator', (select username from public.profiles where id = t.created_by),
      'players', (select count(*) from public.tournament_entries e where e.tournament_id = t.id),
      'attempts', (select count(*) from public.play_sessions s where s.tournament_id = t.id)) order by t.starts_at), '[]'::jsonb)
    from public.tournaments t where t.ends_at >= p_from and t.starts_at < p_to);
end;
$$;

create or replace function public.admin_upsert_tournament(p jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_code text;
  v_id uuid := (p->>'id')::uuid;
  v_kind text := coalesce(p->>'kind', 'special');
begin
  perform public._require('tournaments');
  if v_kind not in ('daily', 'weekly', 'special', 'community') then raise exception 'bad_kind'; end if;
  if (p->>'ends_at')::timestamptz <= (p->>'starts_at')::timestamptz then raise exception 'bad_dates'; end if;
  if v_id is null then
    v_code := public._t_code();
    insert into public.tournaments (code, kind, title, description, game_slug, created_by, starts_at, ends_at, question_count, max_attempts, min_level, is_public, prizes, terms)
    values (v_code, v_kind, trim(p->>'title'), coalesce(p->>'description', ''), p->>'game_slug', case when v_kind = 'community' then auth.uid() end,
      (p->>'starts_at')::timestamptz, (p->>'ends_at')::timestamptz, coalesce((p->>'question_count')::int, 20), coalesce((p->>'max_attempts')::int, 3),
      coalesce((p->>'min_level')::int, 1), coalesce((p->>'is_public')::boolean, true), coalesce(p->'prizes', '[]'::jsonb), coalesce(p->>'terms', ''))
    returning id into v_id;
  else
    update public.tournaments set kind = v_kind, title = trim(p->>'title'), description = coalesce(p->>'description', ''), game_slug = p->>'game_slug',
      starts_at = (p->>'starts_at')::timestamptz, ends_at = (p->>'ends_at')::timestamptz, question_count = coalesce((p->>'question_count')::int, question_count),
      max_attempts = coalesce((p->>'max_attempts')::int, max_attempts), min_level = coalesce((p->>'min_level')::int, min_level),
      is_public = coalesce((p->>'is_public')::boolean, is_public), prizes = coalesce(p->'prizes', prizes), terms = coalesce(p->>'terms', terms)
    where id = v_id and finalized_at is null
    returning code into v_code;
    if v_code is null then raise exception 'locked'; end if;
  end if;
  perform public._audit('tournament.save', v_id::text, p);
  return coalesce(v_code, (select code from public.tournaments where id = v_id));
end;
$$;

create or replace function public.admin_tournament_action(p_id uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._require('tournaments');
  if p_action = 'delete' then
    if exists (select 1 from public.play_sessions where tournament_id = p_id) then raise exception 'has_attempts'; end if;
    delete from public.tournaments where id = p_id;
  elsif p_action = 'end_now' then
    update public.tournaments set ends_at = greatest(starts_at + interval '1 minute', now() - interval '16 minutes') where id = p_id and finalized_at is null;
    perform public._finalize_tournament(p_id);
  elsif p_action = 'hide' then
    update public.tournaments set is_public = false where id = p_id;
  elsif p_action = 'show' then
    update public.tournaments set is_public = true where id = p_id;
  else
    raise exception 'bad_action';
  end if;
  perform public._audit('tournament.' || p_action, p_id::text, '{}');
end;
$$;

create or replace function public.admin_list_prizes(p_status text default 'pending')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._require('prizes.view');
  return (select coalesce(jsonb_agg(jsonb_build_object('tournament_id', t.id, 'code', t.code, 'title', t.title, 'ended', t.ends_at,
      'user_id', p.id, 'username', p.username, 'email', case when public._perm('prizes') then u.email end, 'rank', r.rank, 'prize', r.prize_label,
      'status', r.claim_status, 'score', r.score) order by t.ends_at desc), '[]'::jsonb)
    from public.tournament_results r join public.tournaments t on t.id = r.tournament_id join public.profiles p on p.id = r.user_id join auth.users u on u.id = r.user_id
    where r.external_prize and (p_status is null or r.claim_status = p_status));
end;
$$;

create or replace function public.admin_set_prize(p_tid uuid, p_uid uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._require('prizes');
  if p_status not in ('pending', 'sent') then raise exception 'bad_status'; end if;
  update public.tournament_results set claim_status = p_status where tournament_id = p_tid and user_id = p_uid and external_prize;
  perform public._audit('prize.' || p_status, p_uid::text, jsonb_build_object('tournament', p_tid));
end;
$$;

create or replace function public.admin_list_rooms()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._require('rooms');
  return (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'code', r.code, 'mode', r.mode, 'status', r.status, 'game_slug', r.game_slug,
      'is_public', r.is_public, 'created_at', r.created_at, 'host', (select username from public.profiles where id = r.host),
      'players', (select coalesce(jsonb_agg(pp.username), '[]'::jsonb) from public.room_players rp join public.profiles pp on pp.id = rp.user_id where rp.room_id = r.id and rp.left_at is null),
      'current_index', r.current_index, 'total', coalesce(array_length(r.question_ids, 1), 0)) order by r.created_at desc), '[]'::jsonb)
    from public.rooms r where r.created_at > now() - interval '24 hours');
end;
$$;

create or replace function public.admin_close_room(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._require('rooms');
  update public.rooms set status = 'closed', finished_at = coalesce(finished_at, now()) where id = p_id and status <> 'finished';
  perform public._audit('room.close', p_id::text, '{}');
end;
$$;

-- ---------------------------------------------------------------------------
-- Settings and audit
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_settings()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._require('dash');
  return (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from public.site_settings);
end;
$$;

create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._require(case when p_key = 'tournament_templates' then 'tournaments' else 'settings' end);
  if p_key not in ('announcement', 'features', 'maintenance', 'prize', 'xp_event', 'home', 'tournament_templates') then raise exception 'bad_key'; end if;
  insert into public.site_settings (key, value, updated_at, updated_by) values (p_key, p_value, now(), auth.uid())
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  perform public._audit('settings.' || p_key, p_key, p_value);
end;
$$;

create or replace function public.admin_audit_log(p_limit int default 100, p_offset int default 0, p_q text default '')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._require('audit');
  return (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'action', a.action, 'target', a.target, 'details', a.details, 'at', a.created_at,
      'actor', pr.username, 'target_user', tu.username) order by a.id desc), '[]'::jsonb)
    from (select * from public.admin_audit where coalesce(p_q, '') = '' or action ilike '%' || p_q || '%' or target ilike '%' || p_q || '%'
      order by id desc limit least(coalesce(p_limit, 100), 500) offset greatest(coalesce(p_offset, 0), 0)) a
    left join public.profiles pr on pr.id = a.actor
    left join public.profiles tu on tu.id::text = a.target);
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array['my_staff()', 'admin_overview()', 'admin_list_users(text, text, text, text, int, int)', 'admin_get_user(uuid)',
    'admin_user_action(uuid, text, jsonb)', 'admin_catalog()', 'admin_upsert_game(jsonb)', 'admin_delete_game(text)', 'admin_upsert_category(jsonb)',
    'admin_delete_category(text)', 'admin_list_questions(text, text, boolean, int, int)', 'admin_upsert_question(jsonb)', 'admin_delete_question(bigint)',
    'admin_import_questions(text, jsonb)', 'admin_upsert_badge(jsonb)', 'admin_delete_badge(text)', 'admin_list_tournaments(timestamptz, timestamptz)',
    'admin_upsert_tournament(jsonb)', 'admin_tournament_action(uuid, text)', 'admin_list_prizes(text)', 'admin_set_prize(uuid, uuid, text)',
    'admin_list_rooms()', 'admin_close_room(uuid)', 'admin_get_settings()', 'admin_set_setting(text, jsonb)', 'admin_audit_log(int, int, text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
