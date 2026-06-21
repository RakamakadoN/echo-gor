-- 013_accounting_seed.sql — справочники бухгалтерии (счета и статьи).
-- Идемпотентно: вставляем только если для организации ещё нет соответствующих записей.

BEGIN;

INSERT INTO finance_accounts (organization_id, branch_id, name, kind, currency, opening_balance, sort)
SELECT '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', v.name, v.kind, 'KZT', v.ob, v.sort
FROM (VALUES
  ('Касса (наличные)', 'cash', 150000, 1),
  ('Kaspi Бизнес', 'bank', 1250000, 2),
  ('Эквайринг (карты)', 'card', 0, 3)
) AS v(name, kind, ob, sort)
WHERE NOT EXISTS (SELECT 1 FROM finance_accounts a WHERE a.organization_id='00000000-0000-0000-0000-000000000001');

INSERT INTO finance_categories (organization_id, name, kind, sort)
SELECT '00000000-0000-0000-0000-000000000001', v.name, 'income', v.sort
FROM (VALUES
  ('Абонементы', 1), ('Разовые занятия', 2), ('Продажа формы и мерча', 3),
  ('Концерты и мероприятия', 4), ('Прочие доходы', 5)
) AS v(name, sort)
WHERE NOT EXISTS (SELECT 1 FROM finance_categories c WHERE c.organization_id='00000000-0000-0000-0000-000000000001' AND c.kind='income');

INSERT INTO finance_categories (organization_id, name, kind, sort)
SELECT '00000000-0000-0000-0000-000000000001', v.name, 'expense', v.sort
FROM (VALUES
  ('Аренда зала', 1), ('Зарплата педагогов', 2), ('Реклама и SMM', 3),
  ('Коммунальные услуги', 4), ('Костюмы и реквизит', 5), ('Налоги и сборы', 6), ('Прочие расходы', 7)
) AS v(name, sort)
WHERE NOT EXISTS (SELECT 1 FROM finance_categories c WHERE c.organization_id='00000000-0000-0000-0000-000000000001' AND c.kind='expense');

COMMIT;
