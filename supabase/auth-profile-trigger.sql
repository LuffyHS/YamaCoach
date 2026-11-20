-- Execute in the Supabase SQL Editor. Safe to run more than once.
-- Also repairs existing Auth users that have no corresponding public profile.
alter table public.profiles
  add column if not exists subscription_status text not null default 'inactive';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active, subscription_status)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    'student'::public.user_role,
    false,
    'inactive'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A user who signed up before the trigger was installed is backfilled here.
insert into public.profiles (id, email, full_name, role, is_active, subscription_status)
select
  u.id,
  u.email,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
  'student'::public.user_role,
  false,
  'inactive'
from auth.users as u
where u.email is not null
on conflict (id) do nothing;
