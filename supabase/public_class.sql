-- Apply once in the Supabase SQL Editor to enable the open class room.
-- Safe to rerun.
alter table public.live_sessions
  add column if not exists is_public boolean not null default false;

create index if not exists live_sessions_public_status_idx
  on public.live_sessions(is_public, status)
  where is_public = true;

drop policy if exists live_sessions_read on public.live_sessions;
create policy live_sessions_read on public.live_sessions for select
using (
  student_id = auth.uid()
  or auth.uid() = any(student_ids)
  or coach_id = auth.uid()
  or public.is_coach()
  or (
    is_public
    and status in ('scheduled', 'live')
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'student'
        and p.is_active
        and p.subscription_expires_at > now()
    )
  )
);

drop policy if exists live_sessions_owner_update on public.live_sessions;
create policy live_sessions_owner_update on public.live_sessions for update
using (
  student_id = auth.uid()
  or auth.uid() = any(student_ids)
  or coach_id = auth.uid()
  or public.is_coach()
  or (
    is_public
    and status in ('scheduled', 'live')
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'student'
        and p.is_active
        and p.subscription_expires_at > now()
    )
  )
)
with check (
  student_id = auth.uid()
  or auth.uid() = any(student_ids)
  or coach_id = auth.uid()
  or public.is_coach()
  or (
    is_public
    and status in ('scheduled', 'live')
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'student'
        and p.is_active
        and p.subscription_expires_at > now()
    )
  )
);
