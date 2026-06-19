-- Echo Gor 1.0 MVP demo seed.
-- Run AFTER all migrations (001 -> 002 -> 003) in the Supabase SQL editor.
-- Idempotent: safe to re-run (ON CONFLICT DO NOTHING + NULL-guarded backfills).

-- Organization (multi-tenancy root). This UUID MUST match `orgId` in
-- server/mvpApi.ts, otherwise every organization_id filter returns no rows.
INSERT INTO organizations (id, name, slug, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Эхо Гор', 'echo-gor', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO branches (id, name, city, address, phone, status)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'Эхо Гор Алматы', 'Алматы', 'ул. Абая, 45', '+7 (727) 001-20-20', 'active'),
  ('00000000-0000-0000-0000-000000000102', 'Эхо Гор Астана', 'Астана', 'пр. Кабанбай батыра, 12А', '+7 (7172) 150-30-40', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, branch_id, role, full_name, phone, email, password_hash, specialization, status)
VALUES
  ('00000000-0000-0000-0000-000000001001', NULL, 'owner', 'Асланбек Болотаев', '+7 701 000 10 10', 'owner@echogor.demo', 'demo-only', NULL, 'active'),
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000101', 'branch_manager', 'Магомед Даудов', '+7 701 000 20 20', 'branch@echogor.demo', 'demo-only', NULL, 'active'),
  ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000101', 'admin', 'Фатима Царикаева', '+7 702 000 30 30', 'admin@echogor.demo', 'demo-only', NULL, 'active'),
  ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000101', 'teacher', 'Аслан Плиев', '+7 701 441 11 22', 'teacher@echogor.demo', 'demo-only', 'Лезгинка, ансамблевая подготовка', 'active')
ON CONFLICT (id) DO NOTHING;

UPDATE branches
SET manager_id = '00000000-0000-0000-0000-000000001002'
WHERE id = '00000000-0000-0000-0000-000000000101';

INSERT INTO halls (id, branch_id, name, capacity, status)
VALUES
  ('00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000000101', 'Зал Алатау', 40, 'active'),
  ('00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000000101', 'Зал Кок-Тобе', 25, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO groups (id, branch_id, hall_id, teacher_id, name, age_from, age_to, capacity, status)
VALUES
  ('00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000001004', 'Старший Кавказский Ансамбль', 14, 18, 24, 'active'),
  ('00000000-0000-0000-0000-000000003002', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000001004', 'Младшие джигиты', 6, 9, 18, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO students (
  id, branch_id, group_id, first_name, last_name, birthday, parent_name, parent_phone, status, comment
)
VALUES
  ('00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000003001', 'Сослан', 'Болотаев', '2009-03-12', 'Алина Болотаева', '+7 701 400 30 30', 'active', 'Солист ансамбля'),
  ('00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000003001', 'Алан', 'Дзагоев', '2010-07-21', 'Хетаг Дзагоев', '+7 701 333 55 77', 'debt', 'Нужно продление абонемента'),
  ('00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000003002', 'Тимур', 'Юсупов', '2019-02-09', 'Зелимхан Юсупов', '+7 777 095 95 95', 'active', 'Младшая группа')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscription_plans (id, name, lessons_count, duration_days, price, status)
VALUES
  ('00000000-0000-0000-0000-000000005001', 'Абонемент Ансамбль 12 занятий', 12, 30, 45000, 'active'),
  ('00000000-0000-0000-0000-000000005002', 'Младший старт 8 занятий', 8, 30, 35000, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO student_subscriptions (
  id, student_id, plan_id, branch_id, group_id, starts_on, ends_on, lessons_total, lessons_left, price, status
)
VALUES
  ('00000000-0000-0000-0000-000000006001', '00000000-0000-0000-0000-000000004001', '00000000-0000-0000-0000-000000005001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000003001', CURRENT_DATE - 7, CURRENT_DATE + 23, 12, 8, 45000, 'active'),
  ('00000000-0000-0000-0000-000000006002', '00000000-0000-0000-0000-000000004002', '00000000-0000-0000-0000-000000005001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000003001', CURRENT_DATE - 40, CURRENT_DATE - 10, 12, 0, 45000, 'archived'),
  ('00000000-0000-0000-0000-000000006003', '00000000-0000-0000-0000-000000004003', '00000000-0000-0000-0000-000000005002', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000003002', CURRENT_DATE - 4, CURRENT_DATE + 26, 8, 6, 35000, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, branch_id, student_id, amount, method, status, paid_at, comment, created_by)
VALUES
  ('00000000-0000-0000-0000-000000007001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000004001', 45000, 'kaspi', 'paid', now() - interval '2 days', 'Оплата абонемента', '00000000-0000-0000-0000-000000001003'),
  ('00000000-0000-0000-0000-000000007002', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000004003', 35000, 'cash', 'paid', now() - interval '1 day', 'Оплата младшего абонемента', '00000000-0000-0000-0000-000000001003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO schedule_lessons (id, branch_id, group_id, teacher_id, hall_id, starts_at, ends_at, status, created_by)
VALUES
  ('00000000-0000-0000-0000-000000008001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000002001', now() - interval '2 days', now() - interval '2 days' + interval '90 minutes', 'completed', '00000000-0000-0000-0000-000000001003'),
  ('00000000-0000-0000-0000-000000008002', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000003002', '00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000002002', now() - interval '1 day', now() - interval '1 day' + interval '60 minutes', 'completed', '00000000-0000-0000-0000-000000001003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO attendance (lesson_id, student_id, status, marked_by, marked_at)
VALUES
  ('00000000-0000-0000-0000-000000008001', '00000000-0000-0000-0000-000000004001', 'present', '00000000-0000-0000-0000-000000001004', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000008001', '00000000-0000-0000-0000-000000004002', 'absent', '00000000-0000-0000-0000-000000001004', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000008002', '00000000-0000-0000-0000-000000004003', 'present', '00000000-0000-0000-0000-000000001004', now() - interval '1 day')
ON CONFLICT (lesson_id, student_id) DO NOTHING;

-- Backfill organization_id on all org-scoped tables so the server's
-- organization_id filters (server/mvpApi.ts) match the demo data.
-- NULL-guarded => idempotent and safe to re-run.
UPDATE branches           SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE users              SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE groups             SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE students           SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE subscription_plans SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE payments           SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
