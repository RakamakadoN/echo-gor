-- 047_kassa_confirm.sql
-- Раздел «Касса» (Бухгалтерия): владелец подтверждает поступления из трёх потоков
-- (абонементы / выступления / товары), при подтверждении деньги распределяются на
-- свой счёт, а комиссия Kaspi 0.95% на эквайринге списывается отдельной статьёй расхода.
-- К каждому поступлению можно приложить чек (base64 data-URL — отдельного файлового
-- стораджа в проекте нет, как и в 044_teacher_arrival.sql).
-- Идемпотентно.

-- 1. Поля подтверждения кассы на три таблицы поступлений.
--    kassa_status: 'pending' (ждёт подтверждения) | 'confirmed' | 'rejected'.
--    Новые продажи по умолчанию 'pending'; очередь на экране скоупится по дате,
--    поэтому легаси-строки прошлых дней не засоряют «сегодня» — бэкфилл не нужен.
--    finance_transaction_id — ссылка на проводку, созданную при подтверждении
--    (для выступлений/товаров, которые раньше вообще не попадали в бухгалтерию).

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS kassa_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS kassa_confirmed_by UUID,
  ADD COLUMN IF NOT EXISTS kassa_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kassa_commission_txn_id UUID,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

ALTER TABLE performance_payments
  ADD COLUMN IF NOT EXISTS kassa_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS kassa_confirmed_by UUID,
  ADD COLUMN IF NOT EXISTS kassa_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finance_transaction_id UUID,
  ADD COLUMN IF NOT EXISTS kassa_commission_txn_id UUID,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

ALTER TABLE product_sales
  ADD COLUMN IF NOT EXISTS kassa_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS kassa_confirmed_by UUID,
  ADD COLUMN IF NOT EXISTS kassa_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finance_transaction_id UUID,
  ADD COLUMN IF NOT EXISTS kassa_commission_txn_id UUID,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- 2. Индексы под выборку «касса за день» (по статусу подтверждения).
CREATE INDEX IF NOT EXISTS idx_payments_kassa            ON payments(organization_id, kassa_status);
CREATE INDEX IF NOT EXISTS idx_perf_payments_kassa       ON performance_payments(organization_id, kassa_status);
CREATE INDEX IF NOT EXISTS idx_product_sales_kassa       ON product_sales(organization_id, kassa_status);

-- 3. Пометка потока на счёте: к какому потоку относится счёт (для авто-маршрутизации
--    при подтверждении). NULL = обычный счёт. Значения: 'abon' | 'perf' | 'tovar' | 'cash'.
ALTER TABLE finance_accounts
  ADD COLUMN IF NOT EXISTS kassa_stream TEXT;

-- Счета и статьи («Kaspi Pay», «Банкеты», «Продажа товаров», «Kaspi gold», статья
-- расхода «Комиссия») создаются/находятся в рантайме (ensureKassaAccount / ensureExpenseCategoryId),
-- т.к. они per-organization и в БД может быть несколько организаций.
