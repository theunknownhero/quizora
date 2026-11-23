-- Quizora — Supabase setup
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run (it replaces functions/policies and only creates what's missing).

-- ---------------------------------------------------------------------------
-- Profiles: one row per user, created automatically when someone signs up.
-- Accounts themselves (email, password, confirmation) live in Supabase Auth.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null check (username ~ '^[A-Za-z0-9_.]{3,20}$'),
  interests   text[] not null default '{}' check (cardinality(interests) <= 30),
  topics      text[] not null default '{}' check (cardinality(topics) <= 30),
  countries   text[] not null default '{}' check (cardinality(countries) <= 30),
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Usernames are unique regardless of upper/lower case
create unique index if not exists profiles_username_lower on public.profiles (lower(username));

-- ---------------------------------------------------------------------------
-- Row Level Security: people can only read and edit their own profile.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Only the preference columns can be changed from the website (not id/username/created_at).
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (interests, topics, countries, onboarded) on public.profiles to authenticated;

-- Keep updated_at current
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Create the profile when a user signs up (username comes from sign-up metadata).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  uname text := new.raw_user_meta_data ->> 'username';
begin
  if uname is null or uname !~ '^[A-Za-z0-9_.]{3,20}$' then
    raise exception 'invalid_username';
  end if;
  insert into public.profiles (id, username) values (new.id, uname);
  return new;
exception
  when unique_violation then
    raise exception 'username_taken';
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Check if a username is free before signing up (returns true/false only).
-- ---------------------------------------------------------------------------
drop function if exists public.username_available(text);
create or replace function public.username_available(candidate text)
returns boolean language sql stable security definer set search_path = '' as $$
  select candidate ~ '^[A-Za-z0-9_.]{3,20}$'
     and not exists (select 1 from public.profiles p where lower(p.username) = lower(candidate));
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
