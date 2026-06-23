-- 017_performances.sql
-- Раздел «Выступления» — учёт коммерческих выступлений (свадьбы, банкеты,
-- корпоративы, дни рождения, мероприятия, концерты). Доступ — Владелец сети
-- (полный) и Управляющий (просмотр списка без финансовой аналитики).
-- Конвенции совпадают с 012_accounting.sql: UUID PK, organization_id/branch_id,
-- NUMERIC(14,2) для денег, timestamptz created_at/updated_at, RLS включён
-- (сервер ходит по SUPABASE_SERVICE_ROLE_KEY в обход RLS — см. 008_security_rls.sql).

-- Само выступление
CREATE TABLE IF NOT EXISTS performances (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  client_name      TEXT NOT NULL,
  client_phone     TEXT,
  address          TEXT,
  event_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  event_time       TEXT,                                   -- "18:00" (свободный формат)
  type             TEXT NOT NULL DEFAULT 'basic',          -- basic|interactive|multi|individual|other
  price            NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- planned: запланировано (по умолчанию); cancelled: отменено.
  -- paid/partial вычисляются в API по сумме поступлений, поэтому здесь хранится
  -- только «ручной» статус — план/отмена. См. server/mvpApi.ts.
  status           TEXT NOT NULL DEFAULT 'planned',        -- planned|cancelled
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Поступления денег по выступлению (одно выступление → несколько платежей)
CREATE TABLE IF NOT EXISTS performance_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  performance_id   UUID NOT NULL REFERENCES performances(id) ON DELETE CASCADE,
  amount           NUMERIC(14,2) NOT NULL,
  paid_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  method           TEXT NOT NULL DEFAULT 'cash',           -- cash|card|transfer|kaspi
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performances_org_date   ON performances(organization_id, event_date);
CREATE INDEX IF NOT EXISTS idx_performances_org_status ON performances(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_performances_branch     ON performances(branch_id);
CREATE INDEX IF NOT EXISTS idx_perf_payments_perf      ON performance_payments(performance_id);
CREATE INDEX IF NOT EXISTS idx_perf_payments_org_date  ON performance_payments(organization_id, paid_date);

ALTER TABLE performances         ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_payments ENABLE ROW LEVEL SECURITY;
