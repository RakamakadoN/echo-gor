-- 042: Лист ожидания — единый источник правды (ТЗ заказчика, июль 2026).
-- Раньше «Лист ожидания» существовал двумя несвязанными механизмами:
-- (А) строки student_waitlist (вкладка/KPI) и (Б) ручной статус-текст на ученике
-- (фильтр/дропдауны). Механизм Б упраздняется; фильтры переходят на (А).
-- Миграция переносит легаси-данные Б → А и закрывает противоречия. Идемпотентна.

-- 1. Ученикам с ручным статусом «Лист ожидания» без открытой строки ЛО — создать строку.
insert into public.student_waitlist (organization_id, student_id, branch_id, group_id, comment)
select s.organization_id, s.id, s.branch_id, s.group_id,
       'Перенесено из ручного статуса (миграция 042)'
from public.students s
where s.manual_status ilike '%лист ожид%'
  and not exists (
    select 1 from public.student_waitlist w
    where w.student_id = s.id and w.removed_at is null
  );

-- 2. Обнулить легаси ручной статус «Лист ожидания».
update public.students
set manual_status = null
where manual_status ilike '%лист ожид%';

-- 3. Закрыть открытые строки ЛО у учеников с действующим (покрывающим сегодня)
--    абонементом: активный ученик не может быть в листе ожидания.
update public.student_waitlist w
set removed_at = now(), removed_reason = 'enrolled_backfill'
where w.removed_at is null
  and exists (
    select 1 from public.student_subscriptions ss
    where ss.student_id = w.student_id
      and ss.status = 'active'
      and ss.starts_on <= current_date
      and ss.ends_on >= current_date
  );
