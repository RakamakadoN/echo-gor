-- 008_security_rls.sql
-- Базовая защита данных перед выходом в прод (groundwork).
--
-- Контекст архитектуры «эхо-гор»:
--   • Фронт НИКОГДА не обращается в Supabase напрямую. Весь доступ идёт через
--     Express-сервер (server/mvpApi.ts, server/danceEventsParser.ts), который
--     ходит в БД по SUPABASE_SERVICE_ROLE_KEY.
--   • Роль service_role ПОЛНОСТЬЮ обходит Row Level Security.
--   => Включение RLS НЕ ломает текущий бэкенд. Оно лишь закрывает прямой доступ
--      ролей anon / authenticated (которые сейчас открыты по publishable-ключу).
--
-- Что делает миграция:
--   1) Включает RLS на всех пользовательских таблицах схемы public.
--   2) НЕ добавляет ни одной разрешающей политики для anon/authenticated
--      => для них действует deny-by-default (нет политики = нет доступа).
--      Сервер (service_role) работает без изменений.
--
-- КОГДА ПРИМЕНЯТЬ: при выходе из dev в прод (или раньше, доступ безопасен).
--   Применение: через Supabase MCP apply_migration или supabase db push.
--   Откат: см. блок в конце файла (ALTER TABLE ... DISABLE ROW LEVEL SECURITY).
--
-- ПОЗЖЕ, если появится клиентский доступ по anon/JWT (supabase-js на фронте),
--   раскомментируйте и адаптируйте шаблон org-scoped политик в самом низу.

-- 1) Включаем RLS на всех базовых таблицах public (идемпотентно).
do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'                       -- обычные таблицы
      and c.relrowsecurity = false              -- ещё без RLS
  loop
    execute format('alter table public.%I enable row level security;', r.relname);
    raise notice 'RLS enabled: %', r.relname;
  end loop;
end $$;

-- 2) (опционально, но рекомендуется для прод) форсируем RLS даже для владельца
--    таблицы. service_role всё равно обходит RLS, поэтому на бэкенд не влияет.
--    Раскомментируйте при выходе в прод, если нужно максимально строго:
--
-- do $$
-- declare r record;
-- begin
--   for r in
--     select c.relname from pg_class c
--     join pg_namespace n on n.oid = c.relnamespace
--     where n.nspname='public' and c.relkind='r' and c.relforcerowsecurity=false
--   loop
--     execute format('alter table public.%I force row level security;', r.relname);
--   end loop;
-- end $$;

-- =====================================================================
-- ШАБЛОН org-scoped политик на будущее (для клиентского доступа по JWT).
-- Сейчас НЕ нужен: фронт ходит только через сервер (service_role).
-- Раскомментируйте и настройте, когда/если появится supabase-js на клиенте.
-- Предполагается, что organization_id кладётся в JWT-claim 'org_id'.
-- =====================================================================
--
-- create policy "org_read_students" on public.students
--   for select to authenticated
--   using (organization_id = (auth.jwt() ->> 'org_id')::uuid);
--
-- create policy "org_write_students" on public.students
--   for all to authenticated
--   using (organization_id = (auth.jwt() ->> 'org_id')::uuid)
--   with check (organization_id = (auth.jwt() ->> 'org_id')::uuid);
--
-- Аналогично для остальных org-таблиц (payments, groups, branches, tasks, …).
-- Таблицы без organization_id (tasks, lead_sources, halls, schedule_lessons,
-- attendance, group_students) скоупятся через связанный branch_id/parent.

-- =====================================================================
-- ОТКАТ (если потребуется вернуть открытый доступ в dev):
-- =====================================================================
-- do $$
-- declare r record;
-- begin
--   for r in
--     select c.relname from pg_class c
--     join pg_namespace n on n.oid = c.relnamespace
--     where n.nspname='public' and c.relkind='r' and c.relrowsecurity=true
--   loop
--     execute format('alter table public.%I disable row level security;', r.relname);
--   end loop;
-- end $$;
