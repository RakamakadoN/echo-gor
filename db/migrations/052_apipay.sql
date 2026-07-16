-- 052: интеграция ApiPay (выставление счетов Kaspi и приём вебхуков об оплате).
-- Счёт живёт своей жизнью у ApiPay; здесь — наша привязка счёта к ученику
-- и журнал статусов. payment_id заполняется, когда оплата по вебхуку
-- превращается в строку payments (и дальше идёт штатным путём кассы).

CREATE TABLE IF NOT EXISTS apipay_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  branch_id uuid REFERENCES branches(id),
  student_id uuid REFERENCES students(id),
  payment_id uuid REFERENCES payments(id),
  apipay_invoice_id text UNIQUE,          -- id счёта на стороне ApiPay
  phone text NOT NULL,                    -- формат ApiPay: 8XXXXXXXXXX
  amount numeric NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'processing', -- processing|pending|paid|cancelled|expired|error|partially_refunded
  error text,                             -- текст ошибки создания/обработки
  sold_by_name text,                      -- кто выставил счёт (сотрудник или 'auto')
  created_by uuid,
  last_event jsonb,                       -- последний webhook как есть (для отладки)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_apipay_invoices_student ON apipay_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_apipay_invoices_status ON apipay_invoices(status);
CREATE INDEX IF NOT EXISTS idx_apipay_invoices_created ON apipay_invoices(created_at);

-- Тот же service-role-only режим, что и у остальных таблиц (миграция 048):
-- RLS включён, политик нет — доступ только серверным ключом.
ALTER TABLE apipay_invoices ENABLE ROW LEVEL SECURITY;
