-- 006: Корзина учеников (мягкое удаление с подтверждением владельца)
-- Руководитель филиала/админ перемещают ученика в корзину (заявка на удаление),
-- владелец сети подтверждает удаление (status=archived) или восстанавливает.

ALTER TABLE students ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS deletion_requested_by TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Индекс для быстрой выборки корзины
CREATE INDEX IF NOT EXISTS idx_students_deletion_requested_at
  ON students (deletion_requested_at)
  WHERE deletion_requested_at IS NOT NULL;
