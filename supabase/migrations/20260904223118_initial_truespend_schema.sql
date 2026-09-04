create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create extension if not exists pgcrypto with schema extensions;

create type public.profile_status as enum ('pending', 'active', 'rejected');
create type public.account_kind as enum ('checking', 'savings', 'credit_card', 'venmo', 'cash');
create type public.import_status as enum ('uploaded', 'extracting', 'needs_review', 'ready', 'committed', 'failed');
create type public.transaction_source as enum ('import', 'manual');
create type public.link_type as enum ('duplicate', 'transfer', 'card_payment', 'reimbursement', 'refund');
create type public.link_status as enum ('suggested', 'confirmed', 'dismissed');
create type public.member_role as enum ('anchor', 'offset', 'duplicate');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null check (char_length(display_name) between 2 and 50),
  status public.profile_status not null default 'pending',
  timezone text not null default 'America/New_York',
  default_currency text not null default 'USD' check (default_currency = 'USD'),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  institution text not null check (char_length(institution) between 1 and 100),
  kind public.account_kind not null,
  last4 text check (last4 is null or last4 ~ '^\d{4}$'),
  currency text not null default 'USD' check (currency = 'USD'),
  color text not null default '#7657ff',
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  color text not null,
  is_income boolean not null default false,
  is_system boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id)
);

create table public.merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_text text not null check (char_length(match_text) between 2 and 200),
  category_id uuid not null,
  normalized_merchant text,
  created_at timestamptz not null default now(),
  unique (user_id, match_text),
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete cascade
);

create table public.import_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  institution text not null,
  mapping jsonb not null check (jsonb_typeof(mapping) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id)
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  preset_id uuid,
  status public.import_status not null default 'uploaded',
  file_name text not null,
  storage_path text not null unique,
  content_type text not null,
  file_size integer not null check (file_size between 1 and 20971520),
  file_hash text not null check (file_hash ~ '^[a-f0-9]{64}$'),
  row_count integer not null default 0 check (row_count >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  unique (user_id, file_hash),
  unique (id, user_id),
  foreign key (account_id, user_id) references public.financial_accounts(id, user_id) on delete restrict,
  foreign key (preset_id, user_id) references public.import_presets(id, user_id) on delete set null (preset_id)
);

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_batch_id uuid not null,
  row_number integer not null check (row_number > 0),
  raw_payload jsonb not null,
  confidence integer not null check (confidence between 0 and 100),
  review_errors text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (import_batch_id, row_number),
  unique (id, user_id),
  foreign key (import_batch_id, user_id) references public.import_batches(id, user_id) on delete cascade
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  import_row_id uuid,
  source public.transaction_source not null,
  occurred_on date not null,
  posted_on date,
  description_raw text not null check (char_length(description_raw) between 1 and 500),
  merchant_normalized text not null check (char_length(merchant_normalized) between 1 and 200),
  amount_cents bigint not null check (amount_cents <> 0),
  category_id uuid not null,
  source_external_id text,
  source_fingerprint text,
  excluded boolean not null default false,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (account_id, user_id) references public.financial_accounts(id, user_id) on delete restrict,
  foreign key (import_row_id, user_id) references public.import_rows(id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete restrict
);

create table public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.link_type not null,
  status public.link_status not null default 'suggested',
  confidence integer not null check (confidence between 0 and 100),
  title text not null,
  explanation text not null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.reconciliation_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reconciliation_id uuid not null,
  transaction_id uuid not null,
  role public.member_role not null,
  allocation_cents bigint not null check (allocation_cents > 0),
  created_at timestamptz not null default now(),
  unique (reconciliation_id, transaction_id),
  foreign key (reconciliation_id, user_id) references public.reconciliations(id, user_id) on delete cascade,
  foreign key (transaction_id, user_id) references public.transactions(id, user_id) on delete cascade
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index financial_accounts_user_id_idx on public.financial_accounts(user_id);
create index categories_user_id_idx on public.categories(user_id);
create index merchant_rules_user_id_idx on public.merchant_rules(user_id);
create index import_presets_user_id_idx on public.import_presets(user_id);
create index import_batches_user_id_idx on public.import_batches(user_id);
create index import_rows_user_id_idx on public.import_rows(user_id);
create index transactions_user_id_idx on public.transactions(user_id);
create index transactions_user_date_idx on public.transactions(user_id, occurred_on desc);
create index transactions_account_idx on public.transactions(account_id);
create index transactions_fingerprint_idx on public.transactions(user_id, source_fingerprint) where source_fingerprint is not null;
create index reconciliations_user_id_idx on public.reconciliations(user_id);
create index reconciliation_members_user_id_idx on public.reconciliation_members(user_id);
create index reconciliation_members_transaction_idx on public.reconciliation_members(transaction_id);
create index audit_events_user_id_idx on public.audit_events(user_id);

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  display_value text;
begin
  display_value := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1));
  insert into public.profiles (user_id, email, display_name) values (new.id, new.email, rpad(left(display_value, 50), 2, '_'));
  insert into public.categories (user_id, name, color, is_income, is_system, sort_order) values
    (new.id, 'Income', '#31b87b', true, true, 10),
    (new.id, 'Housing', '#7657ff', false, true, 20),
    (new.id, 'Food & dining', '#ff7b63', false, true, 30),
    (new.id, 'Transportation', '#4d8cf7', false, true, 40),
    (new.id, 'Fun & fitness', '#f0b72f', false, true, 50),
    (new.id, 'Utilities', '#5cc8be', false, true, 60),
    (new.id, 'Shopping', '#e96ca9', false, true, 70),
    (new.id, 'Insurance', '#8a98a8', false, true, 80),
    (new.id, 'Transfer', '#aeb7b0', false, true, 90),
    (new.id, 'Other', '#aeb7b0', false, true, 100);
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure private.handle_new_user();

create or replace function public.commit_statement_import(
  p_import_id uuid, p_account_id uuid, p_file_name text, p_storage_path text,
  p_file_hash text, p_content_type text, p_file_size integer, p_candidates jsonb
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  current_user_id uuid := (select auth.uid());
  candidate jsonb;
  row_id uuid;
  transaction_id uuid;
  other_category_id uuid;
  selected_category_id uuid;
  selected_merchant text;
begin
  if current_user_id is null or not exists (select 1 from public.profiles where user_id = current_user_id and status = 'active') then raise exception 'Account is not active'; end if;
  if not exists (select 1 from public.financial_accounts where id = p_account_id and user_id = current_user_id) then raise exception 'Account not found'; end if;
  select id into other_category_id from public.categories where user_id = current_user_id and name = 'Other';
  insert into public.import_batches (id, user_id, account_id, status, file_name, storage_path, content_type, file_size, file_hash, row_count, committed_at)
  values (p_import_id, current_user_id, p_account_id, 'committed', p_file_name, p_storage_path, p_content_type, p_file_size, p_file_hash, jsonb_array_length(p_candidates), now());
  for candidate in select value from jsonb_array_elements(p_candidates)
  loop
    row_id := gen_random_uuid(); transaction_id := gen_random_uuid();
    selected_category_id := null; selected_merchant := null;
    select mr.category_id, coalesce(nullif(mr.normalized_merchant, ''), candidate ->> 'description')
      into selected_category_id, selected_merchant
      from public.merchant_rules mr
      join public.categories c on c.id = mr.category_id and c.user_id = current_user_id
      where mr.user_id = current_user_id
        and lower(candidate ->> 'description') like '%' || lower(mr.match_text) || '%'
      order by char_length(mr.match_text) desc
      limit 1;
    selected_category_id := coalesce(selected_category_id, other_category_id);
    selected_merchant := coalesce(selected_merchant, candidate ->> 'description');
    insert into public.import_rows (id, user_id, import_batch_id, row_number, raw_payload, confidence, review_errors)
    values (row_id, current_user_id, p_import_id, (candidate ->> 'rowNumber')::integer, candidate -> 'raw', (candidate ->> 'confidence')::integer, array(select jsonb_array_elements_text(candidate -> 'errors')));
    insert into public.transactions (id, user_id, account_id, import_row_id, source, occurred_on, description_raw, merchant_normalized, amount_cents, category_id, source_fingerprint)
    values (transaction_id, current_user_id, p_account_id, row_id, 'import', (candidate ->> 'date')::date, candidate ->> 'description', selected_merchant, (candidate ->> 'amountCents')::bigint, selected_category_id, encode(extensions.digest(concat_ws('|', p_account_id::text, candidate ->> 'date', candidate ->> 'amountCents', lower(candidate ->> 'description')), 'sha256'), 'hex'));
  end loop;
  insert into public.audit_events (user_id, action, entity_type, entity_id, details) values (current_user_id, 'import.committed', 'import_batch', p_import_id, jsonb_build_object('row_count', jsonb_array_length(p_candidates)));
  return p_import_id;
end;
$$;
revoke all on function public.commit_statement_import(uuid, uuid, text, text, text, text, integer, jsonb) from public, anon;
grant execute on function public.commit_statement_import(uuid, uuid, text, text, text, text, integer, jsonb) to authenticated;

create or replace function public.set_reconciliation_status(p_reconciliation_id uuid, p_status text)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  current_user_id uuid := (select auth.uid());
  link_record public.reconciliations%rowtype;
  anchor_record record;
  anchor_total bigint;
  offset_total bigint;
begin
  if p_status not in ('suggested', 'confirmed', 'dismissed') then raise exception 'Invalid reconciliation status'; end if;
  select * into link_record from public.reconciliations where id = p_reconciliation_id and user_id = current_user_id;
  if link_record.id is null then raise exception 'Reconciliation not found'; end if;
  if p_status = 'confirmed' and link_record.type in ('reimbursement', 'refund') then
    select coalesce(sum(allocation_cents), 0) into anchor_total from public.reconciliation_members where reconciliation_id = p_reconciliation_id and role = 'anchor';
    select coalesce(sum(allocation_cents), 0) into offset_total from public.reconciliation_members where reconciliation_id = p_reconciliation_id and role = 'offset';
    if anchor_total <> offset_total then raise exception 'Allocated anchors and offsets must balance'; end if;
    for anchor_record in select transaction_id, allocation_cents from public.reconciliation_members where reconciliation_id = p_reconciliation_id and role = 'anchor'
    loop
      if anchor_record.allocation_cents + coalesce((
        select sum(m.allocation_cents) from public.reconciliation_members m
        join public.reconciliations r on r.id = m.reconciliation_id
        where m.transaction_id = anchor_record.transaction_id and m.role = 'anchor' and r.status = 'confirmed' and r.id <> p_reconciliation_id
      ), 0) > (select abs(amount_cents) from public.transactions where id = anchor_record.transaction_id) then
        raise exception 'Offsets cannot exceed the original expense';
      end if;
    end loop;
    for anchor_record in select transaction_id, allocation_cents from public.reconciliation_members where reconciliation_id = p_reconciliation_id and role = 'offset'
    loop
      if anchor_record.allocation_cents + coalesce((
        select sum(m.allocation_cents) from public.reconciliation_members m
        join public.reconciliations r on r.id = m.reconciliation_id
        where m.transaction_id = anchor_record.transaction_id and m.role = 'offset' and r.status = 'confirmed' and r.id <> p_reconciliation_id
      ), 0) > (select abs(amount_cents) from public.transactions where id = anchor_record.transaction_id) then
        raise exception 'Allocations cannot exceed the reimbursement or refund inflow';
      end if;
    end loop;
  end if;
  update public.reconciliations set status = p_status::public.link_status, decided_at = case when p_status = 'suggested' then null else now() end where id = p_reconciliation_id and user_id = current_user_id;
  insert into public.audit_events (user_id, action, entity_type, entity_id, details) values (current_user_id, 'reconciliation.' || p_status, 'reconciliation', p_reconciliation_id, jsonb_build_object('status', p_status));
end;
$$;
revoke all on function public.set_reconciliation_status(uuid, text) from public, anon;
grant execute on function public.set_reconciliation_status(uuid, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.categories enable row level security;
alter table public.merchant_rules enable row level security;
alter table public.import_presets enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;
alter table public.transactions enable row level security;
alter table public.reconciliations enable row level security;
alter table public.reconciliation_members enable row level security;
alter table public.audit_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.financial_accounts, public.categories, public.merchant_rules, public.import_presets, public.import_batches, public.import_rows, public.transactions, public.reconciliations, public.reconciliation_members to authenticated;
grant select, insert on public.audit_events to authenticated;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);

create policy "accounts_select_own" on public.financial_accounts for select to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
create policy "accounts_insert_own" on public.financial_accounts for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
create policy "accounts_update_own" on public.financial_accounts for update to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active')) with check ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
create policy "accounts_delete_own" on public.financial_accounts for delete to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));

create policy "categories_select_own" on public.categories for select to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
create policy "categories_insert_own" on public.categories for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
create policy "categories_update_own" on public.categories for update to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active')) with check ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
create policy "categories_delete_own" on public.categories for delete to authenticated using ((select auth.uid()) = user_id and not is_system and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));

create policy "merchant_rules_own" on public.merchant_rules for all to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active')) with check ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
create policy "import_presets_own" on public.import_presets for all to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active')) with check ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
create policy "import_batches_own" on public.import_batches for all to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active')) with check ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
create policy "import_rows_own" on public.import_rows for all to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active')) with check ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
create policy "transactions_own" on public.transactions for all to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active')) with check ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
create policy "reconciliations_own" on public.reconciliations for all to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active')) with check ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
create policy "reconciliation_members_own" on public.reconciliation_members for all to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active')) with check ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
create policy "audit_select_own" on public.audit_events for select to authenticated using ((select auth.uid()) = user_id);
create policy "audit_insert_own" on public.audit_events for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('statements', 'statements', false, 20971520, array['text/csv', 'application/csv', 'application/pdf', 'application/vnd.ms-excel'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "statement_files_select_own" on storage.objects for select to authenticated using (bucket_id = 'statements' and (storage.foldername(name))[1] = (select auth.uid())::text and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
create policy "statement_files_insert_own" on storage.objects for insert to authenticated with check (bucket_id = 'statements' and (storage.foldername(name))[1] = (select auth.uid())::text and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
create policy "statement_files_delete_own" on storage.objects for delete to authenticated using (bucket_id = 'statements' and (storage.foldername(name))[1] = (select auth.uid())::text and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.status = 'active'));
