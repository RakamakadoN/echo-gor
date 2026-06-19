-- 004_students_teacher.sql
-- Allow assigning a teacher to a student directly (independent of group),
-- so the owner can pick teacher / group / branch separately. Additive, idempotent.

BEGIN;

ALTER TABLE students ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);

COMMIT;
