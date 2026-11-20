-- Etapa 2: execute este arquivo no SQL Editor do Supabase após schema.sql
alter table public.profiles add column if not exists setup jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists recurring_errors text not null default '';
create table if not exists public.calendar_events(id uuid primary key default gen_random_uuid(),student_id uuid not null references public.profiles(id) on delete cascade,coach_id uuid not null references public.profiles(id),title text not null,kind text not null check(kind in ('live','vod','training')),starts_at timestamptz not null,notes text not null default '',created_at timestamptz not null default now());
alter table public.calendar_events enable row level security;
drop policy if exists calendar_events_access on public.calendar_events;
create policy calendar_events_access on public.calendar_events for all using(student_id=auth.uid() or coach_id=auth.uid() or public.is_coach()) with check(student_id=auth.uid() or coach_id=auth.uid() or public.is_coach());
