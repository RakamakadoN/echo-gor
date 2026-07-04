-- 032_student_access.sql
-- Вход ученика по QR-коду / ссылке. Доступ выдают только владелец,
-- руководитель филиала и администратор (проверка роли — в Express).
--
-- Два уровня прав кабинета:
--   'senior'  — «взрослая» группа: все вкладки кабинета;
--   'junior'  — «маленькая» группа: только Главная / Наклейки / Достижения.
-- Уровень определяется по возрасту (порог — константа JUNIOR_MAX_AGE на сервере),
-- но владелец/руководитель/админ может переопределить вручную (access_level).
--
-- access_token — секрет для ссылки ?student=<token> и QR-кода.
-- Доступ — только через Express по SUPABASE_SERVICE_ROLE_KEY. RLS deny-by-default.
-- Идемпотентно.

-- Уровень прав кабинета. NULL = определять автоматически по возрасту.
ALTER TABLE students ADD COLUMN IF NOT EXISTS access_level TEXT
  CHECK (access_level IN ('junior', 'senior'));

-- Секретный токен для входа по ссылке/QR. Уникален в рамках всей таблицы.
ALTER TABLE students ADD COLUMN IF NOT EXISTS access_token TEXT;

-- Включён ли вход ученика (можно отозвать, не стирая токен).
ALTER TABLE students ADD COLUMN IF NOT EXISTS access_enabled BOOLEAN NOT NULL DEFAULT false;

-- Кто и когда выдал доступ (аудит).
ALTER TABLE students ADD COLUMN IF NOT EXISTS access_granted_by TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS access_granted_at TIMESTAMPTZ;

-- Быстрый и уникальный поиск ученика по токену при входе.
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_access_token
  ON students(access_token) WHERE access_token IS NOT NULL;
