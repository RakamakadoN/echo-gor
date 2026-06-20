-- 007_owner_analytics.sql
-- Главный дашборд владельца: сбор данных под метрики, которых пока нет в истории.
--   1) student_status_events — журнал переходов статуса ученика (lead→trial→active→...),
--      основа воронки продаж и ретеншн-когорт «вперёд во времени».
--   2) metrics_snapshots — помесячные агрегаты по сети и по филиалам для сравнения
--      год-к-году (YoY). Заполняется по требованию/планировщиком, накапливается со временем.
-- Аддитивная и идемпотентная миграция.

BEGIN;

-- 1) Журнал смены статусов ученика (воронка лидов и переходы)
CREATE TABLE IF NOT EXISTS student_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  from_status student_status,
  to_status student_status NOT NULL,
  source TEXT,                          -- источник перехода: 'api', 'import', 'manual'
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_sse_org_time ON student_status_events (organization_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_sse_branch_time ON student_status_events (branch_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_sse_student ON student_status_events (student_id);
CREATE INDEX IF NOT EXISTS idx_sse_to_status ON student_status_events (to_status);

-- 2) Помесячные снапшоты метрик (для YoY). branch_id IS NULL = агрегат по всей сети.
CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,           -- первый день месяца, к которому относится снапшот
  revenue NUMERIC(14, 2) NOT NULL DEFAULT 0,
  revenue_new NUMERIC(14, 2) NOT NULL DEFAULT 0,
  revenue_returning NUMERIC(14, 2) NOT NULL DEFAULT 0,
  active_students INTEGER NOT NULL DEFAULT 0,
  active_subscriptions INTEGER NOT NULL DEFAULT 0,
  avg_check NUMERIC(12, 2) NOT NULL DEFAULT 0,
  retention_rate NUMERIC(6, 2) NOT NULL DEFAULT 0,
  attendance_rate NUMERIC(6, 2) NOT NULL DEFAULT 0,
  new_students INTEGER NOT NULL DEFAULT 0,
  payments_count INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Уникальность снапшота на (организация, филиал-или-сеть, месяц).
-- Два частичных индекса, т.к. branch_id может быть NULL (агрегат сети).
CREATE UNIQUE INDEX IF NOT EXISTS uq_snapshot_branch
  ON metrics_snapshots (organization_id, branch_id, period_month)
  WHERE branch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_snapshot_network
  ON metrics_snapshots (organization_id, period_month)
  WHERE branch_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_snapshot_org_month ON metrics_snapshots (organization_id, period_month);

COMMIT;
