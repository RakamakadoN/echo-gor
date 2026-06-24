-- 021_students_gender_waitlist.sql
-- Корректировка ТЗ «Ученики»:
--  1) поле «Пол» у ученика (male / female);
--  2) «Лист ожидания» — отдельная сущность с филиалом, желаемой группой,
--     датой постановки в очередь, приоритетом (вычисляется по дате) и комментарием.
--     История сохраняется: при переводе в группу строка не удаляется, а закрывается
--     (removed_at + removed_reason).

-- ── Пол ученика ──────────────────────────────────────────────────────────────
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender TEXT
  CHECK (gender IN ('male', 'female'));

-- ── Лист ожидания ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_waitlist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,  -- желаемый филиал
  group_id        UUID REFERENCES groups(id) ON DELETE SET NULL,    -- желаемая группа
  comment         TEXT,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT now(),               -- дата постановки в очередь
  removed_at      TIMESTAMPTZ,                                      -- NULL = активен в листе
  removed_reason  TEXT,                                             -- 'enrolled' | 'manual' | ...
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_student ON student_waitlist(student_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_active  ON student_waitlist(organization_id) WHERE removed_at IS NULL;

-- Один активный пункт листа ожидания на ученика.
CREATE UNIQUE INDEX IF NOT EXISTS uq_waitlist_active_student
  ON student_waitlist(student_id) WHERE removed_at IS NULL;
