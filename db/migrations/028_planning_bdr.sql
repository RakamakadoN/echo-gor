-- 028_planning_bdr.sql
-- Раздел «Планирование (БДР)» — бюджет доходов и расходов сети.
-- План по группам/направлениям и категориям расходов, факт тянется из CRM (поступления)
-- и Бухгалтерии (фактические расходы). Доступ — только владелец.
-- Идемпотентно: повторный запуск не ломает существующие данные.

-- =========================================================================
-- Бюджет на период (месяц). Один активный бюджет на (организация, период).
-- =========================================================================
CREATE TABLE IF NOT EXISTS planning_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL, -- NULL = вся сеть
  period_month TEXT NOT NULL,            -- 'YYYY-MM'
  title TEXT,                            -- напр. «БДР Июнь 2026»
  source TEXT NOT NULL DEFAULT 'manual', -- prev_month | prev_year | avg | manual | zero
  planned_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  planned_expense NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active | archived | draft
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planning_budgets_org ON planning_budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_planning_budgets_period ON planning_budgets(organization_id, period_month);

-- =========================================================================
-- Плановые доходы — по группам / направлениям.
-- =========================================================================
CREATE TABLE IF NOT EXISTS planning_revenue_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES planning_budgets(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  direction TEXT NOT NULL,               -- «Ансамбль», «Соло», «Выступления»…
  planned NUMERIC(14,2) NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'auto',     -- auto (из абонементов) | manual
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_planning_revenue_budget ON planning_revenue_lines(budget_id);

-- =========================================================================
-- Плановые расходы — по категориям (ЗП, аренда, реклама…).
-- =========================================================================
CREATE TABLE IF NOT EXISTS planning_expense_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES planning_budgets(id) ON DELETE CASCADE,
  category TEXT NOT NULL,                 -- «Зарплата», «Аренда», «Реклама»…
  planned NUMERIC(14,2) NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'manual',   -- manual | auto (например ЗП из карточек педагогов)
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_planning_expense_budget ON planning_expense_lines(budget_id);

-- =========================================================================
-- Настройки мотивации — полностью редактируются владельцем (порог/бонус по выполнению плана).
-- =========================================================================
CREATE TABLE IF NOT EXISTS planning_motivation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES planning_budgets(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb, -- [{level, threshold, bonus}]
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planning_motivation_org ON planning_motivation(organization_id);

-- =========================================================================
-- Ежедневный отчёт управляющего (для блока «Ежедневный отчёт» в БДР).
-- =========================================================================
CREATE TABLE IF NOT EXISTS planning_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  report_date DATE NOT NULL,
  revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  trials INTEGER NOT NULL DEFAULT 0,
  sales INTEGER NOT NULL DEFAULT 0,
  comment TEXT,
  author TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planning_daily_org ON planning_daily_reports(organization_id, report_date);
