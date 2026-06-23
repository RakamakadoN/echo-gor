-- 016_branches_groups_halls.sql
-- Раздел «Филиалы и группы» (ТЗ от 23 июня).
-- 1. Добавляет недостающие колонки группам (level / расписание), которые API уже
--    записывает, но в схеме 001 их не было — латентный баг при работе с прод-БД.
-- 2. Расширяет филиалы (ответственный как свободный текст + комментарий).
-- 3. Расширяет залы (описание) — статус уже есть (record_status).
-- 4. Журнал смены педагога группы (ТЗ §10: фиксируем старого/нового педагога и дату).
-- Идемпотентна: безопасно применять повторно.

BEGIN;

-- ─── Группы: уровень и расписание ────────────────────────────────────────────
ALTER TABLE groups ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS schedule_days TEXT;  -- "Пн, Ср, Пт"
ALTER TABLE groups ADD COLUMN IF NOT EXISTS schedule_time TEXT;  -- "18:30–20:00"

-- ─── Филиалы: ответственный (свободный текст) и комментарий ──────────────────
-- managerName в UI — это ФИО ответственного. До этого выводился только через
-- manager_id → users. Разрешаем хранить имя напрямую (как в ТЗ §2.4).
ALTER TABLE branches ADD COLUMN IF NOT EXISTS manager_name TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS comment TEXT;

-- ─── Залы: описание (ТЗ §6.1) ────────────────────────────────────────────────
ALTER TABLE halls ADD COLUMN IF NOT EXISTS description TEXT;

-- ─── Журнал смены педагога группы (ТЗ §10) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS group_teacher_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  old_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  new_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_teacher_history_group
  ON group_teacher_history (group_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_teacher_history_org
  ON group_teacher_history (organization_id);

-- ─── Индексы для выборок раздела ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_groups_branch ON groups (branch_id);
CREATE INDEX IF NOT EXISTS idx_groups_hall ON groups (hall_id);
CREATE INDEX IF NOT EXISTS idx_halls_branch ON halls (branch_id);

COMMIT;
