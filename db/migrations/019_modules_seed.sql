-- 019_modules_seed.sql
-- Демо-данные для разделов «Выступления» (017) и «Товары и склад» (018).
-- Идемпотентно: вставка выполняется только если данных ещё нет.
-- org / branch — те же, что в db/seed_mvp_demo.sql и server/mvpApi.ts.

DO $$
DECLARE
  v_org   UUID := '00000000-0000-0000-0000-000000000001';
  v_br    UUID := '00000000-0000-0000-0000-000000000101';
  p1 UUID; p2 UUID; p3 UUID;             -- performances
  t_shirt UUID; hoodie UUID; pants UUID; cap UUID;  -- products
BEGIN
  -- ===== ВЫСТУПЛЕНИЯ =====
  IF NOT EXISTS (SELECT 1 FROM performances WHERE organization_id = v_org) THEN
    INSERT INTO performances (organization_id, branch_id, client_name, client_phone, address, event_date, event_time, type, price, status, comment)
    VALUES (v_org, v_br, 'Свадьба Айсулу и Максат', '+7 701 555 0001', 'Ресторан «Зердэ», г. Астана', '2026-06-01', '18:00', 'interactive', 350000, 'planned', '3 номера + интерактив с гостями')
    RETURNING id INTO p1;
    INSERT INTO performances (organization_id, branch_id, client_name, client_phone, address, event_date, event_time, type, price, status, comment)
    VALUES (v_org, v_br, 'Корпоратив BI Group', '+7 701 555 0002', 'Отель Rixos', '2026-06-05', '20:00', 'basic', 300000, 'planned', 'Базовый танец')
    RETURNING id INTO p2;
    INSERT INTO performances (organization_id, branch_id, client_name, client_phone, address, event_date, event_time, type, price, status, comment)
    VALUES (v_org, v_br, 'Банкет Нурлан', '+7 701 555 0003', 'Банкетный зал «Астана»', '2026-06-10', '19:00', 'interactive', 200000, 'planned', 'Танец с интерактивом')
    RETURNING id INTO p3;

    -- Поступления (p1 — частично, p2 — полностью, p3 — без оплат)
    INSERT INTO performance_payments (organization_id, performance_id, amount, paid_date, method, comment) VALUES
      (v_org, p1, 100000, '2026-05-28', 'cash',     'Аванс'),
      (v_org, p1, 150000, '2026-06-01', 'transfer', 'Доплата'),
      (v_org, p2, 300000, '2026-06-05', 'transfer', 'Полная оплата');
  END IF;

  -- ===== ТОВАРЫ И СКЛАД =====
  IF NOT EXISTS (SELECT 1 FROM products WHERE organization_id = v_org) THEN
    INSERT INTO products (organization_id, branch_id, name, category, sku, sale_price, cost_price, min_stock)
      VALUES (v_org, v_br, 'Футболка ECHO GOR', 'Мерч',   'TSH-001', 15000, 8000, 10) RETURNING id INTO t_shirt;
    INSERT INTO products (organization_id, branch_id, name, category, sku, sale_price, cost_price, min_stock)
      VALUES (v_org, v_br, 'Худи ECHO GOR',     'Мерч',   'HOD-002', 28000, 16000, 5) RETURNING id INTO hoodie;
    INSERT INTO products (organization_id, branch_id, name, category, sku, sale_price, cost_price, min_stock)
      VALUES (v_org, v_br, 'Штаны тренировочные','Форма', 'PNT-003', 20000, 12000, 5) RETURNING id INTO pants;
    INSERT INTO products (organization_id, branch_id, name, category, sku, sale_price, cost_price, min_stock)
      VALUES (v_org, v_br, 'Шапка ECHO GOR',    'Мерч',   'CAP-004', 7000, 3500, 5)  RETURNING id INTO cap;

    -- Поступления (приход на склад)
    INSERT INTO product_stock_movements (organization_id, branch_id, product_id, qty, cost_price, movement_date, comment) VALUES
      (v_org, v_br, t_shirt, 30, 8000,  '2026-05-01', 'Закуп партии'),
      (v_org, v_br, hoodie,  20, 16000, '2026-05-01', 'Закуп партии'),
      (v_org, v_br, pants,   12, 12000, '2026-05-01', 'Закуп партии'),
      (v_org, v_br, cap,     8,  3500,  '2026-05-01', 'Закуп партии');

    -- Продажи
    INSERT INTO product_sales (organization_id, branch_id, product_id, qty, amount, method, sold_by, sale_date) VALUES
      (v_org, v_br, t_shirt, 7, 105000, 'card', 'Фатима Царикаева', '2026-06-03'),
      (v_org, v_br, hoodie,  8, 224000, 'kaspi','Фатима Царикаева', '2026-06-08'),
      (v_org, v_br, pants,   4, 80000,  'cash', 'Фатима Царикаева', '2026-06-12'),
      (v_org, v_br, cap,     6, 42000,  'cash', 'Фатима Царикаева', '2026-06-15');
  END IF;
END $$;
