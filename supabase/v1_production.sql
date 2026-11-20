create extension if not exists pgcrypto;
alter table public.profiles add column if not exists riot_id text;
alter table public.profiles add column if not exists setup jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists recurring_errors text not null default '';
alter table public.profiles add column if not exists subscription_status text not null default 'inactive';
alter table public.profiles add column if not exists tracker_url text;
alter table public.profiles add column if not exists rank_goal_start text;
update public.profiles set rank_goal_start=current_rank where rank_goal_start is null and target_rank is not null and current_rank is not null;
alter table public.training_routines add column if not exists youtube_url text;
alter table public.live_sessions add column if not exists student_ids uuid[] not null default '{}'::uuid[];
update public.live_sessions set student_ids=array[student_id] where cardinality(student_ids)=0;
alter table public.live_sessions drop constraint if exists live_sessions_student_ids_limit;
alter table public.live_sessions add constraint live_sessions_student_ids_limit check(cardinality(student_ids) between 1 and 6);
alter table public.rank_history add column if not exists coach_id uuid references public.profiles(id) on delete set null;
create table if not exists public.calendar_events(id uuid primary key default gen_random_uuid(),student_id uuid not null references public.profiles(id) on delete cascade,coach_id uuid not null references public.profiles(id),title text not null,kind text not null check(kind in ('live','vod','training')),starts_at timestamptz not null,notes text not null default '',created_at timestamptz not null default now());
create table if not exists public.subscriptions_pix(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,pix_key text not null,receipt_url text,coupon_id uuid references public.coupons(id),coupon_code text,status text not null default 'pending' check(status in ('pending','approved','rejected')),created_at timestamptz not null default now(),reviewed_at timestamptz,reviewed_by uuid references public.profiles(id));
alter table public.subscriptions_pix add column if not exists coupon_code text;
alter table public.coupons add column if not exists max_redemptions_per_user int not null default 1;
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists routines_student_date_idx on public.training_routines(student_id,scheduled_for);
create index if not exists vod_reviews_student_created_idx on public.vod_reviews(student_id,created_at desc);
create index if not exists calendar_events_student_date_idx on public.calendar_events(student_id,starts_at);
create index if not exists subscriptions_pix_status_created_idx on public.subscriptions_pix(status,created_at desc);
alter table public.profiles enable row level security;
alter table public.subscriptions_pix enable row level security;
alter table public.calendar_events enable row level security;
create or replace function public.is_coach() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='coach') $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.profiles(id,email,full_name,role,is_active,subscription_status) values(new.id,new.email,coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),split_part(new.email,'@',1)),'student'::public.user_role,false,'inactive') on conflict(id) do update set email=excluded.email; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
do $$ declare t text; begin foreach t in array array['training_routines','vod_reviews','live_sessions','calendar_events'] loop execute format('drop policy if exists %I on public.%I',t||'_v1_access',t); execute format('create policy %I on public.%I for all using (student_id=auth.uid() or coach_id=auth.uid() or public.is_coach()) with check (student_id=auth.uid() or coach_id=auth.uid() or public.is_coach())',t||'_v1_access',t); end loop; end $$;
drop policy if exists rank_access on public.rank_history;
drop policy if exists rank_history_v1_access on public.rank_history;
drop policy if exists rank_history_read on public.rank_history;
drop policy if exists rank_history_coach_insert on public.rank_history;
create policy rank_history_read on public.rank_history for select using(student_id=auth.uid() or public.is_coach());
create policy rank_history_coach_insert on public.rank_history for insert with check(student_id=auth.uid() or (public.is_coach() and (coach_id=auth.uid() or coach_id is null)));
drop policy if exists profiles_v1_read on public.profiles;
create policy profiles_v1_read on public.profiles for select using(id=auth.uid() or public.is_coach() or coach_id=auth.uid());
drop policy if exists profiles_v1_update on public.profiles;
create policy profiles_v1_update on public.profiles for update using(id=auth.uid() or public.is_coach()) with check(id=auth.uid() or public.is_coach());
drop policy if exists subscriptions_pix_v1 on public.subscriptions_pix;
drop policy if exists subscriptions_pix_student_read on public.subscriptions_pix;
drop policy if exists subscriptions_pix_student_insert on public.subscriptions_pix;
drop policy if exists subscriptions_pix_coach_update on public.subscriptions_pix;
drop policy if exists subscriptions_pix_coach_delete on public.subscriptions_pix;
create policy subscriptions_pix_student_read on public.subscriptions_pix for select using(user_id=auth.uid() or public.is_coach());
create policy subscriptions_pix_student_insert on public.subscriptions_pix for insert with check(user_id=auth.uid() and status='pending');
create policy subscriptions_pix_coach_update on public.subscriptions_pix for update using(public.is_coach()) with check(public.is_coach());
create policy subscriptions_pix_coach_delete on public.subscriptions_pix for delete using(public.is_coach());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('receipts','receipts',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists receipts_upload_own_folder on storage.objects;
create policy receipts_upload_own_folder on storage.objects for insert to authenticated with check(bucket_id='receipts' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists receipts_read_coach_or_owner on storage.objects;
create policy receipts_read_coach_or_owner on storage.objects for select to authenticated using(bucket_id='receipts' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_coach()));
drop policy if exists coupons_v1_read on public.coupons;
create policy coupons_v1_read on public.coupons for select using(active);
drop policy if exists coupon_redemptions_v1 on public.coupon_redemptions;
create policy coupon_redemptions_v1 on public.coupon_redemptions for select using(user_id=auth.uid() or public.is_coach());

-- Review the proof, access period, profile and subscription in one transaction.
create or replace function public.review_pix_payment(p_payment_id uuid,p_decision text)
returns void language plpgsql security definer set search_path=public
as $$
declare payment_user_id uuid; expiry timestamptz; payment_coupon_id uuid;
begin
  if auth.uid() is null or not public.is_coach() then
    raise exception 'forbidden';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception 'invalid decision';
  end if;
  select user_id,coupon_id into payment_user_id,payment_coupon_id
  from public.subscriptions_pix
  where id=p_payment_id and status='pending'
  for update;
  if not found then
    raise exception 'payment not found or already reviewed';
  end if;

  update public.subscriptions_pix
  set status=p_decision,reviewed_at=now(),reviewed_by=auth.uid()
  where id=p_payment_id;

  if p_decision='approved' then
    if payment_coupon_id is not null then
      perform 1 from public.coupons where id=payment_coupon_id for update;
      if not found then raise exception 'coupon not found'; end if;
      if exists(select 1 from public.coupon_redemptions where coupon_id=payment_coupon_id and user_id=payment_user_id) then
        raise exception 'coupon already redeemed by this user';
      end if;
      insert into public.coupon_redemptions(coupon_id,user_id) values(payment_coupon_id,payment_user_id);
    end if;
    expiry=now()+interval '30 days';
    update public.profiles
    set is_active=true,subscription_status='active',subscription_expires_at=expiry
    where id=payment_user_id;
    update public.subscriptions
    set status='inactive'
    where user_id=payment_user_id and status='active';
    insert into public.subscriptions(user_id,status,plan_type,expires_at)
    values(payment_user_id,'active','pix',expiry);
  else
    update public.profiles
    set is_active=false,subscription_status='inactive'
    where id=payment_user_id;
    update public.subscriptions
    set status='inactive'
    where user_id=payment_user_id and status='active';
  end if;
end
$$;
revoke all on function public.review_pix_payment(uuid,text) from public;
grant execute on function public.review_pix_payment(uuid,text) to authenticated;

-- Coach managed Pix price and promotional coupons.
create table if not exists public.billing_settings(
  id smallint primary key default 1 check(id=1),
  monthly_price_cents integer not null default 19700 check(monthly_price_cents between 100 and 5000000),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
insert into public.billing_settings(id,monthly_price_cents) values(1,19700) on conflict(id) do nothing;
alter table public.billing_settings enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
drop policy if exists billing_settings_read on public.billing_settings;
create policy billing_settings_read on public.billing_settings for select to authenticated using(true);
drop policy if exists billing_settings_coach_insert on public.billing_settings;
create policy billing_settings_coach_insert on public.billing_settings for insert to authenticated with check(public.is_coach());
drop policy if exists billing_settings_coach_update on public.billing_settings;
create policy billing_settings_coach_update on public.billing_settings for update to authenticated using(public.is_coach()) with check(public.is_coach());

alter table public.coupons add column if not exists max_redemptions_per_user integer not null default 1;
alter table public.coupons add column if not exists created_at timestamptz not null default now();
alter table public.subscriptions_pix add column if not exists coupon_id uuid references public.coupons(id);
alter table public.subscriptions_pix add column if not exists amount_cents integer not null default 19700;
create index if not exists subscriptions_pix_coupon_status_idx on public.subscriptions_pix(coupon_id,status);
drop policy if exists coupons_v1_read on public.coupons;
drop policy if exists coupons_read on public.coupons;
create policy coupons_read on public.coupons for select to authenticated using(active or public.is_coach());
drop policy if exists coupons_coach_insert on public.coupons;
create policy coupons_coach_insert on public.coupons for insert to authenticated with check(public.is_coach());
drop policy if exists coupons_coach_update on public.coupons;
create policy coupons_coach_update on public.coupons for update to authenticated using(public.is_coach()) with check(public.is_coach());
drop policy if exists coupons_coach_delete on public.coupons;
create policy coupons_coach_delete on public.coupons for delete to authenticated using(public.is_coach());

create or replace function public.guard_pix_amount() returns trigger
language plpgsql security definer set search_path=public
as $$
declare base_price integer; discount_percent integer;
begin
  if auth.uid() is not null and auth.uid() <> new.user_id then raise exception 'payment owner mismatch'; end if;
  select monthly_price_cents into base_price from public.billing_settings where id=1;
  base_price=coalesce(base_price,19700);
  if new.coupon_id is null then
    if new.coupon_code is not null then raise exception 'invalid coupon reference'; end if;
    new.amount_cents=base_price;
  else
    select percent_off into discount_percent from public.coupons
    where id=new.coupon_id and active=true and upper(code)=upper(new.coupon_code)
      and (expires_at is null or expires_at>now())
    for share;
    if not found then raise exception 'coupon invalid or expired'; end if;
    if exists(select 1 from public.coupon_redemptions where coupon_id=new.coupon_id and user_id=new.user_id) then
      raise exception 'coupon already redeemed by this user';
    end if;
    new.amount_cents=round(base_price*(100-discount_percent)/100.0)::integer;
  end if;
  return new;
end
$$;
drop trigger if exists guard_pix_amount on public.subscriptions_pix;
create trigger guard_pix_amount before insert on public.subscriptions_pix
for each row execute function public.guard_pix_amount();

create or replace function public.guard_profile_updates() returns trigger
language plpgsql security invoker set search_path=public
as $$
begin
  if auth.uid() is null or public.is_coach() then return new; end if;
  if auth.uid() <> old.id
    or new.id is distinct from old.id
    or new.email is distinct from old.email
    or new.role is distinct from old.role
    or new.coach_id is distinct from old.coach_id
    or new.is_active is distinct from old.is_active
    or new.subscription_status is distinct from old.subscription_status
    or new.subscription_expires_at is distinct from old.subscription_expires_at
    or new.target_rank is distinct from old.target_rank
    or new.rank_goal_start is distinct from old.rank_goal_start
    or new.recurring_errors is distinct from old.recurring_errors
  then raise exception 'profile fields require coach authorization'; end if;
  if new.current_rank is not null and new.current_rank not in ('Ferro 1','Ferro 2','Ferro 3','Bronze 1','Bronze 2','Bronze 3','Prata 1','Prata 2','Prata 3','Ouro 1','Ouro 2','Ouro 3','Platina 1','Platina 2','Platina 3','Diamante 1','Diamante 2','Diamante 3','Ascendente 1','Ascendente 2','Ascendente 3','Imortal 1','Imortal 2','Imortal 3','Radiante') then
    raise exception 'invalid current rank';
  end if;
  return new;
end
$$;
drop trigger if exists guard_profile_updates on public.profiles;
create trigger guard_profile_updates before update on public.profiles
for each row execute function public.guard_profile_updates();

-- Replace broad demo-era policies with role-specific permissions.
drop policy if exists routines_access on public.training_routines;
drop policy if exists training_routines_v1_access on public.training_routines;
drop policy if exists routines_read on public.training_routines;
drop policy if exists routines_coach_insert on public.training_routines;
drop policy if exists routines_owner_update on public.training_routines;
drop policy if exists routines_coach_delete on public.training_routines;
create policy routines_read on public.training_routines for select
using(student_id=auth.uid() or coach_id=auth.uid() or public.is_coach());
create policy routines_coach_insert on public.training_routines for insert
with check(public.is_coach() and coach_id=auth.uid());
create policy routines_owner_update on public.training_routines for update
using(student_id=auth.uid() or public.is_coach())
with check(student_id=auth.uid() or public.is_coach());
create policy routines_coach_delete on public.training_routines for delete
using(coach_id=auth.uid() or public.is_coach());

create or replace function public.guard_routine_updates() returns trigger
language plpgsql security invoker set search_path=public
as $$
begin
  if auth.uid() is null or public.is_coach() then return new; end if;
  if auth.uid() <> old.student_id
    or new.id is distinct from old.id
    or new.student_id is distinct from old.student_id
    or new.coach_id is distinct from old.coach_id
    or new.title is distinct from old.title
    or new.category is distinct from old.category
    or new.description is distinct from old.description
    or new.youtube_url is distinct from old.youtube_url
    or new.scheduled_for is distinct from old.scheduled_for
    or new.created_at is distinct from old.created_at
  then raise exception 'routine fields require coach authorization'; end if;
  return new;
end
$$;
drop trigger if exists guard_routine_updates on public.training_routines;
create trigger guard_routine_updates before update on public.training_routines
for each row execute function public.guard_routine_updates();

drop policy if exists vods_access on public.vod_reviews;
drop policy if exists vod_reviews_v1_access on public.vod_reviews;
drop policy if exists vods_read on public.vod_reviews;
drop policy if exists vods_student_insert on public.vod_reviews;
drop policy if exists vods_coach_update on public.vod_reviews;
drop policy if exists vods_coach_delete on public.vod_reviews;
create policy vods_read on public.vod_reviews for select
using(student_id=auth.uid() or coach_id=auth.uid() or public.is_coach());
create policy vods_student_insert on public.vod_reviews for insert
with check(student_id=auth.uid());
create policy vods_coach_update on public.vod_reviews for update
using(coach_id=auth.uid() or public.is_coach())
with check(coach_id=auth.uid() or public.is_coach());
create policy vods_coach_delete on public.vod_reviews for delete
using(coach_id=auth.uid() or public.is_coach());

drop policy if exists live_access on public.live_sessions;
drop policy if exists live_sessions_v1_access on public.live_sessions;
drop policy if exists live_sessions_read on public.live_sessions;
drop policy if exists live_sessions_coach_insert on public.live_sessions;
drop policy if exists live_sessions_owner_update on public.live_sessions;
drop policy if exists live_sessions_coach_delete on public.live_sessions;
create policy live_sessions_read on public.live_sessions for select
using(student_id=auth.uid() or coach_id=auth.uid() or public.is_coach());
create policy live_sessions_coach_insert on public.live_sessions for insert
with check(public.is_coach() and coach_id=auth.uid());
create policy live_sessions_owner_update on public.live_sessions for update
using(student_id=auth.uid() or coach_id=auth.uid() or public.is_coach())
with check(student_id=auth.uid() or coach_id=auth.uid() or public.is_coach());
create policy live_sessions_coach_delete on public.live_sessions for delete
using(coach_id=auth.uid() or public.is_coach());

create or replace function public.guard_live_session_updates() returns trigger
language plpgsql security invoker set search_path=public
as $$
begin
  if auth.uid() is null or public.is_coach() or auth.uid()=old.coach_id then
    if new.id is distinct from old.id or new.student_id is distinct from old.student_id or new.student_ids is distinct from old.student_ids or new.coach_id is distinct from old.coach_id then
      raise exception 'session ownership is immutable';
    end if;
    return new;
  end if;
  if auth.uid() <> old.student_id
    or new.id is distinct from old.id
    or new.student_id is distinct from old.student_id
    or new.student_ids is distinct from old.student_ids
    or new.coach_id is distinct from old.coach_id
    or new.title is distinct from old.title
    or new.stream_url is distinct from old.stream_url
    or new.scheduled_at is distinct from old.scheduled_at
    or new.status is distinct from old.status
    or new.created_at is distinct from old.created_at
  then raise exception 'session fields require coach authorization'; end if;
  return new;
end
$$;
drop trigger if exists guard_live_session_updates on public.live_sessions;
create trigger guard_live_session_updates before update on public.live_sessions
for each row execute function public.guard_live_session_updates();

-- Group room support: every listed student can read the room; coach remains the only owner.
drop policy if exists live_sessions_read on public.live_sessions;
create policy live_sessions_read on public.live_sessions for select
using(student_id=auth.uid() or auth.uid()=any(student_ids) or coach_id=auth.uid() or public.is_coach());
drop policy if exists live_sessions_owner_update on public.live_sessions;
create policy live_sessions_owner_update on public.live_sessions for update
using(student_id=auth.uid() or auth.uid()=any(student_ids) or coach_id=auth.uid() or public.is_coach())
with check(student_id=auth.uid() or auth.uid()=any(student_ids) or coach_id=auth.uid() or public.is_coach());

drop policy if exists calendar_events_access on public.calendar_events;
drop policy if exists calendar_events_v1_access on public.calendar_events;
drop policy if exists calendar_events_read on public.calendar_events;
drop policy if exists calendar_events_create on public.calendar_events;
create policy calendar_events_read on public.calendar_events for select
using(student_id=auth.uid() or coach_id=auth.uid() or public.is_coach());
create policy calendar_events_create on public.calendar_events for insert
with check(
  (public.is_coach() and coach_id=auth.uid())
  or (student_id=auth.uid() and coach_id=(select coach_id from public.profiles where id=auth.uid()))
);
