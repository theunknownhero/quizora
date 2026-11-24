-- Question types: true/false, multiple choice, multi-select, type the answer, number guess, put in order.
-- Run after 007c_admin_seed.sql. Safe to re-run. Answers are always checked on the server.
--
-- Storage per kind (quiz_questions):
--   truefalse  answer boolean
--   choice     options ["A","B","C","D"], solution {"index": 2}
--   multi      options [...],             solution {"indices": [0, 2]}
--   text       solution {"accepted": ["Budapest", "Pest-Buda"]}
--   number     solution {"value": 1974, "tolerance": 2, "unit": "", "min": 1800, "max": 2025, "step": 1}
--   order      options in the CORRECT order (players get them shuffled)
-- Players receive options as a shuffled list of {i, t} and answer with the i values.

alter table public.quiz_questions alter column answer drop not null;
alter table public.quiz_questions add column if not exists kind text not null default 'truefalse';
alter table public.quiz_questions add column if not exists prompt text;
alter table public.quiz_questions add column if not exists options jsonb;
alter table public.quiz_questions add column if not exists solution jsonb;
alter table public.quiz_questions add column if not exists image_url text;
do $$ begin
  alter table public.quiz_questions add constraint quiz_questions_kind_check check (kind in ('truefalse', 'choice', 'multi', 'text', 'number', 'order'));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public._norm(t text)
returns text language sql immutable set search_path = '' as $$
  select regexp_replace(lower(coalesce(t, '')), '[^[:alnum:]]+', '', 'g');
$$;

-- What a player is allowed to see (no answers)
create or replace function public._q_public(q public.quiz_questions)
returns jsonb language sql volatile set search_path = '' as $$
  select jsonb_build_object('id', q.id, 'item', q.item, 'type', q.qtype, 'emoji', q.emoji, 'sprite', q.sprite,
    'kind', q.kind, 'prompt', q.prompt, 'image', q.image_url,
    'options', case when q.kind in ('choice', 'multi', 'order') then
      (select jsonb_agg(jsonb_build_object('i', o.ord - 1, 't', o.v) order by random()) from jsonb_array_elements_text(q.options) with ordinality o(v, ord)) end,
    'pick', case when q.kind = 'multi' then jsonb_array_length(q.solution->'indices') end,
    'number', case when q.kind = 'number' then jsonb_build_object('min', q.solution->'min', 'max', q.solution->'max', 'step', coalesce(q.solution->'step', '1'::jsonb), 'unit', q.solution->'unit') end);
$$;

create or replace function public._q_check(q public.quiz_questions, v jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
  if v is null or v = 'null'::jsonb then return false; end if;
  case q.kind
    when 'truefalse' then return v = to_jsonb(q.answer);
    when 'choice' then return (v #>> '{}') = (q.solution->>'index');
    when 'multi' then
      return jsonb_typeof(v) = 'array' and
        (select coalesce(array_agg(x::int order by x::int), '{}') from jsonb_array_elements_text(v) x) =
        (select coalesce(array_agg(x::int order by x::int), '{}') from jsonb_array_elements_text(q.solution->'indices') x);
    when 'text' then
      return public._norm(v #>> '{}') <> '' and exists (select 1 from jsonb_array_elements_text(q.solution->'accepted') a where public._norm(a) = public._norm(v #>> '{}'));
    when 'number' then
      return abs((v #>> '{}')::numeric - (q.solution->>'value')::numeric) <= coalesce((q.solution->>'tolerance')::numeric, 0);
    when 'order' then
      return jsonb_typeof(v) = 'array' and jsonb_array_length(v) = jsonb_array_length(q.options) and
        (select array_agg(x::int order by ord) from jsonb_array_elements_text(v) with ordinality t(x, ord)) =
        (select array_agg(g) from generate_series(0, jsonb_array_length(q.options) - 1) g);
    else return false;
  end case;
exception when others then
  return false;
end;
$$;

-- The correct answer as text (for reveals and history); null for true/false (the site shows its own labels)
create or replace function public._q_answer_text(q public.quiz_questions)
returns text language sql immutable set search_path = '' as $$
  select case q.kind
    when 'choice' then q.options->>((q.solution->>'index')::int)
    when 'multi' then (select string_agg(q.options->>(x::int), ', ' order by x::int) from jsonb_array_elements_text(q.solution->'indices') x)
    when 'text' then q.solution->'accepted'->>0
    when 'number' then trim(both ' ' from (q.solution->>'value') || ' ' || coalesce(q.solution->>'unit', ''))
    when 'order' then (select string_agg(v, ' → ' order by ord) from jsonb_array_elements_text(q.options) with ordinality o(v, ord))
    else null end;
$$;

-- What the player answered, as text
create or replace function public._q_given_text(q public.quiz_questions, v jsonb)
returns text language plpgsql immutable set search_path = '' as $$
begin
  return case q.kind
    when 'choice' then q.options->>((v #>> '{}')::int)
    when 'multi' then (select string_agg(q.options->>(x::int), ', ' order by x::int) from jsonb_array_elements_text(v) x)
    when 'order' then (select string_agg(q.options->>(x::int), ' → ' order by ord) from jsonb_array_elements_text(v) with ordinality t(x, ord))
    when 'truefalse' then null
    else left(v #>> '{}', 120) end;
exception when others then
  return null;
end;
$$;

-- Random questions for a round: true/false answers stay balanced, other kinds mixed in evenly.
create or replace function public._pick_questions(p_game text, p_n int)
returns bigint[] language sql volatile security definer set search_path = '' as $$
  select array_agg(id order by random()) from (
    select id from (
      select id, row_number() over (partition by case when kind = 'truefalse' then 'tf' || answer::text else kind end order by random()) as rn
      from public.quiz_questions where game_slug = p_game and active
    ) x order by rn, random() limit p_n
  ) y;
$$;

revoke all on function public._norm(text) from public, anon, authenticated;
revoke all on function public._q_public(public.quiz_questions) from public, anon, authenticated;
revoke all on function public._q_check(public.quiz_questions, jsonb) from public, anon, authenticated;
revoke all on function public._q_answer_text(public.quiz_questions) from public, anon, authenticated;
revoke all on function public._q_given_text(public.quiz_questions, jsonb) from public, anon, authenticated;
revoke all on function public._pick_questions(text, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Solo rounds
-- ---------------------------------------------------------------------------
create or replace function public.start_session(p_game text, p_count int default 20, p_guest_token text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_token text := p_guest_token;
  v_n int := least(greatest(coalesce(p_count, 20), 5), 50);
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

  v_ids := public._pick_questions(p_game, v_n);
  if v_ids is null or array_length(v_ids, 1) < 3 then raise exception 'no_questions'; end if;

  insert into public.play_sessions (user_id, guest_token, game_slug, question_ids, total)
  values (v_uid, case when v_uid is null then v_token end, p_game, v_ids, array_length(v_ids, 1))
  returning id into v_sid;

  return jsonb_build_object(
    'session_id', v_sid,
    'guest_token', case when v_uid is null then v_token end,
    'questions', (select jsonb_agg(public._q_public(q) order by o.ord) from unnest(v_ids) with ordinality o(qid, ord) join public.quiz_questions q on q.id = o.qid)
  );
end;
$$;

-- Any question type. p_value: true/false, option i, [i, i], "text", 1974, [i, i, i]
create or replace function public.submit_answer_v2(p_session uuid, p_index int, p_value jsonb, p_guest_token text default null)
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
  v_ok := public._q_check(v_q, p_value);

  update public.play_sessions set
    answers = answers || jsonb_build_array(jsonb_build_object('q', v_q.id, 'item', v_q.item, 'type', v_q.qtype, 'kind', v_q.kind,
      'choice', case when v_q.kind = 'truefalse' then p_value end, 'answer', case when v_q.kind = 'truefalse' then to_jsonb(v_q.answer) else to_jsonb(public._q_answer_text(v_q)) end,
      'given', public._q_given_text(v_q, p_value), 'correct', v_ok, 'ms', v_ms)),
    correct = correct + case when v_ok then 1 else 0 end,
    streak = case when v_ok then streak + 1 else 0 end,
    best_streak = greatest(best_streak, case when v_ok then streak + 1 else 0 end),
    last_answer_at = now()
  where id = p_session;

  return jsonb_build_object('correct', v_ok, 'answer', v_q.answer, 'answer_text', public._q_answer_text(v_q),
    'solution', case when v_q.kind = 'choice' then v_q.solution->'index' when v_q.kind = 'multi' then v_q.solution->'indices' end,
    'fact', v_q.fact, 'index', p_index);
end;
$$;

-- The original true/false call (used by Hungary or Not) now goes through the same checker
create or replace function public.submit_answer(p_session uuid, p_index int, p_choice boolean, p_guest_token text default null)
returns jsonb language sql security definer set search_path = '' as $$
  select public.submit_answer_v2(p_session, p_index, to_jsonb(p_choice), p_guest_token);
$$;

-- ---------------------------------------------------------------------------
-- Tournaments and multiplayer rooms
-- ---------------------------------------------------------------------------
create or replace function public.start_tournament_round(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  t public.tournaments;
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
  v_ids := public._pick_questions(t.game_slug, t.question_count);
  if v_ids is null or array_length(v_ids, 1) < 3 then raise exception 'no_questions'; end if;
  insert into public.play_sessions (user_id, game_slug, question_ids, total, tournament_id)
  values (me, t.game_slug, v_ids, array_length(v_ids, 1), t.id) returning id into v_sid;
  return jsonb_build_object('session_id', v_sid, 'guest_token', null,
    'tournament', jsonb_build_object('code', t.code, 'title', t.title, 'kind', t.kind),
    'questions', (select jsonb_agg(public._q_public(q) order by o.ord) from unnest(v_ids) with ordinality o(qid, ord) join public.quiz_questions q on q.id = o.qid));
end;
$$;

-- Room questions: options are shuffled once per room (stored) so every player sees the same order
alter table public.rooms add column if not exists question_payload jsonb;

create or replace function public._start_room(p_room uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.rooms;
  v_ids bigint[];
begin
  select * into r from public.rooms where id = p_room for update;
  if r.status <> 'lobby' then raise exception 'already_started'; end if;
  v_ids := public._pick_questions(r.game_slug, (r.settings->>'count')::int);
  if v_ids is null or array_length(v_ids, 1) < 3 then raise exception 'no_questions'; end if;
  delete from public.room_players where room_id = p_room and left_at is not null;
  update public.room_players set score = 0, correct = 0, streak = 0, best_streak = 0, answers = '{}', final_rank = null, xp_earned = 0 where room_id = p_room;
  update public.rooms set status = 'playing', question_ids = v_ids, current_index = 0, question_payload = null,
    question_started_at = now() + interval '4 seconds', started_at = now(), finished_at = null where id = p_room;
end;
$$;


create or replace function public._room_question(r public.rooms)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v jsonb;
begin
  v := r.question_payload -> r.current_index::text;
  if v is null then
    select public._q_public(q) into v from public.quiz_questions q where q.id = r.question_ids[r.current_index + 1];
    update public.rooms set question_payload = coalesce(question_payload, '{}'::jsonb) || jsonb_build_object(r.current_index::text, v) where id = r.id;
  end if;
  return v || jsonb_build_object('index', r.current_index);
end;
$$;
revoke all on function public._room_question(public.rooms) from public, anon, authenticated;

create or replace function public.get_room(p_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
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
    v_q := public._room_question(r);
  end if;
  v_li := case when r.status = 'finished' then least(r.current_index, v_total - 1) else r.current_index - 1 end;
  if r.status in ('playing', 'finished') and v_li >= 0 and v_total > 0 then
    select jsonb_build_object('index', v_li, 'item', q.item, 'emoji', q.emoji, 'sprite', q.sprite, 'kind', q.kind, 'prompt', q.prompt,
        'image', q.image_url, 'answer', q.answer, 'answer_text', public._q_answer_text(q), 'fact', q.fact)
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

create or replace function public.submit_room_answer_v2(p_room uuid, p_index int, p_value jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  r public.rooms;
  rp public.room_players;
  q public.quiz_questions;
  v_secs int;
  v_elapsed numeric;
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
  select * into q from public.quiz_questions where id = r.question_ids[p_index + 1];
  v_ok := public._q_check(q, p_value);
  if v_ok then
    v_pts := 100 + case when r.settings->>'scoring' = 'speed' then greatest(0, floor(100 * (1 - least(v_elapsed, v_secs) / v_secs)))::int else 0 end + least(rp.streak, 5) * 10;
  end if;
  update public.room_players set
    answers = answers || jsonb_build_object(p_index::text, jsonb_build_object('choice', case when q.kind = 'truefalse' then p_value end,
      'given', public._q_given_text(q, p_value), 'correct', v_ok, 'points', v_pts, 'ms', floor(v_elapsed * 1000)::int)),
    score = score + v_pts,
    correct = correct + case when v_ok then 1 else 0 end,
    streak = case when v_ok then streak + 1 else 0 end,
    best_streak = greatest(best_streak, case when v_ok then streak + 1 else 0 end)
    where room_id = p_room and user_id = me;
  return jsonb_build_object('correct', v_ok, 'points', v_pts, 'answer_text', public._q_answer_text(q),
    'solution', case when q.kind = 'choice' then q.solution->'index' when q.kind = 'multi' then q.solution->'indices' end);
end;
$$;

create or replace function public.submit_room_answer(p_room uuid, p_index int, p_choice boolean)
returns jsonb language sql security definer set search_path = '' as $$
  select public.submit_room_answer_v2(p_room, p_index, to_jsonb(p_choice));
$$;

-- ---------------------------------------------------------------------------
-- Admin: questions with types
-- ---------------------------------------------------------------------------
create or replace function public._q_validate(p jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare
  k text := coalesce(p->>'kind', 'truefalse');
  n int := coalesce(jsonb_array_length(case when jsonb_typeof(p->'options') = 'array' then p->'options' else '[]'::jsonb end), 0);
begin
  if k not in ('truefalse', 'choice', 'multi', 'text', 'number', 'order') then raise exception 'bad_kind'; end if;
  if k = 'truefalse' and (p->>'answer') is null then raise exception 'need_answer'; end if;
  if k in ('choice', 'multi') and (n < 2 or n > 8) then raise exception 'need_options'; end if;
  if k = 'order' and (n < 3 or n > 8) then raise exception 'need_order_items'; end if;
  if k = 'choice' and ((p->'solution'->>'index') is null or (p->'solution'->>'index')::int not between 0 and n - 1) then raise exception 'need_correct_option'; end if;
  if k = 'multi' and coalesce(jsonb_array_length(p->'solution'->'indices'), 0) < 1 then raise exception 'need_correct_option'; end if;
  if k = 'text' and coalesce(jsonb_array_length(p->'solution'->'accepted'), 0) < 1 then raise exception 'need_accepted'; end if;
  if k = 'number' and (p->'solution'->>'value') is null then raise exception 'need_number'; end if;
end;
$$;

create or replace function public.admin_upsert_question(p jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_id bigint;
  k text := coalesce(p->>'kind', 'truefalse');
begin
  perform public._require('content');
  if length(trim(coalesce(p->>'item', ''))) < 1 then raise exception 'bad_item'; end if;
  perform public._q_validate(p);
  if (p->>'id') is not null then
    update public.quiz_questions set item = trim(p->>'item'), qtype = coalesce(nullif(p->>'type', ''), qtype), emoji = coalesce(p->>'emoji', emoji),
      kind = k, prompt = nullif(trim(coalesce(p->>'prompt', '')), ''), image_url = nullif(trim(coalesce(p->>'image', '')), ''),
      answer = case when k = 'truefalse' then (p->>'answer')::boolean end,
      options = case when k in ('choice', 'multi', 'order') then p->'options' end,
      solution = case when k in ('choice', 'multi', 'text', 'number') then p->'solution' end,
      fact = coalesce(p->>'fact', ''), active = coalesce((p->>'active')::boolean, active)
      where id = (p->>'id')::bigint returning id into v_id;
  else
    insert into public.quiz_questions (game_slug, item, qtype, emoji, kind, prompt, image_url, answer, options, solution, fact, active)
    values (p->>'game_slug', trim(p->>'item'), coalesce(nullif(p->>'type', ''), 'General'), coalesce(nullif(p->>'emoji', ''), U&'\+002753'), k,
      nullif(trim(coalesce(p->>'prompt', '')), ''), nullif(trim(coalesce(p->>'image', '')), ''),
      case when k = 'truefalse' then (p->>'answer')::boolean end,
      case when k in ('choice', 'multi', 'order') then p->'options' end,
      case when k in ('choice', 'multi', 'text', 'number') then p->'solution' end,
      coalesce(p->>'fact', ''), coalesce((p->>'active')::boolean, true))
    returning id into v_id;
  end if;
  perform public._audit('question.save', v_id::text, p);
  return v_id;
end;
$$;

create or replace function public.admin_import_questions(p_game text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  k text;
  n_new int := 0;
  n_upd int := 0;
  n_bad int := 0;
begin
  perform public._require('content');
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 2000 then raise exception 'bad_rows'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    continue when length(trim(coalesce(r->>'item', ''))) = 0;
    k := coalesce(r->>'kind', 'truefalse');
    begin
      perform public._q_validate(r);
    exception when others then
      n_bad := n_bad + 1;
      continue;
    end;
    update public.quiz_questions set qtype = coalesce(nullif(r->>'type', ''), qtype), emoji = coalesce(nullif(r->>'emoji', ''), emoji), kind = k,
      prompt = nullif(trim(coalesce(r->>'prompt', '')), ''), image_url = nullif(trim(coalesce(r->>'image', '')), ''),
      answer = case when k = 'truefalse' then (r->>'answer')::boolean end,
      options = case when k in ('choice', 'multi', 'order') then r->'options' end,
      solution = case when k in ('choice', 'multi', 'text', 'number') then r->'solution' end,
      fact = coalesce(r->>'fact', fact), active = true
      where game_slug = p_game and item = trim(r->>'item');
    if found then n_upd := n_upd + 1;
    else
      insert into public.quiz_questions (game_slug, item, qtype, emoji, kind, prompt, image_url, answer, options, solution, fact, active)
      values (p_game, trim(r->>'item'), coalesce(nullif(r->>'type', ''), 'General'), coalesce(nullif(r->>'emoji', ''), U&'\+002753'), k,
        nullif(trim(coalesce(r->>'prompt', '')), ''), nullif(trim(coalesce(r->>'image', '')), ''),
        case when k = 'truefalse' then (r->>'answer')::boolean end,
        case when k in ('choice', 'multi', 'order') then r->'options' end,
        case when k in ('choice', 'multi', 'text', 'number') then r->'solution' end,
        coalesce(r->>'fact', ''), true);
      n_new := n_new + 1;
    end if;
  end loop;
  perform public._audit('question.import', p_game, jsonb_build_object('new', n_new, 'updated', n_upd, 'skipped', n_bad));
  return jsonb_build_object('new', n_new, 'updated', n_upd, 'skipped', n_bad);
end;
$$;

create or replace function public.admin_list_questions(p_game text, p_q text default '', p_active boolean default null, p_limit int default 100, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._require('content');
  return jsonb_build_object(
    'total', (select count(*) from public.quiz_questions where game_slug = p_game and (coalesce(p_q, '') = '' or item ilike '%' || p_q || '%' or fact ilike '%' || p_q || '%' or prompt ilike '%' || p_q || '%') and (p_active is null or active = p_active)),
    'kinds', (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb) from (select kind, count(*) n from public.quiz_questions where game_slug = p_game and active group by kind) k),
    'rows', (select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'item', q.item, 'type', q.qtype, 'emoji', q.emoji, 'sprite', q.sprite, 'answer', q.answer,
        'kind', q.kind, 'prompt', q.prompt, 'image', q.image_url, 'options', q.options, 'solution', q.solution, 'answer_text', public._q_answer_text(q),
        'fact', q.fact, 'active', q.active,
        'asked', (select count(*) from public.play_sessions s where q.id = any(s.question_ids) and s.status = 'finished'))
      order by q.id desc), '[]'::jsonb)
      from (select * from public.quiz_questions where game_slug = p_game and (coalesce(p_q, '') = '' or item ilike '%' || p_q || '%' or fact ilike '%' || p_q || '%' or prompt ilike '%' || p_q || '%') and (p_active is null or active = p_active)
        order by id desc limit least(coalesce(p_limit, 100), 500) offset greatest(coalesce(p_offset, 0), 0)) q)
  );
end;
$$;

-- admin_catalog's true_count only makes sense for true/false; add per-kind counts
create or replace function public.admin_catalog()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._require('dash');
  return jsonb_build_object(
    'games', (select coalesce(jsonb_agg(to_jsonb(g) || jsonb_build_object(
        'question_count', (select count(*) from public.quiz_questions q where q.game_slug = g.slug and q.active),
        'true_count', (select count(*) from public.quiz_questions q where q.game_slug = g.slug and q.active and q.answer),
        'kinds', (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb) from (select kind, count(*) n from public.quiz_questions q where q.game_slug = g.slug and q.active group by kind) k),
        'rounds_30d', (select count(*) from public.play_sessions s where s.game_slug = g.slug and s.status = 'finished' and s.finished_at > now() - interval '30 days'))
      order by g.sort, g.title), '[]'::jsonb) from public.games g),
    'categories', (select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object('games', (select count(*) from public.games g where c.id = any(g.categories))) order by c.sort, c.name), '[]'::jsonb) from public.categories c),
    'badges', (select coalesce(jsonb_agg(to_jsonb(b) || jsonb_build_object('holders', (select count(*) from public.user_achievements a where a.achievement_id = b.id)) order by b.created_at desc), '[]'::jsonb) from public.custom_badges b),
    'orphan_questions', (select coalesce(jsonb_agg(distinct q.game_slug), '[]'::jsonb) from public.quiz_questions q where not exists (select 1 from public.games g where g.slug = q.game_slug))
  );
end;
$$;

revoke all on function public._q_validate(jsonb) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['start_session(text, int, text)', 'submit_answer_v2(uuid, int, jsonb, text)', 'submit_answer(uuid, int, boolean, text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  foreach f in array array['start_tournament_round(text)', 'get_room(text)', 'submit_room_answer_v2(uuid, int, jsonb)', 'submit_room_answer(uuid, int, boolean)',
    'admin_upsert_question(jsonb)', 'admin_import_questions(text, jsonb)', 'admin_list_questions(text, text, boolean, int, int)', 'admin_catalog()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
