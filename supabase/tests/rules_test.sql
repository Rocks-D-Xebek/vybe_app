-- VYBE rule tests. Creates pretend users, checks every challenge rule, then UNDOES everything
-- (the final RAISE aborts the transaction, so nothing is saved). Run in Supabase SQL Editor.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  d uuid := gen_random_uuid(); e uuid := gen_random_uuid();
  r text := ''; ok int := 0; bad int := 0; cid uuid; gid uuid; i int; n int; v text; q jsonb;

  -- helpers as nested blocks below
begin
  -- 5 pretend sign-ups (the trigger must create their profiles)
  insert into auth.users (id, email, raw_user_meta_data) values
    (a, 'test-a@vybe.test', '{"full_name":"Asha"}'), (b, 'test-b@vybe.test', '{"full_name":"Bala"}'),
    (c, 'test-c@vybe.test', '{"full_name":"Chitra"}'), (d, 'test-d@vybe.test', '{"full_name":"Dan"}'),
    (e, 'test-e@vybe.test', '{"full_name":"Esha"}');
  select count(*) into n from profiles where id in (a, b, c, d, e);
  if n = 5 then ok := ok + 1; r := r || E'\nPASS profiles auto-created'; else bad := bad + 1; r := r || E'\nFAIL profiles auto-created: ' || n; end if;

  update profiles set username = 'test_asha', city = 'Hyderabad', country = 'IN' where id = a;
  update profiles set username = 'test_bala', city = 'hyderabad ', country = 'IN' where id = b;
  update profiles set username = 'test_chitra', city = 'Mumbai', country = 'IN' where id = c;
  update profiles set username = 'test_dan', city = 'London', country = 'GB' where id = d;
  update profiles set username = 'test_esha', city = 'Hyderabad', country = 'IN', open_to_match = false where id = e;

  -- ===== act as Asha (free user)
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  begin
    perform create_challenge(array[e], 'x', 'run', 'minutes', 0, 7);
    bad := bad + 1; r := r || E'\nFAIL free user challenged a non-friend';
  exception when others then ok := ok + 1; r := r || E'\nPASS non-friend blocked: ' || sqlerrm; end;

  -- friendships: Asha→Bala request, Bala accepts; Chitra and Dan via invite links
  v := send_friend_request(b);
  perform set_config('request.jwt.claims', json_build_object('sub', b)::text, true);
  perform respond_friend_request(a, true);
  perform set_config('request.jwt.claims', json_build_object('sub', c)::text, true);
  perform accept_invite((select invite_code from profiles where id = a));
  perform set_config('request.jwt.claims', json_build_object('sub', d)::text, true);
  perform accept_invite((select invite_code from profiles where id = a));
  if are_friends(a, b) and are_friends(a, c) and are_friends(a, d) and not are_friends(a, e)
    then ok := ok + 1; r := r || E'\nPASS friend request + invite links';
    else bad := bad + 1; r := r || E'\nFAIL friendships'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  -- same city (case/space-insensitive) → unlimited
  for i in 1..7 loop cid := create_challenge(array[b], 'city ' || i, 'run', 'minutes', 0, 7); end loop;
  if (select scope from challenges where id = cid) = 'city' then ok := ok + 1; r := r || E'\nPASS 7 same-city challenges allowed (unlimited)';
  else bad := bad + 1; r := r || E'\nFAIL city scope'; end if;

  -- national: 5 per month
  for i in 1..5 loop perform create_challenge(array[c], 'nat ' || i, 'gym', 'sessions', 0, 7); end loop;
  begin
    perform create_challenge(array[c], 'nat 6', 'gym', 'sessions', 0, 7);
    bad := bad + 1; r := r || E'\nFAIL 6th national challenge allowed';
  exception when others then ok := ok + 1; r := r || E'\nPASS 6th national blocked: ' || sqlerrm; end;

  -- international: 3 per month
  for i in 1..3 loop perform create_challenge(array[d], 'intl ' || i, 'walk', 'km', 10, 7); end loop;
  begin
    perform create_challenge(array[d], 'intl 4', 'walk', 'km', 10, 7);
    bad := bad + 1; r := r || E'\nFAIL 4th international allowed';
  exception when others then ok := ok + 1; r := r || E'\nPASS 4th international blocked: ' || sqlerrm; end;

  -- 7-day login streak → +1 national
  update profiles set login_streak = 7 where id = a;
  q := my_challenge_quota();
  begin
    perform create_challenge(array[c], 'nat bonus', 'gym', 'sessions', 0, 7);
    ok := ok + 1; r := r || E'\nPASS 7-day streak bonus gives 6th national (limit ' || (q->>'national_limit') || ')';
  exception when others then bad := bad + 1; r := r || E'\nFAIL streak bonus: ' || sqlerrm; end;
  update profiles set login_streak = 30 where id = a;
  q := my_challenge_quota();
  if (q->>'national_limit')::int = 8 and (q->>'international_limit')::int = 5
    then ok := ok + 1; r := r || E'\nPASS 30-day streak limits 8 national / 5 international';
    else bad := bad + 1; r := r || E'\nFAIL 30-day limits ' || q::text; end if;

  -- free users cannot create groups
  begin
    perform create_challenge(array[b, c], 'group', 'run', 'minutes', 0, 7);
    bad := bad + 1; r := r || E'\nFAIL free user created a group';
  exception when others then ok := ok + 1; r := r || E'\nPASS free group blocked: ' || sqlerrm; end;

  -- Premium: anyone (Esha is not a friend), groups, free members are guests
  update profiles set is_premium = true where id = a;
  gid := create_challenge(array[b, c, e], 'squad', 'run', 'km', 0, 7);
  select count(*) into n from challenge_members where challenge_id = gid and temporary;
  if (select kind from challenges where id = gid) = 'group' and n = 3
    then ok := ok + 1; r := r || E'\nPASS Premium group with non-friend; 3 free guests marked temporary';
    else bad := bad + 1; r := r || E'\nFAIL premium group (temporary=' || n || ')'; end if;
  for i in 1..10 loop perform create_challenge(array[d], 'intl p' || i, 'walk', 'km', 0, 7); end loop;
  ok := ok + 1; r := r || E'\nPASS Premium unlimited international';

  -- duel flow: Bala accepts, logs progress; Asha flags it
  cid := (select id from challenges where creator = a and title = 'city 1');
  perform set_config('request.jwt.claims', json_build_object('sub', b)::text, true);
  perform respond_challenge(cid, true);
  perform add_challenge_entry(cid, 30, 'manual', 'morning run');
  if (select status from challenges where id = cid) = 'active' and (select progress from challenge_members where challenge_id = cid and user_id = b) = 30
    then ok := ok + 1; r := r || E'\nPASS accept duel + log progress';
    else bad := bad + 1; r := r || E'\nFAIL duel progress'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  perform flag_entry((select id from challenge_entries where challenge_id = cid and user_id = b limit 1));
  if (select progress from challenge_members where challenge_id = cid and user_id = b) = 0
    then ok := ok + 1; r := r || E'\nPASS flagged entry stops counting';
    else bad := bad + 1; r := r || E'\nFAIL flagging'; end if;

  -- finishing: winner picked, guests dropped from the group
  perform set_config('request.jwt.claims', json_build_object('sub', b)::text, true);
  perform respond_challenge(gid, true);
  perform add_challenge_entry(gid, 12);
  update challenges set ends_at = now() - interval '1 minute' where id = gid;
  perform finish_due_challenges();
  if (select status from challenges where id = gid) = 'finished' and (select winner from challenges where id = gid) = b
     and not exists (select 1 from challenge_members where challenge_id = gid and temporary and status <> 'removed')
    then ok := ok + 1; r := r || E'\nPASS event end: winner chosen, free guests removed';
    else bad := bad + 1; r := r || E'\nFAIL finishing'; end if;

  -- random match: Bala (Hyderabad, free) must get Asha (Esha opted out of matching)
  update profiles set is_premium = false where id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', b)::text, true);
  update challenges set status = 'finished' where id in (select challenge_id from challenge_members where user_id = b);
  begin
    cid := random_match('walk', 'minutes', 0, 3);
    if exists (select 1 from challenge_members where challenge_id = cid and user_id = a)
      then ok := ok + 1; r := r || E'\nPASS random match found same-city user';
      else bad := bad + 1; r := r || E'\nFAIL random match picked wrong user'; end if;
  exception when others then bad := bad + 1; r := r || E'\nFAIL random match: ' || sqlerrm; end;

  -- privacy (row-level security): Esha sees only challenges she is in
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from challenges;
  execute 'reset role';
  if n = 1 then ok := ok + 1; r := r || E'\nPASS privacy: non-member sees only her own challenge (1)';
  else bad := bad + 1; r := r || E'\nFAIL privacy: Esha sees ' || n || ' challenges'; end if;

  -- leaderboard + login streak
  perform set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  perform sync_xp(500);
  select count(*) into n from leaderboard('friends');
  if n = 4 then ok := ok + 1; r := r || E'\nPASS friends leaderboard (4 people)'; else bad := bad + 1; r := r || E'\nFAIL leaderboard rows ' || n; end if;
  q := touch_login(current_date);
  ok := ok + 1; r := r || E'\nPASS touch_login';

  raise exception E'VYBE TESTS: % passed, % failed (all test data rolled back)%', ok, bad, r;
end $$;
