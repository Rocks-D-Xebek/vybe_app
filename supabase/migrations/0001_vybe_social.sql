-- VYBE phase 2: accounts, cloud backup, friends, challenges, leaderboards.
-- Run this once in Supabase → SQL Editor → New query → paste → Run.
-- Every rule (friend checks, monthly limits, Premium) is enforced HERE, on the server,
-- so a modified app cannot bypass it.

create extension if not exists pgcrypto;

-- ============================================================ PROFILES
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  display_name  text not null default 'VYBE user' check (char_length(display_name) between 1 and 40),
  avatar        text,                                   -- 'preset:3', 'mrvyb' or an image URL
  city          text check (char_length(city) <= 60),
  country       text not null default 'IN' check (country ~ '^[A-Z]{2}$'),
  is_premium    boolean not null default false,        -- set only by the RevenueCat webhook / admin
  premium_until timestamptz,
  xp            integer not null default 0 check (xp >= 0),
  open_to_match boolean not null default true,         -- can be picked for random matches
  login_streak  integer not null default 0,
  last_login    date,
  invite_code   text not null unique default substr(encode(gen_random_bytes(6), 'hex'), 1, 8),
  created_at    timestamptz not null default now()
);

create index if not exists profiles_city_idx on public.profiles (country, lower(trim(city)));
create index if not exists profiles_xp_idx on public.profiles (xp desc);

-- Create a profile automatically when someone signs up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name',
                                split_part(coalesce(new.email, ''), '@', 1), 'VYBE user'), 40))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists "profiles readable by signed-in users" on public.profiles;
create policy "profiles readable by signed-in users" on public.profiles for select to authenticated using (true);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Users may only edit these columns themselves (not premium, XP or streaks)
revoke update on public.profiles from authenticated, anon;
grant update (username, display_name, avatar, city, country, open_to_match) on public.profiles to authenticated;

create or replace function public.is_premium_user(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_premium and (premium_until is null or premium_until > now()) from profiles where id = uid), false)
$$;

-- ============================================================ CLOUD BACKUP
create table if not exists public.user_backups (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_backups enable row level security;
drop policy if exists "own backup" on public.user_backups;
create policy "own backup" on public.user_backups for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================ FRIENDS
create table if not exists public.friendships (
  requester  uuid not null references public.profiles(id) on delete cascade,
  addressee  uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
alter table public.friendships enable row level security;
drop policy if exists "see own friendships" on public.friendships;
create policy "see own friendships" on public.friendships for select to authenticated
  using (auth.uid() in (requester, addressee));
drop policy if exists "remove own friendships" on public.friendships;
create policy "remove own friendships" on public.friendships for delete to authenticated
  using (auth.uid() in (requester, addressee));

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships where status = 'accepted'
    and ((requester = a and addressee = b) or (requester = b and addressee = a)))
$$;

-- Send a request (or accept automatically if they already asked you)
create or replace function public.send_friend_request(p_user uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or p_user is null or p_user = me then raise exception 'Invalid user'; end if;
  if are_friends(me, p_user) then return 'already_friends'; end if;
  if exists (select 1 from friendships where requester = p_user and addressee = me) then
    update friendships set status = 'accepted' where requester = p_user and addressee = me;
    return 'accepted';
  end if;
  insert into friendships (requester, addressee) values (me, p_user) on conflict do nothing;
  return 'requested';
end $$;

create or replace function public.respond_friend_request(p_user uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_accept then
    update friendships set status = 'accepted' where requester = p_user and addressee = auth.uid();
  else
    delete from friendships where requester = p_user and addressee = auth.uid();
  end if;
end $$;

-- Opening someone's invite link makes you friends instantly (they shared it on purpose)
create or replace function public.accept_invite(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); them uuid;
begin
  select id into them from profiles where invite_code = lower(trim(p_code));
  if them is null then raise exception 'Invite not found'; end if;
  if them = me then return them; end if;
  insert into friendships (requester, addressee, status) values (them, me, 'accepted')
  on conflict (requester, addressee) do update set status = 'accepted';
  update friendships set status = 'accepted' where requester = me and addressee = them;
  return them;
end $$;

-- ============================================================ CHALLENGES
create table if not exists public.challenges (
  id            uuid primary key default gen_random_uuid(),
  creator       uuid not null references public.profiles(id) on delete cascade,
  kind          text not null check (kind in ('duel', 'group')),
  title         text not null check (char_length(title) between 1 and 60),
  activity      text not null check (char_length(activity) between 1 and 30),   -- run, walk, gym, swim, cycling, yoga, any…
  metric        text not null check (metric in ('minutes', 'sessions', 'kcal', 'km')),
  target        numeric check (target is null or target > 0),                     -- null = highest total wins
  scope         text not null check (scope in ('city', 'national', 'international', 'random')),
  duration_days integer not null check (duration_days between 1 and 60),
  live_video    boolean not null default false,
  status        text not null default 'pending' check (status in ('pending', 'active', 'finished', 'cancelled')),
  starts_at     timestamptz,
  ends_at       timestamptz,
  winner        uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);
create index if not exists challenges_creator_month_idx on public.challenges (creator, created_at);

create table if not exists public.challenge_members (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'invited' check (status in ('invited', 'accepted', 'declined', 'removed')),
  temporary    boolean not null default false,   -- free users inside a Premium group: dropped when the event ends
  progress     numeric not null default 0,
  joined_at    timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index if not exists challenge_members_user_idx on public.challenge_members (user_id);

create table if not exists public.challenge_entries (
  id           bigint generated always as identity primary key,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  value        numeric not null check (value > 0 and value <= 100000),
  source       text not null default 'manual' check (source in ('manual', 'gps', 'health', 'video')),
  note         text check (char_length(note) <= 120),
  flagged      boolean not null default false,
  flagged_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists challenge_entries_ch_idx on public.challenge_entries (challenge_id);

create or replace function public.in_challenge(p_challenge uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from challenge_members where challenge_id = p_challenge and user_id = auth.uid() and status <> 'declined')
$$;

alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;
alter table public.challenge_entries enable row level security;
drop policy if exists "members see challenge" on public.challenges;
create policy "members see challenge" on public.challenges for select to authenticated using (in_challenge(id));
drop policy if exists "members see members" on public.challenge_members;
create policy "members see members" on public.challenge_members for select to authenticated using (in_challenge(challenge_id));
drop policy if exists "members see entries" on public.challenge_entries;
create policy "members see entries" on public.challenge_entries for select to authenticated using (in_challenge(challenge_id));
-- All writes go through the functions below (no direct insert/update policies).

-- How many national / international challenges a free user may still START this month
create or replace function public.my_challenge_quota() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles; nat_used int; intl_used int; nat_bonus int := 0; intl_bonus int := 0;
begin
  select * into me from profiles where id = auth.uid();
  if me.login_streak >= 30 then nat_bonus := 3; intl_bonus := 2;
  elsif me.login_streak >= 7 then nat_bonus := 1; end if;
  select count(*) filter (where scope = 'national'), count(*) filter (where scope = 'international')
    into nat_used, intl_used
    from challenges where creator = me.id and status <> 'cancelled' and created_at >= date_trunc('month', now());
  return jsonb_build_object(
    'premium', is_premium_user(me.id),
    'national_used', nat_used, 'national_limit', 5 + nat_bonus,
    'international_used', intl_used, 'international_limit', 3 + intl_bonus,
    'login_streak', me.login_streak);
end $$;

create or replace function public.scope_between(a uuid, b uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when pa.country <> pb.country then 'international'
    when coalesce(lower(trim(pa.city)), '') <> '' and lower(trim(pa.city)) = lower(trim(pb.city)) then 'city'
    else 'national' end
  from profiles pa, profiles pb where pa.id = a and pb.id = b
$$;

-- Create a duel (free or Premium) or a group challenge (Premium only)
create or replace function public.create_challenge(
  p_opponents uuid[], p_title text, p_activity text, p_metric text, p_target numeric,
  p_days integer, p_live_video boolean default false, p_random boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  premium boolean := is_premium_user(auth.uid());
  opp uuid; sc text := 'city'; q jsonb; cid uuid; n int := coalesce(array_length(p_opponents, 1), 0);
begin
  if me is null then raise exception 'Please sign in'; end if;
  if n = 0 then raise exception 'Pick someone to challenge'; end if;
  if me = any(p_opponents) then raise exception 'You cannot challenge yourself'; end if;
  if not premium and n > 1 then raise exception 'Group challenges are a VYBE Premium feature'; end if;
  if n > 100 then raise exception 'Max 100 people per challenge'; end if;

  if not premium then
    opp := p_opponents[1];
    if p_random then
      sc := 'random';
    else
      if not are_friends(me, opp) then raise exception 'Free accounts can only challenge friends. Go Premium to challenge anyone.'; end if;
      sc := scope_between(me, opp);
      q := my_challenge_quota();
      if sc = 'national' and (q->>'national_used')::int >= (q->>'national_limit')::int then
        raise exception 'You have used all % national challenges this month. Keep your login streak or go Premium for unlimited.', q->>'national_limit';
      end if;
      if sc = 'international' and (q->>'international_used')::int >= (q->>'international_limit')::int then
        raise exception 'You have used all % international challenges this month. Keep your login streak or go Premium for unlimited.', q->>'international_limit';
      end if;
    end if;
  else
    -- Premium: anyone, anywhere; scope is only informational
    sc := case when n = 1 then scope_between(me, p_opponents[1]) else 'international' end;
    if p_random then sc := 'random'; end if;
  end if;

  insert into challenges (creator, kind, title, activity, metric, target, scope, duration_days, live_video, status, starts_at, ends_at)
  values (me, case when n = 1 then 'duel' else 'group' end, left(p_title, 60), left(lower(p_activity), 30), p_metric,
          nullif(p_target, 0), sc, p_days, coalesce(p_live_video, false),
          case when n = 1 then 'pending' else 'active' end,
          case when n = 1 then null else now() end,
          case when n = 1 then null else now() + make_interval(days => p_days) end)
  returning id into cid;

  insert into challenge_members (challenge_id, user_id, status) values (cid, me, 'accepted');
  insert into challenge_members (challenge_id, user_id, status, temporary)
    select cid, u, 'invited', (n > 1 and not is_premium_user(u)) from unnest(p_opponents) as u
    where exists (select 1 from profiles where id = u)
    on conflict do nothing;
  return cid;
end $$;

-- Random opponent: same city for free users, anywhere for Premium
create or replace function public.random_match(p_activity text, p_metric text, p_target numeric, p_days integer)
returns uuid
language plpgsql security definer set search_path = public as $$
declare me profiles; opp uuid; premium boolean;
begin
  select * into me from profiles where id = auth.uid();
  if me.id is null then raise exception 'Please sign in'; end if;
  premium := is_premium_user(me.id);
  if not premium and coalesce(trim(me.city), '') = '' then raise exception 'Add your city in Profile to get matched with people near you'; end if;
  select id into opp from profiles
   where id <> me.id and open_to_match and username is not null
     and (premium or (country = me.country and lower(trim(city)) = lower(trim(me.city))))
     and not exists (select 1 from challenge_members cm1 join challenge_members cm2 using (challenge_id)
                     join challenges c on c.id = cm1.challenge_id
                     where cm1.user_id = me.id and cm2.user_id = profiles.id and c.status in ('pending', 'active'))
   order by random() limit 1;
  if opp is null then raise exception 'No one available to match right now. Invite friends to VYBE!'; end if;
  return create_challenge(array[opp], 'Random ' || p_activity || ' battle', p_activity, p_metric, p_target, p_days, false, true);
end $$;

create or replace function public.respond_challenge(p_challenge uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare c challenges;
begin
  select * into c from challenges where id = p_challenge;
  if c.id is null or c.status not in ('pending', 'active') then raise exception 'Challenge not available'; end if;
  update challenge_members set status = case when p_accept then 'accepted' else 'declined' end
   where challenge_id = p_challenge and user_id = auth.uid() and status = 'invited';
  if not found then raise exception 'No invite to answer'; end if;
  if c.kind = 'duel' then
    if p_accept then
      update challenges set status = 'active', starts_at = now(), ends_at = now() + make_interval(days => duration_days) where id = p_challenge;
    else
      update challenges set status = 'cancelled' where id = p_challenge;
    end if;
  end if;
end $$;

create or replace function public.recalc_progress(p_challenge uuid, p_user uuid) returns void
language sql security definer set search_path = public as $$
  update challenge_members set progress = coalesce((select sum(value) from challenge_entries
    where challenge_id = p_challenge and user_id = p_user and not flagged), 0)
  where challenge_id = p_challenge and user_id = p_user
$$;

create or replace function public.add_challenge_entry(p_challenge uuid, p_value numeric, p_source text default 'manual', p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare c challenges;
begin
  select * into c from challenges where id = p_challenge;
  if c.id is null or c.status <> 'active' or now() not between c.starts_at and c.ends_at then
    raise exception 'This challenge is not running right now';
  end if;
  if not exists (select 1 from challenge_members where challenge_id = p_challenge and user_id = auth.uid() and status = 'accepted') then
    raise exception 'Join the challenge first';
  end if;
  insert into challenge_entries (challenge_id, user_id, value, source, note) values (p_challenge, auth.uid(), p_value, coalesce(p_source, 'manual'), p_note);
  perform recalc_progress(p_challenge, auth.uid());
end $$;

-- An opponent can flag a suspicious entry; flagged entries stop counting
create or replace function public.flag_entry(p_entry bigint) returns void
language plpgsql security definer set search_path = public as $$
declare e challenge_entries;
begin
  select * into e from challenge_entries where id = p_entry;
  if e.id is null or e.user_id = auth.uid() or not in_challenge(e.challenge_id) then raise exception 'Cannot flag this entry'; end if;
  update challenge_entries set flagged = true, flagged_by = auth.uid() where id = p_entry;
  perform recalc_progress(e.challenge_id, e.user_id);
end $$;

-- Close finished challenges, pick winners, drop temporary (free) members from groups
create or replace function public.finish_due_challenges() returns integer
language plpgsql security definer set search_path = public as $$
declare c record; n int := 0;
begin
  for c in select ch.* from challenges ch join challenge_members m on m.challenge_id = ch.id and m.user_id = auth.uid()
           where ch.status = 'active' and ch.ends_at < now() loop
    update challenges set status = 'finished',
      winner = (select user_id from challenge_members where challenge_id = c.id and status = 'accepted'
                order by progress desc, joined_at asc limit 1)
      where id = c.id;
    update challenge_members set status = 'removed' where challenge_id = c.id and temporary;
    n := n + 1;
  end loop;
  update challenges set status = 'cancelled'
   where status = 'pending' and created_at < now() - interval '3 days'
     and id in (select challenge_id from challenge_members where user_id = auth.uid());
  return n;
end $$;

-- ============================================================ LOGIN STREAK & XP
create or replace function public.touch_login(p_today date) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me profiles; d date;
begin
  -- Trust the phone's local date only within one day of the server date
  d := least(greatest(p_today, (now() at time zone 'utc')::date - 1), (now() at time zone 'utc')::date + 1);
  select * into me from profiles where id = auth.uid();
  if me.last_login is distinct from d then
    update profiles set
      login_streak = case when me.last_login = d - 1 then login_streak + 1 else 1 end,
      last_login = d
    where id = auth.uid();
  end if;
  return my_challenge_quota();
end $$;

-- XP comes from the phone; cap growth so the leaderboard can't be spammed
create or replace function public.sync_xp(p_xp integer) returns integer
language plpgsql security definer set search_path = public as $$
declare cur int;
begin
  select xp into cur from profiles where id = auth.uid();
  update profiles set xp = least(greatest(p_xp, 0), cur + 2000) where id = auth.uid() and p_xp > cur;
  return (select xp from profiles where id = auth.uid());
end $$;

create or replace function public.leaderboard(p_scope text) returns table (
  rank bigint, id uuid, username text, display_name text, avatar text, city text, country text, xp integer, is_me boolean
)
language sql stable security definer set search_path = public as $$
  with me as (select * from profiles where id = auth.uid()),
  pool as (
    select p.* from profiles p, me
    where p.username is not null and (
      p_scope = 'global'
      or (p_scope = 'country' and p.country = me.country)
      or (p_scope = 'city' and p.country = me.country and lower(trim(p.city)) = lower(trim(me.city)))
      or (p_scope = 'friends' and (p.id = me.id or are_friends(me.id, p.id))))
  ),
  ranked as (select row_number() over (order by xp desc, created_at) as rank, * from pool)
  select r.rank, r.id, r.username, r.display_name, r.avatar, r.city, r.country, r.xp, r.id = auth.uid()
  from ranked r where r.rank <= 50 or r.id = auth.uid() order by r.rank
$$;

-- Google Play requires in-app account deletion. Deletes the login and everything linked to it.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Only signed-in users may call these (functions are executable by everyone by default)
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
