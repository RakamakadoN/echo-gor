-- 014_accounting_operations_seed.sql — стартовые операции бухгалтерии
-- (факт за апрель–июнь 2026 + плановые на конец июня/июль для платёжного календаря).
-- Идемпотентно по признаку отсутствия операций с проставленной статьёй (category_id).

DO $$
DECLARE
  org UUID := '00000000-0000-0000-0000-000000000001';
  br  UUID := '00000000-0000-0000-0000-000000000101';
  acc_cash UUID; acc_bank UUID; acc_card UUID;
  c_subs UUID; c_single UUID; c_merch UUID; c_event UUID; c_other_in UUID;
  c_rent UUID; c_salary UUID; c_ads UUID; c_utils UUID; c_costume UUID; c_tax UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM finance_transactions WHERE organization_id=org AND category_id IS NOT NULL) THEN
    RETURN;
  END IF;

  SELECT id INTO acc_cash FROM finance_accounts WHERE organization_id=org AND name='Касса (наличные)';
  SELECT id INTO acc_bank FROM finance_accounts WHERE organization_id=org AND name='Kaspi Бизнес';
  SELECT id INTO acc_card FROM finance_accounts WHERE organization_id=org AND name='Эквайринг (карты)';
  SELECT id INTO c_subs FROM finance_categories WHERE organization_id=org AND name='Абонементы';
  SELECT id INTO c_single FROM finance_categories WHERE organization_id=org AND name='Разовые занятия';
  SELECT id INTO c_merch FROM finance_categories WHERE organization_id=org AND name='Продажа формы и мерча';
  SELECT id INTO c_event FROM finance_categories WHERE organization_id=org AND name='Концерты и мероприятия';
  SELECT id INTO c_other_in FROM finance_categories WHERE organization_id=org AND name='Прочие доходы';
  SELECT id INTO c_rent FROM finance_categories WHERE organization_id=org AND name='Аренда зала';
  SELECT id INTO c_salary FROM finance_categories WHERE organization_id=org AND name='Зарплата педагогов';
  SELECT id INTO c_ads FROM finance_categories WHERE organization_id=org AND name='Реклама и SMM';
  SELECT id INTO c_utils FROM finance_categories WHERE organization_id=org AND name='Коммунальные услуги';
  SELECT id INTO c_costume FROM finance_categories WHERE organization_id=org AND name='Костюмы и реквизит';
  SELECT id INTO c_tax FROM finance_categories WHERE organization_id=org AND name='Налоги и сборы';

  INSERT INTO finance_transactions
    (organization_id, branch_id, account_id, category_id, amount, type, status, operation_date, counterparty, description)
  VALUES
  (org,br,acc_bank,c_subs,   880000,'income','actual','2026-04-05','Родители учеников','Абонементы апрель (Kaspi)'),
  (org,br,acc_cash,c_subs,   420000,'income','actual','2026-04-07','Родители учеников','Абонементы апрель (наличные)'),
  (org,br,acc_card,c_single, 95000,'income','actual','2026-04-12','Разовые посещения','Разовые занятия'),
  (org,br,acc_cash,c_merch,  60000,'income','actual','2026-04-18','Магазин формы','Продажа формы'),
  (org,br,acc_bank,c_rent,   350000,'expense','actual','2026-04-01','Арендодатель Чокина 109','Аренда зала апрель'),
  (org,br,acc_bank,c_salary, 620000,'expense','actual','2026-04-10','Педагоги','Зарплата педагогов апрель'),
  (org,br,acc_bank,c_ads,    120000,'expense','actual','2026-04-14','Instagram/TikTok','Таргет и SMM'),
  (org,br,acc_cash,c_utils,  45000,'expense','actual','2026-04-20','Энергосбыт','Свет и вода'),
  (org,br,acc_bank,c_costume,80000,'expense','actual','2026-04-22','Ателье','Костюмы к концерту'),
  (org,br,acc_bank,c_tax,    95000,'expense','actual','2026-04-25','Налоговая','Налоги и сборы'),
  (org,br,acc_bank,c_subs,   1010000,'income','actual','2026-05-05','Родители учеников','Абонементы май (Kaspi)'),
  (org,br,acc_cash,c_subs,   480000,'income','actual','2026-05-08','Родители учеников','Абонементы май (наличные)'),
  (org,br,acc_card,c_single, 130000,'income','actual','2026-05-15','Разовые посещения','Разовые занятия'),
  (org,br,acc_bank,c_event,  240000,'income','actual','2026-05-24','Продажа билетов','Отчётный концерт'),
  (org,br,acc_bank,c_rent,   350000,'expense','actual','2026-05-01','Арендодатель Чокина 109','Аренда зала май'),
  (org,br,acc_bank,c_salary, 660000,'expense','actual','2026-05-10','Педагоги','Зарплата педагогов май'),
  (org,br,acc_bank,c_ads,    140000,'expense','actual','2026-05-14','Instagram/TikTok','Таргет и SMM'),
  (org,br,acc_cash,c_utils,  47000,'expense','actual','2026-05-20','Энергосбыт','Свет и вода'),
  (org,br,acc_bank,c_event,  90000,'expense','actual','2026-05-22','Аренда сцены','Расходы на концерт'),
  (org,br,acc_bank,c_tax,    102000,'expense','actual','2026-05-26','Налоговая','Налоги и сборы'),
  (org,br,acc_bank,c_subs,   720000,'income','actual','2026-06-04','Родители учеников','Абонементы июнь (Kaspi)'),
  (org,br,acc_cash,c_subs,   360000,'income','actual','2026-06-06','Родители учеников','Абонементы июнь (наличные)'),
  (org,br,acc_card,c_single, 70000,'income','actual','2026-06-13','Разовые посещения','Разовые занятия'),
  (org,br,acc_bank,c_rent,   350000,'expense','actual','2026-06-01','Арендодатель Чокина 109','Аренда зала июнь'),
  (org,br,acc_bank,c_ads,    110000,'expense','actual','2026-06-09','Instagram/TikTok','Таргет и SMM'),
  (org,br,acc_cash,c_utils,  46000,'expense','actual','2026-06-18','Энергосбыт','Свет и вода'),
  (org,br,acc_bank,c_salary, 660000,'expense','planned','2026-06-25','Педагоги','Зарплата педагогов июнь (план)'),
  (org,br,acc_bank,c_subs,   900000,'income','planned','2026-06-28','Родители учеников','Ожидаемые продления абонементов'),
  (org,br,acc_bank,c_tax,    105000,'expense','planned','2026-06-30','Налоговая','Налоги июнь (план)'),
  (org,br,acc_bank,c_rent,   350000,'expense','planned','2026-07-01','Арендодатель Чокина 109','Аренда зала июль (план)');
END $$;
