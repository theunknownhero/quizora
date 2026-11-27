-- Campaign rewards: a promo code + prize link per quiz, revealed only to players who won a round.
-- The table has row level security with no policies, so nobody can read it directly (get_site_config
-- doesn't include it either); claim_campaign_reward checks the finished, server-scored session first.
--
-- The real codes are NOT stored in this repo (it's public). Add or change one in the SQL editor:
--   insert into public.campaign_rewards (game_slug, promo_code, prize_url, prize_label)
--   values ('black-friday-fake-or-real', '<CODE>', 'https://…', 'Claim the Prize')
--   on conflict (game_slug) do update set promo_code = excluded.promo_code, prize_url = excluded.prize_url,
--     prize_label = excluded.prize_label, updated_at = now();

create table if not exists public.campaign_rewards (
  game_slug text primary key references public.games (slug) on delete cascade,
  promo_code text not null,
  prize_url text not null,
  prize_label text not null default 'Claim the Prize',
  updated_at timestamptz not null default now()
);
alter table public.campaign_rewards enable row level security;
revoke all on public.campaign_rewards from anon, authenticated;

create or replace function public.claim_campaign_reward(p_session uuid, p_guest_token text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_s public.play_sessions%rowtype;
  v_r public.campaign_rewards%rowtype;
begin
  select * into v_s from public.play_sessions where id = p_session;
  if not found then raise exception 'no_session'; end if;
  if not ((v_s.user_id is not null and v_s.user_id = v_uid) or (v_s.user_id is null and v_s.guest_token = p_guest_token)) then
    raise exception 'not_yours';
  end if;
  if v_s.status <> 'finished' or not coalesce(v_s.won, false) then raise exception 'not_won'; end if;
  select * into v_r from public.campaign_rewards where game_slug = v_s.game_slug;
  if not found then return null; end if;
  return jsonb_build_object('code', v_r.promo_code, 'url', v_r.prize_url, 'label', v_r.prize_label);
end;
$$;
revoke all on function public.claim_campaign_reward(uuid, text) from public;
grant execute on function public.claim_campaign_reward(uuid, text) to anon, authenticated;
