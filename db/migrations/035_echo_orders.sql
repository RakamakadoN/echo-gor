-- 035_echo_orders.sql
-- Заявки на обмен ЭхоБаксов (ТЗ «Магазин», Блок 1).
--
-- Ученик (взрослый / senior) нажимает «Обменять» → создаётся ЗАЯВКА (pending),
-- БЕЗ списания. Заявка падает администратору/управляющему филиала ученика.
-- Персонал подтверждает выдачу (issued) → тогда списываются ЭхоБаксы
-- (echo_transactions kind='purchase'), товар списывается со склада
-- (product_writeoffs), заявка закрывается. Либо отменяет (cancelled) с причиной.
--
-- Карточка заявки самодостаточна: снапшот ФИО/филиала/группы/педагога/товара/
-- фото/цены/баланса на момент создания — чтобы список не зависел от джойнов и
-- оставался стабильным даже при последующих изменениях справочников.
--
-- Доступ — только через Express по SUPABASE_SERVICE_ROLE_KEY. RLS deny-by-default.
-- Идемпотентно.

CREATE TABLE IF NOT EXISTS echo_orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id         UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  product_id         UUID REFERENCES products(id) ON DELETE SET NULL,
  branch_id          UUID REFERENCES branches(id) ON DELETE SET NULL,
  -- Снапшот карточки на момент создания заявки.
  student_name       TEXT,
  branch_name        TEXT,
  group_name         TEXT,
  teacher_name       TEXT,
  product_name       TEXT,
  product_photo      TEXT,
  echo_price         INTEGER NOT NULL DEFAULT 0,
  balance_at_request INTEGER NOT NULL DEFAULT 0,
  -- pending = 🟡 Ожидает выдачи | issued = 🟢 Выдано | cancelled = 🔴 Отменено
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'issued', 'cancelled')),
  cancel_reason      TEXT,                            -- причина отмены
  decided_by         TEXT,                            -- кто выдал/отменил (имя)
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_echo_orders_org_status ON echo_orders(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_echo_orders_branch     ON echo_orders(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_echo_orders_student    ON echo_orders(student_id, created_at DESC);

ALTER TABLE echo_orders ENABLE ROW LEVEL SECURITY;
