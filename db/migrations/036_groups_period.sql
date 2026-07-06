-- 036_groups_period.sql
-- Период работы группы: дата начала и окончания набора/занятий группы.
-- Обе колонки необязательные (nullable) — старые группы продолжают работать.
-- Идемпотентно.

ALTER TABLE groups ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS end_date   DATE;
