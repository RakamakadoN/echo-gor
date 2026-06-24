-- 025_product_orders.sql
-- Заказы из магазина родителя/ученика. Заказ — это заявка на покупку товара,
-- которую обрабатывает администратор/управляющий (подтверждает, готовит, выдаёт).
-- Остаток склада НЕ списывается автоматически — списание идёт через продажу при выдаче.

CREATE TABLE IF NOT EXISTS product_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  student_id      UUID REFERENCES students(id) ON DELETE SET NULL,  -- кто заказал (если известно)
  customer_name   TEXT,
  customer_phone  TEXT,
  status          TEXT NOT NULL DEFAULT 'new',   -- new|confirmed|ready|done|cancelled
  total           NUMERIC(14,2) NOT NULL DEFAULT 0,
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES product_orders(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name  TEXT,                                   -- фиксируем название на момент заказа
  qty           INT NOT NULL DEFAULT 1,
  price         NUMERIC(14,2) NOT NULL DEFAULT 0,       -- цена за единицу на момент заказа
  amount        NUMERIC(14,2) NOT NULL DEFAULT 0        -- qty * price
);

CREATE INDEX IF NOT EXISTS idx_orders_org_status ON product_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_org_date   ON product_orders(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON product_order_items(order_id);

ALTER TABLE product_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_order_items ENABLE ROW LEVEL SECURITY;
