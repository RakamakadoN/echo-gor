-- 029_teacher_penalties.sql
-- Журнал штрафов преподавателей: вычитаются из итоговой ЗП автоматически.
-- Педагог видит причину, сумму, дату и кто начислил. Доступ на начисление — владелец/управляющий.
-- Идемпотентно.

CREATE TABLE IF NOT EXISTS teacher_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,                  -- Опоздание | Незакрытый журнал | Нет плана работы | Нет фото прихода | Нарушение дисциплины | Другое
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  period_month TEXT NOT NULL,            -- 'YYYY-MM' — в каком месяце вычитать
  created_by TEXT,                       -- Владелец | Управляющий
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_penalties_org ON teacher_penalties(organization_id, period_month);
CREATE INDEX IF NOT EXISTS idx_teacher_penalties_teacher ON teacher_penalties(teacher_id);
