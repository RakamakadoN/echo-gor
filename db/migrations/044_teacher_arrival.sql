-- 044_teacher_arrival.sql
-- Подтверждение прихода педагога на рабочее место (стандарт работы).
-- Педагог отмечает приход с фото; руководство видит факт и время (вовремя/опоздание).
-- Фото хранится base64 (data-URL) — отдельного файлового стораджа в проекте пока нет.
-- Идемпотентно.

CREATE TABLE IF NOT EXISTS teacher_arrivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  arrival_date DATE NOT NULL,            -- дата прихода (Asia/Almaty)
  arrival_time TEXT NOT NULL,            -- 'HH:MM'
  is_late BOOLEAN NOT NULL DEFAULT false,
  photo TEXT,                            -- data-URL (base64 jpeg), сжатое фото прихода
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, teacher_id, arrival_date)
);
CREATE INDEX IF NOT EXISTS idx_teacher_arrivals_org_date ON teacher_arrivals(organization_id, arrival_date);
CREATE INDEX IF NOT EXISTS idx_teacher_arrivals_teacher ON teacher_arrivals(teacher_id);
