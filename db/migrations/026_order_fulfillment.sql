-- 026_order_fulfillment.sql
-- Отметка о выдаче заказа: при переходе заказа в статус «Выдан» (done) по позициям
-- автоматически создаются продажи (product_sales) — остаток склада уменьшается,
-- выручка учитывается. fulfilled_at защищает от повторного списания.

ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;
