-- 031_shop_echo.sql
-- Магазин «за ЭхоБаксы» (Этап 2 §2 роадмапа).
-- Товары получают описание и цену в ЭхоБаксах; у ученика — кошелёк (echo_balance)
-- и история операций (echo_transactions: начисления, списания, покупки).
-- is_active у products уже есть (миграция 018) — «возможность отключать товар».
--
-- Доступ — только через Express по SUPABASE_SERVICE_ROLE_KEY. RLS deny-by-default.
-- Идемпотентно.

-- Товар: описание + цена в ЭхоБаксах (0 = в ЭхоБакс-магазине не участвует).
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS echo_price  INTEGER NOT NULL DEFAULT 0;

-- Кошелёк ученика: баланс ЭхоБаксов.
ALTER TABLE students ADD COLUMN IF NOT EXISTS echo_balance INTEGER NOT NULL DEFAULT 0;

-- Операции с ЭхоБаксами: + начисление, − списание/покупка.
CREATE TABLE IF NOT EXISTS echo_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount           INTEGER NOT NULL,                    -- +начислено / −списано
  kind             TEXT NOT NULL DEFAULT 'grant',       -- grant | purchase | adjust
  reason           TEXT,                                -- за что (комментарий)
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,  -- если покупка
  balance_after    INTEGER NOT NULL DEFAULT 0,          -- баланс после операции
  created_by       TEXT,                                -- кто провёл (имя)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_echo_tx_student ON echo_transactions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_echo_tx_org     ON echo_transactions(organization_id, created_at DESC);

ALTER TABLE echo_transactions ENABLE ROW LEVEL SECURITY;
