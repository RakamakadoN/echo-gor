-- 050_lesson_plans.sql — аудит #16: серверное хранение планов и итогов уроков
-- (раньше только localStorage устройства — руководство не видело, терялось при
-- смене телефона). Ключ: организация + педагог + группа + дата + вид (upsert).
create table if not exists public.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  teacher_id uuid,
  group_name text not null default '',
  lesson_date date not null,
  kind text not null,                 -- 'lesson' | 'open' | 'summary'
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, teacher_id, group_name, lesson_date, kind)
);

-- deny-all RLS (доступ только через сервер под service_role), как у прочих таблиц.
alter table public.lesson_plans enable row level security;
alter table public.lesson_plans force row level security;
