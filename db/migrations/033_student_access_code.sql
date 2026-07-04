-- 033_student_access_code.sql
-- Короткий человекочитаемый код входа ученика (дополнение к миграции 032).
-- access_token (длинный) остаётся для ссылки/QR (?student=<token>) — один тап.
-- access_code (короткий, 6 знаков без похожих символов) — для ручного ввода
-- на экране входа: ребёнок набирает его сам. Оба ведут на одного ученика.
--
-- Доступ — только через Express по SUPABASE_SERVICE_ROLE_KEY. RLS deny-by-default.
-- Идемпотентно.

ALTER TABLE students ADD COLUMN IF NOT EXISTS access_code TEXT;

-- Код уникален в рамках таблицы (для быстрого и однозначного входа).
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_access_code
  ON students(access_code) WHERE access_code IS NOT NULL;
