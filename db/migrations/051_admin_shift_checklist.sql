-- 051_admin_shift_checklist.sql — аудит #31: чек-лист смены (мерч/прокат/галочки)
-- хранился в localStorage по устройству — руководство его не видело и на другом
-- телефоне прогресс отличался. Переносим в admin_shifts (server-side).
alter table public.admin_shifts add column if not exists checklist jsonb not null default '{}'::jsonb;
