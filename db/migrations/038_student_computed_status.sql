-- 038_student_computed_status.sql
-- Автостатус ученика (ТЗ §5–6). Статус ВЫЧИСЛЯЕТСЯ сервером из реальных данных
-- (абонементы/архив/корзина/ручной статус) и КЭШируется в колонку computed_status
-- для быстрых фильтров/отчётов. Значения (строки, не enum):
--   no_status | trial | active | debt | expired | archived | trash | <manual_status>
-- Идемпотентно.

ALTER TABLE students ADD COLUMN IF NOT EXISTS computed_status TEXT;
CREATE INDEX IF NOT EXISTS idx_students_computed_status ON students(organization_id, computed_status);
