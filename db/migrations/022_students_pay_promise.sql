-- 022_students_pay_promise.sql
-- Корректировка ТЗ «Ученики» (заказчик, 24 июня):
-- ручной статус «Был на пробном уроке, оплатит» с датой обещанной оплаты.
-- Управленец ставит дату, до которой ученик обещал оплатить, и контролирует
-- («дожимает») оплату в срок. Аддитивно и идемпотентно.

ALTER TABLE students ADD COLUMN IF NOT EXISTS pay_promise_date DATE;

-- Быстрый отбор просроченных обещаний оплаты.
CREATE INDEX IF NOT EXISTS idx_students_pay_promise
  ON students (pay_promise_date)
  WHERE pay_promise_date IS NOT NULL;
