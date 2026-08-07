-- RUN THIS AFTER supabase_schema.sql
-- Replace BOTH values below before pressing Run.
-- This does NOT expose the company to other tenants; it only links your Auth user.

do $$
declare
  v_company_id uuid;
  v_user_id uuid;
  v_company_name text := 'REPLACE_WITH_YOUR_COMPANY_NAME';
  v_user_email text := 'REPLACE_WITH_YOUR_AUTH_EMAIL';
begin
  select id into v_user_id from auth.users where lower(email) = lower(v_user_email) limit 1;
  if v_user_id is null then
    raise exception 'Auth user % was not found', v_user_email;
  end if;

  insert into public.companies(name, code)
  values (v_company_name, 'MAIN')
  returning id into v_company_id;

  insert into public.profiles(user_id, company_id, display_name, role)
  values (v_user_id, v_company_id, split_part(v_user_email, '@', 1), 'admin');
end $$;
