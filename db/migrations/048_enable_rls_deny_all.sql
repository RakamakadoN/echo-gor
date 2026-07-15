-- 048_enable_rls_deny_all.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Аудит #3 (ERROR у Supabase security advisor: rls_disabled_in_public +
-- sensitive_columns_exposed на students.access_token).
--
-- Модель доступа приложения: НЕТ клиентского Supabase, нет anon-ключа в бандле —
-- весь доступ к БД идёт через Express-сервер под service_role, который RLS
-- ОБХОДИТ. Поэтому включение RLS deny-by-default НИЧЕГО не ломает в приложении,
-- но закрывает таблицы для прямого доступа через PostgREST/anon.
--
-- Что делает миграция: включает Row Level Security на всех публичных таблицах,
-- у которых она была выключена (по отчёту advisor). Политик НЕ создаём — это
-- сознательный deny-all: без политик и не-service_role роль не видит ни строки
-- (именно так уже сделано у echo_transactions, products, echo_orders).
--
-- Откат (если понадобится): ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  t text;
  targets text[] := ARRAY[
    'dance_events','student_status_events','metrics_snapshots','student_waitlist',
    'finance_accounts','users','branches','finance_categories','finance_transactions',
    'halls','lead_sources','students','groups','payments','invoices','subscription_plans',
    'recalculations','schedule_lessons','tasks','notifications','audit_logs','organizations',
    'guardians','student_guardians','group_students','finance_expense_requests','staff_profiles',
    'messages','message_recipients','attendance','group_teacher_history','planning_budgets',
    'planning_revenue_lines','planning_expense_lines','planning_motivation','planning_daily_reports',
    'finance_refund_requests','teacher_arrivals','student_subscriptions','admin_shifts',
    'costumes','costume_rentals','manager_compensation'
  ];
BEGIN
  FOREACH t IN ARRAY targets LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      -- FORCE, чтобы даже владелец таблицы подчинялся RLS (service_role всё равно обходит).
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', t);
    END IF;
  END LOOP;
END $$;
