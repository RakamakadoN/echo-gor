-- 043_refund_requests.sql
-- Заявки на возврат средств ученикам: управляющий филиала создаёт заявку,
-- владелец одобряет (создаётся расходная операция в Бухгалтерии) или отклоняет.
-- Зеркально finance_expense_requests. Идемпотентно.

CREATE TABLE IF NOT EXISTS finance_refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  student_name TEXT,                      -- имя ученика на момент заявки (сохраняем текстом)
  requested_by UUID,
  requested_by_name TEXT,
  amount NUMERIC(14,2) NOT NULL,
  reason TEXT,                            -- причина возврата
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  decision_comment TEXT,
  operation_id UUID,                      -- ссылка на finance_transactions после одобрения
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refund_requests_org ON finance_refund_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_branch ON finance_refund_requests(branch_id);
