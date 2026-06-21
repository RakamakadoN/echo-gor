-- 012_accounting.sql
-- Раздел «Бухгалтерия» (управленческий учёт в стиле brizo).
-- Счета/кассы, статьи доходов-расходов, расширение операций (finance_transactions)
-- под ДДС, ОПиУ, платёжный календарь и реестр операций. Аддитивно и идемпотентно.

BEGIN;

-- 1) Счета и кассы
CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'cash',          -- 'cash' | 'bank' | 'card'
  currency TEXT NOT NULL DEFAULT 'KZT',
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_org ON finance_accounts(organization_id);

-- 2) Статьи доходов/расходов
CREATE TABLE IF NOT EXISTS finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL,                          -- 'income' | 'expense'
  parent_id UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_finance_categories_org ON finance_categories(organization_id);

-- 3) Расширение операций под brizo
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL;
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES finance_categories(id) ON DELETE SET NULL;
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS counterparty TEXT;
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS operation_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'actual';   -- 'actual' | 'planned'
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS transfer_account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL;
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_finance_tx_op_date ON finance_transactions(organization_id, operation_date);
CREATE INDEX IF NOT EXISTS idx_finance_tx_status ON finance_transactions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_finance_tx_category ON finance_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_finance_tx_account ON finance_transactions(account_id);

COMMIT;
