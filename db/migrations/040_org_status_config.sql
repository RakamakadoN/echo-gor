-- 040_org_status_config.sql
-- Общий (на всю организацию) конфиг статусов учеников: переопределения названий,
-- цветов базовых статусов и список ручных статусов. Раньше жил в localStorage
-- (на одном устройстве) — теперь общий для владельца и всех управляющих.
-- RLS включён deny-by-default: доступ только через сервер (service_role).
-- Идемпотентно.

CREATE TABLE IF NOT EXISTS org_status_config (
  organization_id uuid PRIMARY KEY,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE org_status_config ENABLE ROW LEVEL SECURITY;
