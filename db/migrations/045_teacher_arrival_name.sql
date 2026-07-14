-- 045_teacher_arrival_name.sql
-- Имя педагога в записи прихода — чтобы отчёт по стандартам у владельца/управляющего
-- показывал ФИО без join к пользователям. Плюс серверная метка времени уже есть (created_at).
-- Идемпотентно.

ALTER TABLE teacher_arrivals ADD COLUMN IF NOT EXISTS teacher_name TEXT;
