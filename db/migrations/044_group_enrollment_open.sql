-- 044_group_enrollment_open.sql
-- Статус набора в группу: открыт/закрыт. На его основе дашборд даёт
-- рекомендации по набору (в какие группы и сколько учеников можно набрать),
-- а Маркетинг формирует рекламные офферы. Идемпотентно.

ALTER TABLE groups ADD COLUMN IF NOT EXISTS enrollment_open BOOLEAN NOT NULL DEFAULT true;
