-- 023_students_archive.sql
-- «Архив учеников» — отдельная от «Корзины» сущность для сохранения базы.
--
-- Логика заказчика (24.06.2026): ученики НЕ должны полностью удаляться из системы.
-- «Корзина» = заявки администратора на удаление, которые подтверждает владелец.
-- Подтверждение больше не стирает данные, а переводит ученика в АРХИВ.
-- При переводе в архив обязательны два комментария:
--   1) «Почему он ушёл?»  -> archive_reason
--   2) свободный комментарий -> archive_comment
-- Все данные ученика (история оплат, посещений, групп) сохраняются —
-- архив нужен для будущих маркетинговых рассылок и возврата учеников.

ALTER TABLE students ADD COLUMN IF NOT EXISTS archived_at      TIMESTAMPTZ; -- NULL = активен; не NULL = в архиве
ALTER TABLE students ADD COLUMN IF NOT EXISTS archive_reason   TEXT;        -- «Почему он ушёл?» (обязателен при архивации)
ALTER TABLE students ADD COLUMN IF NOT EXISTS archive_comment  TEXT;        -- свободный комментарий (обязателен при архивации)
ALTER TABLE students ADD COLUMN IF NOT EXISTS archived_by      TEXT;        -- роль/имя, кто отправил в архив

-- Быстрая выборка архива.
CREATE INDEX IF NOT EXISTS idx_students_archived_at
  ON students (archived_at)
  WHERE archived_at IS NOT NULL;
