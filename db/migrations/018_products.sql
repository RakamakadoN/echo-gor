-- 018_products.sql
-- Раздел «Товары и склад» — учёт мерча, формы, аксессуаров, сувенирной продукции.
-- Подвкладки: Товары / Продажи / Остатки / Поступления.
-- Остаток = Σ поступлений − Σ продаж (вычисляется в API).
-- Доступ: Владелец (полный), Управляющий (свой филиал), Администратор (продажи
-- и касса дня), Педагог (нет). Конвенции — как в 012/017.

-- Справочник товаров
CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,  -- NULL = на всю сеть
  name             TEXT NOT NULL,
  category         TEXT,                                   -- мерч|форма|аксессуары|сувениры|...
  sku              TEXT,                                   -- артикул
  sale_price       NUMERIC(14,2) NOT NULL DEFAULT 0,       -- цена продажи
  cost_price       NUMERIC(14,2) NOT NULL DEFAULT 0,       -- закупочная цена
  min_stock        INTEGER NOT NULL DEFAULT 0,             -- минимальный остаток
  is_active        BOOLEAN NOT NULL DEFAULT true,
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Продажи товаров
CREATE TABLE IF NOT EXISTS product_sales (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty              INTEGER NOT NULL DEFAULT 1,
  amount           NUMERIC(14,2) NOT NULL DEFAULT 0,       -- сумма продажи (итог)
  method           TEXT NOT NULL DEFAULT 'cash',           -- cash|card|transfer|kaspi
  sold_by          TEXT,                                   -- сотрудник
  sale_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Поступления товара на склад (приход). Остаток = приход − продажи.
CREATE TABLE IF NOT EXISTS product_stock_movements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty              INTEGER NOT NULL DEFAULT 0,             -- приход (положительное число)
  cost_price       NUMERIC(14,2),                          -- закупочная за единицу на момент прихода
  movement_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_org           ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_branch        ON products(branch_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_org_date ON product_sales(organization_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_product_sales_product  ON product_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_mov_product      ON product_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_mov_org_date     ON product_stock_movements(organization_id, movement_date);

ALTER TABLE products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock_movements ENABLE ROW LEVEL SECURITY;
