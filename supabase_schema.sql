-- QUALITY SUMMARY BETA 0.2.0
-- Secure multi-tenant schema
-- IMPORTANT: this rebuilds ONLY the public Quality Summary tables.
-- Supabase Auth users are NOT deleted.

create extension if not exists pgcrypto;

-- Clean previous Beta public objects so the schema is deterministic.
drop table if exists public.production_records cascade;
drop table if exists public.defects cascade;
drop table if exists public.operations cascade;
drop table if exists public.part_numbers cascade;
drop table if exists public.clients cascade;
drop table if exists public.profiles cascade;
drop table if exists public.companies cascade;

drop function if exists public.current_company_id() cascade;
drop function if exists public.current_app_role() cascade;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(name)
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  display_name text,
  role text not null default 'viewer' check (role in ('admin','editor','operator','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where user_id = auth.uid() and active = true limit 1
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid() and active = true limit 1
$$;

grant execute on function public.current_company_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, name)
);

create table public.part_numbers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  number text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, client_id, number)
);

create table public.operations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  part_id uuid not null references public.part_numbers(id) on delete cascade,
  code text not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, part_id, code)
);

create table public.defects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  part_id uuid not null references public.part_numbers(id) on delete cascade,
  operation_id uuid references public.operations(id) on delete restrict,
  code text not null,
  name text not null,
  category text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, part_id, code)
);

create table public.production_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  record_date date not null,
  shift text not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  part_id uuid not null references public.part_numbers(id) on delete restrict,
  operation_id uuid references public.operations(id) on delete restrict,
  defect_id uuid references public.defects(id) on delete restrict,
  produced integer not null check (produced > 0),
  scrap integer not null default 0 check (scrap >= 0 and scrap <= produced),
  operation_label text,
  notes text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_profiles_company on public.profiles(company_id);
create index idx_clients_company on public.clients(company_id);
create index idx_parts_company_client on public.part_numbers(company_id, client_id);
create index idx_operations_company_part on public.operations(company_id, part_id);
create index idx_defects_company_part on public.defects(company_id, part_id);
create index idx_defects_operation on public.defects(operation_id);
create index idx_records_company_date on public.production_records(company_id, record_date);
create index idx_records_part on public.production_records(part_id);
create index idx_records_defect on public.production_records(defect_id);

-- Validate that all linked records belong to the same tenant.
create or replace function public.validate_quality_summary_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare linked_company uuid;
begin
  if tg_table_name = 'part_numbers' then
    select company_id into linked_company from public.clients where id = new.client_id;
    if linked_company is distinct from new.company_id then raise exception 'Client belongs to another company'; end if;
  elsif tg_table_name = 'operations' then
    select company_id into linked_company from public.part_numbers where id = new.part_id;
    if linked_company is distinct from new.company_id then raise exception 'Part belongs to another company'; end if;
  elsif tg_table_name = 'defects' then
    select company_id into linked_company from public.part_numbers where id = new.part_id;
    if linked_company is distinct from new.company_id then raise exception 'Part belongs to another company'; end if;
    if new.operation_id is not null then
      select company_id into linked_company from public.operations where id = new.operation_id and part_id = new.part_id;
      if linked_company is distinct from new.company_id then raise exception 'Operation belongs to another company or part'; end if;
    end if;
  elsif tg_table_name = 'production_records' then
    select company_id into linked_company from public.clients where id = new.client_id;
    if linked_company is distinct from new.company_id then raise exception 'Client belongs to another company'; end if;
    select company_id into linked_company from public.part_numbers where id = new.part_id and client_id = new.client_id;
    if linked_company is distinct from new.company_id then raise exception 'Part belongs to another company or client'; end if;
    if new.operation_id is not null then
      select company_id into linked_company from public.operations where id = new.operation_id and part_id = new.part_id;
      if linked_company is distinct from new.company_id then raise exception 'Operation belongs to another company or part'; end if;
    end if;
    if new.defect_id is not null then
      select company_id into linked_company from public.defects where id = new.defect_id and part_id = new.part_id;
      if linked_company is distinct from new.company_id then raise exception 'Defect belongs to another company or part'; end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_part_company before insert or update on public.part_numbers for each row execute function public.validate_quality_summary_company();
create trigger validate_operation_company before insert or update on public.operations for each row execute function public.validate_quality_summary_company();
create trigger validate_defect_company before insert or update on public.defects for each row execute function public.validate_quality_summary_company();
create trigger validate_record_company before insert or update on public.production_records for each row execute function public.validate_quality_summary_company();

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.part_numbers enable row level security;
alter table public.operations enable row level security;
alter table public.defects enable row level security;
alter table public.production_records enable row level security;

-- Company is visible ONLY to users assigned to it.
create policy companies_select_own on public.companies
for select to authenticated
using (id = public.current_company_id());

-- A user can read their own profile. Admins can also read profiles in their own company.
create policy profiles_select_company on public.profiles
for select to authenticated
using (
  user_id = auth.uid()
  or (company_id = public.current_company_id() and public.current_app_role() = 'admin')
);

-- Business data: select only own tenant.
create policy clients_select_own on public.clients for select to authenticated using (company_id = public.current_company_id());
create policy parts_select_own on public.part_numbers for select to authenticated using (company_id = public.current_company_id());
create policy operations_select_own on public.operations for select to authenticated using (company_id = public.current_company_id());
create policy defects_select_own on public.defects for select to authenticated using (company_id = public.current_company_id());
create policy records_select_own on public.production_records for select to authenticated using (company_id = public.current_company_id());

-- Master data writes: admin/editor only.
create policy clients_insert_own on public.clients for insert to authenticated with check (company_id = public.current_company_id() and public.current_app_role() in ('admin','editor'));
create policy clients_update_own on public.clients for update to authenticated using (company_id = public.current_company_id() and public.current_app_role() in ('admin','editor')) with check (company_id = public.current_company_id());
create policy clients_delete_own on public.clients for delete to authenticated using (company_id = public.current_company_id() and public.current_app_role() = 'admin');

create policy parts_insert_own on public.part_numbers for insert to authenticated with check (company_id = public.current_company_id() and public.current_app_role() in ('admin','editor'));
create policy parts_update_own on public.part_numbers for update to authenticated using (company_id = public.current_company_id() and public.current_app_role() in ('admin','editor')) with check (company_id = public.current_company_id());
create policy parts_delete_own on public.part_numbers for delete to authenticated using (company_id = public.current_company_id() and public.current_app_role() = 'admin');

create policy operations_insert_own on public.operations for insert to authenticated with check (company_id = public.current_company_id() and public.current_app_role() in ('admin','editor'));
create policy operations_update_own on public.operations for update to authenticated using (company_id = public.current_company_id() and public.current_app_role() in ('admin','editor')) with check (company_id = public.current_company_id());
create policy operations_delete_own on public.operations for delete to authenticated using (company_id = public.current_company_id() and public.current_app_role() = 'admin');

create policy defects_insert_own on public.defects for insert to authenticated with check (company_id = public.current_company_id() and public.current_app_role() in ('admin','editor'));
create policy defects_update_own on public.defects for update to authenticated using (company_id = public.current_company_id() and public.current_app_role() in ('admin','editor')) with check (company_id = public.current_company_id());
create policy defects_delete_own on public.defects for delete to authenticated using (company_id = public.current_company_id() and public.current_app_role() = 'admin');

-- Production capture: operator/editor/admin can add/update; only admin/editor can delete.
create policy records_insert_own on public.production_records for insert to authenticated with check (company_id = public.current_company_id() and public.current_app_role() in ('admin','editor','operator'));
create policy records_update_own on public.production_records for update to authenticated using (company_id = public.current_company_id() and public.current_app_role() in ('admin','editor','operator')) with check (company_id = public.current_company_id());
create policy records_delete_own on public.production_records for delete to authenticated using (company_id = public.current_company_id() and public.current_app_role() in ('admin','editor'));

grant select on public.companies, public.profiles, public.clients, public.part_numbers, public.operations, public.defects, public.production_records to authenticated;
grant insert, update, delete on public.clients, public.part_numbers, public.operations, public.defects, public.production_records to authenticated;

-- Realtime intentionally remains disabled for Beta 0.2.0.
