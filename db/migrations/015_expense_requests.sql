-- 015_expense_requests.sql — заявки управляющего филиалом на расход средств.
-- Управляющий создаёт заявку (pending) → владелец одобряет/отклоняет в разделе «Бухгалтерия».
-- При одобрении создаётся плановая расходная операция (operation_id ссылается на finance_transactions).

BEGIN;
CREATE TABLE IF NOT EXISTS finance_expense_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  requested_by UUID,
  requested_by_name TEXT,
  amount NUMERIC(14,2) NOT NULL,
  category_id UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',     -- 'pending' | 'approved' | 'rejected'
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  decision_comment TEXT,
  operation_id UUID REFERENCES finance_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expense_req_org_status ON finance_expense_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_expense_req_branch ON finance_expense_requests(branch_id);
COMMIT;
