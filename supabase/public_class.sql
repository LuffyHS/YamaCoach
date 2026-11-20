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

-- Private Realtime authorization: only the room coach or an active student can join.
drop policy if exists live_session_channels_read on realtime.messages;
create policy live_session_channels_read on realtime.messages
for select to authenticated
using (
  extension in ('broadcast', 'presence')
  and exists (
    select 1 from public.live_sessions ls
    where ls.id::text = substring((select realtime.topic()) from 14)
      and (
        ls.coach_id = (select auth.uid())
        or (
          not ls.is_public
          and (ls.student_id = (select auth.uid()) or (select auth.uid()) = any(ls.student_ids))
          and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student' and p.is_active and p.subscription_expires_at > now())
        )
        or (
          ls.is_public and ls.status in ('scheduled', 'live')
          and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student' and p.is_active and p.subscription_expires_at > now())
        )
      )
  )
);

drop policy if exists live_session_channels_write on realtime.messages;
create policy live_session_channels_write on realtime.messages
for insert to authenticated
with check (
  extension in ('broadcast', 'presence')
  and exists (
    select 1 from public.live_sessions ls
    where ls.id::text = substring((select realtime.topic()) from 14)
      and (
        ls.coach_id = (select auth.uid())
        or (
          not ls.is_public
          and (ls.student_id = (select auth.uid()) or (select auth.uid()) = any(ls.student_ids))
          and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student' and p.is_active and p.subscription_expires_at > now())
        )
        or (
          ls.is_public and ls.status in ('scheduled', 'live')
          and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student' and p.is_active and p.subscription_expires_at > now())
        )
      )
  )
);
