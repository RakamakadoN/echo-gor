-- 041: продажа абонемента — дата продажи и внесённая сумма (частичная оплата → долг).
--
-- amount_paid  — сколько ученик реально внёс за абонемент. Если меньше price —
--                разница уходит в долг (student.balance считается по этим полям).
--                NULL = данных нет (легаси-абонементы): долг по ним не считаем.
-- sold_on      — дата ПРОДАЖИ (день оформления), в отличие от starts_on = первый
--                урок абонемента. Нужна для статуса «Новый ученик» (первая покупка
--                в текущем месяце) и истории.
ALTER TABLE student_subscriptions
  ADD COLUMN IF NOT EXISTS amount_paid numeric,
  ADD COLUMN IF NOT EXISTS sold_on date;

-- У существующих активных абонементов считаем, что внесена полная стоимость
-- (долга не было), а дата продажи = дата создания записи.
UPDATE student_subscriptions
   SET amount_paid = price
 WHERE amount_paid IS NULL AND status = 'active';

UPDATE student_subscriptions
   SET sold_on = created_at::date
 WHERE sold_on IS NULL;
