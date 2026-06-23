-- 016_attendance_journal.sql — Раздел «Журнал посещаемости» (ТЗ).
-- Расширяет таблицу attendance статусами «уважительная причина / перерасчёт /
-- пробный», причиной отсутствия и привязкой к пробному уроку; добавляет признак
-- «оплатит позже» ученику и таблицу перерасчётов (recalculations) с прикреплением
-- справки. Заморозок в системе нет — используется перерасчёт. Аддитивно и
-- идемпотентно: можно прогонять повторно.
--
-- ВАЖНО: ALTER TYPE ... ADD VALUE нельзя выполнять внутри той же транзакции,
-- где новое значение используется, поэтому расширение enum идёт ДО BEGIN.

-- 1) Новые значения статуса посещения.
--    excused — уважительная причина; recalc — перерасчёт; trial — пробный урок.
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'excused';
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'recalc';
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'trial';

BEGIN;

-- 2) Причина отсутствия и пробные уроки на самой отметке.
--    absence_reason: 'illness' | 'certificate' | 'left' | 'family' | 'no_notice' | 'other'
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS absence_reason TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT false;
--    trial_outcome: 'pending' | 'converted' (купил абонемент) | 'lost' (не купил)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS trial_outcome TEXT;

CREATE INDEX IF NOT EXISTS idx_attendance_trial
  ON attendance (is_trial)
  WHERE is_trial = true;

-- 3) Признак «оплатит позже» (ручной) — для блока «не оплатили, но ходят».
ALTER TABLE students ADD COLUMN IF NOT EXISTS pay_later BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS pay_later_set_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_students_pay_later
  ON students (pay_later)
  WHERE pay_later = true;

-- 4) Перерасчёты (вместо заморозок). Перерасчёт автоматически предлагается
--    при следующей продаже абонемента, пока status = 'pending'.
CREATE TABLE IF NOT EXISTS recalculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES student_subscriptions(id) ON DELETE SET NULL,
  period_from DATE,
  period_to DATE,
  lessons_count INTEGER NOT NULL DEFAULT 0,
  reason TEXT,                                   -- 'illness' | 'certificate' | ...
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,       -- сумма перерасчёта, тг
  comment TEXT,
  attachment_url TEXT,                           -- справка: фото / PDF / изображение
  attachment_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',         -- 'pending' | 'applied' | 'cancelled'
  created_by UUID,
  created_by_name TEXT,
  applied_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_recalc_student ON recalculations(student_id);
CREATE INDEX IF NOT EXISTS idx_recalc_org_status ON recalculations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_recalc_branch ON recalculations(branch_id);
CREATE INDEX IF NOT EXISTS idx_recalc_pending_student
  ON recalculations(student_id)
  WHERE status = 'pending';

COMMIT;
