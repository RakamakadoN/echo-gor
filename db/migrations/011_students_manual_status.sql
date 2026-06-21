-- 011: Ручные статусы и признак вернувшегося ученика (ТЗ «Ученики» §2, §7).
-- Ручной статус хранится отдельно от автоматического (status), чтобы
-- админ мог пометить ученика как «Каникулы», «Лист ожидания», «Мед. пауза» и т.п.
-- Аддитивно и идемпотентно.

BEGIN;

ALTER TABLE students ADD COLUMN IF NOT EXISTS manual_status TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_students_manual_status
  ON students (manual_status)
  WHERE manual_status IS NOT NULL;

COMMIT;
