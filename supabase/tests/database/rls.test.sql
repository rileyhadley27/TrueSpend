begin;
select plan(4);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'one@example.test', '', now(), '{"display_name":"One"}', '{}', now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'two@example.test', '', now(), '{"display_name":"Two"}', '{}', now(), now());

update public.profiles set status = 'active' where user_id = '10000000-0000-0000-0000-000000000001';
insert into public.financial_accounts (id, user_id, name, institution, kind)
values ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Checking', 'Test Bank', 'checking');

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);

select is((select count(*)::integer from public.financial_accounts), 0, 'users cannot read another user account');
select throws_ok(
  $$insert into public.financial_accounts (user_id, name, institution, kind) values ('20000000-0000-0000-0000-000000000002', 'Blocked', 'Bank', 'checking')$$,
  '42501', null, 'pending users cannot create financial accounts'
);
select is((select count(*)::integer from storage.objects where bucket_id = 'statements'), 0, 'users cannot read another user private file');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*)::integer from public.financial_accounts), 1, 'active users can read their own accounts');

select * from finish();
rollback;
