-- 009_family_quests.sql
-- Семейные квесты родительского кабинета («Эхо Гор»).
--
-- Контекст: родитель создаёт квест для ребёнка, ребёнок выполняет, семья
-- подтверждает. Раньше это жило только в локальном state фронта
-- (src/components/ParentWorkspace.tsx). Эта миграция даёт квестам бэкенд.
--
-- Доступ, как и везде: только через Express по SUPABASE_SERVICE_ROLE_KEY.
-- RLS включаем сразу (deny-by-default для anon/authenticated), service_role
-- его обходит — на сервер не влияет (см. 008_security_rls.sql).
--
-- Применение: через Supabase MCP apply_migration или supabase db push.

CREATE TABLE IF NOT EXISTS family_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT,
  reward TEXT,
  minutes TEXT,
  -- in_progress = «В процессе», awaiting = «Ждёт подтверждения», confirmed = «Подтверждено»
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'awaiting', 'confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_family_quests_student
  ON family_quests (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_family_quests_org
  ON family_quests (organization_id);

-- updated_at обновляется на стороне Express при PATCH (в схеме нет общего триггера).

-- RLS: deny-by-default для anon/authenticated; service_role (бэкенд) обходит.
ALTER TABLE family_quests ENABLE ROW LEVEL SECURITY;

-- ── Откат ────────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS family_quests;
