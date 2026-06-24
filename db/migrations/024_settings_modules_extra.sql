-- 024_settings_modules_extra.sql
-- Пакет правок по голосовому ТЗ (24.06.2026):
--   • Выступления: кол-во выступающих, расходная составляющая, чистая прибыль
--     (= стоимость − расход), тип оплаты, произвольный тип выступления.
--   • Товары: фото товара, отдельные списания (остаток = приход − продажи − списания).
--   • Настраиваемые справочники для вкладки «Настройки» (типы выступлений,
--     категории товаров, уровни групп) — владелец редактирует, остальные выбирают.

-- ── Справочники (настраиваемые списки) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings_lists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  kind            TEXT NOT NULL,            -- 'performance_type' | 'product_category' | 'group_level'
  label           TEXT NOT NULL,
  sort_order      INT  NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_settings_lists_org_kind
  ON settings_lists(organization_id, kind) WHERE is_active;

-- ── Выступления ──────────────────────────────────────────────────────────────
ALTER TABLE performances ADD COLUMN IF NOT EXISTS performers_count INT;                       -- кол-во выступающих
ALTER TABLE performances ADD COLUMN IF NOT EXISTS expense          NUMERIC(14,2) NOT NULL DEFAULT 0; -- расходная составляющая
ALTER TABLE performances ADD COLUMN IF NOT EXISTS payment_method   TEXT;                       -- наличные|перевод|карта|kaspi
ALTER TABLE performances ADD COLUMN IF NOT EXISTS type_label       TEXT;                       -- произвольный тип из справочника

-- ── Товары ───────────────────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_url TEXT;  -- фото товара (для будущего магазина родителя)

-- ── Списания товара ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_writeoffs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty             INT  NOT NULL DEFAULT 1,
  reason          TEXT,                                   -- брак|потеря|порча|подарок|...
  writeoff_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_writeoffs_org_date ON product_writeoffs(organization_id, writeoff_date);
CREATE INDEX IF NOT EXISTS idx_writeoffs_product  ON product_writeoffs(product_id);

ALTER TABLE settings_lists     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_writeoffs  ENABLE ROW LEVEL SECURITY;
