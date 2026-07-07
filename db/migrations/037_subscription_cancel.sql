-- 037_subscription_cancel.sql
-- Удаление абонемента с сохранением истории (ТЗ §3). Абонемент не исчезает —
-- переводится в status='archived' и помечается «Удалён» с причиной/комментарием/
-- кто удалил/когда. record_status уже содержит 'archived' (миграция 001).
-- Идемпотентно.

ALTER TABLE student_subscriptions ADD COLUMN IF NOT EXISTS cancel_reason  TEXT;
ALTER TABLE student_subscriptions ADD COLUMN IF NOT EXISTS cancel_comment TEXT;
ALTER TABLE student_subscriptions ADD COLUMN IF NOT EXISTS deleted_by     TEXT;
ALTER TABLE student_subscriptions ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMPTZ;
