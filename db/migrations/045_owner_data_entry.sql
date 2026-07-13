-- 045_owner_data_entry.sql
-- Закрываем пробелы «исходные данные негде вносить» (аудит с позиции владельца):
--   • Реестр налогов (ставка/база/период) — finance_taxes
--   • Рекламные расходы по источникам (CPL/CAC/ROMI) — marketing_spend
--   • Профиль педагога (категория/даты) + KPI/отзывы/аттестация/стандарты
-- Статьи (finance_categories) и счета (finance_accounts) уже есть в 012 — им нужны
-- только эндпоинты. Всё аддитивно и идемпотентно.

BEGIN;

-- 1) Реестр налогов
CREATE TABLE IF NOT EXISTS finance_taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  base_type TEXT NOT NULL DEFAULT 'revenue',   -- 'revenue' | 'profit' | 'payroll' | 'fixed'
  rate NUMERIC(6,3) NOT NULL DEFAULT 0,         -- ставка, % (для fixed игнорируется)
  fixed_amount NUMERIC(14,2) NOT NULL DEFAULT 0,-- для base_type='fixed'
  period TEXT NOT NULL DEFAULT 'month',         -- 'month' | 'quarter' | 'year'
  category_id UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_finance_taxes_org ON finance_taxes(organization_id);

-- 2) Рекламные расходы (для маркетинговых метрик CPL/CAC/ROMI)
CREATE TABLE IF NOT EXISTS marketing_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  source_id UUID REFERENCES lead_sources(id) ON DELETE SET NULL,  -- канал/источник лида
  channel TEXT,                                -- свободное имя канала, если источник не задан
  period_month TEXT NOT NULL,                  -- 'YYYY-MM'
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,            -- вручную указанные лиды канала (если не считаем из БД)
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketing_spend_org ON marketing_spend(organization_id, period_month);

-- 3) Профиль педагога: категория, даты, статус, заметки
CREATE TABLE IF NOT EXISTS teacher_profiles (
  teacher_id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  category INTEGER,                            -- категория педагога (1..3), NULL = не задана
  birth_date DATE,
  hired_on DATE,
  status TEXT DEFAULT 'active',               -- 'active' | 'intern' | 'archived'
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_org ON teacher_profiles(organization_id);

-- 4) KPI педагога по месяцам (ретеншн/воронка/стандарты/отзыв)
CREATE TABLE IF NOT EXISTS teacher_kpi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  teacher_id UUID NOT NULL,
  period_month TEXT NOT NULL,                  -- 'YYYY-MM'
  retention NUMERIC(5,2) DEFAULT 0,           -- %
  funnel NUMERIC(5,2) DEFAULT 0,              -- %
  standards NUMERIC(5,2) DEFAULT 0,           -- %
  review_avg NUMERIC(3,2) DEFAULT 0,          -- средняя оценка 0..5
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, teacher_id, period_month)
);
CREATE INDEX IF NOT EXISTS idx_teacher_kpi_org ON teacher_kpi(organization_id, teacher_id);

-- 5) Отзывы о педагоге
CREATE TABLE IF NOT EXISTS teacher_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  teacher_id UUID NOT NULL,
  author TEXT,                                 -- «Родитель, гр. …» / «Ученик, …»
  source TEXT DEFAULT 'Личный кабинет',
  stars INTEGER NOT NULL DEFAULT 5,
  text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_reviews_org ON teacher_reviews(organization_id, teacher_id);

-- 6) Аттестации педагога
CREATE TABLE IF NOT EXISTS teacher_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  teacher_id UUID NOT NULL,
  att_date DATE,
  direction TEXT,
  result TEXT,                                 -- 'Аттестован' | 'Промежуточный' | ...
  mark TEXT,                                   -- '9/10' | '—'
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_attestations_org ON teacher_attestations(organization_id, teacher_id);

-- 7) Стандарты работы педагога (чек-лист)
CREATE TABLE IF NOT EXISTS teacher_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  state TEXT NOT NULL DEFAULT 'n',             -- 'y' | 'p' | 'n'
  sort INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_standards_org ON teacher_standards(organization_id, teacher_id);

COMMIT;
